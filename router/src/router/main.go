package main

import (
	"github.com/garyburd/redigo/redis"
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

var (
	redisPool *redis.Pool
)

func main() {

	installInitialData()

	redisPool = newRedisPool("blog-db:6379")

	// TODO: flush redis scripts

	legacyProxy := createLegacyProxy()

	router := gin.Default()
	router.LoadHTMLGlob("/blog-data/templates/*")
	router.Use(static.ServeRoot("/", "/blog-data/static"))

	router.GET("/:slug/:id", func(c *gin.Context) {
		slug := c.Param("slug")
		id := c.Param("id")
		c.String(http.StatusOK, "post: %s (%s)", slug, id)

		// posts, err := postsList()
		// if err != nil {
		// 	c.AbortWithError(http.StatusInternalServerError, err)
		// }
		// c.HTML(http.StatusOK, "default.tmpl", gin.H{
		// 	"title": "test",
		// 	"posts": posts,
		// })
	})

	router.GET("/", func(c *gin.Context) {
		posts, err := postsList()
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
		}
		c.HTML(http.StatusOK, "default.tmpl", gin.H{
			"title": "test",
			"posts": posts,
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
