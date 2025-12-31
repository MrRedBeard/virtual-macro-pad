/**
 * @file MacroEngine
 * Executes macro actions.
 *
 * v0.1:
 * - command: enabled
 * - keys/text: behind RobotJS, best-effort
 */

const { spawn } = require("child_process");
const { execFile } = require("child_process");

class MacroEngine
{
    /**
     * @param {object} options
     * @param {() => ("x11"|"wayland"|"unknown")} options.getSessionType
     * @param {import("./PurposeService").PurposeService} options.purposeService
     */
    constructor(options)
    {
        this._getSessionType = options.getSessionType;
        this._purposeService = options.purposeService;
        this._getTargetWindowId = options.getTargetWindowId;

        this.hideMacropad = options.hideMacropad;
        this.showMacropadInactive = options.showMacropadInactive;

        this._robot = null;
        this._robotLoadError = null;
    }

    /**
     * Attempt to load RobotJS once.
     * @returns {{ ok: boolean, error?: string }}
     */
    initRobot()
    {
        if (this._robot || this._robotLoadError)
        {
            return this._robot ? { ok: true } : { ok: false, error: this._robotLoadError };
        }

        try
        {
            // eslint-disable-next-line global-require
            this._robot = require("robotjs");
            return { ok: true };
        }
        catch (err)
        {
            this._robotLoadError = String(err);
            return { ok: false, error: this._robotLoadError };
        }
    }

    /**
     * Execute a button by purposeId and buttonId.
     * @param {string} purposeId
     * @param {string} buttonId
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    async executeButton(purposeId, buttonId)
    {
        const button = this._purposeService.findButton(purposeId, buttonId);

        if (!button)
        {
            return { ok: false, error: `Button not found: ${purposeId}.${buttonId}` };
        }

        return this.executeAction(button.action);
    }

    /**
     * Execute an action object.
     * @param {any} action
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    async executeAction(action)
    {
        if (!action || typeof action.type !== "string")
        {
            return { ok: false, error: "Invalid action" };
        }

        if (action.type === "command")
        {
            return this._execCommand(String(action.command || ""));
        }

        if (action.type === "switchPurpose")
        {
            return this._switchPurpose(action);
        }

        if (action.type === "keys")
        {
            return this._sendKeys(action);
        }

        if (action.type === "text")
        {
            return this._typeText(action);
        }

        return { ok: false, error: `Unsupported action type: ${action.type}` };
    }

    /**
     * @private
     * @param {string} command
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    _execCommand(command)
    {
        if (!command.trim())
        {
            return Promise.resolve({ ok: false, error: "Empty command" });
        }

        return new Promise((resolve) =>
        {
            const child = spawn("sh", ["-c", command],
                {
                    detached: true,
                    stdio: "ignore"
                });

            child.on("error", (err) =>
            {
                resolve({ ok: false, error: String(err) });
            });

            // Let it run on its own.
            child.unref();

            resolve({ ok: true });
        });
    }

    /**
     * @private
     * @param {any} action
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    _switchPurpose(action)
    {
        if (typeof action.targetPurposeId === "string" && action.targetPurposeId.length > 0)
        {
            return Promise.resolve(this._purposeService.setCurrent(action.targetPurposeId));
        }

        if (action.direction === "next")
        {
            return Promise.resolve(this._purposeService.next());
        }

        if (action.direction === "prev")
        {
            return Promise.resolve(this._purposeService.prev());
        }

        return Promise.resolve({ ok: false, error: "switchPurpose requires direction or targetPurposeId" });
    }

    /**
     * @private
     * @param {any} action
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    async _sendKeys(action)
    {
        const sleepTime = 10;

        const sessionType = this._getSessionType();

        // Best-effort policy: allow attempt on X11; gate on Wayland/unknown.
        if (sessionType !== "x11")
        {
            return Promise.resolve({ ok: false, error: `keys not supported on session: ${sessionType}` });
        }

        const init = this.initRobot();

        if (!init.ok)
        {
            return Promise.resolve({ ok: false, error: `RobotJS failed to load: ${init.error}` });
        }

        if (this.hideMacropad)
        {
            this.hideMacropad();
            // await this.sleep(sleepTime);
        }

        const targetWindowId = this._getTargetWindowId ? this._getTargetWindowId() : null;

        if (targetWindowId)
        {
            const focusRes = await this.xdotoolActivateWindow(String(targetWindowId));

            if (!focusRes.ok)
            {
                return { ok: false, error: `Failed to focus target window: ${focusRes.error}` };
            }

            // Give focus a moment to settle
            // await this.sleep(sleepTime);
        }
        else
        {
            // Fallback: hide macropad to let focus return naturally (less reliable)
            // You can also error instead if you want stricter behavior.
            // await this.sleep(sleepTime);
        }

        await this.sleep(sleepTime);

        const chords = Array.isArray(action.chords) ? action.chords : [];

        try
        {
            const list = Array.isArray(chords) ? chords : [];

            for (const chord of list)
            {
                this._tapChord(String(chord));
            }

            // await this.sleep(sleepTime);

            if (this.showMacropadInactive)
            {
                this.showMacropadInactive();
            }

            return Promise.resolve({ ok: true });
        }
        catch (err)
        {
            console.error(err);
            return Promise.resolve({ ok: false, error: String(err) });
        }
    }

    /**
     * @private
     * @param {any} action
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    _typeText(action)
    {
        const sessionType = this._getSessionType();

        if (sessionType !== "x11")
        {
            return Promise.resolve({ ok: false, error: `text not supported on session: ${sessionType}` });
        }

        const init = this.initRobot();

        if (!init.ok)
        {
            return Promise.resolve({ ok: false, error: `RobotJS failed to load: ${init.error}` });
        }

        const text = String(action.text || "");

        try
        {
            this._robot.typeString(text);
            return Promise.resolve({ ok: true });
        }
        catch (err)
        {
            return Promise.resolve({ ok: false, error: String(err) });
        }
    }

    /**
     * Parse a chord like "ctrl+shift+s" and send it via RobotJS.
     * @private
     * @param {string} chord
     */
    _tapChord(chord)
    {
        const parts = chord
            .toLowerCase()
            .split("+")
            .map((p) => p.trim())
            .filter(Boolean);

        if (parts.length === 0)
        {
            return;
        }

        const key = parts[parts.length - 1];
        const modsRaw = parts.slice(0, parts.length - 1);

        const modifiers = modsRaw.map((m) =>
        {
            if (m === "control")
            {
                return "control";
            }

            if (m === "ctrl")
            {
                return "control";
            }

            if (m === "super")
            {
                return "command";
            }

            if (m === "cmd")
            {
                return "command";
            }

            if (m === "meta")
            {
                return "command";
            }

            return m;
        });

        //console.log(modifiers, key);

        if (modifiers.length > 0)
        {
            this._robot.keyTap(key, modifiers);
        }
        else
        {
            this._robot.keyTap(key);
        }
    }

    /**
     * @param {string} windowId
     * @returns {Promise<{ ok: boolean, error?: string }>}
     */
    xdotoolActivateWindow(windowId)
    {
        return new Promise((resolve) =>
        {
            //execFile("xdotool", ["windowactivate", "--sync", windowId], (err) =>
            execFile("xdotool", ["windowactivate", windowId], (err) =>
            {
                if (err)
                {
                    resolve({ ok: false, error: String(err) });
                    return;
                }

                resolve({ ok: true });
            });
        });
    }

    /**
     * @param {number} ms
     * @returns {Promise<void>}
     */
    sleep(ms)
    {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports =
{
    MacroEngine
};
