package main

import (
	"blog/types"
	"blog/util"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path/filepath"
	"regexp"

	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

const (
	serverPort      = ":80"
	configPath      = "/blog-data/config.json"
	blogDataRootDir = "/blog-data"
	initialDataDir  = "/initial-data"
)

var (
	redisPool *redis.Pool
	config    *Config
)

func main() {
	var err error

	installInitialData([]string{"/themes/default", "/js"})

	config, err = LoadConfig()
	if err != nil {
		log.Fatal(err)
	}

	redisPool = util.NewRedisPool("blog-db:6379")

	// TODO: flush redis scripts

	legacyProxy := createLegacyProxy()

	router := gin.Default()
	adminPathRegexp := regexp.MustCompile("^/admin/")

	// proxy /admin path to legacy container
	router.Use(func(c *gin.Context) {
		log.Println("-- proxy? path:", c.Request.URL.Path)
		if c.Request.URL.Path == "/admin" || adminPathRegexp.MatchString(c.Request.URL.Path) {
			legacyProxy.ServeHTTP(c.Writer, c.Request)
			c.Done()
			return
		}
		c.Next()
	})

	themePath := filepath.Join(blogDataRootDir, "themes", config.Theme)
	jsPath := filepath.Join(blogDataRootDir, "js")

	router.LoadHTMLGlob(filepath.Join(themePath, "templates", "*"))
	router.Use(static.ServeRoot("/theme/", filepath.Join(themePath, "files")))
	router.Use(static.ServeRoot("/files/", filepath.Join(themePath, "files")))
	router.Use(static.ServeRoot("/js/", jsPath))

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
			post, err := types.PostGet(param)
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

		post, err := types.PostGetWithSlug(page)
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
		posts, err := types.PostsList()
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
		var comment types.Comment
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
			}

			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"err":     err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
		})
		return
	})

	router.Use(func(c *gin.Context) {
		legacyProxy.ServeHTTP(c.Writer, c.Request)
		c.Done()
	})

	router.Run(serverPort)
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
