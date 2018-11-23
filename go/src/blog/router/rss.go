package main

import (
	"bytes"
	"net/http"
	"time"

	"blog/types"

	"github.com/gin-gonic/gin"
)

func rss(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	posts, err := types.PostsList(false, 0, config.PostsPerPage, -1, -1, config.TimeLocation, false)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	types.PostComputeSince(posts)

	now := time.Now()

	buf := &bytes.Buffer{}

	err = rssTemplate.Execute(buf, gin.H{
		"title":       ContextTitle(c),
		"description": "Description",
		"buildDate":   int(now.Unix() * 1000),
		"posts":       posts,
	})

	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.Data(http.StatusOK, "application/rss+xml", buf.Bytes())
}
