package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"log"
	"net"

	"golang.org/x/crypto/ssh"
)

var (
	config = &ssh.ServerConfig{
		NoClientAuth:                true,
		PublicKeyCallback:           nil,
		PasswordCallback:            nil,
		KeyboardInteractiveCallback: nil,
		AuthLogCallback:             nil,
	}
)

func main() {

	privateBytes, err := ioutil.ReadFile("id_rsa")
	if err != nil {
		log.Fatal("Failed to load private key: ", err)
	}

	private, err := ssh.ParsePrivateKey(privateBytes)
	if err != nil {
		log.Fatal("Failed to parse private key: ", err)
	}

	config.AddHostKey(private)

	listener, err := net.Listen("tcp", "0.0.0.0:6673")
	if err != nil {
		log.Fatal("failed to listen for connection: ", err)
	}

	for {
		conn, err := listener.Accept()
		if err != nil {
			log.Fatal("failed to accept incoming connection: ", err)
		}
		go handleConnection(conn)
	}
}

func handleConnection(conn net.Conn) {
	defer conn.Close()

	_, chans, reqs, err := ssh.NewServerConn(conn, config)
	if err != nil {
		log.Println("failed to handshake: ", err)
		// close connection if channel of unknown type
		// is received
		return
	}

	// The incoming Request channel must be serviced.
	go ssh.DiscardRequests(reqs)

	// Service the incoming Channel channel.
	for newChannel := range chans {
		// Channels have a type, depending on the application level
		// protocol intended.
		if newChannel.ChannelType() != "session" {
			log.Println("unknown channel type")
			// close connection if channel of unknown type
			// is received
			return
		}

		channel, requests, err := newChannel.Accept()
		if err != nil {
			log.Printf("could not accept channel: %v\n", err)
			// close connection if channel can't be accepted
			return
		}

		// only handle "fs" requests
		go func(in <-chan *ssh.Request) {
			for req := range in {
				buf := req.Payload[:4]
				var l int32
				_ = binary.Read(bytes.NewReader(buf), binary.BigEndian, &l)
				payload := fmt.Sprintf("%s", req.Payload[4:4+l])
				req.Reply(req.Type == "subsystem" && payload == "fs", nil)
			}
		}(requests)

		go func() {
			defer channel.Close()
			data := make([]byte, 2048)
			for {
				n, err := channel.Read(data)
				if err != nil {
					break
				}
				log.Printf("%s", string(data[:n]))
			}
		}()
	}
}
