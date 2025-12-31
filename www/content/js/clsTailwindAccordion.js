/**
 * clsTailwindAccordion.js
 *
 * A subclass of clsTailwindComponent that renders an accordion (expand/collapse)
 * with JavaScript-driven height animations (200 ms, ease-out) and rotating icons.
 *
 * Options:
 *   @param {Object} [options={}]
 *   @param {HTMLElement}   [options.containerEl]    If provided, use this element as the root.
 *   @param {string[]}      [options.classes]        Extra Tailwind classes to apply on the root wrapper.
 *   @param {boolean}       [options.collapseOthers] Whether expanding one panel closes others.
 *   @param {Array<Object>} [options.items]          Initial list of items.
 *     Each item can have:
 *       - title:   string (heading text)
 *       - content: string or HTMLElement (body content)
 *       - open:    boolean (whether the panel is open initially)
 *
 * Usage example:
 *   new clsTailwindAccordion({
 *     collapseOthers: true,
 *     containerEl: document.querySelector('.myAccordion'),
 *     items: [
 *       { title: 'A', content: '<p>...</p>', open: true },
 *       { title: 'B', content: '<p>...</p>' }
 *     ]
 *   });
 *
 * Note: Requires Tailwind 3.4.1 (or newer) for utility classes like
 *       overflow-hidden, transition-transform, rotate-180, etc.
 */

class clsTailwindAccordion extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement}   [options.containerEl]
     * @param {string[]}      [options.classes]
     * @param {boolean}       [options.collapseOthers]
     * @param {Array<Object>} [options.items]
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;
        this.collapseOthers = !!options.collapseOthers;

        // Use provided containerEl or default to a new DIV
        this.element = options.containerEl instanceof HTMLElement
            ? options.containerEl
            : document.createElement(options.tag || 'div');

        // Apply any extra Tailwind classes
        if (Array.isArray(options.classes))
        {
            this.element.classList.add(...options.classes);
        }

        // Ensure there's vertical spacing between items
        this.element.classList.add('accordion');

        // Internal array to keep track of { header, contentEl, icon, isOpen }
        this.items = [];

        // If items were passed at instantiation, populate now
        if (Array.isArray(options.items) && options.items.length > 0)
        {
            this.populate(options.items);
        }
    }

    /**
     * Remove all accordion items from the DOM and clear internal array.
     */
    clearItems()
    {
        this.items = [];
        while (this.element.firstChild)
        {
            this.element.removeChild(this.element.firstChild);
        }
    }

    /**
     * Add a single item to the accordion.
     * @param {Object} item
     *   @param {string}            item.title   Heading text
     *   @param {string|HTMLElement} item.content HTML string or HTMLElement
     *   @param {boolean}           [item.open=false]  Whether to start open
     */
    addItem(item)
    {
        const { title, content, open = false } = item;

        // === ITEM WRAPPER ===
        const wrapper = document.createElement('div');
        wrapper.classList.add('wrapper');

        // === HEADER (clickable) ===
        const header = document.createElement('button');
        header.classList.add('header');
        header.setAttribute('type', 'button');

        // Title text
        const titleEl = document.createElement('span');
        titleEl.textContent = title;
        titleEl.classList.add('title');
        header.appendChild(titleEl);

        // Icon placeholder (user will replace with font-icon in CSS)
        const icon = document.createElement('i');
        icon.classList.add('icon-arrow', 'kfi-arrow-carrot-1-down');
        icon.ariaLabel = 'expand';
        
        // Start icon rotated 180° if open initially
        if (open)
        {
            icon.classList.remove('kfi-arrow-carrot-1-down');
            icon.classList.add('kfi-arrow-carrot-1-up');
            icon.ariaLabel = 'collapse';
        }
        else
        {
            icon.ariaLabel = 'expand';
        }
        // Insert a default down-chevron (SVG); user can swap it out later if desired.
        header.appendChild(icon);

        wrapper.appendChild(header);

        // === CONTENT CONTAINER ===
        const contentEl = document.createElement('div');
        contentEl.classList.add('content');
        // At start: either expanded (auto) or collapsed (height=0)
        if (open)
        {
            // Let it render naturally, then immediately remove max-height so it stays “auto” afterwards
            contentEl.style.maxHeight = 'none';
        }
        else
        {
            contentEl.style.maxHeight = '0px';
        }

        // Insert the provided content
        if (content instanceof HTMLElement)
        {
            let temp = document.createElement('div');
            temp.classList.add('content-wrapper');
            temp.appendChild(content);
            contentEl.appendChild(temp);
        }
        else
        {
            // If string, wrap in a DIV so innerHTML can parse
            const temp = document.createElement('div');
            temp.classList.add('content-wrapper');
            temp.innerHTML = content;
            contentEl.append(temp);
            // while (temp.firstChild)
            // {
            //     contentEl.append(temp.firstChild);
            // }
        }

        wrapper.appendChild(contentEl);
        this.element.appendChild(wrapper);

        // Track state for this item
        const itemState = {
            wrapper,
            header,
            contentEl,
            icon,
            isOpen: Boolean(open)
        };
        this.items.push(itemState);

        // === CLICK LISTENER ===
        header.addEventListener('click', () =>
        {
            if (itemState.isOpen)
            {
                this._animateClose(itemState);
            }
            else
            {
                // If collapseOthers is true, first close all other panels
                if (this.collapseOthers)
                {
                    this.items.forEach(otherItem =>
                    {
                        if (otherItem !== itemState && otherItem.isOpen)
                        {
                            this._animateClose(otherItem);
                        }
                    });
                }
                this._animateOpen(itemState);
            }
        });
    }

    /**
     * Populate the accordion from a JSON array of items.
     * Clears existing items first.
     * @param {Array<Object>} itemsArray
     */
    populate(itemsArray)
    {
        this.clearItems();
        for (const it of itemsArray)
        {
            this.addItem(it);
        }
    }

    /**
     * Animate opening a single panel over 400 ms (ease-out).
     * @param {Object} itemState  The tracked object with { contentEl, icon, isOpen }
     */
    _animateOpen(itemState)
    {
        const { contentEl, icon } = itemState;

        // Measure natural height by temporarily allowing auto
        contentEl.style.maxHeight = 'none';
        const fullHeight = contentEl.scrollHeight;

        // Start from 0
        contentEl.style.maxHeight = '0px';
        contentEl.style.overflow = 'hidden';

        // Animate from 0 → fullHeight
        this._runHeightAnimation(
            contentEl,
            0,
            fullHeight,
            400,
            () =>
            {
                // After animation ends, let it expand naturally
                contentEl.style.maxHeight = 'none';
            }
        );

        // Rotate icon 0 → 180 via CSS class toggle
        //icon.classList.add('rotate-180');
        icon.classList.remove('kfi-arrow-carrot-1-down');
        icon.classList.add('kfi-arrow-carrot-1-up');
        icon.ariaLabel = 'collapse';

        itemState.isOpen = true;
    }

    /**
     * Animate closing a single panel over 400 ms (ease-out).
     * @param {Object} itemState
     */
    _animateClose(itemState)
    {
        const { contentEl, icon } = itemState;

        // Measure current height; if previously “none”, use scrollHeight
        let startHeight;
        if (contentEl.style.maxHeight === 'none' || !contentEl.style.maxHeight)
        {
            startHeight = contentEl.scrollHeight;
        }
        else
        {
            startHeight = parseFloat(window.getComputedStyle(contentEl).maxHeight);
        }

        // Animate from startHeight → 0
        this._runHeightAnimation(
            contentEl,
            startHeight,
            0,
            400,
            () =>
            {
                // Keep it hidden at 0
                contentEl.style.maxHeight = '0px';
            }
        );

        // Rotate icon 180 → 0
        //icon.classList.remove('rotate-180');
        icon.classList.remove('kfi-arrow-carrot-1-up');
        icon.classList.add('kfi-arrow-carrot-1-down');
        icon.ariaLabel = 'expand';

        itemState.isOpen = false;
    }

    /**
     * Core height animation driver (ease-out) using requestAnimationFrame.
     * Interpolates contentEl.style.maxHeight from startPx → endPx over durationMs.
     *
     * @param {HTMLElement} contentEl
     * @param {number}      startPx     Starting height in pixels
     * @param {number}      endPx       Ending height in pixels
     * @param {number}      durationMs  Duration in milliseconds
     * @param {Function}    onComplete  Callback once animation finishes
     */
    _runHeightAnimation(contentEl, startPx, endPx, durationMs, onComplete)
    {
        const startTime = performance.now();
        const delta = endPx - startPx;

        const easeOut = t => 1 - Math.pow(1 - t, 2);

        function step(now)
        {
            const elapsed = now - startTime;
            let progress = elapsed / durationMs;
            if (progress > 1)
            {
                progress = 1;
            }

            const eased = easeOut(progress);
            const current = startPx + delta * eased;
            contentEl.style.maxHeight = current + 'px';

            if (progress < 1)
            {
                requestAnimationFrame(step);
            }
            else
            {
                // Final frame
                contentEl.style.maxHeight = endPx + 'px';
                if (typeof onComplete === 'function')
                {
                    onComplete();
                }
            }
        }

        requestAnimationFrame(step);
    }
}
