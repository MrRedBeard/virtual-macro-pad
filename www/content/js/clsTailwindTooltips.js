class clsTailwindTooltips extends clsTailwindComponent
{
    static tooltipEl = null;

    constructor()
    {
        super();
        this.currentEl = null;
        this.tooltipEl;
        clsTailwindTooltips.init();
    }

    static init()
    {
        this.createGlobalTooltip();
        this.renderAll();
        this.observe(this);
    }

    static createGlobalTooltip()
    {
        if (clsTailwindTooltips.tooltipEl) return;

        clsTailwindTooltips.tooltipEl = document.createElement('tooltip');
        clsTailwindTooltips.tooltipEl.setAttribute('role', 'tooltip');
        clsTailwindTooltips.tooltipEl.setAttribute('id', 'clsTailwindTooltips');
        document.body.appendChild(clsTailwindTooltips.tooltipEl);
    }

    static renderAll()
    {
        const selector = clsTailwindTooltips.attributeSelector();
        document.querySelectorAll(selector).forEach(el =>
        {
            this.applyTooltip(el, this);
        });
    }

    static applyTooltip(el)
    {
        if (el.dataset.tooltipRendered) return;

        let label = clsTailwindTooltips.getLabel(el);
        if (!label) return;

        el.addEventListener('mouseenter', e =>
        {
            if (el.offsetParent === null || getComputedStyle(el).visibility === 'hidden') return;

            clsTailwindTooltips.currentEl = el;
            el.setAttribute('aria-describedby', 'clsTailwindTooltips');
            label = clsTailwindTooltips.getLabel(el);
            clsTailwindTooltips.setLabel(label);
            clsTailwindTooltips.tooltipEl.setAttribute('aria-hidden', 'false'); // on show
            clsTailwindTooltips.tooltipEl.classList.add('active');
        });

        el.addEventListener('mousemove', e =>
        {
            label = clsTailwindTooltips.getLabel(el);
            const offset = 12;
            clsTailwindTooltips.tooltipEl.style.left = `${e.clientX + offset}px`;
            clsTailwindTooltips.tooltipEl.style.top = `${e.clientY + offset}px`;
        });

        el.addEventListener('mouseleave', e =>
        {
            clsTailwindTooltips.currentEl = null;
            clsTailwindTooltips.setLabel('');
            el.removeAttribute('aria-describedby');
            clsTailwindTooltips.tooltipEl.setAttribute('aria-hidden', 'true');
            clsTailwindTooltips.tooltipEl.classList.remove('active');
        });

        el.addEventListener('focus', e =>
        {
            if (el.offsetParent === null || getComputedStyle(el).visibility === 'hidden') return;

            clsTailwindTooltips.currentEl = el;
            const label = clsTailwindTooltips.getLabel(el);
            el.setAttribute('aria-describedby', 'clsTailwindTooltips');
            clsTailwindTooltips.setLabel(label);
            clsTailwindTooltips.tooltipEl.setAttribute('aria-hidden', 'false'); // on show
            clsTailwindTooltips.tooltipEl.classList.add('active');
        });

        el.addEventListener('blur', e =>
        {
            clsTailwindTooltips.currentEl = null;
            clsTailwindTooltips.setLabel('');
            el.removeAttribute('aria-describedby');
            clsTailwindTooltips.tooltipEl.setAttribute('aria-hidden', 'true');
            clsTailwindTooltips.tooltipEl.classList.remove('active');
        });

        document.addEventListener('keydown', e =>
        {
            if (e.key === 'Escape')
            {
                clsTailwindTooltips.currentEl?.removeAttribute('aria-describedby');
                clsTailwindTooltips.setLabel('');
                clsTailwindTooltips.tooltipEl.classList.remove('active');
                clsTailwindTooltips.tooltipEl.setAttribute('aria-hidden', 'true');
            }
        });

        el.dataset.tooltipRendered = 'true';
    }

    static getLabel(el)
    {
        const attributesArr = clsTailwindTooltips.attributeArray();
        const label = attributesArr
        .map(attr => el.getAttribute(attr))
        .find(val => val !== null && val !== undefined && typeof val === 'string' && val.trim().length > 0);

        const overrideAttr = el.getAttribute('data-tooltip-source');
        if (overrideAttr)
        {
            const val = el.getAttribute(overrideAttr);
            if (typeof val === 'string' && val.trim().length > 0) return val;
        }

        return label;
    }

    static setLabel(val)
    {
        clsTailwindTooltips.tooltipEl.textContent = String(val);
    }
    
    static hasAttribute(el)
    {
        return clsTailwindTooltips.attributeArray()
        .some(attr => el.hasAttribute?.(attr));
    }

    static attributeArray()
    {
        const attributes = clsTailwindTooltips.attributeSelector();
        const attributesArr = attributes
            .replaceAll('[','')
            .replaceAll(']','')
            .replaceAll(' ','')
            .split(',');
        return attributesArr;
    }

    static attributeSelector()
    {
        // Priority --> to Low Priority 
        return '[data-label],[title],[aria-label],[ariaLabel],[placeholder]';
    }

    static observe()
    {
        const attributes = clsTailwindTooltips.attributeSelector();
        const attributesArr = clsTailwindTooltips.attributeArray()

        const observer = new MutationObserver(mutations =>
        {
            mutations.forEach(mutation =>
            {
                //if (mutation.attributeName === 'class')
                if (mutation.type === 'attributes' && clsTailwindTooltips.attributeArray().includes(mutation.attributeName))
                {
                    const { target } = mutation;

                    if (target instanceof HTMLElement && clsTailwindTooltips.currentEl && clsTailwindTooltips.currentEl === target)
                    {
                        if(attributesArr.some(attr => target.hasAttribute(attr)))
                        {
                            let label = clsTailwindTooltips.getLabel(target);
                            if(label && label.length > 0)
                            {
                                clsTailwindTooltips.setLabel(label);
                            }
                        }
                    }
                }

                mutation.addedNodes.forEach(node =>
                {
                    if (!(node instanceof HTMLElement)) return;

                    if (clsTailwindTooltips.hasAttribute(node))
                    {
                        clsTailwindTooltips.applyTooltip(node);
                    }

                    node.querySelectorAll?.(attributes).forEach(el =>
                    {
                        clsTailwindTooltips.applyTooltip(el);
                    });
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }
}