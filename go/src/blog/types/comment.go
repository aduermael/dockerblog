package types

import (
	"blog/humanize"
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

	// Since is a formatted duration that can be
	// computed from Date
	Since string `json:"-"`
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

func (c *Comment) DateTime() time.Time {
	return time.Unix(int64(c.Date/1000), 0)
}

// Note: this could be done client side with javascript
// based on unix timestamp (post.Date)
func (c *Comment) ComputeSince() {
	c.Since = humanize.DisplayDuration(time.Since(c.DateTime()), nil)
}

func CommentComputeSince(comments []*Comment) {
	for _, comment := range comments {
		comment.ComputeSince()
	}
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

func NbUnvalidatedComments() int64 {
	n, err := nbComments(true)
	if err != nil {
		return 0
	}
	return n
}

func nbComments(unvalidatedOnly bool) (int64, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptNbComments.Do(redisConn, unvalidatedOnly)
	if err != nil {
		return 0, err
	}

	nbComments, ok := res.(int64)
	if !ok {
		return 0, errors.New("can't cast response")
	}

	return nbComments, nil
}

// ListAllComments ...
func ListAllComments(lang string, paginated bool, page, perPage int) ([]*Comment, error) {
	return listComments("all", lang, paginated, page, perPage)
}

// ListUnvalidatedComments ...
func ListUnvalidatedComments(lang string, paginated bool, page, perPage int) ([]*Comment, error) {
	return listComments("waiting", lang, paginated, page, perPage)
}

// ListCommentsForPost returns validated comments for given post ID
func ListCommentsForPost(postID string, paginated bool, page, perPage int) ([]*Comment, error) {
	return listComments("post", postID, paginated, page, perPage)
}

func listComments(category string, langOrPostID string, paginated bool, page, perPage int) ([]*Comment, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	pagination := 0
	if paginated {
		pagination = 1
	}

	res, err := scriptListComments.Do(redisConn, category, langOrPostID, pagination, page, perPage)
	if err != nil {
		return nil, err
	}

	byteSlice, ok := res.([]byte)
	if !ok {
		return nil, errors.New("can't cast response")
	}

	// empty Lua array is returned as "{}"
	// we should convert it to "[]" (empty json array)
	if len(byteSlice) == 2 {
		byteSlice = []byte("[]")
	}

	var comments []*Comment

	err = json.Unmarshal(byteSlice, &comments)
	if err != nil {
		return nil, err
	}

	return comments, nil
}

// Number of pages for comments
func CommentsNbPages(perPage int, unvalidatedOnly bool) (int64, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	if perPage < 1 {
		return 0, errors.New("page < 1")
	}

	res, err := scriptNbComments.Do(redisConn, unvalidatedOnly)
	if err != nil {
		return 0, err
	}

	nbComments, ok := res.(int64)

	if !ok {
		return 0, errors.New("can't cast response")
	}

	perPageInt64 := int64(perPage)

	nbPages := nbComments / perPageInt64
	if nbComments%perPageInt64 > 0 {
		nbPages += 1
	}

	return nbPages, nil
}

// CommentsByDate extends Comment and can be ordered by date
type CommentsByDate []*Comment

func (a CommentsByDate) Len() int           { return len(a) }
func (a CommentsByDate) Swap(i, j int)      { a[i], a[j] = a[j], a[i] }
func (a CommentsByDate) Less(i, j int) bool { return a[i].Date < a[j].Date }

// OrderAndIndentComments orders given comments by date
// then moves comments that are answers to other comments
// setting indentation for them to be displayed correctly
// NOTE(aduermael): it would be better to create an
// index for that in DB, and update it when receiving new
// comments instead of doing this dynamically for each request...
func OrderAndIndentComments(comments []*Comment) []*Comment {
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
					comments = append(comments[:p], append([]*Comment{comment}, comments[p:]...)...)
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

		-- See if comment can be accepted and/or approved

		local res = redis.call('hget', 'config', 'acceptComs')
		local acceptComsDefault = res == nil or res == "1"
		res = redis.call('hget', 'config', 'approveComs')
		local approveComsDefault = res == nil or res == "1"

		res = redis.call('hget', postID, 'acceptComs')
		local acceptComs = res ~= nil and res == "1"
		if res == nil then
			acceptComs = acceptComsDefault
		end
		
		res = redis.call('hget', postID, 'approveComs')
		local approveComs = res ~= nil and res == "1"
		if res == nil then
			approveComs = approveComsDefault
		end

		if acceptComs == false then
			error("this post does not accept comments")
		end

		-- set comment.valid = true if there's no need to approve comments
		if approveComs == false then
			comment.valid = true
		end

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
		local post_comments_key = "comments_" .. comment.postID

		local valid = 0
		if comment.valid then
			valid = 1
		end

		redis.call('hmset', commentIDKey, 'ID', comment.ID, 'name', comment.name, 'content', comment.content, 'email', comment.email, 'date', timestamp, 'valid', valid, 'postID', comment.postID)

		-- remove fields that can be spared if empty
		-- also remove comment from indexes to re-insert at the right place
		-- (only if comment already exists)
		if isNew == false then
			redis.call('hdel', commentIDKey, 'emailOnAnswer', 'gravatar', 'twitter', 'website', 'answerComID')
			redis.call('zrem', unvalidated_comments_key, commentIDKey)
			-- note: no need to remove from all_comments_key (timestamp will be updated)
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
		else 
			redis.call('zadd', post_comments_key, timestamp, commentIDKey)
			local nbComs = redis.call('zcard', post_comments_key)
			redis.call('hset', postID, 'nbComs', nbComs)
		end
	`)

	scriptNbComments = redis.NewScript(0, `
		-- TODO: stop using harcoded lang
		local lang = "fr"

		local unvalidatedOnly = ARGV[1]

		local count

		local key = "comments_all_" .. lang
		if unvalidatedOnly == "1" then
			key = "comments_unvalidated_" .. lang
		end

		count = redis.call('zcount', key, '-inf', '+inf')
		
		return count
	`)

	scriptListComments = redis.NewScript(0, `
		local toStruct = function (bulk)
			local result = {}
			local nextkey
			for i, v in ipairs(bulk) do
				if i % 2 == 1 then
					nextkey = v
				else
					result[nextkey] = v
				end
			end
			return result
		end

		-- "all", "waiting", "post"
		local what = ARGV[1]

		local comment_set_id

		if what == "all" then 
			local lang = ARGV[2]
			comment_set_id = "comments_all_" .. lang
		elseif what == "waiting" then 
			local lang = ARGV[2]
			comment_set_id = "comments_unvalidated_" .. lang
		elseif what == "post" then
			local postID = ARGV[2]
			comment_set_id = "comments_" .. postID
		else 
			error("can't find comments")
		end

		local paginated = tonumber(ARGV[3]) == 1
		local page = tonumber(ARGV[4])
		local perPage = tonumber(ARGV[5])

		local first = page * perPage

		local comment_ids

		if paginated == false then
			comment_ids = redis.call('zrange', comment_set_id, 0, -1)
		else
			-- TODO: paginated IDs
			comment_ids = redis.call('zrevrangebyscore', comment_set_id, '+inf', '-inf', 'LIMIT', first, perPage)
		end

		local comments = {}

		for _, comment_id in ipairs(comment_ids) do
			local comment_data = toStruct(redis.call('hgetall', comment_id))
			
			-- convert number strings to actual numbers
			comment_data.ID = tonumber(comment_data.ID)
			comment_data.postID = tonumber(comment_data.postID)
			comment_data.date = tonumber(comment_data.date)
			
			if comment_data.answerComID ~= nil then
				comment_data.answerComID = tonumber(comment_data.answerComID)
			end

			if comment_data.valid ~= nil and comment_data.valid == "1" then 
				comment_data.valid = true
			else
				comment_data.valid = false
			end

			if comment_data.emailOnAnswer ~= nil and comment_data.emailOnAnswer == "1" then 
				comment_data.emailOnAnswer = true
			else
				comment_data.emailOnAnswer = false
			end

			comments[#comments+1] = comment_data
		end

		return cjson.encode(comments)
	`)
)
