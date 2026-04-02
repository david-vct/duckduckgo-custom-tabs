import {
  SEARCH_PLACEHOLDER,
  getBuiltInTabPresets,
} from "../../shared/domain/settings"
import type { PopupState } from "../domain/popup-state"

interface SettingsFormHandlers {
  onBuiltInChange: (index: number, value: string) => void
  onBuiltInPresetApply: (index: number, value: string) => void
  onCustomLabelChange: (index: number, value: string) => void
  onCustomUrlChange: (index: number, value: string) => void
  onCustomRemove: (index: number) => void
  onCustomAdd: () => void
  onReset: () => void
}

function createBuiltInRow(
  tab: PopupState["settings"]["builtInTabs"][number],
  index: number,
  handlers: SettingsFormHandlers,
) {
  const row = document.createElement("div")
  row.className = "popup_row"

  const presets = getBuiltInTabPresets(tab.id)

  const info = document.createElement("div")
  info.className = "popup_label_group"

  const label = document.createElement("label")
  label.className = "popup_label"
  label.textContent = tab.label

  info.appendChild(label)

  if (presets.length > 0) {
    const presetList = document.createElement("div")
    presetList.className = "popup_preset_list"

    for (const preset of presets) {
      const presetButton = document.createElement("button")
      presetButton.type = "button"
      presetButton.className =
        preset.urlTemplate === tab.urlTemplate
          ? "popup_preset_button popup_preset_button_active"
          : "popup_preset_button"
      presetButton.textContent = preset.label
      presetButton.addEventListener("click", () => {
        handlers.onBuiltInPresetApply(index, preset.urlTemplate)
      })
      presetList.appendChild(presetButton)
    }

    info.appendChild(presetList)
  }

  const input = document.createElement("input")
  input.className = "popup_input"
  input.type = "url"
  input.setAttribute("data-focus-key", `built-in-${tab.id}-${index}`)
  input.value = tab.urlTemplate
  input.placeholder = `https://service.example/search?q=${SEARCH_PLACEHOLDER}`
  input.spellcheck = false
  input.addEventListener("input", () => {
    handlers.onBuiltInChange(index, input.value)
  })

  row.appendChild(info)
  row.appendChild(input)
  return row
}

function createCustomRow(
  tab: PopupState["settings"]["customTabs"][number],
  index: number,
  handlers: SettingsFormHandlers,
) {
  const row = document.createElement("div")
  row.className = "popup_row popup_row_custom"

  const nameInput = document.createElement("input")
  nameInput.className = "popup_input popup_name_input"
  nameInput.type = "text"
  nameInput.setAttribute("data-focus-key", `custom-name-${tab.id}-${index}`)
  nameInput.placeholder = "New tab name"
  nameInput.value = tab.label
  nameInput.addEventListener("input", () => {
    handlers.onCustomLabelChange(index, nameInput.value)
  })

  const urlInput = document.createElement("input")
  urlInput.className = "popup_input"
  urlInput.type = "url"
  urlInput.setAttribute("data-focus-key", `custom-url-${tab.id}-${index}`)
  urlInput.placeholder = `https://service.example/search?q=${SEARCH_PLACEHOLDER}`
  urlInput.value = tab.urlTemplate
  urlInput.spellcheck = false
  urlInput.addEventListener("input", () => {
    handlers.onCustomUrlChange(index, urlInput.value)
  })

  const removeButton = document.createElement("button")
  removeButton.type = "button"
  removeButton.className = "popup_remove"
  removeButton.textContent = "Remove"
  removeButton.addEventListener("click", () => {
    handlers.onCustomRemove(index)
  })

  row.appendChild(nameInput)
  row.appendChild(urlInput)
  row.appendChild(removeButton)
  return row
}

export function renderSettingsForm(
  root: HTMLElement,
  state: PopupState,
  handlers: SettingsFormHandlers,
) {
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
    builtInList.appendChild(createBuiltInRow(tab, index, handlers))
  }

  const customTitle = document.createElement("p")
  customTitle.className = "popup_section_title"
  customTitle.textContent = "Custom tabs inserted before More"

  const customList = document.createElement("div")
  customList.className = "popup_list"

  for (const [index, tab] of state.settings.customTabs.entries()) {
    customList.appendChild(createCustomRow(tab, index, handlers))
  }

  const addButton = document.createElement("button")
  addButton.type = "button"
  addButton.className = "popup_add_button"
  addButton.textContent = "Add a new search tab"
  addButton.addEventListener("click", handlers.onCustomAdd)

  const resetButton = document.createElement("button")
  resetButton.type = "button"
  resetButton.className = "popup_reset_button"
  resetButton.textContent = "Reset"
  resetButton.addEventListener("click", handlers.onReset)

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
}
