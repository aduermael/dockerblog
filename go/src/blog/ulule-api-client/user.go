package ulule

import "strconv"

// GetUser returns a User for for given ID
func (c *Client) GetUser(userID int) (*User, error) {
	userIDStr := strconv.Itoa(userID)

	resp := &User{}
	err := c.apiget("/users/"+userIDStr, resp)
	if err != nil {
		return nil, err
	}
	return resp, nil
}
