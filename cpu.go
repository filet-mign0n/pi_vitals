package main

import (
	"fmt"
	"io/ioutil"
	"strconv"
	"strings"
	"sync"
	"time"
)

type lastPercent struct {
	sync.Mutex
	lastCPUTimes    []TimesStat
	lastPerCPUTimes []TimesStat
}

var lastCPUPercent lastPercent

type TimesStat struct {
	CPU   string `json:"cpu"`
	Idle  uint64 `json:"idle"`
	Total uint64 `json:"idle"`
}

func init() {
	lastCPUPercent.Lock()
	lastCPUPercent.lastCPUTimes, _ = Times(false)
	lastCPUPercent.lastPerCPUTimes, _ = Times(true)
	lastCPUPercent.Unlock()
}

func Percent(interval time.Duration, percpu bool) (map[string]float64, error) {
	if interval <= 0 {
		return percentUsedFromLastCall(percpu)
	}
	cpuTimes1, err := Times(percpu)
	if err != nil {
		return nil, err
	}
	time.Sleep(interval)

	cpuTimes2, err := Times(percpu)
	if err != nil {
		return nil, err
	}

	return calculateAllBusy(cpuTimes1, cpuTimes2)
}

func percentUsedFromLastCall(percpu bool) (map[string]float64, error) {
	cpuTimes, err := Times(percpu)
	if err != nil {
		return nil, err
	}
	lastCPUPercent.Lock()
	defer lastCPUPercent.Unlock()
	var lastTimes []TimesStat
	if percpu {
		lastTimes = lastCPUPercent.lastPerCPUTimes
		lastCPUPercent.lastCPUTimes = cpuTimes
	} else {
		lastTimes = lastCPUPercent.lastCPUTimes
		lastCPUPercent.lastCPUTimes = cpuTimes
	}

	if lastTimes == nil {
		return nil, fmt.Errorf("Error getting times for cpu percent. LastTimes was nil")
	}
	return calculateAllBusy(lastTimes, cpuTimes)
}

func calculateAllBusy(t1, t2 []TimesStat) (map[string]float64, error) {
	if len(t1) != len(t2) {
		return nil, fmt.Errorf(
			"received two CPU counts: %d != %d",
			len(t1), len(t2),
		)
	}
	ret := make(map[string]float64, len(t1))
	for i, t := range t2 {
		ret[t.CPU] = calculateBusy(t1[i], t)
	}
	return ret, nil

}

func calculateBusy(t1, t2 TimesStat) float64 {
	fmt.Println("t1", t1.Idle, t1.Total)
	fmt.Println("t2", t2.Idle, t2.Total)

	idleTicks := float64(t2.Idle - t1.Idle)
	totalTicks := float64(t2.Total - t1.Total)
	busyTicks := totalTicks - idleTicks
	cpuUsage := 100 * (busyTicks) / totalTicks
	fmt.Println("busyTicks, totalTicks", busyTicks, totalTicks)

	return cpuUsage
}

func parseStatLine(line string) (*TimesStat, error) {
	fields := strings.Fields(line)
	fmt.Println("fields:", fields)

	cpu := fields[0]
	if cpu == "cpu" {
		cpu = "cpu-total"
	}
	var total uint64
	var idle uint64
	numFields := len(fields)

	for i := 1; i < numFields; i++ {
		val, err := strconv.ParseUint(fields[i], 10, 64)
		if err != nil {
			fmt.Println("Error: ", i, fields[i], err)
			return nil, err
		}
		total += val
		if i == 4 { // idle is the 5th field in the cpu line
			idle = val
		}
	}

	ts := &TimesStat{
		CPU:   cpu,
		Total: total,
		Idle:  idle,
	}

	fmt.Println("parseStatLine", ts)
	return ts, nil

}

func Times(percpu bool) ([]TimesStat, error) {

	contents, err := ioutil.ReadFile("/proc/stat")
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(contents), "\n")
	var ret []TimesStat
	if percpu {
		ret = make([]TimesStat, 0, len(lines)-1)
		for _, line := range lines[0:5] {
			ts, err := parseStatLine(line)
			if err != nil {
				return nil, err
			}
			ret = append(ret, *ts)
		}
	} else {
		ret = make([]TimesStat, 0, 1)
		ts, err := parseStatLine(lines[0])
		if err != nil {
			return nil, err
		}
		ret = append(ret, *ts)
	}

	return ret, nil
}
