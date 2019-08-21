package main

import (
	"fmt"
	"net/http"
	"path"

	"blog/types"

	"github.com/gin-gonic/gin"
)

// TestDomainPostAlias ...
func TestDomainPostAlias(c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		fmt.Println("TestDomainPostAlias, can't get config:", err.Error())
		c.Next()
		return
	}

	key := path.Clean(path.Join(c.Request.Host, c.Request.URL.Path))

	if postID, exists := config.DomainPostAliases[key]; exists {
		post, found, err := types.PostGet(postID)
		if err != nil {
			c.Redirect(http.StatusSeeOther, "/")
			c.Abort()
			return
		}
		if found == false {
			c.Redirect(http.StatusSeeOther, "/")
			c.Abort()
			return
		}
		renderPost(post, c)
		c.Abort()
		return
	} else if c.Request.Host != config.HostWithoutScheme() {
		if c.Request.URL.Path == "/" || c.Request.URL.Path == "" {
			c.Redirect(http.StatusSeeOther, config.Host)
		} else {
			c.Redirect(http.StatusSeeOther, "/")
		}
		c.Abort()
		return
	}

	c.Next()
}
