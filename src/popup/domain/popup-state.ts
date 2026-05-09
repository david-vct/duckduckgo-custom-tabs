import type {
  BuiltInTab,
  CustomTab,
  CustomTabPreset,
  Settings,
} from "../../shared/domain/types"

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
  isManualEdit = false,
) {
  const nextBuiltInTab: BuiltInTab = {
    ...settings.builtInTabs[index],
    enabled: Boolean(urlTemplate.trim()),
    urlTemplate,
    // Clear selected preset when URL is manually edited
    selectedPresetUrl: isManualEdit ? undefined : settings.builtInTabs[index].selectedPresetUrl,
  }

  settings.builtInTabs[index] = nextBuiltInTab
}

export function selectBuiltInPreset(
  settings: Settings,
  index: number,
  urlTemplate: string,
) {
  const currentTab = settings.builtInTabs[index]
  const isCurrentlySelected = currentTab.selectedPresetUrl === urlTemplate

  const nextBuiltInTab: BuiltInTab = {
    ...currentTab,
    enabled: !isCurrentlySelected, // Toggle: disable if deselecting
    urlTemplate: isCurrentlySelected ? "" : urlTemplate,
    selectedPresetUrl: isCurrentlySelected ? undefined : urlTemplate,
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

function createCustomTab(
  settings: Settings,
  input: Pick<CustomTab, "label" | "urlTemplate">,
): CustomTab {
  const label = input.label.trim()
  const urlTemplate = input.urlTemplate.trim()

  return {
    id: `custom-${Date.now()}-${settings.customTabs.length + 1}`,
    label,
    enabled: Boolean(label && urlTemplate),
    order: settings.customTabs.length,
    tabKind: "custom",
    urlTemplate,
  }
}

export function appendCustomTab(settings: Settings) {
  settings.customTabs.push(
    createCustomTab(settings, {
      label: "New Tab",
      urlTemplate: "",
    }),
  )
}

function normalizeCustomTabUrl(urlTemplate: string) {
  return urlTemplate.trim()
}

export function findCustomTabIndexByUrl(settings: Settings, urlTemplate: string) {
  const normalizedUrl = urlTemplate.trim()

  return settings.customTabs.findIndex(
    (tab) => normalizeCustomTabUrl(tab.urlTemplate) === normalizedUrl,
  )
}

export function isCustomTabPresetActive(settings: Settings, urlTemplate: string) {
  return findCustomTabIndexByUrl(settings, urlTemplate) !== -1
}

export function appendCustomTabFromPreset(
  settings: Settings,
  preset: CustomTabPreset,
) {
  if (isCustomTabPresetActive(settings, preset.urlTemplate)) {
    return false
  }

  settings.customTabs.push(createCustomTab(settings, preset))
  return true
}

function reindexCustomTabs(settings: Settings) {
  settings.customTabs = settings.customTabs.map((entry, entryIndex) => ({
    ...entry,
    order: entryIndex,
  }))
}

export function removeCustomTab(settings: Settings, index: number) {
  settings.customTabs.splice(index, 1)
  reindexCustomTabs(settings)
}

export function removeCustomTabByUrl(settings: Settings, urlTemplate: string) {
  const index = findCustomTabIndexByUrl(settings, urlTemplate)

  if (index === -1) {
    return false
  }

  removeCustomTab(settings, index)
  return true
}

export function toggleCustomTabPreset(
  settings: Settings,
  preset: CustomTabPreset,
) {
  return removeCustomTabByUrl(settings, preset.urlTemplate)
    ? "removed"
    : (appendCustomTabFromPreset(settings, preset), "added")
}
