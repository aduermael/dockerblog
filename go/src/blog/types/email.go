package types

import (
	"blog/humanize"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/garyburd/redigo/redis"
)

// RegisteredEmail defines a registered
type RegisteredEmail struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	CreatedAt  int    `json:"createdAt"`
	ModifiedAt int    `json:"modifiedAt"`
	// A random key is assigned to each email at creation
	// it allows to access the email settings page.
	Key string `json:"key"`
	// If not valid, the email will be removed from DB at this date
	ExpiresAt int  `json:"expiresAt"`
	Posts     bool `json:"posts,omitempty"`
	News      bool `json:"news,omitempty"`
	// If not valid, attempt to register email again fails
	// news and or post emails are not sent
	// the email is removed from database after a while.
	Valid bool `json:"valid,omitempty"`
	// Since is a formatted duration that can be
	// computed from Date
	CreatedSince string `json:"-"`
	//
	Error string `json:"error,omitempty"`
}

// RegisteredEmailStats stores stats about registered emails
type RegisteredEmailStats struct {
	NbValid int `json:"nbvalid"`
	NbPosts int `json:"nbposts"`
	NbNews  int `json:"nbnews"`
}

// EmailConfirmation is used to build confirmation emails
type EmailConfirmation struct {
	Title     string
	Message1  string
	Message2  string
	Host      string
	EmailHash string // ID
	EmailKey  string
	Confirm   string
	Signature string
}

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func md5Hash(text string) string {
	hasher := md5.New()
	hasher.Write([]byte(text))
	return hex.EncodeToString(hasher.Sum(nil))
}

func randString(n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = letterBytes[rand.Intn(len(letterBytes))]
	}
	return string(b)
}

// NewRegisteredEmail ...
func NewRegisteredEmail(Email string, Posts bool, News bool) *RegisteredEmail {

	r := &RegisteredEmail{ID: md5Hash(Email), Email: Email, Posts: Posts, News: News}
	r.CreatedAt = int(time.Now().Unix())
	r.Key = randString(16)
	r.Valid = false

	return r
}

// Save ...
func (r *RegisteredEmail) Save() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	r.ModifiedAt = int(time.Now().Unix())
	if r.Valid == false {
		// expires after 7 days
		r.ExpiresAt = int(time.Now().Add(time.Hour * 24 * 7).Unix())
	} else {
		r.ExpiresAt = 0
	}

	b, err := json.Marshal(r)
	if err != nil {
		fmt.Println("ERROR (1):", err)
		return err
	}

	_, err = scriptRegisteredEmailSave.Do(redisConn, string(b))
	if err != nil {
		fmt.Println("ERROR (2):", err)
		return err
	}

	return nil
}

// RegisteredEmailGet returns a registered email for given ID.
// returns RegisteredEmail, found, error
func RegisteredEmailGet(ID string) (*RegisteredEmail, bool, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptRegisteredEmailGet.Do(redisConn, ID)
	if err != nil {
		return nil, true, err
	}

	byteSlice, ok := res.([]byte)

	if !ok {
		return nil, true, errors.New("can't cast response")
	}

	r := &RegisteredEmail{}
	err = json.Unmarshal(byteSlice, r)

	if err != nil {
		return nil, true, err
	}

	if r.Error == "not found" {
		return nil, false, errors.New("not found")
	}

	return r, true, nil
}

// RegisteredEmailGet returns a registered email for given ID & key
// If the key is not correct, the email is not returned
// returns RegisteredEmail, found, error
func RegisteredEmailGetWithKey(ID, key string) (*RegisteredEmail, bool, error) {

	r, found, err := RegisteredEmailGet(ID)

	if err != nil || found == false {
		return nil, found, err
	}

	if r.Key != key {
		return nil, false, errors.New("not found")
	}

	return r, true, nil
}

// GetRegisteredEmailStats ...
func GetRegisteredEmailStats() (*RegisteredEmailStats, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptsRegisteredEmailStats.Do(redisConn)
	if err != nil {
		return nil, err
	}

	byteSlice, ok := res.([]byte)
	if !ok {
		return nil, errors.New("can't cast response")
	}

	stats := &RegisteredEmailStats{}
	err = json.Unmarshal(byteSlice, stats)

	if err != nil {
		return nil, err
	}

	return stats, nil
}

func RegisteredEmailPostSubscriberIDs() ([]string, error) {

	redisConn := redisPool.Get()
	defer redisConn.Close()

	res, err := scriptGetPostSubscriberIDs.Do(redisConn)
	if err != nil {
		fmt.Println("SendPostToSubscribers error:", err)
		return nil, err
	}

	byteSlice, ok := res.([]byte)
	if !ok {
		fmt.Println("SendPostToSubscribers error:", "can't cast response")
		return nil, errors.New("can't cast response")
	}

	arr := make([]string, 0)
	err = json.Unmarshal(byteSlice, &arr)

	if err != nil {
		fmt.Println("SendPostToSubscribers error:", err)
		return nil, err
	}

	return arr, nil
}

func (r *RegisteredEmail) CreatedDate() time.Time {
	return time.Unix(int64(r.CreatedAt), 0)
}

func (r *RegisteredEmail) ModifiedDate() time.Time {
	return time.Unix(int64(r.ModifiedAt), 0)
}

// Note: this could be done client side with javascript
// based on unix timestamp (post.Date)
func (r *RegisteredEmail) ComputeCreatedSince() {
	r.CreatedSince = humanize.DisplayDuration(time.Since(r.CreatedDate()), nil)
}

// Delete removes post from database.
// The Post instance is still valid after the operation.
func (r *RegisteredEmail) Delete() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	_, err := scriptRegisteredEmailDelete.Do(redisConn, r.ID)

	return err
}

var (
	scriptsRegisteredEmailStats = redis.NewScript(0, `
		local result = {}
		result.nbvalid = redis.call('scard', 'emails')
		result.nbposts = redis.call('scard', 'emails_posts')
		result.nbnews = redis.call('scard', 'emails_news')
		return cjson.encode(result)
	`)

	scriptRegisteredEmailSave = redis.NewScript(0, `
		local email = cjson.decode(ARGV[1])
		
		-- save email hash
		local kID = 'email_' .. email.id
		local unverifiedID = 'unverified_email_' .. email.id

		local news = email.news and 1 or 0
		local posts = email.posts and 1 or 0
		local valid = email.valid and 1 or 0

		redis.call('hmset', kID, 'id', email.id, 'email', email.email, 'createdAt', email.createdAt, 'modifiedAt', email.modifiedAt, 'expiresAt', email.expiresAt, 'key', email.key, 'posts', posts, 'news', news, 'valid', valid)

		redis.call('srem', 'emails', email.id)
		redis.call('srem', 'emails_posts', email.id)
		redis.call('srem', 'emails_news', email.id)

		redis.call('del', unverifiedID)

		if email.valid == true then
			redis.call('persist', kID)
			redis.call('sadd', 'emails', email.id)

			if email.posts == true then
				redis.call('sadd', 'emails_posts', email.id)
			end

			if email.news == true then
				redis.call('sadd', 'emails_news', email.id)
			end
		else
			-- not using a set here for the key to expire 
			redis.call('set', unverifiedID, kID)
			local ttl = email.expiresAt - email.modifiedAt
			redis.call('expire', kID, ttl)
			redis.call('expire', unverifiedID, ttl)
		end
	`)

	scriptRegisteredEmailGet = redis.NewScript(0, `
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

		local id = ARGV[1]
		
		local email_id = 'email_' .. id
		local unverified_email_id = 'unverified_email_' .. id

		local res = redis.call('hgetall', email_id)
		-- check if not found
		if res[1] == nil then
			local res = {}
			res.error = "not found"
			return cjson.encode(res)
		end

		local email_data = toStruct(res)

		-- convert boolean strings to actual booleans
		email_data.news = email_data.news ~= nil and email_data.news == "1"
		email_data.posts = email_data.posts ~= nil and email_data.posts == "1"
		email_data.valid = email_data.valid ~= nil and email_data.valid == "1"

		-- convert number strings to actual numbers
		email_data.createdAt = tonumber(email_data.createdAt)
		email_data.modifiedAt = tonumber(email_data.modifiedAt)
		email_data.expiresAt = tonumber(email_data.expiresAt)

		return cjson.encode(email_data)
	`)

	// returns post subscriber emails
	scriptGetPostSubscriberIDs = redis.NewScript(0, `
		local emails = redis.call('smembers', 'emails_posts')
		return cjson.encode(emails)
	`)

	scriptRegisteredEmailDelete = redis.NewScript(0, `
		local id = ARGV[1]
		
		local email_id = 'email_' .. id
		local unverified_email_id = 'unverified_email_' .. id

		redis.call('srem', 'emails', id)
		redis.call('srem', 'emails_posts', id)
		redis.call('srem', 'emails_news', id)

		redis.call('del', unverified_email_id)

		redis.call('del', email_id)
	`)
)
