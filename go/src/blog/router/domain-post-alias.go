package main

import (
	"fmt"
	"net/http"

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

	if c.Request.URL.Path != "/" && c.Request.URL.Path != "" {
		c.Next()
		return
	}

	if postID, exists := config.DomainPostAliases[c.Request.Host]; exists {
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
	}

	c.Next()
}
