window.onload = function() {

if (!window["WebSocket"]) {
    alert("Websockets not suported on your browser")
    return;
}

timeScaledObj = getTimeScaleInfo(fetchlog_data)

var margin = {top: 40, right: 40, bottom: 40, left:40},
    width = 800,
    height = 450;
  
var xScale = d3.time.scale()
	.domain(timeScaledObj.timeDomain)
	.rangeRound([0, width - margin.left - margin.right]);	

var yScale = d3.scale.linear()
    .domain([0,90])
    .range([height - margin.top - margin.bottom, 0]);
    
var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient('bottom')
    .ticks(d3.time.seconds, 5)
    .tickFormat(d3.time.format('%H:%M:%S'))
    .tickSize(0)
    .tickPadding(4);

var yAxis = d3.svg.axis()
    .scale(yScale)
    .orient('left')
    .tickPadding(8);

var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
  	.append('g')
    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
    
var color = d3.scale.category10()
color.domain(["Gpu", "Cpu"])

function GenData(j) {
	return color.domain().map(function(name) {
		return {
	  	name: name,
	    values: j.data.map(function(d) {
	    return {date: d.Date, temp: parseFloat(d[name])}
	    })
	  }
	})
}


var lineGen = d3.svg.line()
  .x(function(d) {
    return xScale(new Date(d.date));
  })
  .y(function(d) {
    return yScale(d.temp);
  })
  .interpolate("basis");

var PU = svg.selectAll(".pu")
  .data(GenData(timeScaledObj))
  .enter()
  .append("path")  
  .attr("class", "line")
  .attr("d", function(d) { return lineGen(d.values) })
  .attr('stroke', function(d) { return color(d.name); })
  .attr('stroke-width', 2)
  .attr('fill', 'none')
  .attr('shape-rendering', 'auto')

var txt = svg.selectAll(".pu")
  .data(GenData(timeScaledObj))
  .enter()
  .append("text")
  .datum(function(d) { console.log('datum',d); return {name: d.name, value: d.values[d.values.length -1]}; })
  .attr("transform", function(d) { console.log('datum d',d); return "translate(" + xScale(new Date(d.value.date)) + "," + yScale(d.value.temp) + ")"; })
  .attr("x", 3)
  .attr("dy", ".35em")
  .text(function(d) { return d.name })

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

  	txt
  		.data(j)
  		.datum(function(d) { return {name: d.name, value: d.values[d.values.length -1]}; })
  		.attr("transform", function(d) { return "translate(" + xScale(new Date(d.value.date)) + "," + yScale(d.value.temp) + ")"; })
  		.attr("x", 3)
	    .attr("dy", ".35em")
  		.text(function(d) { return d.name })

}

function getTimeScaleInfo(j) {

	var displayObj = {}

	if (!j) {
		console.log('null jblob')
		var now = new Date(Date.now())
		var after = new Date(now.getTime())
		after = new Date(after.setSeconds(now.getSeconds()+60))
		
		displayObj.timeDomain = [now, after]
		displayObj.data = [{"Date":"05/18/2016 22:53:20", "Gpu":"0.0", "Cpu":"0.0"}]
		return displayObj
	
	} else if (Object.keys(j).length == 0) {
		console.log('empty jblob')
		var now = new Date(Date.now())
		var after = new Date(now.getTime())
		after = new Date(after.setSeconds(now.getSeconds()+60))
		
		displayObj.timeDomain = [now, after]
		displayObj.data = [{"Date":"05/18/2016 22:53:20", "Gpu":"0.0", "Cpu":"0.0"}]
		return displayObj

	} else if (Object.keys(j).length == 1) {
		
		console.log('jblob with one unit')
		var first = new Date(j[0].Date)
		var start = new Date(first.getTime())
		var end = new Date(first.setSeconds(first.getSeconds()+60))
		
		displayObj.timeDomain = [start, end]
		displayObj.data = j.slice()
		return displayObj

	} else {
		
		var first = new Date(j[0].Date)
		var last = new Date(j[j.length-1].Date)
		
		if (last < first) {
			console.log('last date < first date !!!')
			return
		}
		
		if (Math.abs(first-last) < 60000) {
		
			console.log(" < 60000 ")
			var start = new Date(first.getTime())
			var end = new Date(first.setSeconds(first.getSeconds()+60))
			
			displayObj.timeDomain = [start, end]
			//copy data to be able to modify it later without interfering
			displayObj.data = j.slice()
			return displayObj

		}

		if (Math.abs(first-last) >= 60000) { 

			console.log(">= 60000 !!!")
			
			var end = new Date(last.getTime())
			var start = new Date(last.setSeconds(last.getSeconds()-60))
			
			//find data point close to calculate start date
			var dataPoint = findDataWithDate(j, start)


			displayObj.timeDomain = [new Date(dataPoint.Date), end]
			displayObj.data = sliceDataWithDataPoint(j, dataPoint, new Date(dataPoint.Date) < end)

			
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

function findDataWithDate(j, date) {
	dist = Math.abs(date - new Date("09/23/1985 20:04:40"))
	closest = new Date("09/23/1985 20:04:40")
	j.forEach(function(d) {
		newDist = Math.abs(date - new Date(d.Date))
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
	
	if (fetchlog_data) {
		console.log("updating chart with jws:", jws)
		console.log("pushing it to orig data")
		//console.log(fetchlog_data)

		fetchlog_data.push(jws)
	} else { 
		console.log("no orig data, creating new orig data with jws", jws)
		fetchlog_data = [jws] 
	}

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
	svg.select(".x.axis")
	    .call(xAxis);  
	    //.transition().duration(500).ease("sin-in-out")  

	drawPath(GenData(timeScaledObj))
}

// get live cmd feed via ws
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
	var jws = JSON.parse(e.data)
	//console.log(jws);
	updateChart(jws)
}

function send() {
	var msg = document.getElementById('message').value;
	sock.send(msg)
};

}