package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"strings"

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

// SubsystemOperation defines the different
// channel subsystems that can be used to
// deal with different kinds of file system operations
type SubsystemOperation string

const (
	// OpRead can be used to read a file
	OpRead SubsystemOperation = "read"
	// OpWrite can be used to write a file
	OpWrite SubsystemOperation = "write"
	// OpWatch can be used to watch a file (or folder)
	OpWatch SubsystemOperation = "watch"
	// OpNone
	OpNone SubsystemOperation = ""
	// TODO: handle eval operation to execute scripts
	// OpEval                     = "eval"
)

// FSOperation defines file system operation
type FSOperation struct {
	Operation SubsystemOperation
	Path      string
}

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

		opChan := make(chan *FSOperation, 1)

		// only handle file operation requests.
		// payload should be of this form:
		// SubsystemOperation:/path/to/file
		go func(in <-chan *ssh.Request) {
			for req := range in {
				buf := req.Payload[:4]
				var l int32
				_ = binary.Read(bytes.NewReader(buf), binary.BigEndian, &l)
				payload := fmt.Sprintf("%s", req.Payload[4:4+l])
				parts := strings.SplitN(payload, ":", 2)
				fsOperation := FSOperation{Operation: OpNone, Path: ""}
				if len(parts) == 2 {
					fsOperation.Operation = SubsystemOperation(parts[0])
					fsOperation.Path = parts[1]
				}
				supported := (fsOperation.Operation == OpRead || fsOperation.Operation == OpWrite || fsOperation.Operation == OpWatch)
				req.Reply(req.Type == "subsystem" && supported, nil)
				opChan <- &fsOperation
			}
			close(opChan)
		}(requests)

		go func() {
			defer channel.Close()
			fsOperation := <-opChan
			if fsOperation == nil {
				return
			}
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
