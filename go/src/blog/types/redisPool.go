package types

import (
	"blog/util"

	"github.com/garyburd/redigo/redis"
)

var (
	redisPool *redis.Pool
)

func init() {
	redisPool = util.NewRedisPool("blog-db:6379")
}
