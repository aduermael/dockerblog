package main

import (
	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
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
	// legacy
	router.Use(static.ServeRoot("/", "/blog-data/public"))

	router.Use(AttachConfig)
	router.Use(DefineLang)

	router.GET("/:page/:param", func(c *gin.Context) {
		param := c.Param("param")
		paramIsID, err := regexp.MatchString("[0-9]+", param)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		// if param is an ID, it means we want to display a post
		// (and page is just a slugged title)
		if paramIsID {
			post, err := postGet(param)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			// TODO: it should be possible to set that in admin
			// but currently for all posts, both ShowComments
			// and AcceptComments are false
			post.ShowComments = true
			post.AcceptComments = true

			c.HTML(http.StatusOK, "post.tmpl", gin.H{
				"title": GetTitle(c),
				"post":  post,
			})
			return
		}

		// use Node.js legacy for other requests (like /admin routes)
		// TODO: Go implementation
		legacyProxy.ServeHTTP(c.Writer, c.Request)
	})

	router.GET("/:page", func(c *gin.Context) {
		page := c.Param("page")

		// use Node.js legacy
		if page == "admin" {
			legacyProxy.ServeHTTP(c.Writer, c.Request)
			return
		}

		post, err := postGetWithSlug(page)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		c.HTML(http.StatusOK, "post.tmpl", gin.H{
			"title": GetTitle(c),
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
			"title": GetTitle(c),
			"posts": posts,
		})
	})

	// receiving comment
	router.POST("/comment", func(c *gin.Context) {
		var comment Comment
		err := c.BindJSON(&comment)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"err":     err.Error(),
			})
			return
		}

		robot, err := comment.Accept()
		if err != nil {
			if robot {
				c.JSON(http.StatusOK, gin.H{
					"success": true,
				})
				return
			} else {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"err":     err.Error(),
				})
				return
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
		})
		return
	})

	router.Use(func(c *gin.Context) {
		log.Println("proxy")
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
