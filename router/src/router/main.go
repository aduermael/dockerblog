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
	CONFIG_PATH string = "/blog-data/private/config.json"
)

var (
	redisPool *redis.Pool
	config    *Config = &Config{Lang: []string{"en"}, Title: []string{"Title"}, PostsPerPage: 10}
)

func main() {

	installInitialData()
	err := LoadAndWatchConfig(config)
	if err != nil {
		log.Fatal(err)
	}

	redisPool = newRedisPool("blog-db:6379")

	// TODO: flush redis scripts

	legacyProxy := createLegacyProxy()

	router := gin.Default()
	router.LoadHTMLGlob("/blog-data/templates/*")
	router.Use(static.ServeRoot("/", "/blog-data/static"))

	router.Use(AttachConfig)
	router.Use(DefineLang)

	router.GET("/:slug/:id", func(c *gin.Context) {
		id := c.Param("id")

		post, err := postGet(id)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}
		c.HTML(http.StatusOK, "post.tmpl", gin.H{
			"title": config.GetTitle("en"),
			"post":  post,
		})
	})

	router.GET("/", func(c *gin.Context) {
		posts, err := postsList()
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}
		c.HTML(http.StatusOK, "default.tmpl", gin.H{
			"title": config.GetTitle("en"),
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
