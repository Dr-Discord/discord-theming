const { webFrame, ipcRenderer, shell } = require("electron")
const patcher = require("./patcher")
const { join } = require("path")
const fs = require("fs")

// Load discords preload
const path = ipcRenderer.sendSync("DT_DISCORD_PRELOAD", "main")
if (path) { require(path) }
else { console.error("No preload path found!") }

const sleep = (time) => new Promise(resolve => setTimeout(resolve, time))
async function waitUntil(condition) {
  let item
  while (!(item = condition())) await sleep(1)
  return item
}

const getReactInstance = (element) => {
  if (element.__reactInternalInstance$) return element.__reactInternalInstance$
  return element[Object.keys(element).find(k => k.startsWith("__reactInternalInstance") || k.startsWith("__reactFiber"))] || null
}
const getOwnerInstance = (element) => {
  for (let RI = getReactInstance(element); RI; RI = RI.return) {
    const sn = RI.stateNode;
    if (typeof sn?.forceUpdate === "function") return sn
  }
}

if (!fs.existsSync(join(__dirname, "../../themes/main.css"))) fs.writeFileSync(join(__dirname, "../../themes/main.css"), "")
const themeContent = fs.readFileSync(join(__dirname, "../../themes/main.css"), "utf-8")

{
  ((window) => {
    window.DiscordNative.window.setDevtoolsCallbacks(null, null)
    async function DomLoaded() {
      {
        const style = document.createElement("style")
        style.innerHTML = themeContent
        document.head.appendChild(style)
        fs.watch(join(__dirname, "../../themes/main.css"), () => {
          style.innerHTML = fs.readFileSync(join(__dirname, "../../themes/main.css"), "utf-8")
        })
      }
      const getModule = require("./getModule")(window.webpackChunkdiscord_app)
      waitUntil(() => getModule("UserSettingsCogContextMenu")).then((module) => {
        let inst
        const React = getModule(["createElement"])
        const { MenuItem, MenuSeparator } = getModule(["MenuItem"])
        function callback(_, res) {
          let splashIsOpen = ipcRenderer.sendSync("DT_EXISTS_FAKE_UPDATER")

          res.props.children[0].push(React.createElement(MenuItem, {
            id: "discord-theming",
            label: "Discord Theming",
            children: [
              React.createElement(MenuItem, {
                id: "discord-theming-splash",
                label: splashIsOpen ? "Kill Splash" : "Open Splash",
                action: () => {
                  splashIsOpen ? ipcRenderer.sendSync("DT_KILL_FAKE_UPDATER") : ipcRenderer.sendSync("DT_OPEN_FAKE_UPDATER")
                  splashIsOpen = !splashIsOpen
                }
              }),
              React.createElement(MenuSeparator),
              React.createElement(MenuItem, {
                id: "discord-theming-file-splash",
                label: "Open Splash File",
                action: () => shell.openPath(join(__dirname, "../../themes/splash.css"))
              }),
              React.createElement(MenuItem, {
                id: "discord-theming-file-notification",
                label: "Open Notification File",
                action: () => shell.openPath(join(__dirname, "../../themes/notification.css"))
              }),
              React.createElement(MenuItem, {
                id: "discord-theming-main-splash",
                label: "Open Main File",
                action: () => shell.openPath(join(__dirname, "../../themes/main.css"))
              })
            ]
          }))
        }
        if (window.document.querySelector(".menu-1QACrS")) {
          inst = getOwnerInstance(window.document.querySelector(".menu-1QACrS"))
          patcher.after("UserSettingsCogContextMenu-Patch", inst, "render", (_, res) => patcher.after("UserSettingsCogContextMenu-Patch", res.props.children.props.children, "type", callback))
          inst.forceUpdate()
        }
        patcher.after("UserSettingsCogContextMenu-Patch", module, "default", callback)
      })
      waitUntil(() => {
        if (!path.includes("betterdiscord")) return getModule("SettingsView")
        if (window.BdApi) return getModule("SettingsView")
      }).then((module) => {
        const React = getModule(["createElement"])
        const FormSection = getModule("FormSection").default
        const Text = getModule("Text").default
        const Button = getModule(["ButtonLooks"]).default
        function tab(name, Element) {
          return {
            section: `SETTINGS_${name.toUpperCase()}`, 
            label: name, 
            element: () => React.createElement(FormSection, {
              title: name,
              tag: FormSection.Tags.H1,
              children: React.createElement(Element)
            })
          }
        }
        patcher.after("getPredicateSections-Patch", module.default.prototype, "getPredicateSections", (_, res) => {
          const num = res.indexOf(res.find((e) => e && e.section === "logout"))
          if (num === -1) return
          res.splice(num, 0, ...[
            { section: "HEADER", label: "Discord Theming" },
            tab("General", React.memo(() => {
              const [splashIsOpen, setSplashIsOpen] = React.useState(ipcRenderer.sendSync("DT_EXISTS_FAKE_UPDATER"))
              return React.createElement(React.Fragment, {
                children: [
                  React.createElement(Text, {}, "Screens"),
                  React.createElement(Button, {
                    color: splashIsOpen ? Button.Colors.RED : Button.Colors.BRAND_NEW,
                    onClick: () => {
                      setSplashIsOpen(!splashIsOpen)
                      splashIsOpen ? ipcRenderer.sendSync("DT_KILL_FAKE_UPDATER") : ipcRenderer.sendSync("DT_OPEN_FAKE_UPDATER")
                    },
                    style: { marginTop: "10px" }
                  }, splashIsOpen ? "Kill Splash" : "Open Splash"),
                  React.createElement(Text, {
                    style: { marginTop: "10px" }
                  }, "Files"),
                  React.createElement(Button, {
                    onClick: () => shell.openPath(join(__dirname, "../../themes/splash.css")),
                    style: { marginTop: "10px" }
                  }, "Open Splash File"),
                  React.createElement(Button, {
                    onClick: () => shell.openPath(join(__dirname, "../../themes/main.css")),
                    style: { marginTop: "10px" }
                  }, "Open Main File"),
                  React.createElement(Button, {
                    onClick: () => shell.openPath(join(__dirname, "../../themes/notification.css")),
                    style: { marginTop: "10px" }
                  }, "Open Notification File")
                ]
              })
            })),
            { section: "DIVIDER" }
          ])
        })
      })
    }
    if (window.document.readyState === "loading") window.document.addEventListener("DOMContentLoaded", DomLoaded)
    else DomLoaded()
  })(webFrame.top.context)
}