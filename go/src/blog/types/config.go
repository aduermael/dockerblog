package types

import (
	"encoding/json"
	"io/ioutil"
	"time"

	"github.com/garyburd/redigo/redis"
)

// Config describes general blog configuration
type Config struct {
	Langs          []string                   `json:"langs"`
	PostsPerPage   int                        `json:"postsPerPage"`
	Theme          string                     `json:"theme"`
	Timezone       string                     `json:"timezone"`
	FacebookAppID  string                     `json:"facebookAppID"`
	SendgridApiKey string                     `json:"sendgridAPIKey"`
	Localized      map[string]LocalizedConfig `json:"localized"`
}

type LocalizedConfig struct {
	Title string `json:"title"`
}

var (
	// TimeLocation is defined based on the Timezone
	TimeLocation *time.Location
)

var (
	scriptConfigSave = redis.NewScript(0, `
		local config = cjson.decode(ARGV[1])

		redis.call('hmset', 'config', 'timezone', config.timezone, 'theme', config.theme, 'postsPerPage', config.postsPerPage, 'facebookAppID', config.facebookAppID, 'sendgridAPIKey', config.sendgridAPIKey)

		redis.call('del', 'config_langs')
		redis.call('sadd', unpack(config.langs))

		-- store key/value pairs in config_lang_<lang>
		for _,v in ipairs(config.langs) do 
			if config.localized[v] == nil then
				continue
			end

			local key = 'config_lang_'..v

			if config.localized[v].title ~= nil then
				redis.call('hset', key, 'title', config.localized[v].title)
			end
		end
	`)
)

// LoadConfig loads configuration path
func LoadConfig(path string) (*Config, error) {

	config := &Config{}

	configBytes, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}

	err = json.Unmarshal(configBytes, config)
	if err != nil {
		return nil, err
	}

	TimeLocation, err = time.LoadLocation(config.Timezone)
	if err != nil {
		return nil, err
	}

	// TODO: make sure config file is correct
	// no mandotary fields should be missing
	// and fields are in expected format
	// we can also use default values

	return config, nil
}
