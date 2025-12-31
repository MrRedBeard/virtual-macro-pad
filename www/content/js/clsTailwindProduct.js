class clsTailwindProduct extends clsTailwindCard
{
    /**
     * @param {Object} [options={}]
     * @param {string} options.title
     * @param {string} options.image
     * @param {string} options.description
     * @param {Function} [options.action]
     * @param {string} [options.badgeText]
     */
    constructor(options = {})
    {
        options.imagePosition = 'top';

        const wrapper = document.createElement('div');
        wrapper.classList.add('product-content');

        if(options.badgeText)
        {
            const badge = document.createElement('span');
            badge.classList.add('product-badge');
            badge.textContent = options.badgeText;
            wrapper.appendChild(badge);
        }

        const h3 = document.createElement('h3');
        h3.classList.add('product-title');
        h3.textContent = options.title;
        wrapper.appendChild(h3);

        const pPrice = document.createElement('p');
        pPrice.classList.add('product-price');
        pPrice.textContent = options.description;
        wrapper.appendChild(pPrice);

        const form = document.createElement('form');
        form.classList.add('product-form');

        const button = document.createElement('button');
        button.classList.add('product-button');
        button.type = 'button';
        button.textContent = 'Add to Cart';

        if (typeof options.action === 'function')
        {
            button.addEventListener('click', options.action);
        }

        form.appendChild(button);
        wrapper.appendChild(form);

        options.content = wrapper;
        
        super(options);

        this.element.classList.add('Product');

        const { title = '', description = '', action = null, badgeText = 'New' } = options;

        const imageWrapper = this.element.querySelector('.image-wrapper');
        imageWrapper.classList.add('no-verticle-scrollbar');
        this.image = imageWrapper.querySelector('img');
        this.image.classList.add('product-image');

        imageWrapper.addEventListener('click', () =>
        {
            const details = document.createElement('div');
            const imageWrapper = document.createElement('div');
            imageWrapper.classList.add('no-verticle-scrollbar','product-image-wrapper');
            const clonedImage = this.image.cloneNode(true);
            imageWrapper.append(clonedImage);
            details.append(imageWrapper);
            const description = document.createElement('p');
            description.textContent = options.description;
            details.append(description);

            new clsTailwindModal(
            {
                title: options.title,
                body: details,
                size: 'xl',
                ClickOffClosed: true,
                CloseButton: true,
                CancelButton: false,
                DoneButton: false
            });
        });
        
    }
}