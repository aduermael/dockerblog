package main

import (
	"blog/types"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func adminComments(page int, unvalidatedOnly bool, c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	var comments []*types.Comment

	if unvalidatedOnly {
		comments, err = types.ListUnvalidatedComments("fr", true, page, config.PostsPerPage)
	} else {
		comments, err = types.ListAllComments("fr", true, page, config.PostsPerPage)
	}

	if err != nil {
		serverError(c, err.Error())
		return
	}

	nbPages, err := types.CommentsNbPages(config.PostsPerPage, unvalidatedOnly)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "admin_comments.tmpl", gin.H{
		"title":                 "Admin - comments",
		"lang":                  ContextLang(c),
		"comments":              comments,
		"nbPages":               int(nbPages),
		"currentPage":           page,
		"scope":                 "comments",
		"nbUnvalidatedComments": types.NbUnvalidatedComments(),
	})
}

type commentActionRequest struct {
	CommentID string `json:"id"`
}

func adminAcceptComment(c *gin.Context) {
	req := &commentActionRequest{}
	err := c.BindJSON(req)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	comment, err := types.GetComment(req.CommentID)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	fmt.Println(comment)
	fmt.Println("ID:", comment.ID)

	comment.Valid = true
	err = comment.Save()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	ok(c)
}
