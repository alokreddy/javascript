var moveChart = dc.lineChart('#daily-area-chart');
var volumeChart = dc.barChart('#daily-brush-chart');
var regOverTimeChart = dc.pieChart('#reg-over-time-chart');
var quarterChart = dc.pieChart('#quarter-chart');
var dayOfWeekChart = dc.rowChart('#day-of-week-chart');

//Width and height of map
var width_spendmap = 960;
var height_spendmap = 500;

// D3 Projection
var projection = d3.geoAlbersUsa()
    .translate([width_spendmap / 2, height_spendmap / 2]) // translate to center of screen
    .scale([1000]); // scale things down so see entire US

// Define path generator
var path = d3.geoPath() // path generator that will convert GeoJSON to SVG paths
    .projection(projection); // tell path generator to use albersUsa projection


// Define linear scale for output
var color = d3.scaleLinear()
    .range(["rgb(213,222,217)", "rgb(69,173,168)", "rgb(84,36,55)", "rgb(217,91,67)"]);


//Create SVG element and append map to the SVG
var svg = d3.select("#usamap")
    .append("svg")
    .attr("preserveAspectRatio", "xMinYMin meet")
    .attr("viewBox", "0 0 960 500");

// Append Div for tooltip to SVG
var div = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


// Load GeoJSON data and merge with states data
d3.json("us-states.json", function (json) {


    // Bind the data to the SVG and create one path per GeoJSON feature
    svg.selectAll("path")
        .data(json.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("stroke", "#fff")
        .style("stroke-width", "1")
        .style("fill", "#b3e5fc");

    // Map the cities I have lived in!
    d3.csv("headcount.csv", function (data) {
        console.log(data);
        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return projection([d.lon, d.lat])[0];
            })
            .attr("cy", function (d) {
                return projection([d.lon, d.lat])[1];
            })
            .attr("r", function (d) {
                return Math.sqrt(d.headcount) * 4;
            })
            .style("fill", "#009688 ") //"rgb(217,91,67)")	
            .style("opacity", 0.85)

            //using HTML instead of text to enable tooltip formatting!
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html("Location: " + d.place + "<br/>" + "Head Count: " + d.headcount)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })

            // fade out tooltip on mouse out               
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });

});


d3.json('spend.json').then(function (spend) {

    //console.log(spend);

    var spend = spend.data.spendbydaterange;
    var dateFormatSpecifier = '%Y-%m-%d';
    var dateFormat = d3.timeFormat(dateFormatSpecifier);
    var dateFormatParser = d3.timeParse(dateFormatSpecifier);
    var numberFormat = d3.format('.2f');

    spend.forEach(function (d) {
        d.dd = dateFormatParser(d.spend_date);
        d.month = d3.timeMonth(d.dd); // pre-calculate month for better performance
        d.overtime_billrate = +d.overtime_billrate; // coerce to number
        d.overtime_hours = +d.overtime_hours;
        d.regular_billrate = +d.regular_billrate;
        d.regular_hours = +d.regular_hours;
        d.total_billrate = +d.total_billrate;
        d.total_hours = +d.total_hours;
    });

    //### Create Crossfilter Dimensions and Groups

    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var ndx = crossfilter(spend);
    var all = ndx.groupAll();

    // Dimension by year
    var yearlyDimension = ndx.dimension(function (d) {
        return d3.timeYear(d.dd).getFullYear();
    });

    // Dimension by full date
    var dateDimension = ndx.dimension(function (d) {
        return d.dd;
    });

    // Dimension by day
    var moveDays = ndx.dimension(function (d) {
        return d.dd;
    });

    //regular bill rate
    var regbillRateGroup = moveDays.group().reduceSum(function (d) {
        return Math.abs(+d.regular_billrate);
    });

    //overtime bill rate
    var overtimebillRateGroup = moveDays.group().reduceSum(function (d) {
        return Math.abs(+d.overtime_billrate);
    });

    console.log(overtimebillRateGroup.top(Infinity));

    //total bill rate
    var totbillRateGroup = moveDays.group().reduceSum(function (d) {
        return Math.abs(+d.total_billrate);
    });

    // count of the number dates
    var volumeByDaysGroup = moveDays.group().reduceCount(function (d) {
        return d.dd;
    });

    // Summarize volume by quarter
    var quarter = ndx.dimension(function (d) {
        var month = d.dd.getMonth();
        if (month <= 2) {
            return 'Q1';
        } else if (month > 2 && month <= 5) {
            return 'Q2';
        } else if (month > 5 && month <= 8) {
            return 'Q3';
        } else {
            return 'Q4';
        }
    });

    //sum of the total bill rate by quarters
    var quarterGroup = quarter.group().reduceSum(function (d) {
        return +d.total_billrate;
    });

    // Counts per weekday
    var dayOfWeek = ndx.dimension(function (d) {
        var day = d.dd.getDay();
        var name = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return day + '.' + name[day];
    });

    // group by weekday
    var dayOfWeekGroup = dayOfWeek.group().reduceSum(function (d) {
        return +d.total_billrate;
    });

    var indexAvgByMonthGroup = moveDays.group().reduce(
        function (p, v) {
            ++p.days;
            p.total += (v.total_billrate);
            p.avg = Math.round(p.total / p.days);
            return p;
        },
        function (p, v) {
            --p.days;
            p.total -= (v.total_billrate);
            p.avg = p.days ? Math.round(p.total / p.days) : 0;
            return p;
        },
        function () {
            return {
                days: 0,
                total: 0,
                avg: 0
            };
        }
    );

    //#### Stacked Area Chart

      moveChart 
          .renderArea(true)
          .width(990)
          .height(200)
          .transitionDuration(1000)
          .margins({
              top: 30,
              right: 50,
              bottom: 25,
              left: 40
          })
          .dimension(moveDays)
          .mouseZoomable(true)
          .rangeChart(volumeChart) //connecting the brush-chart with area chart
          .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 11, 31)]))
          .round(d3.timeMonth.round)
          .xUnits(d3.timeMonths)
          .elasticY(true)
          .renderHorizontalGridLines(true)

          //##### Legend
          // Position the legend relative to the chart origin and specify items' height and separation.
          .legend(dc.legend().x(800).y(10).itemHeight(13).gap(5))
          .brushOn(false)
          // Add the base layer of the stack with group. The second parameter specifies a series name for use in the
          // legend.
          // The `.valueAccessor` will be used for the base layer
          .group(overtimebillRateGroup, 'OverTime Bill Rate')
          .valueAccessor(function (d) {
              return +d.value;
          })
          // Stack additional layers with `.stack`. The first paramenter is a new group.
          // The second parameter is the series name. The third is a value accessor.
          .stack(regbillRateGroup, 'Regular Bill Rate', function (d) {
              return +d.value;
          })
          .stack(overtimebillRateGroup, 'Total Bill Rate', function (d) {
              return +d.value;
          })

             // Title can be called by any stack layer.
             .title(function (d) {
                 var value = d.value ? d.value : d.value;
                 if (isNaN(value)) {
                     value = 0;
                 }
                 return dateFormat(d.key) + '\n' + numberFormat(value);
             })
      ;

    /* moveChart.width(990)
        .height(300)
        .transitionDuration(1000)
        .margins({
            top: 30,
            right: 50,
            bottom: 25,
            left: 60
        })
        .dimension(moveDays)
        .mouseZoomable(true)
        .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 11, 31)]))
        .round(d3.timeMonth.round)
        .xUnits(d3.timeMonths)
        .elasticY(true)
        .renderHorizontalGridLines(true)
        .legend(dc.legend().x(70).y(10).itemHeight(13).gap(5))
        .brushOn(false)
        .compose([
                    dc.lineChart(moveChart)
                        .renderArea(true)
                        .rangeChart(volumeChart)
                            .group(regbillRateGroup, "Regular BR")
                            .valueAccessor(function (d) {
                return d.value;
            }),
                    dc.lineChart(moveChart)
                        .renderArea(true)
                        //.rangeChart(volumeChart)
                            .group(overtimebillRateGroup, "Overtime BR")
                            .valueAccessor(function (d) {
                return (d.value);
            })
                            .title(function (d) {
                var value = d.value.avg ? d.value.avg : d.value;
                if (isNaN(value)) value = 0;
                return dateFormat(d.key) + "\n" + numberFormat(value);
            })
                            .ordinalColors(["orange"])
                            .useRightYAxis(true)
                ])
        .yAxisLabel("Regular Billrate")
        .rightYAxisLabel("Over-Time Billrate")
        .renderHorizontalGridLines(true);
*/
    //#### Range Chart

    // Since this bar chart is specified as "range chart" for the area chart, its brush extent
    // will always match the zoom of the area chart.
    volumeChart.width(990) /* dc.barChart('#monthly-volume-chart', 'chartGroup'); */
        .height(40)
        .margins({
            top: 0,
            right: 50,
            bottom: 20,
            left: 40
        })
        .dimension(moveDays)
        .group(volumeByDaysGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 11, 31)]))
        .round(d3.timeDay.round)
        .alwaysUseRounding(true)
        .xUnits(d3.timeDay)
        .yAxis().ticks(0); //tickFormat(function(v) { return ""; });;

    //pie chart
    quarterChart /* dc.pieChart('#quarter-chart', 'chartGroup') */
        .width(180)
        .height(180)
        .radius(80)
        .innerRadius(40)
        .dimension(quarter)
        .group(quarterGroup);

    //#### Row Chart
    dayOfWeekChart /* dc.rowChart('#day-of-week-chart', 'chartGroup') */
        .width(180)
        .height(180)
        .margins({
            top: 20,
            left: 10,
            right: 10,
            bottom: 20
        })
        .group(dayOfWeekGroup)
        .dimension(dayOfWeek)
        // Assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key.split('.')[1];
        })
        // Title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    //### Pie Chart for number of RT vs OT
    function regroup(dim, cols) {
        var _groupAll = dim.groupAll().reduce(
            function (p, v) { // add
                cols.forEach(function (c) {
                    p[c] += v[c];
                });
                return p;
            },
            function (p, v) { // remove
                cols.forEach(function (c) {
                    p[c] -= v[c];
                });
                return p;
            },
            function () { // init
                var p = {};
                cols.forEach(function (c) {
                    p[c] = 0;
                });
                return p;
            });
        return {
            all: function () {
                // or _.pairs, anything to turn the object into an array
                return d3.map(_groupAll.value()).entries();
            }
        };
    }
    var otrtGroup = regroup(moveDays, ['regular_billrate', 'overtime_billrate']);

    regOverTimeChart
        .width(180)
        .height(180)
        .radius(80)
        .innerRadius(40)
        .dimension(moveDays)
        .group(otrtGroup);




    //render
    dc.renderAll();

});