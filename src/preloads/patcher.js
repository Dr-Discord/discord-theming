let Patch_Symbol = Symbol("patch")
let Quick_Symbol = Symbol("patch.quick")
let ALLpatches = {}

function patch(patchName, moduleToPatch, functionToPatch, callback, opts = {}) {
  let { method = "after", id } = opts
  let originalFunction = moduleToPatch[functionToPatch]
  if (!originalFunction) {
    moduleToPatch[functionToPatch] = () => {}
    originalFunction = moduleToPatch[functionToPatch]
  }
  method = method.toLowerCase()
  if (!(method === "before" || method === "after" || method === "instead")) throw new Error(`'${method}' is a invalid patch type`)
  let patches = moduleToPatch?.[functionToPatch]?.[Patch_Symbol]?.patches ?? { before: [], after: [], instead: [] }
  let CallbackSymbol = Symbol()
  let patchInfo = { unpatch, patchName: id ?? patchName, moduleToPatch, functionToPatch, callback, method, Symbol: CallbackSymbol }
  patches[method].unshift(Object.assign(callback, { unpatch, Symbol: CallbackSymbol }))
  let DidUnpatch = false
  function unpatch() {
    if (DidUnpatch) return
    DidUnpatch = true
    let found = patches[method].find(p => p.Symbol === patchInfo.Symbol)
    let index = patches[method].indexOf(found)
    patches[method].splice(index, 1)
    found = ALLpatches[patchName].find(p => p.Symbol === patchInfo.Symbol)
    index = ALLpatches[patchName].indexOf(found)
    ALLpatches[patchName].splice(index, 1)
    if (!ALLpatches[patchName].length) delete ALLpatches[patchName]
  }
  if (!moduleToPatch[functionToPatch][Patch_Symbol]) {
    moduleToPatch[functionToPatch] = function() {
      for (const patch of patches.before) patch([...arguments], this)
      let insteadFunction = originalFunction
      for (const patch of patches.instead) insteadFunction = patch([...arguments], insteadFunction, this)
      let res = insteadFunction.apply(this, [...arguments])
      for (const patch of patches.after) patch([...arguments], res, this)
      return res
    }
    moduleToPatch[functionToPatch][Patch_Symbol] = {
      original: originalFunction,
      module: moduleToPatch,
      function: functionToPatch,
      patches, unpatchAll: () => {
        for (const patch of patches.before) patch.unpatch()
        for (const patch of patches.instead) patch.unpatch()
        for (const patch of patches.after) patch.unpatch()
        moduleToPatch[functionToPatch] = originalFunction
      }
    }
    Object.assign(moduleToPatch[functionToPatch], originalFunction, {
      toString: () => originalFunction.toString()
    })
  }
  if (!ALLpatches[patchName]) ALLpatches[patchName] = [patchInfo]
  else ALLpatches[patchName].push(patchInfo)
  return unpatch
}

module.exports = {
  patch: (patchName, moduleToPatch, functionToPatch, callback, opts) => patch(patchName, moduleToPatch, functionToPatch, callback, opts),
  before: (patchName, moduleToPatch, functionToPatch, callback, opts) => patch(patchName, moduleToPatch, functionToPatch, callback, {
    method: "before",
    ...opts
  }),
  instead: (patchName, moduleToPatch, functionToPatch, callback, opts) => patch(patchName, moduleToPatch, functionToPatch, callback, {
    method: "instead",
    ...opts
  }),
  after: (patchName, moduleToPatch, functionToPatch, callback, opts) => patch(patchName, moduleToPatch, functionToPatch, callback, {
    method: "after",
    ...opts
  }),
  unpatchAll: function(name) {
    if (!ALLpatches[name]) return
    for (let i = ALLpatches[name].length; i > 0; i--) ALLpatches[name][i - 1].unpatch()
  },
  quick: (moduleToPatch, functionToPatch, callback, opts) => patch(Quick_Symbol, moduleToPatch, functionToPatch, callback, opts),
  patches: ALLpatches
}
