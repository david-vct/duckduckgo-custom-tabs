import "./styles.css"
import {
  SEARCH_PLACEHOLDER,
  createDefaultSettings,
  normalizeSettings,
} from "../shared/settings.js"
import {
  readSettings,
  resetSettings,
  writeSettings,
} from "../shared/storage.js"

const state = {
  saving: false,
  status: "Loading...",
  statusKind: "info",
  settings: createDefaultSettings(),
}

let render = () => {}
let saveTimer = 0

function captureFocusState(root) {
  const activeElement = document.activeElement

  if (!root || !activeElement || !root.contains(activeElement)) {
    return null
  }

  return {
    key: activeElement.getAttribute("data-focus-key"),
    selectionStart:
      typeof activeElement.selectionStart === "number"
        ? activeElement.selectionStart
        : null,
    selectionEnd:
      typeof activeElement.selectionEnd === "number"
        ? activeElement.selectionEnd
        : null,
  }
}

function restoreFocusState(root, focusState) {
  if (!root || !focusState?.key) {
    return
  }

  const nextActiveElement = root.querySelector(
    `[data-focus-key="${focusState.key}"]`,
  )

  if (!nextActiveElement) {
    return
  }

  nextActiveElement.focus()

  if (
    typeof focusState.selectionStart === "number" &&
    typeof focusState.selectionEnd === "number" &&
    typeof nextActiveElement.setSelectionRange === "function"
  ) {
    nextActiveElement.setSelectionRange(
      focusState.selectionStart,
      focusState.selectionEnd,
    )
  }
}

function queueSave() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    try {
      state.saving = true
      render()
      state.settings = await writeSettings(state.settings)
      state.status = "Saved"
      state.statusKind = "success"
    } catch (error) {
      state.status = error.message
      state.statusKind = "error"
    } finally {
      state.saving = false
      render()
    }
  }, 250)
}

function markDirty() {
  state.status = "Saving..."
  state.statusKind = "info"
  render()
  queueSave()
}

function createBuiltInRow(tab, index) {
  const row = document.createElement("div")
  row.className = "popup_row"

  const label = document.createElement("label")
  label.className = "popup_label"
  label.textContent = tab.label

  const input = document.createElement("input")
  input.className = "popup_input"
  input.type = "url"
  input.setAttribute("data-focus-key", `built-in-${tab.id}-${index}`)
  input.value = tab.urlTemplate
  input.placeholder = `https://service.example/search?q=${SEARCH_PLACEHOLDER}`
  input.spellcheck = false
  input.addEventListener("input", () => {
    state.settings.builtInTabs[index] = {
      ...state.settings.builtInTabs[index],
      enabled: Boolean(input.value.trim()),
      urlTemplate: input.value,
    }
    markDirty()
  })

  row.appendChild(label)
  row.appendChild(input)
  return row
}

function createCustomRow(tab, index) {
  const row = document.createElement("div")
  row.className = "popup_row popup_row_custom"

  const nameInput = document.createElement("input")
  nameInput.className = "popup_input popup_name_input"
  nameInput.type = "text"
  nameInput.setAttribute("data-focus-key", `custom-name-${tab.id}-${index}`)
  nameInput.placeholder = "New tab name"
  nameInput.value = tab.label
  nameInput.addEventListener("input", () => {
    const nextLabel = nameInput.value
    const nextUrl = state.settings.customTabs[index]?.urlTemplate || ""

    state.settings.customTabs[index] = {
      ...state.settings.customTabs[index],
      label: nextLabel,
      enabled: Boolean(nextLabel.trim() && nextUrl.trim()),
    }
    markDirty()
  })

  const urlInput = document.createElement("input")
  urlInput.className = "popup_input"
  urlInput.type = "url"
  urlInput.setAttribute("data-focus-key", `custom-url-${tab.id}-${index}`)
  urlInput.placeholder = `https://service.example/search?q=${SEARCH_PLACEHOLDER}`
  urlInput.value = tab.urlTemplate
  urlInput.spellcheck = false
  urlInput.addEventListener("input", () => {
    const nextUrl = urlInput.value
    const nextLabel = state.settings.customTabs[index]?.label || ""

    state.settings.customTabs[index] = {
      ...state.settings.customTabs[index],
      enabled: Boolean(nextLabel.trim() && nextUrl.trim()),
      urlTemplate: nextUrl,
    }
    markDirty()
  })

  const removeButton = document.createElement("button")
  removeButton.type = "button"
  removeButton.className = "popup_remove"
  removeButton.textContent = "Remove"
  removeButton.addEventListener("click", () => {
    state.settings.customTabs.splice(index, 1)
    state.settings.customTabs = state.settings.customTabs.map(
      (entry, entryIndex) => ({
        ...entry,
        order: entryIndex,
      }),
    )
    markDirty()
  })

  row.appendChild(nameInput)
  row.appendChild(urlInput)
  row.appendChild(removeButton)
  return row
}

async function load() {
  try {
    state.settings = normalizeSettings(await readSettings())
    state.status = "Ready"
    state.statusKind = "info"
  } catch (error) {
    state.settings = createDefaultSettings()
    state.status = error.message
    state.statusKind = "error"
  }

  render()
}

function PopupApp() {
  const root = document.getElementById("root")

  if (!root) {
    return
  }

  render = () => {
    const focusState = captureFocusState(root)

    root.textContent = ""

    const app = document.createElement("div")
    app.className = "popup_app"

    const title = document.createElement("h1")
    title.className = "popup_title"
    title.textContent = "DuckDuckGo tabs"

    const subtitle = document.createElement("p")
    subtitle.className = "popup_subtitle"
    subtitle.textContent = `Active only on duckduckgo.com. Use ${SEARCH_PLACEHOLDER} in each link.`

    const status = document.createElement("p")
    status.className = `popup_status popup_status_${state.statusKind}`
    status.textContent = state.saving ? "Saving..." : state.status

    const builtInTitle = document.createElement("p")
    builtInTitle.className = "popup_section_title"
    builtInTitle.textContent = "Redirect built-in tabs"

    const builtInList = document.createElement("div")
    builtInList.className = "popup_list"

    for (const [index, tab] of state.settings.builtInTabs.entries()) {
      builtInList.appendChild(createBuiltInRow(tab, index))
    }

    const customTitle = document.createElement("p")
    customTitle.className = "popup_section_title"
    customTitle.textContent = "Custom tabs inserted before More"

    const customList = document.createElement("div")
    customList.className = "popup_list"

    for (const [index, tab] of state.settings.customTabs.entries()) {
      customList.appendChild(createCustomRow(tab, index))
    }

    const addButton = document.createElement("button")
    addButton.type = "button"
    addButton.className = "popup_add_button"
    addButton.textContent = "Add a new search tab"
    addButton.addEventListener("click", () => {
      state.settings.customTabs.push({
        id: `custom-${Date.now()}`,
        label: "",
        enabled: false,
        order: state.settings.customTabs.length,
        tabKind: "custom",
        urlTemplate: "",
      })
      render()
    })

    const resetButton = document.createElement("button")
    resetButton.type = "button"
    resetButton.className = "popup_reset_button"
    resetButton.textContent = "Reset"
    resetButton.addEventListener("click", async () => {
      state.settings = await resetSettings()
      state.status = "Reset"
      state.statusKind = "info"
      render()
    })

    app.appendChild(title)
    app.appendChild(subtitle)
    app.appendChild(status)
    app.appendChild(builtInTitle)
    app.appendChild(builtInList)
    app.appendChild(customTitle)
    app.appendChild(customList)
    app.appendChild(addButton)
    app.appendChild(resetButton)
    root.appendChild(app)
    restoreFocusState(root, focusState)
  }

  render()
  load()
}

PopupApp()
