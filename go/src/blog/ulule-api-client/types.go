package ulule

import (
	"strings"
	"time"
)

// ListProjectResponse represents a response from
// Ulule's API to a GET */projects request.
type ListProjectResponse struct {
	Meta     *Metadata  `json:"meta"`
	Projects []*Project `json:"projects"`
}

type Time struct {
	time.Time
}

func (t *Time) UnmarshalJSON(buf []byte) error {
	tt, err := time.Parse(time.RFC3339Nano, strings.Trim(string(buf), `"`))
	if err != nil {
		return err
	}
	t.Time = tt
	return nil
}

// Project represents an Ulule project
type Project struct {
	ID              float64   `json:"id"`
	URL             string    `json:"absolute_url"`
	Goal            int       `json:"goal"`
	GoalRaised      bool      `json:"goal_raised"`
	AmountRaised    int       `json:"amount_raised"`
	CommentCount    int       `json:"comments_count"`
	Committed       int       `json:"committed"`
	Currency        string    `json:"currency"`
	CurrencyDisplay string    `json:"currency_display"`
	Country         string    `json:"country"`
	DateEnd         string    `json:"date_end"`
	DateStart       string    `json:"date_start"`
	Finished        bool      `json:"finished"`
	Slug            string    `json:"slug"`
	SupportersCount int       `json:"supporters_count"`
	TimeZone        string    `json:"timezone"`
	Rewards         []*Reward `json:"rewards"`
	IsOnline        bool      `json:"is_online"`
	Lang            string    `json:"lang"`
	NewsCount       int       `json:"news_count"`
	Percent         int       `json:"percent"`
}

// Reward represents one reward in a Project
type Reward struct {
	ID             float64 `json:"id"`
	Available      bool    `json:"available"`
	Price          int     `json:"price"`
	Stock          int     `json:"stock"`
	StockAvailable int     `json:"stock_available"`
	StockTaken     int     `json:"stock_taken"`
	DescriptionDE  string  `json:"description_de"`
	DescriptionEN  string  `json:"description_en"`
	DescriptionES  string  `json:"description_es"`
	DescriptionFR  string  `json:"description_fr"`
	DescriptionIT  string  `json:"description_it"`
	DescriptionNL  string  `json:"description_nl"`
}

func (r *Reward) Description() string {
	if r.DescriptionEN != "" {
		return r.DescriptionEN
	}
	if r.DescriptionFR != "" {
		return r.DescriptionFR
	}
	if r.DescriptionDE != "" {
		return r.DescriptionDE
	}
	if r.DescriptionES != "" {
		return r.DescriptionES
	}
	if r.DescriptionIT != "" {
		return r.DescriptionIT
	}
	if r.DescriptionNL != "" {
		return r.DescriptionNL
	}
	return ""
}

// ListSupporterResponse represents a response from
// Ulule's API to a GET /projects/:id/supporters request.
type ListSupporterResponse struct {
	Meta       *Metadata `json:"meta"`
	Supporters []*User   `json:"supporters"`
}

// User represents an user profile on Ulule
type User struct {
	ID         float64 `json:"id"`
	URL        string  `json:"absolute_url"`
	DateJoined string  `json:"date_joined"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	Name       string  `json:"name"`
	UserName   string  `json:"username"`
	Country    string  `json:"country"`
	Lang       string  `json:"lang"`
	TimeZone   string  `json:"timezone"`
	IsStaff    bool    `json:"is_staff"`
	// email may be empty depending on authentication
	Email string `json:"email"`
}

// ListOrderResponse represents a response from
// Ulule's API to a GET /projects/:id/orders request.
type ListOrderResponse struct {
	Meta   *Metadata `json:"meta"`
	Orders []*Order  `json:"orders"`
}

// Order represents an Ulule project order
type Order struct {
	ID              float64      `json:"id"`
	URL             string       `json:"absolute_url"`
	Subtotal        float64      `json:"order_subtotal"`
	Total           float64      `json:"order_total"`
	ShippingTotal   float64      `json:"order_shipping_total"`
	PaymentMethod   string       `json:"payment_method"`
	Status          OrderStatus  `json:"status"`
	StatusDisplay   string       `json:"status_display"`
	Items           []*OrderItem `json:"items"`
	User            *User        `json:"user"`
	ShippingAddress *Address     `json:"shipping_address,omitempty"`
	BillingAddress  *Address     `json:"billing_address,omitempty"`
	CreatedAt       *Time        `json:"created_at,omitempty"`
}

// OrderStatus describes the status of an order placed by a supporter
type OrderStatus int8

const (
	OrderStatusProcessing                 OrderStatus = 1
	OrderStatusSelectingPayment           OrderStatus = 2
	OrderStatusAwaiting                   OrderStatus = 3
	OrderStatusCompleted                  OrderStatus = 4
	OrderStatusShipped                    OrderStatus = 5
	OrderStatusCancelled                  OrderStatus = 6
	OrderStatusPaymentDone                OrderStatus = 7
	OrderStatusPaymentAborted             OrderStatus = 8
	OrderStatusInvalid                    OrderStatus = 9
	OrderStatusPaymentReimbursedToEWallet OrderStatus = 10
	OrderStatusPaymentReimbursed          OrderStatus = 11
	OrderStatusError                      OrderStatus = 12
)

// OrderItem represents an Ulule project order item
type OrderItem struct {
	UnitPrice         float64 `json:"unit_price"`
	Quantity          int     `json:"quantity"`
	Product           int     `json:"reward_id"`
	LineTotal         float64 `json:"line_total"`
	LineSubTotal      float64 `json:"line_subtotal"`
	LineShippingTotal float64 `json:"line_shipping_total"`
	// TODO: add "reward" attribute
}

// Address represents a postal address
type Address struct {
	ID          float64 `json:"id"`
	UserID      float64 `json:"user_id"`
	FirstName   string  `json:"first_name,omitempty"`
	LastName    string  `json:"last_name,omitempty"`
	Address1    string  `json:"address1,omitempty"`
	Address2    string  `json:"address2,omitempty"`
	City        string  `json:"city,omitempty"`
	Country     string  `json:"country,omitempty"`
	PostalCode  string  `json:"postal_code,omitempty"`
	State       string  `json:"state,omitempty"`
	PhoneNumber string  `json:"phone_number,omitempty"`
	EntityName  string  `json:"entity_name,omitempty"`
}

// Metadata is used for pagination
type Metadata struct {
	Limit      int    `json:"limit"`
	Offset     int    `json:"offset"`
	TotalCount int    `json:"total_count"`
	Next       string `json:"next"`
	Previous   string `json:"previous"`
}
