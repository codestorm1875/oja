package ratelimit

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type Store interface {
	Increment(ctx context.Context, key string, ttl time.Duration) (int64, error)
}

type Config struct {
	Limit  int64
	Window time.Duration
}

func Middleware(store Store, config Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if config.Limit <= 0 || config.Window <= 0 {
			next.ServeHTTP(w, r)
			return
		}

		tenantID := strings.TrimSpace(r.Header.Get("X-Tenant-Id"))
		if tenantID == "" {
			http.Error(w, "missing tenant context", http.StatusUnauthorized)
			return
		}

		key := windowKey(tenantID, r.URL.Path, time.Now().UTC(), config.Window)
		count, err := store.Increment(r.Context(), key, config.Window)
		if err != nil {
			http.Error(w, "rate limit check failed", http.StatusServiceUnavailable)
			return
		}

		remaining := config.Limit - count
		if remaining < 0 {
			remaining = 0
		}

		w.Header().Set("X-RateLimit-Limit", strconv.FormatInt(config.Limit, 10))
		w.Header().Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
		w.Header().Set("X-RateLimit-Window-Seconds", strconv.FormatInt(int64(config.Window.Seconds()), 10))

		if count > config.Limit {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func windowKey(tenantID string, path string, now time.Time, window time.Duration) string {
	windowStart := now.Truncate(window).Unix()
	return fmt.Sprintf("rate_limit:%s:%s:%d", tenantID, path, windowStart)
}
