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
const TAB_LIST_SELECTOR = "ul, ol"
const PRIMARY_HOSTNAME = "duckduckgo.com"

function isDuckDuckGoPage(locationObject = window.location) {
  return locationObject?.hostname === PRIMARY_HOSTNAME
}

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

function getTabListCandidates(nav) {
  const directLists = Array.from(nav.children).filter((child) =>
    child.matches?.(TAB_LIST_SELECTOR),
  )

  if (directLists.length > 0) {
    return directLists
  }

  return Array.from(nav.querySelectorAll(TAB_LIST_SELECTOR))
}

function isPrimaryTabCandidate(anchor) {
  try {
    const url = new URL(anchor.getAttribute("href") || "", window.location.href)

    if (url.hostname !== PRIMARY_HOSTNAME) {
      return false
    }

    return url.pathname === "/"
  } catch {
    return false
  }
}

function collectTabAnchors(listElement) {
  const anchorsById = new Map()
  const ids = new Set()

  for (const anchor of listElement.querySelectorAll("a[href]")) {
    if (!isPrimaryTabCandidate(anchor)) {
      continue
    }

    const tabId = detectBuiltInTabId(
      anchor.getAttribute("href"),
      anchor.textContent,
    )

    if (!tabId) {
      continue
    }

    const anchors = anchorsById.get(tabId) || []
    anchors.push(anchor)
    anchorsById.set(tabId, anchors)
    ids.add(tabId)
  }

  return { anchorsById, ids }
}

function getListPriority(record) {
  const hasAll = record.ids.has("images") || record.ids.has("videos")
  const hasMore = Boolean(record.moreItem)

  return Number(hasAll) * 100 + Number(hasMore) * 10 + record.ids.size
}

function findPrimaryTabGroup() {
  const candidates = []

  for (const nav of document.querySelectorAll("nav")) {
    for (const list of getTabListCandidates(nav)) {
      const { anchorsById, ids } = collectTabAnchors(list)

      if (ids.size === 0) {
        continue
      }

      const moreItem = Array.from(list.children).find((child) =>
        /more/i.test(child.textContent || ""),
      )

      candidates.push({
        nav,
        container: list,
        anchorsById,
        ids,
        moreItem,
      })
    }
  }

  return (
    candidates.sort((left, right) => {
      return getListPriority(right) - getListPriority(left)
    })[0] ?? null
  )
}

function restoreOriginalHref(anchor) {
  const originalHref = anchor.getAttribute(ORIGINAL_HREF_ATTR)

  if (!originalHref) {
    return
  }

  anchor.setAttribute("href", originalHref)
  anchor.removeAttribute("rel")
  anchor.removeAttribute(ORIGINAL_HREF_ATTR)
}

function restoreOriginalHrefs(scope = document) {
  for (const anchor of scope.querySelectorAll(`[${ORIGINAL_HREF_ATTR}]`)) {
    restoreOriginalHref(anchor)
  }
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
  const referenceItem = referenceAnchor?.closest("li")

  listItem.setAttribute(INJECTED_ITEM_ATTR, "true")
  link.setAttribute(INJECTED_LINK_ATTR, "true")
  link.href = targetUrl
  link.textContent = customTab.label
  link.setAttribute("aria-label", customTab.label)
  link.setAttribute("rel", "noopener noreferrer")

  if (referenceAnchor) {
    link.className = referenceAnchor.className
    if (referenceItem) {
      listItem.className = referenceItem.className
    }
  }

  listItem.appendChild(link)
  return listItem
}

function injectCustomTabs(group, settings, searchTerm) {
  removeInjectedCustomTabs(group.container)

  const referenceAnchor = group.container.querySelector("a[href]")
  const customTabs = [...settings.customTabs]
    .filter((tab) => tab.enabled)
    .sort((left, right) => left.order - right.order)

  if (customTabs.length === 0) {
    return
  }

  const insertionAnchor = group.moreItem

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

function stopManagedNavigation(event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function resolveManagedNavigation(anchor, settings, searchTerm) {
  if (anchor.hasAttribute(INJECTED_LINK_ATTR)) {
    return anchor.href
  }

  const originalHref = anchor.getAttribute(ORIGINAL_HREF_ATTR)
  const tabId = detectBuiltInTabId(
    originalHref || anchor.getAttribute("href"),
    anchor.textContent,
  )

  if (!tabId) {
    return null
  }

  const configuration = settings.builtInTabs.find((entry) => entry.id === tabId)

  if (!configuration?.enabled) {
    return null
  }

  return buildTargetUrl(configuration.urlTemplate, searchTerm)
}

export default function createContentApp() {
  if (!isDuckDuckGoPage()) {
    return () => {}
  }

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
      restoreOriginalHrefs(document)
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
    if (!isDuckDuckGoPage()) {
      return
    }

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

    const settings = await loadSettings()
    const targetUrl = resolveManagedNavigation(anchor, settings, searchTerm)

    if (!targetUrl) {
      return
    }

    stopManagedNavigation(event)
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
    restoreOriginalHrefs(document)
    removeInjectedCustomTabs(document)
  }

  window.__duckDuckGoCustomTabsCleanup = cleanup
  return cleanup
}
