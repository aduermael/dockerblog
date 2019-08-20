package main

import (
	"blog/types"
	"strings"

	"golang.org/x/text/language"
)

func getMostAppropriateLanguage(langTags []language.Tag, conf *types.Config) (availableLang string, index int) {

	bestMatchWithoutVariant := -1

	for _, tag := range langTags {
		tagStr := tag.String()
		// en-GB -> en
		withoutVariant := strings.Split(tagStr, "-")[0]

		for index, availableLang = range conf.Langs {
			if availableLang == tagStr {
				return
			} else if bestMatchWithoutVariant == -1 && availableLang == withoutVariant {
				bestMatchWithoutVariant = index
			}
		}
	}

	// in case we found a match without variant
	if bestMatchWithoutVariant > -1 {
		availableLang = conf.Langs[bestMatchWithoutVariant]
		index = bestMatchWithoutVariant
		return
	}

	// otherwise use first language in config...
	availableLang = conf.Langs[0]
	index = 0
	return
}
