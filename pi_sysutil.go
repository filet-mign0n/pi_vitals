package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"time"
)

var cwd, _ = os.Getwd()
var re = regexp.MustCompile(`[0-9]+\.[0-9]+`)

type Lg struct {
	Date   string
	Gpu    string
	Cpu    string
	PerCPU map[string]float64
}

type diskLogger struct {
	Save bool
	Logfile *os.File
}

func (d *diskLogger) logToDisk(logLine string) {
	if d.Save {
		d.Logfile.WriteString(logLine)
	}
}

func pi_monitor(cmd_shutdown <-chan bool, cmd_freq time.Duration) {

	ticker := time.NewTicker(cmd_freq)

	diskLog := diskLogger{Save: *disk}
	if diskLog.Save {
		logfile, err := prepLogFile("temp.log")
		if err != nil {
			fmt.Println("Error prepping log file")
			os.Exit(1)
		}
		diskLog.Logfile = logfile
	}
	
	defer func() {
		ticker.Stop()
		diskLog.Logfile.Close()
	}()

	for {
		select {
		case msg := <-cmd_shutdown:
			if msg {
				fmt.Println("got cmd shutdown msg!")
				return
			}
		case <-ticker.C:

			/* GPU Temperature */
			gpu, err := exec.Command("/opt/vc/bin/vcgencmd", "measure_temp").Output()
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
				return
			}

			/* CPU Temperature */
			cpu, err := exec.Command("cat", "/sys/class/thermal/thermal_zone0/temp").Output()
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
				return
			}

			/* % used per cpu core */
			perCpu, err := Percent(cmd_freq, true)
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
			}

			//regexp raw gpu stdout
			regpu := re.FindString(string(gpu))

			//convert cpu temperature string to float and divide by 1000
			fcpu, err := strconv.ParseFloat(string(cpu)[:len(cpu)-1], 64)
			if err != nil {
				fmt.Println("parsing cpu temp as float:", err)
				return
			}
			ffcpu := strconv.FormatFloat(fcpu/1000, 'f', 1, 64)

			t := strconv.FormatInt(time.Now().UnixNano()/int64(time.Millisecond), 10)

			//json obj to be broadcasted via ws
			jws, err := json.Marshal(Lg{t, string(regpu), ffcpu, perCpu})
			if err != nil {
				log.Println("JSON Marshalling error:", err)
			}
			ws_hub.broadcast <- string(jws)
			log.Println(string(jws))

			// write log to disk if flag true
			logs := t + " " + string(regpu) + " " + ffcpu + " " + strconv.FormatFloat(perCpu["cpu-total"], 'f', -1, 64) + " " + strconv.FormatFloat(perCpu["cpu0"], 'f', -1, 64) + " " + strconv.FormatFloat(perCpu["cpu1"], 'f', -1, 64) + " " + strconv.FormatFloat(perCpu["cpu2"], 'f', -1, 64) + " " + strconv.FormatFloat(perCpu["cpu3"], 'f', -1, 64) + "\n"
			diskLog.logToDisk(logs)

		}
	}
}
