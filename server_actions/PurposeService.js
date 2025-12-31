/**
 * @file PurposeService
 * Tracks current purpose and provides navigation.
 */

class PurposeService
{
    constructor()
    {
        this._purposes = [];
        this._currentIndex = 0;
    }

    /**
     * Initialize purposes from macros.json.
     * @param {any} macros
     */
    setMacros(macros)
    {
        const purposes = Array.isArray(macros?.purposes) ? macros.purposes : [];

        this._purposes = purposes.map((p) =>
        {
            return {
                id: String(p.id),
                label: String(p.label || p.id),
                buttons: Array.isArray(p.buttons) ? p.buttons : []
            };
        });

        this._currentIndex = 0;
    }

    /**
     * @returns {{ id: string, label: string }[]}
     */
    list()
    {
        return this._purposes.map((p) =>
        {
            return { id: p.id, label: p.label };
        });
    }

    /**
     * @returns {{ id: string, label: string, buttons: any[] } | null}
     */
    getCurrent()
    {
        if (this._purposes.length === 0)
        {
            return null;
        }

        return this._purposes[this._currentIndex];
    }

    /**
     * @param {string} id
     * @returns {{ ok: boolean, error?: string }}
     */
    setCurrent(id)
    {
        const idx = this._purposes.findIndex((p) => p.id === id);

        if (idx === -1)
        {
            return { ok: false, error: `Unknown purpose id: ${id}` };
        }

        this._currentIndex = idx;
        return { ok: true };
    }

    /**
     * @returns {{ ok: boolean }}
     */
    next()
    {
        if (this._purposes.length === 0)
        {
            return { ok: true };
        }

        this._currentIndex = (this._currentIndex + 1) % this._purposes.length;
        return { ok: true };
    }

    /**
     * @returns {{ ok: boolean }}
     */
    prev()
    {
        if (this._purposes.length === 0)
        {
            return { ok: true };
        }

        this._currentIndex = (this._currentIndex - 1 + this._purposes.length) % this._purposes.length;
        return { ok: true };
    }

    /**
     * @param {string} purposeId
     * @param {string} buttonId
     * @returns {any | null}
     */
    findButton(purposeId, buttonId)
    {
        const purpose = this._purposes.find((p) => p.id === purposeId);

        if (!purpose)
        {
            return null;
        }

        const button = purpose.buttons.find((b) => String(b.id) === buttonId);
        return button || null;
    }
}

module.exports =
{
    PurposeService
};
