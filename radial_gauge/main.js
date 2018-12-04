// this widget was originally built with the assumption that each metric would have pacing data associated with it
// function below allows for this assumption to be lifted
function setConvention(dataObject, metric_settings) {
    var data = dataObject;

    // confirm metric settings align with data structure
    var unpacedMetricsCount = 0,
        pacedMetricsCount = 0, 
        expectedLength;

    Object.keys(metric_settings).forEach((value) => {
        if(!metric_settings[value].pacing)
            unpacedMetricsCount++
        else
            pacedMetricsCount++
    })

    expectedLength = unpacedMetricsCount * 2 + pacedMetricsCount * 3;
	
    if(dataObject.headers.length !== expectedLength) {
        console.warn(`Please make sure metric_settings parameters are consistent with query\n  
					  expected length: ${expectedLength}, actual length: ${dataObject.headers.length}`);
        
    }
	console.log('dataObject headers: ', dataObject.headers);
	console.log('dataObject divisibilty check: ', dataObject.headers.length % 3 !== 0);
    
        Object.keys(metric_settings).forEach((value) => {
          	console.log('forEach loop: ', value)
            if (!metric_settings[value].pacing) {
                metricIndex = (3 * parseInt(value.match(/\d+/g))) - 1;
                data.headers.splice(metricIndex-2, 0, 'Dummy Pacing')
              	console.log('data.rows: ', dataObject.rows)
                data.rows[0].splice(metricIndex - 2, 0, 0)
            }
        })
    
  
    return data;
}

query_json = setConvention(query_json, metric_settings);


// transforms pacing from absolute figures to percentages of metric totals 
function decimalToPercentage(dataObject) {
    data = dataObject;

    for (var index = 0; index < data.rows[0].length; index++) {
        if(index % 3 !== 2)
          	data.rows[0][index] = Math.round(data.rows[0][index] * 100);
    }

    return data;
}
 
query_json = decimalToPercentage(query_json);
console.log('query_json: ', query_json);

// allows user to apply { 'Metric 1' : { settings here }} object-key naming convention
// as opposed to having to set the key to the exact name of the metric: { 'Impressions': { settings here }}
function normaliseSettings(normalisedDataObject, metricSettings) {

    normalisedKeys = {};

    Object.keys(metricSettings).forEach((value) => {
        let numberPattern = /\d+/g;
        let n = value.match(numberPattern);
        let metricIndex = (3 * n) - 1;
        let metricName = normalisedDataObject.headers[metricIndex];

        normalisedKeys[value] = metricName;
    })

    let replacedItems = Object.keys(metricSettings).map((key) => {
        const newKey = normalisedKeys[key] || key;
        return { 
            [newKey] : metricSettings[key]
        };
    });

    const normalisedMetricSettings = replacedItems.reduce((a, b) => Object.assign({}, a, b));

    return normalisedMetricSettings;
}

metric_settings = normaliseSettings(query_json, metric_settings);
console.log('metricSettings: ', metric_settings);

var data = getSeriesData(query_json)
console.log('data object: ', data);


metric_names = query_json.headers.filter((_, i) => i % 3 ==2)
absolute_vals = query_json.rows[0].filter((_, i) => i % 3 == 2)

console.log(`metric names: ${metric_names}`)
console.log(`absolute vals: ${absolute_vals}`)

  
function getSeriesData(query_json) {
    var data = {
        headers: [],
        rows: []
    }

    for (let index = 0; (index < query_json.headers.length); index++) {
      console.log(index)
        if(index % 3 !== 1)
            data.headers.push(query_json.headers[index]);

        if(index % 3 !== 2)
            data.rows.push(query_json.rows[0][index]);
    }
    return data
}


function setPaneBackgrounds(metricNames) {
    const outerRadii = ['112%', '89%', '66%'];
    const innerRadii = ['90%', '67%', '44%'];
    paneBackground = []

    for (let index = 0; index < metricNames.length; index++) {
        paneBackground.push({
            shape: 'arc',
            outerRadius: outerRadii[index],
            innerRadius: innerRadii[index],
            backgroundColor: Highcharts.Color(Highcharts.getOptions().colors[1])
                                                .setOpacity(0.05)
                                                .get(),
            borderWidth: 0
        })
    }
    
    return paneBackground;
}


function setSeriesConfiguration(dataObject) {
    const radii = ['112%', '108%', '89%', '85%', '66%', '62%'];
    const innerRadii = ['90%', '94%', '67%', '71%', '44%', '48%'];
    seriesConfiguration = []
	console.log(dataObject)
    for (let index = 0; index < dataObject.headers.length; index++) {
        var name = dataObject.headers[index],
            color,
            data = [{
                color: color,
                radius: radii[index],
                innerRadius: innerRadii[index],
                y: dataObject.rows[index]
            }],
            tooltip,
            overshoot = 40
        
        var config = {
            name,
            color,
            data,
            overshoot
        }

        if(index % 2 === 0) {
            tooltip = {
                pointFormatter: function() {
                    return null;
                }
            }
            
            color = Highcharts.Color(Highcharts.getOptions().colors[1])
                              .setOpacity(0.1)
                              .get();

            config.tooltip = tooltip;
            config.color = color;
            config.data[0].color = color;

        } else {
            color = metric_settings[name].goal_type === 'none' ? metric_settings[name].color : setPathColor(dataObject.rows[index], metric_settings[name].goal_type, metric_settings[name].goal_limits)
            config.color = color;
            config.data[0].color = color;
        }

        seriesConfiguration.push(config)
    }

    return seriesConfiguration;
}


function setPathColor(percentage, goalType, limitArray) {
    var goal_type = goalType.toLowerCase();

    if(goal_type == 'at least' || goal_type == 'at most') {
        var lowerBound = limitArray[0], 
            midBound = limitArray[1];
      
    } else {
        var lowerRedBound = limitArray[0],
            lowerOrangeBound = limitArray[1],
            exactGreenBound = limitArray[2],
            upperOrangeBound = limitArray[3]
    }
    

    let red = '#eb5858', orange = '#ffbf40', green = '#91C553';

    switch (goal_type) {
        case 'at least':
            if (percentage <= lowerBound)
                return red;
            else if (percentage > lowerBound && percentage <= midBound)
                return orange;
            else if (percentage > midBound)
                return green;
            break;

        case 'at most':
            if (percentage <= lowerBound)
                return green;
            else if (percentage > lowerBound && percentage <= midBound)
                return orange;
            else if (percentage > midBound)
                return red;
            break;

        case 'exactly':
            if (percentage <= lowerRedBound)
                return red;
            else if(percentage > lowerRedBound && percentage <= lowerOrangeBound)
                return orange;
            else if(percentage > lowerOrangeBound && percentage <= exactGreenBound)
                return green;
            else if(percentage > exactGreenBound && percentage <= upperOrangeBound)
                return orange;
            else 
                return red;
            break;

        default:
            break;
    }
}



function onRender() {
  
  	// add padding since rounded takes a bit more space
	if (isRounded)
      metric_titles_margin = metric_titles_margin + 20
  
    // render metric names next to each track
    metric_names.forEach((el, index) => {
        // instantiates property used for displaying actual kpi below percentage in tooltip
        if(!this.series[data.headers.indexOf(metric_names[index])].actualValue) {
            //this.series[data.headers.indexOf(metric_names[index])].actualValue = absolute_vals[index];
            this.series[data.headers.indexOf(metric_names[index])].points[0].actualValue = absolute_vals[index].toLocaleString();
          	
          	// prepend currencySymbol to any spend metrics
          	if(metric_settings[metric_names[index]].isSpend) {
              var actualValue = this.series[data.headers.indexOf(metric_names[index])].points[0].actualValue;
              var stringLength = actualValue.length;
              actualValue = actualValue.padStart(stringLength+1, currencySymbol)
              this.series[data.headers.indexOf(metric_names[index])].points[0].actualValue = actualValue;
            }

        }

        if(!this.series[data.headers.indexOf(metric_names[index])].label) {
            var label = this.renderer.text(el)
            .attr({
                'text-anchor':'end',
                'class':'metricLabels',
              	 zIndex: 9,
            })
            .css({
                fontSize: '14px',
                color: '#666666',
                fontFamily: "Open Sans",
                fontWeight: "600"
            })
            .add(this.series[data.headers.indexOf(metric_names[index])].group);
          
          	this.series[data.headers.indexOf(metric_names[index])].label = label;
          
          	var box = label.getBBox();
          	console.log('box: ', box);
          
          	this.renderer.rect(this.chartWidth / 2 - metric_titles_margin - (box.width-5), 
                               (this.plotHeight / 2 - this.series[data.headers.indexOf(metric_names[index])].points[0].shapeArgs.innerR - 
                               (this.series[data.headers.indexOf(metric_names[index])].points[0].shapeArgs.r - 
                               this.series[data.headers.indexOf(metric_names[index])].points[0].shapeArgs.innerR ) / 3)+ box.height + 12
                               , box.width+10, box.height+10, 5)
                          .attr({
                            fill: 'rgba(255,255,255, 0)',
                            zIndex: 10
                          })
        				  .add();
        }
        this.series[data.headers.indexOf(metric_names[index])].label.translate(
            this.chartWidth / 2 - metric_titles_margin,
            this.plotHeight / 2 - this.series[data.headers.indexOf(metric_names[index])].points[0].shapeArgs.innerR - (this.series[data.headers.indexOf(metric_names[index])].points[0].shapeArgs.r - this.series[data.headers.indexOf(metric_names[index])].points[0].shapeArgs.innerR ) / 3
        );

    })

    console.log('chartWidth: ', this.chartWidth)

}

  
function triggerTooltip() {
    var inner_metric_index = data.headers.length - 1;
    let inner_metric_class = `.highcharts-series.highcharts-series-${inner_metric_index}.highcharts-solidgauge-series.highcharts-tracker`;

    let inner_metric_path = document.querySelector(inner_metric_class).children[0];

    $(inner_metric_path).trigger('mouseover');

}


var height = document.body.clientHeight; 
Highcharts.chart('container', {

    chart: {
		type: 'solidgauge',
        height: height-20,
      	marginTop: 50,
      	marginBottom: 0,
        events: {
        	render: onRender,
            load: function(){
                  // show tooltip on 0th element
                  var last_series_index = this.series.length - 1;
                  var p = this.series[last_series_index].points[0];
              
              	  console.log('this: ', this.series[1].points);
              },
            mouseOut: function(){

              }
        }
    },

    title: {
        text: 'Media Performance',
        style: {
            fontFamily: "Open Sans",
            fontWeight:'300',
            fontSize: '24px'
        }
    },
	
  	credits: {
      enabled: false
    },
    legend: {
          enabled: false,
          labelFormatter: function() {
            return '<span style="font-family:Open Sans;font-weight:600;color:' + this.userOptions.color + '">' + this.name + '</span>';
          },
          symbolWidth: 0
    },

    tooltip: {
        borderWidth: 0,
        backgroundColor: 'none',
        shadow: false,
        style: {
            fontSize: '16px'
        },
        useHTML: true,
        pointFormat: '<div style="width:100%;text-align:center; line-height:26px"><span style="font-family:Open Sans; font-weight: 600;">{series.name}</span><br><span style="font-family:Open Sans; font-size:2em; color: {point.color}; font-weight: 600;">{point.y}%</span><br><span style="font-family:Open Sans; color: grey; font-weight: 400; line-height:26px">{point.actualValue}</span></div>',
        positioner: function (labelWidth) {
            return {
                x: (this.chart.chartWidth - labelWidth) / 2,
                y: (this.chart.plotHeight / 2)
            };
        }
    },

    pane: {
        startAngle: 0,
        endAngle: 270,
        background: setPaneBackgrounds(metric_names)
    },

    yAxis: {
        min: 0,
        max: 100,
        lineWidth: 0,
        tickPositions: [100],
        minorTickLength: 0,
        tickAmount: 0,
        tickColor: Highcharts.Color(Highcharts.getOptions().colors[1])
            .setOpacity(0)
            .get(),
        labels: {
            enabled: showOneHundredPercentLabel,
            x: -75, y: 10,
            style: {
                "color": Highcharts.Color(Highcharts.getOptions().colors[1])
                .setOpacity(0.35)
                .get(),
            },
            formatter: function() {
                return '100%';
              }
        }
    },

    plotOptions: {
        solidgauge: {
            dataLabels: {
                enabled: false
            },
            linecap: 'round',
            stickyTracking: true,
            rounded: isRounded
        }
    },

    series: setSeriesConfiguration(data)
});

triggerTooltip()
  
document.querySelector('body').addEventListener('mouseleave', (event) => {
  triggerTooltip()
})

console.log('script terminates here.')