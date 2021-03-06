package types

import (
	"blog/humanize"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"time"

	"github.com/garyburd/redigo/redis"
)

// PostBlock defines a content block in a post
// It can be text, image, contact form...
type PostBlock map[string]template.HTML

// PostBlockType enumerates post block types
type PostBlockType int

const (
	// PostBlockTypeNone means there's no specific type assigned
	PostBlockTypeNone PostBlockType = iota
	// PostBlockTypeText is used for a text block
	PostBlockTypeText
	// PostBlockTypeImage is used for an image block
	PostBlockTypeImage
)

// GetType returns the post block's type
func (pb *PostBlock) GetType() (PostBlockType, error) {
	pbType := (*pb)["type"]
	switch pbType {
	case "text":
		return PostBlockTypeText, nil
	case "image":
		return PostBlockTypeImage, nil
	default:
		return PostBlockTypeNone, errors.New("block type not supported")
	}
}

// IsOfType ...
func (pb *PostBlock) IsOfType(t string) bool {
	return string((*pb)["type"]) == t
}

// ValueForKey ...
func (pb *PostBlock) ValueForKey(key string) template.HTML {
	return (*pb)[key]
}

// Post defines a blog post
type Post struct {
	Title                   string      `json:"title"`
	ID                      int         `json:"ID"`
	Date                    int         `json:"date"`
	Update                  int         `json:"update"`
	Slug                    string      `json:"slug"`
	Lang                    string      `json:"lang"`
	Keywords                []string    `json:"keywords,omitempty"`
	Description             string      `json:"description,omitempty"`
	NbComments              int         `json:"nbComs"`
	Blocks                  []PostBlock `json:"blocks"`
	Comments                []*Comment  `json:"comments,omitempty"`
	ShowComments            bool        `json:"showComs,omitempty"`
	AcceptComments          bool        `json:"acceptComs,omitempty"`
	CommentsRequireApproval bool        `json:"approveComs,omitempty"`
	SecretKey               string      `json:"secretKey,omitempty"`

	// previous/next post information
	// can be empty, used to display previous/next links in UI
	PreviousPostID    int    `json:"previousID,omitempty"`
	PreviousPostSlug  string `json:"previousSlug,omitempty"`
	PreviousPostTitle string `json:"previousTitle,omitempty"`
	NextPostID        int    `json:"nextID,omitempty"`
	NextPostSlug      string `json:"nextSlug,omitempty"`
	NextPostTitle     string `json:"nextTitle,omitempty"`

	FBPostID string `json:"fbPostID,omitempty"` // to sync with FB posts
	IsPage   bool   `json:"isPage,omitempty"`   // true if post is a page (not in blog feed, not in RSS)
	// Since is a formatted duration that can be
	// computed from Date
	Since string `json:"-"`
	// not saved in database
	// DateString & TimeString can be sent when adding a new post
	// or editing one. Date can be obtained from it using
	// timezone information from configuration
	DateString string `json:"datestring,omitempty"`
	TimeString string `json:"timestring,omitempty"`
	// DEPRECATED
	// Static page posts used to have "names" instead of "slugs"
	// "name" field won't be used anymore when saving. Keeping
	// it to generate correct slugs for existing pages.
	Name string `json:"name,omitempty"`
	//
	Error string `json:"error,omitempty"`
}

var (
	scriptNbPosts = redis.NewScript(0, `
		-- TODO: stop using harcoded lang
		local lang = "fr"

		local now = ARGV[1]
		local includeFuture = ARGV[2]
		local startDate = ARGV[3]
		local endDate = ARGV[4]
		local perPage = tonumber(ARGV[5])
		local staticPages = ARGV[6]

		local count

		if staticPages == "1" then
			local key = "pages_" .. lang
			count = redis.call('hlen', key)
		else
			local key = "posts_" .. lang
			if startDate ~= "-1" and endDate ~= "-1" then
				count = redis.call('zcount', key, startDate, endDate)
			elseif includeFuture == "1" then
				count = redis.call('zcount', key, '-inf', '+inf')
			else
				count = redis.call('zcount', key, '-inf', now)
			end
		end
		
		return count
		`)

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

		-- get default values
		-- use default values for comments if can't be found
		local showComsDefault = redis.call('hget', 'config', 'showComs')
		local acceptComsDefault = redis.call('hget', 'config', 'acceptComs')
		local approveComsDefault = redis.call('hget', 'config', 'approveComs')

		-- TODO: stop using harcoded lang
		local lang = "fr"

		local now = ARGV[1]
		local includeFuture = ARGV[2]
		local startDate = ARGV[3]
		local endDate = ARGV[4]
		local page = tonumber(ARGV[5])
		local perPage = tonumber(ARGV[6])
		local staticPages = ARGV[7]

		local first_post = page * perPage

		local post_ids

		if staticPages == "1" then
			local key = "pages_" .. lang
			post_ids = redis.call('hvals', key)
		else
			local key = "posts_" .. lang

			if startDate ~= "-1" and endDate ~= "-1" then
				post_ids = redis.call('zrevrangebyscore', key, endDate, startDate, 'LIMIT', first_post, perPage)
			elseif includeFuture == "1" then
				post_ids = redis.call('zrevrangebyscore', key, '+inf', '-inf', 'LIMIT', first_post, perPage)
			else
				post_ids = redis.call('zrevrangebyscore', key, now, '-inf', 'LIMIT', first_post, perPage)
			end
		end

		local result = {}

		for _, post_id in ipairs(post_ids) do
			local post_data = toStruct(redis.call('hgetall', post_id))

			-- blocks are stored in raw json format
			if post_data.blocks ~= nil then
				post_data.blocks = cjson.decode(post_data.blocks)
				-- remove if empty to avoid table to be serialized as '{}'
				if next(post_data.blocks) == nil then
					post_data.blocks = nil
				end
			end

			-- use default values for comments if can't be found
			if post_data.showComs == nil then
				post_data.showComs = showComsDefault
			end
			if post_data.acceptComs == nil then
				post_data.acceptComs = acceptComsDefault
			end
			if post_data.approveComs == nil then
				post_data.approveComs = approveComsDefault
			end

			-- convert number strings to actual numbers
			post_data.ID = tonumber(post_data.ID)
			post_data.date = tonumber(post_data.date)
			post_data.update = tonumber(post_data.update)
			post_data.nbComs = tonumber(post_data.nbComs)

			-- convert boolean strings to actual booleans
			post_data.showComs = post_data.showComs ~= nil and post_data.showComs == "1"
			post_data.acceptComs = post_data.acceptComs ~= nil and post_data.acceptComs == "1"
			post_data.approveComs = post_data.approveComs ~= nil and post_data.approveComs == "1"
			post_data.isPage = post_data.isPage ~= nil and post_data.isPage == "1"

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

		local res = redis.call('hgetall', post_id)
		-- check if not found
		if res[1] == nil then
			local res = {}
			res.error = "not found"
			return cjson.encode(res)
		end

		local post_data = toStruct(res)
		
		-- blocks are stored in raw json format
		post_data.blocks = cjson.decode(post_data.blocks)
		-- remove if empty to avoid table to be serialized as '{}'
		if next(post_data.blocks) == nil then
			post_data.blocks = nil
		end

		-- use default values for comments if can't be found
		if post_data.showComs == nil then
			post_data.showComs = redis.call('hget', 'config', 'showComs')
		end
		if post_data.acceptComs == nil then
			post_data.acceptComs = redis.call('hget', 'config', 'acceptComs')
		end
		if post_data.approveComs == nil then
			post_data.approveComs = redis.call('hget', 'config', 'approveComs')
		end

		-- convert number strings to actual numbers
		post_data.ID = tonumber(post_data.ID)
		post_data.date = tonumber(post_data.date)
		post_data.update = tonumber(post_data.update)
		post_data.nbComs = tonumber(post_data.nbComs)

		-- convert boolean strings to actual booleans
		post_data.showComs = post_data.showComs ~= nil and post_data.showComs == "1"
		post_data.acceptComs = post_data.acceptComs ~= nil and post_data.acceptComs == "1"
		post_data.approveComs = post_data.approveComs ~= nil and post_data.approveComs == "1"
		post_data.isPage = post_data.isPage ~= nil and post_data.isPage == "1"

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

			-- convert numbers and missing values to booleans
			comment_data.valid = comment_data.valid ~= nil and comment_data.valid == "1"
			comment_data.emailOnAnswer = comment_data.emailOnAnswer ~= nil and comment_data.emailOnAnswer == "1"
			comment_data.highlight = comment_data.highlight ~= nil and comment_data.highlight == "1"

			comments[#comments+1] = comment_data
		end

		post_data.comments = comments

		-- get previous and next posts

		if post_data.lang ~= nil and post_data.isPage == false then

			local posts_key = "posts_" .. post_data.lang
			local rank = redis.call('zrank', posts_key, post_id)

			-- Some pages may not be correctly marked as pages
			if rank == false then
				post_data.previousID = -1
				post_data.nextID = -1
			else
				-- zrange could return less than 3 results
				-- if there's no post before or after requested post
				local neighbor_ids = redis.call('zrange', posts_key, rank - 1, rank + 1)
				
				-- lookingForPrevious == false means looking for next one
				local lookingForPrevious = true

				local previousPostID = nil
				local nextPostID = nil

				for _, neighbor_id in ipairs(neighbor_ids) do
					if neighbor_id == post_id then
						lookingForPrevious = false
					elseif lookingForPrevious then 
						previousPostID = neighbor_id
					else 
						nextPostID = neighbor_id
					end
				end

				if previousPostID ~= nil then
					res = redis.call('hmget', previousPostID, 'ID', 'slug', 'title')
					post_data.previousID = tonumber(res[1])
					post_data.previousSlug = res[2]
					post_data.previousTitle = res[3]
				else 
					post_data.previousID = -1
				end

				if nextPostID ~= nil then
					res = redis.call('hmget', nextPostID, 'ID', 'slug', 'title')
					post_data.nextID = tonumber(res[1])
					post_data.nextsSlug = res[2]
					post_data.nextTitle = res[3]
				else 
					post_data.nextID = -1
				end
			end
		else 
			post_data.previousID = -1
			post_data.nextID = -1
		end -- post_data.lang != nil

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

		-- index (by slug)
		local kSlugs = 'slugs_fr' -- TODO: stop using hardcoded lang

		-- 'pages_<lang>' was used to store page slugs
		-- keep looking into it for legacy.
		-- Now post and page slugs are both indexed in 'slugs_<lang>'

		local post_id = redis.call('hget', kSlugs, post_slug)

		local force_page = false

		if post_id == false then
			-- legacy
			post_id = redis.call('hget', 'pages_fr', post_slug)
			
			if post_id == false then
				local res = {}
				res.error = "not found"
				return cjson.encode(res)
			end

			-- all posts that used to be 'pages_fr' are posts
			force_page = true
		end

		local post_data = toStruct(redis.call('hgetall', post_id))
		
		-- blocks are stored in raw json format
		post_data.blocks = cjson.decode(post_data.blocks)
		-- remove if empty to avoid table to be serialized as '{}'
		if next(post_data.blocks) == nil then
			post_data.blocks = nil
		end

		-- use default values for comments if can't be found
		if post_data.showComs == nil then
			post_data.showComs = redis.call('hget', 'config', 'showComs')
		end
		if post_data.acceptComs == nil then
			post_data.acceptComs = redis.call('hget', 'config', 'acceptComs')
		end
		if post_data.approveComs == nil then
			post_data.approveComs = redis.call('hget', 'config', 'approveComs')
		end

		-- convert number strings to actual numbers
		post_data.ID = tonumber(post_data.ID)
		post_data.date = tonumber(post_data.date)
		post_data.update = tonumber(post_data.update)
		post_data.nbComs = tonumber(post_data.nbComs)

		-- convert boolean strings to actual booleans
		post_data.showComs = post_data.showComs ~= nil and post_data.showComs == "1"
		post_data.acceptComs = post_data.acceptComs ~= nil and post_data.acceptComs == "1"
		post_data.approveComs = post_data.approveComs ~= nil and post_data.approveComs == "1"
		post_data.isPage = post_data.isPage ~= nil and post_data.isPage == "1"

		if force_page then 
			post_data.isPage = true
		end

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

			-- convert numbers and missing values to booleans
			comment_data.valid = comment_data.valid ~= nil and comment_data.valid == "1"
			comment_data.emailOnAnswer = comment_data.emailOnAnswer ~= nil and comment_data.emailOnAnswer == "1"
			comment_data.highlight = comment_data.highlight ~= nil and comment_data.highlight == "1"

			comments[#comments+1] = comment_data
		end

		post_data.comments = comments

		-- get previous and next posts

		local res

		if post_data.lang ~= nil and post_data.isPage == false then

			local posts_key = "posts_" .. post_data.lang
			local rank = redis.call('zrank', posts_key, post_id)
			-- zrange could return less than 3 results
			-- if there's no post before or after requested post
			local neighbor_ids = redis.call('zrange', posts_key, rank - 1, rank + 1)
			
			-- lookingForPrevious == false means looking for next one
			local lookingForPrevious = true

			local previousPostID = nil
			local nextPostID = nil

			for _, neighbor_id in ipairs(neighbor_ids) do
				if neighbor_id == post_id then
					lookingForPrevious = false
				elseif lookingForPrevious then 
					previousPostID = neighbor_id
				else 
					nextPostID = neighbor_id
				end
			end

			if previousPostID ~= nil then
				res = redis.call('hmget', previousPostID, 'ID', 'slug', 'title')
				post_data.previousID = tonumber(res[1])
				post_data.previousSlug = res[2]
				post_data.previousTitle = res[3]
			else 
				post_data.previousID = -1
			end

			if nextPostID ~= nil then
				res = redis.call('hmget', nextPostID, 'ID', 'slug', 'title')
				post_data.nextID = tonumber(res[1])
				post_data.nextsSlug = res[2]
				post_data.nextTitle = res[3]
			else 
				post_data.nextID = -1
			end

		else 
			post_data.previousID = -1
			post_data.nextID = -1
		end -- post_data.lang != nil


		-- enforce slug if missing
		if post_data.slug == nil then
			post_data.slug = post_slug
		end
		

		local jsonResponse = cjson.encode(post_data)
		-- make sure empty comments table is encoded into json array
		if #comments == 0 then
			jsonResponse = string.gsub( jsonResponse, '"comments":{}', '"comments":[]' )
		end

		return jsonResponse
	`)

	scriptPostSave = redis.NewScript(0, `
		local post = cjson.decode(ARGV[1])

		-- encode blocks
		local blocksStr = "[]" -- avoid "{}"
		if #post.blocks > 0 then
			blocksStr = cjson.encode(post.blocks)
		end

		-- assign unique post ID if post is new (ID == 0)
		if post.ID == 0 then 
			post.ID = tonumber(redis.call('incr', 'postCount'))
		end
		
		-- save post hash
		local kID = 'post_' .. post.ID

		local showComs = post.showComs and 1 or 0
		local acceptComs = post.acceptComs and 1 or 0
		local approveComs = post.approveComs and 1 or 0
		local isPage = post.isPage and 1 or 0

		redis.call('hmset', kID, 'blocks', blocksStr, 'date', post.date, 'update', post.update, 'ID', post.ID, 'slug', post.slug, 'title', post.title, 'lang', post.lang, 'showComs', showComs, 'acceptComs', acceptComs, 'approveComs', approveComs, 'isPage', isPage)

		if post.secretKey ~= nil and post.secretKey ~= '' then
			redis.call('hset', kID, 'secretKey', post.secretKey)
		end

		-- index by slug
		local kSlugs = 'slugs_' .. post.lang
		redis.call('hset', kSlugs, post.slug, kID)

		-- specific indexes for post & pages
		if post.isPage then
			-- hash where pages are stored (indexed by slug)
			local kPages = 'pages_' .. post.lang -- hash
			redis.call('hset', kPages, post.slug, kID) -- TODO: make sure not to erase another page
		else
			-- index (per date)
			local kDateOrdered = 'posts_' .. post.lang -- ordered set
			redis.call('zadd', kDateOrdered, post.date, kID)
		end

		-- register post to collect Facebook comments
		if post.fbPostID ~= nil and post.fbPostID ~= "" then
			redis.call('hmset', kID, 'fbpostID', post.fbPostID)
			-- comments from FB will be collected for post for a period of time
			local fbcommentInfos = { postUpdate = post.update , fbPostID = post.fbPostID, postID = post.ID, since = 0 }
			redis.call('hset', 'fbcomments', post.ID, cjson.encode(fbcommentInfos))
		else 
			-- remove existing values (if any)
			redis.call('hdel', kID, 'fbpostID')
			redis.call('hdel', 'fbcomments', post.ID)
		end

		return cjson.encode(post)
	`)

	scriptPostDelete = redis.NewScript(0, `
		local post = cjson.decode(ARGV[1])

		local kID = 'post_' .. post.ID

		-- Try all langs, to make sure the post is removed
		-- Old version of the engine did not attach the 
		-- lang to the post

		local kPagesForEachLang = redis.call('keys', 'pages_*')
		for _, kPages in ipairs(kPagesForEachLang) do
			redis.call('hdel', kPages, post.slug)
			-- post used to have names instead of slugs (legacy)
			if post.name ~= nil then
				redis.call('hdel', kPages, post.name)
			end
		end

		local kSlugsForEachLang = redis.call('keys', 'slugs_*')
		for _, kSlugs in ipairs(kSlugsForEachLang) do
			redis.call('hdel', kSlugs, post.slug)
			-- post used to have names instead of slugs (legacy)
			if post.name ~= nil then
				redis.call('hdel', kSlugs, post.name)
			end
		end

		local kDateOrderedForEachLang = redis.call('keys', 'posts_*')
		for _, kDateOrdered in ipairs(kDateOrderedForEachLang) do
			redis.call('zrem', kDateOrdered, kID)
		end

		redis.call('del', kID)

		-- in case post is registered to sync fb comments
		redis.call('hdel', 'fbcomments', post.ID)
	`)

	scriptGetOldestAndNewest = redis.NewScript(0, `
		local lang = ARGV[1]
		local kDateOrdered = 'posts_' .. lang

		local oldest = redis.call('zrangebyscore', kDateOrdered, '-inf', '+inf', 'LIMIT', 0, 1, 'WITHSCORES')
		if #oldest ~= 2 then 
			error("posts not found")
		end

		local newest = redis.call('zrevrangebyscore', kDateOrdered, '+inf', '-inf', 'LIMIT', 0, 1, 'WITHSCORES')
		if #newest ~= 2 then 
			error("posts not found")
		end

		local result = {}
		result.oldest = tonumber(oldest[2])
		result.newest = tonumber(newest[2])

		return cjson.encode(result)
	`)
)

func (p *Post) DateTime() time.Time {
	return time.Unix(int64(p.Date), 0)
}

// Note: this could be done client side with javascript
// based on unix timestamp (post.Date)
func (p *Post) ComputeSince() {
	p.Since = humanize.DisplayDuration(time.Since(p.DateTime()), nil)
	CommentComputeSince(p.Comments)
}

func PostComputeSince(posts []*Post) {
	for _, post := range posts {
		post.ComputeSince()
		CommentComputeSince(post.Comments)
	}
}

// IsNew returns true if the post is new (ID == 0)
func (p *Post) IsNew() bool {
	return p.ID == 0
}

// Save saves post in DB
// An new ID is assigned to the post if post.ID == -1
func (p *Post) Save() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	b, err := json.Marshal(p)
	if err != nil {
		fmt.Println("ERROR (1):", err)
		return err
	}

	res, err := scriptPostSave.Do(redisConn, string(b))
	if err != nil {
		fmt.Println("ERROR (2):", err)
		return err
	}

	byteSlice, ok := res.([]byte)
	if !ok {
		fmt.Println("ERROR (3)")
		return errors.New("can't cast response")
	}

	// empty Lua array is returned as "{}"
	// we should convert it to "[]" (empty json array)
	if len(byteSlice) == 2 {
		byteSlice = []byte("[]")
	}
	byteSlice = bytes.Replace(byteSlice, []byte("{}"), []byte("[]"), -1)

	err = json.Unmarshal(byteSlice, p)
	if err != nil {
		fmt.Println("ERROR (4):", err)
		return err
	}

	return nil
}

// Delete removes post from database.
// The Post instance is still valid after the operation.
func (p *Post) Delete() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	b, err := json.Marshal(p)
	if err != nil {
		fmt.Println("ERROR (1):", err)
		return err
	}

	_, err = scriptPostDelete.Do(redisConn, string(b))
	if err != nil {
		fmt.Println("ERROR (2):", err)
		return err
	}

	return nil
}

// PostGet returns a post for given ID
// returns Post, found, error
func PostGet(ID string) (*Post, bool, error) {

	redisConn := redisPool.Get()
	defer redisConn.Close()

	post := &Post{}

	res, err := scriptPostGet.Do(redisConn, ID)
	if err != nil {
		return post, true, err
	}

	byteSlice, ok := res.([]byte)

	if !ok {
		return post, true, errors.New("can't cast response")
	}

	err = json.Unmarshal(byteSlice, post)

	if err != nil {
		return post, true, err
	}

	if post.Error == "not found" {
		return post, false, errors.New("not found")
	}

	post.Comments = OrderAndIndentComments(post.Comments)

	return post, true, nil
}

// PostGetWithSlug returns the post indexed
// with given title slug
// NOTE: for now, only works for pages (posts that are not in the feed)
// we should have less differences between posts and pages.
// currently a "post" is a post in the blog feed (posts sorted by creation date)
// a "page" is not part of this feed, and indexed by title slug (while "posts" are not)
// we should be able to look for any kind of post by ID or by title slug
func PostGetWithSlug(slug string) (*Post, bool, error) {

	redisConn := redisPool.Get()
	defer redisConn.Close()

	post := &Post{}

	res, err := scriptPostGetWithSlug.Do(redisConn, slug)
	if err != nil {
		fmt.Println("LUA ERROR:", err)
		return post, true, err
	}

	byteSlice, ok := res.([]byte)

	if !ok {
		fmt.Println("CAN'T CAST")
		return post, true, errors.New("can't cast response")
	}

	err = json.Unmarshal(byteSlice, post)
	if err != nil {
		fmt.Println("UNMARSHALL ERR")
		return post, true, err
	}

	if post.Error == "not found" {
		return post, false, errors.New("not found")
	}

	post.Comments = OrderAndIndentComments(post.Comments)

	return post, true, nil
}

// Number of pages for posts with given parameters
func PostsNbPages(includeFuture bool, perPage int, year int, month int, timeLocation *time.Location, staticPages bool) (int64, error) {

	redisConn := redisPool.Get()
	defer redisConn.Close()

	if perPage < 1 {
		return 0, errors.New("page < 1")
	}

	now := int(time.Now().Unix())

	start := int64(-1)
	end := int64(-1)

	if year != -1 && month != -1 {
		start = time.Date(year, time.Month(month), 1, 0, 0, 0, 0, timeLocation).Unix()
		nextMonth := month + 1
		nextYear := year
		if nextMonth > 12 {
			nextMonth = 1
			nextYear++
		}
		end = time.Date(nextYear, time.Month(nextMonth), 1, 0, 0, 0, 0, timeLocation).Unix()
	}

	res, err := scriptNbPosts.Do(redisConn, now, includeFuture, start, end, perPage, staticPages)
	if err != nil {
		return 0, err
	}

	nbPosts, ok := res.(int64)
	if !ok {
		return 0, errors.New("can't cast response")
	}

	perPageInt64 := int64(perPage)

	nbPages := nbPosts / perPageInt64
	if nbPosts%perPageInt64 > 0 {
		nbPages += 1
	}

	return nbPages, nil
}

// PostsList returns a list of posts
// page has to be >= 0
// perPage has to be >= 1
// pagination starts from most recent post
// year & month can be set to list all posts of a given month (pagination still applies)
// To list all posts set year & month to -1
// TODO: lang shouldn't be hardcoded to "fr"
func PostsList(includeFuture bool, page int, perPage int, year int, month int, timeLocation *time.Location, staticPages bool) ([]*Post, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	if page < 0 {
		return nil, errors.New("page < 0")
	}

	if perPage < 1 {
		return nil, errors.New("perPage < 1")
	}

	now := int(time.Now().Unix())

	start := int64(-1)
	end := int64(-1)

	if year != -1 && month != -1 {
		start = time.Date(year, time.Month(month), 1, 0, 0, 0, 0, timeLocation).Unix()
		nextMonth := month + 1
		nextYear := year
		if nextMonth > 12 {
			nextMonth = 1
			nextYear++
		}
		end = time.Date(nextYear, time.Month(nextMonth), 1, 0, 0, 0, 0, timeLocation).Unix()
	}

	res, err := scriptPostList.Do(redisConn, now, includeFuture, start, end, page, perPage, staticPages)
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

	var posts []*Post
	err = json.Unmarshal(byteSlice, &posts)
	if err != nil {
		return nil, err
	}

	// All static pages are returned when calling scriptPostList,
	// not considering perPage argument.
	// It would be better to update the logic elsewhere, but
	// let's filter posts here for now:
	if staticPages {
		from := page * perPage
		to := (page + 1) * perPage
		if to > len(posts) {
			to = len(posts)
		}
		posts = posts[from:to]
	}

	return posts, nil
}

var defaultMonths = []string{
	"January", "February", "March",
	"April", "May", "June",
	"July", "August", "September",
	"October", "November", "December",
}

// Archive ...
type Archive struct {
	Month int
	Year  int
}

// ArchiveLimits ...
type ArchiveLimits struct {
	Oldest int64 `json:"oldest"`
	Newest int64 `json:"newest"`
}

// PostGetArchiveMonths ...
func PostGetArchiveMonths(lang string, timeLocation *time.Location, months []string) ([]*Archive, error) {
	if months == nil {
		months = defaultMonths
	}

	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptGetOldestAndNewest.Do(redisConn, lang)
	if err != nil {
		return nil, err
	}

	byteSlice, ok := res.([]byte)
	if !ok {
		return nil, errors.New("can't cast response")
	}

	var limits ArchiveLimits

	err = json.Unmarshal(byteSlice, &limits)
	if err != nil {
		return nil, err
	}

	oldest := time.Unix(limits.Oldest, 0)
	newest := time.Unix(limits.Newest, 0)

	oldest = oldest.In(timeLocation)
	newest = newest.In(timeLocation)

	newestMonth := int(newest.Month())
	newestYear := int(newest.Year())
	oldestMonth := int(oldest.Month())
	oldestYear := int(oldest.Year())

	nBMonths := 0
	if oldestYear == newestYear {
		nBMonths = newestMonth - oldestMonth + 1
	} else {
		// last year months
		nBMonths = newestMonth
		// full years
		nBMonths += (newestYear - (oldestYear + 1)) * 12
		// first year months
		nBMonths += 13 - oldestMonth
	}

	archives := make([]*Archive, nBMonths)

	currentMonth := oldest.Month()
	currentYear := oldest.Year()

	for i := nBMonths - 1; i >= 0; i-- {
		archives[i] = &Archive{
			Month: int(currentMonth),
			Year:  int(currentYear),
		}

		if currentMonth == time.December {
			currentMonth = time.January
			currentYear += 1
		} else {
			currentMonth += 1
		}
	}

	return archives, nil
}
