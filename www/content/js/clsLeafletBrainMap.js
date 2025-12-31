/**
 * clsLeafletBrainMap
 * A Leaflet-based class to visualize and interact with idea maps
 * Supports block creation, dragging, connecting, grouping, redistribution, and exporting
 */
class clsLeafletBrainMap
{
  /**
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.containerEl - Element to attach the map to
   */
  constructor({ containerEl })
  {
    this.containerEl = containerEl;
    this.blocks = {};
    this.connections = [];
    this.containers = {};

    this.map = L.map(this.containerEl,
    {
      crs: L.CRS.Simple,
      zoomControl: true,
      minZoom: -5,
      maxZoom: 2,
      attributionControl: false
    }).setView([0, 0], 0);

    const bounds = [[-10000, -10000], [10000, 10000]];
    this.map.setMaxBounds(bounds);

    this.canvasLayer = L.layerGroup().addTo(this.map);

    this._initContextMenu();
  }

  /**
   * Initialize right-click context menu
   */
  _initContextMenu()
  {
    this.map.on('contextmenu', (e) =>
    {
      this._showMapContextMenu(e);
    });
  }

  /**
   * Show context menu at clicked location
   */
  _showMapContextMenu(e)
  {
    // Basic example, can be replaced with a better menu system
    const existing = document.getElementById('brainmap-context');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'brainmap-context';
    menu.style.position = 'absolute';
    menu.style.left = `${e.originalEvent.clientX}px`;
    menu.style.top = `${e.originalEvent.clientY}px`;
    menu.className = 'bg-white border border-gray-400 p-2 rounded shadow text-sm space-y-1 z-50';
    menu.innerHTML = `
      <button onclick="window.brainMapUI.addIdea(${e.latlng.lat}, ${e.latlng.lng})">Add Idea</button><br>
      <button onclick="window.brainMapUI.redistribute('grid')">Redistribute (Grid)</button><br>
      <button onclick="document.getElementById('brainmap-context').remove()">Cancel</button>
    `;
    document.body.appendChild(menu);
  }

  /**
   * Load data from JSON
   * @param {Object} data - JSON data with blocks, connections, containers
   */
  loadFromJson(data)
  {
    this.clear();

    if (data.containers)
    {
      for (const container of data.containers)
      {
        this.addContainer(container);
      }
    }

    if (data.blocks)
    {
      for (const block of data.blocks)
      {
        this.addBlock(block);
      }
    }

    if (data.connections)
    {
      for (const conn of data.connections)
      {
        this.connectBlocks(conn);
      }
    }
  }

  /**
   * Export current state to JSON
   * @returns {Object}
   */
  exportToJson()
  {
    return {
      blocks: Object.values(this.blocks).map(b => b.data),
      connections: this.connections.map(c => ({ ...c.data })),
      containers: Object.values(this.containers).map(c => c.data)
    };
  }

  /**
   * Add an idea block
   * @param {Object} block
   */
  addBlock(block)
  {
    const id = block.id || crypto.randomUUID();
    const latlng = this.map.unproject([block.x || 0, block.y || 0]);
    const marker = L.marker(latlng,
    {
      draggable: true
    }).addTo(this.canvasLayer);

    marker.bindTooltip(block.title, { permanent: true, direction: 'right' });

    marker.on('dragend', () =>
    {
      const point = this.map.project(marker.getLatLng());
      this.blocks[id].data.x = point.x;
      this.blocks[id].data.y = point.y;
      this.redrawConnections();
    });

    marker.on('contextmenu', (e) =>
    {
      const existing = document.getElementById('brainmap-context');
      if (existing) existing.remove();

      const menu = document.createElement('div');
      menu.id = 'brainmap-context';
      menu.style.position = 'absolute';
      menu.style.left = `${e.originalEvent.clientX}px`;
      menu.style.top = `${e.originalEvent.clientY}px`;
      menu.className = 'bg-white border border-gray-400 p-2 rounded shadow text-sm space-y-1 z-50';
      menu.innerHTML = `
        <button onclick="window.brainMapUI.removeBlock('${id}')">Remove</button><br>
        <button onclick="window.brainMapUI.renameBlock('${id}')">Rename</button><br>
        <button onclick="window.brainMapUI.startConnection('${id}')">New Connection</button><br>
        <button onclick="document.getElementById('brainmap-context').remove()">Cancel</button>
      `;
      document.body.appendChild(menu);
    });

    this.blocks[id] = {
      id,
      marker,
      data: {
        id,
        title: block.title || 'Untitled',
        text: block.text || '',
        x: block.x || 0,
        y: block.y || 0,
        group: block.group || null
      }
    };
  }

  /**
   * Remove a block
   * @param {string} id
   */
  removeBlock(id)
  {
    const block = this.blocks[id];
    if (!block) return;
    this.canvasLayer.removeLayer(block.marker);
    delete this.blocks[id];
    this.connections = this.connections.filter(c =>
    {
      if (c.fromId === id || c.toId === id)
      {
        this.canvasLayer.removeLayer(c.polyline);
        return false;
      }
      return true;
    });
  }

  /**
   * Rename a block (prompt)
   * @param {string} id
   */
  renameBlock(id)
  {
    const block = this.blocks[id];
    if (!block) return;
    const newTitle = prompt('New title:', block.data.title);
    if (newTitle)
    {
      block.data.title = newTitle;
      block.marker.setTooltipContent(newTitle);
    }
  }

  /**
   * Start a new connection from a block
   * @param {string} fromId
   */
  startConnection(fromId)
  {
    alert(`Click another block to complete connection from ${fromId}`);
    this.map.once('click', (e) =>
    {
      const toBlock = Object.values(this.blocks).find(b => b.marker.getLatLng().equals(e.latlng));
      if (toBlock && toBlock.id !== fromId)
      {
        this.connectBlocks({ from: fromId, to: toBlock.id });
      }
    });
  }

  /**
   * Connect two blocks
   * @param {Object} conn
   */
  connectBlocks(conn)
  {
    const from = this.blocks[conn.from];
    const to = this.blocks[conn.to];
    if (!from || !to) return;

    const polyline = L.polyline([
      from.marker.getLatLng(),
      to.marker.getLatLng()
    ], { color: 'black' }).addTo(this.canvasLayer);

    polyline.on('contextmenu', (e) =>
    {
      const existing = document.getElementById('brainmap-context');
      if (existing) existing.remove();

      const menu = document.createElement('div');
      menu.id = 'brainmap-context';
      menu.style.position = 'absolute';
      menu.style.left = `${e.originalEvent.clientX}px`;
      menu.style.top = `${e.originalEvent.clientY}px`;
      menu.className = 'bg-white border border-gray-400 p-2 rounded shadow text-sm space-y-1 z-50';
      menu.innerHTML = `
        <button onclick="window.brainMapUI.removeConnection('${conn.from}', '${conn.to}')">Delete Connection</button><br>
        <button onclick="document.getElementById('brainmap-context').remove()">Cancel</button>
      `;
      document.body.appendChild(menu);
    });

    this.connections.push({
      fromId: conn.from,
      toId: conn.to,
      data: {
        from: conn.from,
        to: conn.to,
        type: conn.type || 'single',
        route: conn.route || 'straight'
      },
      polyline
    });
  }

  /**
   * Remove connection between two IDs
   */
  removeConnection(fromId, toId)
  {
    this.connections = this.connections.filter(c =>
    {
      if (c.fromId === fromId && c.toId === toId)
      {
        this.canvasLayer.removeLayer(c.polyline);
        return false;
      }
      return true;
    });
  }

  /**
   * Add a group/container
   * @param {Object} container
   */
  addContainer(container)
  {
    const id = container.id || crypto.randomUUID();
    const group = {
      id,
      data: {
        id,
        title: container.title || 'Group',
        x: container.x || 0,
        y: container.y || 0,
        blocks: container.blocks || []
      }
    };
    this.containers[id] = group;
  }

  /**
   * Clear all blocks and connections
   */
  clear()
  {
    this.canvasLayer.clearLayers();
    this.blocks = {};
    this.connections = [];
    this.containers = {};
  }

  /**
   * Redraw all connection lines
   */
  redrawConnections()
  {
    for (const conn of this.connections)
    {
      const from = this.blocks[conn.fromId]?.marker.getLatLng();
      const to = this.blocks[conn.toId]?.marker.getLatLng();
      if (from && to)
      {
        conn.polyline.setLatLngs([from, to]);
      }
    }
  }

  /**
   * Redistribute blocks in a chosen layout
   * @param {string} method
   */
  redistribute(method)
  {
    const keys = Object.keys(this.blocks);
    const spacing = 150;
    const centerX = 0;
    const centerY = 0;

    if (method === 'grid')
    {
      const cols = Math.ceil(Math.sqrt(keys.length));
      keys.forEach((id, i) =>
      {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = centerX + col * spacing;
        const y = centerY + row * spacing;
        const latlng = this.map.unproject([x, y]);
        this.blocks[id].marker.setLatLng(latlng);
        this.blocks[id].data.x = x;
        this.blocks[id].data.y = y;
      });
      this.redrawConnections();
    }
    // Additional methods (circular, fishbone, etc.) can be implemented
  }
}

// For UI event delegation (optional external binding)
window.brainMapUI = {
  addIdea: (lat, lng) =>
  {
    const point = window.brainMap.map.project([lat, lng]);
    window.brainMap.addBlock({ title: 'New Idea', text: '', x: point.x, y: point.y });
    document.getElementById('brainmap-context')?.remove();
  },
  removeBlock: id => window.brainMap.removeBlock(id),
  renameBlock: id => window.brainMap.renameBlock(id),
  startConnection: id => window.brainMap.startConnection(id),
  removeConnection: (from, to) => window.brainMap.removeConnection(from, to),
  redistribute: method => window.brainMap.redistribute(method)
};



/**
Do everything in core Leaflet unless one of these becomes necessary:
leaflet-draw: for editable connectors (optional)
leaflet-contextmenu: for simplified right-click menus (optional but useful)

Remaining Enhancements (Optional but Juicy):
Connection Routing Types:

Support blocky or autoroute modes via Bézier curves or polylines with kinks

Additional Redistribute Layouts:

circular, vertical, fishbone, linear, best-fit

Visual Group Rendering:

Show containers/groups as boxes or background outlines

Snap-to-Grid and Guidelines

Z-Index Management:

Bring blocks or lines forward/back for clarity

Undo/Redo Stack (😈 you know you want it)

*/