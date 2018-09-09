package main

import (
	"blog/types"
	"blog/util"
	"errors"
	"fmt"
	"html/template"
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
	hardcodedLang    = "fr"
)

var (
	redisPool      *redis.Pool
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
		installInitialData([]string{"/themes/default"})
	} else {
		installInitialData([]string{"/themes/default", "/js", "/admin"})
	}

	config, err := types.LoadConfig(configPath)
	if err != nil {
		log.Fatal(err)
	}

	redisPool = util.NewRedisPool("blog-db:6379")

	types.InitSessionStore(config)

	// paths
	themePath = filepath.Join(blogDataRootDir, "themes", config.Theme)
	jsPath = filepath.Join(blogDataRootDir, "js")
	adminThemePath = filepath.Join(blogDataRootDir, "admin", "theme")
	adminJsPath = filepath.Join(blogDataRootDir, "admin", "js")

	router = gin.Default()

	router.SetFuncMap(template.FuncMap{
		"array":              makeArray,
		"incr":               incr,
		"decr":               decr,
		"sameDate":           sameDate,
		"pagesAroundCurrent": pagesAroundCurrent,
		"join":               join,
	})

	loadTemplates()

	router.Use(static.ServeRoot("/theme/", filepath.Join(themePath, "files")))

	router.Use(static.ServeRoot("/files/", filepath.Join(blogDataRootDir, "files")))
	router.Use(static.ServeRoot("/uploads/", filepath.Join(blogDataRootDir, "files")))

	router.Use(static.ServeRoot("/js/", jsPath))

	router.Use(ContextSetConfig)
	router.Use(ContextSetLang)

	// router.Use(func(c *gin.Context) {
	// 	fmt.Println("REQUEST:", c.Request.RequestURI)
	// 	c.Next()
	// })

	// ADMIN

	router.POST("admin-login", adminLogin)

	adminGroup := router.Group("/admin")
	{
		adminGroup.Static("/theme", filepath.Join(adminThemePath, "files"))
		adminGroup.Static("/js", adminJsPath)

		adminGroup.Use(func(c *gin.Context) {
			sess, err := types.GetAdminSession(c.Request, c.Writer)
			if err != nil {
				adminLoginPage(c)
				c.Abort()
				return
			}

			if sess.IsAuthenticated() == false {
				adminLoginPage(c)
				c.Abort()
				return
			}

			// TO REMOVE (testing login page)
			// adminLoginPage(c)
			// c.Abort()
		})

		adminGroup.POST("/logout", adminLogout)

		adminGroup.GET("/posts", adminPosts)
		adminGroup.GET("/posts/page/:page", adminPostsPage)
		adminGroup.GET("/", adminPosts)

		adminGroup.GET("/pages", adminPages)
		adminGroup.GET("/pages/page/:page", adminPagesPage)

		adminGroup.GET("/post/new", adminNewPost)
		adminGroup.GET("/page/new", adminNewPage)

		adminGroup.GET("/post/edit/:id", adminEditPost)
		adminGroup.GET("/page/edit/:id", adminEditPage)

		adminGroup.POST("/save", adminSavePost)
		adminGroup.POST("/delete", adminDeletePost)

		adminGroup.POST("/upload", adminUpload)

		adminGroup.GET("/settings", adminSettings)
		adminGroup.POST("/settings", adminSaveSettings)

		adminGroup.POST("/settings/credentials", adminSaveCredentials)

		adminGroup.GET("/localized", adminLocalizedSettings)

		adminGroup.GET("/comments", func(c *gin.Context) {
			config, err := ContextGetConfig(c)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			comments, err := types.ListAllComments("fr", true, 0, config.PostsPerPage)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			nbPages, err := types.CommentsNbPages(config.PostsPerPage, false)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			c.HTML(http.StatusOK, "admin_comments.tmpl", gin.H{
				"title":                 "Admin - comments",
				"lang":                  ContextLang(c),
				"comments":              comments,
				"nbPages":               int(nbPages),
				"currentPage":           0,
				"scope":                 "comments",
				"nbUnvalidatedComments": types.NbUnvalidatedComments(),
			})

		})

		adminGroup.GET("/comments/:page", func(c *gin.Context) {
			config, err := ContextGetConfig(c)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			page := c.Param("page")
			pageInt, err := strconv.Atoi(page)
			if err != nil {
				fmt.Fprintln(os.Stderr, "/admin/comments/:page - can't parse page: "+page+"\n")
				c.Redirect(http.StatusMovedPermanently, "/admin")
				return
			}
			// page indexes start at zero, not one
			pageInt--

			comments, err := types.ListAllComments("fr", true, pageInt, config.PostsPerPage)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			nbPages, err := types.CommentsNbPages(config.PostsPerPage, false)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			c.HTML(http.StatusOK, "admin_comments.tmpl", gin.H{
				"title":                 "Admin - comments",
				"lang":                  ContextLang(c),
				"comments":              comments,
				"nbPages":               int(nbPages),
				"currentPage":           pageInt,
				"scope":                 "comments",
				"nbUnvalidatedComments": types.NbUnvalidatedComments(),
			})
		})

		adminGroup.GET("/newcomments", func(c *gin.Context) {
			config, err := ContextGetConfig(c)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			comments, err := types.ListUnvalidatedComments("fr", true, 0, config.PostsPerPage)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			nbPages, err := types.CommentsNbPages(config.PostsPerPage, true)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			c.HTML(http.StatusOK, "admin_comments.tmpl", gin.H{
				"title":                 "Admin - comments (new)",
				"lang":                  ContextLang(c),
				"comments":              comments,
				"nbPages":               int(nbPages),
				"currentPage":           0,
				"scope":                 "newcomments",
				"nbUnvalidatedComments": types.NbUnvalidatedComments(),
			})
		})

		adminGroup.GET("/newcomments/:page", func(c *gin.Context) {
			config, err := ContextGetConfig(c)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			page := c.Param("page")
			pageInt, err := strconv.Atoi(page)
			if err != nil {
				fmt.Fprintln(os.Stderr, "/admin/newcomments/:page - can't parse page: "+page+"\n")
				c.Redirect(http.StatusMovedPermanently, "/admin")
				return
			}
			// page indexes start at zero, not one
			pageInt--

			comments, err := types.ListUnvalidatedComments("fr", true, pageInt, config.PostsPerPage)
			if err != nil {
				serverError(c, err.Error())
				return
			}

			nbPages, err := types.CommentsNbPages(config.PostsPerPage, true)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			c.HTML(http.StatusOK, "admin_comments.tmpl", gin.H{
				"title":                 "Admin - comments (new)",
				"lang":                  ContextLang(c),
				"comments":              comments,
				"nbPages":               int(nbPages),
				"currentPage":           pageInt,
				"scope":                 "newcomments",
				"nbUnvalidatedComments": types.NbUnvalidatedComments(),
			})
		})
	}

	// POSTS

	router.GET("/archives/:yearAndMonth", func(c *gin.Context) {
		between := c.Param("yearAndMonth")
		validBetween, err := regexp.MatchString("[0-9]+-[0-9]+", between)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		if !validBetween {
			c.AbortWithError(http.StatusBadRequest, errors.New("invalid parameter"))
			return
		}

		parts := strings.Split(between, "-")
		if len(parts) != 2 {
			c.AbortWithError(http.StatusBadRequest, errors.New("invalid parameter"))
			return
		}

		year, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			c.AbortWithError(http.StatusBadRequest, errors.New("invalid parameter"))
			return
		}

		month, err := strconv.ParseInt(parts[1], 10, 64)
		if err != nil {
			c.AbortWithError(http.StatusBadRequest, errors.New("invalid parameter"))
			return
		}

		// TODO: pagination shouldn't be hardcoded
		// Guessing 200 posts is a maximum in one month for now.
		perPage := 200

		posts, err := types.PostsList(false, 0, perPage, int(year), int(month), config.TimeLocation, false)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		types.PostComputeSince(posts)

		archives, err := types.PostGetArchiveMonths(hardcodedLang, config.TimeLocation, nil)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		nbPages, err := types.PostsNbPages(false, perPage, int(year), int(month), config.TimeLocation, false)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		c.HTML(http.StatusOK, "default.tmpl", gin.H{
			"title":       ContextTitle(c),
			"posts":       posts,
			"archives":    archives,
			"month":       int(month),
			"year":        int(year),
			"nbPages":     int(nbPages),
			"currentPage": 0,
		})
	})

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

				archives, err := types.PostGetArchiveMonths(hardcodedLang, config.TimeLocation, nil)
				if err != nil {
					c.AbortWithError(http.StatusInternalServerError, err)
					return
				}

				c.HTML(http.StatusOK, "post.tmpl", gin.H{
					"title":    ContextTitle(c),
					"post":     post,
					"archives": archives,
				})
				return
			}
		})
	}

	router.GET("/posts/page/:page", func(c *gin.Context) {
		page := c.Param("page")
		pageInt, err := strconv.Atoi(page)
		if err != nil {
			fmt.Fprintln(os.Stderr, "/posts/:page - can't parse page: "+page+"\n")
			c.Redirect(http.StatusMovedPermanently, "/")
			return
		}
		// page indexes start at zero, not one
		pageInt--
		posts(c, pageInt)
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

			fmt.Println(err.Error())

			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"err":     err.Error(),
			})
			return
		}
	})

	router.GET("/", func(c *gin.Context) {
		posts(c, 0)
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
	// 		"title": ContextTitle(c),
	// 		"post":  post,
	// 	})
	// })

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
			if components[0] == "post" {
				postSlug = components[1]
				postIDStr = components[1]
			} else {
				postSlug = components[0]
				postIDStr = components[1]
			}
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

		c.Redirect(http.StatusMovedPermanently, "/")
	})

	router.Run(serverPort)
}

func pagesAroundCurrent(currentPage, around, nbPages int) []int {
	// pages start at 0
	// we want to display them starting at 1
	currentPage++

	// -1 in the array will be used to display "..." between page areas
	arr := make([]int, 0)

	for i := currentPage - around; i <= currentPage+around; i++ {
		if i > 0 && i <= nbPages {
			arr = append(arr, i)
		}
	}

	firstValue := arr[0]

	if firstValue == 2 {
		arr = append([]int{1}, arr...)
	} else if firstValue > 2 {
		arr = append([]int{1, -1}, arr...)
	}

	lastValue := arr[len(arr)-1]

	if lastValue == nbPages-1 {
		arr = append(arr, nbPages)
	} else if lastValue < nbPages-1 {
		arr = append(arr, []int{-1, nbPages}...)
	}

	return arr
}

func decr(i int) int {
	return i - 1
}

func incr(i int) int {
	return i + 1
}

func sameDate(month1, month2, year1, year2 int) bool {
	return month1 == month2 && year1 == year2
}

func makeArray(args ...interface{}) []interface{} {
	return args
}

func join(arr []string) string {
	return strings.Join(arr, ",")
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
