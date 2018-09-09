package types

import (
	"net/http"

	"github.com/gorilla/sessions"
	store "gopkg.in/boj/redistore.v1"
)

var sessionStore *store.RediStore

func InitSessionStore(c *Config) error {
	var err error
	// pairs: authentication/encryption (encryption is optional)
	// pairs can be added for key rotation (old keys at the end)
	sessionStore, err = store.NewRediStoreWithPool(redisPool, []byte(c.CookieStoreKey), nil)
	if err != nil {
		return err
	}

	return nil
}

func SetMaxAge(days int) {
	sessionStore.SetMaxAge(days * 24 * 3600)
}

// ...
type AdminSession struct {
	session *sessions.Session
	reader  *http.Request
	writer  http.ResponseWriter
}

// ...
func (as *AdminSession) IsAuthenticated() bool {
	if auth, ok := as.session.Values["authenticated"].(bool); ok && auth {
		return true
	}
	return false
}

func (as *AdminSession) Save() {
	as.session.Save(as.reader, as.writer)
}

func (as *AdminSession) Login() {
	as.session.Values["authenticated"] = true
	as.Save()
}

func (as *AdminSession) Logout() {
	as.session.Values["authenticated"] = false
	as.Save()
}

// ...
type UserSession struct {
	session *sessions.Session
}

func GetAdminSession(r *http.Request, w http.ResponseWriter) (*AdminSession, error) {
	session, err := sessionStore.Get(r, "session-admin")
	if err != nil {
		return nil, err
	}

	adminSession := &AdminSession{session: session, reader: r, writer: w}

	return adminSession, nil
}

func GetUserSession(r *http.Request) (*UserSession, error) {
	session, err := sessionStore.Get(r, "session-user")
	if err != nil {
		return nil, err
	}

	userSession := &UserSession{session: session}

	return userSession, nil
}
