package types

import (
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/garyburd/redigo/redis"
)

// Comment represents a Post comment
type Comment struct {
	Valid         bool   `json:"valid,omitempty"`
	PostID        int    `json:"postID"`
	Date          int    `json:"date,omitempty"`
	Email         string `json:"email,omitempty"`
	Name          string `json:"name"`
	ID            int    `json:"ID,omitempty"`
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
	// traps for robots
	EmailTrap string `json:"emailtrap,omitempty"`
	URLTrap   string `json:"urltrap,omitempty"`
}

// Accept makes sure the comment can be stored
// in DB and stores it if everything is ok.
// It returns an error otherwise.
func (c *Comment) Accept() (robot bool, err error) {
	// Simple trap for robots:
	// email and url fields are hidden to the users,
	// so if one of them is not empty, it means
	// the comment hasn't been sent by a human being.
	// Just return that everything is ok. :)
	if c.EmailTrap != "" || c.URLTrap != "" {
		return true, errors.New("author is a robot")
	}

	// name can't be empty
	if c.Name == "" {
		return false, errors.New("author name can't be empty")
	}

	// content can't be empty
	if c.Content == "" {
		return false, errors.New("content can't be empty")
	}

	// email is optional
	// make sure the address is valid if not empty
	if c.Email != "" {
		address, err := mail.ParseAddress(c.Email)
		if err != nil {
			return false, errors.New("email is not valid")
		}
		// only keep address if email of this form: Alice <alice@example.com>
		c.Email = strings.ToLower(address.Address)

		hash := md5.Sum([]byte(c.Email))
		c.GravatarHash = fmt.Sprintf("%x", hash)
	}

	// website is optional
	// make sure the address is valid if not empty
	if c.Website != "" {
		_, err := url.Parse(c.Website)
		if err != nil {
			return false, errors.New("website is not valid")
		}
	}

	// twitter handle is optional
	// make sure it is valid if not empty
	if c.Twitter != "" {
		// from https://support.twitter.com/articles/101299:
		// A username can only contain alphanumeric characters (letters A-Z, numbers 0-9)
		// with the exception of underscores, as noted above. Check to make sure your
		// desired username doesn't contain any symbols, dashes, or spaces.
		match, err := regexp.MatchString("^@?[a-zA-Z0-9_]+$", c.Twitter)
		if err != nil || !match {
			return false, errors.New("twitter username is not valid")
		}
		// keep it simple
		c.Twitter = strings.TrimPrefix(c.Twitter, "@")
	}

	err = c.Save()
	if err != nil {
		fmt.Print(err)
		return false, err
	}

	// TODO: cookies

	return false, nil
}

// Save saves a comment in DB
func (c *Comment) Save() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	jsonBytes, err := json.Marshal(c)
	if err != nil {
		return err
	}

	timestamp := time.Now().Unix() * 1000

	_, err = scriptSaveComment.Do(redisConn, string(jsonBytes), timestamp)
	if err != nil {
		return err
	}

	return nil
}

// CommentsByDate extends Comment and can be ordered by date
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

// redis lua scripts

var (
	scriptSaveComment = redis.NewScript(0, `
		local function notempty(s)
			return s ~= nil and s ~= ''
		end

		local commentJson = ARGV[1]
		local timestamp = ARGV[2]

		local comment = cjson.decode(commentJson)
			
		-- check if post exists 
		if comment.postID == nil or comment.postID == "" then
			error("post can't be found")
		end
		local postID = "post_" .. (comment.postID or "")

		if redis.call('exists', postID) ~= 1 then
			error("post can't be found (id: " .. postID .. ")")
		end

		-- TODO: make sure comments are opened for this post

		-- get post lang (we suppose comment lang == post lang)
		local lang = redis.call('hget', postID, 'lang')

		local isNew = false

		-- get id for new comments
		if comment.ID == nil or comment.ID == 0 then
			isNew = true
			comment.ID = redis.call('incr', 'commentCount')
			if comment.ID == nil then
				error("comment.ID == nil")
			end
		end

		local commentIDKey = "com_" .. comment.ID
		local all_comments_key = "comments_all_" .. lang
		local unvalidated_comments_key = "comments_unvalidated_" .. lang

		local valid = 0
		if comment.valid then
			valid = 1
		end

		redis.call('hmset', commentIDKey, 'ID', comment.ID, 'name', comment.name, 'content', comment.content, 'email', comment.email, 'date', timestamp, 'valid', valid, 'postID', comment.postID)

		-- remove fields that can be spared if empty
		-- (only if comment already exists)
		if isNew == false then
			redis.call('hdel', 'emailOnAnswer', 'gravatar', 'twitter', 'website', 'answerComID')
			redis.call('zrem', all_comments_key, commentIDKey)
			redis.call('zrem', unvalidated_comments_key, commentIDKey)
		end

		if comment.emailOnAnswer and notempty(comment.email) then
			redis.call('hset', commentIDKey, 'emailOnAnswer', 1)
		end

		if notempty(comment.gravatar) then
			redis.call('hset', commentIDKey, 'gravatar', comment.gravatar)
		end

		if notempty(comment.twitter) then
			redis.call('hset', commentIDKey, 'twitter', comment.twitter)
		end

		if notempty(comment.website) then
			redis.call('hset', commentIDKey, 'website', comment.website)
		end

		if comment.answerComID ~= nil and comment.answerComID ~= 0 then
			redis.call('hset', commentIDKey, 'answerComID', comment.answerComID)
		end

		-- set for all comments (to be listed in admin)
		redis.call('zadd', all_comments_key, timestamp, commentIDKey)

		-- unvalidated comments (to list in admin)
		if comment.valid == nil or comment.valid == false then
			redis.call('zadd', unvalidated_comments_key, timestamp, commentIDKey)
		end
	`)
)
