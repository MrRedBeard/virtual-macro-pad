class clsTailwindCart extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}] 
     * @param {HTMLElement} [options.containerEl]  
     * @param {Array<Object>} options.items       
     *    Each item: { image, title, details: { key: value }, quantity, cost, removeAction }
     * @param {string} [options.class]            
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;

        const
        {
            containerEl,
            items   = [],
            class: customClass = ''
        }
        = options;

        this.element = document.createElement('div');
        //this.element.className = 'cart-container' + (customClass ? ` ${customClass}` : '');
        this.element.classList.add('Cart');

        // Header
        const header = document.createElement('header');
        header.className = 'cart-header';
        const h1 = document.createElement('h1');
        h1.textContent = 'Your Cart';
        header.appendChild(h1);
        this.element.appendChild(header);

        // Items list
        const listWrapper = document.createElement('div');
        listWrapper.className = 'cart-list';
        const ul = document.createElement('ul');
        ul.className = 'cart-items';

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'cart-item';

            // Image
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.title;
            img.className = 'cart-item-image';
            //li.appendChild(img);

            // Details
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'cart-item-details';
            const titleEl = document.createElement('h3');
            titleEl.classList.add('title');
            titleEl.textContent = item.title;
            detailsDiv.appendChild(titleEl);
            const dl = document.createElement('dl');
            Object.entries(item.details || {}).forEach(([key, val]) => {
                const row = document.createElement('div');
                const dt = document.createElement('dt');
                dt.textContent = key + ':';
                const dd = document.createElement('dd');
                dd.textContent = val;
                row.appendChild(dt);
                row.appendChild(dd);
                dl.appendChild(row);
            });
            detailsDiv.appendChild(dl);
            //li.appendChild(detailsDiv);

            // Quantity and remove
            const controls = document.createElement('div');
            controls.className = 'cart-item-controls';
            const form = document.createElement('form');
            
            const qtyWrapper = document.createElement('div');
            qtyWrapper.classList.add('qty-wrapper');

            const label = document.createElement('div');
            label.classList.add('cart-item-label');
            const qtyId = `cart-item-qty-${index}`;
            label.htmlFor = qtyId;
            label.textContent = 'Quantity';
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.value = item.quantity;
            input.id = qtyId;
            input.className = 'cart-item-quantity';
            qtyWrapper.appendChild(label);
            qtyWrapper.appendChild(input);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'cart-item-remove';
            const sr = document.createElement('span');
            sr.classList.add('sr');
            sr.innerHTML = 'Remove item';
            removeBtn.append(sr);
            const icon = document.createElement('i');
            icon.classList.add('kfi-trash');
            removeBtn.append(icon);
            if (typeof item.removeAction === 'function')
            {
                removeBtn.addEventListener('click', item.removeAction);
            }
            form.appendChild(img);
            form.appendChild(detailsDiv);
            form.appendChild(qtyWrapper);
            form.appendChild(removeBtn);
            controls.appendChild(form);
            li.appendChild(controls);

            ul.appendChild(li);
        });

        listWrapper.appendChild(ul);
        this.element.appendChild(listWrapper);

        // Summary placeholders
        const summary = document.createElement('div');
        summary.className = 'cart-summary';
        const dlSum = document.createElement('dl');
        ['Subtotal', 'VAT', 'Discount', 'Total'].forEach(label => {
            const row = document.createElement('div');
            row.classList.add('row');
            if(label === 'Total')
            {
                row.classList.add('total');
            }
            const dt = document.createElement('dt');
            dt.textContent = label;
            const dd = document.createElement('dd');
            dd.textContent = ''; // placeholder
            row.appendChild(dt);
            row.appendChild(dd);
            dlSum.appendChild(row);
        });
        summary.appendChild(dlSum);
        this.element.appendChild(summary);

        if (containerEl)
        {
            this.mount(containerEl);
        }
    }

    /**
     * Mounts cart into target
     * @param {HTMLElement} target
     */
    mount(target)
    {
        target.appendChild(this.element);
    }
}