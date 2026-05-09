import assert from "node:assert/strict"
import test from "node:test"

import { createDefaultSettings } from "../../shared/domain/settings.ts"
import {
  appendCustomTab,
  appendCustomTabFromPreset,
  isCustomTabPresetActive,
  removeCustomTabByUrl,
  toggleCustomTabPreset,
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
