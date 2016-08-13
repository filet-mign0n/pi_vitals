package main

import (
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"
)

var host = flag.String("h", "localhost", "host")
var port = flag.String("p", "8000", "port")
var freq = flag.Int("f", 1000, "PiMonitory frequency in ms")
var window = flag.Int("w", 60, "Time Window in s")
var disk = flag.Bool("s", false, "Save logs to disk")

type ChartInit struct {
	Jlog	string
	TimeWindow *int
}

func piMonitor(w http.ResponseWriter, r *http.Request) {
	var logs string
	log.Println(r.Method, "from", r.RemoteAddr)
	if r.Method == "GET" {
		if *disk {
			jlogs, err := fetchLog("temp.log")
			if err != nil {
				fmt.Println("err:", err)
			}
			if len(jlogs) > 4 {
				logs := string(jlogs)
				fmt.Println("previous logs:\n", logs, len(jlogs))
			} else {
				fmt.Println("no previous logs")
			}	
			logs = string(jlogs)
		} else {
			fmt.Println("if disk, else")
			logs = "[]" 
		}
		
		chartInit := ChartInit{logs, window}
		t, _ := template.ParseFiles("static/temp.gtpl")
		t.Execute(w, chartInit)
	}
}

func main() {

	flag.Parse()

	var cmd_freq = time.Duration(*freq) * time.Millisecond

	cmd_shutdown := make(chan bool)

	defer func() {
		 cmd_shutdown <- true
	}()

	go ws_hub.run()
	go pi_monitor(cmd_shutdown, cmd_freq)

	fs := http.FileServer(http.Dir("static"))

	http.HandleFunc("/", piMonitor)
	http.HandleFunc("/ws", serveWs)
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	log.Fatal(http.ListenAndServe(*host+":"+*port, nil))
	log.Println("piMonitor server listening ->", *host+":"+*port)
}
