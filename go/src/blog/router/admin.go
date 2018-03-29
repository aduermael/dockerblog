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

	posts, err := types.PostsList()
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
	c.HTML(http.StatusOK, "admin_posts_new.tmpl", gin.H{
		"title": "Admin - new post",
		"lang":  getLangForContext(c),
	})
}

func adminSaveNewPost(c *gin.Context) {

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

	// post.ID empty on purpose (new post)
	post.ID = 0
	// TODO: use user defined date when necessary
	post.Date = int(time.Now().Unix()) * 1000 // x1000 for legacy (we used to store milliseconds)
	post.Update = post.Date
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

	/*
		Title          string      `json:"title"`
		ID             int         `json:"ID"`
		Date           int         `json:"date"`
		Slug           string      `json:"slug"`
		Lang           string      `json:"lang"`
		Keywords       []string    `json:"keywords,omitempty"`
		Description    string      `json:"description,omitempty"`
		NbComments     int         `json:"nbComs"`
		Blocks         []PostBlock `json:"blocks"`
		Comments       []Comment   `json:"comments,omitempty"`
		ShowComments   bool        `json:"showComs,omitempty"`
		AcceptComments bool        `json:"acceptComs,omitempty"`
	*/

	ok(c)
}
