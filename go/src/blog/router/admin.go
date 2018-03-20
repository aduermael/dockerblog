package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func adminPosts(c *gin.Context) {
	c.HTML(http.StatusOK, "admin_posts.tmpl", gin.H{
		"title": "Admin - posts",
		"lang":  getLangForContext(c),
	})
}

func adminNewPost(c *gin.Context) {
	c.HTML(http.StatusOK, "admin_posts_new.tmpl", gin.H{
		"title": "Admin - new post",
		"lang":  getLangForContext(c),
	})
}
