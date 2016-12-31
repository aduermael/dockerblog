package main

import (
	"github.com/gin-gonic/gin"
	"golang.org/x/text/language"
	"log"
	"strings"
)

func DefineLang(c *gin.Context) {
	tags, _ /*weights*/, err := language.ParseAcceptLanguage(c.Request.Header.Get("Accept-Language"))
	if err != nil {
		log.Fatal(err)
	}

	// TODO: get lang preference from cookie if it exists
	// and push it in front of tags array

	configInterface, exists := c.Get("config")
	if !exists {
		log.Fatalln("config can't be found in gin context")
	}

	conf, ok := configInterface.(Config)
	if !ok {
		log.Fatalln("config incorrect format")
	}

	// get most appropriate lang and its index in configuration
	lang, langIndex := GetMostAppropriateLanguage(tags, &conf)

	c.Set("lang", lang)
	c.Set("langIndex", langIndex)

	// fmt.Println("lang:", lang, "(", langIndex, ")")

	c.Next()
}

func GetMostAppropriateLanguage(langTags []language.Tag, conf *Config) (availableLang string, index int) {

	bestMatchWithoutVariant := -1

	for _, tag := range langTags {
		tagStr := tag.String()
		// en-GB -> en
		withoutVariant := strings.Split(tagStr, "-")[0]

		for index, availableLang = range conf.Lang {
			if availableLang == tagStr {
				return
			} else if bestMatchWithoutVariant == -1 && availableLang == withoutVariant {
				bestMatchWithoutVariant = index
			}
		}
	}

	// in case we found a match without variant
	if bestMatchWithoutVariant > -1 {
		availableLang = conf.Lang[bestMatchWithoutVariant]
		index = bestMatchWithoutVariant
		return
	}

	// otherwise use first language in config...
	availableLang = conf.Lang[0]
	index = 0
	return
}
