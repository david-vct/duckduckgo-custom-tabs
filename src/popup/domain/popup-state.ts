import type { BuiltInTab, CustomTab, Settings } from "../../shared/domain/types"

export type PopupStatusKind = "info" | "success" | "error"
export type ActiveTab = "builtIn" | "custom"

export interface PopupState {
  saving: boolean
  status: string
  statusKind: PopupStatusKind
  settings: Settings
  activeTab: ActiveTab
}

export function createPopupState(settings: Settings): PopupState {
  return {
    saving: false,
    status: "Loading...",
    statusKind: "info",
    settings,
    activeTab: "builtIn",
  }
}

export function updateBuiltInTab(
  settings: Settings,
  index: number,
  urlTemplate: string,
) {
  const nextBuiltInTab: BuiltInTab = {
    ...settings.builtInTabs[index],
    enabled: Boolean(urlTemplate.trim()),
    urlTemplate,
  }

  settings.builtInTabs[index] = nextBuiltInTab
}

export function updateCustomTabLabel(
  settings: Settings,
  index: number,
  label: string,
) {
  const currentTab = settings.customTabs[index]
  const nextCustomTab: CustomTab = {
    ...currentTab,
    label,
    enabled: Boolean(label.trim() && currentTab.urlTemplate.trim()),
  }

  settings.customTabs[index] = nextCustomTab
}

export function updateCustomTabUrl(
  settings: Settings,
  index: number,
  urlTemplate: string,
) {
  const currentTab = settings.customTabs[index]
  const nextCustomTab: CustomTab = {
    ...currentTab,
    enabled: Boolean(currentTab.label.trim() && urlTemplate.trim()),
    urlTemplate,
  }

  settings.customTabs[index] = nextCustomTab
}

export function appendCustomTab(settings: Settings) {
  settings.customTabs.push({
    id: `custom-${Date.now()}`,
    label: "New Tab",
    enabled: false,
    order: settings.customTabs.length,
    tabKind: "custom",
    urlTemplate: "",
  })
}

export function removeCustomTab(settings: Settings, index: number) {
  settings.customTabs.splice(index, 1)
  settings.customTabs = settings.customTabs.map((entry, entryIndex) => ({
    ...entry,
    order: entryIndex,
  }))
}
