package main

import (
	"blog/types"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func postsHead(c *gin.Context, page int) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	posts, err := types.PostsList(false, page, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	if len(posts) > 0 {
		c.Header("Last-Modified", posts[0].DateTime().Format(time.RFC1123))
	}
	c.AbortWithStatus(http.StatusOK)
}

func posts(c *gin.Context, page int) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	posts, err := types.PostsList(false, page, config.PostsPerPage, -1, -1, config.TimeLocation, false)
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

	nbPages, err := types.PostsNbPages(false, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "default.tmpl", gin.H{
		"title":       ContextTitle(c),
		"posts":       posts,
		"archives":    archives,
		"nbPages":     int(nbPages),
		"currentPage": page,
		"host":        config.Host,
	})
}
