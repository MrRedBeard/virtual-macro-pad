/**
 * clsTailwindFishbone.js
 * 
 * Fishbone diagram component for Tailwind using Leaflet via leaflet_bundle.iife.js and extending clsTailwindComponent.
 * 
 */
class clsTailwindFishbone extends clsTailwindComponent
{
    constructor(options = {})
    {
        super(options);

        this.options = options;

        this.options = options;
        this.boxes = [];

        this.map;
        this.lineLayer;

        this.init();
    }

    init()
    {
        this.element.classList.add('fishbone');

        this.map = L.map(this.element, {
        zoom: 13,
        minZoom: -5,
        maxZoom: 5,
        contextmenu: true,
        contextmenuItems: [
                {
                    text: 'Add Box Here',
                    callback: (e) =>
                    {
                        this.addBox({
                            latlng: e.latlng,
                            title: 'New Box',
                            body: 'Description...'
                        });
                    }
                },
                '-',
                {
                    text: 'Zoom In',
                    callback: () => this.map.zoomIn()
                },
                {
                    text: 'Zoom Out',
                    callback: () => this.map.zoomOut()
                }
            ]
        });

        this.lineLayer = L.layerGroup().addTo(this.map);

        this.map.on('zoomend moveend', () =>
        {
            this._updateAllPositionsAndRedraw();
        });


        const bounds = [[0, 0], [1000, 1000]]; // y,x (rows, cols)
        this.map.fitBounds(bounds);
    }

    _updateAllPositionsAndRedraw()
    {
        Object.keys(this.boxes).forEach(id =>
        {
            this._positionBox(id);
        });

        this._redrawLines();
    }

    /**
     * Add a draggable box with title/body and optional id
     */
    addBox({ id, latlng, title, body, parentId = null })
    {
        id = id || this.uniqueID('fishbone');

        const boxEl = L.DomUtil.create('div', 'fb-box absolute select-none');
        boxEl.dataset.id = id;
        boxEl.innerHTML = `
            <div class="p-2 bg-white border border-gray-400 rounded shadow max-w-xs text-xs leading-tight">
                <strong class="block">${title}</strong>
                <small>${body}</small>
            </div>
        `;
        this.element.appendChild(boxEl);

        const overlay = L.latLng(latlng);

        // Add box data
        this.boxes[id] = {
            id,
            latlng,
            title,
            body,
            element: boxEl,
            overlay,
            connections: []
        };

        // Connect to parent if specified
        if (parentId && this.boxes[parentId])
        {
            this.boxes[parentId].connections.push(id);
        }

        this._positionBox(id);
        this._makeDraggable(boxEl, id);
        this._redrawLines();

        return id;
    }


    _positionBox(id)
    {
        const box = this.boxes[id];
        if (!box || !box.element) return;

        const pos = this.map.latLngToLayerPoint(box.latlng);
        box.element.style.left = `${pos.x}px`;
        box.element.style.top = `${pos.y}px`;
    }

    _makeDraggable(el, id)
    {
        let isDragging = false;
        let start = null;

        el.addEventListener('mousedown', (e) =>
        {
            isDragging = true;
            start = { x: e.clientX, y: e.clientY };
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) =>
        {
            if (!isDragging) return;

            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            start = { x: e.clientX, y: e.clientY };

            const box = this.boxes[id];
            const point = this.map.latLngToLayerPoint(box.latlng);
            const newPoint = L.point(point.x + dx, point.y + dy);
            const newLatLng = this.map.layerPointToLatLng(newPoint);
            box.latlng = newLatLng;
            this._positionBox(id);
        });

        document.addEventListener('mouseup', () =>
        {
            if (isDragging)
            {
                isDragging = false;
                document.body.style.userSelect = '';
                this._redrawLines();
            }
        });
    }

    _redrawLines()
    {
        this.lineLayer.clearLayers();

        Object.values(this.boxes).forEach(from =>
        {
            const fromCenter = this.map.latLngToLayerPoint(from.latlng);
            const fromSize = from.element.getBoundingClientRect();

            from.connections.forEach(toId =>
            {
                const to = this.boxes[toId];
                if (!to) return;

                const toCenter = this.map.latLngToLayerPoint(to.latlng);
                const toSize = to.element.getBoundingClientRect();

                // Figure out direction
                const fromEdge = this._getNearestEdgePoint(fromCenter, fromSize, toCenter);
                const toEdge = this._getNearestEdgePoint(toCenter, toSize, fromCenter);

                const latlngFrom = this.map.layerPointToLatLng(fromEdge);
                const latlngTo = this.map.layerPointToLatLng(toEdge);

                const line = L.polyline([latlngFrom, latlngTo], {
                    color: 'black',
                    weight: 2,
                    interactive: false, // 👈 disables mouse events entirely
                    pane: 'overlayPane' // ⬅️ defaults to this, but explicit is nice
                });

                this.lineLayer.addLayer(line);
            });
        });
    }


    connectBoxes(fromId, toId)
    {
        if (!this.boxes[fromId] || !this.boxes[toId]) return;
        if (!this.boxes[fromId].connections.includes(toId))
        {
            this.boxes[fromId].connections.push(toId);
            this._redrawLines();
        }
    }

    _getNearestEdgePoint(center, size, fromPoint)
    {
        const halfW = size.width / 2;
        const halfH = size.height / 2;

        const dx = fromPoint.x - center.x;
        const dy = fromPoint.y - center.y;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy)
        {
            // Connect to left or right edge
            return L.point(
                center.x + (dx > 0 ? halfW : -halfW),
                center.y
            );
        }
        else
        {
            // Connect to top or bottom edge
            return L.point(
                center.x,
                center.y + (dy > 0 ? halfH : -halfH)
            );
        }
    }


    /**
     * Remove a box and its lines
     */
    removeBox(id)
    {
        const box = this.boxes[id];
        if (!box) return;

        // Remove DOM
        if (box.element && box.element.parentNode)
        {
            box.element.parentNode.removeChild(box.element);
        }

        // Remove all connections to/from
        Object.values(this.boxes).forEach(other =>
        {
            other.connections = other.connections.filter(cid => cid !== id);
        });

        delete this.boxes[id];
        this._redrawLines();
    }


    /**
     * Export fishbone data to JSON
     */
    export()
    {
        return JSON.stringify(Object.values(this.boxes).map(box =>
        {
            return {
                id: box.id,
                latlng: box.latlng,
                title: box.title,
                body: box.body,
                connections: box.connections
            };
        }), null, 2);
    }

    /**
     * Import from fishbone data JSON
     */
    import(json)
    {
        try
        {
            const data = typeof json === 'string' ? JSON.parse(json) : json;
            this.clear();
            data.forEach(box =>
            {
                this.addBox({
                    id: box.id,
                    latlng: box.latlng,
                    title: box.title,
                    body: box.body
                });
            });
            // Now reassign connections
            data.forEach(box =>
            {
                if (box.connections)
                {
                    this.boxes[box.id].connections = box.connections;
                }
            });
            this._redrawLines();
        }
        catch (e)
        {
            console.error('Invalid fishbone JSON', e);
        }
    }


    /**
     * Clear all boxes and lines
     */
    clear()
    {
        Object.keys(this.boxes).forEach(id => this.removeBox(id));
    }
}