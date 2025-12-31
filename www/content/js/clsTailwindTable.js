/**
 * 
 * Depends on clsTailwindPagination.js
 */
class clsTailwindTable extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement} [options.containerEl] Existing element for the wrapper
     * @param {string} [options.tag] Tag for wrapper if no containerEl (default: 'div')
     * @param {Array} [options.classes] Additional wrapper classes
     * @param {Array|String} [options.data] JSON array or CSV string
     * @param {Array} [options.searchColumns] Columns to include in search (default: all)
     * @param {Function} [options.onRowCreated] Callback(rowEl, rowData, rowIndex)
     * @param {Function} [options.onCellCreated] Callback(cellEl, cellValue, rowData, rowIndex, colIndex)
     */
    constructor(options = {})
    {
        super({
            containerEl: options.containerEl,
            tag: options.tag || 'div',
            classes: [].concat(options.classes || [])
        });

        this.element.classList.add('clsTailwindTable');

        this.headerSorts = [];

        this.options = options;
        this.data = [];
        this.filteredData = [];
        this.columns = [];
        this.showRowNumbers = options.showRowNumbers || false;
        this.enableCSVExport = options.enableCSVExport || false;
        this.enableFilters = options.enableFilters || false;
        this.showFilters = false;
        this.sortState = {};
        this.searchTerm = '';
        this.searchColumns = Array.isArray(options.searchColumns) ? options.searchColumns : [];
        this._columnFilters = {};
        this.callbacks = {
            onRowCreated: options.onRowCreated,
            onCellCreated: options.onCellCreated
        };

        this.pagination;
        this.paginationEl;
        this.itemsPerPage;
        this.currentPage;

        if (options.pagination)
        {
            this.paginationEl = document.createElement('div');

            this.pagination = new clsTailwindPagination({
                containerEl: this.paginationEl,
                totalRecords: 0,
                itemsPerPage: options.pagination.itemsPerPage || 10,
                currentPage: 1,
                onPageChanged: (newPage) => this._renderBody()
            });

            this.itemsPerPage = this.pagination.itemsPerPage || 10;
            this.currentPage = 1;
        }
        else
        {
            this.pagination = null;
        }

        this._initTable();

        if (options.data)
        {
            this.loadData(options.data);
        }
    }

    /**
     * Convert CSV string to JSON array
     * @param {string} csvString
     * @returns {Array<Object>}
     */
    static csvToJson(csvString)
    {
        const lines = csvString.trim().split(/\r?\n/);
        const headers = lines.shift().split(',').map(h => h.trim());
        return lines.map(line =>
        {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((h, i) =>
            {
                obj[h] = values[i] || '';
            });
            return obj;
        });
    }

    _initTable()
    {
        // Create table
        this.tableEl = document.createElement('table');
        this.element.appendChild(this.tableEl);

        // Header
        this.thead = document.createElement('thead');
        this.tableEl.appendChild(this.thead);

        // Body
        this.tbody = document.createElement('tbody');
        this.tableEl.appendChild(this.tbody);

        this._renderResetButton();

        if (this.enableCSVExport)
        {
            this._renderExportButton();
        }

        if(this.enableFilters)
        {
            this._renderFilterButton();
        }

        if (this.options.pagination && this.paginationEl)
        {
            this.tableEl.parentElement.classList.add('no-scrollbar');
            this.tableEl.parentElement.append(this.paginationEl);   
        }
    }

    /**
     * Load data into table
     * @param {Array|String} data JSON array or CSV string
     */
    loadData(data)
    {
        if (typeof data === 'string')
        {
            this.data = clsTailwindTable.csvToJson(data);
        }
        else if (Array.isArray(data))
        {
            this.data = data;
        }
        else
        {
            throw new Error('Data must be a JSON array or CSV string');
        }

        if (this.data.length > 0)
        {
            this.columns = Object.keys(this.data[0]);
        }

        this.filteredData = [...this.data];

        this.clearSearch();

        if (this.pagination)
        {
            this.pagination.setTotalRecords(this.filteredData.length);
            this.currentPage = this.pagination.getValue();
        }

        this._renderHeader();
        this._renderBody();
    }

    _renderHeader()
    {
        this.thead.innerHTML = '';
        this._columnFilters = {};

        const headerRow = document.createElement('tr');

        if (this.showRowNumbers)
        {
            const th = document.createElement('th');
            th.textContent = '#';
            headerRow.appendChild(th);
        }

        this.columns.forEach(col =>
        {
            // Header cell
            const th = document.createElement('th');

            // Filter input
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Filter';
            input.value = ''; // Ensure no garbage/default value
            input.classList.add('hidden');
            this._columnFilters[col] = ''; // Reset clean
            input.addEventListener('input', e =>
            {
                const val = e.target.value.trim();
                this._columnFilters[col] = val;
                this._applyFiltersAndSearch();
            });

            // wrap the header label + filter input
            const wrapper = document.createElement('div');
            wrapper.classList.add('head-wrapper');

            let sortIcon = document.createElement('i');
            sortIcon.classList.add('sortIcon');
            //kfi-arrow-carrot-1-down

            this.headerSorts.push(sortIcon);

            const label = document.createElement('span');
            label.textContent = col;
            //label.classList.add();
            label.addEventListener('click', () =>
            {
                this.headerSorts.forEach((headerSort) =>
                {
                    headerSort.ariaLabel = 'Sort';
                    headerSort.classList.remove('kfi-arrow-carrot-1-up');
                    headerSort.classList.remove('kfi-arrow-carrot-1-down');
                    headerSort.classList.remove('kfi-arrow-carrot-up-down');
                    headerSort.classList.add('kfi-arrow-carrot-up-down');
                });

                let direction = this.sortBy(col);
                if(direction === 'asc')
                {
                    sortIcon.ariaLabel = 'Sort Desc';
                    sortIcon.classList.remove('kfi-arrow-carrot-up-down');
                    //sortIcon.classList.remove('kfi-arrow-carrot-1-up');
                    sortIcon.classList.add('kfi-arrow-carrot-1-down');
                }
                else
                {
                    sortIcon.ariaLabel = 'Sort Asc';
                    sortIcon.classList.remove('kfi-arrow-carrot-up-down');
                    //sortIcon.classList.remove('kfi-arrow-carrot-1-down');
                    sortIcon.classList.add('kfi-arrow-carrot-1-up');
                }
            });
            label.appendChild(sortIcon);

            this.headerSorts.forEach((headerSort) =>
            {
                headerSort.ariaLabel = 'Sort';
                headerSort.classList.remove('kfi-arrow-carrot-1-up');
                headerSort.classList.remove('kfi-arrow-carrot-1-down');
                headerSort.classList.remove('kfi-arrow-carrot-up-down');
                headerSort.classList.add('kfi-arrow-carrot-up-down');
            });

            wrapper.appendChild(label);
            wrapper.appendChild(input);

            // put the wrapper into the <th>, then into the row
            th.appendChild(wrapper);
            headerRow.appendChild(th);
        });

        this.thead.appendChild(headerRow);
    }

    _renderBody()
    {
        this.tbody.innerHTML = '';

        let pageData = this.filteredData;

        if (this.pagination)
        {
            this.currentPage = this.pagination.getValue();
            const itemsPerPage = this.pagination.getItemsPerPage() || 10;
            const start = (this.currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            pageData = pageData.slice(start, end);
        }

        //this.filteredData.forEach((rowData, rowIndex) =>
        pageData.forEach((rowData, rowIndex) =>
        {
            const tr = document.createElement('tr');
            const even = rowIndex % 2 === 1;

            if (this.showRowNumbers)
            {
                const td = document.createElement('td');
                let index = rowIndex;

                if (this.pagination)
                {
                    const itemsPerPage = this.pagination.getItemsPerPage() || 10;
                    index = (this.currentPage - 1) * itemsPerPage + rowIndex;
                }

                td.textContent = index + 1;
                tr.appendChild(td);
            }

            this.columns.forEach((col, colIndex) =>
            {
                const td = document.createElement('td');
                let value = rowData[col];

                if (typeof this.callbacks.onCellCreated === 'function')
                {
                    const rendered = this.callbacks.onCellCreated(
                        td,
                        value,
                        rowData,
                        rowIndex,
                        colIndex
                    );
                    if (rendered !== undefined)
                    {
                        value = rendered;
                    }
                }

                td.textContent = value;
                tr.appendChild(td);
            });

            if (typeof this.callbacks.onRowCreated === 'function')
            {
                this.callbacks.onRowCreated(tr, rowData, rowIndex);
            }

            this.tbody.appendChild(tr);
        });
    }

    /**
     * Sort by column
     * @param {string} col
     */
    sortBy(col)
    {
        const dir = this.sortState[col] === 'asc' ? 'desc' : 'asc';
        this.sortState[col] = dir;

        this.filteredData.sort((a, b) =>
        {
            if (a[col] < b[col])
            {
                return dir === 'asc' ? -1 : 1;
            }

            if (a[col] > b[col])
            {
                return dir === 'asc' ? 1 : -1;
            }

            return 0;
        });

        this._renderBody();

        return dir;
    }

    clearSearch()
    {
        this.searchTerm = '';
        this._columnFilters = {};
        this._applyFiltersAndSearch();
    }

    /**
     * Global search
     * @param {string} term
     * @param {Array} [cols]
     */
    search(term, cols)
    {
        this.searchTerm = term.toLowerCase();

        if (Array.isArray(cols) && cols.length > 0)
        {
            this.searchColumns = cols;
        }

        this._applyFiltersAndSearch();
    }

    _applyFiltersAndSearch()
    {
        this.filteredData = this.data.filter(row =>
        {
            // Search
            let okSearch = true;
            if (this.searchTerm && this.searchTerm.length > 0)
            {
                const targetCols = this.searchColumns.length > 0
                    ? this.searchColumns
                    : this.columns;
                okSearch = targetCols.some(c =>
                {
                    return String(row[c]).toLowerCase().includes(this.searchTerm);
                });
            }

            // Column filters
            let okFilter = true;
            for (const c of this.columns)
            {
                const f = this._columnFilters[c];
                if (typeof f === 'string' && f.trim().length > 0 && !String(row[c]).toLowerCase().includes(f.toLowerCase()))
                {
                    okFilter = false;
                    break;
                }
            }

            return okSearch && okFilter;
        });

        if (this.pagination)
        {
            this.pagination.setTotalRecords(this.filteredData.length);
        }

        this._renderBody();
    }

    reset()
    {
        this.showFilters = false;
        const filters = Array.from(this.thead.querySelectorAll('input'));
        filters.forEach((filter) =>
        {
            filter.classList.add('hidden');
        });

        this.searchTerm = '';
        this._columnFilters = {};
        this.filteredData = [...this.data];

        if (this.pagination)
        {
            this.pagination.setTotalRecords(this.filteredData.length);
        }

        this._renderHeader();
        this._renderBody();
    }

    _renderExportButton()
    {
        const i = document.createElement('i');
        i.classList.add('kfi-cube-download');
        const exportBtn = document.createElement('button');
        // exportBtn.textContent = '';
        exportBtn.className = 'px-3 py-1 text-icon-sm mb-2';
        exportBtn.ariaLabel = "Export CSV";
        exportBtn.append(i);
        exportBtn.addEventListener('click', () => this.exportCSV());

        this.tableEl.parentElement.insertBefore(exportBtn, this.tableEl);
    }

    _renderFilterButton()
    {
        const i = document.createElement('i');
        i.classList.add('kfi-filter');
        const exportBtn = document.createElement('button');
        // exportBtn.textContent = '';
        exportBtn.className = 'px-3 py-1 text-icon-sm mb-2';
        exportBtn.ariaLabel = "Filter Data";
        exportBtn.append(i);
        exportBtn.addEventListener('click', () =>
        {
            const filters = Array.from(this.thead.querySelectorAll('input'));
            if(this.showFilters)
            {
                filters.forEach((filter) =>
                {
                    filter.classList.add('hidden');
                });

                this.showFilters = false;
            }
            else
            {
                filters.forEach((filter) =>
                {
                    filter.classList.remove('hidden');
                });

                this.showFilters = true;
            }
        });

        this.tableEl.parentElement.insertBefore(exportBtn, this.tableEl);
    }

    _renderResetButton()
    {
        const i = document.createElement('i');
        i.classList.add('kfi-cancel');
        const resetBtn = document.createElement('button');
        // exportBtn.textContent = '';
        resetBtn.className = 'px-3 py-1 text-icon-sm mb-2';
        resetBtn.ariaLabel = "Reset Table";
        resetBtn.append(i);
        resetBtn.addEventListener('click', () =>
        {
            this.reset();
        });

        this.tableEl.parentElement.insertBefore(resetBtn, this.tableEl);
    }

    exportCSV()
    {
        const rows = [this.columns];

        this.filteredData.forEach(row =>
        {
            rows.push(this.columns.map(col => `"${String(row[col]).replace(/"/g, '""')}"`));
        });

        const csvContent = rows.map(r => r.join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        const dateStr = new Date().toISOString().slice(0, 10);
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', `export-${dateStr}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

}