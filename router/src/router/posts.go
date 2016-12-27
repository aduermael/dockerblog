package main

import (
	"encoding/json"
	"errors"
	"github.com/garyburd/redigo/redis"
	// "log"
)

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

		return cjson.encode(post_data)
	`)
)

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
		return Post{}, err
	}

	// log.Println("post:", post)
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

	var posts []Post

	err = json.Unmarshal(byteSlice, &posts)
	if err != nil {
		return nil, err
	}

	// log.Println("posts:", posts)
	return posts, nil
}
