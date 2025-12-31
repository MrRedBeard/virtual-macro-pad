class clsTailwindChart extends clsTailwindComponent
{
    constructor(options)
    {
        super(options);

        this.options = options;
        this.series = this.options.series || [];
        this.chartType = this.options.chartType || "line";
        this.title = this.options.title || "";
        this.subtitle = this.options.subtitle || "";

        this.xValueType;
        this.yValueType;

        this.normalizedSeries;
        this.allX;
        this.allY;
        this.minX;
        this.maxX;
        this.minY;
        this.maxY;

        this.options.showAxisLabels = typeof this.options.showAxisLabels === 'undefined' ? false : this.options.showAxisLabels;
        this.options.showGrid = typeof this.options.showGrid === 'undefined' ? false : this.options.showGrid;
        this.options.showLegend = typeof this.options.showLegend === 'undefined' ? false : this.options.showLegend;
        this.options.showTooltip = typeof this.options.showTooltip === 'undefined' ? false : this.options.showTooltip;

        this.options.XYPlotLine = typeof this.options.XYPlotLine === 'undefined' ? false : this.options.XYPlotLine;

        this.minX = options.minX;
        this.maxX = options.maxX;
        this.minY = options.minY;
        this.maxY = options.maxY;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext("2d");

        this.tooltip = document.createElement('div');
        this.tooltip.classList.add('tooltip','invisible');
        this.tooltip.setAttribute('role', 'tooltip');
        this.element.appendChild(this.tooltip);

        this.barSegments = [];
        this.pieSegments = [];
        this.functionPoints = [];

        this.element.append(this.canvas);
        this.element.classList.add('chart-container');

        this.handleResize(); // Immediately handle DPI resize on init

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.marginTop = 40;
        this.marginBottom = 40;
        this.marginLeft = 60;
        this.marginRight = 60;
        this.titleHeight = 20;
        this.subtitleHeight = 20;
        // this.drawableWidth = this.width - this.marginLeft - this.marginRight;
        // this.drawableHeight = this.height - this.marginTop - this.marginBottom - this.titleHeight - this.subtitleHeight;
        this.drawableWidth = this.width - this.marginLeft - this.marginRight;
        this.drawableHeight = this.height - this.marginTop - this.marginBottom - this.titleHeight - this.subtitleHeight;

        this.draw();

        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

        //window.addEventListener('resize', () => this.handleResize());

        let resizeTimeout;
        window.addEventListener('resize', () =>
        {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });

    }

    draw()
    {
        if (!this.series || this.series.length === 0)
        {
            console.warn('clsTailwindChart.draw() called with no series data.');
            return;
        }

        this.clearCanvas();

        this.normalizedSeries = this.normalizeSeries();

        if (!this.normalizedSeries || this.normalizedSeries.length === 0)
        {
            console.warn('No data after normalization');
            return;
        }

        this.allX;
        this.allY;
        this.minX;
        this.maxX;
        this.minY;
        this.maxY;

        if (this.chartType !== 'function')
        {
            this.allX = this.normalizedSeries.flatMap(s => s.data.map(d => d.x));
            this.allY = this.normalizedSeries.flatMap(s => s.data.map(d => d.y));

            this.minX = Math.min(...this.allX);
            this.maxX = Math.max(...this.allX);
            this.minY = Math.min(...this.allY);
            this.maxY = Math.max(...this.allY);
        }
        else
        {
            this.minX = this.minX ?? -10;
            this.maxX = this.maxX ?? 10;
            this.minY = this.minY ?? -10;
            this.maxY = this.maxY ?? 10;

            if (!isFinite(this.minX)) this.minX = -10;
            if (!isFinite(this.maxX)) this.maxX = 10;
        }

        switch (this.chartType)
        {
            case "line": 
                this.drawLineChart();
                break;
            case "bar": 
                this.drawBarChart();
                break;
            case 'pie':
                this.drawPieChart();
                break;
            case "dot":
                this.drawDotPlot();
                break;
            case "xy":
                this.drawXYPlot();
                break;
            case "function": 
                this.drawFunctionPlot();
                break;
            default: 
                console.warn(`Unknown chartType: ${this.chartType}. Falling back to line chart.`);
                break;
        }
        
        if (this.chartType !== 'pie' && this.chartType !== 'function')
        {
            if (this.options.showGrid) this.drawGrid();
            if (this.options.showAxisLabels) this.drawAxisLabels();
            if (this.options.showLegend) this.drawLegend();
        }

        this.drawTitle();
        this.drawSubtitle();
    }

    handleResize()
    {
        const cssWidth = this.element.clientWidth;
        const cssHeight = this.element.clientHeight;

        this.adjustCanvasForDPI(this.canvas, this.ctx, cssWidth, cssHeight);

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.drawableWidth = this.width / this.dpr - this.marginLeft - this.marginRight;
        this.drawableHeight = this.height / this.dpr - this.marginTop - this.marginBottom - this.titleHeight - this.subtitleHeight;

        this.draw();
    }

    setDPI(dpr)
    {
        this.dpr = dpr;
        this.handleResize();
    }

    /**
     * Adjust canvas size for high-DPI screens.
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} width - Display width in CSS pixels
     * @param {number} height - Display height in CSS pixels
     */
    adjustCanvasForDPI(canvas, ctx, width, height)
    {
        this.dpr = window.devicePixelRatio || 1;

        canvas.width = width * this.dpr;
        canvas.height = height * this.dpr;

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    clearCanvas()
    {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawTitle()
    {
        if (this.title)
        {
            let size = 16;
            this.ctx.font = `${size}px sans-serif`;
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = 'black';
            this.ctx.fillText(this.title, this.canvas.width / 2, this.marginTop - size * this.dpr);
        }
    }
    
    drawSubtitle()
    {
        if (this.subtitle)
        {
            let size = 12;
            this.ctx.font = `${size}px sans-serif`;
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = 'black';
            this.ctx.fillText(this.subtitle, this.canvas.width / 2, (this.marginTop - size + this.titleHeight) * this.dpr);
        }
    }

    normalizeSeries()
    {
        if (!Array.isArray(this.series)) return [];

        if (this.series?.length > 0 && this.series[0].data?.length > 0)
        {
            const sampleX = this.series[0].data[0].x;
            if (typeof sampleX === 'string' && !isNaN(Date.parse(sampleX)))
            {
                this.xValueType = 'date';
            }
            else if (typeof sampleX === 'string')
            {
                this.xValueType = 'string';
            }
            else if (typeof sampleX === 'number')
            {
                this.xValueType = 'number';
            }
            else if (sampleX instanceof Date)
            {
                this.xValueType = 'date';
            }
            else
            {
                this.xValueType = 'unknown';
            }

            const sampleY = this.series[0].data[0].y;
            if (typeof sampleY === 'string' && !isNaN(Date.parse(sampleY)))
            {
                this.yValueType = 'date';
            }
            else if (typeof sampleY === 'string')
            {
                this.yValueType = 'string';
            }
            else if (typeof sampleY === 'number')
            {
                this.yValueType = 'number';
            }
            else if (sampleY instanceof Date)
            {
                this.yValueType = 'date';
            }
            else
            {
                this.yValueType = 'unknown';
            }
        }

        // Skip normalization for pie charts — keep raw .value/.label
        if (this.chartType === 'pie')
        {
            return this.series;
        }

        if (this.chartType === 'function')
        {
            return this.series;
        }

        const allCategories = new Set();

        // First pass: collect unique string X values
        this.series.forEach(series =>
        {
            series.data.forEach(d =>
            {
                if (typeof d.x === 'string' && isNaN(Date.parse(d.x)))
                {
                    allCategories.add(d.x);
                }
            });
        });

        this.xCategories = Array.from(allCategories);

        // Determine type
        const sample = this.series[0]?.data?.[0];
        if (sample)
        {
            this.xValueType = typeof sample.x === 'string' && !isNaN(Date.parse(sample.x)) ? 'date'
                            : typeof sample.x === 'string' ? 'category'
                            : typeof sample.x;
            this.yValueType = typeof sample.y;
        }

        return this.series.map((series, index) =>
        {
            const data = series.data
                .map(d =>
                {
                    if (!d || d.x == null || d.y == null || isNaN(d.y)) return null;

                    let xVal;
                    if (this.xValueType === 'category')
                    {
                        xVal = this.xCategories.indexOf(d.x);
                    }
                    else if (this.xValueType === 'date')
                    {
                        xVal = new Date(d.x).getTime();
                    }
                    else
                    {
                        xVal = parseFloat(d.x);
                    }

                    return {
                        x: xVal,
                        y: parseFloat(d.y),
                        original: d
                    };
                })
                .filter(Boolean);

            return {
                ...series,
                data
            };
        });
    }

    convertXToNumber(x)
    {
        if (typeof x === "number") return x;
        if (x instanceof Date) return x.getTime();
        const parsed = Date.parse(x);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Draw numeric labels along both axes based on grid step count.
     * @param {number} [xSteps=10]
     * @param {number} [ySteps=10]
     */
    drawAxisLabels(xSteps = 10, ySteps = 10)
    {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.font = `${10 * this.dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // X Axis labels
        if (this.xValueType === 'category')
        {
            this.xCategories.forEach((label, i) =>
            {
                const x = this.marginLeft + (i / (this.xCategories.length - 1)) * this.drawableWidth;
                ctx.fillText(label, x, this.marginTop + this.titleHeight + this.drawableHeight + 5 * this.dpr);
            });
        }
        else
        {
            for (let i = 0; i <= xSteps; i++)
            {
                const x = this.marginLeft + (i * (this.drawableWidth / xSteps));
                const value = this.minX + ((this.maxX - this.minX) * i / xSteps);
                ctx.fillText(this.formatValue(value, true, false), x, this.marginTop + this.titleHeight + this.drawableHeight + 5 * this.dpr);
            }
        }

        // Y Axis labels
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= ySteps; i++)
        {
            const y = this.marginTop + this.titleHeight + (i * (this.drawableHeight / ySteps));
            const value = this.maxY - ((this.maxY - this.minY) * i / ySteps);
            ctx.fillText(this.formatValue(value, false, true), this.marginLeft - 5 * this.dpr, y);
        }

        ctx.restore();
    }

    /**
     * Draw grid lines for X and Y axes.
     * Called automatically or can be called manually.
     * @param {number} [xSteps=10] - Number of vertical grid lines (X-axis)
     * @param {number} [ySteps=10] - Number of horizontal grid lines (Y-axis)
     */
    drawGrid(xSteps = 10, ySteps = 10)
    {
        const ctx = this.ctx;
        const stepX = this.drawableWidth / xSteps;
        const stepY = this.drawableHeight / ySteps;

        ctx.save();
        ctx.strokeStyle = '#e5e7eb'; // Tailwind's gray-200
        ctx.lineWidth = 1 * this.dpi;

        // Vertical lines (X grid)
        for (let i = 0; i <= xSteps; i++)
        {
            const x = this.marginLeft + (i * stepX);
            ctx.beginPath();
            ctx.moveTo(x, this.marginTop + this.titleHeight);
            ctx.lineTo(x, this.marginTop + this.titleHeight + this.drawableHeight);
            ctx.stroke();
        }

        // Horizontal lines (Y grid)
        for (let i = 0; i <= ySteps; i++)
        {
            const y = this.marginTop + this.titleHeight + (i * stepY);
            ctx.beginPath();
            ctx.moveTo(this.marginLeft, y);
            ctx.lineTo(this.width - this.marginRight, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Draws a legend mapping series names to colors.
     */
    drawLegend()
    {
        if (!this.options.showLegend) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.font = `${10 * this.dpr}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const padding = 10 * this.dpr;
        const boxSize = 10 * this.dpr;
        const spacing = 5 * this.dpr;
        const lineHeight = boxSize + spacing;
        const xStart = this.width - this.marginRight + padding;
        let yStart = this.marginTop + this.titleHeight;

        this.normalizedSeries.forEach((series, index) =>
        {
            const color = series.color || this.getColor(index);
            const label = series.label || `Series ${index + 1}`;

            // Color box
            ctx.fillStyle = color;
            ctx.fillRect(xStart, yStart, boxSize, boxSize);

            // Label text
            ctx.fillStyle = 'black';
            ctx.fillText(label, xStart + boxSize + spacing, yStart + boxSize / 2);

            yStart += lineHeight;
        });

        ctx.restore();
    }

    mapX(x)
    {
        return this.marginLeft + ((x - this.minX) / (this.maxX - this.minX)) * this.drawableWidth;
    }

    mapY(y)
    {
        return this.marginTop + this.titleHeight + ((this.maxY - y) / (this.maxY - this.minY)) * this.drawableHeight;
    }

    getTooltipInfoAt(mouseX, mouseY)
    {
        switch (this.chartType)
        {
            case 'bar':
                return this.getBarTooltip(mouseX, mouseY);
            case 'pie':
                return this.getPieTooltip(mouseX, mouseY);
            case 'dot':
                return this.getPointTooltip(mouseX, mouseY);
            case 'xy':
            case 'line':
                return this.getClosestDataPoint(mouseX, mouseY);
            case 'function':
                return this.getFunctionTooltip(mouseX, mouseY);
            default:
                return null;
        }
    }

    getClosestDataPoint(mouseX, mouseY)
    {
        let closest = null;
        let minDist = 10 * this.dpr; // 10px tolerance

        this.normalizedSeries.forEach((series, index) =>
        {
            series.data.forEach(point =>
            {
                const cx = this.mapX(point.x);
                const cy = this.mapY(point.y);
                const dx = cx - mouseX;
                const dy = cy - mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist)
                {
                    minDist = dist;
                    closest = { cx, cy, point, series: { ...series, index } };
                }
            });
        });

        return closest;
    }

    getBarTooltip(x, y)
    {
        const segment = this.barSegments.find(seg =>
        {
            return (
                x >= seg.x &&
                x <= seg.x + seg.width &&
                y >= seg.y &&
                y <= seg.y + seg.height
            );
        });

        if(typeof segment === 'undefined' || typeof segment.x === 'undefined' || typeof segment.y === 'undefined')
        {
            return null;
        }

        const segmentObj = {
            cx: segment.x + segment.width / 2,
            cy: segment.y,
            point: {
                x: segment.dataPoint.original.original.x || segment.label,
                y: segment.value,
                original: { x: segment.dataPoint.original.original.x || segment.label, y: segment.value }
            },
            series: {
                label: segment.seriesLabel || 'Slice',
                color: segment.color,
                index: segment.seriesIndex
            }
        };

        if(typeof segmentObj !== 'undefined')
        {
            return segmentObj;
        }
        else
        {
            return null;
        }
    }

    getPieTooltip(x, y)
    {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const normalizedAngle = (angle + 2 * Math.PI) % (2 * Math.PI);

        const seg = this.pieSegments.find(s =>
        {
            return (
                distance <= s.radius &&
                normalizedAngle >= s.startAngle &&
                normalizedAngle <= s.endAngle
            );
        });

        return seg
            ? {
                cx: x,
                cy: y,
                point: {
                    x: seg.label,
                    y: seg.value,
                    original: { x: seg.label, y: seg.value }
                },
                series: {
                    label: seg.seriesLabel || 'Slice',
                    color: seg.color,
                    index: 0
                }
            }
            : null;
    }

    getPointTooltip(mouseX, mouseY)
    {
        const radius = 6;

        let closest = null;

        this.normalizedSeries.forEach((series, seriesIndex) =>
        {
            series.data.forEach((point, pointIndex) =>
            {
                const cx = this.mapX(point.x);
                const cy = this.mapY(point.y);
                const dx = mouseX - cx;
                const dy = mouseY - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= radius)
                {
                    closest = {
                        cx,
                        cy,
                        point,
                        series: {
                            label: series.label,
                            color: series.color,
                            index: seriesIndex
                        }
                    };
                }
            });
        });

        return closest;
    }

    getFunctionTooltip(mouseX, mouseY)
    {
        for (const series of this.series)
        {
            if (!series.fn) { continue; }

            const logicalX = this.unmapX(mouseX);
            let y;

            try
            {
                y = series.fn(logicalX);
            }
            catch (_) { continue; }

            const py = this.mapY(y);
            const dy = Math.abs(mouseY - py);

            if (dy < 8)
            {
                return {
                    label: series.label,
                    x: logicalX,
                    y
                };
            }
        }

        return null;
    }

    drawHoverPoint(cx, cy)
    {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 4 * this.dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.restore();
    }

    getColor(index)
    {
        const palette = ["red", "blue", "green", "orange", "purple", "brown", "cyan"];
        return palette[index % palette.length];
    }

    /**
     * Attempts to auto-format a value for display.
     * Handles numbers, booleans, dates, strings, and nulls.
     *
     * @param {*} val - The value to format
     * @returns {string} - Formatted string
     */
    formatValue(val, xValue = false, yValue = false)
    {
        if (val === null || val === undefined) return '';

        if (this.options.axisLabelFormatter)
        {
            return this.options.axisLabelFormatter(val);
        }

        if(xValue)
        {
            // If it's already a Date or a string that looks like a timestamp
            if (this.xValueType === 'date')
            {
                try
                {
                    const date = typeof val === 'number'
                        ? new Date(val)
                        : new Date(Date.parse(val));

                    return date.toISOString().split('T')[0]; // format as YYYY-MM-DD
                }
                catch (e)
                {
                    return String(val);
                }
            }

            // If it's a string that shouldn't be parsed as a date
            if (this.xValueType === 'string')
            {
                return val;
            }
        }
        if(yValue)
        {
            // If it's already a Date or a string that looks like a timestamp
            if (this.yValueType === 'date')
            {
                try
                {
                    const date = typeof val === 'number'
                        ? new Date(val)
                        : new Date(Date.parse(val));

                    return date.toISOString().split('T')[0]; // format as YYYY-MM-DD
                }
                catch (e)
                {
                    return String(val);
                }
            }

            // If it's a string that shouldn't be parsed as a date
            if (this.yValueType === 'string')
            {
                return val;
            }
        }

        // Date object or ISO string or timestamp
        if (val instanceof Date)
        {
            return val.toLocaleString();
        }
        if (typeof val === 'string')
        {
            // ISO date or time string
            const isoDate = Date.parse(val);
            if (!isNaN(isoDate) && val.match(/\d{4}-\d{2}-\d{2}/))
            {
                return new Date(isoDate).toLocaleString();
            }
            return val; // just a regular string
        }

        if (typeof val === 'number')
        {
            // Check if it's essentially an integer
            const isInt = Number.isInteger(val);
            return isInt ? val.toString() : val.toFixed(2);
        }

        if (typeof val === 'boolean')
        {
            return val ? '✓' : '✗';
        }

        return String(val); // catch-all fallback
    }


    drawLineChart()
    {
        let dots = [];
        this.normalizedSeries.forEach((series, index) =>
        {
            const color = series.color || this.getColor(index);
            this.ctx.strokeStyle = color;
            this.ctx.beginPath();
            series.data.forEach((point, i) =>
            {
                const x = this.mapX(point.x);
                const y = this.mapY(point.y);
                if (i === 0)
                {
                    this.ctx.moveTo(x, y);
                }
                else
                {
                    this.ctx.lineTo(x, y);

                    dots.push({x: x, y: y});
                }
            });
            this.ctx.stroke();
        });

        dots.forEach((dot) =>
        {
            const radius = 5 * this.dpr;
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawBarChart()
    {
        this.barSegments = [];

        const ctx = this.ctx;
        const seriesCount = this.normalizedSeries.length;

        // Get all unique X values from normalized data
        const xValues = [...new Set(this.normalizedSeries.flatMap(s => s.data.map(d => d.x)))].sort((a, b) => a - b);
        const barGroupCount = xValues.length;

        const groupWidth = this.drawableWidth / barGroupCount;
        const barWidth = groupWidth / seriesCount * 0.8; // leave padding between groups
        const barPadding = groupWidth * 0.1;

        this.normalizedSeries.forEach((series, seriesIndex) =>
        {
            const color = series.color || this.getColor(seriesIndex);
            ctx.fillStyle = color;

            series.data.forEach(point =>
            {
                const groupIndex = xValues.indexOf(point.x);
                if (groupIndex === -1) return;

                const xBase = this.marginLeft + (groupIndex * groupWidth);
                const x = xBase + barPadding + (seriesIndex * barWidth);

                const y = this.mapY(point.y);
                const baseY = this.mapY(this.minY);
                const barHeight = baseY - y;

                this.barSegments.push({
                    x,
                    y,
                    width: barWidth,
                    height: barHeight,
                    value: point.y,
                    label: point.x,
                    color: color,
                    seriesLabel: series.label,
                    seriesIndex: seriesIndex,
                    dataPoint: {
                        x: point.x,
                        y: point.y,
                        original: point
                    }
                });

                ctx.fillRect(x, y, barWidth, barHeight);
            });
        });
    }

    drawPieChart()
    {
        this.pieSegments = [];

        const ctx = this.ctx;
        const series = this.normalizedSeries?.[0];
        if (!series || !Array.isArray(series.data)) return;

        if (!series.data?.[0]?.value)
        {
            console.warn('Pie chart expects { label, value } in series.data');
        }

        this.centerX = this.marginLeft + this.drawableWidth / 2;
        this.centerY = this.marginTop + this.titleHeight + this.drawableHeight / 2;
        const radius = Math.min(this.drawableWidth, this.drawableHeight) / 2 * 0.9;

        const total = series.data.reduce((sum, slice) => sum + (slice.value ?? 0), 0);
        let startAngle = 0;

        const seriesLabel = series.label || '';
        series.data.forEach((slice, index) =>
        {
            const value = slice.value ?? 0;
            const sliceAngle = (value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            const percent = ((value / total) * 100).toFixed(1) + '%';

            const color = slice.color || series.color || this.getColor(index);

            this.pieSegments.push({
                startAngle,
                endAngle,
                radius,
                label: slice.label,
                value: slice.value,
                color: slice.color || series.color,
                seriesLabel
            });

            // Draw slice
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.arc(this.centerX, this.centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            // Draw label
            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = this.centerX + Math.cos(labelAngle) * radius * 0.65;
            const labelY = this.centerY + Math.sin(labelAngle) * radius * 0.65;

            ctx.fillStyle = 'black';
            ctx.font = `${10 * this.dpr}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText(`${slice.label} ${percent}`, labelX, labelY);

            startAngle = endAngle;
        });
    }

    drawDotPlot()
    {
        const ctx = this.ctx;
        const radius = 7 * this.dpr;

        this.normalizedSeries.forEach((series, index) =>
        {
            const color = series.color || this.getColor(index);
            ctx.fillStyle = color;

            series.data.forEach(point =>
            {
                const x = this.mapX(point.x);
                const y = this.mapY(point.y);

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
    }

    drawXYPlot()
    {
        const ctx = this.ctx;
        const radius = 5 * this.dpr;

        this.normalizedSeries.forEach((series, index) =>
        {
            const color = series.color || this.getColor(index);
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            // Optional: draw connecting lines
            ctx.beginPath();
            if(this.options.XYPlotLine)
            {
                series.data.forEach((point, i) =>
                {
                    const x = this.mapX(point.x);
                    const y = this.mapY(point.y);

                    if (i === 0)
                    {
                        ctx.moveTo(x, y);
                    }
                    else
                    {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();
            }

            // Draw individual points
            series.data.forEach(point =>
            {
                const x = this.mapX(point.x);
                const y = this.mapY(point.y);

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    drawFunctionPlot()
    {
        this.functionPoints = [];

        const ctx = this.ctx;
        const steps = 300; // // More steps = smoother line, slower render
        const range = this.maxX - this.minX || 1;
        const stepSize = range / steps;

        this.minX = this.minX ?? -10;
        this.maxX = this.maxX ?? 10;
        this.minY = this.minY ?? -10;
        this.maxY = this.maxY ?? 10;

        const getDifference = (num1, num2) =>
        {
            return Math.abs(num1 - num2);
        }
        const diff = getDifference(this.minX, this.maxX);

        if(this.options.showGrid)
        {
            this.drawGrid(diff, diff);
        }

        this.series.forEach((series, index) =>
        {
            const equation = series.equation || '';
            const match = equation.match(/f\(x\)\s*=\s*(.+)/);

            if (!match)
            {
                console.warn(`Invalid equation format in series: ${series.label}`);
                return;
            }

            let expr = match[1];

            let fn;
            try
            {
                fn = new Function('x', `"use strict"; return ${expr};`);
            }
            catch (e)
            {
                console.warn(`Failed to compile equation: ${equation}`, e);
                return;
            }

            this.ctx.save();

            this.ctx.beginPath();
            this.ctx.rect(
                this.marginLeft,
                this.marginTop,
                this.drawableWidth,
                this.drawableHeight
            );
            this.ctx.clip();

            ctx.strokeStyle = series.color || this.getColor(index);
            ctx.beginPath();

            let first = true;
            for (let i = 0; i <= steps; i++)
            {
                const x = this.minX + i * stepSize;
                let y;
                try
                {
                    y = fn(x);
                }
                catch (e)
                {
                    y = NaN;
                }

                if (isNaN(y) || !isFinite(y)) continue;

                const cx = this.mapX(x);
                const cy = this.mapY(y);

                if (first)
                {
                    ctx.moveTo(cx, cy);
                    first = false;
                }
                else
                {
                    ctx.lineTo(cx, cy);
                }
            }

            ctx.stroke();

            this.ctx.restore();
        });

        //this.drawAxisLabels(diff, diff);
        this.drawAxisLabels()
    }

    handleMouseMove(event)
    {
        if(!this.options.showTooltip)
        {
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * this.dpr;
        const y = (event.clientY - rect.top) * this.dpr;

        //const hit = this.getClosestDataPoint(x, y);
        const hit = this.getTooltipInfoAt(x, y);

        //console.log(hit)

        this.tooltip.classList.remove('invisible');
        this.tooltip.classList.add('visible');
        this.tooltip.style.left = `${(x / this.dpr) + 10}px`;
        this.tooltip.style.top = `${(y / this.dpr) + 10}px`;

        if (hit?.series && hit?.point)
        {
            const { cx, cy, point, series } = hit;

            this.tooltip.innerHTML = `
                <b>${series.label || `Series ${series.index + 1}`}</b><br>
                x: ${point.original?.x ?? point.x}<br>
                y: ${point.original?.y ?? point.y}
            `;
        }
        else
        {
            this.tooltip.innerHTML = `x: ${x}<br>y: ${y}`;
        }

        // Redraw with hover point
        this.draw();
        this.drawHoverPoint(x, y);
    }

    handleMouseLeave()
    {
        this.tooltip.classList.remove('visible');
        this.tooltip.classList.add('invisible');

        this.draw();
    }

}