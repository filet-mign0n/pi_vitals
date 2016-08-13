<html>
<head>
	<script src="//d3js.org/d3.v4.0.0-alpha.49.min.js" charset="utf-8"></script>
	<script src="https://code.jquery.com/jquery-2.1.4.min.js"></script>
	<link rel="stylesheet" href="/static/stylesheets/chart.css">
	<script src="/static/js/main.js"></script>
</head>
<body>

	<div class="temp"></div>
	<div class="cpu"></div>
	<div class="cpuS"></div>
	<script type="text/javascript"> 
		var fetchlog_data = JSON.parse({{.Jlog}})
		var xTimeWindow = {{.TimeWindow}}
		console.log("[START] fetchlog_data", fetchlog_data)
	</script>
</body>
</html>
