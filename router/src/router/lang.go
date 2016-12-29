package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
)

func DefineLang(c *gin.Context) {
	acceptedLanguages := c.Request.Header["Accept-Language"]
	fmt.Println("Accepted languages:", acceptedLanguages)

	// TODO: get lang preference from cookie if it exists
	// and push it in from of acceptedLanguages array

	c.Next()
}
