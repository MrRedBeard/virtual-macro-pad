/**
 * clsTailwindLeafletDiagram
 * Inherits from clsTailwindComponent
 *
 * A reusable Leaflet-based diagram editor supporting shapes, connections, context menus, undo/redo, import/export, and styling.
 */
class clsTailwindLeafletDiagram extends clsTailwindComponent
{
    constructor(options = {})
    {
        super(options);

        this.debug = true;

        this.plugins = [];

        this.map;
        this.mapEl;

        this._eventHandlers = {};

        this.shapes = [];
        this.connectionLayer;
        this.connectionLines = [];
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndo = 100;

        this.defaultStyles = {
            canvas: {
                backgroundColor: '#ffffff'
            },
            grid: {
                color: '#888'
            },
            shape: {
                fillColor: '#f9fafb',
                borderColor: '#000000',
                textColor: '#111827',
                borderWeight: 1,
                fillOpacity: 1.0
            },
            connection: {
                color: '#000000',
                weight: 2,
                dashArray: null
            },
            connectionLabel: {
                textColor: '#000000',
                backgroundColor: '#ffffff',
                fontSize: '12px',
                padding: '2px 4px',
                borderRadius: '4px'
            }
        };

        this.diagramState = {
            zoom: 0,
            center: [0, 0],
            layers: {
                gridVisible: true,
                connectionVisible: true,
                connectionLabelVisible: true
            },
            shapes: []
        };

        this.contextMenuOverrides = {
            canvas: [
                 {
                    text: 'Add Shape',
                    submenu: [
                        { text: 'Square', callback: (e) => 
                            {
                                console.log(e.latlng)
                                this._addShapeAt(e.latlng, 'square')
                            } 
                        },
                        { text: 'Rectangle', callback: (e) => this._addShapeAt(e.latlng, 'rectangle') },
                        { text: 'Circle', callback: (e) => this._addShapeAt(e.latlng, 'circle') },
                        { text: 'Triangle', callback: (e) => this._addShapeAt(e.latlng, 'triangle') },
                        { text: 'Octagon', callback: (e) => this._addShapeAt(e.latlng, 'octagon') }
                    ],
                    iconCls: 'kfi-math-plus'
                },
                {
                    text: 'Enable Free Edit Mode',
                    // callback: () => this.enableFreeEditMode(),
                    // icon: 'icons/edit-free.svg'
                    // text: () => this.shapes.some(s => !s.locked)
                    //     ? 'Disable Free Edit Mode'
                    //     : 'Enable Free Edit Mode',
                    callback: () =>
                    {
                        const anyUnlocked = this.shapes.some(s => !s.locked);
                        if (anyUnlocked)
                        {
                            this.disableFreeEdit();
                        }
                        else
                        {
                            this.enableFreeEdit();
                        }
                    },
                    iconCls: 'kfi-pencil'
                },
                {
                    text: 'Change Background',
                    callback: () => this.changeBackground(),
                    iconCls: 'kfi-image'
                },
                {
                    text: 'Zoom Extents',
                    callback: () => this.zoomToExtents(),
                    iconCls: 'kfi-window-maximize-alt'
                },
                {
                    text: 'Zoom to Fit',
                    callback: () => this.zoomToFit(),
                    iconCls: 'kfi-magnify-zoom-out'
                },
                {
                    text: 'Import Diagram',
                    callback: () => this.importDiagram(),
                    iconCls: 'kfi-cube-upload'
                },
                {
                    text: 'Export Diagram',
                    callback: () => this.exportDiagram(),
                    iconCls: 'kfi-cube-download'
                },
                {
                    text: 'Toggle Grid',
                    callback: () =>
                    {
                        const current = this.diagramState.layers.gridVisible;
                        this.toggleLayerVisibility('grid', !current);
                    },
                    iconCls: 'kfi-grid-alt-1'
                },
                {
                    text: 'Toggle Connections',
                    callback: () =>
                    {
                        const current = this.diagramState.layers.connectionVisible;
                        this.toggleLayerVisibility('connections', !current);
                    },
                    iconCls: 'kfi-plugin'
                },
                {
                    text: 'Toggle Connection Labels',
                    callback: () =>
                    {
                        const current = this.diagramState.layers.connectionLabelVisible;
                        this.toggleLayerVisibility('labels', !current);
                    },
                    iconCls: 'kfi-tags'
                },
                {
                    text: 'Layout Helpers',
                    submenu: [
                        { text: 'Align Left', callback: () => this.alignShapes('left') },
                        { text: 'Align Right', callback: () => this.alignShapes('right') },
                        { text: 'Align Top', callback: () => this.alignShapes('top') },
                        { text: 'Align Bottom', callback: () => this.alignShapes('bottom') },
                        { text: 'Distribute Horizontally', callback: () => this.distributeShapes('horizontal') },
                        { text: 'Distribute Vertically', callback: () => this.distributeShapes('vertical') }
                    ],
                    iconCls: 'kfi-app-generic'
                }
            ],

            shape: [
                {
                    text: 'Edit Text',
                    callback: (e) => this.editShapeText(e.relatedTarget),
                    iconCls: 'kfi-pencil'
                },
                {
                    text: 'Unlock for Drag',
                    callback: (e) => this.unlockShape(e.relatedTarget),
                    iconCls: 'kfi-lock-open'
                },
                {
                    text: 'Change Shape Type',
                    callback: (e) => this.changeShapeType(e.relatedTarget),
                    iconCls: 'kfi-shapes-alt-1'
                },
                {
                    text: 'Change Shape Color',
                    callback: (e) => this.changeShapeColor(e.relatedTarget),
                    iconCls: 'kfi-paint-palette'
                },
                {
                    text: 'Add Connection',
                    callback: (e) => this.startConnectionFrom(e.relatedTarget),
                    iconCls: 'kfi-plugin'
                },
                {
                    text: 'Remove Shape',
                    callback: (e) => this.removeShape(e.relatedTarget),
                    iconCls: 'kfi-trash'
                }
            ],

            connection: [
                {
                    text: 'Add/Edit Label',
                    callback: (e) => this.editConnectionLabel(e.relatedTarget),
                    iconCls: 'kfi-tag'
                },
                {
                    text: 'Change Connection Type',
                    callback: (e) => this.changeConnectionType(e.relatedTarget),
                    iconCls: 'kfi-plugin'
                },
                {
                    text: 'Change Connection Color',
                    callback: (e) => this.changeConnectionColor(e.relatedTarget),
                    iconCls: 'kfi-paint-palette'
                },
                {
                    text: 'Remove Connection',
                    callback: (e) => this.removeConnection(e.relatedTarget),
                    iconCls: 'kfi-trash'
                }
            ],

            connectionLabel: [
                {
                    text: 'Edit Label Text',
                    callback: (e) => this.editConnectionLabel(e.relatedTarget),
                    icoCls: 'kfi-pencil'
                },
                {
                    text: 'Change Label Color',
                    callback: (e) => this.changeLabelColor(e.relatedTarget),
                    iconCls: 'kfi-paint-palette'
                },
                {
                    text: 'Remove Label',
                    callback: (e) => this.removeLabel(e.relatedTarget),
                    iconCls: 'kfi-trash'
                }
            ]
        };

        this.shapeRenderers = {
            square: (latlng, size) =>
            {
                const halfW = size.width / 2;
                const halfH = size.height / 2;
                return [
                    [latlng.lat - halfH, latlng.lng - halfW],
                    [latlng.lat - halfH, latlng.lng + halfW],
                    [latlng.lat + halfH, latlng.lng + halfW],
                    [latlng.lat + halfH, latlng.lng - halfW]
                ];
            },
            rectangle: (latlng, size) =>
            {
                const w = size.width;
                const h = size.height;
                return [
                    [latlng.lat - h / 2, latlng.lng - w / 2],
                    [latlng.lat - h / 2, latlng.lng + w / 2],
                    [latlng.lat + h / 2, latlng.lng + w / 2],
                    [latlng.lat + h / 2, latlng.lng - w / 2]
                ];
            },
            circle: (latlng, size) =>
            {
                const points = 32;
                const radius = Math.min(size.width, size.height) / 2;
                const latlngs = [];
                for (let i = 0; i < points; i++)
                {
                    const angle = (2 * Math.PI * i) / points;
                    latlngs.push([
                        latlng.lat + radius * Math.sin(angle),
                        latlng.lng + radius * Math.cos(angle)
                    ]);
                }
                return latlngs;
            },
            triangle: (latlng, size) =>
            {
                const h = size.height;
                const w = size.width;
                return [
                    [latlng.lat - h / 2, latlng.lng],
                    [latlng.lat + h / 2, latlng.lng - w / 2],
                    [latlng.lat + h / 2, latlng.lng + w / 2]
                ];
            },
            octagon: (latlng, size) =>
            {
                const radius = Math.min(size.width, size.height) / 2;
                const angleStep = (2 * Math.PI) / 8;
                const latlngs = [];
                for (let i = 0; i < 8; i++)
                {
                    const angle = angleStep * i;
                    latlngs.push([
                        latlng.lat + radius * Math.sin(angle),
                        latlng.lng + radius * Math.cos(angle)
                    ]);
                }
                return latlngs;
            }
        };

        this.init();
    }

    /**
     * Initializes the Leaflet map and layers.
     */
    init()
    {
        this._initMapContainer();

        this.element.classList.add('clsTailwindLeafletDiagram');

        this._initializeMap();
        this._createLayers();
        this._createGridLayer();
        this._bindEvents();
        this._setupDefaultContextMenus();
        this.restoreState(this.diagramState);
    }

    /**
     * Creates and appends the map container div using a unique ID.
     */
    _initMapContainer()
    {
        this.mapId = this.uniqueID('map');
        this.mapEl = document.createElement('div');
        this.mapEl.classList.add('leaflet');
        this.mapEl.id = this.mapId;
        this.mapEl.style.width = '100%';
        this.mapEl.style.height = '100%';
        this.mapEl.style.background = this.defaultStyles.canvas.backgroundColor;
        this.element.appendChild(this.mapEl);
    }

    /**
     * Creates the Leaflet map instance.
     */
    _initializeMap()
    {
        this.map = L.map(this.mapEl, 
        {
            crs: L.CRS.Simple,
            contextmenu: true,
            contextmenuItems: [ { text: 'Example Item', callback: () => console.log('test') } ],
            zoomControl: true
        }).setView(this.diagramState.center, this.diagramState.zoom);

        this.map.contextmenu.enable();

        LeafletPathDrag.enable();
        
        if(this.debug)
        {
            this.map.on('contextmenu.show', () => console.log('CTX menu shown'));
            this.map.on('contextmenu.hide', () => console.log('CTX menu hidden'));
            // this.map.on('contextmenu', (e) => console.log('Base Leaflet contextmenu at', e.latlng));

            // console.log(window.LeafletContextMenu)
            // console.log(LeafletContextMenu)
            // console.log(L)
            // console.log('ContextMenu handler:', this.map.contextmenu);
            // console.log('ContextMenu class attached?', !!L.Map.prototype.contextmenu);

            // Example: Handling a click on the map
            // this.map.on('click', (e) =>
            // {
            //     //console.log(e)
            //     this._showContextMenu('canvas', e.containerPoint, null); // 👈 this is your custom dispatcher
            // });
        }

        

        
    }

    /**
     * Returns the Leaflet map instance used by the diagram.
     * @returns {L.Map} Leaflet map instance
     */
    getMapInstance()
    {
        return this.map;
    }

    /**
     * Temporarily disable map interaction events (useful during drag/edit).
     */
    disableMapInteraction()
    {
        if (!this.map) return;
        this.map.dragging.disable();
        this.map.doubleClickZoom.disable();
        this.map.scrollWheelZoom.disable();
    }

    /**
     * Re-enable previously disabled map interactions.
     */
    enableMapInteraction()
    {
        if (!this.map) return;
        this.map.dragging.enable();
        this.map.doubleClickZoom.enable();
        this.map.scrollWheelZoom.enable();
    }

    /**
     * Resizes the map container and invalidates Leaflet layout
     * Resize method stub to allow future dynamic resizing hooks.
     * Currently triggers a redraw of connections only.
     */
    resize()
    {
        if (this.map)
        {
            this.map.invalidateSize(true);
            this.recalculateAllConnections();
        }
    }

    /**
     * Creates the required Leaflet layers for shapes, connections, labels, and grid.
     * Called during init().
     */
    _createLayers()
    {
        this.shapesLayer = L.layerGroup().addTo(this.map);
        this.connectionsLayer = L.layerGroup().addTo(this.map);
        this.labelLayer = L.layerGroup().addTo(this.map);
        this.gridLayer = L.layerGroup().addTo(this.map);
    }

    /**
     * Toggle visibility of a layer by key
     * @param {string} layerKey - 'grid', 'label', 'connections'
     * @param {boolean} isVisible
     */
    toggleLayerVisibility(layerKey, isVisible)
    {
        const mapLayer = {
            grid: this.gridLayer,
            label: this.labelLayer,
            connections: this.connectionsLayer
        }[layerKey];

        if (!mapLayer) return;

        if (isVisible)
        {
            this.map.addLayer(mapLayer);
        }
        else
        {
            this.map.removeLayer(mapLayer);
        }
    }

    /**
     * Draws a simple SVG grid in the background aligned to snap grid size.
     */
    _createGridLayer()
    {
        const bounds = this.map.getBounds();
        const spacing = 100;

        const minLat = Math.floor(bounds.getSouth() / spacing) * spacing;
        const maxLat = Math.ceil(bounds.getNorth() / spacing) * spacing;
        const minLng = Math.floor(bounds.getWest() / spacing) * spacing;
        const maxLng = Math.ceil(bounds.getEast() / spacing) * spacing;

        for (let lat = minLat; lat <= maxLat; lat += spacing)
        {
            const line = L.polyline(
                [[lat, minLng], [lat, maxLng]],
                {
                    color: this.defaultStyles.grid.color,
                    weight: 1,
                    opacity: 0.2,
                    interactive: false
                }
            );
            this.gridLayer.addLayer(line);
        }

        for (let lng = minLng; lng <= maxLng; lng += spacing)
        {
            const line = L.polyline(
                [[minLat, lng], [maxLat, lng]],
                {
                    color: this.defaultStyles.grid.color,
                    weight: 1,
                    opacity: 0.2,
                    interactive: false
                }
            );
            this.gridLayer.addLayer(line);
        }
    }

    /**
     * Add a shape to the diagram.
     * @param {Object} options
     * @param {string} options.type - Type of shape ('circle', 'square', etc.)
     * @param {L.LatLng} options.latlng - Position to place the shape
     * @param {Object} [options.size] - Width/height
     * @param {string} [options.title] - Title text
     * @param {string} [options.body] - Body text
     * @returns {Object} shape - The created shape object
     */
    addShape(options)
    {
        console.log(options)
        if (!options?.latlng || !options?.type)
        {
            console.warn('addShape: latlng and type are required');
            return;
        }

        const shape = {
            id: options.id || this.uniqueID('shape'),
            type: options.type,
            latlng: this.snapToGrid(options.latlng),
            size: {
                width: options.size?.width || this.defaultShapeSize?.width || 80,
                height: options.size?.height || this.defaultShapeSize?.height || 50
            },
            title: options.title || '',
            body: options.body || '',
            textColor: this.defaultStyles.shape.textColor,
            backgroundColor: this.defaultStyles.shape.fillColor,
            marker: null,
            draggable: false,
            editable: options.editable ?? false,
            locked: options.locked ?? true,
            connections: []
        };

        shape.marker = this._drawShape(shape);
        this.shapes.push(shape);
        this.diagramState.shapes.push(shape);

        this._pushUndo({ action: 'addShape', shape });

        return shape;
    }

    /**
     * Internal method to render a shape polygon.
     * @param {Object} shape - The shape object to render
     * @returns {L.Polygon} Leaflet polygon instance
     */
    _drawShape(shape)
    {
        const latlng = shape.latlng;
        const size = shape.size;

        const renderer = this.shapeRenderers[shape.type] || this.shapeRenderers.square;
        const corners = renderer(latlng, size);

        const polygon = L.polygon(corners,
        {
            color: shape.borderColor || this.defaultStyles.shape.borderColor,
            weight: this.defaultStyles.shape.borderWeight,
            fillColor: shape.backgroundColor || this.defaultStyles.shape.fillColor,
            fillOpacity: this.defaultStyles.shape.fillOpacity,
            draggable: true,
            interactive: true
        }).addTo(this.shapesLayer);

        polygon.bindTooltip(shape.title || '', {
            permanent: true,
            direction: 'center',
            className: 'shape-label'
        });

        polygon.makeDraggable();

        polygon.on('dragend', () =>
        {
            const center = polygon.getBounds().getCenter();
            shape.latlng = this.snapToGrid(center);
            this.recalculateConnectionsForShape(shape.id);
        });

        polygon.on('contextmenu', (e) =>
        {
            e.originalEvent.preventDefault();
            this._showContextMenu('shape', e.containerPoint, shape.id);
        });

        setTimeout(() =>
        {
            const tooltip = polygon.getTooltip();
            if (tooltip?._container)
            {
                tooltip._container.style.color = shape.textColor || this.defaultStyles.shape.textColor;
            }
        }, 0);

        if (shape.locked)
        {
            polygon.dragging.disable();
        }

        return polygon;
    }

    /**
     * Get a list of all locked shapes.
     * @returns {Array<Object>} Locked shape objects
     */
    getLockedShapes()
    {
        return this.shapes.filter(shape => shape.locked);
    }

    /**
     * Get a list of all unlocked shapes.
     * @returns {Array<Object>} Unlocked shape objects
     */
    getUnlockedShapes()
    {
        return this.shapes.filter(shape => !shape.locked);
    }

    /**
     * Retrieve a shape object by its ID.
     * @param {string} id - Shape ID
     * @returns {Object|null} - The shape object or null if not found
     */
    getShapeById(id)
    {
        return this.shapes.find(shape => shape.id === id) || null;
    }

    /**
     * Apply a batch of shape style properties like fillColor, textColor, etc.
     * @param {string} id - The shape ID
     * @param {Object} styleObject - Object with style properties to apply
     */
    applyShapeStyle(id, styleObject = {})
    {
        const shape = this.getShapeById(id);
        if (!shape || !shape.marker) return;

        const polygon = shape.marker;
        if (styleObject.fillColor) polygon.setStyle({ fillColor: styleObject.fillColor });
        if (styleObject.borderColor) polygon.setStyle({ color: styleObject.borderColor });
        if (styleObject.borderWeight) polygon.setStyle({ weight: styleObject.borderWeight });
        if (styleObject.fillOpacity !== undefined) polygon.setStyle({ fillOpacity: styleObject.fillOpacity });

        if (styleObject.textColor)
        {
            const div = polygon.getElement();
            if (div) div.style.color = styleObject.textColor;
        }

        Object.assign(shape, styleObject);
    }

    /**
     * Apply a batch of connection style properties like color, type, label style.
     * @param {string} id - Connection ID
     * @param {Object} styleObject - Object with style properties to apply
     */
    applyConnectionStyle(id, styleObject = {})
    {
        const conn = this.getConnectionById(id);
        if (!conn) return;

        Object.assign(conn, styleObject);

        // Remove and redraw the connection to apply style
        this._removeConnectionVisual(id);
        this._drawConnection(conn);
    }

    /**
     * Attempts to calculate a non-colliding connection path between two shapes.
     * @param {Object} fromShape - Source shape object
     * @param {Object} toShape - Target shape object
     * @returns {Array} List of LatLng points
     */
    calculateNonCollidingPath(fromShape, toShape)
    {
        const fromAnchors = this._calculateAnchors(fromShape);
        const toAnchors = this._calculateAnchors(toShape);

        let bestPath = null;
        let shortestDistance = Infinity;

        for (const fromKey in fromAnchors)
        {
            for (const toKey in toAnchors)
            {
                const fromPoint = fromAnchors[fromKey];
                const toPoint = toAnchors[toKey];
                const dx = fromPoint.lng - toPoint.lng;
                const dy = fromPoint.lat - toPoint.lat;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < shortestDistance)
                {
                    shortestDistance = distance;
                    bestPath = [fromPoint, toPoint];
                }
            }
        }

        return bestPath;
    }

    /**
     * Aligns shapes either vertically or horizontally
     * @param {string} direction - 'horizontal' or 'vertical'
     */
    alignShapes(direction)
    {
        if (!['horizontal', 'vertical'].includes(direction)) return;

        const unlocked = this.shapes.filter(s => !s.locked);
        if (!unlocked.length) return;

        const primary = (direction === 'horizontal') ? 'lat' : 'lng';
        const average = unlocked.reduce((acc, s) => acc + s.latlng[primary], 0) / unlocked.length;

        unlocked.forEach(s =>
        {
            s.latlng[primary] = average;
            s.marker.setLatLng(s.latlng);
        });

        this.recalculateAllConnections();
        this._pushUndo({ action: 'alignShapes', direction });
    }

    /**
     * Snap a LatLng to the center of the nearest grid cell.
     * @param {L.LatLng} latlng - Original position
     * @returns {L.LatLng} - Snapped position
     */
    snapToGrid(latlng)
    {
        const spacing = 100;
        const snappedLat = Math.round(latlng.lat / spacing) * spacing;
        const snappedLng = Math.round(latlng.lng / spacing) * spacing;
        return L.latLng(snappedLat, snappedLng);
    }

    /**
     * Remove a shape by ID and any associated connections.
     * @param {string} id - The ID of the shape to remove
     */
    removeShape(id)
    {
        const shape = this.getShapeById(id);
        if (!shape) return;

        if (shape.marker)
        {
            this.shapesLayer.removeLayer(shape.marker);
        }

        shape.connections.forEach(connId => this.removeConnection(connId));

        this.shapes = this.shapes.filter(s => s.id !== id);
        this.diagramState.shapes = this.diagramState.shapes.filter(s => s.id !== id);

        this._pushUndo({ action: 'removeShape', shape });
    }

    /**
     * Distributes unlocked shapes evenly in either direction.
     * @param {string} direction - 'horizontal' or 'vertical'
     */
    distributeShapes(direction)
    {
        if (!['horizontal', 'vertical'].includes(direction)) return;

        const unlocked = this.shapes.filter(s => !s.locked);
        if (unlocked.length < 2) return;

        const primary = (direction === 'horizontal') ? 'lng' : 'lat';
        const positions = unlocked.map(s => s.latlng[primary]).sort((a, b) => a - b);

        const min = positions[0];
        const max = positions[positions.length - 1];
        const step = (max - min) / (unlocked.length - 1);

        unlocked.sort((a, b) => a.latlng[primary] - b.latlng[primary]);

        unlocked.forEach((s, i) =>
        {
            s.latlng[primary] = min + step * i;
            s.marker.setLatLng(s.latlng);
        });

        this.recalculateAllConnections();
        this._pushUndo({ action: 'distributeShapes', direction });
    }

    /**
     * Draws a connection between two shapes on the map.
     * @param {Object} connection - Connection object from this.connectionLines
     */
    _drawConnection(connection)
    {
        const fromShape = this._getShapeById(connection.from);
        const toShape = this._getShapeById(connection.to);

        if (!fromShape || !toShape)
        {
            console.warn('Invalid connection endpoints:', connection);
            return;
        }

        const { start, end } = this._getConnectionPoints(fromShape, toShape, connection.fromSide, connection.toSide);

        const path = this._calculateConnectionPath(start, end, connection.type);

        const line = L.polyline(path,
        {
            color: connection.color || this.defaultStyles.connection.color,
            weight: this.defaultStyles.connection.weight,
            className: 'connection-line'
        }).addTo(this.connectionsLayer);

        line.on('contextmenu', (e) =>
        {
            e.originalEvent.preventDefault();
            this._showContextMenu('connection', e.containerPoint, connection.id);
        });

        connection._line = line;

        if (connection.label)
        {
            const midIndex = Math.floor(path.length / 2);
            const midPoint = path[midIndex];

            const labelStyles = this.defaultStyles.connectionLabel;
            const label = L.marker(midPoint,
            {
                icon: L.divIcon({
                    className: 'connection-label',
                    html: `<span style="
                        color: ${labelStyles.textColor};
                        background: ${labelStyles.backgroundColor};
                        font-size: ${labelStyles.fontSize};
                        padding: ${labelStyles.padding};
                        border-radius: ${labelStyles.borderRadius};
                    ">${connection.label}</span>`
                }),
                interactive: true
            }).addTo(this.labelLayer);

            label.on('contextmenu', (e) =>
            {
                e.originalEvent.preventDefault();
                this._showContextMenu('connectionLabel', e.containerPoint, connection.id);
            });

            connection._label = label;
        }

        this.connectionLines.push(connection);
    }

    /**
     * Add a connection between two shapes.
     * @param {string} fromId - ID of the starting shape
     * @param {string} toId - ID of the ending shape
     * @param {Object} options - Connection options
     */
    addConnection(fromId, toId, options = {})
    {
        if (fromId === toId) return;

        const fromShape = this.getShapeById(fromId);
        const toShape = this.getShapeById(toId);
        if (!fromShape || !toShape) return;

        const connection = {
            id: options.id || this.uniqueID('conn'),
            from: fromId,
            to: toId,
            fromSide: options.fromSide || 'auto',
            toSide: options.toSide || 'auto',
            label: options.label || '',
            color: options.color || this.defaultStyles.connection.color,
            type: options.type || 'straight'
        };

        fromShape.connections.push(connection.id);
        this.connectionLines.push(connection);
        this._drawConnection(connection);

        this._pushUndo({ action: 'addConnection', connection });
    }

    /**
     * Returns all connection objects in the diagram.
     * @returns {Array} Array of connection objects
     */
    getAllConnections()
    {
        return this.connectionLines || [];
    }

    /**
     * Returns the marker (Leaflet layer) associated with a shape.
     * @param {string} id - Shape ID
     * @returns {L.Polygon|null}
     */
    getShapeMarker(id)
    {
        const shape = this.getShapeById(id);
        return shape?.marker || null;
    }

    /**
     * Applies a style object to a shape.
     * @param {string} id - Shape ID
     * @param {Object} styleObj - fillColor, borderColor, textColor, etc.
     */
    applyStyleToShape(id, styleObj = {})
    {
        this.applyShapeStyle(id, styleObj);
    }

    /**
     * Applies a style object to a connection.
     * @param {string} id - Connection ID
     * @param {Object} styleObj - color, labelColor, labelBg, etc.
     */
    applyStyleToConnection(id, styleObj = {})
    {
        this.applyConnectionStyle(id, styleObj);
    }

    /**
     * Remove a connection by its ID.
     * @param {string} id - ID of the connection to remove
     */
    removeConnection(id)
    {
        const index = this.connectionLines.findIndex(c => c.id === id);
        if (index === -1) return;

        const connection = this.connectionLines[index];
        const fromShape = this.getShapeById(connection.from);
        if (fromShape)
        {
            fromShape.connections = fromShape.connections.filter(cid => cid !== id);
        }

        if (connection._line)
        {
            this.connectionsLayer.removeLayer(connection._line);
        }

        if (connection._label)
        {
            this.labelLayer.removeLayer(connection._label);
        }

        this.connectionLines.splice(index, 1);

        this._pushUndo({ action: 'removeConnection', connection });
    }

    /**
     * Update connection and trigger redraw.
     * @param {string} id - The connection ID.
     * @param {object} props - Properties to update.
     */
    updateConnection(id, props = {})
    {
        const conn = this.getConnectionById(id);
        if (!conn) return;

        const prev = { ...conn };
        Object.assign(conn, props);

        if (conn._line) this.connectionsLayer.removeLayer(conn._line);
        if (conn._label) this.labelLayer.removeLayer(conn._label);

        this._drawConnection(conn);
        this._pushUndo({ action: 'updateConnection', connection: prev });
    }

    /**
     * Update the connection label and track it in the undo stack.
     * @param {string} id - Connection ID
     * @param {string} newText - New label text
     */
    updateConnectionLabel(id, newText)
    {
        const conn = this.getConnectionById(id);
        if (!conn) return;

        const prev = conn.label;
        conn.label = newText;

        this.undoStack.push({
            action: 'updateConnectionLabel',
            connectionId: id,
            previous: prev,
            next: newText
        });

        this._removeConnectionVisual(id);
        this._drawConnection(conn);
    }

    /**
     * Sets the stroke color of a connection.
     * @param {string} id
     * @param {string} color
     */
    setConnectionColor(id, color)
    {
        const conn = this.getConnectionById(id);
        if (!conn) return;
        conn.color = color;
        this.updateConnection(id, { color });
    }

    /**
     * Sets the text color of a connection label.
     * @param {string} id
     * @param {string} color
     */
    setLabelColor(id, color)
    {
        const conn = this.getConnectionById(id);
        if (!conn || !conn._label) return;
        conn._label.getElement().style.color = color;
    }

    /**
     * Sets the background color of a connection label.
     * @param {string} id
     * @param {string} color
     */
    setLabelBackgroundColor(id, color)
    {
        const connection = this.getConnectionById(id);
        if (!connection || !connection._label) return;

        connection.labelBackgroundColor = color;
        connection._label.getElement().style.backgroundColor = color;
        this._pushUndo({ action: 'changeConnectionLabelColor', connection });
    }

    /**
     * Pushes an undo action with full object diff support.
     * @param {Object} actionObject - Action entry for the undo stack
     */
    _pushUndo(actionObject)
    {
        this.undoStack.push(actionObject);
        if (this.undoStack.length > this.maxUndo)
        {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    /**
     * Undo the most recent action.
     */
    undo()
    {
        const action = this.undoStack.pop();
        if (!action) return;

        this._applyUndo(action);
        this.redoStack.push(action);
    }

    /**
     * Redo the most recently undone action.
     */
    redo()
    {
        const action = this.redoStack.pop();
        if (!action) return;

        this._applyRedo(action);
        this.undoStack.push(action);
    }

    /**
     * Returns the current length of undo and redo stacks.
     * @returns {Object} { undo: number, redo: number }
     */
    getUndoRedoCounts()
    {
        return {
            undo: this.undoStack.length,
            redo: this.redoStack.length
        };
    }

    /**
     * Apply an undo action (internal).
     * @param {Object} actionObject
     */
    _applyUndo(actionObject)
    {
        const { action, shape, connection } = actionObject;

        /**
         * Handles undo logic for a specific action type.
         * Called internally by `undo()`.
         * @param {Object} entry - Undo stack entry
         * @private
         */
        switch (action)
        {
            case 'addShape':
                this.removeShape(shape.id);
                break;
            case 'removeShape':
                this.addShape(shape);
                break;
            case 'changeShapeText':
            case 'changeShapeColor':
            case 'changeShapeTextColor':
            case 'changeShapeType':
                this.updateShape(shape.id, shape);
                break;
            case 'addConnection':
                this.removeConnection(connection.id);
                break;
            case 'removeConnection':
                this.addConnection(connection.from, connection.to, connection);
                break;
            case 'changeConnectionLabelText':
            case 'changeConnectionColor':
            case 'changeConnectionLabelColor':
            case 'changeConnectionLabelTextColor':
            case 'removeConnectionLabel':
                this.updateConnection(connection.id, connection);
                break;
            default:
                console.warn('Unknown undo action:', action);
        }
    }


    /**
     * Apply a redo action (internal).
     * @param {Object} actionObject
     */
    _applyRedo(actionObject)
    {
        const { action, shape, connection } = actionObject;

        /**
         * Handles redo logic for a specific action type.
         * Called internally by `redo()`.
         * @param {Object} entry - Redo stack entry
         * @private
         */
        switch (action)
        {
            case 'addShape':
                this.addShape(shape);
                break;
            case 'removeShape':
                this.removeShape(shape.id);
                break;
            case 'changeShapeText':
            case 'changeShapeColor':
            case 'changeShapeTextColor':
            case 'changeShapeType':
                this.updateShape(shape.id, shape);
                break;
            case 'addConnection':
                this.addConnection(connection.from, connection.to, connection);
                break;
            case 'removeConnection':
                this.removeConnection(connection.id);
                break;
            case 'changeConnectionLabelText':
            case 'changeConnectionColor':
            case 'changeConnectionLabelColor':
            case 'changeConnectionLabelTextColor':
            case 'removeConnectionLabel':
                this.updateConnection(connection.id, connection);
                break;
            default:
                console.warn('Unknown redo action:', action);
        }
    }


    /**
     * Retrieve a connection by its ID.
     * @param {string} id - Connection ID
     * @returns {Object|null} - Connection object or null
     */
    getConnectionById(id)
    {
        return this.connectionLines.find(c => c.id === id) || null;
    }

    /**
     * Get a snapshot of the current diagram state.
     * @returns {Object} - A deep copy of the current state
     */
    getDiagramSnapshot()
    {
        return JSON.parse(JSON.stringify({
            zoom: this.map.getZoom(),
            center: this.map.getCenter(),
            layers: { ...this.diagramState.layers },
            shapes: this.shapes.map(s => ({
                ...s,
                marker: undefined
            })),
            connections: this.connectionLines.map(c => ({
                ...c,
                _line: undefined,
                _label: undefined
            }))
        }));
    }

    /**
     * Export the current diagram state.
     * @returns {string} - JSON string of current diagram state
     */
    exportState()
    {
        const state = {
            zoom: this.map.getZoom(),
            center: this.map.getCenter(),
            layers: { ...this.diagramState.layers },
            shapes: this.shapes.map(s => ({
                id: s.id,
                type: s.type,
                latlng: s.latlng,
                size: s.size,
                title: s.title,
                body: s.body,
                locked: s.locked,
                editable: s.editable,
                backgroundColor: s.backgroundColor,
                textColor: s.textColor
            })),
            connections: this.connectionLines.map(c => ({
                id: c.id,
                from: c.from,
                to: c.to,
                fromSide: c.fromSide,
                toSide: c.toSide,
                label: c.label,
                color: c.color,
                type: c.type
            }))
        };

        return JSON.stringify(state, null, 2);
    }

    /**
     * Import a new diagram state.
     * @param {string|Object} diagramJSON - JSON string or object
     */
    importState(diagramJSON)
    {
        let parsed;
        if (typeof diagramJSON === 'string')
        {
            parsed = JSON.parse(diagramJSON);
        }
        else
        {
            parsed = diagramJSON;
        }

        this.clearDiagram();

        const idMap = {};
        const existingIds = new Set(this.shapes.map(s => s.id));

        parsed.shapes.forEach(s =>
        {
            const newId = existingIds.has(s.id) ? this.uniqueID('shape') : s.id;
            idMap[s.id] = newId;

            const newShape = this.addShape({
                ...s,
                id: newId
            });
        });

        parsed.connections.forEach(c =>
        {
            const fromId = idMap[c.from] || c.from;
            const toId = idMap[c.to] || c.to;
            const newId = this.uniqueID('conn');

            this.addConnection(fromId, toId, {
                ...c,
                id: newId
            });
        });

        this.diagramState.center = parsed.center;
        this.diagramState.zoom = parsed.zoom;
        this.map.setView(parsed.center, parsed.zoom);
    }

    /**
     * Restore diagram state and trigger connection recalculation.
     */
    restoreState(state)
    {
        this.clearDiagram();

        if (state.shapes)
        {
            state.shapes.forEach(s => this.addShape(s));
        }

        if (state.connections)
        {
            state.connections.forEach(c => this.addConnection(c));
        }

        this._debouncedRecalculate();
    }

    /**
     * Clear all shapes and connections from the diagram.
     */
    clearDiagram()
    {
        this.shapes.forEach(s =>
        {
            if (s.marker) this.shapesLayer.removeLayer(s.marker);
        });
        this.connectionLines.forEach(c =>
        {
            if (c._line) this.connectionsLayer.removeLayer(c._line);
            if (c._label) this.labelLayer.removeLayer(c._label);
        });

        this.shapes = [];
        this.connectionLines = [];
        this.diagramState.shapes = [];
    }

    /**
     * Toggle visibility of a layer group.
     * @param {string} type - 'grid' | 'connections' | 'labels'
     * @param {boolean} visible
     */
    toggleLayerVisibility(type, visible)
    {
        const layerMap = {
            grid: this.gridLayer,
            connections: this.connectionsLayer,
            labels: this.labelLayer
        };

        const layer = layerMap[type];
        if (!layer) return;

        if (visible)
        {
            this.map.addLayer(layer);
        }
        else
        {
            this.map.removeLayer(layer);
        }
    }

    /**
     * Initializes and sets up default context menu entries for the map canvas.
     * Pulls from `this.contextMenuOverrides.canvas` and rebuilds menu structure.
     * @private
     */
    _setupDefaultContextMenus()
    {
        if (!this.map?.contextmenu) return;

        const items = this.contextMenuOverrides?.canvas || [];

        //this.map.contextmenu.removeAllItems();

        const buildItems = (entries) =>
        {
            return entries.map(item =>
            {
                if (!item) return null;
                if (item.submenu)
                {
                    return {
                        text: item.text,
                        submenu: buildItems(item.submenu),
                        icon: item.icon
                    };
                }
                return {
                    text: item.text,
                    callback: item.callback,
                    icon: item.icon
                };
            }).filter(Boolean);
        };

        const builtItems = buildItems(items);
        builtItems.forEach(item => this.map.contextmenu.addItem(item));
    }

    /**
     * Manually trigger a context menu from external code.
     * @param {string} scopeType - 'canvas' | 'shape' | 'connection' | 'connectionLabel'
     * @param {L.LatLng|{x: number, y: number}} position - Map or screen coordinates
     * @param {string} targetId - The shape/connection/label ID for the menu
     */
    showContextMenu(scopeType, position, targetId)
    {
        this._showContextMenu(scopeType, position, targetId);
    } 

    /**
     * Displays a context menu at the specified screen point for a given scope and optional item ID.
     * @param {string} scope - The type of context menu ('canvas', 'shape', 'connection')
     * @param {L.Point} containerPoint - Leaflet container point (screen coords)
     * @param {string|null} [id=null] - Optional ID of shape or connection
     * @private
     */
    _showContextMenu(scope, containerPoint, id = null)
    {
        if (!containerPoint || !containerPoint.x || !containerPoint.y)
        {
            console.warn('Invalid containerPoint passed to _showContextMenu:', containerPoint);
            return;
        }

        const latlng = this.map.containerPointToLatLng(containerPoint);
        const items = this.contextMenuOverrides?.[scope] || [];

        //this.map.contextmenu.removeAllItems();

        const buildItems = (entries) =>
        {
            return entries.map(item =>
            {
                if (!item) return null;

                const label = typeof item.text === 'function' ? item.text() : item.text;

                if (item.submenu)
                {
                    return {
                        text: label,
                        submenu: buildItems(item.submenu),
                        icon: item.icon
                    };
                }

                return {
                    text: label,
                    callback: (e) => item.callback?.({ ...e, relatedTarget: id }),
                    icon: item.icon
                };
            }).filter(Boolean);
        };

        const builtItems = buildItems(items);
        builtItems.forEach(entry => this.map.contextmenu.addItem(entry));

        this.map.contextmenu.showAt(latlng, { relatedTarget: id });
        
    }

    /**
     * Attaches a context menu to a given Leaflet layer with custom items.
     * @param {L.Layer} layer - The Leaflet layer to bind the menu to
     * @param {Array} items - Array of context menu items
     * @param {Object} [opts={}] - Optional configuration overrides
     */
    bindContextMenuToLayer(layer, items, opts = {})
    {
        if (!layer) return;
        layer.on('contextmenu', (e) =>
        {
            if (!this.map?.contextmenu) return;

            this.map.contextmenu.removeAllItems();
            const entries = (typeof items === 'function') ? items(e) : items;

            const buildItems = (list) =>
            {
                return list.map(item =>
                {
                    if (!item) return null;
                    if (item.submenu)
                    {
                        return {
                            text: item.text,
                            submenu: buildItems(item.submenu),
                            icon: item.icon
                        };
                    }
                    return {
                        text: item.text,
                        callback: (ev) => item.callback?.({ ...ev, relatedTarget: e.target }),
                        icon: item.icon
                    };
                }).filter(Boolean);
            };

            const finalItems = buildItems(entries);
            finalItems.forEach(entry => this.map.contextmenu.addItem(entry));

            this.map.contextmenu.showAt(e.containerPoint, { relatedTarget: e.target });
        });
    }

    /**
     * Add a new context menu item.
     * @param {'shape'|'connection'|'canvas'|'connectionLabel'} type
     * @param {Object} item
     */
    addContextMenuItem(type, item)
    {
        if (!this.contextMenuOverrides[type])
        {
            this.contextMenuOverrides[type] = [];
        }

        if (!item.text && !item.submenu)
        {
            console.warn('Item must have a text label or submenu');
            return;
        }

        this.contextMenuOverrides[type].push(item);
    }

    /**
     * Remove a context menu item by label.
     * @param {'shape'|'connection'|'canvas'|'connectionLabel'} type
     * @param {string} label
     */
    removeContextMenuItem(type, labelOrId)
    {
        const recurseRemove = (items) =>
        {
            return items.filter(item =>
            {
                if (item.text === labelOrId || item.label === labelOrId) return false;
                if (item.submenu) item.submenu = recurseRemove(item.submenu);
                return true;
            });
        };

        if (!this.contextMenuOverrides[type]) return;
        this.contextMenuOverrides[type] = recurseRemove(this.contextMenuOverrides[type]);
    }

    /**
     * Disables a context menu item by text or label for a given menu type.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {string} labelOrId - Text or label or ID to match
     */
    disableContextMenuItem(type, labelOrId)
    {
        const items = this.contextMenuOverrides?.[type];
        if (!items) return;

        const markDisabled = (arr) =>
        {
            arr.forEach(item =>
            {
                if (!item) return;
                if (item.text === labelOrId || item.label === labelOrId)
                {
                    item.disabled = true;
                }
                if (item.submenu) markDisabled(item.submenu);
            });
        };

        markDisabled(items);
    }

    /**
     * Enables a context menu item by text or label for a given menu type.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {string} labelOrId - Text or label or ID to match
     */
    enableContextMenuItem(type, labelOrId)
    {
        const items = this.contextMenuOverrides?.[type];
        if (!items) return;

        const markEnabled = (arr) =>
        {
            arr.forEach(item =>
            {
                if (!item) return;
                if (item.text === labelOrId || item.label === labelOrId)
                {
                    item.disabled = false;
                }
                if (item.submenu) markEnabled(item.submenu);
            });
        };

        markEnabled(items);
    }

    /**
     * Restores the map's context menu to its default items.
     * Only works if the map and context menu are initialized.
     */
    restoreDefaultContextMenuItems()
    {
        if (!this.map?.contextmenu) return;
        this.map.contextmenu.restoreDefaultItems();
    }

    /**
     * Hides all context menu items on the map.
     * Requires Leaflet.contextmenu to be initialized.
     */
    hideAllContextMenuItems()
    {
        if (!this.map?.contextmenu) return;
        this.map.contextmenu.hideAllItems();
    }

    /**
     * Shows all context menu items on the map.
     * Useful if previously hidden via hideAllContextMenuItems().
     */
    showAllContextMenuItems()
    {
        if (!this.map?.contextmenu) return;
        this.map.contextmenu.showAllItems();
    }

    /**
     * Replaces a context menu item by label or ID within a given scope.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {string} labelOrId - Text or label to match
     * @param {Object} newItem - Replacement context menu item
     */
    replaceContextMenuItem(type, labelOrId, newItem)
    {
        const replace = (arr) =>
        {
            for (let i = 0; i < arr.length; i++)
            {
                const item = arr[i];
                if (!item) continue;

                if (item.text === labelOrId || item.label === labelOrId)
                {
                    arr[i] = newItem;
                    return true;
                }

                if (item.submenu && replace(item.submenu)) return true;
            }
            return false;
        };

        if (!this.contextMenuOverrides[type]) return;
        replace(this.contextMenuOverrides[type]);
    }

    /**
     * Searches for a context menu item by label or text within a given scope.
     * Recursively searches submenus as well.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {string} labelOrId - Text or ID of the item to find
     * @returns {Object|null} Found item or null
     */
    findContextMenuItem(type, labelOrId)
    {
        const search = (arr) =>
        {
            for (const item of arr)
            {
                if (!item) continue;
                if (item.text === labelOrId || item.label === labelOrId) return item;
                if (item.submenu)
                {
                    const found = search(item.submenu);
                    if (found) return found;
                }
            }
            return null;
        };

        return this.contextMenuOverrides?.[type]
            ? search(this.contextMenuOverrides[type])
            : null;
    }

    /**
     * Replaces all context menu items for a specific scope.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {Array} items - New array of context menu item definitions
     */
    setContextMenuItems(type, items)
    {
        if (!Array.isArray(items)) return;
        this.contextMenuOverrides[type] = [...items];
    }

    /**
     * Adds a submenu item to an existing parent menu item.
     * @param {string} type - Menu scope (canvas, shape, connection)
     * @param {string} parentLabel - Label or ID of the parent item
     * @param {Object} newItem - New submenu item to append
     */
    appendSubmenuItem(type, parentLabel, newItem)
    {
        const parent = this.findContextMenuItem(type, parentLabel);
        if (!parent)
        {
            console.warn(`Parent item '${parentLabel}' not found`);
            return;
        }

        if (!Array.isArray(parent.submenu))
        {
            parent.submenu = [];
        }

        parent.submenu.push(newItem);
    }

    /**
     * Removes a child item from a submenu under a given parent.
     * @param {string} type - Menu scope (canvas, shape, connection)
     * @param {string} parentLabel - Label or ID of the parent item
     * @param {string} childLabel - Label or ID of the submenu item to remove
     */
    removeSubmenuItem(type, parentLabel, childLabel)
    {
        const parent = this.findContextMenuItem(type, parentLabel);
        if (!parent?.submenu) return;

        parent.submenu = parent.submenu.filter(
            item => item.text !== childLabel && item.label !== childLabel
        );
    }

    /**
     * Disables a submenu item under a given parent context menu item.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {string} parentLabel - Label or ID of the parent menu item
     * @param {string} childLabel - Label or ID of the submenu item to disable
     */
    disableSubmenuItem(type, parentLabel, childLabel)
    {
        const parent = this.findContextMenuItem(type, parentLabel);
        if (!parent?.submenu) return;

        for (const item of parent.submenu)
        {
            if (item.text === childLabel || item.label === childLabel)
            {
                item.disabled = true;
                break;
            }
        }
    }

    /**
     * Enables a submenu item under a given parent context menu item.
     * @param {string} type - One of 'canvas', 'shape', or 'connection'
     * @param {string} parentLabel - Label or ID of the parent menu item
     * @param {string} childLabel - Label or ID of the submenu item to enable
     */
    enableSubmenuItem(type, parentLabel, childLabel)
    {
        const parent = this.findContextMenuItem(type, parentLabel);
        if (!parent?.submenu) return;

        for (const item of parent.submenu)
        {
            if (item.text === childLabel || item.label === childLabel)
            {
                item.disabled = false;
                break;
            }
        }
    }

    /**
     * Returns a deep copy of all context menu items for a given type.
     * @param {string} type - Menu scope: 'canvas', 'shape', or 'connection'
     * @returns {Array} Deep copy of context menu items
     */
    getAllContextMenuItems(type)
    {
        return JSON.parse(JSON.stringify(this.contextMenuOverrides?.[type] || []));
    }

    /**
     * Flattens all nested context menu items into a single-level array.
     * Useful for searching or batch processing.
     * @param {string} type - Menu scope: 'canvas', 'shape', or 'connection'
     * @returns {Array} Flat array of all items and sub-items
     */
    flattenContextMenuItems(type)
    {
        const result = [];
        const traverse = (arr) =>
        {
            for (const item of arr)
            {
                if (!item) continue;
                result.push(item);
                if (item.submenu) traverse(item.submenu);
            }
        };

        traverse(this.contextMenuOverrides?.[type] || []);
        return result;
    }

    /**
     * Sorts context menu items alphabetically by text, including submenus.
     * @param {string} type - Menu scope: 'canvas', 'shape', or 'connection'
     */
    sortContextMenuItems(type)
    {
        const sortRecursive = (arr) =>
        {
            arr.sort((a, b) => (a.text || '').localeCompare(b.text || ''));
            arr.forEach(item =>
            {
                if (item.submenu) sortRecursive(item.submenu);
            });
        };

        const copy = this.contextMenuOverrides?.[type];
        if (!Array.isArray(copy)) return;

        sortRecursive(copy);
    }

    /**
     * Deep clones all or a specific context menu item (by label/id) for a given scope.
     * @param {string} type - Menu scope: 'canvas', 'shape', or 'connection'
     * @param {string|null} [labelOrId=null] - Optional label or ID to clone
     * @returns {Object|Array|null} Cloned item or full menu
     */
    cloneContextMenuItems(type, labelOrId = null)
    {
        if (!this.contextMenuOverrides?.[type]) return null;
        const items = this.contextMenuOverrides[type];

        if (!labelOrId) return JSON.parse(JSON.stringify(items));

        const target = this.findContextMenuItem(type, labelOrId);
        return target ? JSON.parse(JSON.stringify(target)) : null;
    }

    /**
     * Moves a context menu item to a new index within the scope array.
     * @param {string} type - Menu scope
     * @param {number} fromIndex - Current index
     * @param {number} toIndex - Target index
     */
    moveContextMenuItem(type, fromIndex, toIndex)
    {
        const items = this.contextMenuOverrides?.[type];
        if (!items || fromIndex === toIndex || fromIndex < 0 || toIndex < 0 ||
            fromIndex >= items.length || toIndex >= items.length)
        {
            return;
        }

        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
    }

    /**
     * Renames a context menu item by updating its `.text` field.
     * @param {string} type - Menu scope
     * @param {string} labelOrId - Current label or ID
     * @param {string} newLabel - New label text
     */
    renameContextMenuItem(type, labelOrId, newLabel)
    {
        const item = this.findContextMenuItem(type, labelOrId);
        if (item)
        {
            item.text = newLabel;
        }
    }

    /**
     * Clears all context menu items for a given scope.
     * @param {string} type - Menu scope
     */
    clearContextMenuScope(type)
    {
        this.contextMenuOverrides[type] = [];
    }

    /**
     * Rebuilds the context menu structure from the internal override list for a given scope.
     * @param {string} type - Menu scope
     */
    rebuildContextMenuScope(type)
    {
        if (!this.map?.contextmenu || !this.contextMenuOverrides?.[type]) return;

        this.map.contextmenu.removeAllItems();
        const items = this.contextMenuOverrides[type];

        const build = (entries) => entries.map(item =>
        {
            if (item.submenu)
            {
                return {
                    text: item.text,
                    submenu: build(item.submenu),
                    icon: item.icon
                };
            }

            return {
                text: item.text,
                callback: item.callback,
                icon: item.icon,
                disabled: item.disabled
            };
        });

        build(items).forEach(entry => this.map.contextmenu.addItem(entry));
    }

    /**
     * Inserts a visual separator into the context menu of the specified type.
     * @param {string} type - Menu scope
     */
    insertSeparator(type)
    {
        if (!this.contextMenuOverrides[type])
        {
            this.contextMenuOverrides[type] = [];
        }

        this.contextMenuOverrides[type].push({ separator: true });
    }

    /**
     * Align all shapes to a given edge.
     * @param {'left'|'right'|'top'|'bottom'} direction
     */
    alignShapes(direction)
    {
        const unlocked = this.shapes.filter(s => !s.locked);
        if (!unlocked.length) return;

        const getEdge = (s, dir) =>
        {
            const b = s.marker.getBounds();
            switch (dir)
            {
                case 'left': return b.getWest();
                case 'right': return b.getEast();
                case 'top': return b.getNorth();
                case 'bottom': return b.getSouth();
                default: return 0;
            }
        };

        const target = direction === 'left' || direction === 'right'
            ? Math[direction === 'left' ? 'min' : 'max'](...unlocked.map(s => getEdge(s, direction)))
            : Math[direction === 'top' ? 'max' : 'min'](...unlocked.map(s => getEdge(s, direction)));

        unlocked.forEach(s =>
        {
            const center = s.marker.getBounds().getCenter();
            const newLat = (direction === 'top' || direction === 'bottom') ? target : center.lat;
            const newLng = (direction === 'left' || direction === 'right') ? target : center.lng;

            s.latlng = this.snapToGrid(L.latLng(newLat, newLng));
            s.marker.setLatLng(s.latlng);
        });

        this.recalculateAllConnections();
        this._pushUndo({ action: 'alignShapes', direction });
    }


    /**
     * Evenly distribute shapes in the given direction.
     * @param {'horizontal'|'vertical'} direction
     */
    distributeShapes(direction)
    {
        if (!['horizontal', 'vertical'].includes(direction)) return;

        const sorted = [...this.shapes].sort((a, b) =>
            direction === 'horizontal'
                ? a.latlng.lng - b.latlng.lng
                : b.latlng.lat - a.latlng.lat);

        const spacing = 150;
        sorted.forEach((shape, index) =>
        {
            const lat = direction === 'vertical' ? sorted[0].latlng.lat - spacing * index : shape.latlng.lat;
            const lng = direction === 'horizontal' ? sorted[0].latlng.lng + spacing * index : shape.latlng.lng;

            shape.latlng = this.snapToGrid(L.latLng(lat, lng));
            shape.marker.setLatLng(shape.latlng);
            this.recalculateConnectionsForShape(shape.id);
        });
    }

    /**
     * Set the fill color of a shape.
     * @param {string} id - Shape ID
     * @param {string} color - CSS color string
     */
    setShapeColor(id, color)
    {
        const shape = this.getShapeById(id);
        if (!shape || !shape.marker) return;

        shape.backgroundColor = color;
        shape.marker.setStyle({ fillColor: color });
        this._pushUndo({ action: 'changeShapeColor', shape });
    }

    /**
     * Set the text color of a shape.
     * @param {string} id - Shape ID
     * @param {string} color - CSS color string
     */
    setShapeTextColor(id, color)
    {
        const shape = this.getShapeById(id);
        if (!shape || !shape.marker) return;

        shape.textColor = color;
        const tooltip = shape.marker.getTooltip();
        if (tooltip)
        {
            tooltip.options.className = 'shape-label';
            tooltip._container.style.color = color;
        }
        this._pushUndo({ action: 'changeShapeTextColor', shape });
    }

    /**
     * Update shape metadata and redraw if size/position changed.
     * @param {string} id - The shape ID.
     * @param {object} updatedProps - Properties to update.
     */
    updateShape(id, updatedProps = {})
    {
        const shape = this.getShapeById(id);
        if (!shape) return;

        const prev = { ...shape };

        if (updatedProps.title !== undefined)
        {
            shape.title = updatedProps.title;
        }

        if (updatedProps.body !== undefined)
        {
            shape.body = updatedProps.body;
        }

        if (updatedProps.latlng)
        {
            shape.latlng = this.snapToGrid(updatedProps.latlng);
        }

        if (updatedProps.size)
        {
            shape.size = {
                ...shape.size,
                ...updatedProps.size
            };
        }

        // Redraw marker completely if needed
        if (shape.marker)
        {
            this.shapesLayer.removeLayer(shape.marker);
        }

        shape.marker = this._drawShape(shape);
        this._pushUndo({ action: 'updateShape', shape: prev });

        this.recalculateConnectionsForShape(id);
    }

    /**
     * Set the color of a connection line.
     * @param {string} id - Connection ID
     * @param {string} color - CSS color string
     */
    setConnectionColor(id, color)
    {
        const connection = this.getConnectionById(id);
        if (!connection || !connection._line) return;

        connection.color = color;
        connection._line.setStyle({ color });
        this._pushUndo({ action: 'changeConnectionColor', connection });
    }

    /**
     * Set the background color of a connection label.
     * @param {string} id - Connection ID
     * @param {string} color - CSS color string
     */
    setLabelBackgroundColor(id, color)
    {
        const connection = this.getConnectionById(id);
        if (!connection || !connection._label) return;

        connection.labelBackgroundColor = color;
        connection._label.getElement().style.backgroundColor = color;
        this._pushUndo({ action: 'changeConnectionLabelColor', connection });
    }

    /**
     * Set the text color of a connection label.
     * @param {string} id - Connection ID
     * @param {string} color - CSS color string
     */
    setLabelColor(id, color)
    {
        const connection = this.getConnectionById(id);
        if (!connection || !connection._label) return;

        connection.labelTextColor = color;
        connection._label.getElement().style.color = color;
        this._pushUndo({ action: 'changeConnectionLabelTextColor', connection });
    }

    /**
     * Lock a shape (non-draggable, non-editable)
     * @param {string} id - Shape ID
     */
    lockShape(id)
    {
        const shape = this.getShapeById(id);
        if (!shape || !shape.marker) return;

        shape.locked = true;
        shape.marker.dragging.disable();
    }

    /**
     * Unlock a shape (draggable)
     * @param {string} id - Shape ID
     */
    unlockShape(id)
    {
        const shape = this.getShapeById(id);
        if (!shape || !shape.marker) return;

        shape.locked = false;
        shape.marker.dragging.enable();
    }

    /**
     * Recalculate all connections for a given shape.
     * @param {string} shapeId
     */
    recalculateConnectionsForShape(shapeId)
    {
        const shape = this.getShapeById(shapeId);
        if (!shape) return;

        const affectedConnections = this.connectionLines.filter(conn =>
            conn.from === shapeId || conn.to === shapeId);

        affectedConnections.forEach(conn =>
        {
            if (conn._line)
            {
                this.connectionsLayer.removeLayer(conn._line);
            }
            if (conn._label)
            {
                this.labelLayer.removeLayer(conn._label);
            }
            this._drawConnection(conn);
        });
    }

    /**
     * Redraw all connections and labels.
     */
    recalculateAllConnections()
    {
        // this.connectionLines.forEach(conn =>
        // {
        //     if (conn._line)
        //     {
        //         this.connectionsLayer.removeLayer(conn._line);
        //     }
        //     if (conn._label)
        //     {
        //         this.labelLayer.removeLayer(conn._label);
        //     }
        //     this._drawConnection(conn); // rebind happens inside
        // });

        this.connectionLines.forEach(conn =>
        {
            this._removeConnectionVisual(conn.id);
            this._drawConnection(conn);
        });
    }

    /**
     * Move entire diagram by an offset.
     * @param {number} deltaLat - Latitude offset
     * @param {number} deltaLng - Longitude offset
     */
    moveDiagram(deltaLat, deltaLng)
    {
        this.shapes.forEach(shape =>
        {
            const newLatLng = L.latLng(
                shape.latlng.lat + deltaLat,
                shape.latlng.lng + deltaLng
            );

            shape.latlng = this.snapToGrid(newLatLng);
            shape.marker.setLatLng(shape.latlng);
        });

        this.recalculateAllConnections();
    }

    /**
     * Remove references and cleanup from DOM, plugins, and internal objects.
     */
    destroy()
    {
        if (this.map)
        {
            this.map.off();
            this.map.remove();
            this.map = null;
        }
        
        this.shapes = [];
        this.connectionLines = [];
        this.undoStack = [];
        this.redoStack = [];
        this.plugins = {};

        this.trigger('diagram:destroyed');
    }

    /**
     * Adds a shape at the specified LatLng from a context menu event.
     * Defaults to a square shape unless overridden later via submenu.
     * @param {L.LatLng} latlng - Location where the shape should be added.
     */
    _addShapeAt(latlng, type = 'square')
    {
        console.log(latlng, type)
        this.addShape({ type, latlng });
    }

    /**
     * Centers all unlocked shapes relative to canvas bounds.
     */
    centerUnlockedShapes()
    {
        const unlocked = this.shapes.filter(s => !s.locked);
        if (!unlocked.length) return;

        const bounds = L.latLngBounds(unlocked.map(s => s.latlng));
        const center = bounds.getCenter();

        unlocked.forEach(s =>
        {
            s.latlng = this.snapToGrid(center);
            s.marker.setLatLng(s.latlng);
        });

        this.recalculateAllConnections();
        this._pushUndo({ action: 'centerShapes', shapes: unlocked });
    }

    /**
     * Filters shapes with no connections.
     * @returns {Array} Unconnected shape objects
     */
    getUnconnectedShapes()
    {
        return this.shapes.filter(s => !s.connections || s.connections.length === 0);
    }

    /**
     * Highlights unconnected shapes for attention.
     */
    highlightUnconnectedShapes()
    {
        this.getUnconnectedShapes().forEach(s =>
        {
            this.flashShape(s.id, 'blue');
        });
    }

    /**
     * Sorts shapes by proximity to center and returns the sorted array.
     * @returns {Array} Sorted shape list
     */
    getShapesByProximityToCenter()
    {
        const center = this.map.getCenter();
        return [...this.shapes].sort((a, b) =>
        {
            const da = center.distanceTo(a.latlng);
            const db = center.distanceTo(b.latlng);
            return da - db;
        });
    }

    /**
     * Forces refresh of all shape tooltips (useful after bulk updates).
     */
    refreshAllShapeLabels()
    {
        this.shapes.forEach(shape =>
        {
            if (shape.marker && shape.title)
            {
                shape.marker.setTooltipContent(shape.title);
            }
        });
    }

    /**
     * Unlock all shapes to allow free editing.
     */
    unlockAllShapes()
    {
        this.shapes.forEach(shape =>
        {
            // shape.locked = false;
            // if (shape.marker && shape.marker.dragging) shape.marker.dragging.enable();
            this.unlockShape(shape.id);
        });
    }

    /**
     * Lock all shapes to prevent dragging/editing.
     */
    lockAllShapes()
    {
        this.shapes.forEach(shape =>
        {
            shape.locked = true;
            if (shape.marker && shape.marker.dragging) shape.marker.dragging.disable();
        });
    }

    /**
     * Assigns shape metadata useful for flow diagrams.
     * @param {string} id - Shape ID
     * @param {Object} metadata - { order, isStart, isEnd }
     */
    setShapeOrderMetadata(id, metadata = {})
    {
        const shape = this.getShapeById(id);
        if (!shape) return;

        shape.order = metadata.order ?? shape.order;
        shape.isStart = metadata.isStart ?? shape.isStart;
        shape.isEnd = metadata.isEnd ?? shape.isEnd;

        this._triggerShapeUpdated(shape);
    }

    /**
     * Gets layout metadata for a given shape.
     * @param {string} id - Shape ID
     * @returns {Object|null}
     */
    getShapeOrderMetadata(id)
    {
        const shape = this.getShapeById(id);
        if (!shape) return null;

        return {
            order: shape.order ?? null,
            isStart: shape.isStart ?? false,
            isEnd: shape.isEnd ?? false
        };
    }

    /**
     * Returns a list of shapes sorted by order metadata.
     * Shapes without `order` are pushed to the end.
     * @returns {Array} Sorted shape list
     */
    getShapesInOrder()
    {
        return [...this.shapes].sort((a, b) =>
        {
            if (a.order == null) return 1;
            if (b.order == null) return -1;
            return a.order - b.order;
        });
    }

    /**
     * Filters and returns shapes marked as start nodes.
     * @returns {Array} Shapes with `isStart: true`
     */
    getStartShapes()
    {
        return this.shapes.filter(s => s.isStart === true);
    }

    /**
     * Opens a color picker to change the canvas background color.
     */
    changeBackground()
    {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = this.defaultStyles.canvas.backgroundColor;
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);

        input.addEventListener('input', (e) =>
        {
            const color = e.target.value;
            this.defaultStyles.canvas.backgroundColor = color;
            this.mapEl.style.background = color;
            document.body.removeChild(input);
        });

        input.click();
    }

    /**
     * Zooms the map to the saved extent defined in diagramState.
     */
    zoomToExtents()
    {
        if (this.diagramState?.center && this.diagramState?.zoom !== undefined)
        {
            this.map.setView(this.diagramState.center, this.diagramState.zoom);
        }
        else
        {
            console.warn('No saved extent available');
        }
    }

    /**
     * Zooms the map to fit all shapes currently visible on the canvas.
     * @param {Array} padding - Optional Leaflet padding array
     */
    zoomToFit(padding = [50, 50])
    {
        const bounds = L.latLngBounds([]);

        this.shapes.forEach(shape =>
        {
            if (shape?.marker?.getBounds)
            {
                bounds.extend(shape.marker.getBounds());
            }
            else if (shape?.latlng)
            {
                bounds.extend(shape.latlng);
            }
        });

        if (bounds.isValid())
        {
            this.map.fitBounds(bounds, { padding });
        }
    }
    
    /**
     * Import diagram data and optionally overwrite current state.
     * @param {Object} data - Diagram object with shapes and connections
     * @param {boolean} overwrite - Whether to wipe existing diagram
     */
    importDiagram(data, overwrite = true)
    {
        if (overwrite)
        {
            this.shapes.forEach(s => this._removeShapeVisual(s.id));
            this.connectionLines.forEach(c => this._removeConnectionVisual(c.id));
            this.shapes = [];
            this.connectionLines = [];
        }

        (data.shapes || []).forEach(shape =>
        {
            this._drawShape(shape);
            this.shapes.push(shape);
        });

        (data.connections || []).forEach(conn =>
        {
            this._drawConnection(conn);
            this.connectionLines.push(conn);
        });
    }

    /**
     * Reapply current diagram shapes and connections.
     * Useful after deep update or redraw.
     */
    refreshDiagram()
    {
        const state = this.exportDiagram();
        this.importDiagram(state);
    }

    /**
     * Returns shape or connection object by ID.
     * @param {string} id
     * @returns {Object|null}
     */
    getElementById(id)
    {
        return this.getShapeById(id) || this.getConnectionById(id) || null;
    }

    /**
     * Export the current diagram as a plain JSON object.
     * Removes runtime refs for shapes and connections.
     * @returns {Object} - JSON-exportable representation
     */
    exportDiagram()
    {
        return {
            shapes: this.shapes.map(s => this._stripRuntimeRefs(s)),
            connections: this.connectionLines.map(c => this._stripRuntimeRefs(c))
        };
    }

    /**
     * Enables global free edit mode (unlocks and makes draggable).
     */
    enableFreeEditMode()
    {
        this.unlockAllShapes();
    }

    /**
     * Enable free edit mode (unlocks all shapes).
     */
    enableFreeEdit()
    {
        this.shapes.forEach(shape =>
        {
            this.unlockShape(shape.id);
        });
    }

    /**
     * Disable free edit mode (locks all shapes).
     */
    disableFreeEdit()
    {
        this.shapes.forEach(shape =>
        {
            this.lockShape(shape.id);
        });
    }

    /**
     * Disables free edit mode and locks all shapes.
     */
    disableFreeEditMode()
    {
        this.lockAllShapes();
    }

    /**
     * Opens inline editing mode for a shape's text.
     * @param {string|Object} shapeRef - shape ID or shape object
     */
    editShapeText(shapeRef)
    {
        const shape = typeof shapeRef === 'string' ? this.getShapeById(shapeRef) : shapeRef;
        if (!shape || !shape.marker || !shape.editable) return;

        const tooltip = shape.marker.getTooltip();
        if (!tooltip || !tooltip._container) return;

        tooltip._container.contentEditable = true;
        tooltip._container.focus();

        tooltip._container.addEventListener('blur', () =>
        {
            const newText = tooltip._container.innerText;
            shape.title = newText;
            shape.marker.setTooltipContent(newText);
            tooltip._container.contentEditable = false;
            this._pushUndo({ action: 'changeShapeText', shape });
        }, { once: true });
    }

    /**
     * Update the label text of a shape and push to undo stack.
     * @param {string} id - The shape ID
     * @param {string} newText - The new title/body text to set
     * @param {string} field - 'title' or 'body'
     */
    updateShapeText(id, newText, field = 'title')
    {
        const shape = this.getShapeById(id);
        if (!shape || !['title', 'body'].includes(field)) return;

        const prevText = shape[field];
        shape[field] = newText;

        this.undoStack.push({
            action: 'updateShapeText',
            shapeId: id,
            field,
            previous: prevText,
            next: newText
        });

        this._updateShapeLabel(shape);
    }

    /**
     * Update style for a shape and push to undo stack.
     * @param {string} id - Shape ID
     * @param {Object} styleObject - Style changes to apply
     */
    updateShapeStyle(id, styleObject = {})
    {
        const shape = this.getShapeById(id);
        if (!shape) return;

        const prev = { ...shape };

        this.applyShapeStyle(id, styleObject);

        this.undoStack.push({
            action: 'updateShapeStyle',
            shapeId: id,
            previous: prev,
            next: { ...shape }
        });
    }

    /**
     * Update style for a connection and push to undo stack.
     * @param {string} id - Connection ID
     * @param {Object} styleObject - Style changes to apply
     */
    updateConnectionStyle(id, styleObject = {})
    {
        const conn = this.getConnectionById(id);
        if (!conn) return;

        const prev = { ...conn };

        this.applyConnectionStyle(id, styleObject);

        this.undoStack.push({
            action: 'updateConnectionStyle',
            connectionId: id,
            previous: prev,
            next: { ...conn }
        });
    }

    /**
     * Checks if a shape with the given ID exists.
     * @param {string} id
     * @returns {boolean}
     */
    shapeExists(id)
    {
        return this.shapes.some(s => s.id === id);
    }

    /**
     * Unlocks the specified shape for dragging.
     * @param {string|Object} shapeRef - Shape ID or shape object
     */
    unlockShape(shapeRef)
    {
        const shape = typeof shapeRef === 'string' ? this.getShapeById(shapeRef) : shapeRef;

        shape.locked = false;
        shape.draggable = true;
        shape.editable = true;

        if (!shape || !shape.marker) return;

        shape.marker.dragging.enable();
    }

    /**
     * Change a shape's type and re-render it.
     * @param {string} id - Shape ID
     * @param {string} newType - New shape type
     */
    changeShapeType(id, newType)
    {
        const shape = this.getShapeById(id);
        if (!shape || !this.shapeRenderers[newType]) return;

        const old = { ...shape };
        shape.type = newType;

        if (shape.marker)
        {
            this.shapesLayer.removeLayer(shape.marker);
        }

        shape.marker = this._drawShape(shape);
        this.recalculateConnectionsForShape(id);
        this._pushUndo({ action: 'changeShapeType', shape: old });
    }

    /**
     * Opens a color picker to change the background color of a shape.
     * @param {string|Object} shapeRef - Shape ID or shape object
     */
    changeShapeColor(shapeRef)
    {
        const shape = typeof shapeRef === 'string' ? this.getShapeById(shapeRef) : shapeRef;
        if (!shape || !shape.marker) return;

        const input = document.createElement('input');
        input.type = 'color';
        input.value = shape.backgroundColor || this.defaultStyles.shape.fillColor;
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);

        input.addEventListener('input', (e) =>
        {
            const color = e.target.value;
            this.setShapeColor(shape.id, color);
            document.body.removeChild(input);
        });

        input.click();
    }

    /**
     * Initiates connection creation from the given shape.
     * @param {string|Object} shapeRef - Shape ID or shape object
     */
    startConnectionFrom(shapeRef)
    {
        console.warn('startConnectionFrom() not yet implemented.');
        // Placeholder for connection-drag logic
    }

    /**
     * Removes a shape from the diagram.
     * @param {string|Object} shapeRef - Shape ID or shape object
     */
    removeShape(shapeRef)
    {
        const shape = typeof shapeRef === 'string' ? this.getShapeById(shapeRef) : shapeRef;
        if (!shape) return;

        this.removeShape(shape.id);
    }

    /**
     * Returns all shapes currently in the diagram.
     * @returns {Array} Array of shape objects
     */
    getAllShapes()
    {
        return this.shapes || [];
    }

    /**
     * Opens inline editing for a connection label.
     * @param {string|Object} connRef - Connection ID or connection object
     */
    editConnectionLabel(connRef)
    {
        const conn = typeof connRef === 'string' ? this.getConnectionById(connRef) : connRef;
        if (!conn || !conn._label) return;

        const el = conn._label.getElement();
        if (!el) return;

        el.contentEditable = true;
        el.focus();

        el.addEventListener('blur', () =>
        {
            const newText = el.innerText;
            conn.label = newText;
            el.innerText = newText;
            el.contentEditable = false;
            this._pushUndo({ action: 'changeConnectionLabelText', connection: conn });
        }, { once: true });
    }

    /**
     * Checks if a connection with the given ID exists.
     * @param {string} id
     * @returns {boolean}
     */
    connectionExists(id)
    {
        return this.connectionLines.some(c => c.id === id);
    }

    /**
     * Updates the style of a connection label.
     * @param {string} id - Connection ID
     * @param {Object} styleObj - Style properties to apply
     */
    updateLabelStyle(id, styleObj = {})
    {
        const conn = this.getConnectionById(id);
        if (!conn || !conn._label) return;

        const el = conn._label.getElement();
        if (!el) return;

        Object.assign(el.style, styleObj);
        this._triggerConnectionUpdated(conn);
    }

    /**
     * Redraws all labels with rebind and updated styles.
     */
    refreshAllLabels()
    {
        this.connectionLines.forEach(conn => this._rebindConnectionLabel(conn));
    } 


    /**
     * Updates the text of a label on a connection.
     * @param {string} id - Connection ID
     * @param {string} newText - New label text
     */
    updateLabelText(id, newText)
    {
        const conn = this.getConnectionById(id);
        if (!conn || !conn._label) return;

        conn.label = newText;
        conn._label.getElement().innerText = newText;
        this._triggerConnectionUpdated(conn);
    }

    /**
     * Cycles label alignment (left, center, right).
     * @param {string} id - Connection ID
     */
    cycleLabelAlignment(id)
    {
        const conn = this.getConnectionById(id);
        if (!conn || !conn._label) return;

        const el = conn._label.getElement();
        if (!el) return;

        const current = el.style.textAlign || 'center';
        const next = current === 'left' ? 'center' : current === 'center' ? 'right' : 'left';
        el.style.textAlign = next;

        this._triggerConnectionUpdated(conn);
    }

    /**
     * Highlights all connections missing labels.
     */
    highlightUnlabeledConnections()
    {
        this.connectionLines.forEach(conn =>
        {
            if (!conn.label || !conn._label)
            {
                this.flashConnection(conn.id, 'orange');
            }
        });
    }

    /**
     * Finds and returns duplicate shape titles.
     * @returns {Array} Array of duplicated titles
     */
    findDuplicateShapeTitles()
    {
        const seen = new Map();
        const duplicates = new Set();

        this.shapes.forEach(s =>
        {
            const key = s.title?.trim().toLowerCase();
            if (!key) return;

            if (seen.has(key))
            {
                duplicates.add(key);
            }
            else
            {
                seen.set(key, s.id);
            }
        });

        return Array.from(duplicates);
    }

    /**
     * Flashes shapes that match the given titles (case-insensitive).
     * @param {string[]} titleList
     */
    flashShapesByTitles(titleList = [])
    {
        const targets = titleList.map(t => t.trim().toLowerCase());

        this.shapes.forEach(s =>
        {
            if (targets.includes(s.title?.trim().toLowerCase()))
            {
                this.flashShape(s.id, 'purple');
            }
        });
    }

    /**
     * Opens a selector to change the connection type (e.g. straight, elbow).
     * @param {string|Object} connRef - Connection ID or connection object
     */
    changeConnectionType(connRef)
    {
        const conn = typeof connRef === 'string' ? this.getConnectionById(connRef) : connRef;
        if (!conn) return;

        // Example: toggle between straight and elbow
        const newType = conn.type === 'straight' ? 'elbow' : 'straight';
        this.updateConnection(conn.id, { type: newType });
    }

    /**
     * Opens a color picker to change the connection line color.
     * @param {string|Object} connRef - Connection ID or connection object
     */
    changeConnectionColor(connRef)
    {
        const conn = typeof connRef === 'string' ? this.getConnectionById(connRef) : connRef;
        if (!conn) return;

        const input = document.createElement('input');
        input.type = 'color';
        input.value = conn.color || this.defaultStyles.connection.color;
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);

        this.openColorPicker((color) =>
        {
            this.setConnectionColor(conn.id, color);
        }, conn.color || this.defaultStyles.connection.color);
    }

    /**
     * Removes a connection from the diagram.
     * @param {string|Object} connRef - Connection ID or connection object
     */
    removeConnection(connRef)
    {
        const conn = typeof connRef === 'string' ? this.getConnectionById(connRef) : connRef;
        if (!conn) return;

        this.removeConnection(conn.id);
    }

    /**
     * Opens a color picker to change the text color of a connection label.
     * @param {string|Object} connRef - Connection ID or connection object
     */
    changeLabelColor(connRef)
    {
        const conn = typeof connRef === 'string' ? this.getConnectionById(connRef) : connRef;
        if (!conn || !conn._label) return;

        const input = document.createElement('input');
        input.type = 'color';
        input.value = conn.labelTextColor || this.defaultStyles.connectionLabel.textColor;
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);

        input.addEventListener('input', (e) =>
        {
            const color = e.target.value;
            this.setLabelColor(conn.id, color);
            document.body.removeChild(input);
        });

        input.click();
    }

    /**
     * Removes the label from a connection.
     * @param {string|Object} connRef - Connection ID or connection object
     */
    removeLabel(connRef)
    {
        const conn = typeof connRef === 'string' ? this.getConnectionById(connRef) : connRef;
        if (!conn || !conn._label) return;

        this.labelLayer.removeLayer(conn._label);
        conn._label = null;
        conn.label = '';
        this._pushUndo({ action: 'removeConnectionLabel', connection: conn });
    }

    /**
     * Bring a shape marker to the front of the z-order.
     * @param {string} id - The shape ID.
     */
    bringToFront(id)
    {
        const shape = this.getShapeById(id);
        if (shape?.marker?.bringToFront)
        {
            shape.marker.bringToFront();
        }
    }

    /**
     * Send a shape marker to the back of the z-order.
     * @param {string} id - The shape ID.
     */
    bringToBack(id)
    {
        const shape = this.getShapeById(id);
        if (shape?.marker?.bringToBack)
        {
            shape.marker.bringToBack();
        }
    }

    /**
     * Calculate anchor points for a shape.
     * @param {object} shape
     * @returns {object} anchors by side and corners
     */
    _calculateAnchors(shape)
    {
        const bounds = shape.marker.getBounds();
        const center = bounds.getCenter();

        return {
            top: L.latLng(bounds.getNorth(), center.lng),
            bottom: L.latLng(bounds.getSouth(), center.lng),
            left: L.latLng(center.lat, bounds.getWest()),
            right: L.latLng(center.lat, bounds.getEast()),
            topLeft: bounds.getNorthWest(),
            topRight: bounds.getNorthEast(),
            bottomLeft: bounds.getSouthWest(),
            bottomRight: bounds.getSouthEast()
        };
    }

    /**
     * Calculates connection anchor points between two shapes.
     * Chooses specific sides or auto-selects nearest ones.
     * @param {Object} fromShape - Source shape object
     * @param {Object} toShape - Target shape object
     * @param {string} [fromSide='auto'] - Preferred anchor side of source
     * @param {string} [toSide='auto'] - Preferred anchor side of target
     * @returns {{ start: L.LatLng, end: L.LatLng }} Anchor points
     * @private
     */
    _getConnectionPoints(fromShape, toShape, fromSide = 'auto', toSide = 'auto')
    {
        const fromAnchors = this._calculateAnchors(fromShape);
        const toAnchors = this._calculateAnchors(toShape);

        const getClosest = (target, anchors) =>
        {
            let minDist = Infinity;
            let closest = null;
            for (const key in anchors)
            {
                const dist = target.distanceTo(anchors[key]);
                if (dist < minDist)
                {
                    minDist = dist;
                    closest = anchors[key];
                }
            }
            return closest;
        };

        const fromPoint = (fromSide === 'auto') ? getClosest(toShape.latlng, fromAnchors) : fromAnchors[fromSide];
        const toPoint = (toSide === 'auto') ? getClosest(fromShape.latlng, toAnchors) : toAnchors[toSide];

        return { start: fromPoint, end: toPoint };
    }

    /**
     * Calculate connection path between two anchor points.
     * Supports various connection types.
     */
    _calculateConnectionPath(start, end, type = 'straight')
    {
        switch (type)
        {
            case 'straight':
                return [start, end];

            case 'elbow':
                return [
                    L.latLng(start.lat, end.lng),
                    end
                ];

            case 'arc':
            case 'curved':
            case 'quadratic':
            case 'multi':
                // TODO: implement advanced routing types
                console.warn(`Connection type '${type}' not yet implemented. Falling back to elbow.`);
                return [
                    L.latLng(start.lat, end.lng),
                    end
                ];

            default:
                return [start, end];
        }
    }

    /**
     * Return label marker by connection ID.
     * @param {string} id - Connection ID
     * @returns {L.Marker|null}
     */
    getLabelById(id)
    {
        const conn = this.getConnectionById(id);
        return conn?._label || null;
    }

    /**
     * Ensure rebinding of label event listeners and style after redraw.
     * @param {Object} connection - The connection object
     */
    _rebindConnectionLabel(connection)
    {
        if (!connection || !connection._label) return;

        const label = connection._label;
        label.removeEventListener('contextmenu', connection._labelHandler);

        connection._labelHandler = (e) =>
        {
            e.preventDefault();
            this._showContextMenu('connectionLabel', e, connection.id);
        };

        label.addEventListener('contextmenu', connection._labelHandler);

        // Apply default label style if available
        const style = this.defaultStyles.connectionLabel;
        if (style)
        {
            label.style.background = style.background;
            label.style.padding = style.padding;
            label.style.borderRadius = style.borderRadius;
            label.style.color = style.color;
            label.style.fontSize = style.fontSize;
            label.style.fontWeight = style.fontWeight;
        }
    }

    /**
     * Opens a submenu with nested context items.
     * @param {Array<Object>} menuItems - Submenu item objects
     * @returns {Object} - Parent item with attached submenu
     */
    openSubmenu(menuItems)
    {
        return {
            text: 'Submenu',
            submenu: menuItems
        };
    }

    /**
     * Opens a native HTML color picker and passes selected color to callback.
     * @param {Function} callback - Function to receive selected color
     * @param {string} [defaultValue='#000000'] - Default color value
     */
    openColorPicker(callback, defaultValue = '#000000')
    {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = defaultValue;
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        document.body.appendChild(input);

        input.addEventListener('input', (e) =>
        {
            callback?.(e.target.value);
            document.body.removeChild(input);
        }, { once: true });

        input.click();
    }

    /**
     * Destroys the diagram and removes Leaflet map and all event bindings.
     */
    destroy()
    {
        if (this.map)
        {
            this.map.off();
            this.map.remove();
        }

        this.shapes = [];
        this.connectionLines = [];
        this.undoStack = [];
        this.redoStack = [];

        if (this.mapEl && this.mapEl.parentNode)
        {
            this.mapEl.parentNode.removeChild(this.mapEl);
        }
    }

    /**
     * Call this after label redraw to ensure context menu works again.
     * @param {object} conn - Connection object with _label
     */
    _rebindLabelContextMenu(conn)
    {
        if (conn._label && conn._label.getElement)
        {
            const el = conn._label.getElement();
            if (el)
            {
                el.addEventListener('contextmenu', (e) =>
                {
                    e.preventDefault();
                    this._showContextMenu('connection', e, conn.id);
                });
            }
        }
    }

    /**
     * Create styled label icon using defaultStyles.connectionLabel.
     * @param {object} conn
     * @returns {L.divIcon}
     */
    _createLabelIcon(conn)
    {
        const style = this.defaultStyles.connectionLabel;
        const css = `
            color: ${style.textColor};
            background-color: ${style.backgroundColor};
            padding: ${style.padding || '2px 4px'};
            font-size: ${style.fontSize || '12px'};
            border-radius: ${style.borderRadius || '4px'};
            font-weight: ${style.fontWeight || 'normal'};
            white-space: nowrap;
        `;

        return L.divIcon({
            html: `<div style="${css}">${conn.label}</div>`
        });
    }

    /**
     * Debounce wrapper for connection redraw.
     */
    _debouncedRecalculate()
    {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() =>
        {
            this.recalculateAllConnections();
        }, 50);
    }

    /**
     * Set default styles for a given type.
     * @param {string} scope - 'canvas' | 'shape' | 'connection' | 'connectionLabel'
     * @param {Object} styleObj - The style object to override defaults with
     */
    setDefaultStyle(scope, styleObj = {})
    {
        if (!this.defaultStyles[scope]) return;
        this.defaultStyles[scope] = Object.assign({}, this.defaultStyles[scope], styleObj);
    }

    /**
     * Registers a plugin into the internal registry.
     * @param {string} pluginId - Unique identifier for the plugin.
     * @param {Object} pluginDefinition - Plugin object with `init()`, optional `unload()`, and `hooks`.
     */
    registerPlugin(pluginId, pluginDefinition)
    {
        if (!pluginId || typeof pluginDefinition !== 'object') return;

        if (typeof pluginDefinition.init !== 'function')
        {
            console.warn(`[Plugin:${pluginId}] Missing required init(diagram) method.`);
            return;
        }

        this.pluginRegistry = this.pluginRegistry || {};
        this.pluginRegistry[pluginId] = pluginDefinition;
    }

    /**
     * Loads and initializes a plugin from the registry.
     * @param {string} pluginId
     */
    loadPlugin(pluginId)
    {
        const plugin = this.pluginRegistry?.[pluginId];
        if (!plugin) return;

        if (!this.loadedPlugins) this.loadedPlugins = {};

        if (typeof plugin.init === 'function')
        {
            plugin.init(this);
        }

        this.loadedPlugins[pluginId] = plugin;
        this._triggerPluginLoaded(pluginId, plugin);
    }

    /**
     * Unloads a plugin by ID.
     * @param {string} pluginId
     */
    unloadPlugin(pluginId)
    {
        const plugin = this.loadedPlugins?.[pluginId];
        if (!plugin) return;

        if (typeof plugin.unload === 'function')
        {
            plugin.unload();
        }

        delete this.loadedPlugins[pluginId];
    }

    /**
     * Reloads all loaded plugins by calling their init() again.
     */
    reloadAllPlugins()
    {
        if (!this.loadedPlugins) return;

        for (const pluginId in this.loadedPlugins)
        {
            const plugin = this.loadedPlugins[pluginId];
            if (typeof plugin.init === 'function')
            {
                plugin.init(this);
            }
        }
    }

    /**
     * Fires a plugin broadcast message to all listeners.
     * @param {string} type - Message type
     * @param {Object} data - Message payload
     */
    broadcastPluginEvent(type, data = {})
    {
        this.trigger(`plugin:message:${type}`, data);
    }

    /**
     * Returns list of registered plugin IDs.
     * @returns {string[]}
     */
    getRegisteredPlugins()
    {
        return Object.keys(this.pluginRegistry || {});
    }

    /**
     * Dump the current state of the diagram including shapes, connections, and stacks.
     * @returns {Object} - Full internal state snapshot
     */
    dumpState()
    {
        return {
            shapes: JSON.parse(JSON.stringify(this.shapes)),
            connections: JSON.parse(JSON.stringify(this.connectionLines)),
            undoStack: [...this.undoStack],
            redoStack: [...this.redoStack]
        };
    }

    /**
     * Strips runtime references (_label, _line, _marker) for export purposes.
     * @param {Object} obj - Shape or connection object
     * @returns {Object} - Cleaned copy for export
     */
    _stripRuntimeRefs(obj)
    {
        const clone = { ...obj };
        delete clone._label;
        delete clone._line;
        delete clone._marker;
        return clone;
    }

    /**
     * Toggles visibility of internal IDs on shape tooltips.
     * Adds/removes `[ID: shape.id]` to title.
     */
    toggleDebugIds()
    {
        this.shapes.forEach(shape =>
        {
            const tooltip = shape.marker?.getTooltip();
            if (!tooltip) return;

            const label = shape.title || '';
            const hasId = label.includes(`[ID:`);
            const clean = label.replace(/\s*\[ID:.*?\]/, '').trim();

            shape.marker.setTooltipContent(
                hasId ? clean : `${clean} [ID: ${shape.id}]`
            );
        });
    }

    /**
     * Shows bounding boxes for all shape markers for debug layout.
     */
    showDebugBoundingBoxes()
    {
        this.shapes.forEach(shape =>
        {
            const bounds = shape.marker.getBounds();
            const box = L.rectangle(bounds,
            {
                color: 'red',
                weight: 1,
                dashArray: '4',
                fillOpacity: 0,
                interactive: false
            }).addTo(this.map);

            setTimeout(() => this.map.removeLayer(box), 3000);
        });
    }

    /**
     * Highlights shapes that are overlapping by bounds intersection.
     */
    highlightOverlappingShapes()
    {
        const overlaps = [];

        for (let i = 0; i < this.shapes.length; i++)
        {
            for (let j = i + 1; j < this.shapes.length; j++)
            {
                const a = this.shapes[i].marker.getBounds();
                const b = this.shapes[j].marker.getBounds();

                if (a.intersects(b))
                {
                    overlaps.push(this.shapes[i], this.shapes[j]);
                }
            }
        }

        [...new Set(overlaps)].forEach(shape =>
        {
            this.flashShape(shape.id, 'red');
        });
    }

    /**
     * Forces plugin redraw via diagram:ready event.
     */
    triggerDebugRedraw()
    {
        this._triggerDiagramReady();
    }

    /**
     * Validate the diagram, checking for orphaned connections or missing references.
     * @returns {Object} - Object with validation status and messages
     */
    validateDiagram()
    {
        const messages = [];
        const shapeIds = new Set(this.shapes.map(s => s.id));

        this.connectionLines.forEach(conn =>
        {
            if (!shapeIds.has(conn.from))
            {
                messages.push(`Connection ${conn.id} has missing source shape: ${conn.from}`);
            }
            if (!shapeIds.has(conn.to))
            {
                messages.push(`Connection ${conn.id} has missing target shape: ${conn.to}`);
            }
        });

        return {
            valid: messages.length === 0,
            messages
        };
    }

    /**
     * Binds internal Leaflet map events (move, zoom) to update the grid layer.
     * @private
     */
    _bindEvents()
    {
        this.map.on('moveend zoomend', () =>
        {
            this.gridLayer.clearLayers();
            this._createGridLayer();
        });

        this.map.on('contextmenu', (e) =>
        {
            this.map.contextmenu.insertItem({
                text: 'New Option',
                callback: (e) => console.log('Clicked!', e)
            });


            this._showContextMenu('canvas', e.containerPoint, null); // use containerPoint here
        });

        // this.map.on('contextmenu', (e) =>
        // {
        //     this.trigger('canvas:contextmenu', {
        //         latlng: e.latlng
        //     });
        // });
    }

    /**
     * Registers an event handler for the given event name.
     * @param {string} eventName - Name of the event to listen to.
     * @param {Function} handlerFn - The handler function to invoke.
     */
    on(eventName, handlerFn)
    {
        if (!this._eventHandlers)
        {
            this._eventHandlers = {};
        }

        if (!this._eventHandlers[eventName])
        {
            this._eventHandlers[eventName] = [];
        }

        this._eventHandlers[eventName].push(handlerFn);
    }

    /**
     * Event unsubscription for plugin system.
     * Removes handler for a specific event.
     * @param {string} eventName - Event name
     * @param {Function} handlerFn - Handler to remove
     */
    off(eventName, handlerFn)
    {
        if (!this._eventHandlers[eventName]) return;
        this._eventHandlers[eventName] = this._eventHandlers[eventName].filter(fn => fn !== handlerFn);
        if (this._eventHandlers[eventName].length === 0)
        {
            delete this._eventHandlers[eventName];
        }
    }

    /**
     * Triggers an event and notifies all registered listeners.
     * @param {string} eventName - Event name to trigger.
     * @param {*} payload - Data to pass to the handler functions.
     */
    trigger(eventName, payload)
    {
        if (!this._eventHandlers || !this._eventHandlers[eventName]) return;

        try
        {
            this._eventHandlers[eventName].forEach(fn => fn(payload));
        }
        catch (err)
        {
            console.error(`[clsTailwindLeafletDiagram] Error in event handler for '${eventName}':`, err);
        }
    }

    /**
     * Initializes base event bindings for canvas interactions.
     */
    _bindMapInteractionEvents()
    {
        this.map.on('click', (e) =>
        {
            this.trigger('canvas:click', { latlng: e.latlng });
        });

        // this.map.on('contextmenu', (e) =>
        // {
        //     this.trigger('canvas:contextmenu', { latlng: e.latlng });
        // });

        this.map.on('zoomend', () =>
        {
            this.trigger('canvas:zoom', {
                center: this.map.getCenter(),
                zoom: this.map.getZoom()
            });
        });

        this.map.on('moveend', () =>
        {
            this.trigger('canvas:pan', {
                center: this.map.getCenter()
            });
        });
    }

    /**
     * Binds shape-related interaction events.
     * @param {string} id
     * @param {L.Layer} marker
     */
    _bindShapeEvents(id, marker)
    {
        marker.on('click', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:click', { latlng: e.latlng, shape });
        });

        marker.on('contextmenu', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:contextmenu', { latlng: e.latlng, shape });
        });
    }

    /**
     * Binds connection line events.
     * @param {string} id
     * @param {L.Polyline} line
     */
    _bindConnectionEvents(id, line)
    {
        line.on('click', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.trigger('connection:click', { latlng: e.latlng, connection });
        });

        line.on('contextmenu', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.trigger('connection:contextmenu', { latlng: e.latlng, connection });
        });
    }

    /**
     * Binds label marker events for connection labels.
     * @param {string} id
     * @param {L.Marker} label
     */
    _bindLabelEvents(id, label)
    {
        label.on('click', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.trigger('label:click', { latlng: e.latlng, connection });
        });

        label.on('dblclick', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.editConnectionLabel(connection);
        });

        label.on('contextmenu', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.trigger('label:contextmenu', { latlng: e.latlng, connection });
        });
    }

    /**
     * Triggers lifecycle event when a plugin is loaded.
     * @param {string} pluginName
     * @param {*} instance
     */
    _triggerPluginLoaded(pluginName, instance)
    {
        this.trigger('plugin:loaded', { pluginName, instance });
    }

    /**
     * Triggers lifecycle event when a plugin is unloaded.
     * @param {string} pluginName
     */
    _triggerPluginUnloaded(pluginName)
    {
        this.trigger('plugin:unloaded', { pluginName });
    }

    /**
     * Emits export event for external listeners.
     * @param {Object} json - Diagram export structure
     */
    _triggerExported(json)
    {
        this.trigger('diagram:exported', { json });
    }

    /**
     * Triggers lifecycle event when undo is applied.
     * @param {Object} action - Action data
     */
    _triggerUndoApplied(action)
    {
        this.trigger('undo:applied', { action });
    }

    /**
     * Triggers lifecycle event when redo is applied.
     * @param {Object} action - Action data
     */
    _triggerRedoApplied(action)
    {
        this.trigger('redo:applied', { action });
    }

    /**
     * Emits import event after diagram is loaded.
     * @param {Array} shapes 
     * @param {Array} connections 
     */
    _triggerImportComplete(shapes, connections)
    {
        this.trigger('diagram:imported', { shapes, connections });
    }

    /**
     * Triggers shape update event.
     * Should be called after visual or metadata change.
     * @param {Object} shape
     */
    _triggerShapeUpdated(shape)
    {
        this.trigger('shape:updated', { shape });
    }

    /**
     * Triggers connection update event.
     * Should be called after label, style, or routing changes.
     * @param {Object} connection
     */
    _triggerConnectionUpdated(connection)
    {
        this.trigger('connection:updated', { connection });
    }

    /**
     * Triggers canvas resize event with bounds.
     * @param {L.LatLngBounds} bounds
     */
    _triggerCanvasResize(bounds)
    {
        this.trigger('canvas:resize', { bounds });
    }

    /**
     * Dispatch plugin notification for shape creation.
     * Called after shape is added to map and state.
     * @param {Object} shape
     */
    _triggerShapeAdded(shape)
    {
        this.trigger('shape:added', { shape });
    }

    /**
     * Dispatch plugin notification for shape deletion.
     * @param {Object} shape
     */
    _triggerShapeRemoved(shape)
    {
        this.trigger('shape:removed', { shape });
    }

    /**
     * Dispatch plugin notification for connection creation.
     * @param {Object} connection
     */
    _triggerConnectionAdded(connection)
    {
        this.trigger('connection:added', { connection });
    }

    /**
     * Dispatch plugin notification for connection removal.
     * @param {Object} connection
     */
    _triggerConnectionRemoved(connection)
    {
        this.trigger('connection:removed', { connection });
    }

    /**
     * Internal call when exporting a snapshot for external sync
     */
    _dispatchExportSnapshot()
    {
        const snapshot = this.getDiagramSnapshot();
        this._triggerExported(snapshot);
    }

    /**
     * Optional lifecycle hook for plugin authors to listen for hover events.
     * @param {string} id
     * @param {L.Layer} marker
     */
    _bindShapeHoverEvents(id, marker)
    {
        marker.on('mouseover', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:hover:start', { latlng: e.latlng, shape });
        });

        marker.on('mouseout', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:hover:end', { latlng: e.latlng, shape });
        });
    }

    /**
     * Optionally wire up keyboard events for plugin actions.
     * Call this once during init if needed.
     */
    _bindGlobalKeyboardEvents()
    {
        document.addEventListener('keydown', (e) =>
        {
            this.trigger('keyboard:down', { key: e.key, original: e });
        });

        document.addEventListener('keyup', (e) =>
        {
            this.trigger('keyboard:up', { key: e.key, original: e });
        });
    }

    /**
     * Optional double click support for canvas or shape.
     */
    _bindDoubleClickEvents()
    {
        this.map.on('dblclick', (e) =>
        {
            this.trigger('canvas:dblclick', { latlng: e.latlng });
        });
    }

    /**
     * Triggers shape double-click event.
     * @param {string} id
     * @param {L.Layer} marker
     */
    _bindShapeDoubleClick(id, marker)
    {
        marker.on('dblclick', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:dblclick', { latlng: e.latlng, shape });
        });
    }

    /**
     * Optional focus/blur event triggers (e.g. editing).
     * @param {string} id
     * @param {HTMLElement} el
     */
    _bindShapeTextFocusEvents(id, el)
    {
        el.addEventListener('focus', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:focus', { shape });
        });

        el.addEventListener('blur', (e) =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:blur', { shape });
        });
    }

    /**
     * Utility: Bind mouseover/mouseout for connection lines.
     * @param {string} id
     * @param {L.Polyline} line
     */
    _bindConnectionHoverEvents(id, line)
    {
        line.on('mouseover', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.trigger('connection:hover:start', { latlng: e.latlng, connection });
        });

        line.on('mouseout', (e) =>
        {
            const connection = this.getConnectionById(id);
            this.trigger('connection:hover:end', { latlng: e.latlng, connection });
        });
    }

    /**
     * Utility: bind resize observer to canvas container
     */
    _bindResizeObserver()
    {
        if (!this.map?._container) return;

        const observer = new ResizeObserver(() =>
        {
            this._triggerCanvasResize(this.map.getBounds());
        });

        observer.observe(this.map._container);
        this._resizeObserver = observer;
    }

    /**
     * Dispatch global event for plugin communication.
     * @param {string} type - User-defined message type
     * @param {Object} data - Payload to dispatch
     */
    broadcastPluginMessage(type, data = {})
    {
        this.trigger(`plugin:message:${type}`, data);
    }

    /**
     * Trigger custom validation before connection is created.
     * Can be intercepted by plugins using `connection:validate` event.
     * @param {Object} fromShape
     * @param {Object} toShape
     * @returns {boolean} whether to allow connection
     */
    _validateConnection(fromShape, toShape)
    {
        let valid = true;
        this.trigger('connection:validate', {
            from: fromShape,
            to: toShape,
            cancel: () => { valid = false; }
        });
        return valid;
    }

    /**
     * Plugin or UI-triggered command dispatch for command system.
     * @param {string} command
     * @param {*} payload
     */
    dispatchCommand(command, payload = {})
    {
        this.trigger(`command:${command}`, payload);
    }

    /**
     * General plugin hook utility.
     * Fires a scoped event with fallback if none registered.
     * @param {string} eventName
     * @param {Object} payload
     * @param {Function} fallback
     */
    runWithPluginHook(eventName, payload, fallback)
    {
        let called = false;
        this.trigger(eventName, 
        {
            ...payload,
            intercept: () => { called = true; }
        });

        if (!called && typeof fallback === 'function')
        {
            fallback();
        }
    }

    /**
     * Fires a redraw hint that plugins may use for scheduling.
     * Use case: labels or lines need refresh post drag.
     */
    requestPluginRedrawHint()
    {
        this.trigger('plugin:hint:redraw', {});
    }

    /**
     * Fires a plugin-safe debounce-ready hint for layout pass.
     * Plugins may respond with delayed behavior.
     */
    requestPluginLayoutHint()
    {
        this.trigger('plugin:hint:layout', {});
    }

    /**
     * Provides the full list of available event names
     * that plugins can register against.
     * @returns {string[]}
     */
    getAvailableEvents()
    {
        return [
            'shape:click',
            'shape:contextmenu',
            'shape:dblclick',
            'shape:moved',
            'shape:added',
            'shape:removed',
            'shape:updated',
            'shape:hover:start',
            'shape:hover:end',
            'shape:focus',
            'shape:blur',

            'connection:click',
            'connection:contextmenu',
            'connection:added',
            'connection:removed',
            'connection:updated',
            'connection:hover:start',
            'connection:hover:end',

            'label:click',
            'label:contextmenu',

            'canvas:click',
            'canvas:contextmenu',
            'canvas:zoom',
            'canvas:pan',
            'canvas:resize',
            'canvas:dblclick',

            'diagram:imported',
            'diagram:exported',

            'undo:applied',
            'redo:applied',

            'plugin:loaded',
            'plugin:unloaded',
            'plugin:hint:redraw',
            'plugin:hint:layout',

            'keyboard:down',
            'keyboard:up',

            'connection:validate'
        ];
    }

    /**
     * Debug utility: Logs all triggered events to console.
     * Useful for plugin development or introspection.
     */
    logAllEvents()
    {
        const logHandler = (eventName) => (payload) =>
        {
            console.debug(`[clsTailwindLeafletDiagram][event] ${eventName}:`, payload);
        };

        const events = this.getAvailableEvents();
        events.forEach(eventName => this.on(eventName, logHandler(eventName)));

        this._logAllEventsHandler = logHandler;
    }

    /**
     * Debug utility: Stops logging all triggered events.
     */
    unlogAllEvents()
    {
        if (!this._logAllEventsHandler) return;

        const events = this.getAvailableEvents();
        events.forEach(eventName => this.off(eventName, this._logAllEventsHandler(eventName)));

        delete this._logAllEventsHandler;
    }

    /**
     * Rebinds all shape, connection, and label events.
     * Called after redraws, imports, or state restoration.
     */
    _rebindAllInteractionEvents()
    {
        if (!this.shapes || !this.connectionLines) return;

        for (const shape of this.shapes)
        {
            if (shape.marker)
            {
                this._bindShapeEvents(shape.id, shape.marker);
                this._bindShapeHoverEvents(shape.id, shape.marker);
                this._bindShapeDoubleClick(shape.id, shape.marker);
            }
        }

        for (const conn of this.connectionLines)
        {
            if (conn._line)
            {
                this._bindConnectionEvents(conn.id, conn._line);
                this._bindConnectionHoverEvents(conn.id, conn._line);
            }

            if (conn._label)
            {
                this._bindLabelEvents(conn.id, conn._label);
            }
        }
    }

    /**
     * Automatically called during initialization
     * to wire canvas/map-level event listeners
     */
    _bindBaseEventLayer()
    {
        this._bindMapInteractionEvents();
        this._bindDoubleClickEvents();
        this._bindGlobalKeyboardEvents();
        this._bindResizeObserver();
    }

    /**
     * Public method to rebind all interaction listeners
     * Should be called after import, zoom, drag, or restore.
     */
    rebindEventListeners()
    {
        this._rebindAllInteractionEvents();
    }

    /**
     * Clears all shapes, connections, and layers.
     */
    clearAll()
    {
        (this.shapes || []).forEach(s => this.map.removeLayer(s.marker));
        (this.connectionLines || []).forEach(c =>
        {
            if (c._line) this.connectionLayer.removeLayer(c._line);
            if (c._label) this.labelLayer.removeLayer(c._label);
        });

        this.shapes = [];
        this.connectionLines = [];
        this.clearAllContextMenus();
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Helper to bulk bind shape label input element
     * for focus and blur (editable mode)
     * @param {string} id
     * @param {HTMLElement} labelInput
     */
    _bindShapeLabelInputEvents(id, labelInput)
    {
        if (!labelInput) return;

        labelInput.addEventListener('focus', () =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:focus', { shape });
        });

        labelInput.addEventListener('blur', () =>
        {
            const shape = this.getShapeById(id);
            this.trigger('shape:blur', { shape });
        });
    }

    /**
     * Emits user-defined plugin broadcast for tool injection
     * @param {string} type
     * @param {Object} data
     */
    broadcastToolInjection(type, data = {})
    {
        this.trigger(`plugin:tool:${type}`, data);
    }

    /**
     * Dispatches raw DOM event from map container
     * @param {string} domEventName
     * @param {Event} e
     */
    _triggerDomEvent(domEventName, e)
    {
        this.trigger(`dom:${domEventName}`, { original: e });
    }

    /**
     * Subscribes a plugin to filtered shape events
     * using a predicate function
     * @param {Function} predicateFn - (shape) => boolean
     * @param {Function} callbackFn - (shape, eventName) => void
     */
    onShapeEvent(predicateFn, callbackFn)
    {
        const events = [
            'shape:click',
            'shape:contextmenu',
            'shape:dblclick',
            'shape:moved',
            'shape:updated',
            'shape:focus',
            'shape:blur'
        ];

        events.forEach(eventName =>
        {
            this.on(eventName, ({ shape }) =>
            {
                if (predicateFn(shape)) callbackFn(shape, eventName);
            });
        });
    }

    /**
     * Subscribes a plugin to filtered connection events
     * @param {Function} predicateFn - (connection) => boolean
     * @param {Function} callbackFn - (connection, eventName) => void
     */
    onConnectionEvent(predicateFn, callbackFn)
    {
        const events = [
            'connection:click',
            'connection:contextmenu',
            'connection:updated'
        ];

        events.forEach(eventName =>
        {
            this.on(eventName, ({ connection }) =>
            {
                if (predicateFn(connection)) callbackFn(connection, eventName);
            });
        });
    }

    /**
     * Fires plugin trigger to inject custom editor sidebar tools
     * @param {string} slotName - e.g., 'leftPanel', 'rightPanel'
     * @param {Object} definition - tool definition object
     */
    injectEditorTool(slotName, definition)
    {
        this.trigger(`plugin:inject:tool:${slotName}`, definition);
    }

    /**
     * Allows registering event handlers with one-time auto-unbind
     * @param {string} eventName
     * @param {Function} handlerFn
     */
    once(eventName, handlerFn)
    {
        const wrapped = (...args) =>
        {
            handlerFn(...args);
            this.off(eventName, wrapped);
        };
        this.on(eventName, wrapped);
    }

    /**
     * Subscribes to a user-level error or warning event from plugins
     * @param {Function} callbackFn - ({ type, message }) => void
     */
    onPluginMessage(callbackFn)
    {
        this.on('plugin:message:error', callbackFn);
        this.on('plugin:message:warn', callbackFn);
        this.on('plugin:message:info', callbackFn);
    }

    /**
     * Broadcasts plugin-level error, warning, or info
     * @param {string} type - 'error' | 'warn' | 'info'
     * @param {string} message
     */
    postPluginMessage(type, message)
    {
        if (!['error', 'warn', 'info'].includes(type)) return;
        this.trigger(`plugin:message:${type}`, { type, message });
    }

    /**
     * Trigger plugin-detected shape highlight
     * @param {string} shapeId
     * @param {string} color - highlight color
     */
    highlightShape(shapeId, color = 'yellow')
    {
        const shape = this.getShapeById(shapeId);
        if (!shape || !shape.marker) return;

        shape.marker.getElement()?.style?.setProperty('outline', `2px solid ${color}`);
        this.trigger('shape:highlighted', { shape, color });
    }

    /**
     * Clear any plugin-applied shape highlights
     * @param {string} shapeId
     */
    clearHighlight(shapeId)
    {
        const shape = this.getShapeById(shapeId);
        if (!shape || !shape.marker) return;

        shape.marker.getElement()?.style?.removeProperty('outline');
        this.trigger('shape:highlight:cleared', { shape });
    }

    /**
     * Trigger plugin-detected label highlight
     * @param {string} connId
     * @param {string} color
     */
    highlightLabel(connId, color = 'orange')
    {
        const conn = this.getConnectionById(connId);
        if (!conn || !conn._label) return;

        conn._label.getElement()?.style?.setProperty('outline', `2px dashed ${color}`);
        this.trigger('label:highlighted', { connection: conn, color });
    }

    /**
     * Clears label highlight for a connection
     * @param {string} connId
     */
    clearLabelHighlight(connId)
    {
        const conn = this.getConnectionById(connId);
        if (!conn || !conn._label) return;

        conn._label.getElement()?.style?.removeProperty('outline');
        this.trigger('label:highlight:cleared', { connection: conn });
    }

    /**
     * Programmatically trigger a flash effect on a shape
     * @param {string} shapeId
     * @param {string} color - flash color
     */
    flashShape(shapeId, color = 'red')
    {
        const shape = this.getShapeById(shapeId);
        if (!shape || !shape.marker) return;

        const el = shape.marker.getElement();
        if (!el) return;

        el.style.transition = 'outline 0.3s';
        el.style.outline = `3px solid ${color}`;

        setTimeout(() => {
            el.style.outline = 'none';
            this.trigger('shape:flashed', { shape, color });
        }, 600);
    }

    /**
     * Plugin API call to shake a shape visually
     * @param {string} shapeId
     */
    shakeShape(shapeId)
    {
        const shape = this.getShapeById(shapeId);
        if (!shape || !shape.marker) return;

        const el = shape.marker.getElement();
        if (!el) return;

        el.classList.add('animate-shake');
        setTimeout(() => el.classList.remove('animate-shake'), 700);
        this.trigger('shape:shaken', { shape });
    }

    /**
     * Plugin API to draw a temporary shape outline overlay
     * Useful for validation or guidance
     * @param {Object} shape - Shape object
     * @param {string} color
     * @param {number} duration - milliseconds
     */
    drawShapeOverlay(shape, color = 'lime', duration = 1200)
    {
        if (!shape?.latlng || !shape?.size) return;

        const bounds = this._getShapeBounds(shape);
        const rect = L.rectangle(bounds, {
            color,
            weight: 2,
            dashArray: '4 2',
            fillOpacity: 0
        }).addTo(this.map);

        this.trigger('shape:overlayed', { shape, color });

        setTimeout(() => this.map.removeLayer(rect), duration);
    }

    /**
     * Plugin API to display a blinking dot (marker) at location
     * @param {L.LatLng} latlng
     * @param {string} color
     * @param {number} duration
     */
    showBlinkMarker(latlng, color = 'blue', duration = 1000)
    {
        const div = document.createElement('div');
        div.className = 'animate-ping w-3 h-3 rounded-full';
        div.style.backgroundColor = color;

        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: '',
                html: div,
                iconSize: [10, 10]
            })
        }).addTo(this.map);

        setTimeout(() => this.map.removeLayer(marker), duration);
        this.trigger('marker:blinked', { latlng, color });
    }

    /**
     * Plugin API to flash a connection line
     * @param {string} connId
     * @param {string} color
     */
    flashConnection(connId, color = 'magenta')
    {
        const conn = this.getConnectionById(connId);
        if (!conn || !conn._line) return;

        const el = conn._line.getElement();
        if (!el) return;

        el.style.transition = 'stroke 0.3s';
        el.style.stroke = color;

        setTimeout(() =>
        {
            el.style.stroke = '';
            this.trigger('connection:flashed', { connection: conn, color });
        }, 600);
    }

    /**
     * Plugin broadcast on general user interaction
     * Used for passive tracking by extensions
     * @param {string} action
     * @param {Object} context
     */
    logUserInteraction(action, context = {})
    {
        this.trigger(`user:interaction:${action}`, context);
    }

    /**
     * Plugin API to force redraw of a shape's label
     * @param {string} shapeId
     */
    refreshShapeLabel(shapeId)
    {
        const shape = this.getShapeById(shapeId);
        if (!shape || !shape.marker) return;
        const el = shape.marker.getElement();
        if (!el) return;

        el.classList.remove('hidden');
        void el.offsetWidth;
        el.classList.add('hidden');
        void el.offsetWidth;
        el.classList.remove('hidden');
        this.trigger('shape:label:refreshed', { shape });
    }

    /**
     * Public wrapper to forcibly redraw all connection labels
     */
    refreshAllConnectionLabels()
    {
        for (const conn of this.connectionLines)
        {
            if (conn._label && conn._label.getElement())
            {
                const el = conn._label.getElement();
                el.classList.remove('hidden');
                void el.offsetWidth;
                el.classList.add('hidden');
                void el.offsetWidth;
                el.classList.remove('hidden');
            }
        }
        this.trigger('label:all:refreshed');
    }

    /**
     * Returns all connection labels missing text.
     * @returns {Array} List of connection IDs
     */
    getEmptyLabels()
    {
        return this.connectionLines.filter(c => !c.label || c.label.trim() === '').map(c => c.id);
    }

    /**
     * Clears all labels from connections.
     */
    clearAllLabels()
    {
        this.connectionLines.forEach(conn =>
        {
            if (conn._label)
            {
                this.labelLayer.removeLayer(conn._label);
                conn._label = null;
            }
            conn.label = '';
        });
    }

    /**
     * Forces rebind of all label context menus.
     */
    rebindAllLabelMenus()
    {
        this.connectionLines.forEach(conn =>
        {
            this._rebindLabelContextMenu(conn);
        });
    }

    /**
     * Validates label text length and flags any exceeding limit.
     * @param {number} maxChars - Max allowed characters
     * @returns {Array} Connection IDs with too long labels
     */
    validateLabelLengths(maxChars = 50)
    {
        return this.connectionLines
            .filter(conn => (conn.label?.length || 0) > maxChars)
            .map(conn => conn.id);
    }

    /**
     * Detects all shape pairs that intersect.
     * @returns {Array} Array of [shapeA, shapeB] pairs
     */
    getOverlappingShapePairs()
    {
        const overlaps = [];
        for (let i = 0; i < this.shapes.length; i++)
        {
            for (let j = i + 1; j < this.shapes.length; j++)
            {
                const a = this.shapes[i];
                const b = this.shapes[j];
                if (a.marker.getBounds().intersects(b.marker.getBounds()))
                {
                    overlaps.push([a, b]);
                }
            }
        }
        return overlaps;
    }

    /**
     * Highlights all overlapping shape pairs.
     */
    highlightAllOverlaps()
    {
        const pairs = this.getOverlappingShapePairs();
        const unique = new Set(pairs.flat());

        unique.forEach(shape =>
        {
            this.flashShape(shape.id, 'crimson');
        });
    }

    /**
     * Adds a temporary visual outline around overlapping shapes.
     */
    showOverlapOutlines()
    {
        const overlaps = this.getOverlappingShapePairs();
        const unique = new Set(overlaps.flat());

        unique.forEach(shape =>
        {
            this.drawShapeOverlay(shape, 'red', 2000);
        });
    }

    /**
     * Groups shapes by overlapping sets.
     * @returns {Array[]} Array of shape arrays
     */
    getOverlapGroups()
    {
        const groups = [];
        const visited = new Set();

        const dfs = (shape, group) =>
        {
            visited.add(shape);
            group.push(shape);

            for (const other of this.shapes)
            {
                if (!visited.has(other) && shape.marker.getBounds().intersects(other.marker.getBounds()))
                {
                    dfs(other, group);
                }
            }
        };

        for (const shape of this.shapes)
        {
            if (!visited.has(shape))
            {
                const group = [];
                dfs(shape, group);
                if (group.length > 1) groups.push(group);
            }
        }

        return groups;
    }

    /**
     * Returns routing type breakdown for all connections.
     * @returns {Object} Counts of connection types
     */
    getConnectionTypeStats()
    {
        const stats = {};
        this.connectionLines.forEach(conn =>
        {
            const type = conn.type || 'unknown';
            stats[type] = (stats[type] || 0) + 1;
        });
        return stats;
    }

    /**
     * Sets all connections to a given type (e.g., 'elbow').
     * @param {string} type
     */
    forceConnectionType(type = 'straight')
    {
        this.connectionLines.forEach(conn =>
        {
            this.updateConnection(conn.id, { type });
        });
    }

    /**
     * Highlights connections by type using color mapping.
     * @param {Object} colorMap - e.g. { straight: 'green', elbow: 'blue' }
     */
    highlightConnectionsByType(colorMap = {})
    {
        this.connectionLines.forEach(conn =>
        {
            const color = colorMap[conn.type];
            if (color)
            {
                this.flashConnection(conn.id, color);
            }
        });
    }

    /**
     * Validates connection anchor sides and logs auto-resolved ones.
     * @returns {Array} Connection IDs with 'auto' sides
     */
    validateAnchorSides()
    {
        return this.connectionLines.filter(conn =>
            conn.fromSide === 'auto' || conn.toSide === 'auto'
        ).map(conn => conn.id);
    }

    /**
     * Adds a label to a connection if it has none.
     * @param {string} id - Connection ID
     * @param {string} labelText - Text to add
     */
    addLabelIfMissing(id, labelText = 'Label')
    {
        const conn = this.getConnectionById(id);
        if (!conn || conn.label) return;

        conn.label = labelText;
        this.recalculateAllConnections();
        this._pushUndo({ action: 'addConnectionLabel', connection: conn });
    }

    /**
     * Returns connection IDs with labels but missing `_label` markers.
     * @returns {string[]} List of connection IDs
     */
    getLabelMarkerMismatches()
    {
        return this.connectionLines
            .filter(conn => conn.label && !conn._label)
            .map(conn => conn.id);
    }

    /**
     * Ensures all labeled connections have visual markers.
     */
    fixMissingLabelMarkers()
    {
        this.connectionLines.forEach(conn =>
        {
            if (conn.label && !conn._label)
            {
                const { start, end } = this._getConnectionPoints(
                    this.getShapeById(conn.from),
                    this.getShapeById(conn.to),
                    conn.fromSide, conn.toSide
                );

                const path = this._calculateConnectionPath(start, end, conn.type);
                const midPoint = path[Math.floor(path.length / 2)];
                const label = L.marker(midPoint, { icon: this._createLabelIcon(conn), interactive: true })
                    .addTo(this.labelLayer);

                this._bindLabelEvents(conn.id, label);
                conn._label = label;
            }
        });
    }

    /**
     * Clears all connection labels and resets visual elements.
     */
    resetAllLabels()
    {
        this.connectionLines.forEach(conn =>
        {
            if (conn._label) this.labelLayer.removeLayer(conn._label);
            conn._label = null;
            conn.label = '';
        });
    }

    /**
     * Recalculates connection lines only for a specific shape.
     * @param {string} shapeId
     */
    recalculateConnectionsForShape(shapeId)
    {
        const relevant = this.connectionLines.filter(conn =>
            conn.from === shapeId || conn.to === shapeId
        );

        relevant.forEach(conn =>
        {
            this._drawConnection(conn);
        });
    }

    /**
     * Removes all label layers (visual only).
     */
    clearLabelLayer()
    {
        this.labelLayer.clearLayers();
        this.connectionLines.forEach(conn => conn._label = null);
    }

    /**
     * Forces redraw of all connections and labels.
     */
    recalculateAllConnections()
    {
        this.clearConnectionLayer();
        this.clearLabelLayer();
        this.connectionLines.forEach(conn =>
        {
            this._drawConnection(conn);
        });
    }

    /**
     * Removes all connection layers and markers.
     */
    clearConnectionLayer()
    {
        if (!this.connectionLayer) return; 
        this.connectionLayer.clearLayers();
    }

    /**
     * Returns all shapes of a specific type.
     * @param {string} type
     * @returns {Array} Matching shape objects
     */
    getShapesByType(type)
    {
        return this.shapes.filter(s => s.type === type);
    }

    /**
     * Filters shapes by text content match.
     * @param {string} text - Case-insensitive substring to search
     * @returns {Array} Matching shape objects
     */
    searchShapesByText(text)
    {
        const query = text.toLowerCase();
        return this.shapes.filter(s =>
            (s.title && s.title.toLowerCase().includes(query)) ||
            (s.body && s.body.toLowerCase().includes(query))
        );
    }

    /**
     * Highlights shapes with a given type.
     * @param {string} type
     * @param {string} color - highlight color
     */
    highlightShapesByType(type, color = 'yellow')
    {
        this.getShapesByType(type).forEach(s =>
        {
            this.flashShape(s.id, color);
        });
    }

    /**
     * Highlights shapes matching a text string.
     * @param {string} text - Text to match
     * @param {string} color - highlight color
     */
    highlightShapesByText(text, color = 'lime')
    {
        this.searchShapesByText(text).forEach(s =>
        {
            this.flashShape(s.id, color);
        });
    }

    /**
     * Align shapes based on a specific direction.
     * @param {string} direction - 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle'
     */
    alignShapes(direction)
    {
        const positions = this.shapes.map(s => s.latlng);
        if (positions.length === 0) return;

        let targetLat = 0, targetLng = 0;
        if (['left', 'right', 'center'].includes(direction))
        {
            targetLng = Math[direction === 'left' ? 'min' : direction === 'right' ? 'max' : 'round'](
                ...positions.map(p => p.lng)
            );
        }
        if (['top', 'bottom', 'middle'].includes(direction))
        {
            targetLat = Math[direction === 'top' ? 'max' : direction === 'bottom' ? 'min' : 'round'](
                ...positions.map(p => p.lat)
            );
        }

        this.shapes.forEach(shape =>
        {
            const newLatLng =
            {
                lat: ['top', 'bottom', 'middle'].includes(direction) ? targetLat : shape.latlng.lat,
                lng: ['left', 'right', 'center'].includes(direction) ? targetLng : shape.latlng.lng
            };
            shape.latlng = newLatLng;
            if (shape.marker) shape.marker.setLatLng(newLatLng);
        });

        this.recalculateAllConnections();
    }

    /**
     * Evenly distribute shapes along a given axis.
     * @param {string} direction - 'horizontal' | 'vertical'
     */
    distributeShapes(direction)
    {
        const axis = direction === 'horizontal' ? 'lng' : 'lat';
        const sorted = [...this.shapes].sort((a, b) => a.latlng[axis] - b.latlng[axis]);
        const start = sorted[0].latlng[axis];
        const end = sorted[sorted.length - 1].latlng[axis];

        const step = (end - start) / (sorted.length - 1);
        sorted.forEach((shape, i) =>
        {
            shape.latlng[axis] = start + step * i;
            if (shape.marker) shape.marker.setLatLng(shape.latlng);
        });

        this.recalculateAllConnections();
    }

    /**
     * Move the entire diagram by a delta in latitude and longitude.
     * @param {number} dLat - Latitude delta
     * @param {number} dLng - Longitude delta
     */
    moveDiagram(dLat, dLng)
    {
        this.shapes.forEach(shape =>
        {
            shape.latlng.lat += dLat;
            shape.latlng.lng += dLng;
            if (shape.marker) shape.marker.setLatLng(shape.latlng);
        });

        this.recalculateAllConnections();

        //this._pushUndo({ action: 'moveDiagram', latOffset, lngOffset });
    }

    /**
     * Returns center point of all shapes.
     * @returns {L.LatLng}
     */
    getDiagramCenter()
    {
        const bounds = L.latLngBounds(this.shapes.map(s => s.latlng));
        return bounds.getCenter();
    }

    /**
     * Adds a context menu item to the given scope.
     * @param {string} scopeType - 'canvas', 'shape', or 'connection'
     * @param {Object} item - Context menu item definition
     */
    addContextMenuItem(scopeType, item)
    {
        if (!this.contextMenuOverrides[scopeType])
        {
            this.contextMenuOverrides[scopeType] = [];
        }
        this.contextMenuOverrides[scopeType].push(item);
    }

    /**
     * Remove a context menu item by label or ID from a specific context type.
     * This version is recursive, removing nested submenu entries if necessary.
     * @param {string} type - The scope type: 'canvas' | 'shape' | 'connection' | 'connectionLabel'
     * @param {string} labelOrId - The label or identifier of the menu item to remove
     */
    removeContextMenuItem(type, labelOrId)
    {
        const contextItems = this.contextMenuOverrides[type];
        if (!Array.isArray(contextItems)) return;

        const recursiveFilter = (items) =>
        {
            return items.filter(item =>
            {
                if (item.submenu)
                {
                    item.submenu = recursiveFilter(item.submenu);
                }

                return item.text !== labelOrId && item.label !== labelOrId;
            });
        };

        this.contextMenuOverrides[type] = recursiveFilter(contextItems);
    }

    /**
     * Returns context menu items currently assigned to a scope.
     * @param {string} scopeType
     * @returns {Array} Context menu item array
     */
    getContextMenuItems(scopeType)
    {
        return this.contextMenuOverrides[scopeType] || [];
    }

    /**
     * Clears all context menu overrides for all scopes.
     */
    clearAllContextMenus()
    {
        this.contextMenuOverrides = {
            canvas: [],
            shape: [],
            connection: []
        };
    }

    /**
     * Utility method to trigger delayed plugin event
     * @param {string} eventName
     * @param {Object} payload
     * @param {number} delayMs
     */
    triggerDelayed(eventName, payload = {}, delayMs = 300)
    {
        setTimeout(() =>
        {
            this.trigger(eventName, payload);
        }, delayMs);
    }

    /**
     * Fires shape bounding box change (e.g., after resize)
     * @param {string} id
     */
    _triggerShapeBoundsChanged(id)
    {
        const shape = this.getShapeById(id);
        if (!shape) return;
        this.trigger('shape:bounds', { shape });
    }

    /**
     * Emits when all diagram elements finish loading or restoring
     */
    _triggerDiagramReady()
    {
        this.trigger('diagram:ready');
    }

    /**
     * Emits event when zoom level changes
     * Internal map binding required
     */
    _bindZoomChange()
    {
        this.map.on('zoomend', () =>
        {
            const center = this.map.getCenter();
            const zoom = this.map.getZoom();
            this.trigger('canvas:zoom', { center, zoom });
        });
    }

    /**
     * Emits event when pan/drag ends
     */
    _bindPanChange()
    {
        this.map.on('moveend', () =>
        {
            const center = this.map.getCenter();
            this.trigger('canvas:pan', { center });
        });
    }

    /**
     * Binds both zoom and pan listeners
     */
    _bindZoomPanListeners()
    {
        this._bindZoomChange();
        this._bindPanChange();
    }

    /**
     * Binds contextmenu event to map canvas
     * Fires plugin-ready right-click hook
     */
    _bindCanvasContextMenu()
    {
        // this.map.on('contextmenu', (e) =>
        // {
        //     this.trigger('canvas:contextmenu', {
        //         latlng: e.latlng
        //     });
        // });
    }

    /**
     * Binds general click event to map canvas
     */
    _bindCanvasClick()
    {
        this.map.on('click', (e) =>
        {
            this.trigger('canvas:click', {
                latlng: e.latlng
            });
        });
    }

    /**
     * Aggregates all base-level map listeners into single call
     */
    _bindMapInteractionEvents()
    {
        this._bindCanvasClick();
        this._bindCanvasContextMenu();
        this._bindZoomPanListeners();
    }




    /**
     * Events End
     * */
}