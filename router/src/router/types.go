package main

import (
	"errors"
)

// PostBlock defines a content block in a post
// It can be text, image, contact form...
type PostBlock map[string]string

type PostBlockType int

const (
	PostBlockType_None PostBlockType = iota
	PostBlockType_Text
	PostBlockType_Image
)

func (pb *PostBlock) GetType() (PostBlockType, error) {
	pbType := (*pb)["type"]
	switch pbType {
	case "text":
		return PostBlockType_Text, nil
	case "image":
		return PostBlockType_Image, nil
	default:
		return PostBlockType_None, errors.New("block type not supported")
	}
}

// Post defines a blog post
type Post struct {
	Title       string      `json:"title"`
	ID          int         `json:"ID"`
	Date        int         `json:"date"`
	Slug        string      `json:"slug"`
	Lang        string      `json:"lang"`
	Keywords    []string    `json:"keywords,omitempty"`
	Description string      `json:"description,omitempty"`
	NbComments  int         `json:"nbComs"`
	Blocks      []PostBlock `json:"blocks"`
}
