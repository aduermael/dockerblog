package main

import (
	"encoding/json"
	"errors"
	"io/ioutil"

	"github.com/gin-gonic/gin"
)

// Config describes general blog configuration
type Config struct {
	Lang         []string `json:"lang"`
	Title        []string `json:"title"`
	PostsPerPage int      `json:"postsPerPage"`
	Theme        string   `json:"theme"`
}

// LoadConfig loads configuration at configPath
func LoadConfig() (*Config, error) {

	config := &Config{}

	configBytes, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(configBytes, config)
	if err != nil {
		return nil, err
	}

	// TODO: make sure config file is correct
	// no mandotary fields should be missing
	// and fields are in expected format
	// we can also use default values

	return config, nil
}

// AttachConfig attaches config to gin context
func AttachConfig(c *gin.Context) {
	c.Set("config", *config)
}

// GetConfigFromContext returns config for given context
func GetConfigFromContext(c *gin.Context) (*Config, error) {
	configInterface, exists := c.Get("config")
	if !exists {
		return nil, errors.New("config can't be found in gin context")
	}
	conf, ok := configInterface.(Config)
	if !ok {
		return nil, errors.New("config incorrect format")
	}
	return &conf, nil
}

// GetTitle returns title to be displayed for
// given context
func GetTitle(c *gin.Context) string {
	conf, err := GetConfigFromContext(c)
	if err != nil {
		return ""
	}

	if conf.Title == nil || len(conf.Title) == 0 {
		return ""
	}

	langIndexInterface, exists := c.Get("langIndex")
	if !exists {
		return conf.Title[0]
	}

	langIndex, ok := langIndexInterface.(int)
	if !ok {
		return conf.Title[0]
	}

	if langIndex >= len(conf.Title) {
		return conf.Title[0]
	}

	return conf.Title[langIndex]
}
