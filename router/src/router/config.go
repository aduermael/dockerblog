package main

import (
	"encoding/json"
	"io/ioutil"
	"strings"
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

func (c *Config) GetMostAppropriateLanguage(acceptedLanguages []string) (availableLang string, index int) {

	bestMatchWithoutVariant := -1

	for _, acceptedLanguage := range acceptedLanguages {

		// en-GB -> en
		withoutVariant := strings.Split(acceptedLanguage, "-")[0]

		for index, availableLang = range c.Lang {
			if availableLang == acceptedLanguage {
				return
			} else if bestMatchWithoutVariant == -1 && availableLang == withoutVariant {
				bestMatchWithoutVariant = index
			}
		}
	}

	// in case we found a match without variant
	if bestMatchWithoutVariant > -1 {
		availableLang = c.Lang[bestMatchWithoutVariant]
		index = bestMatchWithoutVariant
		return
	}

	// otherwise use first language in config...
	availableLang = c.Lang[0]
	index = 0
	return
}
