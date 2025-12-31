/**
 * clsTailwindSteps.js
 *
 * A subclass of clsTailwindComponent that renders a horizontal steps/progress UI
 * with animated transitions when the current step changes.
 *
 * Options:
 *   @param {Object}       [options={}]
 *   @param {HTMLElement}   [options.containerEl]      If provided, use this element as the root.
 *   @param {string[]}      [options.classes]          Extra Tailwind classes to apply on the root wrapper.
 *   @param {Array<Object>} [options.steps]            Array of step objects:
 *     - id:         unique identifier (string or number)
 *     - name:       display text for the step
 *     - iconClass:  font-icon class(es) for the step icon
 *   @param {string|number} [options.currentStepId]    The id of the current (active) step
 *
 * Methods:
 *   - getCurrentStep(): returns the step object corresponding to the currentStepId (or null)
 *   - setCurrentStep(id): sets currentStepId to id, then updates the UI with animation (throws if id not found)
 *
 * Usage:
 *   const stepsUi = new clsTailwindSteps({
 *     containerEl: document.querySelector('.mySteps'),
 *     classes: ['mb-6'],
 *     steps: [
 *       { id: 'details',  name: 'Details',  iconClass: 'fi fi-info-circle' },
 *       { id: 'address',  name: 'Address',  iconClass: 'fi fi-map-marker' },
 *       { id: 'payment',  name: 'Payment',  iconClass: 'fi fi-credit-card' }
 *     ],
 *     currentStepId: 'address'
 *   });
 *
 *   // Get current:
 *   const current = stepsUi.getCurrentStep();
 *
 *   // Change current (with smooth animation):
 *   stepsUi.setCurrentStep('payment');
 */

class clsTailwindSteps extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;

        // Validate and store steps array
        this.steps = Array.isArray(options.steps) ? options.steps : [];
        // Store current step id
        this.currentStepId = options.currentStepId;

        // Root element: provided or newly created DIV
        this.element = options.containerEl instanceof HTMLElement
            ? options.containerEl
            : document.createElement(options.tag || 'div');

        this.element.classList.add('steps');

        // Apply extra Tailwind classes if provided
        if (Array.isArray(options.classes))
        {
            this.element.classList.add(...options.classes);
        }

        // Internal references:
        this.progressFillEl = null; // the inner div of the progress bar
        this.stepItemEls = [];      // array of <li> elements, in order

        // Initial render
        this.render();
    }

    /**
     * Returns the step object for currentStepId, or null if not found.
     * @returns {Object|null}
     */
    getCurrentStep()
    {
        const step = this.steps.find(s => s.id === this.currentStepId);
        return step || null;
    }

    /**
     * Sets a new current step by id, then updates the UI with animation. Throws if id not found.
     * @param {string|number} id
     */
    setCurrentStep(id)
    {
        const exists = this.steps.some(s => s.id === id);
        if (!exists)
        {
            throw new Error(`Step id "${id}" not found among steps.`);
        }
        this.currentStepId = id;
        this.update();
    }

    /**
     * Build the DOM structure fresh: progress bar + steps list.
     */
    render()
    {
        // Clear existing content
        this.element.innerHTML = '';
        this.stepItemEls = [];
        this.progressFillEl = null;

        // === PROGRESS BAR CONTAINER ===
        const wrapperBar = document.createElement('div');
        wrapperBar.classList.add('wrapperBar');

        // Inner fill element with CSS transition for width (200ms ease-out)
        const fillEl = document.createElement('div');
        fillEl.classList.add('progress');
        // Initial width; will be set in update()
        fillEl.style.width = '0%';

        wrapperBar.appendChild(fillEl);
        this.element.appendChild(wrapperBar);

        // Save reference to fill element
        this.progressFillEl = fillEl;

        // === STEPS LIST (OL) ===
        const ol = document.createElement('ol');
        // Dynamic grid columns based on number of steps
        const n = this.steps.length;

        // Tailwind supports grid-cols-1…grid-cols-12. Otherwise fallback.
        if (n >= 1 && n <= 12)
        {
            ol.classList.add(`grid-cols-${n}`);
        }
        else
        {
            // Fallback: generic grid; may require custom Tailwind config
            ol.classList.add(`grid-cols-[${n}]`);
        }

        // Build each <li>
        this.steps.forEach((step, index) =>
        {
            const isLast = index === n - 1;
            const li = document.createElement('li');

            // Alignment: first => justify-start, last => justify-end, else => justify-center
            if (index === 0)
            {
                li.classList.add('justify-start');
            }
            else if (isLast)
            {
                li.classList.add('justify-end');
            }
            else
            {
                li.classList.add('justify-center');
            }

            const wrapper = document.createElement('div');
            wrapper.classList.add('wrapper');

            // Determine if this step is completed or current
            const currentIndex = this.steps.findIndex(s => s.id === this.currentStepId);
            if (currentIndex === -1 || index > currentIndex)
            {
                // leave default text-gray-500 inherited from parent
            }
            else
            {
                // Completed or current: blue text
                //li.classList.add('text-blue-600');
                wrapper.classList.add('text-blue-500');
            }

            // Icon element (font icon)
            const iconEl = document.createElement('i');
            // Apply provided icon classes plus sizing classes & color transition
            iconEl.classList.add(`${step.iconClass}`);
            wrapper.appendChild(iconEl);

            // Step label (hidden on small screens)
            const spanLabel = document.createElement('p');
            //spanLabel.classList.add('hidden', 'sm:inline');
            spanLabel.classList.add('label');
            spanLabel.textContent = step.name;

            wrapper.appendChild(spanLabel)

            //li.appendChild(spanLabel);
            li.appendChild(wrapper);

            ol.appendChild(li);
            this.stepItemEls.push(li);
        });

        this.element.appendChild(ol);

        // Initial update to set correct fill width and colors
        this.update();
    }

    /**
     * Update progress bar width and step item classes based on currentStepId.
     * Animations handled by CSS transitions on fill & text colors.
     */
    update()
    {
        const n = this.steps.length;
        const currentIndex = this.steps.findIndex(s => s.id === this.currentStepId);

        // Calculate new width percentage
        let pct = 0;
        if (currentIndex <= 0)
        {
            pct = 0;
        }
        else if (currentIndex >= n - 1)
        {
            pct = 100;
        }
        else
        {
            pct = (currentIndex / (n - 1)) * 100;
        }
        // This triggers a 200ms ease-out transition
        this.progressFillEl.style.width = pct + '%';

        // Update each li's color class (animated via transition-colors)
        this.stepItemEls.forEach((li, index) =>
        {
            // Remove any existing text-blue-600
            li.classList.remove('text-blue-500');
            // If index ≤ currentIndex => add text-blue-600; else default gray
            if (currentIndex !== -1 && index <= currentIndex)
            {
                li.classList.add('text-blue-500');
            }
        });
    }
}