const readline = require("readline")
const fs = require("fs")
const path = require("path")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.setPrompt("Discord Resources Path:\n");
rl.prompt();
rl.on("line", async (input) => {
  input = path.resolve(input)
  if (!fs.existsSync(input)) {
    console.error(`Your path '${input}' doesn't exist`)
    return rl.close()
  }
  if (process.argv.includes("--install")) {
    if (fs.existsSync(path.join(input, "app"))) {
      console.error(`It seems a client mod is already injected.\nYou can go to '${input}' and rename the folder named 'app' to 'dt-app'.`)
      return rl.close()
    }
    fs.mkdirSync(path.join(input, "app"))
    fs.writeFileSync(path.join(input, "app", "index.js"), `require("${__dirname.replace(/(\/|\\)/g, "/")}")`)
    fs.writeFileSync(path.join(input, "app", "package.json"), JSON.stringify({ name: "discord", main: "index.js" }))
    console.log("Injected")
  }
  else if (process.argv.includes("--uninstall")) {
    if (fs.existsSync(path.join(input, "app"))) fs.rmSync(path.join(input, "app"), { recursive: true })
    console.log("Uninjected")
  }
  rl.close()
})
"/Applications/Discord PTB.app/Contents/Resources/"