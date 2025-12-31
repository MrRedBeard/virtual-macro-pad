class clsTailwindSlider extends clsTailwindComponent
{
    constructor(options = {})
    {
        super(options);

        this.el = options.containerEl || null;

        if (this.el)
        {
            this.input = this.el.querySelector('input[type="range"]');
            if (!this.input)
            {
                this.buildSliderHTML();
            }

            this.input = this.el.querySelector('input[type="range"]');
            this.input.id = this.uniqueID('slider');

            this.input.addEventListener('input', () => this.syncState());
            this.syncState();
        }
        else
        {
            this.input = document.createElement('input');
            this.input.type = 'range';
        }
    }

    buildSliderHTML()
    {
        const val = parseFloat(this.el.dataset.inputValue || 0);
        const min = parseFloat(this.el.dataset.min || 0);
        const max = parseFloat(this.el.dataset.max || 100);
        const step = this.el.dataset.step || 'any';
        const labelText = this.el.dataset.label || null;

        const id = this.uniqueID('slider');

        const wrapper = document.createElement('fieldset');

        const label = document.createElement('label');
        label.className = 'form-label';
        label.setAttribute('for', id);

        if (labelText)
        {
            label.textContent = labelText;
        }
        else
        {
            label.textContent = "";
        }
        wrapper.appendChild(label);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = id;
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = val;

        wrapper.appendChild(input);
        this.el.appendChild(wrapper);

        this.input = input;
        this.setValue(val, { silent: true });
    }

    syncState()
    {
        const val = parseFloat(this.input.value);
        this.el.setAttribute('data-value', val);
    }

    getValue()
    {
        return parseFloat(this.input.value);
    }

    setValue(val, options = {})
    {
        const silent = options.silent === true;
        this.input.value = parseFloat(val);
        this.syncState();
        if (!silent)
        {
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    static autoInit()
    {
        const elements = Array.from(document.querySelectorAll('slider'));
        elements.forEach(el =>
        {
            new clsTailwindSlider({ containerEl: el });
        });
    }

    static observe(selector = 'slider')
    {
        const observer = new MutationObserver(mutations =>
        {
            for (const mutation of mutations)
            {
                mutation.addedNodes.forEach(node =>
                {
                    if (!(node instanceof HTMLElement)) return;

                    if (node.matches(selector))
                    {
                        new clsTailwindSlider({ containerEl: node });
                    }

                    node.querySelectorAll?.(selector).forEach(child =>
                    {
                        new clsTailwindSlider({ containerEl: child });
                    });
                });
            }
        });

        observer.observe(document.body,
        {
            childList: true,
            subtree: true
        });

        return observer;
    }
}