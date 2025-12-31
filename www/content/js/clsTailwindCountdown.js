class clsTailwindCountdown extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement} [options.containerEl]  Use this existing element as countdown root.
     * @param {string|Date} options.endDate        Required: End date/time as ISO string or Date object.
     */
    constructor(options = {})
    {
        super(options);

        this.flip = false;
        this.outerWrapper;

        if(typeof options.flip !== 'undefined' && options.flip)
        {
            this.flip = true;
        }

        if (!options.endDate) 
        {
            throw new Error('clsTailwindCountdown: endDate is required');
        }

        //this.valueFlippers = {};


        // labels for each of the 12 digits in YYMMDDHHMMSS
        const slots = [
            'Y1','Y2',
            'M1','M2',
            'D1','D2',
            'h1','h2',
            'm1','m2',
            's1','s2'
        ];

        // slots.forEach(slot =>
        // {
        //     this.valueFlippers[slot] = {
        //         wrapper:          null,
        //         staticTopText:    null,
        //         staticBottomText: null,
        //         flipFront:        null,
        //         flipBack:         null
        //     };
        // });

        // dynamic list of flip‐slot objects
        this.flippers     = [];
        // parse target timestamp
        this.endTimestamp = Date.parse(options.endDate);

        // Parse endDate into a timestamp
        this.endTimestamp =
            options.endDate instanceof Date
            ? options.endDate.getTime()
            : new Date(options.endDate).getTime();

        if (isNaN(this.endTimestamp))
        {
            throw new Error('clsTailwindCountdown: provided endDate is invalid');
        }

        // Add flex / gap classes to root
        this.addClass('countdown');

        // Create inner structure and store references to the value spans
        this.init();

        // If current time is less than end, start the timer. Otherwise, show zeros.
        if (Date.now() < this.endTimestamp)
        {
            this.startTimer();
        }
        else
        {
            this.setAllZero();
        }
    }

    /**
     * Build the HTML structure for days/hours/min/sec.
     * Stores references to each inner <span> that displays the numeric value.
     */
    init()
    {
        this.valueSpans = {
            days: null,
            hours: null,
            minutes: null,
            seconds: null
        };

        this.outerWrapper = document.createElement('div');
        this.outerWrapper.classList.add('outer-wrapper');
        this.element.appendChild(this.outerWrapper);

        if (this.flip)
        {
            // const slots = Object.keys(this.valueFlippers);

            // slots.forEach(slot =>
            // {
            //     const fl = this.createFlipper(slot);

            //     Object.assign(this.valueFlippers[slot],
            //     {
            //         wrapper:          fl.wrapper,
            //         staticTopText:    fl.staticTopText,
            //         staticBottomText: fl.staticBottomText,
            //         flipFront:        fl.flipFront,
            //         flipBack:         fl.flipBack
            //     });

            //     this.outerWrapper.appendChild(fl.wrapper);
            // });
        }
        else
        {
            const daySegment = this.createDigitalSegment('days');
            this.valueSpans.days = daySegment.innerSpan;
            this.outerWrapper.appendChild(daySegment.container);

            const hourSegment = this.createDigitalSegment('hours');
            this.valueSpans.hours = hourSegment.innerSpan;
            this.outerWrapper.appendChild(hourSegment.container);

            const minSegment = this.createDigitalSegment('min');
            this.valueSpans.minutes = minSegment.innerSpan;
            this.outerWrapper.appendChild(minSegment.container);

            const secSegment = this.createDigitalSegment('sec');
            this.valueSpans.seconds = secSegment.innerSpan;
            this.outerWrapper.appendChild(secSegment.container);
        }
    }

    /**
     * Start the 1-second interval to update remaining time.
     */
    startTimer()
    {
        // seed the first frame immediately
        this.updateValues();
        
        this._intervalId = setInterval(() =>
        {
            this.updateValues();
        }, 1000);
    }

    /**
     * Compute the remaining time and update the spans.
     * If time is up, clear the interval and set all to zero.
     */
    updateValues()
    {
        if(this.flip)
        {
            // 1) If we’ve passed the end, clear everything
            if (Date.now() >= this.endTimestamp)
            {
                clearInterval(this._intervalId);
                this.outerWrapper.innerHTML = '';
                return;
            }

            // 2) Get the list of { digit, label } objects for this tick
            const segments = this.computeCountdownArray();

            // 3) Add missing flippers, passing in the label for each new one
            while (this.flippers.length < segments.length)
            {
                const { label } = segments[this.flippers.length];
                const fl       = this.createFlipper(label);
                this.flippers.push(fl);
                this.outerWrapper.appendChild(fl.wrapper);
            }

            // 4) Remove any extra flippers
            while (this.flippers.length > segments.length)
            {
                const fl = this.flippers.pop();
                this.outerWrapper.removeChild(fl.wrapper);
            }

            // 5) Flip each slot to its new digit
            segments.forEach(({ digit }, idx) =>
            {
                this.flipTo(this.flippers[idx], digit);
            });
        }
        else
        {
            const now = Date.now();
            let diff = this.endTimestamp - now;

            if (diff <= 0)
            {
                // Time’s up: stop further updates
                clearInterval(this._intervalId);
                this.setAllZero();
                return;
            }

            // Compute days, hours, minutes, seconds
            const msPerSecond = 1000;
            const msPerMinute = msPerSecond * 60;
            const msPerHour = msPerMinute * 60;
            const msPerDay = msPerHour * 24;

            const days = Math.floor(diff / msPerDay);
            diff -= days * msPerDay;

            const hours = Math.floor(diff / msPerHour);
            diff -= hours * msPerHour;

            const minutes = Math.floor(diff / msPerMinute);
            diff -= minutes * msPerMinute;

            const seconds = Math.floor(diff / msPerSecond);

            // Update each inner span (CSS variable and textContent + aria-label)
            this.updateSpan(this.valueSpans.days, days);
            this.updateSpan(this.valueSpans.hours, hours);
            this.updateSpan(this.valueSpans.minutes, minutes);
            this.updateSpan(this.valueSpans.seconds, seconds);
        }
    }

    /**
     * If the end date is already passed, display all zeros.
     */
    setAllZero()
    {
        this.updateSpan(this.valueSpans.days, 0);
        this.updateSpan(this.valueSpans.hours, 0);
        this.updateSpan(this.valueSpans.minutes, 0);
        this.updateSpan(this.valueSpans.seconds, 0);
    }

    /**
     * Remove the interval and the element from the DOM.
     */
    dismiss()
    {
        if (this._intervalId)
        {
            clearInterval(this._intervalId);
        }
        if (this.element.parentNode)
        {
            this.element.parentNode.removeChild(this.element);
        }
    }

    computeCountdownString()
    {
        const now = new Date();
        const end = new Date(this.endTimestamp);

        // calendar difference
        let years   = end.getFullYear()  - now.getFullYear();
        let months  = end.getMonth()     - now.getMonth();
        let days    = end.getDate()      - now.getDate();
        let hours   = end.getHours()     - now.getHours();
        let minutes = end.getMinutes()   - now.getMinutes();
        let seconds = end.getSeconds()   - now.getSeconds();

        // normalize negatives
        if (seconds < 0)
        {
            seconds  += 60;
            minutes--;
        }

        if (minutes < 0)
        {
            minutes  += 60;
            hours--;
        }

        if (hours < 0)
        {
            hours   += 24;
            days--;
        }

        if (days < 0)
        {
            // days in the month before `end`
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days     += prevMonth.getDate();
            months--;
        }

        if (months < 0)
        {
            months  += 12;
            years--;
        }

        // zero-pad helper
        const pad2 = num =>
        {
            const s = num.toString();
            return s.length < 2 ? '0' + s : s;
        };

        return (
            pad2(years) +
            pad2(months) +
            pad2(days) +
            pad2(hours) +
            pad2(minutes) +
            pad2(seconds)
        );
    }

    /**
     * Return an array of single‐digit strings to show, in order:
     *  [Y…][M…][D…][H…][m…][S…] per your rules.
     */
    /**
     * Return an array of { digit, label } objects, dropping zero‐value segments.
     * Segments: Years (Y), Months (M), Days (D), Hours (H), Minutes (m), Seconds (s)
     */
    computeCountdownArray()
    {
        const now    = new Date();
        const end    = new Date(this.endTimestamp);

        let years   = end.getFullYear()  - now.getFullYear();
        let months  = end.getMonth()     - now.getMonth();
        let days    = end.getDate()      - now.getDate();
        let hours   = end.getHours()     - now.getHours();
        let mins    = end.getMinutes()   - now.getMinutes();
        let secs    = end.getSeconds()   - now.getSeconds();

        // normalize negatives (borrow)
        if (secs   <  0) { secs   += 60; mins--; }
        if (mins   <  0) { mins   += 60; hours--; }
        if (hours  <  0) { hours  += 24; days--; }
        if (days   <  0)
        {
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days   += prevMonth.getDate();
            months--;
        }
        if (months <  0) { months += 12; years--; }

        // build an array of segments with labels
        const result = [];
        const segments = [
        { val: years,  label: 'Y' },
        { val: months, label: 'M' },
        { val: days,   label: 'D' },
        { val: hours,  label: 'H' },
        { val: mins,   label: 'm' }
        ];

        segments.forEach(({ val, label }) =>
        {
            if (val > 0)
            {
                // split multi‐digit numbers into individual chars
                String(val).split('').forEach(d =>
                {
                    result.push({ digit: d, label });
                });
            }
        });

        // always show seconds
        if (result.length > 0)
        {
            // pad to two digits when higher segments exist
            String(secs).padStart(2, '0')
                .split('')
                .forEach(d => result.push({ digit: d, label: 's' }));
        }
        else
        {
            // only seconds: drop leading zero
            String(secs)
                .split('')
                .forEach(d => result.push({ digit: d, label: 's' }));
        }

        return result;
    }

    createDigitalSegment(labelText)
    {
        const container = document.createElement('div');

        // Outer span with classes
        const outerSpan = document.createElement('span');
        outerSpan.classList.add('outerSpan');

        // Inner span holds the number, with CSS variable --value
        const innerSpan = document.createElement('span');
        innerSpan.setAttribute('aria-live', 'polite');
        innerSpan.setAttribute('aria-label', '0');
        innerSpan.style.setProperty('--value', '0');
        innerSpan.textContent = '0';

        outerSpan.appendChild(innerSpan);
        container.appendChild(outerSpan);

        // Label text (e.g. "days", "hours")
        const textNode = document.createTextNode(` ${labelText}`);
        container.appendChild(textNode);

        return { container, innerSpan };
    }

    /**
     * Update a single <span> with the numeric value.
     * @param {HTMLElement} spanEl - The inner <span> to update.
     * @param {number} value - The numeric value to display.
     */
    updateSpan(spanEl, value)
    {
        spanEl.style.setProperty('--value', value.toString());
        spanEl.textContent = value.toString();
        spanEl.setAttribute('aria-label', value.toString());
    }

    createFlipper(label)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('wrapper');

        const card = document.createElement('div');
        card.classList.add('card-digit');
        wrapper.appendChild(card);

        // static top
        const staticTop = document.createElement('div');
        staticTop.classList.add('static-top');
        const stText   = document.createElement('span');
        stText.classList.add('static-top-text');
        staticTop.appendChild(stText);
        card.appendChild(staticTop);

        // static bottom
        const staticBottom = document.createElement('div');
        staticBottom.classList.add('static-bottom');
        const sbText       = document.createElement('span');
        sbText.classList.add('static-bottom-text');
        staticBottom.appendChild(sbText);
        card.appendChild(staticBottom);

        // flipping top half
        const flipHalf = document.createElement('div');
        flipHalf.classList.add('flip-half', 'top');

        const front = document.createElement('div');
        front.classList.add('face', 'front');
        const fSpan = document.createElement('span');
        fSpan.classList.add('flip-front-text');
        front.appendChild(fSpan);

        const back = document.createElement('div');
        back.classList.add('face', 'back');
        const bSpan = document.createElement('span');
        bSpan.classList.add('flip-back-text');
        back.appendChild(bSpan);

        flipHalf.appendChild(front);
        flipHalf.appendChild(back);
        card.appendChild(flipHalf);

        // Label: 
        // const labelEl = document.createElement('div');
        // labelEl.classList.add('card-label');
        // labelEl.textContent = label;
        // wrapper.insertBefore(labelEl, card);  // places it above the card-digit
        wrapper.setAttribute('data-label', label);

        return {
            wrapper,
            staticTopText:    stText,
            staticBottomText: sbText,
            flipFront:        fSpan,
            flipBack:         bSpan
        };
    }

    flipTo(flipObj, newValue)
    {
        const {
            wrapper,
            staticTopText,
            staticBottomText,
            flipFront,
            flipBack
        } = flipObj;

        const oldValue = staticTopText.textContent;

        // nothing to do?
        if (oldValue === newValue)
        {
            return;
        }

        // prepare the flip…
        flipFront.textContent  = oldValue;   // front shows the old digit
        flipBack.textContent   = newValue;   // back shows the new digit

        // force reflow so the CSS transition will happen
        void wrapper.offsetWidth;

        // Listen for the end of the CSS flip
        const onEnd = e =>
        {
            if (e.propertyName !== 'transform') return;
            wrapper.removeEventListener('transitionend', onEnd);

            // Commit the new digit halves
            staticTopText.textContent    = newValue;
            staticBottomText.textContent = newValue;

            // Hide the flip‐half again
            wrapper.classList.remove('flipped');
        };

        wrapper.addEventListener('transitionend', onEnd);

        // start the fold
        wrapper.classList.add('flipped');

        // when it’s done, swap in the new static halves
        setTimeout(() =>
        {
            staticTopText.textContent    = newValue;
            staticBottomText.textContent = newValue;
            wrapper.classList.remove('flipped');
        }, 600);
    }
}