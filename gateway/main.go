package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/codestorm1875/oja/gateway/internal/auth"
	"github.com/codestorm1875/oja/gateway/internal/config"
	"github.com/codestorm1875/oja/gateway/internal/proxy"
	"github.com/codestorm1875/oja/gateway/internal/ratelimit"
	"github.com/redis/go-redis/v9"
)

func main() {
	envFile := os.Getenv("ENV_FILE")
	if envFile == "" {
		envFile = ".env"
	}

	if err := config.LoadEnvFile(envFile); err != nil {
		log.Fatal(err)
	}

	tenantService := buildTenantLookupService()

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	rateLimitPerMinute := int64(120)
	if rawLimit := os.Getenv("GATEWAY_RATE_LIMIT_PER_MINUTE"); rawLimit != "" {
		parsedLimit, err := strconv.ParseInt(rawLimit, 10, 64)
		if err != nil {
			log.Fatal(err)
		}
		rateLimitPerMinute = parsedLimit
	}

	rateLimitStore := ratelimit.NewRedisStore(redis.NewClient(&redis.Options{
		Addr: redisAddr,
	}))
	engineProxy := ratelimit.Middleware(
		rateLimitStore,
		ratelimit.Config{
			Limit:  rateLimitPerMinute,
			Window: time.Minute,
		},
		proxy.NewEngineProxy(),
	)

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.Handle("/engine/", auth.TenantAuthMiddleware(tenantService, engineProxy))

	port := os.Getenv("GATEWAY_PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	fmt.Printf("Gateway listening on port %s\n", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func buildTenantLookupService() auth.TenantLookupService {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		tenantService, err := auth.NewPostgresTenantLookupService(databaseURL)
		if err != nil {
			log.Fatal(err)
		}
		return tenantService
	}

	tenantDirectoryPath := os.Getenv("GATEWAY_TENANTS_FILE")
	if tenantDirectoryPath == "" {
		tenantDirectoryPath = "gateway/tenants.json"
	}

	tenantService, err := auth.NewFileTenantLookupService(tenantDirectoryPath)
	if err != nil {
		log.Fatal(err)
	}

	return tenantService
}
