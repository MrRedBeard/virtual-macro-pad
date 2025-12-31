/**
 * @file Electron main process entry.
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const express = require("express");

const { app, BrowserWindow, screen } = require("electron");

const exApp = express();
const WWW_DIR = path.join(__dirname, "www");
exApp.use(express.static(WWW_DIR));

exApp.use(express.json(
    {
        limit: "512kb"
    }));

// exApp.set("view engine", "ejs");
// exApp.set("views", path.join(__dirname, "views"));

const APP_DIR_NAME = "virtual-macropad";
const CONFIG_DIR = path.join(os.homedir(), ".config", APP_DIR_NAME);

const DEFAULTS_DIR = path.join(__dirname, "config", "defaults");
const DEFAULT_SETTINGS_PATH = path.join(DEFAULTS_DIR, "settings.json");
const DEFAULT_MACROS_PATH = path.join(DEFAULTS_DIR, "macros.json");

const SETTINGS_PATH = path.join(CONFIG_DIR, "settings.json");
const MACROS_PATH = path.join(CONFIG_DIR, "macros.json");

const { ConfigService } = require("./server_actions/ConfigService");
const { PurposeService } = require("./server_actions/PurposeService");
const { MacroEngine } = require("./server_actions/MacroEngine");
const { execFile } = require("child_process");

let mainWindow = null;
let httpServer = null;
let serverBaseUrl = null;
let lastTargetWindowId = null;

const configService = new ConfigService(
    {
        defaultsDir: path.join(__dirname, "config", "defaults")
    });

const purposeService = new PurposeService();

const macroEngine = new MacroEngine(
    {
        getSessionType,
        purposeService,
        getTargetWindowId()
        {
            return lastTargetWindowId;
        },
        hideMacropad()
        {
            hideMainWindow();
        },
        showMacropadInactive()
        {
            showMainWindowInactive();
        }
    });

/**
 * @returns {"x11"|"wayland"|"unknown"}
 */
function getSessionType()
{
    const sessionType = (process.env.XDG_SESSION_TYPE || "").toLowerCase();

    if (sessionType === "x11")
    {
        return "x11";
    }

    if (sessionType === "wayland")
    {
        return "wayland";
    }

    return "unknown";
}

/**
 * @param {any} windowSettings
 * @returns {{ x: number, y: number }}
 */
function computeAnchoredPosition(windowSettings)
{
    const displays = screen.getAllDisplays();
    const displayIndex = Number.isInteger(windowSettings.monitorIndex) ? windowSettings.monitorIndex : 0;

    const chosenDisplay = displays[Math.max(0, Math.min(displayIndex, displays.length - 1))];
    const work = chosenDisplay.workArea;

    const width = windowSettings.width;
    const height = windowSettings.height;

    const location = windowSettings.location;

    try
    {
        windowSettings.bufferPx = parseInt(windowSettings.bufferPx);
    }
    catch (e) { console.warn(e); }
    try
    {
        if (typeof windowSettings.bufferPx === 'undefined' || !Number.isInteger(windowSettings.bufferPx))
        {
            windowSettings.bufferPx = 0;
        }
    }
    catch (e)
    {
        windowSettings.bufferPx = 0;
    }

    let x = work.x;
    let y = work.y;

    if (location === "top-left")
    {
        x = work.x - windowSettings.bufferPx;
        y = work.y;
    }
    else if (location === "top-right")
    {
        x = work.x + work.width - width - windowSettings.bufferPx;
        y = work.y;
    }
    else if (location === "bottom-left")
    {
        x = work.x + windowSettings.bufferPx;
        y = work.y + work.height - height;
    }
    else if (location === "bottom-right")
    {
        x = work.x + work.width - width - windowSettings.bufferPx;
        y = work.y + work.height - height;
    }
    else if (location === "middle-left")
    {
        x = work.x + windowSettings.bufferPx + windowSettings.bufferPx;
        y = work.y + Math.floor((work.height - height) / 2);
    }
    else if (location === "middle-right")
    {
        x = work.x + work.width - width - windowSettings.bufferPx - windowSettings.bufferPx;
        y = work.y + Math.floor((work.height - height) / 2);
    }

    return { x, y };
}

/**
 * Create the main window using current settings.
 */
function createMainWindow()
{
    const settings = configService.getSettings();
    const serverSettings = settings.server || {};
    const windowSettings = settings.window;

    const pos = computeAnchoredPosition(windowSettings);

    // icon: path.join(__dirname, 'www', 'content', 'img', 'site-logo.png'),

    mainWindow = new BrowserWindow(
        {
            x: pos.x,
            y: pos.y,
            width: windowSettings.width,
            height: windowSettings.height,
            resizable: false,
            frame: false,
            transparent: Boolean(windowSettings.transparent),
            alwaysOnTop: Boolean(windowSettings.alwaysOnTop),
            focusable: false,
            icon: path.join(__dirname, 'resources', 'icons', '256x256.png'),
            show: true,
            skipTaskbar: false,
            webPreferences:
            {
                devTools: !app.isPackaged,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true,
                preload: path.join(__dirname, "preload.js")
            }
        });

    mainWindow.setSkipTaskbar(false);

    startLocalServer(serverSettings).then((res) =>
    {
        if (!res.ok)
        {
            // Worst case: fail loud. This should never silently fail.
            console.error("Failed to start local server:", res.error);
            return;
        }

        mainWindow.loadURL(res.baseUrl);
        if (!app.isPackaged)
        {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on("close", (event) =>
    {
        event.preventDefault();
        mainWindow.hide();
    });

    mainWindow.on("blur", async () =>
    {
        const res = await xdotoolGetActiveWindow();

        if (res.ok && res.windowId)
        {
            lastTargetWindowId = res.windowId;
        }
    });

    mainWindow.webContents.once("did-finish-load", () =>
    {
        if (process.env.NODE_ENV === "development")
        {
            mainWindow.webContents.openDevTools({ mode: "detach" });
        }
    });
}
/**
 * Show/focus window if it exists.
 */
function showMainWindow()
{
    if (!mainWindow)
    {
        return;
    }

    if (!mainWindow.isVisible())
    {
        mainWindow.show();
    }

    mainWindow.focus();
}

function hideMainWindow()
{
    if (!mainWindow)
    {
        return;
    }

    mainWindow.hide();
}

function showMainWindowInactive()
{
    if (!mainWindow)
    {
        return;
    }

    // Shows without taking focus.
    mainWindow.showInactive();
}

/**
 * @returns {Promise<{ ok: boolean, windowId?: string, error?: string }>}
 */
function xdotoolGetActiveWindow()
{
    return new Promise((resolve) =>
    {
        execFile("xdotool", ["getactivewindow"], (err, stdout) =>
        {
            if (err)
            {
                resolve({ ok: false, error: String(err) });
                return;
            }

            resolve({ ok: true, windowId: String(stdout).trim() });
        });
    });
}

/**
 * @returns {Promise<{ ok: boolean, windowId?: string, error?: string }>}
 */
function xdotoolGetWindowUnderMouse()
{
    return new Promise((resolve) =>
    {
        execFile("xdotool", ["getmouselocation", "--shell"], (err, stdout) =>
        {
            if (err)
            {
                resolve({ ok: false, error: String(err) });
                return;
            }

            const text = String(stdout);
            const m = text.match(/^WINDOW=(\d+)$/m);

            if (!m)
            {
                resolve({ ok: false, error: "Could not parse WINDOW from xdotool getmouselocation" });
                return;
            }

            resolve({ ok: true, windowId: m[1] });
        });
    });
}

/**
 * Quit the application completely.
 * This is a hard exit, not a hide.
 */
function quitApp()
{
    if (mainWindow)
    {
        mainWindow.destroy();
        mainWindow = null;
    }

    app.quit();
}

/**
 * Setup Express API endpoints (renderer uses fetch()).
 */
function setupApi()
{
    exApp.get("/api/session", (_req, res) =>
    {
        res.json(
            {
                ok: true,
                sessionType: getSessionType()
            });
    });

    exApp.post("/api/app/show", (_req, res) =>
    {
        showMainWindow();

        res.json(
            {
                ok: true
            });
    });

    exApp.post("/api/app/hide", (_req, res) =>
    {
        if (mainWindow)
        {
            mainWindow.hide();
        }

        res.json(
            {
                ok: true
            });
    });

    exApp.post("/api/config", (_req, res) =>
    {
        res.json(
            {
                ok: true,
                settings: configService.getSettings(),
                macros: configService.getMacros()
            });
    });

    exApp.get("/api/settings", (_req, res) =>
    {
        res.json(
            {
                ok: true,
                settings: configService.getSettings()
            });
    });

    exApp.post("/api/macros", (_req, res) =>
    {
        res.json(
            {
                ok: true,
                macros: configService.getMacros()
            });
    });

    exApp.post("/api/config/reload", (_req, res) =>
    {
        try
        {
            const loaded = configService.reload();
            purposeService.setMacros(loaded.macros);

            if (mainWindow)
            {
                const ws = loaded.settings.window;
                const pos = computeAnchoredPosition(ws);

                mainWindow.setAlwaysOnTop(Boolean(ws.alwaysOnTop));
                mainWindow.setBounds(
                    {
                        x: pos.x,
                        y: pos.y,
                        width: ws.width,
                        height: ws.height
                    });
            }

            res.json(
                {
                    ok: true,
                    settings: loaded.settings,
                    macros: loaded.macros
                });
        }
        catch (err)
        {
            res.status(500).json(
                {
                    ok: false,
                    error: String(err)
                });
        }
    });

    exApp.post("/api/minimize", (_req, res) =>
    {
        try
        {
            const loaded = configService.reload();
            purposeService.setMacros(loaded.macros);

            if (mainWindow)
            {
                const ws = loaded.settings.window;
                ws.height = 30;
                const pos = computeAnchoredPosition(ws);

                mainWindow.setAlwaysOnTop(Boolean(ws.alwaysOnTop));
                mainWindow.setBounds(
                    {
                        x: pos.x,
                        y: pos.y - ws.minimizeYoffset, // Buffer for bottom toolbar
                        width: ws.width,
                        height: ws.height
                    });
            }

            res.json(
                {
                    ok: true,
                    settings: loaded.settings,
                    macros: loaded.macros
                });
        }
        catch (err)
        {
            res.status(500).json(
                {
                    ok: false,
                    error: String(err)
                });
        }
    });

    exApp.post("/api/app/quit", (req, res) =>
    {
        res.json({ ok: true });

        // Give the response time to flush
        setTimeout(() =>
        {
            quitApp();
        }, 50);
    });


    exApp.get("/api/purpose", (_req, res) =>
    {
        res.json(
            {
                ok: true,
                purposes: purposeService.list()
            });
    });

    exApp.get("/api/purpose/current", (_req, res) =>
    {
        res.json(
            {
                ok: true,
                current: purposeService.getCurrent()
            });
    });

    exApp.post("/api/purpose/current", (req, res) =>
    {
        const id = String(req.body?.id || "");
        const result = purposeService.setCurrent(id);

        if (!result.ok)
        {
            res.status(400).json(
                {
                    ok: false,
                    error: result.error
                });

            return;
        }

        res.json(
            {
                ok: true
            });
    });

    exApp.post("/api/purpose/next", (_req, res) =>
    {
        res.json(purposeService.next());
    });

    exApp.post("/api/purpose/prev", (_req, res) =>
    {
        res.json(purposeService.prev());
    });

    exApp.post("/api/macro/executeAction", async (req, res) =>
    {
        try
        {
            const action = req.body?.action;
            const result = await macroEngine.executeAction(action);

            res.json(result);
        }
        catch (err)
        {
            res.status(500).json(
                {
                    ok: false,
                    error: String(err)
                });
        }
    });

    

    exApp.post("/api/macro/executeButton", async (req, res) =>
    {
        try
        {
            const purposeId = String(req.body?.purposeId || "");
            const buttonId = String(req.body?.buttonId || "");

            // const result = await macroEngine.executeButton(purposeId, buttonId);

            // res.json(result);

            // Capture target window under cursor BEFORE hiding
            const targetRes = await xdotoolGetWindowUnderMouse();

            if (targetRes.ok && targetRes.windowId)
            {
                lastTargetWindowId = targetRes.windowId;
            }

            const result = await macroEngine.executeButton(purposeId, buttonId);

            res.json(result);
        }
        catch (err)
        {
            res.status(500).json(
                {
                    ok: false,
                    error: String(err)
                });
        }
    });
}

function main()
{
    configService.ensureUserConfig();
    configService.loadAll();
    purposeService.setMacros(configService.getMacros());

    const gotLock = app.requestSingleInstanceLock();

    if (!gotLock)
    {
        app.quit();
        return;
    }

    app.on("second-instance", () =>
    {
        showMainWindow();
    });

    app.commandLine.appendSwitch('class', 'virtual-macropad');

    app.whenReady().then(() =>
    {
        setupApi();
        createMainWindow();

        app.on("activate", () =>
        {
            if (!mainWindow)
            {
                createMainWindow();
                return;
            }

            showMainWindow();
        });
    });

    app.on("window-all-closed", () =>
    {
        // Keep running (soft-close model). Do not app.quit().
    });

    app.on("before-quit", () =>
    {
        if (httpServer)
        {
            httpServer.close();
            httpServer = null;
        }
    });
}

/**
 * Start the local express server for serving /www static (and future EJS).
 * @param {{ host?: string, port?: number }} serverSettings
 * @returns {Promise<{ ok: boolean, baseUrl?: string, error?: string }>}
 */
function startLocalServer(serverSettings)
{
    const host = String(serverSettings?.host || "127.0.0.1");
    const port = Number.isInteger(serverSettings?.port) ? serverSettings.port : 0;

    return new Promise((resolve) =>
    {
        if (httpServer)
        {
            resolve({ ok: true, baseUrl: serverBaseUrl });
            return;
        }

        httpServer = exApp.listen(port, host, () =>
        {
            const actualPort = httpServer.address().port;

            serverBaseUrl = `http://${host}:${actualPort}/`;

            resolve({ ok: true, baseUrl: serverBaseUrl });
        });

        httpServer.on("error", (err) =>
        {
            resolve({ ok: false, error: String(err) });
        });
    });
}

main();
