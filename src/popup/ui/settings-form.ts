import {
  SEARCH_PLACEHOLDER,
  getBuiltInTabPresets,
} from "../../shared/domain/settings"
import type { ActiveTab, PopupState } from "../domain/popup-state"

export interface SettingsFormHandlers {
  onBuiltInChange: (index: number, value: string) => void
  onBuiltInPresetApply: (index: number, value: string) => void
  onCustomLabelChange: (index: number, value: string) => void
  onCustomUrlChange: (index: number, value: string) => void
  onCustomRemove: (index: number) => void
  onCustomAdd: () => void
  onReset: () => void
  onTabSwitch: (tab: ActiveTab) => void
}

let builtInPanelEl: HTMLElement | null = null
let customPanelEl: HTMLElement | null = null

function createButtonLabel(text: string) {
  const label = document.createElement("span")
  label.className = "popup_button_label"
  label.textContent = text
  return label
}

function buildBuiltInCard(
  tab: PopupState["settings"]["builtInTabs"][number],
  index: number,
  handlers: SettingsFormHandlers,
) {
  const card = document.createElement("div")
  card.className = "popup_card"

  const presets = getBuiltInTabPresets(tab.id)

  const header = document.createElement("div")
  header.className = "popup_card_header"

  const label = document.createElement("span")
  label.className = "popup_label"
  label.textContent = tab.label
  header.appendChild(label)

  if (presets.length > 0) {
    const presetList = document.createElement("div")
    presetList.className = "popup_preset_list"
    for (const preset of presets) {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className =
        preset.urlTemplate === tab.selectedPresetUrl
          ? "popup_preset_button popup_preset_button_active"
          : "popup_preset_button"
      btn.appendChild(createButtonLabel(preset.label))
      btn.addEventListener("click", () =>
        handlers.onBuiltInPresetApply(index, preset.urlTemplate),
      )
      presetList.appendChild(btn)
    }
    header.appendChild(presetList)
  }

  const input = document.createElement("input")
  input.className = "popup_input"
  input.type = "url"
  input.value = tab.urlTemplate
  input.placeholder = `https://service.example/search?q=${SEARCH_PLACEHOLDER}`
  input.spellcheck = false
  input.addEventListener("input", () =>
    handlers.onBuiltInChange(index, input.value),
  )

  card.appendChild(header)
  card.appendChild(input)
  return card
}

function buildCustomCard(
  tab: PopupState["settings"]["customTabs"][number],
  index: number,
  handlers: SettingsFormHandlers,
) {
  const card = document.createElement("div")
  card.className = "popup_custom_card"

  const header = document.createElement("div")
  header.className = "popup_custom_card_header"

  const nameInput = document.createElement("input")
  nameInput.className = "popup_input popup_name_input"
  nameInput.type = "text"
  nameInput.placeholder = "Tab name"
  nameInput.value = tab.label
  nameInput.addEventListener("input", () =>
    handlers.onCustomLabelChange(index, nameInput.value),
  )

  const removeBtn = document.createElement("button")
  removeBtn.type = "button"
  removeBtn.className = "popup_remove"
  removeBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
  removeBtn.title = "Remove this tab"
  removeBtn.addEventListener("click", () => handlers.onCustomRemove(index))

  header.appendChild(nameInput)
  header.appendChild(removeBtn)

  const urlInput = document.createElement("input")
  urlInput.className = "popup_input"
  urlInput.type = "url"
  urlInput.placeholder = `https://example.com/search?q=${SEARCH_PLACEHOLDER}`
  urlInput.value = tab.urlTemplate
  urlInput.spellcheck = false
  urlInput.addEventListener("input", () =>
    handlers.onCustomUrlChange(index, urlInput.value),
  )

  card.appendChild(header)
  card.appendChild(urlInput)
  return card
}

function buildBuiltInPanel(
  state: PopupState,
  handlers: SettingsFormHandlers,
): HTMLElement {
  const panel = document.createElement("div")
  panel.className = "popup_panel"
  panel.setAttribute("data-panel", "builtIn")
  if (state.activeTab !== "builtIn") panel.classList.add("popup_panel_hidden")

  const hint = document.createElement("p")
  hint.className = "popup_hint"
  hint.textContent = `Redirect DuckDuckGo's search tabs to other services. Use ${SEARCH_PLACEHOLDER} as the search term placeholder.`
  panel.appendChild(hint)

  const list = document.createElement("div")
  list.className = "popup_list"
  for (const [i, tab] of state.settings.builtInTabs.entries()) {
    list.appendChild(buildBuiltInCard(tab, i, handlers))
  }
  panel.appendChild(list)
  return panel
}

function buildCustomPanel(
  state: PopupState,
  handlers: SettingsFormHandlers,
): HTMLElement {
  const panel = document.createElement("div")
  panel.className = "popup_panel"
  panel.setAttribute("data-panel", "custom")
  if (state.activeTab !== "custom") panel.classList.add("popup_panel_hidden")

  const hint = document.createElement("p")
  hint.className = "popup_hint"
  hint.textContent = `Add new tabs that appear before "More" on DuckDuckGo. Use ${SEARCH_PLACEHOLDER} as the search term placeholder.`
  panel.appendChild(hint)

  if (state.settings.customTabs.length === 0) {
    const empty = document.createElement("div")
    empty.className = "popup_empty"
    const icon = document.createElement("div")
    icon.className = "popup_empty_icon"
    icon.textContent = "+"
    const text = document.createElement("div")
    text.className = "popup_empty_text"
    text.textContent = "No custom tabs yet"
    empty.appendChild(icon)
    empty.appendChild(text)
    panel.appendChild(empty)
  } else {
    const list = document.createElement("div")
    list.className = "popup_list"
    for (const [i, tab] of state.settings.customTabs.entries()) {
      list.appendChild(buildCustomCard(tab, i, handlers))
    }
    panel.appendChild(list)
  }

  const addBtn = document.createElement("button")
  addBtn.type = "button"
  addBtn.className = "popup_add_button"
  addBtn.appendChild(createButtonLabel("+ Add tab"))
  addBtn.addEventListener("click", handlers.onCustomAdd)
  panel.appendChild(addBtn)

  return panel
}

/** Creates the entire popup shell. Called once at startup. */
export function initPopup(
  root: HTMLElement,
  state: PopupState,
  handlers: SettingsFormHandlers,
) {
  const app = document.createElement("div")
  app.className = "popup_app"

  const header = document.createElement("div")
  header.className = "popup_header"
  const title = document.createElement("h1")
  title.className = "popup_title"
  title.textContent = "DuckDuckGo Custom Tabs"
  const status = document.createElement("span")
  status.className = "popup_status"
  header.appendChild(title)
  header.appendChild(status)

  const tabBar = document.createElement("div")
  tabBar.className = "popup_tabs"
  const builtInTab = document.createElement("button")
  builtInTab.type = "button"
  builtInTab.className =
    state.activeTab === "builtIn" ? "popup_tab popup_tab_active" : "popup_tab"
  builtInTab.innerHTML = 'Redirect<span class="popup_tab_badge">0</span>'
  builtInTab.addEventListener("click", () => handlers.onTabSwitch("builtIn"))
  const customTab = document.createElement("button")
  customTab.type = "button"
  customTab.className =
    state.activeTab === "custom" ? "popup_tab popup_tab_active" : "popup_tab"
  customTab.innerHTML = 'Add New<span class="popup_tab_badge">0</span>'
  customTab.addEventListener("click", () => handlers.onTabSwitch("custom"))
  tabBar.appendChild(builtInTab)
  tabBar.appendChild(customTab)

  const content = document.createElement("div")
  content.className = "popup_content"
  builtInPanelEl = buildBuiltInPanel(state, handlers)
  customPanelEl = buildCustomPanel(state, handlers)
  content.appendChild(builtInPanelEl)
  content.appendChild(customPanelEl)

  const footer = document.createElement("div")
  footer.className = "popup_footer"
  const footerHint = document.createElement("p")
  footerHint.className = "popup_footer_hint"
  footerHint.textContent = "Active on duckduckgo.com"
  const resetBtn = document.createElement("button")
  resetBtn.type = "button"
  resetBtn.className = "popup_reset_button"
  resetBtn.appendChild(createButtonLabel("Reset all"))
  resetBtn.addEventListener("click", handlers.onReset)
  footer.appendChild(footerHint)
  footer.appendChild(resetBtn)

  app.appendChild(header)
  app.appendChild(tabBar)
  app.appendChild(content)
  app.appendChild(footer)
  root.appendChild(app)

  updateStatusDisplay(root, state)
}

/** Toggle which panel is visible. Pure CSS, zero DOM changes. */
export function switchTab(root: HTMLElement, activeTab: ActiveTab) {
  builtInPanelEl?.classList.toggle(
    "popup_panel_hidden",
    activeTab !== "builtIn",
  )
  customPanelEl?.classList.toggle("popup_panel_hidden", activeTab !== "custom")

  const tabs = root.querySelectorAll<HTMLButtonElement>(".popup_tab")
  if (tabs.length >= 2) {
    tabs[0].classList.toggle("popup_tab_active", activeTab === "builtIn")
    tabs[1].classList.toggle("popup_tab_active", activeTab === "custom")
  }
}

/** Rebuild one panel by swapping the element in-place (atomic replaceWith). */
export function rebuildBuiltInPanel(
  state: PopupState,
  handlers: SettingsFormHandlers,
) {
  if (!builtInPanelEl) return
  const next = buildBuiltInPanel(state, handlers)
  builtInPanelEl.replaceWith(next)
  builtInPanelEl = next
}

export function rebuildCustomPanel(
  state: PopupState,
  handlers: SettingsFormHandlers,
) {
  if (!customPanelEl) return
  const next = buildCustomPanel(state, handlers)
  customPanelEl.replaceWith(next)
  customPanelEl = next
}

export function rebuildAllPanels(
  state: PopupState,
  handlers: SettingsFormHandlers,
) {
  rebuildBuiltInPanel(state, handlers)
  rebuildCustomPanel(state, handlers)
}

/** Patch only status text + badge counts. Zero layout changes. */
export function updateStatusDisplay(root: HTMLElement, state: PopupState) {
  const statusEl = root.querySelector<HTMLElement>(".popup_status")
  if (statusEl) {
    statusEl.className = `popup_status popup_status_${state.statusKind}`
    statusEl.textContent = state.saving ? "Saving…" : state.status
  }

  const badges = root.querySelectorAll<HTMLElement>(".popup_tab_badge")
  if (badges.length >= 2) {
    const builtInCount = state.settings.builtInTabs.filter((t) =>
      t.urlTemplate.trim(),
    ).length
    badges[0].textContent = String(builtInCount)
    badges[1].textContent = String(state.settings.customTabs.length)
  }
}
