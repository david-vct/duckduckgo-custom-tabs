import "./styles.css"
import {
  createDefaultSettings,
  normalizeSettings,
} from "../shared/domain/settings"
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
import { captureFocusState, restoreFocusState } from "./ui/focus-state"
import { renderSettingsForm } from "./ui/settings-form"

const state = createPopupState(createDefaultSettings())

let render = () => {}
let saveTimer = 0

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
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
      state.status = getErrorMessage(error)
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

async function load() {
  try {
    state.settings = await readSettings()
    state.status = "Ready"
    state.statusKind = "info"
  } catch (error) {
    state.settings = createDefaultSettings()
    state.status = getErrorMessage(error)
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
    renderSettingsForm(root, state, {
      onBuiltInChange: (index, value) => {
        updateBuiltInTab(state.settings, index, value)
        markDirty()
      },
      onCustomLabelChange: (index, value) => {
        updateCustomTabLabel(state.settings, index, value)
        markDirty()
      },
      onCustomUrlChange: (index, value) => {
        updateCustomTabUrl(state.settings, index, value)
        markDirty()
      },
      onCustomRemove: (index) => {
        removeCustomTab(state.settings, index)
        markDirty()
      },
      onCustomAdd: () => {
        appendCustomTab(state.settings)
        render()
      },
      onReset: async () => {
        state.settings = await resetSettings()
        state.status = "Reset"
        state.statusKind = "info"
        render()
      },
    })
    restoreFocusState(root, focusState)
  }

  render()
  load()
}

PopupApp()
