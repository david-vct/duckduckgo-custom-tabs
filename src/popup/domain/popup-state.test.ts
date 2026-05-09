import assert from "node:assert/strict"
import test from "node:test"

import { createDefaultSettings } from "../../shared/domain/settings.ts"
import {
  appendCustomTab,
  appendCustomTabFromPreset,
  isCustomTabPresetActive,
  removeCustomTabByUrl,
  selectBuiltInCustom,
  selectBuiltInPreset,
  shouldShowBuiltInCustomUrl,
  toggleCustomTabPreset,
  updateBuiltInTab,
} from "./popup-state.ts"

test("appendCustomTab adds a blank disabled custom tab", () => {
  const settings = createDefaultSettings()

  appendCustomTab(settings)

  assert.equal(settings.customTabs.length, 1)
  assert.equal(settings.customTabs[0]?.label, "New Tab")
  assert.equal(settings.customTabs[0]?.urlTemplate, "")
  assert.equal(settings.customTabs[0]?.enabled, false)
  assert.equal(settings.customTabs[0]?.order, 0)
})

test("appendCustomTabFromPreset adds an enabled prefilled custom tab", () => {
  const settings = createDefaultSettings()

  const didAppend = appendCustomTabFromPreset(settings, {
    label: "Wikipedia",
    urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  })

  assert.equal(didAppend, true)
  assert.equal(settings.customTabs.length, 1)
  assert.equal(settings.customTabs[0]?.label, "Wikipedia")
  assert.equal(
    settings.customTabs[0]?.urlTemplate,
    "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  )
  assert.equal(settings.customTabs[0]?.enabled, true)
  assert.equal(settings.customTabs[0]?.order, 0)
})

test("appendCustomTabFromPreset ignores duplicate preset URLs", () => {
  const settings = createDefaultSettings()

  const firstAppend = appendCustomTabFromPreset(settings, {
    label: "Wikipedia",
    urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  })

  const secondAppend = appendCustomTabFromPreset(settings, {
    label: "Wikipedia Again",
    urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  })

  assert.equal(firstAppend, true)
  assert.equal(secondAppend, false)
  assert.equal(settings.customTabs.length, 1)
  assert.equal(settings.customTabs[0]?.label, "Wikipedia")
})

test("isCustomTabPresetActive derives active preset from custom tabs", () => {
  const settings = createDefaultSettings()

  appendCustomTabFromPreset(settings, {
    label: "Wikipedia",
    urlTemplate: " https://en.wikipedia.org/wiki/Special:Search?search={search} ",
  })

  assert.equal(
    isCustomTabPresetActive(
      settings,
      "https://en.wikipedia.org/wiki/Special:Search?search={search}",
    ),
    true,
  )
})

test("removeCustomTabByUrl removes one occurrence and reindexes order", () => {
  const settings = createDefaultSettings()

  settings.customTabs = [
    {
      id: "custom-1",
      label: "Wikipedia A",
      enabled: true,
      order: 0,
      tabKind: "custom",
      urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
    },
    {
      id: "custom-2",
      label: "Wikipedia B",
      enabled: true,
      order: 1,
      tabKind: "custom",
      urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
    },
    {
      id: "custom-3",
      label: "GitHub",
      enabled: true,
      order: 2,
      tabKind: "custom",
      urlTemplate: "https://github.com/search?q={search}",
    },
  ]

  const didRemove = removeCustomTabByUrl(
    settings,
    "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  )

  assert.equal(didRemove, true)
  assert.equal(settings.customTabs.length, 2)
  assert.deepEqual(
    settings.customTabs.map((tab) => ({ id: tab.id, order: tab.order })),
    [
      { id: "custom-2", order: 0 },
      { id: "custom-3", order: 1 },
    ],
  )
})

test("toggleCustomTabPreset removes active preset tab on click", () => {
  const settings = createDefaultSettings()
  const preset = {
    label: "Wikipedia",
    urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  }

  appendCustomTabFromPreset(settings, preset)

  const action = toggleCustomTabPreset(settings, preset)

  assert.equal(action, "removed")
  assert.equal(settings.customTabs.length, 0)
})

test("toggleCustomTabPreset adds inactive preset tab on click", () => {
  const settings = createDefaultSettings()
  const preset = {
    label: "Wikipedia",
    urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={search}",
  }

  const action = toggleCustomTabPreset(settings, preset)

  assert.equal(action, "added")
  assert.equal(settings.customTabs.length, 1)
  assert.equal(settings.customTabs[0]?.label, "Wikipedia")
})

test("selectBuiltInCustom keeps existing URL and reveals custom input", () => {
  const settings = createDefaultSettings()
  settings.builtInTabs[0]!.urlTemplate = "https://example.com/search?q={search}"

  selectBuiltInCustom(settings, 0)

  assert.equal(
    settings.builtInTabs[0]?.urlTemplate,
    "https://example.com/search?q={search}",
  )
  assert.equal(shouldShowBuiltInCustomUrl(settings.builtInTabs[0]!), true)
})

test("selectBuiltInCustom toggles off and restores built-in defaults", () => {
  const settings = createDefaultSettings()

  selectBuiltInPreset(
    settings,
    0,
    "https://www.google.com/search?tbm=isch&q={search}",
  )
  selectBuiltInCustom(settings, 0)
  selectBuiltInCustom(settings, 0)

  assert.equal(settings.builtInTabs[0]?.enabled, false)
  assert.equal(settings.builtInTabs[0]?.urlTemplate, "")
  assert.equal(settings.builtInTabs[0]?.selectedPresetUrl, undefined)
  assert.equal(shouldShowBuiltInCustomUrl(settings.builtInTabs[0]!), false)
})

test("selectBuiltInCustom preserves legacy custom URL before explicit toggle-off", () => {
  const settings = createDefaultSettings()
  settings.builtInTabs[0] = {
    ...settings.builtInTabs[0]!,
    enabled: true,
    urlTemplate: "https://legacy.example/search?q={search}",
    selectedPresetUrl: undefined,
  }

  selectBuiltInCustom(settings, 0)

  assert.equal(settings.builtInTabs[0]?.enabled, true)
  assert.equal(
    settings.builtInTabs[0]?.urlTemplate,
    "https://legacy.example/search?q={search}",
  )
  assert.equal(settings.builtInTabs[0]?.selectedPresetUrl, "__custom__")
  assert.equal(shouldShowBuiltInCustomUrl(settings.builtInTabs[0]!), true)
})

test("updateBuiltInTab manual edit marks built-in tab as custom", () => {
  const settings = createDefaultSettings()

  updateBuiltInTab(settings, 0, "https://example.com/search?q={search}", true)

  assert.equal(shouldShowBuiltInCustomUrl(settings.builtInTabs[0]!), true)
  assert.equal(settings.builtInTabs[0]?.enabled, true)
})

test("selectBuiltInPreset hides custom input again", () => {
  const settings = createDefaultSettings()

  updateBuiltInTab(settings, 0, "https://example.com/search?q={search}", true)
  selectBuiltInPreset(
    settings,
    0,
    "https://www.google.com/search?tbm=isch&q={search}",
  )

  assert.equal(shouldShowBuiltInCustomUrl(settings.builtInTabs[0]!), false)
  assert.equal(
    settings.builtInTabs[0]?.selectedPresetUrl,
    "https://www.google.com/search?tbm=isch&q={search}",
  )
})
