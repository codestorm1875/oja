package auth

import (
	"net/http"
	"strings"
)

func TenantAuthMiddleware(service TenantLookupService, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := strings.TrimSpace(r.Header.Get("X-API-Key"))
		if apiKey == "" {
			http.Error(w, "missing api key", http.StatusUnauthorized)
			return
		}

		tenant, ok, err := service.LookupByAPIKey(r.Context(), apiKey)
		if err != nil {
			http.Error(w, "tenant lookup failed", http.StatusInternalServerError)
			return
		}

		if !ok {
			http.Error(w, "invalid api key", http.StatusUnauthorized)
			return
		}

		r.Header.Set("X-Tenant-Id", tenant.ID)
		r.Header.Set("X-Tenant-Slug", tenant.Slug)
		next.ServeHTTP(w, r)
	})
}
