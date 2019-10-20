package ulule

import (
	"fmt"
	"os"
	"testing"
)

const (
	projectID = 31458  // comme-convenu-2
	userID    = 241660 // bloglaurel
)

var (
	client *Client
)

func TestMain(m *testing.M) {
	// initialize client
	username := os.Getenv("USERNAME")
	apikey := os.Getenv("APIKEY")
	accessToken := os.Getenv("ACCESS_TOKEN")

	if username != "" && apikey != "" {
		client = ClientWithUsernameAndApiKey(username, apikey)
	} else if accessToken != "" {
		client = ClientWithToken(accessToken)
	} else {
		fmt.Fprintf(os.Stderr, "USERNAME & APIKEY or ACCESS_TOKEN required")
		os.Exit(1)
	}

	// run tests
	os.Exit(m.Run())
}

func _TestGetProjects(t *testing.T) {
	fmt.Println("list projects")
	_, err := client.GetProjects(userID, ProjectFilterAll)
	if err != nil {
		t.Error(err)
	}
}

func _TestGetOneProject(t *testing.T) {
	fmt.Println("get project")
	_, err := client.GetProject(projectID)
	if err != nil {
		t.Error(err)
	}
}

func _TestGetProjectSupporters(t *testing.T) {
	fmt.Println("get project supporters")
	_, err, _ := client.GetProjectSupporters(projectID, 20, 0)
	if err != nil {
		t.Error(err)
	}
}

func _TestGetProjectOrders(t *testing.T) {
	fmt.Println("get project orders")
	_, err, _ := client.GetProjectOrders(projectID, 20, 0)
	if err != nil {
		t.Error(err)
	}
}

func TestSponsor(t *testing.T) {
	fmt.Println("test sponsor orders")

	offset := 0
	lastpage := false
	var err error
	var orders []*Order

	fmt.Println("")

	for lastpage == false {
		orders, err, lastpage = client.GetProjectOrders(projectID, 100, offset)
		if err != nil {
			t.Error(err)
		}
		offset += len(orders)
		fmt.Printf("\rlisted: %d", offset)

		for _, order := range orders {

			fmt.Println(order.CreatedAt.String())
			// if int(order.User.ID) == 837917 {
			// 	jsonBytes, err := client.GetProjectOrdersJson(projectID, 100, offset-len(orders))
			// 	if err != nil {
			// 		t.Fatal(err)
			// 	}
			// 	t.Log(string(jsonBytes))
			// 	return
			// }
		}
	}
}

// Users

func _TestGetUser(t *testing.T) {
	fmt.Println("get user")
	usr, err := client.GetUser(userID)
	if err != nil {
		t.Error(err)
	}
	fmt.Printf("%+v\n", usr)
}
