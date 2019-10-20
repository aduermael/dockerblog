package ulule

import (
	"crypto/tls"
	"net/http"
)

// ClientAPI is a structure that can be used to
// communicate with Ulule's API
type Client struct {
	// authentication
	// different methods will be used depending on what's provided
	// basic auth / api key auth / oauth access token
	username    string
	userid      string
	apikey      string
	accessToken string
	password    string

	httpClient *http.Client
}

// ClientWithUsernameAndApiKey returns a Client initialized with given
// username and api key
func ClientWithUsernameAndApiKey(username, apikey string) *Client {
	clientAPI := &Client{
		username: username,
		apikey:   apikey,
	}
	clientAPI.initHttpClient()
	return clientAPI
}

// ClientWithToken returns a Client initialized with OAuth2 access token
func ClientWithToken(accessToken string) *Client {
	clientAPI := &Client{
		accessToken: accessToken,
	}
	clientAPI.initHttpClient()
	return clientAPI
}

// utils

func (c *Client) initHttpClient() {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	c.httpClient = &http.Client{Transport: transport}
}
