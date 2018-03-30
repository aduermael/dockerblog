package main

import (
	"blog/types"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gosimple/slug"
)

func badRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, gin.H{
		"message": message,
		"success": false,
	})
}

func serverError(c *gin.Context, message string) {
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

	posts, err := types.PostsList(true)
	if err != nil {
		fmt.Println("ERROR:", err)
		serverError(c, err.Error())
		return
	}

	c.HTML(http.StatusOK, "admin_posts.tmpl", gin.H{
		"title": "Admin - posts",
		"lang":  getLangForContext(c),
		"posts": posts,
	})
}

func adminNewPost(c *gin.Context) {
	c.HTML(http.StatusOK, "admin_post.tmpl", gin.H{
		"title": "Admin - new post",
		"lang":  getLangForContext(c),
	})
}

func adminEditPost(c *gin.Context) {
	post, err := types.PostGet(c.Param("id"))
	if err != nil {
		serverError(c, err.Error())
		return
	}

	t := time.Unix(int64(post.Date/1000), 0) // ÷1000 because of legacy (we used to store milliseconds)
	post.DateString = t.In(TimeLocation).Format("01/02/2006")
	post.TimeString = t.In(TimeLocation).Format("3:04pm")

	c.HTML(http.StatusOK, "admin_post.tmpl", gin.H{
		"title": "Admin - new post",
		"lang":  getLangForContext(c),
		"post":  post,
	})
}

func adminSavePost(c *gin.Context) {

	fmt.Println("save new post")

	post := &types.Post{}

	err := c.BindJSON(post)

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
		t, err := time.ParseInLocation("01/02/2006 3:04pm", d, TimeLocation)
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
	post.Slug = slug.Make(post.Title)
	post.Lang = getLangForContext(c)
	// TODO? post.Keywords
	// TODO? post.Description
	post.NbComments = 0

	post.ShowComments = true
	post.AcceptComments = true

	fmt.Printf("\n%#v\n", post)

	err = post.Save()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	fmt.Printf("\n%#v\n\n", post)

	ok(c)
}
