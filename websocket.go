package main

import (
	"fmt"
	"github.com/gorilla/websocket"
	"net/http"
	"time"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024
)

type hub struct {
	clients    map[*client]bool
	broadcast  chan string
	register   chan *client
	unregister chan *client

	content string
}

var ws_hub = hub{
	broadcast:  make(chan string),
	register:   make(chan *client),
	unregister: make(chan *client),
	clients:    make(map[*client]bool),
	content:    "",
}

func (h *hub) run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c] = true
			c.send <- []byte(h.content)
			break

		case c := <-h.unregister:
			_, ok := h.clients[c]
			if ok {
				delete(h.clients, c)
				close(c.send)
			}
			break

		case m := <-h.broadcast:
			h.content = m
			h.broadcastMessage()
			break
		}
	}
}

func (h *hub) broadcastMessage() {
	for c := range h.clients {
		select {
		case c.send <- []byte(h.content):
			break

		// We can't reach the client
		default:
			close(c.send)
			delete(h.clients, c)
		}
	}
}

type client struct {
	ws   *websocket.Conn
	send chan []byte // Channel storing outcoming messages
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  maxMessageSize,
	WriteBufferSize: maxMessageSize,
}

func serveWs(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	c := &client{
		send: make(chan []byte, maxMessageSize),
		ws:   ws,
	}

	ws_hub.register <- c

	go c.writePump()
	c.readPump()
}

func (c *client) readPump() {
	defer func() {
		ws_hub.unregister <- c
		c.ws.Close()
	}()

	c.ws.SetReadLimit(maxMessageSize)
	c.ws.SetReadDeadline(time.Now().Add(pongWait))
	c.ws.SetPongHandler(func(string) error {
		c.ws.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.ws.ReadMessage()
		if err != nil {
			break
		}

		ws_hub.broadcast <- string(message)
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(pingPeriod)

	defer func() {
		ticker.Stop()
		c.ws.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.write(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.write(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.write(websocket.PingMessage, []byte{}); err != nil {
				return
			}
		}
	}
}

func (c *client) write(mt int, message []byte) error {
	c.ws.SetWriteDeadline(time.Now().Add(writeWait))
	return c.ws.WriteMessage(mt, message)
}
