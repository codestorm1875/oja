package ratelimit

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type memoryStore struct {
	counts map[string]int64
}

func (store *memoryStore) Increment(_ context.Context, key string, _ time.Duration) (int64, error) {
	if store.counts == nil {
		store.counts = make(map[string]int64)
	}

	store.counts[key]++
	return store.counts[key], nil
}

func TestMiddlewareAllowsRequestsWithinLimit(t *testing.T) {
	store := &memoryStore{}
	nextCalls := 0
	handler := Middleware(store, Config{Limit: 2, Window: time.Minute}, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalls++
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/engine/healthz", nil)
	req.Header.Set("X-Tenant-Id", "tenant_acme")

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, recorder.Code)
	}

	if nextCalls != 1 {
		t.Fatalf("expected next handler to be called once, got %d", nextCalls)
	}
}

func TestMiddlewareRejectsRequestsOverLimit(t *testing.T) {
	store := &memoryStore{}
	handler := Middleware(store, Config{Limit: 1, Window: time.Minute}, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/engine/healthz", nil)
	req.Header.Set("X-Tenant-Id", "tenant_acme")

	firstRecorder := httptest.NewRecorder()
	handler.ServeHTTP(firstRecorder, req)

	secondRecorder := httptest.NewRecorder()
	handler.ServeHTTP(secondRecorder, req)

	if firstRecorder.Code != http.StatusNoContent {
		t.Fatalf("expected first status %d, got %d", http.StatusNoContent, firstRecorder.Code)
	}

	if secondRecorder.Code != http.StatusTooManyRequests {
		t.Fatalf("expected second status %d, got %d", http.StatusTooManyRequests, secondRecorder.Code)
	}
}

func TestMiddlewareRequiresTenantContext(t *testing.T) {
	handler := Middleware(&memoryStore{}, Config{Limit: 1, Window: time.Minute}, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/engine/healthz", nil)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, recorder.Code)
	}
}
