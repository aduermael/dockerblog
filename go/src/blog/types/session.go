package types

import (
	"net/http"

	"github.com/gorilla/sessions"
	store "gopkg.in/boj/redistore.v1"
)

var sessionStore *store.RediStore

func initSessionStore(c *Config) error {
	var err error
	// pairs: authentication/encryption (encryption is optional)
	// pairs can be added for key rotation (old keys at the end)
	sessionStore, err = store.NewRediStoreWithPool(redisPool, []byte(c.CookieStoreKey), nil)
	if err != nil {
		return err
	}

	return nil
}

func setMaxAge(days int) {
	sessionStore.SetMaxAge(days * 24 * 3600)
}

func adminSession(r *http.Request) (*sessions.Session, error) {
	session, err := sessionStore.Get(r, "session-admin")
	if err != nil {
		return nil, err
	}
	return session, nil
}

func userSession(r *http.Request) (*sessions.Session, error) {
	session, err := sessionStore.Get(r, "session-user")
	if err != nil {
		return nil, err
	}
	return session, nil
}
