package main

import (
	"blog/types"
	"fmt"
	"io"
	"io/ioutil"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gosimple/slug"
)

func badRequest(c *gin.Context, message string) {
	fmt.Println("bad request:", message)
	c.JSON(http.StatusBadRequest, gin.H{
		"message": message,
		"success": false,
	})
}

func serverError(c *gin.Context, message string) {
	fmt.Println("ERROR:", message)
	c.JSON(http.StatusInternalServerError, gin.H{
		"message": message,
		"success": false,
	})
}

func ok(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}

func adminPosts(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	posts, err := types.PostsList(true, 0, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		fmt.Println("ERROR:", err)
		serverError(c, err.Error())
		return
	}

	nbPages, err := types.PostsNbPages(true, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "admin_posts.tmpl", gin.H{
		"title":       "Admin - posts",
		"lang":        ContextLang(c),
		"posts":       posts,
		"nbPages":     int(nbPages),
		"currentPage": 0,
	})
}

func adminPostsPage(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	page := c.Param("page")
	pageInt, err := strconv.Atoi(page)
	if err != nil {
		fmt.Fprintln(os.Stderr, "/admin/posts/:page - can't parse page: "+page+"\n")
		c.Redirect(http.StatusMovedPermanently, "/admin")
		return
	}
	// page indexes start at zero, not one
	pageInt--

	posts, err := types.PostsList(true, pageInt, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		fmt.Println("ERROR:", err)
		serverError(c, err.Error())
		return
	}

	nbPages, err := types.PostsNbPages(true, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "admin_posts.tmpl", gin.H{
		"title":       "Admin - posts",
		"lang":        ContextLang(c),
		"posts":       posts,
		"nbPages":     int(nbPages),
		"currentPage": pageInt,
	})
}

func adminPages(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	posts, err := types.PostsList(true, 0, config.PostsPerPage, -1, -1, config.TimeLocation, true)
	if err != nil {
		fmt.Println("ERROR:", err)
		serverError(c, err.Error())
		return
	}

	nbPages, err := types.PostsNbPages(true, config.PostsPerPage, -1, -1, config.TimeLocation, true)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "admin_pages.tmpl", gin.H{
		"title":       "Admin - pages",
		"lang":        ContextLang(c),
		"posts":       posts,
		"nbPages":     int(nbPages),
		"currentPage": 0,
	})
}

func adminPagesPage(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	page := c.Param("page")
	pageInt, err := strconv.Atoi(page)
	if err != nil {
		fmt.Fprintln(os.Stderr, "/admin/posts/:page - can't parse page: "+page+"\n")
		c.Redirect(http.StatusMovedPermanently, "/admin")
		return
	}
	// page indexes start at zero, not one
	pageInt--

	posts, err := types.PostsList(true, pageInt, config.PostsPerPage, -1, -1, config.TimeLocation, true)
	if err != nil {
		fmt.Println("ERROR:", err)
		serverError(c, err.Error())
		return
	}

	nbPages, err := types.PostsNbPages(true, config.PostsPerPage, -1, -1, config.TimeLocation, true)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "admin_pages.tmpl", gin.H{
		"title":       "Admin - pages",
		"lang":        ContextLang(c),
		"posts":       posts,
		"nbPages":     int(nbPages),
		"currentPage": pageInt,
	})
}

func adminNewPost(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	c.HTML(http.StatusOK, "admin_post.tmpl", gin.H{
		"title":  "Admin - new post",
		"lang":   ContextLang(c),
		"isPage": false,
		"config": config,
	})
}

func adminNewPage(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	c.HTML(http.StatusOK, "admin_post.tmpl", gin.H{
		"title":  "Admin - new page",
		"lang":   ContextLang(c),
		"isPage": true,
		"config": config,
	})
}

func adminEditPost(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	post, err := types.PostGet(c.Param("id"))
	if err != nil {
		serverError(c, err.Error())
		return
	}

	t := time.Unix(int64(post.Date/1000), 0) // ÷1000 because of legacy (we used to store milliseconds)
	post.DateString = t.In(config.TimeLocation).Format("01/02/2006")
	post.TimeString = t.In(config.TimeLocation).Format("3:04pm")

	c.HTML(http.StatusOK, "admin_post.tmpl", gin.H{
		"title": "Admin - new post",
		"lang":  ContextLang(c),
		"post":  post,
	})
}

func adminEditPage(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	post, err := types.PostGet(c.Param("id"))
	if err != nil {
		serverError(c, err.Error())
		return
	}

	t := time.Unix(int64(post.Date/1000), 0) // ÷1000 because of legacy (we used to store milliseconds)
	post.DateString = t.In(config.TimeLocation).Format("01/02/2006")
	post.TimeString = t.In(config.TimeLocation).Format("3:04pm")

	post.IsPage = true

	// legacy (pages didn't have slugs, but "name"s)
	if post.Slug == "" {
		post.Slug = slug.Make(post.Name)
		post.Slug = strings.Replace(post.Slug, ".", "", -1)
	}

	c.HTML(http.StatusOK, "admin_post.tmpl", gin.H{
		"title": "Admin - new post",
		"lang":  ContextLang(c),
		"post":  post,
	})
}

func adminDeletePost(c *gin.Context) {
	post := types.Post{}
	err := c.BindJSON(&post)
	if err != nil {
		badRequest(c, "incorrect data")
		return
	}

	// post is incomplete at this stage, get it from database
	post, err = types.PostGet(strconv.Itoa(post.ID))
	if err != nil {
		serverError(c, err.Error())
		return
	}

	err = post.Delete()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	ok(c)
}

func adminSavePost(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	post := &types.Post{}

	err = c.BindJSON(post)

	if err != nil {
		badRequest(c, "incorrect data")
		return
	}

	// validation
	if post.Title == "" {
		badRequest(c, "title can't be empty")
		return
	}

	if post.DateString != "" {
		var d = post.DateString
		if post.TimeString != "" {
			d = d + " " + post.TimeString
		} else {
			// Note: default time could be set in config
			d = d + " " + "8:00am"
		}

		// month/day/year
		t, err := time.ParseInLocation("01/02/2006 3:04pm", d, config.TimeLocation)
		if err != nil {
			badRequest(c, "can't read date")
			return
		}
		fmt.Println("DATE:", t)

		post.Date = int(t.Unix() * 1000) // x1000 for legacy (we used to store milliseconds)
	} else {
		// DATE : NOW
		post.Date = int(time.Now().Unix()) * 1000 // x1000 for legacy (we used to store milliseconds)
	}

	// NOTE: if post.ID == 0, a new post is created in database

	post.Update = int(time.Now().Unix()) * 1000 // x1000 for legacy (we used to store milliseconds)

	// slug
	// - make from title if empty
	// - fix if not empty but incorrect
	post.Slug = strings.TrimSpace(post.Slug)
	if post.Slug == "" {
		post.Slug = slug.Make(post.Title)
	} else if slug.IsSlug(post.Slug) == false {
		post.Slug = slug.Make(post.Slug)
	}
	post.Slug = strings.Replace(post.Slug, ".", "", -1)

	post.Lang = ContextLang(c)

	// TODO? post.Keywords
	// TODO? post.Description

	post.NbComments = 0

	err = post.Save()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	ok(c)
}

func adminUpload(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	multipart, err := c.Request.MultipartReader()
	if err != nil {
		badRequest(c, "Failed to create MultipartReader")
		return
	}

	filePaths := make([]string, 0)

	for {
		mimePart, err := multipart.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			badRequest(c, fmt.Sprintf("Error reading multipart section: %v", err))
			return
		}
		_, params, err := mime.ParseMediaType(mimePart.Header.Get("Content-Disposition"))
		if err != nil {
			badRequest(c, fmt.Sprintf("Invalid Content-Disposition: %v", err))
			return
		}

		fmt.Println("FILENAME:", params["filename"])

		defer mimePart.Close()

		t := time.Now().In(config.TimeLocation)
		month := t.Format("01")
		year := t.Format("2006")

		dirPath := filepath.Join(blogFilesRootDir, year, month)

		err = os.MkdirAll(dirPath, 0755)
		if err != nil {
			serverError(c, "can't store file (2)")
			return
		}

		files, err := ioutil.ReadDir(dirPath)
		if err != nil {
			serverError(c, "can't store file (3)")
			return
		}

		// suffix to add before extension if file exists at destination
		suffixCount := 0
		ext := filepath.Ext(params["filename"])
		fname := strings.TrimSuffix(params["filename"], ext)

		re, err := regexp.Compile("^" + fname + "(-[0-9]+)?" + ext)
		if err != nil {
			serverError(c, "can't store file (4)")
			return
		}

		// check for file with same name at destination
		for _, file := range files {
			fmt.Println(file.Name())
			if re.MatchString(file.Name()) {
				fmt.Println("found a match")

				submatches := re.FindStringSubmatch(file.Name())
				if len(submatches) != 2 {
					serverError(c, "can't store file (5)")
					return
				}

				if submatches[1] == "" {
					if suffixCount == 0 {
						suffixCount = 2
					}
				} else {
					i, err := strconv.Atoi(submatches[1][1:])
					if err != nil {
						serverError(c, "can't store file (5.1)")
						return
					}
					if suffixCount <= i {
						suffixCount = i + 1
					}
				}
			}
		}

		newName := params["filename"]
		if suffixCount > 0 {
			newName = fname + "-" + strconv.Itoa(suffixCount) + ext
		}

		destination := filepath.Join(dirPath, newName)
		out, err := os.Create(destination)
		if err != nil {
			serverError(c, "can't store file (6) ("+destination+") - "+err.Error())
			return
		}

		defer out.Close()

		// write the content from POST to the file
		_, err = io.Copy(out, mimePart)
		if err != nil {
			serverError(c, "can't store file (7)")
			return
		}

		fmt.Println("File uploaded successfully: ")
		fmt.Println(newName)

		filePaths = append(filePaths, filepath.Join("/files", year, month, newName))
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"filepaths": filePaths,
	})
}

func adminSettings(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, "can't get current configuration")
	}

	c.HTML(http.StatusOK, "admin_settings.tmpl", gin.H{
		"title":  "Admin - settings",
		"lang":   ContextLang(c),
		"config": config,
	})
}

type saveGeneralSettingsRequest struct {
	Langs                   []string `json:"langs"`
	PostsPerPage            int      `json:"postsPerPage"`
	Timezone                string   `json:"timezone"`
	ShowComments            bool     `json:"showComments"`
	AcceptComments          bool     `json:"acceptComments"`
	CommentsRequireApproval bool     `json:"approveComments"`
}

func adminSaveSettings(c *gin.Context) {
	req := &saveGeneralSettingsRequest{}
	err := c.BindJSON(req)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	config.Langs = req.Langs
	config.PostsPerPage = req.PostsPerPage
	config.Timezone = req.Timezone
	config.ShowComments = req.ShowComments
	config.AcceptComments = req.AcceptComments
	config.CommentsRequireApproval = req.CommentsRequireApproval

	config.Save(configPath)

	ok(c)
}

type saveCredentialsRequest struct {
	Username          string `json:"username"`
	CurrentPassword   string `json:"currentPassword"`
	NewPassword       string `json:"newPassword"`
	NewPasswordRepeat string `json:"newPasswordRepeat"`
}

func adminSaveCredentials(c *gin.Context) {
	req := &saveCredentialsRequest{}
	err := c.BindJSON(req)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	err = config.UpdateCredentials(req.Username, req.NewPassword, req.CurrentPassword, configPath)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	ok(c)
}

func adminLocalizedSettings(c *gin.Context) {
	c.HTML(http.StatusOK, "admin_localized_settings.tmpl", gin.H{
		"title": "Admin - localized settings",
		"lang":  ContextLang(c),
	})
}
