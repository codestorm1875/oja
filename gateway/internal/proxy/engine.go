package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
)

func NewEngineProxy() http.Handler {
	engineURL := os.Getenv("ENGINE_URL")
	if engineURL == "" {
		engineURL = "http://localhost:3000"
	}

	target, err := url.Parse(engineURL)
	if err != nil {
		log.Fatal(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director

	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Path = strings.TrimPrefix(req.URL.Path, "/engine")
		if req.URL.Path == "" {
			req.URL.Path = "/"
		}
	}

	return proxy
}
