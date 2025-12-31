class clsTailwindToggle extends clsTailwindComponent
{
    constructor(options = {})
    {
        super(options);

        this.el = null;
        if (typeof options.containerEl !== 'undefined' && options.containerEl)
        {
            this.el = options.containerEl;
        }

        if(this.el)
        {
            this.input = this.el.querySelector('input[type="checkbox"]');

            // Dynamically build if not already wired
            if (!this.input)
            {
                this.buildToggleHTML();
            }

            this.input = this.el.querySelector('input[type="checkbox"]');
            this.input.id = this.uniqueID('toggle');

            this.input.addEventListener('change', () =>
            {
                this.syncState();
            });

            this.syncState();
        }
        else
        {
            this.input = document.createElement('input');
            this.input.type = 'checkbox';
        }
    }

    buildToggleHTML()
    {
        let checked;
        if(typeof checked === 'undefined')
        {
            checked = false;
        }
        checked = (this.el.dataset.inputValue === "true");        

        const checkedIcon = this.el.dataset.iconOn;
        const uncheckedIcon = this.el.dataset.iconOff;
        const labelText = this.el.dataset.label || null;
        const labelPosition = this.el.dataset.labelPosition || 'top';
        let labelOnClass = this.el.dataset.iconOnClass || null;
        const labelOffClass = this.el.dataset.iconOffClass || null;

        if(!labelOnClass && !labelOffClass)
        {
            labelOnClass = 'neutral';
        }

        const id = this.uniqueID('toggle');

        if(labelPosition === "left" || labelPosition === "right")
        {
            this.el.classList.add(labelPosition);
        }

        //data-label-position="left"
        // left: label + toggle inside a flex row (flex items-center gap-2)
        // right: toggle + label inside a flex row (flex items-center gap-2)

        const p = document.createElement('p');
        const lbl = document.createElement('label');
        this.input = document.createElement('input');
        const i1 = document.createElement('i');
        const span = document.createElement('span');
        const i2 = document.createElement('i');

        lbl.append(this.input);
        lbl.append(i1);
        lbl.append(span);
        lbl.append(i2);
        this.el.append(p);
        this.el.append(lbl);

        p.classList.add('form-label')
        p.innerHTML = labelText;
        this.input.id = id;
        this.input.type = 'checkbox';
        this.input.classList.add('peer');
        this.input.checked = checked;
        i1.classList.add(uncheckedIcon, 'left-6', 'peer-checked:hidden');
        span.classList.add('transition-all', 'peer-checked:left-6');
        i2.classList.add(checkedIcon, 'left-0', 'hidden', 'peer-checked:grid');

        if(labelOnClass)
        {
            this.el.querySelector('label').classList.add('on-'+labelOnClass);
        }
        if(labelOffClass)
        {
            this.el.querySelector('label').classList.add('off-'+labelOffClass);
        }

        this.setValue(checked, {silent: true});
    }

    syncState()
    {
        this.value = this.input.checked;
        this.el.setAttribute('data-value', this.value);
    }

    getValue()
    {
        return this.input.checked;
    }

    setValue(val, options = {})
    {
        const silent = options.silent === true;
        this.input.checked = !!val;
        this.syncState();
        if (!silent)
        {
            this.input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    static autoInit()
    {
        const elements = Array.from(document.querySelectorAll('toggle'));
        elements.forEach((el) =>
        {
            new clsTailwindToggle({ containerEl: el });
        });
    }

    static observe(selector = 'toggle')
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
                        new clsTailwindToggle({ containerEl: node });
                    }

                    node.querySelectorAll?.(selector).forEach(child =>
                    {
                        new clsTailwindToggle({ containerEl: child });
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