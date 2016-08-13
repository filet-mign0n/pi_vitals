#!/bin/bash
echo "Usage : ./spike_cpu.sh 4 60  (4 threads for 60 secs)"

num_threads=${1:-4}
duration=${2:-60}

function infinite_loop {
	endtime=$(($(date +%s) + $duration))
	while (($(date +%s) < $endtime)); do
		echo $(($RANDOM**99)) 1>/dev/null 2>&1
		$(dd if=/dev/urandom count=10000 | bzip2 -9 >> /dev/null) 2>&1 >&/dev/null
	done
	echo "Done stressing the sustem - for thread $1"
}

echo "Running for duration $duration secs, spawning $num_threads threads in background"
for i in `seq ${num_threads}`;
do
	infinite_loop $i &
done

exit $?

