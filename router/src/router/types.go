package main

import (
	"errors"
	"html/template"
	"sort"
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

type CommentsByDate []Comment

func (a CommentsByDate) Len() int           { return len(a) }
func (a CommentsByDate) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a CommentsByDate) Less(i, j int) bool { return a[i].Date < a[j].Date }

// OrderAndIndentComments orders given comments by date
// then moves comments that are answers to other comments
// setting indentation for them to be displayed correctly
// NOTE(aduermael): it would be better to create an
// index for that in DB, and update it when receiving new
// comments instead of doing this dynamically for each request...
func OrderAndIndentComments(comments []Comment) []Comment {

	sort.Sort(CommentsByDate(comments))

	l := len(comments)
	last := l - 1

	for i := 0; i < l; i++ {
		comment := comments[i]
		// comment answers to an older comment
		if comment.AnswerComID != 0 {
			for j := i - 1; j >= 0; j-- {
				if comments[j].ID == comment.AnswerComID {
					comment.Indent = comments[j].Indent + 1
					comments[j].NbAnswers++

					// cut
					if i == last {
						comments = comments[:i]
					} else {
						comments = append(comments[:i], comments[i+1:]...)
					}

					// insert
					p := j + comments[j].NbAnswers
					comments = append(comments[:p], append([]Comment{comment}, comments[p:]...)...)
				}
			}
		}
	}

	return comments
}
