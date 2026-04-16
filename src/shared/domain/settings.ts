import type {
  BuiltInTab,
  BuiltInTabDefinition,
  BuiltInTabPreset,
  CustomTab,
  Settings,
} from "./types"

export interface BuiltInTabInput {
  id?: string
  enabled?: boolean
  order?: number
  urlTemplate?: string
}

export interface CustomTabInput {
  id?: string
  label?: string
  enabled?: boolean
  order?: number
  urlTemplate?: string
}

export interface SettingsInput {
  builtInTabs?: BuiltInTabInput[]
  customTabs?: CustomTabInput[]
}

function isBuiltInTab(value: BuiltInTab | null): value is BuiltInTab {
  return value !== null
}

function isCustomTab(value: CustomTab | null): value is CustomTab {
  return value !== null
}

export const SETTINGS_STORAGE_KEY = "duckduckgoCustomTabs.settings"
export const SEARCH_PLACEHOLDER = "{search}"

export const BUILT_IN_TAB_DEFINITIONS: BuiltInTabDefinition[] = [
  {
    id: "images",
    label: "Images",
    exampleUrl: "https://www.google.com/search?tbm=isch&q={search}",
    matches: ({ url }) =>
      url.searchParams.get("ia") === "images" ||
      url.searchParams.get("iax") === "images",
  },
  {
    id: "maps",
    label: "Maps",
    exampleUrl: "https://www.google.com/maps/search/{search}",
    matches: ({ url }) => url.searchParams.get("iaxm") === "maps",
  },
  {
    id: "videos",
    label: "Videos",
    exampleUrl: "https://www.youtube.com/results?search_query={search}",
    matches: ({ url }) =>
      url.searchParams.get("ia") === "videos" ||
      url.searchParams.get("iax") === "videos",
  },
  {
    id: "news",
    label: "News",
    exampleUrl: "https://news.google.com/search?q={search}",
    matches: ({ url }) =>
      url.searchParams.get("ia") === "news" ||
      url.searchParams.get("iar") === "news",
  },
  {
    id: "shopping",
    label: "Shopping",
    exampleUrl: "https://www.google.com/search?tbm=shop&q={search}",
    matches: ({ url }) =>
      url.searchParams.get("ia") === "shopping" ||
      url.searchParams.get("iax") === "shopping",
  },
]

export const BUILT_IN_TAB_PRESETS: BuiltInTabPreset[] = [
  {
    tabId: "images",
    label: "Google Images",
    urlTemplate: "https://www.google.com/search?tbm=isch&q={search}",
  },
  {
    tabId: "images",
    label: "Bing Images",
    urlTemplate: "https://www.bing.com/images/search?q={search}",
  },
  {
    tabId: "maps",
    label: "Google Maps",
    urlTemplate: "https://www.google.com/maps/search/{search}",
  },
  {
    tabId: "maps",
    label: "Bing Maps",
    urlTemplate: "https://www.bing.com/maps?q={search}",
  },
  {
    tabId: "maps",
    label: "Apple Maps",
    urlTemplate: "https://maps.apple.com/?q={search}",
  },
  {
    tabId: "videos",
    label: "YouTube",
    urlTemplate: "https://www.youtube.com/results?search_query={search}",
  },
  {
    tabId: "videos",
    label: "Vimeo",
    urlTemplate: "https://vimeo.com/search?q={search}",
  },
  {
    tabId: "news",
    label: "Google News",
    urlTemplate: "https://news.google.com/search?q={search}",
  },
  {
    tabId: "news",
    label: "Bing News",
    urlTemplate: "https://www.bing.com/news/search?q={search}",
  },
  {
    tabId: "shopping",
    label: "Google Shopping",
    urlTemplate: "https://www.google.com/search?tbm=shop&q={search}",
  },
  {
    tabId: "shopping",
    label: "eBay",
    urlTemplate: "https://www.ebay.com/sch/i.html?_nkw={search}",
  },
]

const SAMPLE_SEARCH = "duckduckgo custom tabs"

function slugifyLabel(label: string) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeOrder(value: unknown, fallback: number) {
  const numeric = Number.parseInt(String(value), 10)
  return Number.isFinite(numeric) ? numeric : fallback
}

function createDefaultBuiltInTab(
  definition: BuiltInTabDefinition,
  order: number,
): BuiltInTab {
  return {
    id: definition.id,
    label: definition.label,
    enabled: false,
    order,
    tabKind: "builtIn",
    urlTemplate: "",
  }
}

export function createDefaultSettings(): Settings {
  return {
    builtInTabs: BUILT_IN_TAB_DEFINITIONS.map((definition, index) =>
      createDefaultBuiltInTab(definition, index),
    ),
    customTabs: [],
  }
}

export function getBuiltInTabDefinition(tabId: string) {
  return BUILT_IN_TAB_DEFINITIONS.find((definition) => definition.id === tabId)
}

export function getBuiltInTabPresets(tabId: string) {
  return BUILT_IN_TAB_PRESETS.filter((preset) => preset.tabId === tabId)
}

export function detectBuiltInTabId(href?: string | null, label = "") {
  let url

  try {
    url = new URL(href || "", "https://duckduckgo.com")
  } catch {
    return null
  }

  const normalizedLabel = String(label || "")
    .trim()
    .toLowerCase()

  for (const definition of BUILT_IN_TAB_DEFINITIONS) {
    if (definition.matches({ url, label: normalizedLabel })) {
      return definition.id
    }
  }

  return (
    BUILT_IN_TAB_DEFINITIONS.find(
      (definition) => definition.label.toLowerCase() === normalizedLabel,
    )?.id ?? null
  )
}

export function getSearchTermFromLocation(locationHref: string) {
  try {
    return new URL(locationHref).searchParams.get("q")?.trim() ?? ""
  } catch {
    return ""
  }
}

export function hasSearchPlaceholder(urlTemplate: string) {
  return String(urlTemplate || "").includes(SEARCH_PLACEHOLDER)
}

export function isSafeTemplateUrl(urlTemplate: string) {
  if (!hasSearchPlaceholder(urlTemplate)) {
    return false
  }

  try {
    const url = new URL(
      String(urlTemplate).replaceAll(SEARCH_PLACEHOLDER, SAMPLE_SEARCH),
    )

    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function buildTargetUrl(urlTemplate: string, searchTerm: string) {
  const trimmedTemplate = String(urlTemplate || "").trim()

  if (!trimmedTemplate || !isSafeTemplateUrl(trimmedTemplate)) {
    return null
  }

  return trimmedTemplate.replaceAll(
    SEARCH_PLACEHOLDER,
    encodeURIComponent(String(searchTerm || "").trim()),
  )
}

function normalizeBuiltInTab(
  entry: Partial<BuiltInTab> | null | undefined,
  index: number,
) {
  const definition = getBuiltInTabDefinition(entry?.id || "")

  if (!definition) {
    return null
  }

  return {
    id: definition.id,
    label: definition.label,
    enabled: Boolean(entry?.enabled),
    order: normalizeOrder(entry?.order, index),
    tabKind: "builtIn" as const,
    urlTemplate: String(entry?.urlTemplate || "").trim(),
  }
}

function normalizeCustomTab(
  entry: Partial<CustomTab> | null | undefined,
  index: number,
) {
  const label = String(entry?.label || "").trim()
  const template = String(entry?.urlTemplate || "").trim()
  const generatedId = slugifyLabel(label) || `custom-${index + 1}`

  // Don't filter out empty tabs - allow them to be saved so users can
  // fill them in later. Only enforce label requirement for the validation.
  return {
    id: String(entry?.id || generatedId),
    label,
    enabled: entry?.enabled !== false,
    order: normalizeOrder(entry?.order, index),
    tabKind: "custom" as const,
    urlTemplate: template,
  }
}

export function normalizeSettings(
  candidate: SettingsInput | null | undefined,
): Settings {
  const defaults = createDefaultSettings()
  const input = candidate || {}
  const builtInById = new Map(
    (Array.isArray(input.builtInTabs) ? input.builtInTabs : []).map((entry) => [
      entry?.id,
      entry,
    ]),
  )

  const builtInTabs = BUILT_IN_TAB_DEFINITIONS.map((definition, index) => {
    const merged = {
      ...defaults.builtInTabs[index],
      ...builtInById.get(definition.id),
    }

    return normalizeBuiltInTab(merged, index)
  }).filter(isBuiltInTab)

  const customTabs = (Array.isArray(input.customTabs) ? input.customTabs : [])
    .map((entry, index) => normalizeCustomTab(entry, index))
    .filter(isCustomTab)
    .sort((left, right) => left.order - right.order)

  return { builtInTabs, customTabs }
}

export function getSettingsValidationErrors(
  candidate: SettingsInput | null | undefined,
) {
  const settings = normalizeSettings(candidate)
  const errors: string[] = []

  for (const tab of settings.builtInTabs) {
    if (!tab.enabled) {
      continue
    }

    if (!tab.urlTemplate) {
      errors.push(`${tab.label}: URL required when enabled.`)
      continue
    }

    if (!hasSearchPlaceholder(tab.urlTemplate)) {
      errors.push(`${tab.label}: URL must include ${SEARCH_PLACEHOLDER}.`)
      continue
    }

    if (!isSafeTemplateUrl(tab.urlTemplate)) {
      errors.push(`${tab.label}: URL must start with http:// or https://.`)
    }
  }

  for (const tab of settings.customTabs) {
    if (!tab.label) {
      errors.push("Custom tabs need a label.")
      continue
    }

    if (!tab.enabled) {
      continue
    }

    if (!tab.urlTemplate) {
      errors.push(`${tab.label}: URL required when enabled.`)
      continue
    }

    if (!hasSearchPlaceholder(tab.urlTemplate)) {
      errors.push(`${tab.label}: URL must include ${SEARCH_PLACEHOLDER}.`)
      continue
    }

    if (!isSafeTemplateUrl(tab.urlTemplate)) {
      errors.push(`${tab.label}: URL must start with http:// or https://.`)
    }
  }

  return errors
}
