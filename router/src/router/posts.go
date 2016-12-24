package main

import (
	"log"
)

var (
	sha1PostList = ""
)

func postsLoadScripts() {

}

func postsList() {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	script := `
		local key = "posts_fr"
		local nb_posts_per_page = 10
		local page = 0
		local first_post = page * nb_posts_per_page
		local last_post = first_post + (nb_posts_per_page - 1)

		local elements = redis.call('zrevrange', key, first_post, last_post)

		return cjson.encode(elements)
	`
	res, err := redisConn.Do("EVAL", script, 0)
	if err != nil {
		log.Println("[postsList] error:", err.Error())
		return
	}

	if byteSlice, ok := res.([]byte); ok {
		log.Println("[postsList] res:", string(byteSlice))
	} else {
		log.Println("[postsList] error:", "can't cast response")
	}

}
