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

func GetAdminSession(r *http.Request, w http.ResponseWriter) (*AdminSession, error) {
	session, err := sessionStore.Get(r, "session-admin")
	if err != nil {
		return nil, err
	}

	adminSession := &AdminSession{session: session, reader: r, writer: w}

	return adminSession, nil
}

func GetUserSession(r *http.Request, w http.ResponseWriter) (*UserSession, error) {
	session, err := sessionStore.Get(r, "session")
	if err != nil {
		return nil, err
	}

	userSession := &UserSession{session: session, reader: r, writer: w}
	userSession.load()

	return userSession, nil
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
	reader  *http.Request
	writer  http.ResponseWriter

	Name           string
	Email          string
	Website        string
	Twitter        string
	RememberInfo   bool
	EmailOnAnswers bool
}

const (
	userNameDefault          = ""
	userEmailDefault         = ""
	userWebsiteDefault       = ""
	userTwitterDefault       = ""
	userRememberInfoDefault  = true
	userEmailOnAnswerDefault = true
)

func (us *UserSession) load() {
	var exists bool
	var i interface{}

	if i, exists = us.session.Values["remember-info"]; exists {
		us.RememberInfo = i.(bool)
	} else {
		us.RememberInfo = userRememberInfoDefault
	}

	if i, exists = us.session.Values["email-on-answer"]; exists {
		us.EmailOnAnswers = i.(bool)
	} else {
		us.EmailOnAnswers = userEmailOnAnswerDefault
	}

	if i, exists = us.session.Values["name"]; exists {
		us.Name = i.(string)
	} else {
		us.Name = userNameDefault
	}

	if i, exists = us.session.Values["email"]; exists {
		us.Email = i.(string)
	} else {
		us.Email = userEmailDefault
	}

	if i, exists = us.session.Values["website"]; exists {
		us.Website = i.(string)
	} else {
		us.Website = userWebsiteDefault
	}

	if i, exists = us.session.Values["twitter"]; exists {
		us.Twitter = i.(string)
	} else {
		us.Twitter = userTwitterDefault
	}
}

func (us *UserSession) Save() {
	us.session.Values["remember-info"] = us.RememberInfo
	// remember that, even if RememberInfo == false:
	us.session.Values["email-on-answer"] = us.EmailOnAnswers

	if us.RememberInfo == false { // erase everything in that case
		us.session.Values["name"] = userNameDefault
		us.session.Values["email"] = userEmailDefault
		us.session.Values["website"] = userWebsiteDefault
		us.session.Values["twitter"] = userTwitterDefault
	} else {
		us.session.Values["name"] = us.Name
		us.session.Values["email"] = us.Email
		us.session.Values["website"] = us.Website
		us.session.Values["twitter"] = us.Twitter
	}
	us.session.Save(us.reader, us.writer)
}
