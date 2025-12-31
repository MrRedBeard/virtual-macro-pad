/**
 * Base class for custom components
 */
class clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement} [options.containerEl]   If provided, use this existing element.
     * @param {string}      [options.tag]           Tag name to create if no containerEl (default: "div").
     * @param {string[]}    [options.classes]       Initial list of CSS classes to apply.
     */
    constructor(options = {})
    {
        this.options = options;
        
        // If caller gave us a containerEl, use it. Otherwise, create a new element.
        if (options.containerEl instanceof HTMLElement)
        {
            this.element = options.containerEl;
        }
        else
        {
            const tagName = typeof options.tag === 'string' ? options.tag : 'div';
            this.element = document.createElement(tagName);

            // If they passed an array of classes, add them now.
            if (Array.isArray(options.classes) && options.classes.length > 0)
            {
                this.element.classList.add(...options.classes);
            }
        }
    }

    /**
     * Add one or more CSS classes to this.element.
     * @param  {...string} classNames
     */
    addClass(...classNames)
    {
        this.element.classList.add(...classNames);
    }

    /**
     * Set an attribute on this.element (e.g. "id", "data-foo", etc.).
     * @param {string} name
     * @param {string} value
     */
    setAttr(name, value)
    {
        this.element.setAttribute(name, value);
    }

    /**
     * Append a child (HTMLElement or a clsTailwindComponent) into this.element.
     * @param {HTMLElement|clsTailwindComponent} child
     */
    appendChild(child)
    {
        if (child instanceof clsTailwindComponent)
        {
            this.element.appendChild(child.element);
        }
        else if (child instanceof HTMLElement)
        {
            this.element.appendChild(child);
        }
        else
        {
            throw new Error('clsTailwindComponent.appendChild: invalid child');
        }
    }

    /**
     * Mount (append) this.element into a parent DOM node.
     * @param {HTMLElement} parentEl
     */
    mount(parentEl)
    {
        if (parentEl && typeof parentEl.appendChild === 'function')
        {
            parentEl.appendChild(this.element);
        }
        else
        {
            throw new Error('clsTailwindComponent.mount: invalid parent element');
        }
    }

    /**
     * Insert this.element next to an existing element in the DOM.
     * @param {HTMLElement|clsTailwindComponent} siblingOfEl - element or component to insert next to
     * @param {boolean} [before=false]               If true, insert before siblingOfEl; otherwise, insert after.
     */
    siblingOf(siblingOfEl, before = false)
    {
        let referenceEl;
        if (siblingOfEl instanceof clsTailwindComponent)
        {
            referenceEl = siblingOfEl.element;
        }
        else if (siblingOfEl instanceof HTMLElement)
        {
            referenceEl = siblingOfEl;
        }
        else
        {
            throw new Error('clsTailwindComponent.siblingOf: invalid reference element');
        }

        const parent = referenceEl.parentNode;
        if (!(parent instanceof HTMLElement))
        {
            throw new Error('clsTailwindComponent.siblingOf: reference element has no parent');
        }

        if (before)
        {
            parent.insertBefore(this.element, referenceEl);
        }
        else
        {
            if (referenceEl.nextSibling)
            {
                parent.insertBefore(this.element, referenceEl.nextSibling);
            }
            else
            {
                parent.appendChild(this.element);
            }
        }
    }

    randomNumber(start = 0, end = 100, seed = Date.now())
    {
        // Simple LCG (Linear Congruential Generator)
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;

        seed = (a * seed + c) % m;

        const normalized = seed / m;
        return Math.floor(normalized * (end - start + 1)) + start;
    }

    randomLetter(seed = Date.now())
    {
        // Simple seeded LCG
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;

        seed = (a * seed + c) % m;
        const normalized = seed / m;

        const letterCode = 65 + Math.floor(normalized * 26); // A-Z
        return String.fromCharCode(letterCode);
    }

    uniqueID(prefix = 'ctc')
    {
        const uid = `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${this.randomNumber(50, 100)}${this.randomLetter()}`;
        if (this.input && !this.input.id)
        {
            this.input.id = uid;
        }
        return uid;
    }
}