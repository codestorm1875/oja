package auth

import (
	"net/http"
	"strings"
)

func TenantAuthMiddleware(directory Directory, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := strings.TrimSpace(r.Header.Get("X-API-Key"))
		if apiKey == "" {
			http.Error(w, "missing api key", http.StatusUnauthorized)
			return
		}

		tenant, ok := directory.Lookup(apiKey)
		if !ok {
			http.Error(w, "invalid api key", http.StatusUnauthorized)
			return
		}

		r.Header.Set("X-Tenant-Id", tenant.ID)
		r.Header.Set("X-Tenant-Slug", tenant.Slug)
		next.ServeHTTP(w, r)
	})
}
