// Chart dimensions.
var margin = {top: 52.5, right: 19.5, bottom: 19.5, left: 39.5},
    width = window.innerWidth - margin.left - margin.right,
    height = window.innerHeight - margin.top - margin.bottom,
    animating = false;

// Various scales. These domains make assumptions of data, naturally.
var xScale0 = d3.scale.linear().domain([-20, 20]).range([0, width]),
    xScale = xScale0.copy(),
    yScale0 = d3.scale.linear().domain([-20, 20]).range([height, 0]),
    yScale = yScale0.copy(),
    colorScale = d3.scale.category10();

// The x & y axes.
var xAxis = d3.svg.axis().orient('bottom').scale(xScale).ticks(12, d3.format(',d')),
    yAxis = d3.svg.axis().orient('left').scale(yScale).ticks(12, d3.format(',d'));

// Create the SVG container and set the origin.
var svg = d3.select('#chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

// Add the x-axis.
var xAxisElement = svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(xAxis);

// Add the y-axis.
var yAxisElement = svg.append('g')
    .attr('class', 'y axis')
    .call(yAxis);

// Add an x-axis label.
svg.append('text')
    .attr('class', 'x label')
    .attr('text-anchor', 'end')
    .attr('x', width)
    .attr('y', height - 6);

// Add a y-axis label.
svg.append('text')
    .attr('class', 'y label')
    .attr('text-anchor', 'end')
    .attr('y', 6)
    .attr('dy', '.75em')
    .attr('transform', 'rotate(-90)');

// Add the iteration label; the value is set on transition.
var label = svg.append('text')
    .attr('class', 'iteration label')
    .attr('text-anchor', 'end')
    .attr('y', height - 24)
    .attr('x', width)
    .text('000');


// Add PIXI Renderer second so mousedown works
var renderer = new PIXI.autoDetectRenderer(
    width + margin.left + margin.right,
    height + margin.top + margin.bottom,
    {'transparent': true}
);
document.getElementById("chart").appendChild(renderer.view);

// add spinner for loading
var spinner = new Spinner().spin(document.body);
var spinnerText = document.createElement('p');
spinnerText.innerText = "Loading t-SNE data...";
spinner.el.appendChild(spinnerText);
// Load the data.
d3.json('mnist.json?nocache=' + (new Date()).getTime(), function (tsneData) {
    var iterations = tsneData.iterations,
        maxIteration = iterations.max(),
        results = tsneData.data,
        animationDuration = 100;

    d3.csv("companies.csv", function (data) {
        spinnerText.innerText = "Unzipping image data...";
        var digits = [];
        for (var i = 0; i < 3100; i++) {
            var digit = drawSprite(data[i].Symbol);
            // center the sprite's anchor point
            digit.anchor.x = 0.5;
            digit.anchor.y = 0.5;

            // scale digit down to see more digits at a time
            digit.scale.x = 0.5;
            digit.scale.y = 0.5;

            // make digit interactive
            digit.interactive = true;
            digit.defaultTint = 0xFFFFFF;
            digit.on('mouseover',
                function (data) {
                    this.bringToFront();
                    this.tint = 0x000000;
                    if (!animating) animate(); //repaint
                });
            digit.on('mouseout',
                function (data) {
                    this.tint = this.defaultTint;
                    if (!animating) animate(); //repaint
                });

            stage.addChild(digit);
            digits.push(digit);
        }

        // Add an overlay for the iteration label.
        var box = label.node().getBBox();

        var overlay = d3.select('body').append('svg')
            .style({'position': 'absolute', 'bottom': margin.bottom + 20 + 'px', 'right': margin.right + 'px'})
            .attr('width', box.width)
            .attr('height', box.height - 20)
            .append('rect')
            .attr('class', 'overlay')
            .attr('width', box.width)
            .attr('height', box.height - 20)
            .on('mouseover', enableInteraction);

        // Add the iteration buttons.
        var buttonDiv = d3.select('body').append('div')
            .attr('class', 'iteration')
            .style({'position': 'absolute', 'top': height + margin.top - 20 + 'px', 'right': margin.right + 'px'});
        var buttonStart = buttonDiv.append('button')
            .attr('type', 'button')
            .text('start')
            .on('click', function () {
                startIteration();
            });
        var buttonStop = buttonDiv.append('button')
            .attr('type', 'button')
            .text('stop')
            .on('click', function () {
                stopIteration();
            });
        var buttonReset = buttonDiv.append('button')
            .attr('type', 'button')
            .text('reset')
            .on('click', function () {
                label.text('000');
                startIteration();
            });
        buttonDiv.append('button')
            .attr('type', 'button')
            .text('reset zoom')
            .on('click', function () {
                zoom.scale(1).translate([0, 0]);
                zoomed();
            });
        buttonDiv.append('button')
            .attr('type', 'button')
            .text('toggle color')
            .on('click', function () {
                var tint = digits[0].defaultTint == 0xFFFFFF ? 0x000000 : 0xFFFFFF;
                digits.forEach(function (digit) {
                    digit.defaultTint = digit.tint = tint;
                });
                if (!animating) renderMapbox();
            });

        // stop spinner
        spinner.stop();

        // Start a transition that interpolates the data based on iteration.
        label.text('001');
        startIteration();

        // After the transition finishes, you can mouseover to change the iteration.
        function enableInteraction() {
            // Cancel the current transition, if any.
            stopIteration();

            var iterationScale = d3.scale.linear()
                .domain([1, maxIteration])
                .range([10, box.width - 10])
                .clamp(true);

            overlay
                .on('mouseover', mouseover)
                .on('mouseout', mouseout)
                .on('mousemove', mousemove)
                .on('touchmove', mousemove);

            function mouseover() {
                label.classed('active', true);
            }

            function mouseout() {
                label.classed('active', false);
            }

            function mousemove() {
                displayIteration(iterationScale.invert(d3.mouse(this)[0]));
            }
        }

        function startIteration() {
            buttonStart.attr('disabled', 'disabled');
            buttonStop.attr('disabled', null);
            buttonReset.attr('disabled', 'disabled');

            animating = true;
            minimap.visible = false;
            renderMapbox();

            var currentIteration = +label.text();
            if (currentIteration == maxIteration) {
                currentIteration = 1;
                label.text('001');
            }

            svg.transition()
                .duration(animationDuration * (maxIteration - currentIteration))
                .ease('linear')
                .tween('iteration', tweenIteration)
                .each('end', enableInteraction);
        }

        function stopIteration() {
            buttonStart.attr('disabled', null);
            buttonStop.attr('disabled', 'disabled');
            buttonReset.attr('disabled', null);

            svg.transition();
            animating = false;
            minimap.visible = true;
            renderMapbox();
        }

        d3.select('body').on('keydown', function () {
            switch (d3.event.keyCode) {
                case 37: // left arrow
                    if (!animating) displayIteration(Math.max(1, +label.text() - 1));
                    break;
                case 39: // right arrow
                    if (!animating) displayIteration(Math.min(maxIteration, +label.text() + 1));
                    break;
                case 32: // space
                    animating ? stopIteration() : startIteration();
                    break;
                case 187: // +
                    zoom.scale(zoom.scale() * 1.1);
                    zoomed();
                    break;
                case 189: // -
                    zoom.scale(zoom.scale() * 0.9);
                    zoomed();
                    break;
                case 87: // w
                    translate(0, height * 0.05);
                    break;
                case 65: // a
                    translate(width * 0.05, 0);
                    break;
                case 83: // s
                    translate(0, -height * 0.05);
                    break;
                case 68: // d
                    translate(-width * 0.05, 0);
                    break;
            }

            function translate(dx, dy) {
                var current = zoom.translate();
                zoom.translate([current[0] + dx, current[1] + dy]);
                zoomed();
            }
        });

        // Tweens the entire chart by first tweening the iteration, and then the data.
        // For the interpolated data, the dots and label are redrawn.
        function tweenIteration() {
            var iteration = d3.interpolateNumber(+label.text(), maxIteration);
            return function (t) {
                displayIteration(iteration(t));
            };
        }

        // Updates the display to show the specified iteration.
        function displayIteration(iteration) {
            var interpolated = interpolateData(iteration, iterations, results).slice(0, 3100);

            //TODO: we can incorporate this inside interpolateDate
            var limits = interpolated.reduce(function (acc, data) {
                return [Math.max(acc[0], Math.abs(data.x)), Math.max(acc[1], Math.abs(data.y))];
            }, [0, 0]);
            updateScale([-limits[0], limits[0]], [-limits[1], limits[1]]);

            interpolated.forEach(function (data, i) {
                // unadjust zoom translate
                digits[i].position.x = xScale0(data.x) + margin.left;
                digits[i].position.y = yScale0(data.y) + margin.top;
            });

            if (animating)
                animate(); // repaint
            else
                renderMapbox(); // disable minimap during transition animation coz it's too slow

            label.text(pad(Math.round(iteration), 3));
        }


        // create stats object
        javascript:(function () {
            var script = document.createElement('script');
            script.onload = function () {
                var stats = new Stats();
                stats.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:10000';
                document.body.appendChild(stats.domElement);
                requestAnimationFrame(function loop() {
                    stats.update();
                    requestAnimationFrame(loop)
                });
            };
            script.src = '//rawgit.com/mrdoob/stats.js/master/build/stats.min.js';
            document.head.appendChild(script);
        })()
    });

    // animate();
});
// TODO: Set hitarea to a polygon
function drawSprite(row) {
    return new PIXI.Text(row, {fontFamily: 'Arial', fontSize: 28, fill: 0xd3d3d3, align: 'center', cacheBitmap: true});
}


// create the root of the scene graph
var container = new PIXI.Container(); // outer container
var view = new PIXI.Container(); // main view container
var stage = new PIXI.Container(); // complete backstage
view.addChild(stage);
container.addChild(view);

// rectangle mask on main view
view.mask = function () {
    var rect = new PIXI.Graphics();
    rect.lineStyle(0);
    rect.beginFill(0xFFFFFF, 1);
    rect.drawRect(margin.left, 0, width, height + margin.top);
    container.addChild(rect);
    return rect;
}();

var zoom = d3.behavior.zoom()
    .x(xScale)
    .y(yScale)
    .scaleExtent([1, 10])
    .on("zoom", zoomed);
d3.select('#chart').call(zoom);

function zoomed() {
    xAxisElement.call(xAxis);
    yAxisElement.call(yAxis);

    var translate = zoom.translate(), scale = zoom.scale();
    view.position.x = translate[0];
    view.position.y = translate[1];
    view.scale.x = scale;
    view.scale.y = scale;

    mapviewbox.position.x = -translate[0] / minimapScale / scale;
    mapviewbox.position.y = -translate[1] / minimapScale / scale;
    mapviewbox.clear();
    mapviewbox.lineStyle(2, 0xFF0000, 0.3);
    mapviewbox.beginFill(0xFFFFFF, 0);
    mapviewbox.drawRect(0, 0, minimapWidth / scale, minimapHeight / scale);

    if (!animating) animate();
}

// resume zoom after domain update
function updateScale(newXd, newYd) {
    var translate = zoom.translate(),
        scale = zoom.scale();
    xScale0.domain(newXd);
    yScale0.domain(newYd);
    // Set the zoom x/y-domain (this resets the domain at zoom scale=1).
    zoom.x(xScale.domain(newXd)).y(yScale.domain(newYd)).translate(translate).scale(scale);
    zoomed();
}

// minimap
var minimapScale = 6, minimapWidth = width / minimapScale, minimapHeight = height / minimapScale;
var minimapRenderer = new PIXI.RenderTexture(renderer, width, height, PIXI.SCALE_MODES.NEAREST);
minimapRenderer.render(stage);
// minimap image itself
var map = function () {
    var map = new PIXI.Sprite(minimapRenderer);
    map.scale.x = minimapWidth / width;
    map.scale.y = minimapHeight / height;
    return map;
}();
// rectangle bounding box for minimap
var mapbox = function () {
    var mapbox = new PIXI.Graphics();
    mapbox.lineStyle(1, 0x000000, 0.3);
    mapbox.beginFill(0xFFFFFF, 1);
    mapbox.drawRect(0, 0, minimapWidth, minimapHeight);

    // FIXME: D3 Zoom interferes with mouse behavior here
    // TODO: Implement draging viewbox on minimap
    mapbox.interactive = true;
    //dragging = false;
    mapbox.on('mousedown', translate);
    mapbox.on('touchstart', translate);
    // mapbox.on('mousemove', function(e) {
    //   if(dragging) translate(e);
    //   e.stopPropagation();
    //   return false;
    // });
    // mapbox.on('mouseup', dragend);
    // mapbox.on('mouseout', dragend);
    // mapbox.on('touchend', dragend);

    function translate(e) {
        var pos = e.data.getLocalPosition(mapbox), scale = zoom.scale();
        //translate minimap location back to global offsets
        zoom.translate([-(pos.x * scale - minimapWidth / 2) * minimapScale, -(pos.y * scale - minimapHeight / 2) * minimapScale]);
        zoomed();
        e.stopPropagation();
        return false;
    };

    return mapbox;
}();
// rectangle bounding box for view within minimap
var mapviewbox = function () {
    var mapviewbox = new PIXI.Graphics();
    mapviewbox.lineStyle(2, 0xFF0000, 0.3);
    mapviewbox.beginFill(0xFFFFFF, 0);
    mapviewbox.drawRect(0, 0, minimapWidth, minimapHeight);
    return mapviewbox;
}();
// minimap container itself
var minimap = function () {
    var minimap = new PIXI.Container();
    minimap.position.x = width - minimapWidth + margin.left;
    minimap.position.y = 5;

    // minimap bouding mask
    var minimapMask = function () {
        var minimapMask = new PIXI.Graphics();
        minimapMask.lineStyle(0);
        minimapMask.beginFill(0xFFFFFF, 1);
        minimapMask.drawRect(0, 0, minimapWidth + 1, minimapHeight + 1);
        minimap.addChild(minimapMask);
        return minimapMask;
    }();
    minimap.mask = minimapMask;

    minimap.addChild(mapbox);
    minimap.addChild(mapviewbox);
    minimap.addChild(map);

    return minimap;
}();
container.addChild(minimap);

function renderMapbox() {
    // render minimap texture
    minimapRenderer.render(stage, undefined, true);

    // render the minimap
    renderer.render(container);
}

function animate() {
    // render root container
    renderer.render(container);

    // request another animation frame..
    // requestAnimationFrame(animate);
}

// PIXI helpers
PIXI.Texture.Draw = function (cb) {
    var canvas = document.createElement('canvas');
    if (typeof cb == 'function') cb(canvas);
    return PIXI.Texture.fromCanvas(canvas);
};

PIXI.Sprite.prototype.bringToFront = function () {
    if (this.parent) {
        var parent = this.parent;
        parent.removeChild(this);
        parent.addChild(this);
    }
};

// Array helpers
Array.prototype.max = function () {
    return Math.max.apply(null, this);
}