package main

import (
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"io/ioutil"
)

type Config struct {
	Lang         []string `json:"lang"`
	Title        []string `json:"title"`
	PostsPerPage int      `json:"postsPerPage"`
}

// LoadAndWatchConfig loads configuration at CONFIG_PATH
// and watches for changes to update config at given pointer
func LoadAndWatchConfig(c *Config) error {
	configBytes, err := ioutil.ReadFile(CONFIG_PATH)
	if err != nil {
		return err
	}

	err = json.Unmarshal(configBytes, c)
	if err != nil {
		return err
	}

	// TODO: make sure config file is correct
	// no mandotary fields should be missing
	// and fields are in expected format
	// we can also use default values

	// TODO: watch for changes

	return nil
}

func AttachConfig(c *gin.Context) {
	c.Set("config", *config)
}

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
