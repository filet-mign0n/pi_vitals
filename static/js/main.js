var maxTemp,
	minTemp,
	allowedLag = 5000,
	timeScaledObj,
	tempYAxisAutoscale = false;

window.onload = function() {

if (!window["WebSocket"]) {
    alert("Websockets not suported on your browser")
    return;
}

timeScaledObj = getTimeScaleInfo(fetchlog_data)

var margin = {top: 40, right: 40, bottom: 40, left:40},
    width = 800,
    height = 450;
  
var xScale = d3.scaleTime()
	.domain(timeScaledObj.timeDomain)
	.rangeRound([0, width - margin.left - margin.right]);	

var yScale = d3.scaleLinear()
    .domain([30,80])
    .range([height - margin.top - margin.bottom, 0]);

var yScale_CPU = d3.scaleLinear()
	.domain(getCPUScaleDomain(timeScaledObj))
	.range([height - margin.top - margin.bottom, 0]);
    
var xAxis = d3.axisBottom(xScale)
    .tickSizeInner(-(height - margin.top - margin.bottom))
    .tickSizeOuter(0)
    .ticks(10)
	//.ticks(d3.time.seconds, xTimeWindow/6)
    .tickFormat(d3.timeFormat('%H:%M:%S'))
    .tickPadding(4);

var yAxis = d3.axisLeft(yScale)
    .tickSizeInner(-(width - margin.left - margin.right))
    .tickSizeOuter(0)
    .ticks(8)
    .tickPadding(8);

var yAxis_CPU = d3.axisLeft(yScale_CPU)
    .tickSizeInner(-(width - margin.left - margin.right))
    .tickSizeOuter(0)
    .ticks(8)
    .tickPadding(8);

var svg = d3.select('.temp').append('svg')
    .attr('width', width + 0.20 *width)
    .attr('height', height)
  	.append('g')
    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
    
var svg2 = d3.select('.cpu').append('svg')
    .attr('width', width + 0.20 *width)
    .attr('height', height)
  	.append('g')
    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
 
var svg3 = d3.select('.cpuS').append('svg')
    .attr('width', width + 0.20 *width)
    .attr('height', height)
  	.append('g')
    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
 

var color = d3.scaleOrdinal(d3.schemeCategory10)
color.domain(["Gpu", "Cpu"])

var color_CPU = d3.scaleOrdinal(d3.schemeCategory10)
color_CPU.domain(["cpu-total", "cpu0", "cpu1", "cpu2", "cpu3"])

function GenData(j) {
	
	console.log("GenData", j)

	return color.domain().map(function(name) {
		return {
	  	name: name,
	    values: j.data.map(function(d) {
	    return {date: parseInt(d.Date), temp: parseFloat(d[name])}
	    })
	  }
	})
}

function GenData_CPU(j) {
	
	console.log("GenData_CPU", j)

	return color_CPU.domain().map(function(name) {
		return {
	  	name: name,
	    values: j.data.map(function(d) {
	    return {date: parseInt(d.Date), percent: d.PerCPU[name]}
	    })
	  }
	})
}

var stack_domain = ["cpu0", "cpu1", "cpu2", "cpu3"]

var stack = d3.stack(stack_domain)
	.keys(stack_domain)
	.order(d3.stackOrderNone)
	.offset(d3.stackOffsetNone);

var area = d3.area()
	.x(function(d, i) { return xScale(new Date(d.date)); })
	.y0(function(d) { return yScale_CPU(d[0]); })
	.y1(function(d) { return yScale_CPU(d[1]); })

function GenData_stack(j) {
	console.log("GenData_stack", j)

	return j.data.map(function(d)  {
		return {date: parseInt(d.Date), 
				cpu0: d.PerCPU['cpu0'], 
				cpu1: d.PerCPU['cpu1'],
				cpu2: d.PerCPU['cpu2'],
				cpu3: d.PerCPU['cpu3'],
				}
	})

}

var lineGen = d3.line()
  .x(function(d) {
    return xScale(new Date(d.date));
  })
  .y(function(d) {
    return yScale(d.temp);
  })
  .curve(d3.curveLinear)

var lineGen_CPU = d3.line()
  .x(function(d) {
    return xScale(new Date(d.date));
  })
  .y(function(d) {
    return yScale_CPU(d.percent);
  })
  .curve(d3.curveLinear)

var PU = svg.selectAll(".pu")
  .data(GenData(timeScaledObj))
  .enter()
  .append("path")  
  .attr("class", "line")
  .attr("d", function(d) { return lineGen(d.values) })
  .attr('stroke', function(d) { return color(d.name); })
  .attr('stroke-width', function(d) { return d.name == 'cpu-total' ? 4 : 2 })
  .attr("stroke-linejoin", "round")
  .attr('fill', 'none')
  .attr('shape-rendering', 'auto')

console.log("Stack DATA")
console.log(stack(GenData_stack(timeScaledObj)))
console.log((GenData_stack(timeScaledObj)))
var PU3 = svg3.selectAll(".pu")
	.data(stack(GenData_stack(timeScaledObj)))
	.enter()
	.append("path")
	.attr("class", "area")
	.style("fill", function(d) { return color_CPU(d.name); })
	.attr("d", area)

var PU2 = svg2.selectAll(".pu")
  .data(GenData_CPU(timeScaledObj))
  .enter()
  .append("path")  
  .attr("class", "line")
  .attr("d", function(d) { return lineGen_CPU(d.values) })
  .attr('stroke', function(d) { return color_CPU(d.name); })
  .attr('stroke-width', function(d) { return d.name == 'cpu-total' ? 4 : 2 })
  .attr('stroke-width', 2)
  .attr("stroke-linejoin", "round")
  .attr('fill', 'none')
  .attr('shape-rendering', 'auto')

var legendRectSize = 12;
var legendSpacing = 3;

var legend = svg.selectAll('.legend')
	.data(color.domain())
	.enter()
	.append('g')
	.attr('class', 'legend')
	.attr('transform', function(d, i) {
		var rheight = legendRectSize + legendSpacing
		var offset = rheight * color.domain().length / 2
		var horz = width - width * 0.08
		var vert = i * rheight - offset + height * 0.10
		return 'translate(' + horz + ',' + vert + ')'
	})

var legend2 = svg2.selectAll('.legend')
	.data(color_CPU.domain())
	.enter()
	.append('g')
	.attr('class', 'legend')
	.attr('transform', function(d, i) {
		var rheight = legendRectSize + legendSpacing
		var offset = rheight * color_CPU.domain().length / 2
		var horz = width - width * 0.08
		var vert = i * rheight - offset + height * 0.10
		return 'translate(' + horz + ',' + vert + ')'
	})

legend.append('rect')
	.attr('width', legendRectSize)
	.attr('height', legendRectSize)
	.style('fill', color)
	.style('stroke', color)

legend.append('text')
	.attr('x', legendRectSize + legendSpacing)
	.attr('y', legendRectSize - legendSpacing)
	.text(function(d) { return d })


legend2.append('rect')
	.attr('width', legendRectSize)
	.attr('height', legendRectSize)
	.style('fill', color_CPU)
	.style('stroke', color_CPU)

legend2.append('text')
	.attr('x', legendRectSize + legendSpacing)
	.attr('y', legendRectSize - legendSpacing)
	.text(function(d) { return d })

/*
var txt = svg.selectAll(".pu")
  .data(GenData(timeScaledObj))
  .enter()
  .append("text")
  .datum(function(d) { console.log('datum',d); return {name: d.name, value: d.values[d.values.length -1]}; })
  .attr("transform", function(d) { console.log('datum d',d); return "translate(" + xScale(new Date(parseInt(d.value.date))) + "," + yScale(d.value.temp) + ")"; })
  .attr("x", 3)
  .attr("dy", ".35em")
  .text(function(d) { return d.name })
*/

svg.append('g')
	.attr('class', 'x axis')
	.attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
	.call(xAxis);

svg.append('g')
	.attr('class', 'y axis')
	.call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Temperature (ºC)");

svg2.append('g')
	.attr('class', 'x axis')
	.attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
	.call(xAxis);

svg2.append('g')
	.attr('class', 'y axis')
	.call(yAxis_CPU)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("CPU usage (%)");

function drawPath(j) {
	
	console.log("trying to draw path with:")
	console.log(j)

	PU
		.data(j)
		.attr("d", function(d) { return lineGen(d.values) })
  		.attr('stroke', function(d) { return color(d.name); })
  		.attr('stroke-width', 2)
  		.attr('fill', 'none')
  		.attr('shape-rendering', 'auto')
}

function drawPath_CPU(j) {

	console.log("trying to draw CPU path with:")
	console.log(j)
	
	PU2
		.data(j)
		.attr("d", function(d) { return lineGen_CPU(d.values) })
  		.attr('stroke', function(d) { return color_CPU(d.name); })
  		.attr('stroke-width', 2)
		.attr('stroke-width', function(d) { return d.name == 'cpu-total' ? 4 : 2 })  		  .attr('fill', 'none')
  		.attr('shape-rendering', 'auto')
}


function drawPath_stack(j) {
	
	console.log("trying to draw stack path with:")
	console.log(j)

	PU3
		.data(stack(j))
		.attr("class", "area")
		.style("fill", function(d) { return color_CPU(d.name); })
		.attr("d", area)

}
  	/*
  	txt
  		.data(j)
  		.datum(function(d) { return {name: d.name, value: d.values[d.values.length -1]}; })
  		.attr("transform", function(d) { return "translate(" + xScale(new Date(parseInt(d.value.date))) + "," + yScale(d.value.temp) + ")"; })
  		.attr("x", 3)
	    .attr("dy", ".35em")
  		.text(function(d) { return d.name })
  	*/ 	


function getCPUScaleDomain (j) {
	// add fancy responsive stuff later 
	return [0, 100]
}

function getTempScaleDomain(j) {

	if (tempYAxisAutoscale) {
		
		var currMaxTemp = d3.max(j.data, function(d) { return Math.max(parseFloat(d.Cpu), parseFloat(d.Gpu)) }) 
		var currMinTemp = d3.min(j.data, function(d) { return Math.min(parseFloat(d.Cpu), parseFloat(d.Gpu)) })
	   	
		console.log("\nGETEMP!")
		console.log(currMaxTemp, maxTemp, Math.abs(currMaxTemp - maxTemp)) 
		console.log(currMinTemp, minTemp, Math.abs(currMinTemp - minTemp))
		if (maxTemp) { 
			var maxDist = Math.abs(currMaxTemp - maxTemp)
			if (maxDist < 0.3 || maxDist > 0.3) maxTemp = currMaxTemp + 2
		} else { maxTemp = currMaxTemp + 2 }

		if (minTemp) {	
			var minDist = Math.abs(currMinTemp - minTemp)
			if (minDist < 0.3 || minDist > 0.3) minTemp = currMinTemp - 2
		} else { minTemp = currMinTemp -  2 }
		
		return [minTemp, maxTemp]
	
	} else {
		return [30,80]
	}
}

function getTimeScaleInfo(j) {

	console.log("getTimeScaleInfo", j)

	var displayObj = {}

	if (!j) {
		console.log('null jblob')
		displayObj = initTimeScaleObj()
		return displayObj
	
	} else if (Object.keys(j).length == 0) {
		console.log('empty jblob')
		displayObj = initTimeScaleObj()
		return displayObj

	} else if (Object.keys(j).length == 1) {
		
		console.log('jblob with one log')
		var first = new Date(parseInt(j[0].Date))
		
		if (Math.abs(first - Date.now()) > 1000) {
			console.log("(Object.keys(j).length == 1) && (first - Date.now()) > xTimeWindow * 1000)")
			return initTimeScaleObj()
		} else {

		var start = new Date(first.getTime())
		var end = new Date(first.setSeconds(first.getSeconds()+xTimeWindow))
		
		displayObj.timeDomain = [start, end]
		displayObj.data = j.slice()
		
		return displayObj

		}

	} else {
		
		var first = new Date(parseInt(j[0].Date))
		var last = new Date(parseInt(j[j.length-1].Date))

		console.log("last", last.getTime())
		
		console.log("Math.abs(last - Date.now())", Math.abs(last.getTime() - Date.now()))
		console.log(Date.now())

		if (last < first) {
			console.log('last date < first date !!!')
			return
		} else if (Math.abs(last - Date.now()) > allowedLag) {
			console.log("(Object.keys(j).length > 1) && (Math.abs(last - Date.now()) > 1000)")
			return initTimeScaleObj()
		}
		
		if (Math.abs(first-last) < xTimeWindow*1000) {
		
			console.log(" < 60000 ")
			var start = new Date(first.getTime())
			var end = new Date(first.setSeconds(first.getSeconds()+xTimeWindow))
			
			displayObj.timeDomain = [start, end]
			//copy data to be able to modify it later without interfering
			displayObj.data = j.slice()
			return displayObj

		}

		if (Math.abs(first-last) >= xTimeWindow*1000) { 

			console.log(">= 60000 !!!")
			
			var end = new Date(last.getTime())
			var start = new Date(last.setSeconds(last.getSeconds()-xTimeWindow))
			
			//find data point close to calculate start date
			var dataPoint = findDataWithDate(j, start)

			displayObj.timeDomain = [new Date(parseInt(dataPoint.Date)), end]
			displayObj.data = sliceDataWithDataPoint(j, dataPoint, new Date(parseInt(dataPoint.Date)) < end)

			
			console.log(dataPoint.Date, end, start, displayObj.data)

			return displayObj
		}

		if (first == last) {
			console.log('==')
			displayObj.timeDomain = [first, last]
			displayObj.data = j.slice()
			return displayObj
		}
	}
}

function initTimeScaleObj() {
	var initObj = {}
	var now = new Date(Date.now())
	var after = new Date(now.getTime())
	after = new Date(after.setSeconds(now.getSeconds() + xTimeWindow))
	
	initObj.timeDomain = [now, after]
	initObj.data = [{"Date": now.getTime().toString(), "Gpu":"0.0", "Cpu":"0.0", "PerCPU": {"cpu-total": 0.0, "cpu0": 0.0, "cpu1": 0.0, "cpu2": 0.0, "cpu3": 0.0, }}]
	console.log("initTimeScaleObj about to return")
	console.log(initObj)
	return initObj
}

function findDataWithDate(j, date) {
	dist = Math.abs(date - new Date("09/23/1985 20:04:40"))
	closest = new Date("09/23/1985 20:04:40")
	j.forEach(function(d) {
		newDist = Math.abs(date - new Date(parseInt(d.Date)))
		if (newDist <= dist) {
			dist = newDist
			closest = d
		}
	})
	return closest
}

function sliceDataWithDataPoint(j, dataPoint, after) {
	if (after) { 
		return j.slice(j.indexOf(dataPoint), j.length)
	} else {
		return j.slice(0, j.indexOf(dataPoint))	
	}
}

function updateChart(jws) {
	if (typeof(timeScaledObj) != "undefined") {
		console.log("typeof(timeScaledObj) != undefined")
		if (timeScaledObj.data) {

			console.log("if (timeScaledObj.data)")
			console.log("timeDomain before", timeScaledObj.timeDomain)
			console.log("data before", timeScaledObj.data)
			timeScaledObj.data.push(jws)
			timeScaledObj = getTimeScaleInfo(timeScaledObj.data)
			console.log("data after", timeScaledObj.data)
			console.log("timeDomain after", timeScaledObj.timeDomain)

		} 

	} else { 
		console.log("else timeScaledObj = getTimeScaleInfo([jws])")
		timeScaledObj = getTimeScaleInfo([jws]) 
	}
	
	xScale.domain(timeScaledObj.timeDomain)  
	yScale.domain(getTempScaleDomain(timeScaledObj))
	yScale_CPU.domain(getCPUScaleDomain(timeScaledObj))

	svg.select(".x.axis")
	    .call(xAxis);  
	svg.select(".y.axis")
	    .call(yAxis) 

	svg2.select(".x.axis")
	    .call(xAxis);  
	svg2.select(".y.axis")
	    .call(yAxis_CPU) 
 
	drawPath(GenData(timeScaledObj))
	drawPath_CPU(GenData_CPU(timeScaledObj))
	drawPath_stack(GenData_stack(timeScaledObj))
}

var sock = null;
var wsuri = 'ws://' + window.location.host + '/ws'

console.log("onload")
sock = new WebSocket(wsuri)

sock.onopen = function() {
	console.log("connected to "+wsuri);
}
sock.onclose = function(e) {
	console.log("connection closed (" + e.code + ")");
}
sock.onmessage = function(e) {
	if (e.data != "") {
		var jws = JSON.parse(e.data)
		console.log("onmsg", jws.PerCPU);
		updateChart(jws)
	}
}

function send() {
	var msg = document.getElementById('message').value;
	sock.send(msg)
};

}
