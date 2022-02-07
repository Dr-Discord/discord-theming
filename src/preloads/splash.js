const { webFrame, ipcRenderer } = require("electron")
const { join } = require("path")
const fs = require("fs")

// Load discords preload
const path = ipcRenderer.sendSync("DT_DISCORD_PRELOAD", "splash")
if (path) { require(path) }
else { console.error("No preload path found!") }

if (!fs.existsSync(join(__dirname, "../../themes/splash.css"))) fs.writeFileSync(join(__dirname, "../../themes/splash.css"), "")
const themeContent = fs.readFileSync(join(__dirname, "../../themes/splash.css"), "utf-8")

{
  ((window) => {
    async function DomLoaded() {
      {
        const style = document.createElement("style")
        style.innerHTML = themeContent
        document.head.appendChild(style)
        fs.watch(join(__dirname, "../../themes/splash.css"), () => {
          style.innerHTML = fs.readFileSync(join(__dirname, "../../themes/splash.css"), "utf-8")
        })
      }
    }
    if (window.document.readyState === "loading") window.document.addEventListener("DOMContentLoaded", DomLoaded)
    else DomLoaded()
  })(webFrame.top.context)
}