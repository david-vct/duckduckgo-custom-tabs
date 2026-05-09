export type TabKind = "builtIn" | "custom"

export interface BaseTab {
  id: string
  label: string
  enabled: boolean
  order: number
  tabKind: TabKind
  urlTemplate: string
}

export interface BuiltInTab extends BaseTab {
  tabKind: "builtIn"
  /** URL of the selected preset (if any) - used to detect manual edits vs preset selection */
  selectedPresetUrl?: string
}

export interface CustomTab extends BaseTab {
  tabKind: "custom"
}

export interface Settings {
  builtInTabs: BuiltInTab[]
  customTabs: CustomTab[]
}

export interface BuiltInTabDefinition {
  id: string
  label: string
  exampleUrl: string
  matches: (input: { url: URL; label: string }) => boolean
}

export interface BuiltInTabPreset {
  tabId: string
  label: string
  urlTemplate: string
}

export interface CustomTabPreset {
  label: string
  urlTemplate: string
}
