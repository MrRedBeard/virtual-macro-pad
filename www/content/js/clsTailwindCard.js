/**
 * clsTailwindCard.js
 *
 * A minimal subclass of clsTailwindComponent that:
 *  - always uses (or upgrades) the existing container to have class="card"
 *  - if no containerEl is passed, it creates a new <div> and gives it class="card"
 */
class clsTailwindCard extends clsTailwindComponent
{
    constructor(options = {})
    {
        super(options);

        this.addClass('card');

        if(typeof options === 'undefined' || !options)
        {
            console.error('clsTailwindCard: options not defined');
        }
        this.options = options;

        if (Array.isArray(options.classes) && options.classes.length > 0)
        {
            this.addClass(...options.classes);
        }

        // Build the image section (if imageUrl + imagePosition are provided)
        if (options.imageUrl && typeof options.imageUrl === 'string')
        {
            if(typeof options.imagePosition === 'undefined' || !options.imagePosition)
            {
                options.imagePosition = 'top';
            }
            const pos = options.imagePosition;
            this.buildImageSection(pos, options.imageUrl, options.sideContent);
        }

        // Build the main content (if provided)
        if (options.content !== undefined)
        {
            this.buildContent(options.content);
        }
    }

    /**
     * Builds either a full-width top image or a side-by-side image/text section.
     *
     * @param {"top"|"side"} pos
     * @param {string} imageUrl
     * @param {string|HTMLElement} [sideContent]
     */
    buildImageSection(pos, imageUrl, sideContent)
    {
        if (pos === 'top')
        {
            let imageWrapper = document.createElement('div');
            imageWrapper.classList.add('image-wrapper');
            const img = document.createElement('img');
            img.setAttribute('src', imageUrl);
            img.classList.add('top');
            img.setAttribute('alt', '');
            imageWrapper.append(img);
            this.element.appendChild(imageWrapper);
        }
        else if (pos === 'side-left' || pos === 'side-right')
        {
            const sideWrapper = document.createElement('div');
            sideWrapper.classList.add('side-wrapper');

            // Left half: image
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('img-side-container');

            const img = document.createElement('img');
            img.setAttribute('src', imageUrl);
            img.classList.add('side');
            img.setAttribute('alt', '');

            imgContainer.appendChild(img);

            // Right half: text/HTML
            const textContainer = document.createElement('div');
            textContainer.classList.add('side-text');

            if (sideContent instanceof HTMLElement)
            {
                textContainer.appendChild(sideContent);
            }
            else if (typeof sideContent === 'string')
            {
                textContainer.innerHTML = sideContent;
            }
            // If no sideContent passed, leave it empty

            if(pos === 'side-left')
            {
                sideWrapper.appendChild(imgContainer);
                sideWrapper.appendChild(textContainer);
            }
            else
            {
                sideWrapper.appendChild(textContainer);
                sideWrapper.appendChild(imgContainer);
            }

            // Append the sideWrapper at top
            this.element.appendChild(sideWrapper);
        }
    }

    /**
     * Builds the main content section at the bottom of the card.
     *
     * @param {string|HTMLElement} content
     */
    buildContent(content)
    {
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content');

        if (content instanceof HTMLElement)
        {
            contentDiv.appendChild(content);
        }
        else if (typeof content === 'string')
        {
            contentDiv.innerHTML = content;
        }

        this.element.appendChild(contentDiv);
    }
}