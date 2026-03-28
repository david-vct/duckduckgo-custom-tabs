import {
  buildTargetUrl,
  detectBuiltInTabId,
  getSearchTermFromLocation,
  normalizeSettings,
} from "../shared/settings.js"
import { onSettingsChanged, readSettings } from "../shared/storage.js"

const INJECTED_ITEM_ATTR = "data-ddg-custom-tabs-item"
const INJECTED_LINK_ATTR = "data-ddg-custom-tabs-link"
const ORIGINAL_HREF_ATTR = "data-ddg-custom-tabs-original-href"

function isElementNode(node) {
  return node && node.nodeType === Node.ELEMENT_NODE
}

function isOwnedNode(node) {
  if (!isElementNode(node)) {
    return false
  }

  if (
    node.hasAttribute(INJECTED_ITEM_ATTR) ||
    node.hasAttribute(INJECTED_LINK_ATTR)
  ) {
    return true
  }

  return Boolean(
    node.querySelector?.(`[${INJECTED_ITEM_ATTR}], [${INJECTED_LINK_ATTR}]`),
  )
}

function shouldProcessMutations(mutations) {
  return mutations.some((mutation) => {
    const added = Array.from(mutation.addedNodes || [])
    const removed = Array.from(mutation.removedNodes || [])

    return [...added, ...removed].some((node) => !isOwnedNode(node))
  })
}

function collectTabGroups() {
  const groups = new Map()

  for (const anchor of document.querySelectorAll("a[href]")) {
    const tabId = detectBuiltInTabId(
      anchor.getAttribute("href"),
      anchor.textContent,
    )

    if (!tabId) {
      continue
    }

    const container = anchor.closest("ul, ol, nav, div")

    if (!container) {
      continue
    }

    const record = groups.get(container) || {
      container,
      anchorsById: new Map(),
      ids: new Set(),
    }

    const group = record.anchorsById.get(tabId) || []
    group.push(anchor)
    record.anchorsById.set(tabId, group)
    record.ids.add(tabId)
    groups.set(container, record)
  }

  return [...groups.values()].sort(
    (left, right) => scoreTabGroup(right) - scoreTabGroup(left),
  )
}

function scoreTabGroup(group) {
  const containerTag = group.container.tagName.toLowerCase()
  const topOffset = Math.max(group.container.getBoundingClientRect().top, 0)
  const navBonus = group.container.closest("nav") ? 40 : 0
  const listBonus = containerTag === "ul" || containerTag === "ol" ? 20 : 0
  const anchorBonus = group.anchorsById.size * 100

  return anchorBonus + navBonus + listBonus - topOffset / 10
}

function findPrimaryTabGroup() {
  return collectTabGroups().find((group) => group.ids.size >= 3) ?? null
}

function restoreOriginalHref(anchor) {
  const originalHref = anchor.getAttribute(ORIGINAL_HREF_ATTR)

  if (!originalHref) {
    return
  }

  anchor.setAttribute("href", originalHref)
  anchor.removeAttribute("rel")
}

function rewriteBuiltInTabs(group, settings, searchTerm) {
  const settingsById = new Map(
    settings.builtInTabs.map((entry) => [entry.id, entry]),
  )

  for (const [tabId, anchors] of group.anchorsById.entries()) {
    const configuration = settingsById.get(tabId)
    const targetUrl = configuration?.enabled
      ? buildTargetUrl(configuration.urlTemplate, searchTerm)
      : null

    for (const anchor of anchors) {
      if (!anchor.hasAttribute(ORIGINAL_HREF_ATTR)) {
        anchor.setAttribute(
          ORIGINAL_HREF_ATTR,
          anchor.getAttribute("href") || "",
        )
      }

      if (!targetUrl) {
        restoreOriginalHref(anchor)
        continue
      }

      anchor.setAttribute("href", targetUrl)
      anchor.setAttribute("rel", "noopener noreferrer")
    }
  }
}

function removeInjectedCustomTabs(scope = document) {
  for (const node of scope.querySelectorAll(`[${INJECTED_ITEM_ATTR}]`)) {
    node.remove()
  }
}

function createCustomTabNode(referenceAnchor, customTab, targetUrl) {
  const listItem = document.createElement("li")
  const link = document.createElement("a")

  listItem.setAttribute(INJECTED_ITEM_ATTR, "true")
  link.setAttribute(INJECTED_LINK_ATTR, "true")
  link.href = targetUrl
  link.textContent = customTab.label
  link.setAttribute("aria-label", customTab.label)
  link.setAttribute("rel", "noopener noreferrer")

  if (referenceAnchor) {
    link.className = referenceAnchor.className
    if (referenceAnchor.parentElement) {
      listItem.className = referenceAnchor.parentElement.className
    }
  }

  listItem.appendChild(link)
  return listItem
}

function injectCustomTabs(group, settings, searchTerm) {
  removeInjectedCustomTabs(document)

  const referenceAnchor = group.container.querySelector("a[href]")
  const customTabs = [...settings.customTabs]
    .filter((tab) => tab.enabled)
    .sort((left, right) => left.order - right.order)

  if (customTabs.length === 0) {
    return
  }

  const insertionAnchor = [...group.container.children].find((child) =>
    /more/i.test(child.textContent || ""),
  )

  for (const customTab of customTabs) {
    const targetUrl = buildTargetUrl(customTab.urlTemplate, searchTerm)

    if (!targetUrl) {
      continue
    }

    const node = createCustomTabNode(referenceAnchor, customTab, targetUrl)

    if (insertionAnchor) {
      group.container.insertBefore(node, insertionAnchor)
      continue
    }

    group.container.appendChild(node)
  }
}

export default function createContentApp() {
  if (window.__duckDuckGoCustomTabsCleanup) {
    return window.__duckDuckGoCustomTabsCleanup
  }

  let observer = null
  let refreshTimer = 0
  let isApplying = false
  let removeSettingsListener = null
  let cachedSettings = null

  const loadSettings = async (force = false) => {
    if (!force && cachedSettings) {
      return cachedSettings
    }

    cachedSettings = normalizeSettings(await readSettings())
    return cachedSettings
  }

  const applySettingsToPage = async (force = false) => {
    const searchTerm = getSearchTermFromLocation(window.location.href)
    const group = findPrimaryTabGroup()

    if (!searchTerm || !group) {
      removeInjectedCustomTabs(document)
      return
    }

    try {
      isApplying = true
      const settings = await loadSettings(force)
      rewriteBuiltInTabs(group, settings, searchTerm)
      injectCustomTabs(group, settings, searchTerm)
    } catch (error) {
      console.error(error)
    } finally {
      isApplying = false
    }
  }

  const scheduleApply = (force = false) => {
    window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(() => {
      applySettingsToPage(force)
    }, 80)
  }

  const handleLocationChange = () => {
    scheduleApply(true)
  }

  const handleDocumentClick = async (event) => {
    if (event.defaultPrevented || event.button !== 0) {
      return
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    const anchor = event.target.closest?.("a[href]")

    if (!anchor) {
      return
    }

    const searchTerm = getSearchTermFromLocation(window.location.href)

    if (!searchTerm) {
      return
    }

    const tabId = detectBuiltInTabId(
      anchor.getAttribute("href"),
      anchor.textContent,
    )

    if (!tabId) {
      return
    }

    const settings = await loadSettings()
    const configuration = settings.builtInTabs.find(
      (entry) => entry.id === tabId,
    )

    if (!configuration?.enabled) {
      return
    }

    const targetUrl = buildTargetUrl(configuration.urlTemplate, searchTerm)

    if (!targetUrl) {
      return
    }

    const resolvedHref = new URL(anchor.href, window.location.href).href

    if (resolvedHref === targetUrl) {
      return
    }

    event.preventDefault()
    window.location.assign(targetUrl)
  }

  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function pushState(...args) {
    const result = originalPushState.apply(this, args)
    window.dispatchEvent(new Event("ddg-custom-tabs:locationchange"))
    return result
  }

  history.replaceState = function replaceState(...args) {
    const result = originalReplaceState.apply(this, args)
    window.dispatchEvent(new Event("ddg-custom-tabs:locationchange"))
    return result
  }

  observer = new MutationObserver((mutations) => {
    if (isApplying || !shouldProcessMutations(mutations)) {
      return
    }

    scheduleApply()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  removeSettingsListener = onSettingsChanged((settings) => {
    cachedSettings = settings
    scheduleApply(true)
  })

  window.addEventListener("popstate", handleLocationChange)
  window.addEventListener("pageshow", handleLocationChange)
  window.addEventListener(
    "ddg-custom-tabs:locationchange",
    handleLocationChange,
  )
  document.addEventListener("click", handleDocumentClick, true)

  scheduleApply(true)

  const cleanup = () => {
    window.clearTimeout(refreshTimer)
    observer?.disconnect()
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
    window.removeEventListener("popstate", handleLocationChange)
    window.removeEventListener("pageshow", handleLocationChange)
    window.removeEventListener(
      "ddg-custom-tabs:locationchange",
      handleLocationChange,
    )
    document.removeEventListener("click", handleDocumentClick, true)
    removeSettingsListener?.()
    removeInjectedCustomTabs(document)
  }

  window.__duckDuckGoCustomTabsCleanup = cleanup
  return cleanup
}
