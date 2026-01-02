class clsMacroPad
{
    constructor(options = {})
    {
        // .purpose // current selected purpose
        // .purpose-up // scroll through purposes +1 like rotary encoder
        // .purpose-down // scroll through purposes -1 like rotary encoder
        // .macro-buttons // All macros defined for selected purpose
        // .refresh-macros // refresh macros available

        // Get all macros
        // /api/macros

        // Reload settings and macros
        // /api/config/reload

        // Hide
        // /api/app/hide

        /** @type {HTMLElement|null} */
        this.logoEl = null; // logo for minimize and restore

        /** @type {'norm'|'min'} */
        this.windowStatus = 'norm'; // norm min

        /** @type {HTMLElement|null} */
        this.purposeLabelEl = null; // current selected purpose

        /** @type {any|null} */
        this.purposeIndex = 0; // index of rotary encoder

        /** @type {HTMLElement|null} */
        this.purposeUpEl = null; // scroll through purposes +1 like rotary encoder

        /** @type {HTMLElement|null} */
        this.purposeDownEl = null; // scroll through purposes -1 like rotary encoder

        /** @type {HTMLElement|null} */
        this.purposeRefreshEl = null; // refresh macros available

        /** @type {HTMLElement|null} */
        this.closeMacrosEl = null; // Close macros app

        /** @type {HTMLElement|null} */
        this.buttonsGridEl = null; // All macros defined for selected purpose

        /** @type {any|null} */
        this.purposesAll = null; // All purposes

        /** @type {any|null} */
        this.currentPurpose = null; // Current selected purpose object

        /** @type {any|null} */
        this.currentPurposeKey = null; // Current selected purpose key

        /** @type {any|null} */
        this.settings = null; // All settings from settings.json

        /** @type {any|null} */
        this.macrosAll = null; // All Macros by purpose in macros.json

        /** @type {any|null} */
        this.macrosCurrent = null; // Current macros by selected purpose

        this.init();
    }

    async init()
    {
        this.logoEl = document.querySelector(".logo");
        this.bindActivate(this.logoEl, () =>
        {
            // this.windowStatus = 'norm'; // norm min
            if (this.windowStatus === 'norm')
            {
                this.windowStatus = 'min';
                this.minimize();
            }
            else
            {
                this.windowStatus = 'norm';
                this.reload();
            }
        });

        this.purposeLabelEl = document.querySelector(".purpose");
        this.purposeUpEl = document.querySelector(".purpose-up");
        this.purposeDownEl = document.querySelector(".purpose-down");

        this.purposeRefreshEl = document.querySelector(".refresh-macros");
        this.bindActivate(this.purposeRefreshEl, async () =>
        {
            await this.refreshMacros();
        });

        this.closeMacrosEl = document.querySelector(".close-macros");
        this.bindActivate(this.closeMacrosEl, async () =>
        {
            await this.quit();
        });


        this.buttonsGridEl = document.querySelector(".macro-buttons");

        await this.refreshMacros();

        this.bindActivate(this.purposeUpEl, () =>
        {
            this.nextPurposeIndex(1);
        });

        this.bindActivate(this.purposeDownEl, () =>
        {
            this.nextPurposeIndex(-1);
        });
    }

    /**
     * Attach a pointer-safe activation handler.
     *
     * @param {HTMLElement} el
     * @param {Function} handler
     * @returns {void}
     */
    bindActivate(el, handler)
    {
        if (!el)
        {
            return;
        }

        el.addEventListener('pointercancel', () =>
        {
            // no-op for now, but intentionally handled
        });

        el.addEventListener('pointerdown', (ev) =>
        {
            ev.preventDefault();
            handler(ev);
        });
    }

    /**
     * Next index - move current purpose index up or down.
     *
     * @param {number} amt  +1 or -1
     * @returns {void}
     */
    nextPurposeIndex(amt)
    {
        const maxIndex = this.purposesAll.length - 1;
        let nextIndex = this.purposeIndex + amt;
        if (nextIndex < 0)
        {
            nextIndex = maxIndex;
        }
        if (nextIndex > maxIndex)
        {
            nextIndex = 0;
        }
        this.purposeIndex = nextIndex;

        this.currentPurposeKey = this.purposesAll[this.purposeIndex];

        this.macrosCurrent = this.macrosAll.purposes
            .filter((p) =>
            {
                return p.id === this.currentPurposeKey;
            })
            .flatMap((p) =>
            {
                return p.buttons || [];
            });

        this.currentPurpose = this.macrosAll.purposes
            .filter((p) =>
            {
                return p.id === this.currentPurposeKey;
            })[0];

        this.purposeLabelEl.innerText = this.currentPurpose.label;

        // Clear existing buttons
        this.buttonsGridEl.innerHTML = '';

        this.macrosCurrent.forEach((macro) =>
        {
            // <button class="macro-button">Foo</button>
            let btn = document.createElement('button');
            btn.classList.add('macro-button');
            btn.innerHTML = macro.label;
            this.bindActivate(btn, async () =>
            {
                //console.log(macro, macro.id, macro.label, macro.action.type, macro.action.chords);
                await this.executeMacro(macro);
            });
            this.buttonsGridEl.append(btn);
        });
    }

    /**
     * Execute a macro via backend API.
     * @param {any} macro
     * @returns {Promise<void>}
     */
    async executeMacro(macro)
    {
        if (!this.currentPurposeKey)
        {
            console.warn("No current purpose selected.");
            return;
        }

        const res = await this.apiPost("/api/macro/executeButton",
            {
                purposeId: this.currentPurposeKey,
                buttonId: String(macro.id)
            });

        if (!res.ok)
        {
            console.error("Macro failed:", res.error);
            // Later: toast UI
        }
    }

    async minimize()
    {
        const res = await this.apiPost("/api/minimize");

        if (!res.ok)
        {
            throw new Error(`Failed to load macros: ${res.error || "unknown error"}`);
        }
    }

    /**
    * Fetch and store macros.
    * @returns {Promise<void>}
    */
    async refreshMacros()
    {
        const res = await this.apiPost("/api/config/reload");

        if (!res.ok)
        {
            throw new Error(`Failed to load macros: ${res.error || "unknown error"}`);
        }

        this.macrosAll = res.macros; // All Macros by purpose in macros.json

        // Distinct Purposes
        this.purposesAll = [
            ...new Set(
                res.macros.purposes.map(function (purpose)
                {
                    return purpose.id;
                })
            )
        ];

        // Set purpose if not set
        if (typeof this.currentPurposeKey === 'undefined' || this.currentPurposeKey === '' || !this.currentPurposeKey)
        {
            this.purposeIndex = 0;
            this.currentPurposeKey = this.purposesAll[this.purposeIndex];
        }

        this.nextPurposeIndex(0);
    }

    /**
     * Redraw UI window with defaults in settings
     * Fetch and store macros.
     * @returns {Promise<void>}
    */
    async reload()
    {
        const res = await this.apiPost("/api/config/reload");

        if (!res.ok)
        {
            throw new Error(`Failed to load macros: ${res.error || "unknown error"}`);
        }

        this.macrosAll = res.macros; // All Macros by purpose in macros.json

        // Distinct Purposes
        this.purposesAll = [
            ...new Set(
                res.macros.purposes.map(function (purpose)
                {
                    return purpose.id;
                })
            )
        ];

        // Set purpose if not set
        if (typeof this.currentPurposeKey === 'undefined' || this.currentPurposeKey === '' || !this.currentPurposeKey)
        {
            this.purposeIndex = 0;
            this.currentPurposeKey = this.purposesAll[this.purposeIndex];
        }

        this.nextPurposeIndex(0);
    }

    async quit()
    {
        await fetch("/api/app/quit",
            {
                method: "POST"
            });
    }

    /**
     * @param {string} path
     * @returns {Promise<any>}
     */
    async apiGet(path)
    {
        const res = await fetch(path,
            {
                method: "GET"
            });

        return this._readJsonResponse(res, path);
    }

    /**
     * @param {string} path
     * @param {any} body
     * @returns {Promise<any>}
     */
    async apiPost(path, body)
    {
        const res = await fetch(path,
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body || {})
            });

        return this._readJsonResponse(res, path);
    }

    /**
     * @private
     * @param {Response} res
     * @param {string} path
     * @returns {Promise<any>}
     */
    async _readJsonResponse(res, path)
    {
        const text = await res.text();

        try
        {
            const json = JSON.parse(text);

            if (!res.ok && json && typeof json.ok === "boolean")
            {
                return json;
            }

            return json;
        }
        catch
        {
            throw new Error(`Expected JSON from ${path} but got: ${text.slice(0, 140)}`);
        }
    }
}

const mp = new clsMacroPad({});