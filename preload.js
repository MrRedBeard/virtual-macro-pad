/**
 * @file Preload bridge. Exposes a minimal API to the renderer.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("vmp",
{
    getSessionType()
    {
        return ipcRenderer.invoke("app:getSessionType");
    },

    show()
    {
        return ipcRenderer.invoke("app:show");
    },

    hide()
    {
        return ipcRenderer.invoke("app:hide");
    },

    loadAll()
    {
        return ipcRenderer.invoke("config:loadAll");
    },

    reload()
    {
        return ipcRenderer.invoke("config:reload");
    },

    purpose:
    {
        list()
        {
            return ipcRenderer.invoke("purpose:list");
        },

        getCurrent()
        {
            return ipcRenderer.invoke("purpose:getCurrent");
        },

        setCurrent(id)
        {
            return ipcRenderer.invoke("purpose:setCurrent", id);
        },

        next()
        {
            return ipcRenderer.invoke("purpose:next");
        },

        prev()
        {
            return ipcRenderer.invoke("purpose:prev");
        }
    },

    macro:
    {
        executeAction(action)
        {
            return ipcRenderer.invoke("macro:executeAction", action);
        },

        executeButton(purposeId, buttonId)
        {
            return ipcRenderer.invoke("macro:executeButton", purposeId, buttonId);
        }
    }
});