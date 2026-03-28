export const SETTINGS_STORAGE_KEY = "duckduckgoCustomTabs.settings"
export const SEARCH_PLACEHOLDER = "{search}"

export const BUILT_IN_TAB_DEFINITIONS = [
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

const SAMPLE_SEARCH = "duckduckgo custom tabs"

function slugifyLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normalizeOrder(value, fallback) {
  const numeric = Number.parseInt(value, 10)
  return Number.isFinite(numeric) ? numeric : fallback
}

function createDefaultBuiltInTab(definition, order) {
  return {
    id: definition.id,
    label: definition.label,
    enabled: false,
    order,
    tabKind: "builtIn",
    urlTemplate: "",
  }
}

export function createDefaultSettings() {
  return {
    builtInTabs: BUILT_IN_TAB_DEFINITIONS.map((definition, index) =>
      createDefaultBuiltInTab(definition, index),
    ),
    customTabs: [],
  }
}

export function getBuiltInTabDefinition(tabId) {
  return BUILT_IN_TAB_DEFINITIONS.find((definition) => definition.id === tabId)
}

export function detectBuiltInTabId(href, label = "") {
  let url

  try {
    url = new URL(href, "https://duckduckgo.com")
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

export function getSearchTermFromLocation(locationHref) {
  try {
    return new URL(locationHref).searchParams.get("q")?.trim() ?? ""
  } catch {
    return ""
  }
}

export function hasSearchPlaceholder(urlTemplate) {
  return String(urlTemplate || "").includes(SEARCH_PLACEHOLDER)
}

export function isSafeTemplateUrl(urlTemplate) {
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

export function buildTargetUrl(urlTemplate, searchTerm) {
  const trimmedTemplate = String(urlTemplate || "").trim()

  if (!trimmedTemplate || !isSafeTemplateUrl(trimmedTemplate)) {
    return null
  }

  return trimmedTemplate.replaceAll(
    SEARCH_PLACEHOLDER,
    encodeURIComponent(String(searchTerm || "").trim()),
  )
}

function normalizeBuiltInTab(entry, index) {
  const definition = getBuiltInTabDefinition(entry?.id)

  if (!definition) {
    return null
  }

  return {
    id: definition.id,
    label: definition.label,
    enabled: Boolean(entry?.enabled),
    order: normalizeOrder(entry?.order, index),
    tabKind: "builtIn",
    urlTemplate: String(entry?.urlTemplate || "").trim(),
  }
}

function normalizeCustomTab(entry, index) {
  const label = String(entry?.label || "").trim()
  const template = String(entry?.urlTemplate || "").trim()
  const generatedId = slugifyLabel(label) || `custom-${index + 1}`

  if (!label && !template) {
    return null
  }

  return {
    id: String(entry?.id || generatedId),
    label,
    enabled: entry?.enabled !== false,
    order: normalizeOrder(entry?.order, index),
    tabKind: "custom",
    urlTemplate: template,
  }
}

export function normalizeSettings(candidate) {
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
  }).filter(Boolean)

  const customTabs = (Array.isArray(input.customTabs) ? input.customTabs : [])
    .map((entry, index) => normalizeCustomTab(entry, index))
    .filter(Boolean)
    .sort((left, right) => left.order - right.order)

  return { builtInTabs, customTabs }
}

export function getSettingsValidationErrors(candidate) {
  const settings = normalizeSettings(candidate)
  const errors = []

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
