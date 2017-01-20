package main

import (
	"encoding/json"
	"errors"
	"github.com/garyburd/redigo/redis"
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
	Title          string      `json:"title"`
	ID             int         `json:"ID"`
	Date           int         `json:"date"`
	Slug           string      `json:"slug"`
	Lang           string      `json:"lang"`
	Keywords       []string    `json:"keywords,omitempty"`
	Description    string      `json:"description,omitempty"`
	NbComments     int         `json:"nbComs"`
	Blocks         []PostBlock `json:"blocks"`
	Comments       []Comment   `json:"comments,omitempty"`
	ShowComments   bool        `json:"showComs,omitempty"`
	AcceptComments bool        `json:"acceptComs,omitempty"`
}

var (
	scriptPostList = redis.NewScript(0, `
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

		local key = "posts_fr"
		local nb_posts_per_page = 10
		local page = 0
		local first_post = page * nb_posts_per_page
		local last_post = first_post + (nb_posts_per_page - 1)

		local post_ids = redis.call('zrevrange', key, first_post, last_post)

		local result = {}

		for _, post_id in ipairs(post_ids) do
			local post_data = toStruct(redis.call('hgetall', post_id))
			-- blocks are stored in raw json format
			post_data.blocks = cjson.decode(post_data.blocks)

			-- convert number strings to actual numbers
			post_data.ID = tonumber(post_data.ID)
			post_data.date = tonumber(post_data.date)
			post_data.nbComs = tonumber(post_data.nbComs)

			result[#result+1] = post_data
		end

		return cjson.encode(result)
	`)

	scriptPostGet = redis.NewScript(0, `
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

		local post_id = "post_" .. ARGV[1]

		local post_data = toStruct(redis.call('hgetall', post_id))
		-- blocks are stored in raw json format
		post_data.blocks = cjson.decode(post_data.blocks)

		-- convert number strings to actual numbers
		post_data.ID = tonumber(post_data.ID)
		post_data.date = tonumber(post_data.date)
		post_data.nbComs = tonumber(post_data.nbComs)

		-- get comments

		local comment_sorted_set_id = "comments_" .. ARGV[1]

		local comment_ids = redis.call('zrange', comment_sorted_set_id, 0, -1)

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

		post_data.comments = comments

		local jsonResponse = cjson.encode(post_data)
		-- make sure empty comments table is encoded into json array
		if #comments == 0 then
			jsonResponse = string.gsub( jsonResponse, '"comments":{}', '"comments":[]' )
		end

		return jsonResponse
	`)

	scriptPostGetWithSlug = redis.NewScript(0, `
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

		local post_slug = ARGV[1]

		local post_id = redis.call('hget', 'pages_fr', post_slug)

		if post_id == nil then
			error("can't find post for slug")
		end

		local post_data = toStruct(redis.call('hgetall', post_id))
		-- blocks are stored in raw json format
		post_data.blocks = cjson.decode(post_data.blocks)

		-- convert number strings to actual numbers
		post_data.ID = tonumber(post_data.ID)
		post_data.date = tonumber(post_data.date)
		post_data.nbComs = tonumber(post_data.nbComs)

		-- get comments

		local comment_sorted_set_id = "comments_" .. ARGV[1]

		local comment_ids = redis.call('zrange', comment_sorted_set_id, 0, -1)

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

		post_data.comments = comments

		local jsonResponse = cjson.encode(post_data)
		-- make sure empty comments table is encoded into json array
		if #comments == 0 then
			jsonResponse = string.gsub( jsonResponse, '"comments":{}', '"comments":[]' )
		end

		return jsonResponse
	`)
)

// postGet returns a post for given ID
func postGet(ID string) (Post, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptPostGet.Do(redisConn, ID)
	if err != nil {
		return Post{}, err
	}

	byteSlice, ok := res.([]byte)

	if !ok {
		return Post{}, errors.New("can't cast response")
	}

	var post Post

	err = json.Unmarshal(byteSlice, &post)
	if err != nil {
		if err != nil {
			return Post{}, err
		}
	}

	post.Comments = OrderAndIndentComments(post.Comments)

	return post, nil
}

// postGetWithSlug returns the post indexed
// with given title slug
// NOTE: for now, only works for pages (posts that are not in the feed)
// we should have less differences between posts and pages.
// currently a "post" is a post in the blog feed (posts sorted by creation date)
// a "page" is not part of this feed, and indexed by title slug (while "posts" are not)
// we should be able to look for any kind of post by ID or by title slug
func postGetWithSlug(slug string) (Post, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptPostGetWithSlug.Do(redisConn, slug)
	if err != nil {
		return Post{}, err
	}

	byteSlice, ok := res.([]byte)

	if !ok {
		return Post{}, errors.New("can't cast response")
	}

	var post Post

	err = json.Unmarshal(byteSlice, &post)
	if err != nil {
		if err != nil {
			return Post{}, err
		}
	}

	post.Comments = OrderAndIndentComments(post.Comments)

	return post, nil
}

func postsList() ([]Post, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptPostList.Do(redisConn)
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

	var posts []Post

	err = json.Unmarshal(byteSlice, &posts)
	if err != nil {
		return nil, err
	}

	return posts, nil
}
