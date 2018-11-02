var moveChart = dc.lineChart('#monthly-move-chart');
var volumeChart = dc.barChart('#monthly-volume-chart');

d3.json('spend.json').then(function (spend) {
    
    console.log(spend);
    
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

    // Dimension by month
    var moveMonths = ndx.dimension(function (d) {
        return d.dd;
    });
    // Group by total movement within month
    var monthlyMoveGroup = moveMonths.group().reduceSum(function (d) {
        return Math.abs(d.regular_billrate);
    });
    // Group by total volume within move, and scale down result
    var volumeByMonthGroup = moveMonths.group().reduceCount(function (d) {
        return d.dd;
    });
    var indexAvgByMonthGroup = moveMonths.group().reduceSum(function(d) {
       return Math.abs(d.total_billrate); 
    });
    
      //#### Stacked Area Chart

    moveChart /* dc.lineChart('#monthly-move-chart', 'chartGroup') */
        .renderArea(true)
        .width(990)
        .height(200)
        .transitionDuration(1000)
        .margins({top: 30, right: 50, bottom: 25, left: 40})
        .dimension(moveMonths)
        .mouseZoomable(true)
        .rangeChart(volumeChart)//connecting the brush-chart with area chart
        .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 07, 31)]))
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
        .group(indexAvgByMonthGroup, 'OT Spend')
        .valueAccessor(function (d) {
            return d.value.avg;
        })
        // Stack additional layers with `.stack`. The first paramenter is a new group.
        // The second parameter is the series name. The third is a value accessor.
        .stack(monthlyMoveGroup, 'RT Spend', function (d) {
            return d.value;
        })
        // Title can be called by any stack layer.
        .title(function (d) {
            var value = d.value.avg ? d.value.avg : d.value;
            if (isNaN(value)) {
                value = 0;
            }
            return dateFormat(d.key) + '\n' + numberFormat(value);
        });

    //#### Range Chart

    // Since this bar chart is specified as "range chart" for the area chart, its brush extent
    // will always match the zoom of the area chart.
    volumeChart.width(990) /* dc.barChart('#monthly-volume-chart', 'chartGroup'); */
        .height(40)
        .margins({top: 0, right: 50, bottom: 20, left: 40})
        .dimension(moveMonths)
        .group(volumeByMonthGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.scaleTime().domain([new Date(2018, 1, 1), new Date(2018, 07, 31)]))
        .round(d3.timeDay.round)
        .alwaysUseRounding(true)
        .xUnits(d3.timeDay);


    //render
    dc.renderAll();
    
});
