/**
 * @file ConfigService
 * Loads and reloads settings.json and macros.json from ~/.config/virtual-macropad/
 * Copies default configs on first run.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

class ConfigService
{
    /**
     * @param {object} options
     * @param {string} [options.appDirName]
     * @param {string} [options.defaultsDir]
     */
    constructor(options = {})
    {
        this._appDirName = options.appDirName || "virtual-macropad";

        this._configDir = path.join(os.homedir(), ".config", this._appDirName);

        this._defaultsDir = options.defaultsDir || path.join(process.cwd(), "config", "defaults");

        this._defaultSettingsPath = path.join(this._defaultsDir, "settings.json");
        this._defaultMacrosPath = path.join(this._defaultsDir, "macros.json");

        this._settingsPath = path.join(this._configDir, "settings.json");
        this._macrosPath = path.join(this._configDir, "macros.json");

        this._settings = null;
        this._macros = null;
    }

    /**
     * @returns {string}
     */
    get configDir()
    {
        return this._configDir;
    }

    /**
     * @returns {{ settingsPath: string, macrosPath: string }}
     */
    get paths()
    {
        return { settingsPath: this._settingsPath, macrosPath: this._macrosPath };
    }

    /**
     * Ensure user config directory exists and copy defaults if missing.
     */
    ensureUserConfig()
    {
        if (!fs.existsSync(this._configDir))
        {
            fs.mkdirSync(this._configDir, { recursive: true });
        }

        this._copyFileIfMissing(this._defaultSettingsPath, this._settingsPath);
        this._copyFileIfMissing(this._defaultMacrosPath, this._macrosPath);
    }

    /**
     * Load config from disk into memory.
     * @returns {{ settings: any, macros: any }}
     */
    loadAll()
    {
        this._settings = this._readJsonFile(this._settingsPath);
        this._macros = this._readJsonFile(this._macrosPath);

        return { settings: this._settings, macros: this._macros };
    }

    /**
     * Reload config from disk.
     * @returns {{ settings: any, macros: any }}
     */
    reload()
    {
        return this.loadAll();
    }

    /**
     * @returns {any}
     */
    getSettings()
    {
        return this._settings;
    }

    /**
     * @returns {any}
     */
    getMacros()
    {
        return this._macros;
    }

    /**
     * @private
     * @param {string} filePath
     * @returns {any}
     */
    _readJsonFile(filePath)
    {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
    }

    /**
     * @private
     * @param {string} sourcePath
     * @param {string} destPath
     */
    _copyFileIfMissing(sourcePath, destPath)
    {
        if (fs.existsSync(destPath))
        {
            return;
        }

        fs.copyFileSync(sourcePath, destPath);
    }
}

module.exports =
{
    ConfigService
};
