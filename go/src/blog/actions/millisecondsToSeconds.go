package main

import (
	"blog/types"
	"blog/util"
	"fmt"
	"log"
	"time"

	"github.com/garyburd/redigo/redis"
)

const ()

var (
	redisPool *redis.Pool
)

func main() {
	var err error

	LANG := "fr"

	timeLocation, err := time.LoadLocation("Europe/Paris")
	if err != nil {
		log.Fatalln("can't load time location")
	}

	redisPool = util.NewRedisPool("blog-db:6379")

	allPosts, err := types.PostsList(true, 0, 1000000, -1, -1, timeLocation, false)
	if err != nil {
		log.Fatalln("can't get all posts")
	}

	allPages, err := types.PostsList(true, 0, 1000000, -1, -1, timeLocation, true)
	if err != nil {
		log.Fatalln("can't get all posts")
	}

	fmt.Printf("POSTS: %d/%d", 0, len(allPosts))

	postWithID0 := false
	postZeroNewID := 0

	for i, post := range allPosts {

		postWithID0 = post.ID == 0

		// enforce lang to "fr" for all existing posts
		post.Lang = LANG

		if post.Date > 9999999999 {
			post.Date /= 1000
		}
		if post.Update > 9999999999 {
			post.Update /= 1000
		}

		err = post.Save()
		if err != nil {
			log.Fatalln("can't save post:", err.Error())
		}

		if postWithID0 {
			fmt.Printf("\nNew ID for post with ID == 0: %d\n", post.ID)
			postZeroNewID = post.ID
			// saving a post with ID == 0 will
			// create a new post, since ID == 0 is not allowed anymore
			// ID == 0 means "new post"
			// Let's delete the post with ID == 0 now
			p := &types.Post{} // <- ID is 0 by default
			p.Lang = LANG
			err = p.Delete()
			if err != nil {
				log.Fatalln("can't delete post with ID == 0:", err.Error())
			}
		}

		fmt.Printf("\rPOSTS: %d/%d", i+1, len(allPosts))
	}

	fmt.Printf("\nPAGES: %d/%d", 0, len(allPages))

	for i, page := range allPages {
		if page.Date > 9999999999 {
			page.Date /= 1000
		}
		if page.Update > 9999999999 {
			page.Update /= 1000
		}
		err = page.Save()
		if err != nil {
			log.Fatalln("can't save post:", err.Error())
		}

		fmt.Printf("\rPAGES: %d/%d", i+1, len(allPages))
	}

	allComments, err := types.ListAllComments(LANG, true, 0, 1000000)
	if err != nil {
		log.Fatalln("can't get all comments")
	}

	skipped := 0
	fmt.Printf("\nCOMMENTS (%s): %d/%d (skipped: %d)", LANG, 0, len(allComments), skipped)

	for i, comment := range allComments {
		comment.ForceLang = LANG
		if comment.Date > 9999999999 {
			comment.Date /= 1000
		}
		// update post ID if it used to be 0
		if comment.PostID == 0 && postZeroNewID > 0 {
			comment.PostID = postZeroNewID
		}
		err = comment.Save()
		if err != nil {
			fmt.Println("\nERROR:", err)
			fmt.Println("COMMENT ID:", comment.ID)
			skipped = skipped + 1
		}
		fmt.Printf("\rCOMMENTS (%s): %d/%d (skipped: %d)", LANG, i+1, len(allComments), skipped)
	}

	allCommentsEN, err := types.ListAllComments("en", true, 0, 1000000)
	if err != nil {
		log.Fatalln("can't get all comments")
	}

	skipped = 0
	fmt.Printf("\nCOMMENTS (%s): %d/%d (skipped: %d)", "en", 0, len(allCommentsEN), skipped)

	for i, comment := range allCommentsEN {
		comment.ForceLang = "en"
		if comment.Date > 9999999999 {
			comment.Date /= 1000
		}
		// update post ID if it used to be 0
		if comment.PostID == 0 && postZeroNewID > 0 {
			comment.PostID = postZeroNewID
		}
		err = comment.Save()
		if err != nil {
			fmt.Println("\nERROR:", err)
			fmt.Println("COMMENT ID:", comment.ID)
			skipped = skipped + 1
		}
		fmt.Printf("\rCOMMENTS (%s): %d/%d (skipped: %d)", "en", i+1, len(allCommentsEN), skipped)
	}

	fmt.Printf("\nDONE!\n")
}
