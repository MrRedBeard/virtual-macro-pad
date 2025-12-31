class clsTailwindCommon extends clsTailwindComponent
{
    constructor()
    {
        super();
    }

    static autoInit()
    {
        this.buildAll();
    }

    static buildAll()
    {
        const tags = ['email', 'name', 'search', 'week', 'month', 'password', 'phone', 'color', 'datetime', 'time_input', 'url', 'date', 'file', 'text_area', 'edit'];
        
        tags.forEach(tag =>
        {
            Array.from(document.querySelectorAll(tag)).forEach(el =>
            {
                this[`build_${tag}`](el);
            });
        });
    }

    // Todo infinite loop
    static observe()
    {
        const observer = new MutationObserver(mutations =>
        {
            mutations.forEach(mutation =>
            {
                mutation.addedNodes.forEach(node =>
                {
                    if (!(node instanceof HTMLElement)) return;
                    this.buildAll();
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    static build_email(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Email</label>
            <div>
                <input
                    type="email"
                    placeholder="you@example.com"
                    class="form-control"
                />
                <span>
                    <i class="kfi-email-alt-3"></i>
                </span>
            </div>`;
        el.append(wrapper);
    }

    static build_name(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Name</label>
            <input type="text" class="form-control" placeholder="Name" />
        `;
        el.append(wrapper);
    }

    static build_search(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Search</label>
            <div>
                <input
                    type="search"
                    placeholder="Search…"
                    class="form-control"
                />
                <button
                    type="button"
                    aria-label="Submit"
                >
                    <i class="kfi-magnify-alt"></i>
                </button>
            </div>
        `;
        el.append(wrapper);
    }

    static build_week(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Week</label>
            <div class="relative">
            <input
                type="week"
                name="week"
                class="form-control"
            />
            <span>
                <i class="kfi-calendar-schedule"></i>
            </span>
            </div>
        `;
        el.append(wrapper);
    }

    static build_month(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Month</label>
            <div class="relative">
            <input
                type="month"
                name="month"
            />
            <span class="">
                <i class="kfi-calendar-schedule"></i>
            </span>
            </div>
        `;
        el.append(wrapper);
    }

    static build_password(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Password</label>
            <input
            type="password"
            name="password"
            class="form-control"
            />
        `;
        el.append(wrapper);
    }

    static build_phone(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Phone number</label>
            <input
            type="tel"
            name="phone"
            placeholder="(123) 456-7890"
            class="form-control"
            />
        `;
        el.append(wrapper);
    }

    static build_color(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Favorite color</label>
            <input
            type="color"
            name="color"
            class="form-control"
            />
        `;
        el.append(wrapper);
    }

    static build_date(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Trip start</label>
            <div>
            <input
                type="date"
                name="trip-start"
                class="form-control"
            />
            <span>
                <i class="kfi-calendar-schedule"></i>
            </span>
            </div>
        `;
        el.append(wrapper);
    }

    static build_datetime(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Meeting time</label>
            <div>
                <input
                    type="datetime-local"
                    name="meeting-time"
                    value="2018-06-12T19:30"
                    min="2018-06-07T00:00"
                    max="2018-06-14T00:00"
                    class="form-control"
                />
                <span>
                    <i class="kfi-calendar-schedule"></i>
                </span>
            </div>
        `;
        el.append(wrapper);
    }

    static build_time_input(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Appointment time</label>
            <div class="relative">
            <input
                type="time"
                name="appointment"
                min="09:00"
                max="18:00"
                required
                aria-label="Appointment time"
                class="form-control"
            />
            <span>
                <i class="kfi-clock-alt"></i>
            </span>
            </div>
        `;
        el.append(wrapper);
    }

    static build_url(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label class="form-label">Website URL</label>
            <input
            type="url"
            name="url"
            placeholder="https://example.com"
            pattern="https://.*"
            required
            class="form-control"
            />
        `;
        el.append(wrapper);
    }

    static build_file(el)
    {
        const label = el.getAttribute('data-label');
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label aria-label="${label}" class="form-file-label">
                <div>
                    <span> Upload your file(s)</span>
                    <i class="kfi-cube-upload"></i>
                </div>
                <input aria-label="${label}" multiple type="file" class="sr-only" />
            </label>
        `;
        el.append(wrapper);
    }

    static build_text_area(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label>
                <span> Notes (Textarea) </span>
                <textarea></textarea>
            </label>
        `;
        el.append(wrapper);
    }

    static build_edit(el)
    {
        const wrapper = document.createElement('div');
        wrapper.classList.add('form-group');
        wrapper.innerHTML += `
            <label>
                <span>Notes (Content Editable Div)</span>
                <div contenteditable></div>
            </label>
        `;
        el.append(wrapper);
    }
}