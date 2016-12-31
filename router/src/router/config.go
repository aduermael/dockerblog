package main

import (
	"encoding/json"
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

func (c *Config) GetTitle(lang string) string {
	_, langIndex := c.langToUse(lang)
	if langIndex >= len(c.Title) {
		return c.Title[0]
	}
	return c.Title[langIndex]
}

func (c *Config) langToUse(requestedLang string) (availableLang string, index int) {
	for index, availableLang = range c.Lang {
		if availableLang == requestedLang {
			return
		}
	}
	// if requested lang is not available, use the first one in the list
	availableLang = c.Lang[0]
	index = 0
	return
}
