const { join } = require("path")
const electron = { ipcMain } = require("electron")
const Module = require("module")
const { existsSync } = require("fs")

const basePath = join(process.resourcesPath, "app.asar")
const pkg = require(join(basePath, "package.json"))
electron.app.setAppPath(basePath)
electron.app.name = pkg.name

function ipc(ev, func) {
  ipcMain.on(ev, async (event, ...args) => {
    event.IS_ON = true
    const res = await func(event, ...args)
    if (!event.returnValue) event.returnValue = res ?? "No response"
  })
  ipcMain.handle(ev, func)
}

const preloads = {}
let splashProps
const findPreload = (which) => preloads[which]
ipc("DT_DISCORD_PRELOAD", (_, which) => findPreload(which))

class BrowserWindow extends electron.BrowserWindow {
  constructor(opt) {
    const old = opt.webPreferences.preload
    opt.transparent = true
    opt.backgroundColor = "#00000000"
    if (opt.title === "Discord") {
      preloads.main = old
      opt.webPreferences.preload = join(__dirname, "preloads", "main.js")
    }
    else if (opt.webPreferences.preload.includes("splash")) {
      splashProps = opt
      preloads.splash = old
      opt.webPreferences.preload = join(__dirname, "preloads", "splash.js")
    }
    else if (opt.webPreferences.preload.includes("notification")) {
      preloads.notification = old
      opt.webPreferences.preload = join(__dirname, "preloads", "notification.js")
    }
    return super(opt)
  }
}

let fakeUpdater
ipc("DT_EXISTS_FAKE_UPDATER", () => !!fakeUpdater)
ipc("DT_KILL_FAKE_UPDATER", () => {
  if (fakeUpdater) {
    fakeUpdater.setSkipTaskbar(true)
    setTimeout(() => {
      if (fakeUpdater != null) {
        fakeUpdater.hide()
        fakeUpdater.close()
        fakeUpdater = null
      }
    }, 100)
  }
})
ipc("DT_OPEN_FAKE_UPDATER", () => {
  splashProps.webPreferences.preload = findPreload("splash")
  fakeUpdater = new BrowserWindow(splashProps)
  const splashUrl = require("url").format({
    protocol: "file",
    slashes: true,
    pathname: join(basePath, "app_bootstrap/splash/index.html") 
  })
  fakeUpdater.loadURL(splashUrl)
  fakeUpdater.webContents.on("will-navigate", e => e.preventDefault())
  fakeUpdater.show()
})


electron.app.once("ready", () => {
  electron.session.defaultSession.webRequest.onHeadersReceived(function({ responseHeaders }, callback) {
    for (const iterator of Object.keys(responseHeaders))
      if (iterator.includes("content-security-policy") || iterator.includes("frame-ancestors"))
        delete responseHeaders[iterator]
    callback({ 
      cancel: false, 
      responseHeaders
    })
  })
})

const Electron = new Proxy(electron, { get: (target, prop) => prop === "BrowserWindow" ? BrowserWindow : target[prop] })

const electronPath = require.resolve("electron")
delete require.cache[electronPath].exports
require.cache[electronPath].exports = Electron

const otherApp = join(process.resourcesPath, "dt-app")
if (existsSync(otherApp)) require(otherApp)
else Module._load(join(basePath, pkg.main), null, true)