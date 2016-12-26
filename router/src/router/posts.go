package main

import (
	"encoding/json"
	"errors"
	"github.com/garyburd/redigo/redis"
	"log"
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
)

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

	log.Println("posts:", posts)
	return posts, nil
}
