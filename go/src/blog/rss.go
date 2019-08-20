package main

import (
	"bytes"
	"net/http"
	"time"

	"blog/types"

	"github.com/gin-gonic/gin"
)

func rssHead(c *gin.Context) {

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

	c.Header("Content-Type", "application/rss+xml; charset=utf-8")
	if len(posts) > 0 {
		c.Header("Last-Modified", posts[0].DateTime().Format(time.RFC1123))
	}
	c.AbortWithStatus(http.StatusOK)
}

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
		"buildDate":   int(now.Unix()),
		"posts":       posts,
		"host":        config.Host,
	})

	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	if len(posts) > 0 {
		c.Header("Last-Modified", posts[0].DateTime().Format(time.RFC1123))
	}
	c.Data(http.StatusOK, "application/rss+xml; charset=utf-8", buf.Bytes())
}
