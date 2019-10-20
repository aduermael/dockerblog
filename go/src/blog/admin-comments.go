package main

import (
	"blog/types"
	"bytes"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	sendgrid "github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

func adminComments(page int, unvalidatedOnly bool, c *gin.Context) {
	config, err := ContextGetConfig(c)
	if err != nil {
		serverError(c, err.Error())
		return
	}

	var comments []*types.Comment

	if unvalidatedOnly {
		comments, err = types.ListUnvalidatedComments("fr", true, page, config.PostsPerPage)
	} else {
		comments, err = types.ListAllComments("fr", true, page, config.PostsPerPage)
	}

	if err != nil {
		serverError(c, err.Error())
		return
	}

	nbPages, err := types.CommentsNbPages(config.PostsPerPage, unvalidatedOnly)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.HTML(http.StatusOK, "admin_comments.tmpl", gin.H{
		"title":                 "Admin - comments",
		"lang":                  ContextLang(c),
		"comments":              comments,
		"nbPages":               int(nbPages),
		"currentPage":           page,
		"scope":                 "comments",
		"nbUnvalidatedComments": types.NbUnvalidatedComments(),
	})
}

type commentActionRequest struct {
	CommentID string `json:"id"`
}

func adminAcceptComment(c *gin.Context) {
	req := &commentActionRequest{}
	err := c.BindJSON(req)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	comment, err := types.GetComment(req.CommentID)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	sendEmail := comment.Valid == false

	comment.Valid = true
	err = comment.Save()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	if sendEmail {
		emailCommentResponse(comment, c)
	}

	ok(c)
}

func adminDeleteComment(c *gin.Context) {
	req := &commentActionRequest{}
	err := c.BindJSON(req)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	comment, err := types.GetComment(req.CommentID)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	err = comment.Delete()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	ok(c)
}

func adminHighlightComment(c *gin.Context) {
	adminCommentHighlight(true, c)
}

func adminUnhighlightComment(c *gin.Context) {
	adminCommentHighlight(false, c)
}

func adminCommentHighlight(b bool, c *gin.Context) {
	req := &commentActionRequest{}
	err := c.BindJSON(req)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	comment, err := types.GetComment(req.CommentID)
	if err != nil {
		badRequest(c, err.Error())
		return
	}

	comment.Highlighted = b
	err = comment.Save()
	if err != nil {
		serverError(c, err.Error())
		return
	}

	ok(c)
}

// Sends email if comment is an answer to another comment
// that opted for email on response
func emailCommentResponse(comment *types.Comment, c *gin.Context) {

	if comment.AnswerComID != 0 && comment.Valid == true {

		config, err := ContextGetConfig(c)
		if err != nil {
			log.Println("can't email comment response:", err.Error())
			return
		}

		original, err := types.GetComment(strconv.Itoa(comment.AnswerComID))
		if err != nil {
			log.Println("COMMENT EMAIL ERROR:", err)
			return
		}

		// Some commenters may be flagged because we don't
		// want them to generate emails when they answer comments.
		for _, commenter := range config.CommentersNotGeneratingEmails {
			if commenter.Name != "" && commenter.Name == comment.Name {
				return
			}
			if commenter.Email != "" && commenter.Email == comment.Email {
				return
			}
		}

		if original.EmailOnAnswer {
			caa := &types.CommentAndAnswer{
				Host:     config.Host,
				Button:   "Répondre",
				Original: original,
				Answer:   comment,
			}

			html := ""
			buf := &bytes.Buffer{}
			err = answerEmailTemplateHTML.Execute(buf, caa)
			if err != nil {
				log.Println("answer email html template error:", err.Error())
			} else {
				html = buf.String()
			}

			txt := ""
			buf = &bytes.Buffer{}
			err = answerEmailTemplateTxt.Execute(buf, caa)
			if err != nil {
				log.Println("answer email txt template error:", err.Error())
			} else {
				txt = buf.String()
			}

			from := mail.NewEmail("Le blog de Laurel", "noreply@bloglaurel.com")
			subject := "✨✉️✨ " + comment.Name + " a répondu à votre commentaire sur bloglaurel.com"
			to := mail.NewEmail(original.Name, original.Email)
			plainTextContent := txt
			htmlContent := html
			message := mail.NewSingleEmail(from, subject, to, plainTextContent, htmlContent)
			client := sendgrid.NewSendClient(config.SendgridAPIKey)
			_, err := client.Send(message)
			if err != nil {
				log.Println("SENDGRID ERROR:", err)
			} else {
				// fmt.Printf("SENT TO %s: \n%s\n\n%s\n", original.Email, html, txt)
			}
		}
	}
}
