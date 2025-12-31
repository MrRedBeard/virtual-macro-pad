

/**
 * Banner component with Tailwind CSS styling.
 * @extends clsTailwindComponent
 */
class clsTailwindBanner extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {string} [options.image]
     * @param {('background'|'top'|'left'|'right')} [options.imagePosition]
     * @param {string} [options.title]
     * @param {string} [options.subtitle]
     * @param {string} [options.buttonText]
     * @param {string|Function} [options.buttonAction] - URL string or click handler function.
     * @param {string} [options.class]
     * @param {HTMLElement} [options.containerEl] - Optional container element.
     * @param {string} [options.tag] - Tag name for wrapper if containerEl not provided.
     */
    constructor(options = {}) {
        super(options);
        this.options = options;

        this.element = options.containerEl instanceof HTMLElement
            ? options.containerEl
            : document.createElement(options.tag || 'section');
        this.element.classList.add('banner');

        const position = typeof options.imagePosition === 'string'
            ? options.imagePosition
            : 'background';
        const hasImage = typeof options.image === 'string' && options.image;

        if (position === 'background' && hasImage)
        {
            const bgDiv = document.createElement('div');
            bgDiv.classList.add('background');
            bgDiv.style.backgroundImage = `url('${options.image}')`;
            bgDiv.setAttribute('aria-hidden', 'true');
            this.element.appendChild(bgDiv);

            const overlay = document.createElement('div');
            overlay.classList.add('background-overlay');
            this.element.appendChild(overlay);

            const content = this.buildContent();
            this.element.appendChild(content);
        }
        else if (position === 'top' && hasImage)
        {
            const imgWrapper = document.createElement('div');
            imgWrapper.classList.add('imgWrapper');
            const imgEl = document.createElement('img');
            imgEl.src = options.image;
            imgEl.classList.add('banner-image', 'top');
            imgEl.alt = '';
            imgWrapper.appendChild(imgEl);
            this.element.appendChild(imgWrapper);

            const content = this.buildContent();
            this.element.appendChild(content);
        }
        else if ((position === 'left' || position === 'right') && hasImage) 
        {
            const flexDirection = position === 'right'
                ? 'flex-row-reverse'
                : 'flex-row';
            const wrapper = document.createElement('div');
            wrapper.classList.add('wrapper', flexDirection);

            const imgDiv = document.createElement('div');
            imgDiv.classList.add('imgDiv');
            const imgEl = document.createElement('img');
            imgEl.src = options.image;
            imgEl.classList.add('banner-image', 'side');
            imgEl.alt = '';
            imgDiv.appendChild(imgEl);
            wrapper.appendChild(imgDiv);

            const content = this.buildContent();
            wrapper.appendChild(content);

            this.element.appendChild(wrapper);
        }
        else
        {
            const content = this.buildContent();
            this.element.appendChild(content);
        }
    }

    /**
     * Builds and returns the content node (title, subtitle, button)
     * @returns {HTMLElement}
     */
    buildContent()
    {
        const inner = document.createElement('div');
        inner.classList.add('inner');

        if (this.options.title)
        {
            const h2 = document.createElement('h2');
            h2.classList.add('title');
            h2.innerHTML = this.options.title; // ← allow HTML
            inner.appendChild(h2);
        }

        if (this.options.subtitle)
        {
            const p = document.createElement('p');
            p.classList.add('subtitle');
            p.innerHTML = this.options.subtitle; // ← allow HTML
            inner.appendChild(p);
        }

        if (this.options.buttonText && this.options.buttonAction)
        {
            let btn;
            if (typeof this.options.buttonAction === 'string')
            {
                btn = document.createElement('a');
                btn.setAttribute('href', this.options.buttonAction);
            }
            else if (typeof this.options.buttonAction === 'function')
            {
                btn = document.createElement('button');
                btn.setAttribute('type', 'button');
                btn.addEventListener('click', this.options.buttonAction);
            }
            else
            {
                throw new Error('clsTailwindBanner: buttonAction must be a URL string or function');
            }
            btn.classList.add('btn');
            btn.textContent = this.options.buttonText;
            inner.appendChild(btn);
        }

        return inner;
    }
}