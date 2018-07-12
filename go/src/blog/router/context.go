package main

import (
	"blog/types"
	"errors"

	"github.com/gin-gonic/gin"
)

// ContextSetConfig ...
func ContextSetConfig(c *gin.Context) {
	config, err := types.CurrentConfig()
	if err != nil {
		serverError(c, "can't load configuration")
		c.Abort()
		return
	}
	c.Set("config", config)
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
