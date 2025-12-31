/**
 * Tailwind Timeline Component
 * Inherits from clsTailwindComponent
 */
class clsTailwindTimeline extends clsTailwindComponent
{
    /**
     * @param {Object} options
     * @param {'vertical-single'|'vertical-alternate'|'horizontal-single'|'horizontal-alternate'} [options.type='vertical-single']
     * @param {boolean} [options.reverse=false] Whether to reverse the order of items
     */
    constructor(options = {})
    {
        options.tag = 'ol';
        options.classes = options.classes || [];
        super(options);

        /** @type {'vertical-single'|'vertical-alternate'|'horizontal-single'|'horizontal-alternate'} */
        this.type = options.type || 'vertical-single';
        if(!clsTailwindTimeline.supportedTypes().includes(this.type))
        {
          this.type = 'vertical-single';
        }

        this.scrollWidth;
        this.scrollHeight;

        this.timelineEl;

        /** @type {boolean} */
        this.reverse = options.reverse || false;

        this.items = [];

        this._initTimelineStructure();
    }

    static supportedTypes()
    {
        return ['vertical-single','vertical-alternate','horizontal-single','horizontal-alternate'];
    }

    /**
     * Internal: Configure the base container classes depending on type
     */
    _initTimelineStructure()
    {
        const classMap = {
            'vertical-single': ['vertical-single'],
            'vertical-alternate': ['vertical-alternate'],
            'horizontal-single': ['horizontal-single'],
            'horizontal-alternate': ['horizontal-alternate']
        };

        // The actual timeline element
        this.timelineEl = document.createElement('timeline');

        this.timelineEl.classList.add(...classMap[this.type]);

        if (this.reverse)
        {
            this.timelineEl.classList.add('reverse');
        }

        const observer = new ResizeObserver(() =>
        {
            this.scrollWidth = this.timelineEl.scrollWidth;
            this.scrollHeight = this.timelineEl.scrollHeight;
            this.timelineEl.style.setProperty('--scroll-width',  `${this.scrollWidth}px`);
            this.timelineEl.style.setProperty('--scroll-height', `${this.scrollHeight}px`);
        });
        observer.observe(this.timelineEl);

        this.element.classList.add('timeline-container', 'no-scrollbar');

        this.element.append(this.timelineEl);
    }

    /**
     * Add a timeline entry
     * @param {Object} entry
     * @param {string|HTMLElement} entry.title
     * @param {string|HTMLElement} entry.content
     * @param {string} entry.datetime
     * @param {function(MouseEvent):void} [entry.onclick]
     * @param {boolean} [entry.includeIcon=true]
     */
    addItem(entry = {})
    {
        const {
            title,
            content,
            datetime,
            onclick,
            includeIcon = false,
            icon = 'kfi-shape-circle-filled',
            iconColor = 'red-500',
            bgColor = 'bg-gray-300'
        } = entry;

        const li = document.createElement('li');

        switch (this.type)
        {
            case 'vertical-single':
            {
                // build icon + content together
                const container = this._buildContentBlock({
                    title,
                    content,
                    datetime,
                    includeIcon,
                    icon,
                    iconColor,
                    bgColor,
                    onclick,
                    isAlternate: false
                });
                li.appendChild(container);
                break;
            }

            case 'vertical-alternate':
            {
                const isEven = this.items.length % 2 === 0;

                // Icon centered on the vertical line
                let dot = this._createIcon(includeIcon, icon, iconColor, bgColor);
                li.appendChild(dot);

                // Content block
                const block = this._buildContentBlock({
                    title,
                    content,
                    datetime,
                    includeIcon,
                    icon,
                    iconColor,
                    bgColor,
                    onclick,
                    isAlternate: true
                });
                block.classList.add(...(isEven ? ['even'] : ['odd']));

                li.appendChild(block);
                break;
            }


            case 'horizontal-single':
            {
                // build icon + content together
                const container = this._buildContentBlock({
                    title,
                    content,
                    datetime,
                    includeIcon,
                    icon,
                    iconColor,
                    bgColor,
                    onclick,
                    isAlternate: false
                });
                li.appendChild(container);
                break;
            }

            case 'horizontal-alternate':
            {
                const isEven = this.items.length % 2 === 0;

                li.classList.add(isEven ? 'even' : 'odd');

                let dot = this._createIcon(includeIcon, icon, iconColor, bgColor);
                li.appendChild(dot);

                const block = this._buildContentBlock({
                    title,
                    content,
                    datetime,
                    includeIcon,
                    icon,
                    iconColor,
                    bgColor,
                    onclick,
                    isAlternate: true
                });
                block.classList.add(isEven ? 'even' : 'odd');

                li.appendChild(block);
                break;
            }
        }

        this.items.push(entry);
        this.timelineEl.appendChild(li);
    }

    /**
     * Add multiple items to the timeline using addItem()
     * @param {Array<Object>} itemsArray - Array of timeline entries
     */
    addItems(itemsArray = [])
    {
        if (!Array.isArray(itemsArray))
        {
            console.warn('addItems expected an array, got:', typeof itemsArray);
            return;
        }

        for (const item of itemsArray)
        {
            try
            {
                this.addItem(item);
            }
            catch (err)
            {
                console.error('Failed to add item to timeline:', item, err);
            }
        }
    }

    /**
     * Builds a standardized text block with optional icon
     * Used in both vertical and horizontal modes
     * @private
     */
    _buildContentBlock({ title, content, datetime, includeIcon = false, icon = 'kfi-shape-circle-filled', iconColor, bgColor, onclick, isAlternate = false })
    {
        const blockWrapper = document.createElement('div');
        blockWrapper.className = isAlternate ? 'block' : 'InnerBlock';

        // Inner content container
        const inner = document.createElement('div');
        inner.className = isAlternate ? 'blockTextContent' : '';

        if (datetime)
        {
            const time = document.createElement('time');
            time.textContent = datetime;
            inner.appendChild(time);
        }

        const h3 = document.createElement('h3');
        h3.className = 'title';
        if (typeof onclick === 'function')
        {
            h3.classList.add('hasFunc');
            h3.addEventListener('click', onclick);
        }
        this._appendContent(h3, title);
        inner.appendChild(h3);

        const p = document.createElement('p');
        p.className = 'p-content';
        this._appendContent(p, content);
        inner.appendChild(p);

        blockWrapper.appendChild(inner);

        if (!isAlternate)
        {
            const iconEl = this._createIcon(includeIcon, icon, iconColor, bgColor);
            blockWrapper.insertBefore(iconEl, blockWrapper.firstChild);
        }

        return blockWrapper;
    }

    /**
     * Create a font icon element if includeIcon is a string (class), else return spacer
     * @param {string|boolean} includeIcon - false = no icon, string = class name(s)
     * @returns {HTMLElement}
     */
    _createIcon(includeIcon = false, icon = 'kfi-shape-circle-filled', iconColor, bgColor)
    {
        const iconEl = document.createElement('i');

        if (typeof includeIcon === 'string')
        {
            iconEl.className = `${includeIcon} text-${iconColor}`;
        }
        else if (includeIcon === true)
        {
            // Default fallback icon
            iconEl.className = `${icon} text-${iconColor}`;
        }
        else
        {
            iconEl.classList.add('dot', bgColor);
        }
        iconEl.setAttribute('aria-hidden', 'true');

        return iconEl;
    }

    /**
     * Appends string, html string, or HTMLElement to a parent
     * @param {HTMLElement} parent
     * @param {string|HTMLElement} value
     */
    _appendContent(parent, value)
    {
        if (typeof value === 'string')
        {
            if (value.trim().startsWith('<'))
            {
                parent.innerHTML = value;
            }
            else
            {
                parent.textContent = value;
            }
        }
        else if (value instanceof HTMLElement)
        {
            parent.appendChild(value);
        }
    }

    /**
     * Clears all timeline items from the DOM and resets internal state
     */
    clearItems()
    {
        while (this.timelineEl.firstChild)
        {
            this.timelineEl.removeChild(this.timelineEl.firstChild);
        }

        this.items = [];
    }

    setReverse(isReverse)
    {
        this.reverse = isReverse;
        this.timelineEl.classList.toggle('reverse', isReverse);
    }
}
