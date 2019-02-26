package main

import (
	"blog/types"
	"blog/util"
	"bytes"
	"errors"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	textTemplate "text/template"
	"time"

	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

const (
	serverPort       = ":80"
	configPath       = "/blog-data/config.json"
	blogDataRootDir  = "/blog-data"
	initialDataDir   = "/initial-data"
	blogFilesRootDir = blogDataRootDir + "/files"
	hardcodedLang    = "fr"
	// email templates can be found in each theme
	answerEmailTemplateTxtPath   = "/templates/emails/comment-answer.txt"
	answerEmailTemplateHTMLPath  = "/templates/emails/comment-answer.html"
	confirmationTemplateTxtPath  = "/templates/emails/confirmation.txt"
	confirmationTemplateHTMLPath = "/templates/emails/confirmation.html"
	newsTemplateTxtPath          = "/templates/emails/news.txt"
	newsTemplateHTMLPath         = "/templates/emails/news.html"
	postTemplateTxtPath          = "/templates/emails/post.txt"
	postTemplateHTMLPath         = "/templates/emails/post.html"
	// rss template can be found in each theme
	rssTemplatePath = "/templates/rss.tmpl"
)

var (
	redisPool      *redis.Pool
	router         *gin.Engine
	themePath      string
	jsPath         string
	adminThemePath string
	adminJsPath    string

	answerEmailTemplateTxt        *template.Template
	answerEmailTemplateHTML       *template.Template
	confirmationEmailTemplateTxt  *template.Template
	confirmationEmailTemplateHTML *template.Template
	newsEmailTemplateTxt          *template.Template
	newsEmailTemplateHTML         *template.Template
	postEmailTemplateTxt          *template.Template
	postEmailTemplateHTML         *template.Template

	rssTemplate *textTemplate.Template
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

	// load rss template

	b, err := ioutil.ReadFile(filepath.Join(themePath, rssTemplatePath))
	if err != nil {
		log.Fatal(err)
	}
	rssTemplate = textTemplate.New("rss")

	rssTemplate.Funcs(textTemplate.FuncMap{
		"array":              makeArray,
		"incr":               incr,
		"decr":               decr,
		"sameDate":           sameDate,
		"pagesAroundCurrent": pagesAroundCurrent,
		"join":               join,
		"rfc1123":            rfc1123,
	})

	rssTemplate, err = rssTemplate.Parse(string(b))
	if err != nil {
		log.Fatal(err)
	}

	// load email templates

	// comments

	b, err = ioutil.ReadFile(filepath.Join(themePath, answerEmailTemplateTxtPath))
	if err != nil {
		log.Fatal(err)
	}
	answerEmailTemplateTxt, err = template.New("comment-answer-email-txt").Parse(string(b))

	b, err = ioutil.ReadFile(filepath.Join(themePath, answerEmailTemplateHTMLPath))
	if err != nil {
		log.Fatal(err)
	}
	answerEmailTemplateHTML, err = template.New("comment-answer-email-html").Parse(string(b))

	// confirmation

	b, err = ioutil.ReadFile(filepath.Join(themePath, confirmationTemplateTxtPath))
	if err != nil {
		log.Fatal(err)
	}
	confirmationEmailTemplateTxt, err = template.New("confirmation-email-txt").Parse(string(b))

	b, err = ioutil.ReadFile(filepath.Join(themePath, confirmationTemplateHTMLPath))
	if err != nil {
		log.Fatal(err)
	}
	confirmationEmailTemplateHTML, err = template.New("confirmation-email-html").Parse(string(b))

	// news

	b, err = ioutil.ReadFile(filepath.Join(themePath, newsTemplateTxtPath))
	if err != nil {
		log.Fatal(err)
	}
	newsEmailTemplateTxt, err = template.New("news-email-txt").Parse(string(b))

	b, err = ioutil.ReadFile(filepath.Join(themePath, newsTemplateHTMLPath))
	if err != nil {
		log.Fatal(err)
	}
	newsEmailTemplateHTML, err = template.New("news-email-html").Parse(string(b))

	// post

	b, err = ioutil.ReadFile(filepath.Join(themePath, postTemplateTxtPath))
	if err != nil {
		log.Fatal(err)
	}
	postEmailTemplateTxt, err = template.New("post-email-txt").Parse(string(b))

	b, err = ioutil.ReadFile(filepath.Join(themePath, postTemplateHTMLPath))
	if err != nil {
		log.Fatal(err)
	}

	r := regexp.MustCompile("(?s)<!--.*?(-->)")

	b2 := r.ReplaceAll(b, []byte(""))

	fmt.Println(string(b2))

	postEmailTemplateHTML, err = template.New("post-email-html").Parse(string(b2))
}

func main() {
	var err error

	rand.Seed(time.Now().UnixNano())

	// do not override everything when debugging
	// because if origin is mounted at destination,
	// files get deleted when installing initial data.
	if gin.IsDebugging() {
		installInitialData([]string{"/themes"})
	} else {
		installInitialData([]string{"/themes", "/js", "/admin"})
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
		"rfc1123":            rfc1123,
	})

	loadTemplates()

	// redirect to clean path
	router.Use(func(c *gin.Context) {
		cleanPath := filepath.Clean(c.Request.URL.Path)
		if c.Request.URL.Path != cleanPath {
			c.Redirect(http.StatusMovedPermanently, cleanPath)
		}
	})

	router.Use(static.ServeRoot("/theme/", filepath.Join(themePath, "files")))

	router.Use(static.ServeRoot("/files/", filepath.Join(blogDataRootDir, "files")))
	router.Use(static.ServeRoot("/uploads/", filepath.Join(blogDataRootDir, "files")))
	router.StaticFile("/robots.txt", filepath.Join(blogDataRootDir, "robots.txt"))

	router.Use(static.ServeRoot("/js/", jsPath))

	router.Use(ContextSetConfig)
	router.Use(ContextSetLang)
	router.Use(TestDomainPostAlias)

	// ADMIN

	router.POST("admin-login", adminLogin)

	// TODO: rss paths should be in config
	router.GET("/rss", rss)
	router.GET("/rss/:lang", rss)
	router.GET("/feed", rss)
	router.GET("/coeur/rss.php", rss)
	router.GET("/coeur/atom.php", rss)

	router.HEAD("/rss", rssHead)
	router.HEAD("/rss/:lang", rssHead)
	router.HEAD("/feed", rssHead)
	router.HEAD("/coeur/rss.php", rssHead)
	router.HEAD("/coeur/atom.php", rssHead)

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

		adminGroup.GET("/emails", adminEmails)
		adminGroup.GET("/registered-emails", adminRegisteredEmails)

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
		adminGroup.POST("/settings/sendgrid", adminSaveSendgrid)

		adminGroup.GET("/localized", adminLocalizedSettings)

		adminGroup.GET("/comments", func(c *gin.Context) {
			adminComments(0, false, c)
		})

		adminGroup.GET("/comments/:page", func(c *gin.Context) {
			page := c.Param("page")
			pageInt, err := strconv.Atoi(page)
			if err != nil {
				fmt.Fprintln(os.Stderr, "/admin/comments/:page - can't parse page: "+page+"\n")
				c.Redirect(http.StatusMovedPermanently, "/admin")
				return
			}
			// page indexes start at zero, not one
			pageInt--

			adminComments(pageInt, false, c)
		})

		adminGroup.GET("/newcomments", func(c *gin.Context) {
			adminComments(0, true, c)
		})

		adminGroup.GET("/newcomments/:page", func(c *gin.Context) {
			page := c.Param("page")
			pageInt, err := strconv.Atoi(page)
			if err != nil {
				fmt.Fprintln(os.Stderr, "/admin/newcomments/:page - can't parse page: "+page+"\n")
				c.Redirect(http.StatusMovedPermanently, "/admin")
				return
			}
			// page indexes start at zero, not one
			pageInt--

			adminComments(pageInt, true, c)
		})

		adminGroup.POST("/comments/accept", adminAcceptComment)
		adminGroup.POST("/comments/delete", adminDeleteComment)

		adminGroup.POST("/comments/highlight", adminHighlightComment)
		adminGroup.POST("/comments/unhighlight", adminUnhighlightComment)

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
			"host":        config.Host,
		})
	})

	postGroup := router.Group("/post")
	{
		postGroup.GET("/:slug/:id", func(c *gin.Context) {

			slug := c.Param("slug")
			ID := c.Param("id")
			validID, err := regexp.MatchString("[0-9]+", ID)
			if err != nil {
				c.AbortWithError(http.StatusInternalServerError, err)
				return
			}

			if validID {
				post, found, err := types.PostGet(ID)
				if err != nil {
					if found == false {
						// try with slug
						if slug != "" {
							post, _, err := types.PostGetWithSlug(slug)
							if err == nil {
								movedTo := filepath.Join("/post/", post.Slug, strconv.Itoa(post.ID))
								c.Redirect(http.StatusMovedPermanently, movedTo)
								return
							}
						}

						// couldn't find post, redirect to "/"
						c.Redirect(http.StatusMovedPermanently, "/")

					} else {
						c.AbortWithError(http.StatusInternalServerError, err)
					}
					return
				}

				// pages are displayed at /post-slug
				if post.IsPage {
					c.Redirect(http.StatusMovedPermanently, filepath.Join("/", post.Slug))
					return
				}

				renderPost(post, c)
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

	router.HEAD("/posts/page/:page", func(c *gin.Context) {
		page := c.Param("page")
		pageInt, err := strconv.Atoi(page)
		if err != nil {
			fmt.Fprintln(os.Stderr, "/posts/:page - can't parse page: "+page+"\n")
			c.Redirect(http.StatusMovedPermanently, "/")
			return
		}
		// page indexes start at zero, not one
		pageInt--
		postsHead(c, pageInt)
	})

	// receiving comment
	router.POST("/comment", func(c *gin.Context) {
		comment := &types.Comment{}
		err := c.BindJSON(comment)
		if err != nil {
			badRequest(c, err.Error())
			return
		}

		user, err := types.GetUserSession(c.Request, c.Writer)
		if err != nil {
			c.AbortWithError(http.StatusInternalServerError, err)
			return
		}

		robot, err := comment.Accept(user)
		if err != nil {
			if robot {
				ok(c)
				return
			}

			fmt.Println(err.Error())

			badRequest(c, err.Error())
			return
		}

		// see if email needs to be sent
		emailCommentResponse(comment, c)

		c.JSON(http.StatusOK, gin.H{
			"success":            true,
			"waitingForApproval": comment.Valid == false,
		})
	})

	emailGroup := router.Group("/email")
	{
		emailGroup.GET("/confirm/:hash/:key", func(c *gin.Context) {

			ID := c.Param("hash")
			key := c.Param("key")

			re, found, err := types.RegisteredEmailGetWithKey(ID, key)

			if err != nil {
				c.Redirect(http.StatusSeeOther, "/")
				return
			}

			if found == false {
				c.Redirect(http.StatusSeeOther, "/")
				return
			}

			re.Valid = true
			err = re.Save()

			if err != nil {
				c.Redirect(http.StatusSeeOther, "/")
				return
			}

			emailInfoResponse(c, "Email bien enregistré pour la newsletter, merci ! ☺️", "Pour changer les préférences de réception, entrez à nouveau l'email dans le formulaire d'inscription. Pour se désinscrire, cliquez sur le lien en bas de l'un des emails reçus.")
		})

		emailGroup.GET("/unsubscribe/:hash/:key", func(c *gin.Context) {

			ID := c.Param("hash")
			key := c.Param("key")

			message1 := "" // "Email bien enregistré pour la newsletter, merci ! ☺️"
			message2 := "Pour s'abonner à nouveau, utilisez le formulaire d'inscription."

			re, found, err := types.RegisteredEmailGetWithKey(ID, key)

			if err != nil || found == false {
				message1 = "L'email n'a pas pu être trouvé dans la base de données. Il a probablement déjà été supprimé ! ☺️"
				emailInfoResponse(c, message1, message2)
				return
			}

			err = re.Delete()

			if err != nil {
				message1 = "Une erreur interne s'est produite. 😕"
				message2 = "Merci de réessayer un peu plus tard. Si le problème persiste, vous pouvez nous contacter: support@bloglaurel.com."
				emailInfoResponse(c, message1, message2)
				return
			}

			message1 = "L'email a bien été totalement supprimé de la base de données! ✨"
			emailInfoResponse(c, message1, message2)
		})
	}

	type newsletterRegisterRequest struct {
		Email string `json:"email"`
		News  bool   `json:"news"`
		Posts bool   `json:"posts"`
	}

	router.POST("/newsletter-register", func(c *gin.Context) {

		req := &newsletterRegisterRequest{}
		err = c.BindJSON(req)
		if err != nil {
			badRequest(c, "bad request")
			return
		}

		re := types.NewRegisteredEmail(req.Email, req.Posts, req.News)

		fmt.Printf("RegisteredEmail: %#v\n", re)

		err = re.Save()
		if err != nil {
			serverError(c, "email could not be saved")
			return
		}

		fmt.Println("email saved")

		config, err := ContextGetConfig(c)
		if err != nil {
			serverError(c, err.Error())
			return
		}

		ec := &types.EmailConfirmation{
			Title:     "Newsletter",
			Message1:  "Demande d'abonnement à la newsletter bien reçue ! Merci de bien vouloir confirmer cette adresse email. 🙂",
			Message2:  "Après quelques jours, si l'email n'est pas validé, il sera effacé de la base de données.",
			Confirm:   "Confirmer",
			EmailHash: re.ID,
			EmailKey:  re.Key,
			Host:      config.Host,
			Signature: "🌿 Laurel 🌿",
		}

		html := ""
		buf := &bytes.Buffer{}
		err = confirmationEmailTemplateHTML.Execute(buf, ec)
		if err == nil {
			html = buf.String()
		}

		txt := ""
		buf = &bytes.Buffer{}
		err = confirmationEmailTemplateTxt.Execute(buf, ec)
		if err == nil {
			txt = buf.String()
		}

		from := mail.NewEmail("Le blog de Laurel", "noreply@bloglaurel.com")
		subject := "✉️ Merci de confirmer votre email."
		to := mail.NewEmail("", re.Email)
		plainTextContent := txt
		htmlContent := html
		message := mail.NewSingleEmail(from, subject, to, plainTextContent, htmlContent)
		client := sendgrid.NewSendClient(config.SendgridAPIKey)
		_, err = client.Send(message)
		if err != nil {
			log.Println("SENDGRID ERROR:", err)
		} else {
			// fmt.Printf("SENT TO %s: \n%s\n\n%s\n", original.Email, html, txt)
		}

		ok(c)
	})

	router.GET("/", func(c *gin.Context) {
		posts(c, 0)
	})

	router.HEAD("/", func(c *gin.Context) {
		postsHead(c, 0)
	})

	router.NoRoute(func(c *gin.Context) {

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
				post, _, err := types.PostGet(postIDStr)
				if err == nil {
					movedTo := filepath.Join("/post/", post.Slug, strconv.Itoa(post.ID))
					c.Redirect(http.StatusMovedPermanently, movedTo)
					return
				}
			}
		}

		// then try with slug
		if postSlug != "" {
			post, _, err := types.PostGetWithSlug(postSlug)

			if err == nil {

				if post.IsPage {
					renderPost(post, c)
				} else {
					movedTo := filepath.Join("/post/", post.Slug, strconv.Itoa(post.ID))
					c.Redirect(http.StatusMovedPermanently, movedTo)
				}
				return
			}
		}

		log.Println("no route:", c.Request.Method, c.Request.URL.Path)

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

func rfc1123(utcSec int) string {
	return time.Unix(int64(utcSec/1000), 0).Format(time.RFC1123)
}

func emailInfoResponse(c *gin.Context, m1, m2 string) {
	config, err := ContextGetConfig(c)
	if err != nil {
		m1 = "Une erreur interne s'est produite. 😕"
		m2 = "Merci de réessayer un peu plus tard. Si le problème persiste, vous pouvez nous contacter: support@bloglaurel.com."
	}

	archives, err := types.PostGetArchiveMonths(hardcodedLang, config.TimeLocation, nil)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "email-info.tmpl", gin.H{
		"title":    ContextTitle(c),
		"Message1": m1,
		"Message2": m2,
		"archives": archives,
		"host":     config.Host,
	})
}

func renderPost(post *types.Post, c *gin.Context) {

	config, err := ContextGetConfig(c)
	if err != nil {
		fmt.Println("RENDER POST ERROR, can't get config:", err.Error())
		c.Redirect(http.StatusSeeOther, "/")
		return
	}

	post.ComputeSince()

	archives, err := types.PostGetArchiveMonths(hardcodedLang, config.TimeLocation, nil)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	user, err := types.GetUserSession(c.Request, c.Writer)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	for _, comment := range post.Comments {
		for _, commenter := range config.Commenters {
			if commenter.Email == comment.Email && commenter.Name == comment.Name {
				comment.AuthorAlias = commenter.Alias
			}
		}
	}

	c.HTML(http.StatusOK, "post.tmpl", gin.H{
		"title":    ContextTitle(c),
		"post":     post,
		"archives": archives,
		"user":     user,
		"host":     config.Host,
	})
}
