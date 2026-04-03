import "./styles.css"
import { createDefaultSettings } from "../shared/domain/settings"
import {
  readSettings,
  resetSettings,
  writeSettings,
} from "../shared/platform/storage"
import {
  appendCustomTab,
  createPopupState,
  removeCustomTab,
  updateBuiltInTab,
  updateCustomTabLabel,
  updateCustomTabUrl,
} from "./domain/popup-state"
import type { SettingsFormHandlers } from "./ui/settings-form"
import {
  initPopup,
  rebuildAllPanels,
  rebuildBuiltInPanel,
  rebuildCustomPanel,
  switchTab,
  updateStatusDisplay,
} from "./ui/settings-form"

const state = createPopupState(createDefaultSettings())

let rootElement: HTMLElement | null = null
let handlers: SettingsFormHandlers
let saveTimer = 0

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

function updateStatus() {
  if (rootElement) updateStatusDisplay(rootElement, state)
}

function queueSave() {
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    try {
      state.saving = true
      updateStatus()
      state.settings = await writeSettings(state.settings)
      state.status = "Saved"
      state.statusKind = "success"
    } catch (error) {
      state.status = getErrorMessage(error)
      state.statusKind = "error"
    } finally {
      state.saving = false
      updateStatus()
    }
  }, 250)
}

function markDirty() {
  state.status = "Saving..."
  state.statusKind = "info"
  updateStatus()
  queueSave()
}

function PopupApp() {
  rootElement = document.getElementById("root")
  if (!rootElement) return

  handlers = {
    onBuiltInChange(index, value) {
      updateBuiltInTab(state.settings, index, value)
      markDirty()
    },
    onBuiltInPresetApply(index, value) {
      updateBuiltInTab(state.settings, index, value)
      rebuildBuiltInPanel(state, handlers)
      markDirty()
    },
    onCustomLabelChange(index, value) {
      updateCustomTabLabel(state.settings, index, value)
      markDirty()
    },
    onCustomUrlChange(index, value) {
      updateCustomTabUrl(state.settings, index, value)
      markDirty()
    },
    onCustomRemove(index) {
      removeCustomTab(state.settings, index)
      rebuildCustomPanel(state, handlers)
      markDirty()
    },
    onCustomAdd() {
      appendCustomTab(state.settings)
      rebuildCustomPanel(state, handlers)
      updateStatus()
    },
    onTabSwitch(tab) {
      state.activeTab = tab
      switchTab(rootElement!, tab)
      updateStatus()
    },
    async onReset() {
      state.settings = await resetSettings()
      state.status = "Reset"
      state.statusKind = "info"
      rebuildAllPanels(state, handlers)
      updateStatus()
    },
  }

  initPopup(rootElement, state, handlers)

  // Load real settings then refresh panels
  ;(async () => {
    try {
      state.settings = await readSettings()
      state.status = "Ready"
      state.statusKind = "info"
    } catch (error) {
      state.settings = createDefaultSettings()
      state.status = getErrorMessage(error)
      state.statusKind = "error"
    }
    rebuildAllPanels(state, handlers)
    updateStatus()
  })()
}

PopupApp()
