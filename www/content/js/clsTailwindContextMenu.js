class clsTailwindContextMenu extends clsTailwindComponent
{
    constructor(options = {})
    {
        super({
            tag: 'div',
            classes: ['context-menu']
        });

        if (!this._contextMenuHandlerMap)
        {
            this._contextMenuHandlerMap = new WeakMap();
        }

        this.items = options.items || [];
        this.parent = options.container || document.body;
        this.isOpen = false;

        this.keyboardNav = false;
        this.focusIndex = -1;

        window.addEventListener('keydown', e =>
        {
            if(!this.isOpen)
            {
                this.keyboardNav = false;
                return;
            }

            // Set flag if using tab, arrow keys, etc.
            if (['Tab', 'ArrowUp', 'ArrowDown'].includes(e.key))
            {
                this.keyboardNav = true;
            }
        });
        window.addEventListener('mousedown', () => this.keyboardNav = false);
        window.addEventListener('touchstart', () => this.keyboardNav = false);

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.render();
    }

    render()
    {
        this.element.innerHTML = ''; // Clear menu
        this.element.setAttribute('role', 'menu');
        this.element.setAttribute('aria-orientation', 'vertical');

        this.items.forEach(item => this.appendChild(this.createItem(item)));
    }

    createItem(item)
    {
        const btn = document.createElement('button');
        btn.type = 'button';
        //btn.className
        btn.setAttribute('role', 'menuitem');

        const icon = document.createElement('i');
        icon.className = `kfi ${item.icon || 'kfi-dots-horizontal'}`;
        btn.appendChild(icon);

        const text = document.createElement('span');
        text.textContent = item.label;
        btn.appendChild(text);

        btn.addEventListener('click', e =>
        {
            e.stopPropagation();
            this.close();

            if (typeof item.onClick === 'function')
            {
                item.onClick(e);
            }
            else if (typeof item.url === 'string')
            {
                window.location.href = item.url;
            }
        });

        return btn;
    }

    show(x, y)
    {
        this.render();
        this.mount(this.parent);
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.display = 'block';
        this.isOpen = true;

        this.focusIndex = -1;
        this.focusItem(this.focusIndex);

        setTimeout(() =>
        {
            document.addEventListener('click', this.handleDocumentClick);
            document.addEventListener('keydown', this.handleKeyDown);
        }, 0);
    }

    close()
    {
        if (this.element.parentNode)
        {
            this.element.remove();
        }

        this.isOpen = false;
        this.focusIndex = -1;
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    focusItem(index)
    {
        if (!this.keyboardNav) return;
        
        const items = this.element.querySelectorAll('button:not(:disabled)');
        if (items.length === 0) return;

        // Wrap around
        if (index < 0) index = items.length - 1;
        if (index >= items.length) index = 0;

        this.focusIndex = index;
        items[index].focus();
    }

    handleKeyDown(e)
    {
        if (!this.isOpen) return;

        this.keyboardNav = true;

        const items = this.element.querySelectorAll('button:not(:disabled)');

        switch (e.key)
        {
            case 'ArrowDown':
                e.preventDefault();
                this.focusItem(this.focusIndex + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.focusItem(this.focusIndex - 1);
                break;
            case 'Enter':
                e.preventDefault();
                if (items[this.focusIndex])
                {
                    items[this.focusIndex].click();
                }
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    handleDocumentClick(e)
    {
        if (!this.element.contains(e.target))
        {
            this.close();
        }
    }

    addItem(item)
    {
        this.items.push(item);
        if (this.isOpen) this.render();
    }

    removeItem(label)
    {
        this.items = this.items.filter(i => i.label !== label);
        if (this.isOpen) this.render();
    }

    detach(el)
    {
        const elements = (typeof el === 'string')
            ? document.querySelectorAll(el)
            : el instanceof NodeList
                ? el
                : [el];

        elements.forEach(elem =>
        {
            elem.removeEventListener('contextmenu', this._contextMenuHandlerMap?.get(elem));
            this._contextMenuHandlerMap?.delete(elem);
        });
    }

    static bindTo(selectorOrElement, items, container = null)
    {
        const contextMenu = new clsTailwindContextMenu({ items, container });
        contextMenu.bindToElements(selectorOrElement);
        return contextMenu;
    }

    bindToElements(selectorOrElements)
    {
        const elements = typeof selectorOrElements === 'string'
            ? document.querySelectorAll(selectorOrElements)
            : selectorOrElements;

        elements.forEach(el =>
        {
            const handler = (e) =>
            {
                e.preventDefault();
                 this.show(e.pageX, e.pageY);
            };

            el.addEventListener('contextmenu', handler);
            this._contextMenuHandlerMap.set(el, handler);
        });
    }
}