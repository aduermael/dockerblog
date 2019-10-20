package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"

	"blog/types"

	ulule "blog/ulule-api-client"

	"github.com/garyburd/redigo/redis"
	"github.com/gin-gonic/gin"
)

func californidNames(c *gin.Context) {

	config, err := ContextGetConfig(c)
	if err != nil {
		log.Println("can't display Californid contributors page", err.Error())
		return
	}

	user, err := types.GetUserSession(c.Request, c.Writer)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	// fmt.Println("TLS:", c.Request.TLS)
	// fmt.Println("Path:", c.Request.URL.Path)
	// scheme := "http://"
	// if c.Request.TLS != nil {
	// 	scheme = "https://"
	// }
	// host := c.Request.Host
	// fmt.Println("Host:", host)
	// fmt.Println("Scheme:", scheme)

	// QUERY HACK - START
	// not supposed to receive this in QUERY...
	// Ulule API does not offer a better option,
	// let's take some risks...
	// Information received in fragment is transmited
	// as query parameters using a JS script.
	token := c.Query("access_token")
	expiresIn := c.Query("expires_in")
	userID := c.Query("user_id")
	if token != "" && expiresIn != "" && userID != "" {
		fmt.Print("⭐️ SESSION SET, REDIRECT")
		// NOTE: not considering expires_in for now
		// this should be improved in the future.
		// Skipping because in a hurry...
		user.UluleUserID = userID
		user.UluleToken = token
		user.Save()
		// Reload page now that Ulule user ID and token are set
		c.Redirect(http.StatusTemporaryRedirect, c.Request.URL.Path)
		return
	}
	// QUERY HACK - END

	// Ulule application has been registered with these
	// 2 redirectURIs, one for debug and one for prod in 2017.
	// No time to ask for a new one (now in 2019)...
	// https://commeconvenu.com now point to the same blog
	// instance, will simply redirect to californid.com.
	redirectURI := "https://commeconvenu.com"
	if strings.HasPrefix(c.Request.Host, "localhost") {
		redirectURI = "http://localhost:8000"
	}

	token = user.UluleToken
	userID = user.UluleUserID

	// Ulule userID not set in session.
	// Display play to connect with Ulule.
	if userID == "" {
		fmt.Println("⭐️ userID NOT SET")
		c.HTML(http.StatusOK, "californid-names.tmpl", gin.H{
			"redirectUri": template.URL(redirectURI),
			"title":       "Californid - Contributeurs",
			"host":        config.Host,
		})
		return
	}

	// if userID non empty, try to get name from credits DB
	if userID != "" {
		redisConn := redisPool.Get()
		defer redisConn.Close()

		exists, err := redis.Bool(redisConn.Do("HEXISTS", "californid-names", userID))
		if err != nil {
			fmt.Println("⭐️🔥 cant check californid-name hash")
			// NOTE: no error displayed, that could be improved
			c.HTML(http.StatusInternalServerError, "californid-names.tmpl", gin.H{
				"redirectUri": template.URL(redirectURI),
				"title":       "Californid - Contributeurs",
				"host":        config.Host,
			})
			return
		}

		if exists {
			name, err := redis.String(redisConn.Do("HGET", "californid-names", userID))
			if err != nil {
				// NOTE: no error displayed, that could be improved
				c.HTML(http.StatusInternalServerError, "californid-names.tmpl", gin.H{
					"redirectUri": template.URL(redirectURI),
					"title":       "Californid - Contributeurs",
					"host":        config.Host,
				})
				return
			}
			// name has been found for user ID in db!
			c.HTML(http.StatusOK, "californid-names-edit.tmpl", gin.H{
				"name":  name,
				"title": "Californid - Contributeurs",
				"host":  config.Host,
			})
			return
		}
	}

	// name can't be found in db, request Ulule API
	// (if there's a token and userID stored in session)
	if token != "" && userID != "" {
		usrID, err := strconv.Atoi(userID)
		if err != nil {
			// NOTE: no error displayed, that could be improved
			c.HTML(http.StatusInternalServerError, "californid-names.tmpl", gin.H{
				"redirectUri": template.URL(redirectURI),
				"title":       "Californid - Contributeurs",
				"host":        config.Host,
			})
			return
		}

		ululeClient := ulule.ClientWithToken(token)
		user, err := ululeClient.GetUser(usrID)
		if err != nil {
			// NOTE: no error displayed, that could be improved
			c.HTML(http.StatusInternalServerError, "californid-names.tmpl", gin.H{
				"redirectUri": template.URL(redirectURI),
				"title":       "Californid - Contributeurs",
				"host":        config.Host,
			})
			return
		}

		idealName := ""
		if user.Name != "" {
			idealName = user.Name
		} else if user.FirstName != "" && user.LastName != "" {
			idealName = strings.Title(strings.ToLower(user.FirstName + " " + user.LastName))
		}
		idealName = sanitizeName(idealName)

		c.HTML(http.StatusOK, "californid-names-edit.tmpl", gin.H{
			"name":  idealName,
			"title": "Californid - Contributeurs",
			"host":  config.Host,
		})
		return
	}

	c.HTML(http.StatusOK, "californid-names.tmpl", gin.H{
		"redirectUri": template.URL(redirectURI),
		"title":       "Californid - Contributeurs",
		"host":        config.Host,
	})
}

func californidNamesSave(c *gin.Context) {

	config, err := ContextGetConfig(c)
	if err != nil {
		log.Println("can't display Californid contributors page", err.Error())
		return
	}

	user, err := types.GetUserSession(c.Request, c.Writer)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	redirectURI := "https://commeconvenu.com"
	if strings.HasPrefix(c.Request.Host, "localhost") {
		redirectURI = "http://localhost:8000"
	}

	userID := user.UluleUserID
	if userID == "" {
		// display page to login with Ulule credentials (again)
		c.HTML(http.StatusUnauthorized, "californid-names.tmpl", gin.H{
			"redirectUri": template.URL(redirectURI),
			"title":       "Californid - Contributeurs",
			"host":        config.Host,
		})
		return
	}

	name := c.PostForm("name")
	name = sanitizeName(name)

	redisConn := redisPool.Get()
	defer redisConn.Close()

	_, err = redisConn.Do("HSET", "californid-names", userID, name)
	if err != nil {
		// NOTE: no error displayed, that could be improved
		c.HTML(http.StatusInternalServerError, "californid-names.tmpl", gin.H{
			"redirectUri": template.URL(redirectURI),
			"title":       "Californid - Contributeurs",
			"host":        config.Host,
		})
		return
	}

	c.HTML(http.StatusOK, "californid-names-edit.tmpl", gin.H{
		"name":  name,
		"saved": true,
		"title": "Californid - Contributeurs",
		"host":  config.Host,
	})
}

func sanitizeName(name string) string {
	name = filterRunes(name)
	name = strings.TrimSpace(name)
	if len(name) > 50 {
		n := name[:50]
		return n
	}
	return name
}
