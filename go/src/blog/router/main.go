package main

import (
	"blog/types"
	"blog/util"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
)

const (
	serverPort       = ":80"
	configPath       = "/blog-data/config.json"
	blogDataRootDir  = "/blog-data"
	initialDataDir   = "/initial-data"
	blogFilesRootDir = blogDataRootDir + "/files"
)

var (
	redisPool      *redis.Pool
	config         *Config
	router         *gin.Engine
	themePath      string
	jsPath         string
	adminThemePath string
	adminJsPath    string
)

func loadTemplates() {
	templates := []string{}

	// current theme's templates
	filepath.Walk(filepath.Join(themePath, "templates"),
		func(path string, info os.FileInfo, err error) error {
			if info.IsDir() == false && filepath.Ext(path) == ".tmpl" {
				templates = append(templates, path)
			}
			return nil
		})

	// admin theme's templates
	filepath.Walk(filepath.Join(adminThemePath, "templates"),
		func(path string, info os.FileInfo, err error) error {
			if info.IsDir() == false && filepath.Ext(path) == ".tmpl" {
				templates = append(templates, path)
			}
			return nil
		})

	router.LoadHTMLFiles(templates...)
}

func main() {
	var err error

	// do not override everything when debugging
	// because if origin is mounted at destination,
	// files get deleted when installing initial data.
	if gin.IsDebugging() {
		installInitialData([]string{"/themes/default", "/js"})
	} else {
		installInitialData([]string{"/themes/default", "/js", "/admin"})
	}

	config, err = LoadConfig()
	if err != nil {
		log.Fatal(err)
	}

	redisPool = util.NewRedisPool("blog-db:6379")

	// TODO: flush redis scripts

	// paths
	themePath = filepath.Join(blogDataRootDir, "themes", config.Theme)
	jsPath = filepath.Join(blogDataRootDir, "js")
	adminThemePath = filepath.Join(blogDataRootDir, "admin", "theme")
	adminJsPath = filepath.Join(blogDataRootDir, "admin", "js")

	router = gin.Default()

	loadTemplates()

	router.Use(static.ServeRoot("/theme/", filepath.Join(themePath, "files")))

	router.Use(static.ServeRoot("/files/", filepath.Join(blogDataRootDir, "files")))
	router.Use(static.ServeRoot("/uploads/", filepath.Join(blogDataRootDir, "files")))

	router.Use(static.ServeRoot("/js/", jsPath))

	router.Use(AttachConfig)
	router.Use(DefineLang)

	// ADMIN

	adminGroup := router.Group("/admin")
	{
		// adminGroup.Use(func(c *gin.Context) {
		// 	log.Println("TEST")
		// 	c.Abort()
		// 	c.JSON(200, gin.H{"foo": "bar"})
		// })

		adminGroup.Static("/theme", filepath.Join(adminThemePath, "files"))
		adminGroup.Static("/js", adminJsPath)

		adminGroup.GET("/posts", adminPosts)
		adminGroup.GET("/", adminPosts)

		adminGroup.GET("/new", adminNewPost)
		adminGroup.POST("/save", adminSavePost)
		adminGroup.POST("/delete", adminDeletePost)

		adminGroup.GET("/edit/:id", adminEditPost)

		adminGroup.POST("/upload", adminUpload)

		adminGroup.GET("/settings", adminSettings)
	}

	// POSTS

	postGroup := router.Group("/post")
	{
		postGroup.GET("/:slug/:id", func(c *gin.Context) {

			ID := c.Param("id")
			validID, err := regexp.MatchString("[0-9]+", ID)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			if validID {
				post, err := types.PostGet(ID)
				if err != nil {
					c.AbortWithError(http.StatusInternalServerError, err)
					return
				}

				// TODO: it should be possible to set that in admin
				// but currently for all posts, both ShowComments
				// and AcceptComments are true
				post.ShowComments = true
				post.AcceptComments = true

				post.ComputeSince()

				c.HTML(http.StatusOK, "post.tmpl", gin.H{
					"title": GetTitle(c),
					"post":  post,
				})
				return
			}

		})
	}

	router.GET("/", func(c *gin.Context) {
		posts, err := types.PostsList(false)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		types.PostComputeSince(posts)

		c.HTML(http.StatusOK, "default.tmpl", gin.H{
			"title": GetTitle(c),
			"posts": posts,
		})
	})

	// // ---------------
	// // PUBLIC
	// // ---------------

	// router.GET("/:page", func(c *gin.Context) {
	// 	page := c.Param("page")
	// 	log.Println("GET PAGE:", page)

	// 	post, err := types.PostGetWithSlug(page)
	// 	if err != nil {
	// 		c.AbortWithError(http.StatusInternalServerError, err)
	// 		return
	// 	}

	// 	c.HTML(http.StatusOK, "post.tmpl", gin.H{
	// 		"title": GetTitle(c),
	// 		"post":  post,
	// 	})
	// })

	// // receiving comment
	// router.POST("/comment", func(c *gin.Context) {
	// 	var comment types.Comment
	// 	err := c.BindJSON(&comment)
	// 	if err != nil {
	// 		c.JSON(http.StatusOK, gin.H{
	// 			"success": false,
	// 			"err":     err.Error(),
	// 		})
	// 		return
	// 	}

	// 	robot, err := comment.Accept()
	// 	if err != nil {
	// 		if robot {
	// 			c.JSON(http.StatusOK, gin.H{
	// 				"success": true,
	// 			})
	// 			return
	// 		}

	// 		c.JSON(http.StatusOK, gin.H{
	// 			"success": false,
	// 			"err":     err.Error(),
	// 		})
	// 		return
	// 	}

	// 	c.JSON(http.StatusOK, gin.H{
	// 		"success": true,
	// 	})
	// 	return
	// })

	// router.Use(func(c *gin.Context) {
	// 	legacyProxy.ServeHTTP(c.Writer, c.Request)
	// 	c.Done()
	// })

	router.NoRoute(func(c *gin.Context) {

		log.Println("no route:", c.Request.URL.Path)

		p := strings.TrimSpace(path.Clean(c.Request.URL.Path))

		//Cut off the leading slash
		if strings.HasPrefix(p, "/") {
			p = p[1:]
		}

		components := strings.Split(p, "/")

		postIDStr := ""
		postSlug := ""

		if len(components) == 2 {
			postSlug = components[0]
			postIDStr = components[1]
		} else if len(components) == 1 {
			postSlug = components[0]
			postIDStr = components[0]
		}

		// try to find a post with ID first
		if postIDStr != "" {
			_, err := strconv.Atoi(postIDStr)
			if err == nil {
				post, err := types.PostGet(postIDStr)
				if err == nil {
					movedTo := filepath.Join("/post/", post.Slug, strconv.Itoa(post.ID))
					c.Redirect(http.StatusMovedPermanently, movedTo)
					return
				}
			}
		}
		// then try with slug
		if postSlug != "" {
			post, err := types.PostGetWithSlug(postSlug)
			if err == nil {
				movedTo := filepath.Join("/post/", post.Slug, strconv.Itoa(post.ID))
				c.Redirect(http.StatusMovedPermanently, movedTo)
				return
			}
		}
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
