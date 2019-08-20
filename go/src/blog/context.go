package main

import (
	"blog/types"
	"errors"

	"github.com/gin-gonic/gin"
	"golang.org/x/text/language"
)

// ContextSetConfig ...
func ContextSetConfig(c *gin.Context) {
	config, err := types.CurrentConfig()
	if err != nil {
		serverError(c, "can't load configuration")
		return
	}
	c.Set("config", config)
	c.Next()
}

// ContextSetLang uses gin context's attached configuration
// and the Accept-Language header eventual cookie to
// set the lang that should be used in that gin context.
func ContextSetLang(c *gin.Context) {
	tags, _ /*weights*/, err := language.ParseAcceptLanguage(c.Request.Header.Get("Accept-Language"))
	if err != nil {
		serverError(c, "can't parse accepted languages")
		return
	}

	// TODO: get lang preference from cookie if it exists
	// and push it in front of tags array

	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, "can't load configuration")
		return
	}

	// get most appropriate lang and its index in configuration
	lang, langIndex := getMostAppropriateLanguage(tags, config)

	c.Set("lang", lang)
	c.Set("langIndex", langIndex)

	c.Next()
}

// ContextGetConfig ...
func ContextGetConfig(c *gin.Context) (*types.Config, error) {
	configInterface, exists := c.Get("config")
	if !exists {
		return nil, errors.New("config can't be found in gin context")
	}

	conf, ok := configInterface.(*types.Config)
	if !ok {
		return nil, errors.New("config incorrect format --")
	}

	return conf, nil
}

// ContextLang ...
func ContextLang(c *gin.Context) string {
	lang, exists := c.Get("lang")
	if !exists {
		return ""
	}
	return lang.(string)
}

// ContextLangIndex ...
func ContextLangIndex(c *gin.Context) int {
	langIndex, exists := c.Get("langIndex")
	if !exists {
		return -1
	}
	return langIndex.(int)
}

// ContextTitle ...
func ContextTitle(c *gin.Context) string {
	config, err := ContextGetConfig(c)
	if err != nil {
		return ""
	}
	return config.Title(ContextLang(c))
}
