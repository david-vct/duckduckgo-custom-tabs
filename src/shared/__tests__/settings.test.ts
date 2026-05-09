import assert from "node:assert/strict"
import test from "node:test"
import {
  BUILT_IN_TAB_PRESETS,
  CUSTOM_TAB_PRESETS,
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
