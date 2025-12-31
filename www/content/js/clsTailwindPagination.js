/**
 * clsTailwindPagination.js
 *
 * Extends clsTailwindComponent to render a paginated control.
 * 
 * Constructor options:
 *   @param {HTMLElement}      [options.containerEl]   If provided, use this element as pagination root.
 *   @param {number}           [options.totalRecords]  Total number of items (default: 0).
 *   @param {number}           [options.itemsPerPage]  Items per page (default: 10).
 *   @param {number}           [options.currentPage]   Initial page (1-based, default: 1).
 *   @param {Function}         [options.onPageChanged] Callback invoked when page changes; receives (newPage).
 * 
 * Methods:
 *   getValue()                → returns current page (number).
 *   setValue(page)            → sets current page to `page`, re-renders, fires event/callback.
 *   setTotalRecords(count)    → updates totalRecords, recalculates pages, re-renders.
 *   setNumberPerPage(count)   → updates itemsPerPage, recalculates pages, re-renders.
 * 
 * Fires a custom event "page-changed" on this.element with `detail: { page }` whenever page changes.
 */

class clsTailwindPagination extends clsTailwindComponent 
{
    constructor(options = {}) 
    {
        super(options);

        // Store options and defaults
        this.totalRecords = Number(options.totalRecords) || 0;
        this.itemsPerPage = Number(options.itemsPerPage) || 10;
        this.currentPage  = Number(options.currentPage)  || 1;
        this.maxPages = Number(options.maxPages) || 10;
        this.onPageChanged = typeof options.onPageChanged === 'function'
            ? options.onPageChanged
            : null;

        // Ensure currentPage is at least 1
        this.currentPage = Math.max(1, this.currentPage);

        // Compute total pages
        this.computeTotalPages();

        // Add root class
        this.addClass('pagination');

        // Initial render
        this.render();
    }

    /**
     * Recalculate totalPages based on totalRecords and itemsPerPage.
     * Ensures currentPage is within [1, totalPages].
     */
    computeTotalPages()
    {
        this.totalPages = this.itemsPerPage > 0
            ? Math.ceil(this.totalRecords / this.itemsPerPage)
            : 0;
        if (this.totalPages < 1)
        {
            this.totalPages = 1;
        }
        this.currentPage = Math.min(Math.max(1, this.currentPage), this.totalPages);
    }

    getItemsPerPage()
    {
        return this.itemsPerPage;
    }

    /**
     * Create the <ul> and <li> structure with Tailwind classes.
     */
    render()
    {
        // Clear any existing content
        this.element.innerHTML = '';

        // Create <ul> with base classes
        const ul = document.createElement('ul');

        // Previous arrow
        const prevLi = document.createElement('li');
        const prevLink = document.createElement('a');
        prevLink.setAttribute('href', 'javascript:void(0)');
        prevLink.setAttribute('aria-label', 'Previous page');
        prevLink.classList.add('previous-button');
        // If on first page, disable click and reduce opacity
        if (this.currentPage === 1)
        {
            prevLink.classList.add('inactive');
        }
        let prevIcon = document.createElement('i');
        prevIcon.classList.add('kfi-arrow-carrot-1-left');
        prevLink.append(prevIcon);
        prevLink.addEventListener('click', (e) =>
        {
            e.preventDefault();
            if (this.currentPage > 1)
            {
                this.setValue(this.currentPage - 1);
            }
        });
        prevLi.appendChild(prevLink);
        ul.appendChild(prevLi);

         // Page numbers with max 10 slots and ellipses
        const pages = [];
        if (this.totalPages <= this.maxPages)
        {
            // Show all pages if 10 or fewer
            for (let page = 1; page <= this.totalPages; page++)
            {
                pages.push(page);
            }
        }
        else
        {
            // Always include first and last; build sliding window based on maxPages
            const windowSize   = this.maxPages - 4;
            const nearStart    = windowSize + 1;
            const nearEnd      = this.totalPages - windowSize;
            if (this.currentPage <= nearStart)
            {
                // Near start: pages 1..(windowSize+2), ellipsis, last
                const end = windowSize + 2;
                for (let page = 1; page <= end; page++)
                {
                    pages.push(page);
                }
                pages.push('ellipsis');
                pages.push(this.totalPages);
            }
            else if (this.currentPage >= nearEnd)
            {
                // Near end: first, ellipsis, last (windowSize+2) pages
                pages.push(1);
                pages.push('ellipsis');
                const start = this.totalPages - (windowSize + 1);
                for (let page = start; page <= this.totalPages; page++)
                {
                    pages.push(page);
                }
            }
            else
            {
                // Middle: first, ellipsis, window of 6 around current, ellipsis, last
                pages.push(1);
                pages.push('ellipsis');

                const half = Math.floor(windowSize / 2);
                // center window around currentPage
                let start = this.currentPage - half;
                let end = start + windowSize - 1;
                // clamp lower bound
                if (start < 2)
                {
                    start = 2;
                    end = start + windowSize - 1;
                }
                // clamp upper bound
                if (end > this.totalPages - 1)
                {
                    end = this.totalPages - 1;
                    start = end - (windowSize - 1);
                }
                for (let page = start; page <= end; page++)
                {
                    pages.push(page);
                }

                pages.push('ellipsis');
                pages.push(this.totalPages);
            }
        }
        for (const p of pages)
        {
            const li = document.createElement('li');
            if (p === 'ellipsis') 
            {
                // Render non-clickable ellipsis
                const span = document.createElement('span');
                span.textContent = '...';
                li.appendChild(span);
            } 
            else
            {
                const pageNum = p;
                if (pageNum === this.currentPage)
                {
                    // Current page (highlighted, not clickable)
                    li.classList.add('current-page');
                    const link = document.createElement('a');
                    link.setAttribute('href', 'javascript:void(0)');
                    link.textContent = pageNum.toString();
                    li.appendChild(link);
                } 
                else 
                {
                    // Other pages (clickable)
                    const link = document.createElement('a');
                    link.setAttribute('href', 'javascript:void(0)');
                    link.textContent = pageNum.toString();
                    link.addEventListener('click', (e) =>
                    {
                        e.preventDefault();
                        this.setValue(pageNum);
                    });
                    li.appendChild(link);
                }
            }
            ul.appendChild(li);
        }

        // Next arrow
        const nextLi = document.createElement('li');
        const nextLink = document.createElement('a');
        nextLink.setAttribute('href', 'javascript:void(0)');
        nextLink.setAttribute('aria-label', 'Next page');
        nextLink.classList.add('next-button');
        // If on last page, disable
        if (this.currentPage === this.totalPages)
        {
            nextLink.classList.add('inactive');
        }
        let nextIcon = document.createElement('i');
        nextIcon.classList.add('kfi-arrow-carrot-1-right');
        nextLink.append(nextIcon);
        nextLink.addEventListener('click', (e) =>
        {
            e.preventDefault();
            if (this.currentPage < this.totalPages)
            {
                this.setValue(this.currentPage + 1);
            }
        });
        nextLi.appendChild(nextLink);
        ul.appendChild(nextLi);

        // Append <ul> to root element
        this.element.appendChild(ul);
    }

    /**
     * Returns the current page (number).
     */
    getValue()
    {
        return this.currentPage;
    }

    /**
     * Sets the current page to `page`, re-renders, and fires event/callback.
     * 
     * @param {number} page  New page number (1-based).
     */
    setValue(page)
    {
        const newPage = Math.max(1, Math.min(this.totalPages, Number(page)));
        if (newPage === this.currentPage)
        {
            return;
        }
        this.currentPage = newPage;
        this.render();
        // Fire custom event
        const evt = new CustomEvent('page-changed', { detail: { page: newPage } });
        this.element.dispatchEvent(evt);
        // Call callback if provided
        if (typeof this.onPageChanged === 'function')
        {
            this.onPageChanged(newPage);
        }
    }

    /**
     * Updates totalRecords, recalculates pages, and re-renders.
     * 
     * @param {number} count  New total number of records.
     */
    setTotalRecords(count)
    {
        this.totalRecords = Number(count) || 0;
        this.computeTotalPages();
        this.render();
    }

    /**
     * Updates itemsPerPage, recalculates pages, and re-renders.
     * 
     * @param {number} count  New number of items per page.
     */
    setNumberPerPage(count)
    {
        this.itemsPerPage = Number(count) || 1;
        this.computeTotalPages();
        this.render();
    }
}