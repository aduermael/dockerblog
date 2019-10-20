package main

import (
	"fmt"
	"io/ioutil"
	"strconv"
	"strings"
)

var (
	acceptedRunes []rune
)

func loadAcceptedRunes() error {
	acceptedRunes = make([]rune, 0)

	charBytes, err := ioutil.ReadFile("helvetica-char-codes.txt")
	if err != nil {
		return err
	}
	chars := strings.Split(string(charBytes), "\n")

	for _, char := range chars {
		char = strings.TrimSpace(char)
		char = strings.TrimPrefix(char, "0x")
		if char == "" {
			continue
		}

		i, err := strconv.ParseInt(char, 16, 32)
		if err != nil {
			fmt.Println(char)
			return err
		}
		// fmt.Printf("%c\n", i)
		acceptedRunes = append(acceptedRunes, rune(int32(i)))
	}
	return nil
}

func filterRunes(str string) string {
	res := ""
	for _, c := range str {
		if isAccepted(c) {
			res = res + string(c)
		}
	}
	return res
}

func isAccepted(r rune) bool {
	for _, ar := range acceptedRunes {
		if r == ar {
			return true
		}
	}
	return false
}
