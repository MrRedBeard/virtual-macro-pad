class clsTailwindCallToAction extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {string} [options.image]
     * @param {string} [options.title]
     * @param {string} [options.body]
     * @param {string} [options.buttonText]
     * @param {string} [options.buttonHref]
     * @param {Function} [options.buttonAction]  // JS function for click
     * @param {string} [options.class]
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;

        this.element = options.containerEl instanceof HTMLElement
            ? options.containerEl
            : document.createElement(options.tag || 'section');
        this.element.classList.add('call-to-action');
        // if(customClass)
        // {

        // }

        // Text container
        const textDiv = document.createElement('div');
        textDiv.className = 'text';

        const innerDiv = document.createElement('div');
        innerDiv.className = 'innerDiv';

        if (this.options.title)
        {
            const h2 = document.createElement('h2');
            h2.className = 'title';
            h2.innerHTML = this.options.title;
            innerDiv.appendChild(h2);
        }

        if (this.options.body)
        {
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'body';
            bodyDiv.innerHTML = this.options.body;
            innerDiv.appendChild(bodyDiv);
        }

        if (this.options.buttonAction || this.options.buttonHref)
        {
            const btnWrapper = document.createElement('div');
            btnWrapper.classList.add('btnWrapper');

            const a = document.createElement('a');
            a.classList.add('buttonHref');

            if(this.options.buttonAction)
            {
                a.addEventListener('click', this.options.buttonAction)
            }
            else if(this.options.buttonHref)
            {
                a.href = this.options.buttonHref;
            }

            if(this.options.buttonText)
            {
                a.textContent = this.options.buttonText;
            }

            btnWrapper.appendChild(a);
            innerDiv.appendChild(btnWrapper);
        }

        textDiv.appendChild(innerDiv);
        this.element.appendChild(textDiv);

        // Image container
        const imgDiv = document.createElement('div');
        imgDiv.className = 'imgDiv';

        const img = document.createElement('img');
        img.alt = 'Call to action image';
        img.src = this.options.image;
        // img.className = '';

        imgDiv.appendChild(img);
        this.element.appendChild(imgDiv);
    }
}