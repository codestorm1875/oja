package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/codestorm1875/oja/gateway/internal/auth"
	"github.com/codestorm1875/oja/gateway/internal/proxy"
)

func main() {
	tenantDirectoryPath := os.Getenv("GATEWAY_TENANTS_FILE")
	if tenantDirectoryPath == "" {
		tenantDirectoryPath = "gateway/tenants.json"
	}

	tenantService, err := auth.NewFileTenantLookupService(tenantDirectoryPath)
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.Handle("/engine/", auth.TenantAuthMiddleware(tenantService, proxy.NewEngineProxy()))

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
