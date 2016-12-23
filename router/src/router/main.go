package main

import (
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

const (
	SERVER_PORT string = ":80"
)

func main() {

	installInitialData()

	legacyProxy := createLegacyProxy()

	router := gin.Default()
	router.LoadHTMLGlob("/blog-data/templates/*")
	router.Use(static.ServeRoot("/", "/blog-data/static"))

	router.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "default.tmpl", gin.H{
			"title": "test",
		})
	})

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
