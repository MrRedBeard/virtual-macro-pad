/**
 * clsTailwindSignupOptions - a class for subscriptions 
 */
class clsTailwindSignupOptions extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {Array<Object>} options.plans
     * @param {string} [options.class]
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;

        const
        {
            plans           = [],
            class: customClass = ''
        }
        = options;

        this.element = options.containerEl instanceof HTMLElement
            ? options.containerEl
            : document.createElement('div');
        this.element.classList.add('SignupOptions');

        // this.element.className =
        //     + (customClass ? ` ${customClass}` : '');

        const grid = document.createElement('div');
        grid.classList.add('gridEl');

        plans.forEach
        (
            plan =>
            {
                const card = this.buildPlanCard(plan);
                grid.appendChild(card);
            }
        );

        this.element.appendChild(grid);
    }

    /**
     * Builds a single plan card
     * @param {Object} plan
     */
    buildPlanCard(plan)
    {
        const
        {
            title        = '',
            image        = '',
            description  = '',
            price        = '',
            frequency    = '',
            buttonText   = 'Get Started',
            buttonHref   = '#',
            buttonAction = null,
            features     = {}
        }
        = plan;

        const cardWrapper = document.createElement('div');
        cardWrapper.classList.add('cardWrapper');

        // Top section
        const top = document.createElement('div');
        top.classList.add('top');

        const h2 = document.createElement('h2');
        h2.textContent = title;

        const sr = document.createElement('span');
        sr.classList.add('sr');

        sr.textContent = 'Plan';

        h2.appendChild(sr);

        top.appendChild(h2);

        if(image)
        {
            const imgEl = document.createElement('img');
            imgEl.src = image;
            imgEl.alt = `${title} image`;
            top.appendChild(imgEl);
        }

        if(description)
        {
            const desc = document.createElement('p');
            desc.classList.add('description');

            desc.innerHTML = description;

            top.appendChild(desc);
        }

        if(price)
        {
            const priceP = document.createElement('p');
            priceP.classList.add('price');

            const strong = document.createElement('strong');
            strong.classList.add('strong-price');

            strong.textContent = price;

            priceP.appendChild(strong);

            if(frequency)
            {
                const spanFreq = document.createElement('span');
                spanFreq.classList.add('frequency');

                spanFreq.textContent = `/${frequency}`;

                priceP.appendChild(spanFreq);
            }

            top.appendChild(priceP);
        }

        if(buttonText)
        {
            const a = document.createElement('a');
            a.classList.add('signup-button');

            if(typeof buttonAction === 'function')
            {
                a.href = 'javascript:void(0)';

                a.addEventListener('click', buttonAction);
            }
            else
            {
                a.href = buttonHref;
            }

            a.textContent = buttonText;

            top.appendChild(a);
        }

        cardWrapper.appendChild(top);

        // Bottom features section
        const bottom = document.createElement('div');
        bottom.classList.add('bottom-section');

        const inc = document.createElement('p');
        inc.classList.add('bottom-section-title');
        inc.textContent = "What's included:";

        bottom.appendChild(inc);

        const ul = document.createElement('ul');

        Object.entries(features).forEach
        (
            ([featName, available]) =>
            {
                const li = document.createElement('li');

                const svg = document.createElementNS
                (
                    'http://www.w3.org/2000/svg',
                    'svg'
                );

                svg.setAttribute
                (
                    'xmlns',
                    'http://www.w3.org/2000/svg'
                );

                svg.setAttribute
                (
                    'fill',
                    'none'
                );

                svg.setAttribute
                (
                    'viewBox',
                    '0 0 24 24'
                );

                svg.setAttribute
                (
                    'stroke-width',
                    '1.5'
                );

                svg.setAttribute
                (
                    'stroke',
                    'currentColor'
                );

                svg.classList.add('icon');
                if(available)
                {
                    svg.classList.add('available');
                }
                else
                {
                    svg.classList.add('not-available');
                }

                const path = document.createElementNS
                (
                    'http://www.w3.org/2000/svg',
                    'path'
                );

                path.setAttribute
                (
                    'stroke-linecap',
                    'round'
                );

                path.setAttribute
                (
                    'stroke-linejoin',
                    'round'
                );

                if(available)
                {
                    path.setAttribute
                    (
                        'd',
                        'M4.5 12.75l6 6 9-13.5'
                    );
                }
                else
                {
                    path.setAttribute
                    (
                        'd',
                        'M6 18L18 6M6 6l12 12'
                    );
                }

                svg.appendChild(path);

                li.appendChild(svg);

                const span = document.createElement('span');
                span.classList.add('feature-name');
                span.textContent = featName;

                li.appendChild(span);

                ul.appendChild(li);
            }
        );

        bottom.appendChild(ul);
        cardWrapper.appendChild(bottom);

        return cardWrapper;
    }
}