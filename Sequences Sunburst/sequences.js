var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75,
  h: 30,
  s: 3,
  t: 10
};

// Mapping of step names to colors.
var colors = {
    'Professional': "#f7b6d1", 
    'Skilled Labor': "#16becf", 
    'Light Industrial': "#c5b0d5" ,
    'Clerical\\/Administrative': "#c77fff",
    "Aerotek": "#7e7e7e",
    "Bolder Healthcare": "#e377c2",
    "Sinai Hospital": "#1e77b4",
    'Levindale Hebrew Geriatric Center and Hospital': "#dbdb8d",
    'Carroll Hospital\r\n': "#ffbb78", 
    'Northwest Hospital': "#9466bd",
    "Priority One Staffing Services": "#aec7e8",
    "Robert Half": "#c49c94",
    "Roth Staffing": "#bcbd23",
    "Symphony Placements": "#ff7f0e",
    "Kforce": "#ff9896", 
    "Active": "#98df8a",    
    "Terminated": "#d62728"
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0;
var chartDiv = document.getElementById("chart");
var radius = Math.min(width, height) / 2;
var vis = d3.select("#chart").append("svg:svg")
  .attr("width", width)
  .attr("height", height)
  .attr("preserveAspectRatio", "xMinYMin slice")
  .attr("viewBox", "0 0 750 600")
  //class to make it responsive
  .classed("svg-content-responsive", true)
  .append("svg:g")
  .attr("id", "container")
  .attr("class", "svg-container")
  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.partition()
    .size([2 * Math.PI, radius * radius]);


var arc = d3.arc()
    .startAngle(function(d) { return d.x0; })
    .endAngle(function(d) { return d.x1; })
    .innerRadius(function(d) { return Math.sqrt(d.y0); })
    .outerRadius(function(d) { return Math.sqrt(d.y1); });

//Data in json form here
var json = {
  "name": "root",
  "children": [
    {
      "name": "Clerical\\/Administrative",
      "children": [
        {
          "name": "Northwest Hospital",
          "children": [
            {
              "name": "Bolder Healthcare",
              "children": [
                {
                  "name": "Active",
                  "size": 4
                }
              ]
            }
          ]
        },
        {
          "name": "Sinai Hospital",
          "children": [
            {
              "name": "Kforce",
              "children": [
                {
                  "name": "Active",
                  "size": 11
                },
                {
                  "name": "Terminated",
                  "size": 6
                }
              ]
            },
            {
              "name": "Robert Half",
              "children": [
                {
                  "name": "Active",
                  "size": 12
                },
                {
                  "name": "Terminated",
                  "size": 10
                }
              ]
            },
            {
              "name": "Roth Staffing",
              "children": [
                {
                  "name": "Active",
                  "size": 3
                }
              ]
            },
            {
              "name": "Symphony Placements",
              "children": [
                {
                  "name": "Active",
                  "size": 5
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Light Industrial",
      "children": [
        {
          "name": "Sinai Hospital",
          "children": [
            {
              "name": "Priority One Staffing Services",
              "children": [
                {
                  "name": "Terminated",
                  "size": 26
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Professional",
      "children": [
        {
          "name": "Carroll Hospital\\r\\n",
          "children": [
            {
              "name": "Aerotek",
              "children": [
                {
                  "name": "Terminated",
                  "size": 1
                }
              ]
            }
          ]
        },
        {
          "name": "Sinai Hospital",
          "children": [
            {
              "name": "Aerotek",
              "children": [
                {
                  "name": "Terminated",
                  "size": 7
                }
              ]
            },
            {
              "name": "Robert Half",
              "children": [
                {
                  "name": "Terminated",
                  "size": 4
                }
              ]
            },
            {
              "name": "Roth Staffing",
              "children": [
                {
                  "name": "Active",
                  "size": 3
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "name": "Skilled Labor",
      "children": [
        {
          "name": "Levindale Hebrew Geriatric Center and Hospital",
          "children": [
            {
              "name": "Aerotek",
              "children": [
                {
                  "name": "Terminated",
                  "size": 4
                }
              ]
            }
          ]
        },
        {
          "name": "Sinai Hospital",
          "children": [
            {
              "name": "Aerotek",
              "children": [
                {
                  "name": "Terminated",
                  "size": 4
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};
createVisualization(json);
// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
    .attr("r", radius)
    .style("opacity", 0);

// Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.size; })
      .sort(function(a, b) { return b.value - a.value; });
    
  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
      .filter(function(d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
    .data(nodes)
    .enter().append("svg:path")
    .attr("display", function(d) {
      return d.depth ? null : "none";
    })
    .attr("d", arc)
    .attr("fill-rule", "evenodd")
    .style("fill", function(d) { return colors[d.data.name];})
    .style("opacity", 1)
    .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.node().__data__.value;
};

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
    .text(percentageString);

  d3.select("#explanation")
    .style("visibility", "");
    
var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  updateBreadcrumbs(sequenceArray, percentageString);
    
var breadcrumbs = d3.select('#sequence').selectAll('.breadcrumb-custom')
    .data(sequenceArray);
  breadcrumbs.exit().remove();
  
    breadcrumbs.attr('class', 'breadcrumb-custom')
        breadcrumbs.enter()
            .append('li')
            .attr('class', 'breadcrumb-custom')
            .append('a')
           .style("background", function(d) { return colors[d.data.name]; })
            .style('border-left-color', function(d) { return colors[d.data.name]; })
            .html(function(d) { return d.data.name });


  // Fade all the segments.
  d3.selectAll("path")
    .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
    .filter(function(node) {
      return (sequenceArray.indexOf(node) >= 0);
    })
    .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
    .style("visibility", "hidden");
  var breadcrumbs = d3.select('#sequence').selectAll('.breadcrumb-custom')
    .data([]);
  breadcrumbs.exit().remove();
  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
    .transition()
    .duration(1000)
    .style("opacity", 1)
    .on("end", function() {
      d3.select(this).on("mouseover", mouseover);
    });

  d3.select("#explanation")
    .style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
/*
   var trail = d3.select("#sequence").append("svg:svg")
  .attr("width", width)
  .attr("height", 40)
  .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
  .attr("id", "endlabel")
  .style("fill", "#000");
*/
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var g = d3.select("#trail")
    .selectAll("g")
    .data(nodeArray, function(d) {
      return d.name + d.depth;
    });

  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
    .attr("points", breadcrumbPoints)
    .style("fill", function(d) {
      return color((d.children ? d : d.parent).name);
    })
  //  .style("fill", function(d) { return colors[d.name]; });

  entering.append("svg:text")
    .attr("x", (b.w + b.t) / 2)
    .attr("y", b.h / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text(function(d) {
      return d.data.name;
    });

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
    .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
    .attr("y", b.h / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
    .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 275,
    h: 30,
    s: 3,
    r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
    .attr("width", li.w)
    .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
    .data(d3.entries(colors))
    .enter().append("svg:g")
    .attr("transform", function(d, i) {
      return "translate(0," + i * (li.h + li.s) + ")";
    });

  g.append("svg:rect")
    .attr("rx", li.r)
    .attr("ry", li.r)
    .attr("width", li.w)
    .attr("height", li.h)
    .style("fill", function(d) {
      return d.value;
    });

  g.append("svg:text")
    .attr("x", li.w / 2)
    .attr("y", li.h / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .text(function(d) {
      return d.key;
    });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

