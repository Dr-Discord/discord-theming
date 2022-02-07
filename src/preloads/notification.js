const { webFrame, ipcRenderer } = require("electron")
const { join } = require("path")
const fs = require("fs")

// Load discords preload
const path = ipcRenderer.sendSync("DT_DISCORD_PRELOAD", "notification")
if (path) { require(path) }
else { console.error("No preload path found!") }

if (!fs.existsSync(join(__dirname, "../../themes/notification.css"))) fs.writeFileSync(join(__dirname, "../../themes/notification.css"), "")
const themeContent = fs.readFileSync(join(__dirname, "../../themes/notification.css"), "utf-8")

{
  ((window) => {
    async function DomLoaded() {
      {
        const style = document.createElement("style")
        style.innerHTML = themeContent
        document.head.appendChild(style)
        fs.watch(join(__dirname, "../../themes/notification.css"), () => {
          style.innerHTML = fs.readFileSync(join(__dirname, "../../themes/notification.css"), "utf-8")
        })
      }
    }
    if (window.document.readyState === "loading") window.document.addEventListener("DOMContentLoaded", DomLoaded)
    else DomLoaded()
  })(webFrame.top.context)
}