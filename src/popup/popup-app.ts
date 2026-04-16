import "./styles.css"
import { createDefaultSettings } from "../shared/domain/settings"
import type { Settings } from "../shared/domain/types"
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
let saveSequence = 0
let lastStartedSave = 0
let saveChain = Promise.resolve()

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

function cloneSettings(settings: Settings): Settings {
  return {
    builtInTabs: settings.builtInTabs.map((tab) => ({ ...tab })),
    customTabs: settings.customTabs.map((tab) => ({ ...tab })),
  }
}

function updateStatus() {
  if (rootElement) updateStatusDisplay(rootElement, state)
}

function persistLatest(sequence: number) {
  if (sequence <= lastStartedSave) {
    return saveChain
  }

  lastStartedSave = sequence
  const snapshot = cloneSettings(state.settings)

  saveChain = saveChain
    .catch(() => undefined)
    .then(async () => {
      try {
        state.saving = true
        updateStatus()

        const savedSettings = await writeSettings(snapshot)

        if (sequence === saveSequence) {
          state.settings = savedSettings
          state.status = "Saved"
          state.statusKind = "success"
        }
      } catch (error) {
        if (sequence === saveSequence) {
          state.status = getErrorMessage(error)
          state.statusKind = "error"
        }
      } finally {
        if (sequence === saveSequence) {
          state.saving = false
          updateStatus()
        }
      }
    })

  return saveChain
}

function markDirty() {
  saveSequence += 1
  state.status = "Saving..."
  state.statusKind = "info"
  updateStatus()
  void persistLatest(saveSequence)
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
      markDirty()
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
