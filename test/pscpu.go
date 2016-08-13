package main

import (
    "fmt"
    "github.com/shirou/gopsutil/cpu"
	"time"
)

func main() {
	
	for i:=0; i<100; i++ {
		fl, err := cpu.Percent(0, false)
        if err!=nil {
                fmt.Println("error:", err)
        }
        fmt.Println(fl)	
		time.Sleep(time.Millisecond * 3000)
	}

}
