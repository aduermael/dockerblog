package main

import (
	"errors"
	"html/template"
)

// PostBlock defines a content block in a post
// It can be text, image, contact form...
type PostBlock map[string]template.HTML

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
	Comments    []Comment   `json:"comments,omitempty"`
}

type Comment struct {
	Valid         bool   `json:"valid"`
	PostID        int    `json:"postID"`
	Date          int    `json:"date"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	ID            int    `json:"ID"`
	GravatarHash  string `json:"gravatar,omitempty"`
	Content       string `json:"content"`
	EmailOnAnswer bool   `json:"emailOnAnswer,omitempty"`
	Twitter       string `json:"twitter,omitempty"`
	Website       string `json:"website,omitempty"`
	AnswerComID   int    `json:"answerComID,omitempty"`
	// Indent is used by OrderAndIndentComments
	Indent int `json:"-"`
	// NbAnswers is used by OrderAndIndentComments
	NbAnswers int `json:"-"`
}

// OrderAndIndentComments orders given comments by date
// then moves comments that are answers to other comments
// setting indentation for them to be displayed correctly
func OrderAndIndentComments(comments []Comment) []Comment {
	// TODO: implement
	return comments
}
