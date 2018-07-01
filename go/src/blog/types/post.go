package types

import (
	"blog/humanize"
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
	Title          string      `json:"title"`
	ID             int         `json:"ID"`
	Date           int         `json:"date"`
	Update         int         `json:"update"`
	Slug           string      `json:"slug"`
	Lang           string      `json:"lang"`
	Keywords       []string    `json:"keywords,omitempty"`
	Description    string      `json:"description,omitempty"`
	NbComments     int         `json:"nbComs"`
	Blocks         []PostBlock `json:"blocks"`
	Comments       []*Comment  `json:"comments,omitempty"`
	ShowComments   bool        `json:"showComs,omitempty"`
	AcceptComments bool        `json:"acceptComs,omitempty"`
	FBPostID       string      `json:"fbPostID"` // to sync with FB posts
	// Since is a formatted duration that can be
	// computed from Date
	Since string `json:"-"`
	// not saved in database
	// DateString & TimeString can be sent when adding a new post
	// or editing one. Date can be obtained from it using
	// timezone information from configuration
	DateString string `json:"datestring,omitempty"`
	TimeString string `json:"timestring,omitempty"`
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

		local now = ARGV[1]
		local includeFuture = ARGV[2]

		local key = "posts_fr"
		local nb_posts_per_page = 10
		local page = 0
		local first_post = page * nb_posts_per_page
		local last_post = first_post + (nb_posts_per_page - 1)

		local post_ids

		if includeFuture == "1" then
			post_ids = redis.call('zrevrangebyscore', key, '+inf', '-inf', 'LIMIT', first_post, last_post)
		else
			post_ids = redis.call('zrevrangebyscore', key, now, '-inf', 'LIMIT', first_post, last_post)
		end

		local result = {}

		for _, post_id in ipairs(post_ids) do
			local post_data = toStruct(redis.call('hgetall', post_id))

			-- blocks are stored in raw json format
			post_data.blocks = cjson.decode(post_data.blocks)
			-- remove if empty to avoid table to be serialized as '{}'
			if next(post_data.blocks) == nil then
				post_data.blocks = nil
			end

			-- convert number strings to actual numbers
			post_data.ID = tonumber(post_data.ID)
			post_data.date = tonumber(post_data.date)
			post_data.update = tonumber(post_data.update)
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

		local res = redis.call('hgetall', post_id)
		-- check if not found
		if res[1] == nil then
			error("can't find post for id")
		end

		local post_data = toStruct(res)
		
		-- blocks are stored in raw json format
		post_data.blocks = cjson.decode(post_data.blocks)
		-- remove if empty to avoid table to be serialized as '{}'
		if next(post_data.blocks) == nil then
			post_data.blocks = nil
		end

		-- convert number strings to actual numbers
		post_data.ID = tonumber(post_data.ID)
		post_data.date = tonumber(post_data.date)
		post_data.update = tonumber(post_data.update)
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

		-- index (by slug)
		local kSlugs = 'slugs_fr' -- TODO: stop using hardcoded lang

		-- 'pages_<lang>' was used to store page slugs
		-- keep looking into it for legacy.
		-- Now post and page slugs are both indexed in 'slugs_<lang>'

		local post_id = redis.call('hget', kSlugs, post_slug)

		if post_id == nil then
			-- legacy
			post_id = redis.call('hget', 'pages_fr', post_slug)
			if post_id == nil then
				error("can't find post for slug")
			end
		end

		local post_data = toStruct(redis.call('hgetall', post_id))
		
		-- blocks are stored in raw json format
		post_data.blocks = cjson.decode(post_data.blocks)
		-- remove if empty to avoid table to be serialized as '{}'
		if next(post_data.blocks) == nil then
			post_data.blocks = nil
		end

		-- convert number strings to actual numbers
		post_data.ID = tonumber(post_data.ID)
		post_data.date = tonumber(post_data.date)
		post_data.update = tonumber(post_data.update)
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

	scriptPostSave = redis.NewScript(0, `
		local post = cjson.decode(ARGV[1])

		-- assign unique post ID if post is new (ID == 0)
		if post.ID == 0 then 
			post.ID = tonumber(redis.call('incr', 'postCount'))
		end

		local kID = 'post_' .. post.ID
		-- index (per date)
		local kDateOrdered = 'posts_' .. post.lang
		-- index (by slug)
		local kSlugs = 'slugs_' .. post.lang

		local blocksStr = "[]" -- avoid "{}"
		if #post.blocks > 0 then
			blocksStr = cjson.encode(post.blocks)
		end

		redis.call('hmset', kID, 'blocks', blocksStr, 'date', post.date, 'update', post.update, 'ID', post.ID, 'slug', post.slug, 'title', post.title, 'lang', post.lang)
		redis.call('zadd', kDateOrdered, post.date, kID)
		redis.call('hset', kSlugs, post.slug, kID)

		if post.fbPostID ~= "" then
			redis.call('hmset', kID, 'fbpostID', post.fbPostID)
			-- comments from FB will be collected for post for a period of time
			local fbcommentInfos = { postUpdate = post.update , fbPostID = post.fbPostID, postID = post.ID, since = 0 }
			redis.call('hset', 'fbcomments', post.ID, cjson.encode(fbcommentInfos))
		end

		return cjson.encode(post)
	`)

	scriptPostDelete = redis.NewScript(0, `
		local post = cjson.decode(ARGV[1])

		local kID = 'post_' .. post.ID
		-- index (per date)
		local kDateOrdered = 'posts_' .. post.lang
		-- index (by slug)
		local kSlugs = 'slugs_' .. post.lang

		redis.call('del', kID)
		redis.call('zrem', kDateOrdered, kID)
		redis.call('hdel', kSlugs, post.slug)

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
	return time.Unix(int64(p.Date/1000), 0)
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

	fmt.Println("DELETE POST #", p.ID)

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
func PostGet(ID string) (Post, error) {
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
		return Post{}, err
	}

	post.Comments = OrderAndIndentComments(post.Comments)

	return post, nil
}

// PostGetWithSlug returns the post indexed
// with given title slug
// NOTE: for now, only works for pages (posts that are not in the feed)
// we should have less differences between posts and pages.
// currently a "post" is a post in the blog feed (posts sorted by creation date)
// a "page" is not part of this feed, and indexed by title slug (while "posts" are not)
// we should be able to look for any kind of post by ID or by title slug
func PostGetWithSlug(slug string) (Post, error) {
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

// PostsList returns a list of posts
// TODO: pagination
// TODO: from what feed?
// TODO: sort option
// TODO: lang shouldn't hardcoded to "fr"
func PostsList(includeFuture bool) ([]*Post, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	now := int(time.Now().Unix()) * 1000

	res, err := scriptPostList.Do(redisConn, now, includeFuture)
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
	Name string
	// timestamps (ms)
	Start int64
	End   int64
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

	oldest := time.Unix(limits.Oldest/1000, 0) // ÷1000 because of legacy (we used to store milliseconds)
	newest := time.Unix(limits.Newest/1000, 0) // ÷1000 because of legacy (we used to store milliseconds)

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
			Name:  fmt.Sprintf("%s %d", months[currentMonth-1], currentYear),
			Start: time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, timeLocation).Unix(),
			End:   time.Date(currentYear, currentMonth+1, 1, 0, 0, 0, 0, timeLocation).Unix(),
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
