class clsTailwindRating extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement}   [options.containerEl] If provided, use this existing element (must be a <div> or similar).
     * @param {number} [options.initial=0] Initial rating value (0–5). Stars ≥ initial are filled.
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;

        // Current value (0–5)
        this.value = 0;

        this.addClass('rating');

        // Create five <i> elements for the stars
        this.stars = [];

        for (let i = 0; i < 5; i++)
        {
            const star = document.createElement('i');
            star.classList.add('kfi-star-empty');
            star.setAttribute('aria-label', `${i + 1} star`);

            star.addEventListener('click', () =>
            {
                this.setValue(i + 1);
            });

            this.stars.push(star);
            this.element.appendChild(star);
        }

        // options.initial between 1–5
        const init = parseInt(this.options.initial);
        if (!isNaN(init) && init >= 1 && init <= 5)
        {
            this.setValue(init);
        }
    }

    /**
     * Set the rating value (1–5). Updates star icons accordingly.
     * @param {number} n  Value between 1 and 5 (or 0 to clear).
     */
    setValue(n)
    {
        const clamped = Math.max(0, Math.min(5, n));
        this.value = clamped;

        // Update each star: if index < value ⇒ filled, else ⇒ empty
        this.stars.forEach((starEl, idx) =>
        {
            if (idx < clamped)
            {
                starEl.classList.remove('kfi-star-empty');
                starEl.classList.add('kfi-star-filled', 'text-yellow-400');
                starEl.setAttribute('aria-current', 'true');
            }
            else 
            {
                starEl.classList.remove('kfi-star-filled', 'text-yellow-400');
                starEl.classList.add('kfi-star-empty');
                starEl.removeAttribute('aria-current');
            }
        });

        if (typeof this.options.onChange === 'function')
        {
            this.options.onChange(this.value);
        }
    }

    /**
     * Return the current rating (0–5).
     */
    getValue()
    {
        return this.value;
    }
}