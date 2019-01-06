package types

import (
	"blog/humanize"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
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
	ExpiresAt int  `json:"expiresAt,omitempty"`
	Posts     bool `json:"posts,omitempty"`
	News      bool `json:"news,omitempty"`
	// If not valid, attempt to register email again fails
	// news and or post emails are not sent
	// the email is removed from database after a while.
	Valid bool `json:"valid,omitempty"`
	// Since is a formatted duration that can be
	// computed from Date
	CreatedSince string `json:"-"`
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

func NewRegisteredEmail(Email string, Posts bool, News bool) *RegisteredEmail {

	r := &RegisteredEmail{ID: md5Hash(Email), Email: Email, Posts: Posts, News: News}
	r.CreatedAt = int(time.Now().Unix())
	r.ModifiedAt = r.CreatedAt
	r.Key = randString(16)
	r.ExpiresAt = int(time.Now().Add(time.Hour * 24 * 7).Unix())
	r.Valid = false

	return r
}

func (r *RegisteredEmail) Save() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

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

// Save saves post in DB
// An new ID is assigned to the post if post.ID == -1
func (r *RegisteredEmail) RegisteredEmail() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()
	// TODO
	return nil
}

// Delete removes post from database.
// The Post instance is still valid after the operation.
func (r *RegisteredEmail) Delete() error {
	redisConn := redisPool.Get()
	defer redisConn.Close()
	// TODO
	return nil
}

// RegisteredEmailGet returns a registered email for given ID & key
// returns RegisteredEmailGet, found, error
func RegisteredEmailGet(ID, key string) (*RegisteredEmail, bool, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()
	// TODO
	return nil, false, nil
}

var (
	scriptRegisteredEmailSave = redis.NewScript(0, `
		local email = cjson.decode(ARGV[1])
		
		-- save email hash
		local kID = 'email_' .. email.id

		local news = email.news and 1 or 0
		local posts = email.posts and 1 or 0
		local valid = email.valid and 1 or 0

		redis.call('hmset', kID, 'id', email.id, 'createdAt', email.createdAt, 'modifiedAt', email.modifiedAt, 'expiresAt', email.expiresAt, 'key', email.key, 'posts', posts, 'news', news, 'valid', valid)

		redis.call('srem', 'emails', kID)
		redis.call('srem', 'unverified_emails', kID)

		if email.valid == true then
			redis.call('sadd', 'emails', kID)
		else
			redis.call('sadd', 'unverified_emails', kID)
		end
	`)
)
