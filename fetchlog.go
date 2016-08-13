/* TODO put log files in static folder and let browser do all the work */
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

func fetchLog(name string) ([]byte, error) {

	fmt.Println("fetching log...")

	type Lg struct {
		Date   string
		Gpu    string
		Cpu    string
		PerCpu map[string]string
	}

	logs := []Lg(nil)

	f, err := os.Open(name)
	if err != nil {
		return nil, err
	}

	fmt.Println("log file:", f.Name())

	s := bufio.NewScanner(f)
	perCpu := make(map[string]string, 4)

	for s.Scan() {

		lstr := strings.Split(s.Text(), " ")

		for i := 3; i <= 6; i++ {
			name := "cpu" + strconv.Itoa(i-3)
			perCpu[name] = lstr[i]

		}

		logs = append(logs, Lg{lstr[0], lstr[1], lstr[2], perCpu})
	}
	if err := s.Err(); err != nil {
		fmt.Fprintln(os.Stderr, "reading log file:", err)
		return nil, err
	}

	jlogs, _ := json.Marshal(logs)
	fmt.Println("logs", logs)
	return jlogs, nil
}

func prepLogFile(name string) (*os.File, error) {
	f, err := os.OpenFile(name, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		return nil, err
	}
	return f, nil
}

func popline(f *os.File) ([]byte, error) {
	fi, err := f.Stat()
	if err != nil {
		return nil, err
	}
	buf := bytes.NewBuffer(make([]byte, 0, fi.Size()))

	_, err = f.Seek(0, os.SEEK_SET)
	if err != nil {
		return nil, err
	}
	_, err = io.Copy(buf, f)
	if err != nil {
		return nil, err
	}
	line, err := buf.ReadString('\n')
	if err != nil && err != io.EOF {
		return nil, err
	}

	_, err = f.Seek(0, os.SEEK_SET)
	if err != nil {
		return nil, err
	}
	nw, err := io.Copy(f, buf)
	if err != nil {
		return nil, err
	}
	err = f.Truncate(nw)
	if err != nil {
		return nil, err
	}
	err = f.Sync()
	if err != nil {
		return nil, err
	}

	_, err = f.Seek(0, os.SEEK_SET)
	if err != nil {
		return nil, err
	}
	return []byte(line), nil
}
