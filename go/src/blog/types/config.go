package types

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"math/rand"
	"time"

	"github.com/garyburd/redigo/redis"
)

// Config describes general blog configuration
type Config struct {
	Langs                   []string                   `json:"langs"`
	PostsPerPage            int                        `json:"postsPerPage"`
	Theme                   string                     `json:"theme"`
	Timezone                string                     `json:"timezone"`
	ShowComments            bool                       `json:"showComments"`
	AcceptComments          bool                       `json:"acceptComments"`
	CommentsRequireApproval bool                       `json:"approveComments"`
	FacebookAppID           string                     `json:"facebookAppID"`
	SendgridAPIKey          string                     `json:"sendgridAPIKey"`
	Localized               map[string]LocalizedConfig `json:"localized,omitempty"`

	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Salt     string `json:"salt,omitempty"`

	TimeLocation *time.Location `json:"-"`
}

func init() {
	rand.Seed(time.Now().UnixNano())
}

var letterRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
var randStringLen = 20

func RandStringRunes(n int) string {
	b := make([]rune, n)
	for i := range b {
		b[i] = letterRunes[rand.Intn(len(letterRunes))]
	}
	return string(b)
}

// LocalizedConfig stores configuration fields that are localized
type LocalizedConfig struct {
	Title string `json:"title",omitempty`
}

var (
	scriptConfigSave = redis.NewScript(0, `
		local config = cjson.decode(ARGV[1])
		local key

		-- store full config as json for quick access
		redis.call('set', 'config_full', ARGV[1])


		local showComs = config.showComments and 1 or 0
		local acceptComs = config.acceptComments and 1 or 0
		local approveComs = config.approveComments and 1 or 0

		redis.call('hmset', 'config', 'postsPerPage', config.postsPerPage, 'theme', config.theme, 'timezone', config.timezone, 'showComs', showComs, 'acceptComs', acceptComs, 'approveComs', approveComs, 'facebookAppID', config.facebookAppID, 'sendgridAPIKey', config.sendgridAPIKey, 'username', config.username, 'salt', config.salt, 'password', config.password)

		redis.call('del', 'config_langs')
		redis.call('sadd', 'config_langs', unpack(config.langs))

		-- store key/value pairs in config_lang_<lang>
		if config.localized ~= nil then
			for _,v in ipairs(config.langs) do
				if config.localized[v] ~= nil then
					key = 'config_lang_' .. v

					if config.localized[v].title ~= nil then
						redis.call('hset', key, 'title', config.localized[v].title)
					end
				end
			end
		end
	`)

	scriptConfigGet = redis.NewScript(0, `
		return redis.call('get', 'config_full')
	`)
)

// Title returns localized title.
func (c *Config) Title(lang string) string {
	localizedConf, ok := c.Localized[lang]
	if !ok {
		return ""
	}
	return localizedConf.Title
}

// CurrentConfig loads current config from database
func CurrentConfig() (*Config, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	config := &Config{}

	res, err := scriptConfigGet.Do(redisConn)
	if err != nil {
		return nil, err
	}

	configBytes, ok := res.([]byte)
	if !ok {
		return nil, errors.New("can't cast response")
	}

	err = json.Unmarshal(configBytes, config)
	if err != nil {
		return nil, err
	}

	config.TimeLocation, err = time.LoadLocation(config.Timezone)
	if err != nil {
		return nil, err
	}

	return config, nil
}

func (c *Config) Save(path string) error {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	var err error

	c.TimeLocation, err = time.LoadLocation(c.Timezone)
	if err != nil {
		return err
	}

	jsonBytes, err := json.Marshal(c)
	if err != nil {
		return err
	}

	jsonBytesReadable, err := json.MarshalIndent(c, "", "    ")
	if err != nil {
		return err
	}

	// save config in database
	_, err = scriptConfigSave.Do(redisConn, string(jsonBytes))
	if err != nil {
		return err
	}

	// save config on file
	err = ioutil.WriteFile(path, jsonBytesReadable, 0644)
	if err != nil {
		return err
	}

	return nil
}

// path: config file path
func (c *Config) UpdateCredentials(username, newPassword, currentPassword, path string) error {

	if newPassword == "" {
		return errors.New("new password can't be empty")
	}

	if username == "" {
		return errors.New("new username can't be empty")
	}

	// make sure current password is ok
	sum := sha256.Sum256([]byte(currentPassword + c.Salt))
	currentPasswordSum := fmt.Sprintf("%x", sum)

	if currentPasswordSum != c.Password {
		return errors.New("current password is incorrect")
	}

	// update salt each time a new password is updated
	c.Salt = RandStringRunes(randStringLen)
	newSum := sha256.Sum256([]byte(newPassword + c.Salt))
	c.Password = fmt.Sprintf("%x", newSum)

	c.Username = username

	return c.Save(path)
}

// LoadConfig loads configuration path
func LoadConfig(path string) (*Config, error) {
	redisConn := redisPool.Get()
	defer redisConn.Close()

	config := &Config{}

	configBytes, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(configBytes, config)
	if err != nil {
		return nil, err
	}

	config.TimeLocation, err = time.LoadLocation(config.Timezone)
	if err != nil {
		return nil, err
	}

	if config.Username == "" {
		config.Username = "admin"
		config.Salt = RandStringRunes(randStringLen)
		password := "admin"
		sum := sha256.Sum256([]byte(password + config.Salt))
		fmt.Printf("PASSWORD: %x", sum)
		config.Password = fmt.Sprintf("%x", sum)
	}

	jsonBytes, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}

	// save config in database
	_, err = scriptConfigSave.Do(redisConn, string(jsonBytes))
	if err != nil {
		return nil, err
	}

	return config, nil
}
