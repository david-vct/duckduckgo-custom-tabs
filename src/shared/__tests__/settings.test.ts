import assert from "node:assert/strict"
import test from "node:test"
import {
  BUILT_IN_TAB_PRESETS,
  CUSTOM_TAB_PRESETS,
  SETTINGS_STORAGE_KEY,
  SEARCH_PLACEHOLDER,
  buildTargetUrl,
  createDefaultSettings,
  detectBuiltInTabId,
  getSettingsValidationErrors,
  getSearchTermFromLocation,
  normalizeSettings,
} from "../domain/settings.ts"

test("settings model normalizes and validates URLs", () => {
  const normalized = normalizeSettings({
    builtInTabs: [
      {
        id: "maps",
        enabled: true,
        urlTemplate: `https://www.google.com/maps/search/${SEARCH_PLACEHOLDER}`,
      },
    ],
    customTabs: [
      {
        label: "Wikipedia",
        enabled: true,
        order: 1,
        urlTemplate:
          "https://en.wikipedia.org/wiki/Special:Search?search={search}",
      },
    ],
  })

  assert.equal(
    normalized.builtInTabs.find((entry) => entry?.id === "maps")?.enabled,
    true,
  )
  assert.equal(normalized.customTabs.length, 1)
  assert.equal(
    buildTargetUrl(
      `https://www.google.com/maps/search/${SEARCH_PLACEHOLDER}`,
      "toulouse france",
    ),
    "https://www.google.com/maps/search/toulouse%20france",
  )
  assert.equal(
    getSettingsValidationErrors({
      customTabs: [
        { label: "Broken", enabled: true, urlTemplate: "javascript:1" },
      ],
    }).length,
    1,
  )
})

test("settings normalization preserves custom built-in URL selection state", () => {
  const normalized = normalizeSettings({
    builtInTabs: [
      {
        id: "images",
        enabled: true,
        urlTemplate: "https://example.com/search?q={search}",
        selectedPresetUrl: "__custom__",
      },
    ],
  })

  assert.equal(
    normalized.builtInTabs.find((entry) => entry.id === "images")
      ?.selectedPresetUrl,
    "__custom__",
  )
})

test("settings storage key remains stable for persisted client configuration", () => {
  assert.equal(SETTINGS_STORAGE_KEY, "duckduckgoCustomTabs.settings")
})

test("settings normalization reads legacy persisted payloads without losing user configuration", () => {
  const legacyPersistedPayload = {
    builtInTabs: [
      {
        id: "images",
        enabled: true,
        order: 0,
        urlTemplate: "https://legacy.example/images?q={search}",
      },
      {
        id: "maps",
        enabled: true,
        order: 1,
        urlTemplate: "https://legacy.example/maps?q={search}",
        selectedPresetUrl: "https://legacy.example/maps?q={search}",
      },
    ],
    customTabs: [
      {
        id: "wikipedia",
        label: "Wikipedia",
        enabled: true,
        order: 0,
        urlTemplate:
          "https://en.wikipedia.org/wiki/Special:Search?search={search}",
      },
      {
        id: "github",
        label: "GitHub",
        enabled: false,
        order: 1,
        urlTemplate: "https://github.com/search?q={search}",
      },
    ],
  }

  const normalized = normalizeSettings(legacyPersistedPayload)

  assert.equal(normalized.builtInTabs.length, 5)
  assert.deepEqual(
    normalized.builtInTabs.find((entry) => entry.id === "images"),
    {
      id: "images",
      label: "Images",
      enabled: true,
      order: 0,
      tabKind: "builtIn",
      urlTemplate: "https://legacy.example/images?q={search}",
      selectedPresetUrl: undefined,
    },
  )
  assert.deepEqual(
    normalized.builtInTabs.find((entry) => entry.id === "maps"),
    {
      id: "maps",
      label: "Maps",
      enabled: true,
      order: 1,
      tabKind: "builtIn",
      urlTemplate: "https://legacy.example/maps?q={search}",
      selectedPresetUrl: "https://legacy.example/maps?q={search}",
    },
  )
  assert.deepEqual(
    normalized.builtInTabs
      .filter((entry) => !["images", "maps"].includes(entry.id))
      .map((entry) => ({
        id: entry.id,
        enabled: entry.enabled,
        urlTemplate: entry.urlTemplate,
      })),
    [
      { id: "videos", enabled: false, urlTemplate: "" },
      { id: "news", enabled: false, urlTemplate: "" },
      { id: "shopping", enabled: false, urlTemplate: "" },
    ],
  )
  assert.deepEqual(normalized.customTabs, [
    {
      id: "wikipedia",
      label: "Wikipedia",
      enabled: true,
      order: 0,
      tabKind: "custom",
      urlTemplate:
        "https://en.wikipedia.org/wiki/Special:Search?search={search}",
    },
    {
      id: "github",
      label: "GitHub",
      enabled: false,
      order: 1,
      tabKind: "custom",
      urlTemplate: "https://github.com/search?q={search}",
    },
  ])
})

test("settings normalization ignores unknown persisted fields and keeps supported ones", () => {
  const normalized = normalizeSettings({
    builtInTabs: [
      {
        id: "videos",
        enabled: true,
        order: 12,
        urlTemplate: " https://videos.example/search?q={search} ",
        selectedPresetUrl: "__custom__",
        legacyField: "ignored",
      },
      {
        id: "obsolete-tab",
        enabled: true,
        order: 99,
        urlTemplate: "https://obsolete.example/search?q={search}",
      },
    ],
    customTabs: [
      {
        label: "  Stack Overflow  ",
        enabled: true,
        order: 7,
        urlTemplate: " https://stackoverflow.com/search?q={search} ",
        icon: "ignored",
      },
    ],
    deprecatedRootFlag: true,
  } as never)

  assert.deepEqual(
    normalized.builtInTabs.find((entry) => entry.id === "videos"),
    {
      id: "videos",
      label: "Videos",
      enabled: true,
      order: 12,
      tabKind: "builtIn",
      urlTemplate: "https://videos.example/search?q={search}",
      selectedPresetUrl: "__custom__",
    },
  )
  assert.equal(
    normalized.builtInTabs.some((entry) => entry.id === "obsolete-tab"),
    false,
  )
  assert.deepEqual(normalized.customTabs, [
    {
      id: "stack-overflow",
      label: "Stack Overflow",
      enabled: true,
      order: 7,
      tabKind: "custom",
      urlTemplate: "https://stackoverflow.com/search?q={search}",
    },
  ])
})

test("default settings reset built-in tabs to no redirection state", () => {
  const defaults = createDefaultSettings()
  const imagesTab = defaults.builtInTabs.find((entry) => entry.id === "images")

  assert.equal(imagesTab?.enabled, false)
  assert.equal(imagesTab?.urlTemplate, "")
  assert.equal(imagesTab?.selectedPresetUrl, undefined)
})

test("default settings expose every built-in DuckDuckGo tab", () => {
  const defaults = createDefaultSettings()

  assert.deepEqual(
    defaults.builtInTabs.map((tab) => tab.id),
    ["images", "maps", "videos", "news", "shopping"],
  )
  assert.equal(defaults.customTabs.length, 0)
})

test("built-in presets ship only with safe URL templates", () => {
  assert.ok(BUILT_IN_TAB_PRESETS.length > 0)

  for (const preset of BUILT_IN_TAB_PRESETS) {
    assert.equal(
      preset.urlTemplate.includes(SEARCH_PLACEHOLDER),
      true,
      `${preset.label} must include ${SEARCH_PLACEHOLDER}`,
    )

    const targetUrl = buildTargetUrl(preset.urlTemplate, "paris france")

    assert.notEqual(targetUrl, null, `${preset.label} should build a URL`)
    assert.match(targetUrl || "", /^https?:\/\//)
    assert.match(
      targetUrl || "",
      /paris(?:%20|\+)france/,
      `${preset.label} should include the encoded search term`,
    )
  }
})

test("custom tab presets ship only with safe URL templates", () => {
  assert.ok(CUSTOM_TAB_PRESETS.length >= 4)

  for (const preset of CUSTOM_TAB_PRESETS) {
    assert.equal(
      preset.urlTemplate.includes(SEARCH_PLACEHOLDER),
      true,
      `${preset.label} must include ${SEARCH_PLACEHOLDER}`,
    )

    const targetUrl = buildTargetUrl(preset.urlTemplate, "paris france")

    assert.notEqual(targetUrl, null, `${preset.label} should build a URL`)
    assert.match(targetUrl || "", /^https?:\/\//)
    assert.match(
      targetUrl || "",
      /paris(?:%20|\+)france/,
      `${preset.label} should include the encoded search term`,
    )
  }
})

test("built-in DuckDuckGo tabs are detected from current SERP links", () => {
  assert.equal(
    detectBuiltInTabId("/?q=toulouse&ia=images&iax=images"),
    "images",
  )
  assert.equal(
    detectBuiltInTabId("/?q=toulouse&ia=videos&iax=videos"),
    "videos",
  )
  assert.equal(detectBuiltInTabId("/?q=toulouse&ia=news&iar=news"), "news")
  assert.equal(detectBuiltInTabId("/?q=toulouse&iaxm=maps"), "maps")
  assert.equal(
    detectBuiltInTabId("/?q=toulouse&ia=shopping&iax=shopping"),
    "shopping",
  )
  assert.equal(
    detectBuiltInTabId("https://duckduckgo.com/?q=toulouse&ia=chat"),
    null,
  )
})

test("search term is extracted from DuckDuckGo URLs", () => {
  assert.equal(
    getSearchTermFromLocation("https://duckduckgo.com/?q=toulouse&ia=web"),
    "toulouse",
  )
  assert.equal(
    getSearchTermFromLocation("https://duckduckgo.com/?ia=images"),
    "",
  )
})
