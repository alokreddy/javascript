var moveChart = dc.lineChart('#area-chart');
var volumeChart = dc.barChart('#brush-chart');
var quarterChart = dc.pieChart('#quarter-chart');
var categoryChart = dc.pieChart('#category-chart');
var dayOfWeekChart = dc.rowChart('#day-of-week-chart');
var locationChart = dc.bubbleChart('#location');
var supplierChart = dc.bubbleChart('#supplier');

var numberFormat = d3.format(',.0f');


d3.json('spend.json').then(function (spend) {
    //console.log(spend);
    var spend = spend.data.spendbydaterange;
    var dateFormatSpecifier = '%Y-%m-%d';
    var dateFormat = d3.timeFormat(dateFormatSpecifier);
    var dateFormatParser = d3.timeParse(dateFormatSpecifier);

    spend.forEach(function (d) {
        d.dd = dateFormatParser(d.spend_date);
        d.month = d3.timeMonth(d.dd); // pre-calculate month for better performance
        d.week = d3.timeWeek(d.dd); // pre-calculate week for better performance
        d.overtime_billrate = +d.overtime_billrate; // coerce to number
        d.overtime_hours = +d.overtime_hours;
        d.regular_billrate = +d.regular_billrate;
        d.regular_hours = +d.regular_hours;
        d.total_billrate = +d.total_billrate;
        d.total_hours = +d.total_hours;
    });

    //### Create Crossfilter Dimensions and Groups
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

    // Dimension by month
    var moveMonths = ndx.dimension(function (d) {
        return d.month;
    });

    // Dimension by week
    var moveWeeks = ndx.dimension(function (d) {
        return d.week;
    });

    //regular bill rate
    var regbillRateGroup = moveWeeks.group().reduceSum(function (d) {
        return Math.abs(+d.regular_billrate);
    });

    //overtime bill rate
    var overtimebillRateGroup = moveWeeks.group().reduceSum(function (d) {
        return Math.abs(+d.overtime_billrate);
    });

    //total bill rate
    var totbillRateGroup = moveWeeks.group().reduceSum(function (d) {
        return Math.abs(+d.total_billrate);
    });

    // count of the number dates
    var volumeByDaysGroup = moveDays.group().reduceCount(function (d) {
        return d.dd;
    });

    // count of the number weeks
    var volumeByWeeksGroup = moveWeeks.group().reduceCount(function (d) {
        return d.week;
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
    
    var category = ndx.dimension(function(d) {
        return d['job_category']
    });
    
    var categoryGroup = category.group().reduceSum(function(d) {
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

    var location = ndx.dimension(function (d) {
        return d["location"];
    });

    var statsByLocation = location.group().reduce(
        function (p, v) {
            p.spend += +v["total_billrate"];
            p.count++;
            return p;
        },
        function (p, v) {
            p.spend -= +v["total_billrate"];
            if (p.spend < 0.001) p.spend = 0; // do some clean up
            p.count--;
            return p;
        },
        function () {
            return {
                spend: 0,
                count: 0
            }
        }
    );


    var suppliers = ndx.dimension(function (d) {
        return d["supplier"];
    });

    var statsBySuppliers = suppliers.group().reduce(
        function (p, v) {
            p.spend += +v["total_billrate"];
            p.count++;
            return p;
        },
        function (p, v) {
            p.spend -= +v["total_billrate"];
            if (p.spend < 0.001) p.spend = 0; // do some clean up
            p.count--;
            return p;
        },
        function () {
            return {
                spend: 0,
                count: 0
            }
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
            left: 60
        })
        .dimension(moveWeeks)
        .mouseZoomable(true)
        .rangeChart(volumeChart) //connecting the brush-chart with area chart
        .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 11, 31)]))
        .round(d3.timeWeeks.round)
        .xUnits(d3.timeWeeks)
        .y(d3.scalePow().exponent(0.6).domain([0, 1000, 100000]).range([0, 30]))
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
        .stack(totbillRateGroup, 'Total Bill Rate', function (d) {
            return +d.value;
        })

        // Title can be called by any stack layer.
        .title(function (d) {
            var value = d.value ? d.value : d.value;
            if (isNaN(value)) {
                value = 0;
            }
            return dateFormat(d.key) + '\n' + numberFormat(value);
        });
    
    moveChart.yAxis().tickFormat(d3.format('.2s')).ticks(7);

    //#### Range Chart

    // Since this bar chart is specified as "range chart" for the area chart, its brush extent
    // will always match the zoom of the area chart.
    volumeChart.width(990) /* dc.barChart('#monthly-volume-chart', 'chartGroup'); */
        .height(40)
        .margins({
            top: 0,
            right: 50,
            bottom: 20,
            left: 60
        })
        .dimension(moveWeeks)
        .group(volumeByWeeksGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 11, 31)]))
        .round(d3.timeWeeks.round)
        .alwaysUseRounding(true)
        .xUnits(d3.timeDay)
        .yAxis().ticks(0); 

    //pie chart by Quarter
    quarterChart 
        .width(280)
        .height(180)
        .radius(80)
        .innerRadius(40)
        .dimension(quarter)
        .group(quarterGroup);

    //#### Row Chart
    dayOfWeekChart
        .width(480)
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
            return numberFormat(d.value);
        })
        .elasticX(true);
    
    dayOfWeekChart.xAxis().tickFormat(d3.format('.2s')).ticks(7);

    //donut chart by category
    categoryChart 
        .width(280)
        .height(180)
        .radius(80)
        .innerRadius(40)
        .dimension(category)
        .group(categoryGroup);

    //category bubble chart starts
    var xRange = [-10, d3.max(statsByLocation.all(), function (d) {
            return d.value.spend + d.value.spend * 2;
        })],
        yRange = [-10, d3.max(statsByLocation.all(), function (d) {
            return d.value.count + d.value.spend * 2;
        })];
    
    locationChart
        .width(990)
        .height(320)
        .margins({
            top: 30,
            right: 90,
            bottom: 50,
            left: 50
        })
        .dimension(location)
        .group(statsByLocation)
        .colors(d3.scaleOrdinal(d3.schemeCategory10))
        .keyAccessor(function (p) {
            return p.value.spend;
        })
        .valueAccessor(function (p) {
            return p.value.count;
        })
        .radiusValueAccessor(function (p) {
            return p.value.spend;
        })
        .x(d3.scaleLinear().domain(xRange))
        .r(d3.scaleLinear().domain(yRange))
        .minRadiusWithLabel(15)
        .elasticY(true)
        .yAxisPadding(1000)
        .elasticX(true)
        .xAxisPadding(2000)
        .maxBubbleRelativeSize(0.07)
        .renderHorizontalGridLines(true)
        .renderVerticalGridLines(true)
        .xAxisLabel('Total Billrate (Sum)')
        .yAxisLabel('# of records')
        .renderLabel(true)
        .renderTitle(true)
        .title(function (p) {
            return p.key +
                "\n" +
                "Total Billrate: " + numberFormat(p.value.spend) + "\n" +
                "# of records: " + numberFormat(p.value.count);
        })
        .on('renderlet', function (chart, filter) {
            chart.svg().select(".chart-body").attr("clip-path", null);
        });

    //category bubble chart ends

    //supplier bubble chart starts
    var xRange = [-10, d3.max(statsBySuppliers.all(), function (d) {
            return d.value.spend + d.value.spend * 2;
        })],
        yRange = [-10, d3.max(statsBySuppliers.all(), function (d) {
            return d.value.count + d.value.spend * 2;
        })];
    
    supplierChart
        .width(990)
        .height(320)
        .margins({
            top: 30,
            right: 90,
            bottom: 50,
            left: 50
        })
        .dimension(suppliers)
        .group(statsBySuppliers)
        .colors(d3.scaleOrdinal(d3.schemeCategory10))
        .keyAccessor(function (p) {
            return p.value.spend;
        })
        .valueAccessor(function (p) {
            return p.value.count;
        })
        .radiusValueAccessor(function (p) {
            return p.value.spend;
        })
        .x(d3.scaleLinear().domain(xRange))
        .r(d3.scaleLinear().domain(yRange))
        .minRadiusWithLabel(15)
        .elasticY(true)
        .yAxisPadding(100)
        .elasticX(true)
        .xAxisPadding(200)
        .maxBubbleRelativeSize(0.07)
        .renderHorizontalGridLines(true)
        .renderVerticalGridLines(true)
        .xAxisLabel('Total Billrate (Sum)')
        .yAxisLabel('# of records')
        .renderLabel(true)
        .renderTitle(true)
        .title(function (p) {
            return p.key +
                "\n" +
                "Total Billrate: " + numberFormat(p.value.spend) + "\n" +
                "# of records: " + numberFormat(p.value.count);
        })
        .on('renderlet', function (chart, filter) {
            chart.svg().select(".chart-body").attr("clip-path", null);
        });
    //supplier bubble chart ends

    //render
    dc.renderAll();

});