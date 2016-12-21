package main

import (
	"github.com/gin-gonic/gin"
	"log"
	"net/http/httputil"
	"net/url"
)

const (
	SERVER_PORT string = ":80"
)

func main() {
	legacyProxy := createLegacyProxy()

	router := gin.Default()

	router.Use(func(c *gin.Context) {
		legacyProxy.ServeHTTP(c.Writer, c.Request)
	})

	router.Run(SERVER_PORT)
}

// createLegacyProxy returns an http proxy to send
// requests to the legacy Node.js server
func createLegacyProxy() *httputil.ReverseProxy {
	u, err := url.Parse("http://blog-legacy")
	if err != nil {
		log.Fatalln(err)
	}
	return httputil.NewSingleHostReverseProxy(u)
}
