import {
  buildTargetUrl,
  getSearchTermFromLocation,
} from "../shared/domain/settings"
import type { Settings } from "../shared/domain/types"
import { onSettingsChanged, readSettings } from "../shared/platform/storage"
import { findPrimaryTabGroup } from "./domain/tab-group-finder"
import {
  injectCustomTabs,
  removeInjectedCustomTabs,
  resolveManagedNavigation,
  restoreOriginalHrefs,
  rewriteBuiltInTabs,
  shouldProcessMutations,
} from "./domain/tab-link-rewriter"

const PRIMARY_HOSTNAME = "duckduckgo.com"

function isDuckDuckGoPage(locationObject = window.location) {
  return locationObject?.hostname === PRIMARY_HOSTNAME
}

function stopManagedNavigation(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

export default function createContentApp() {
  if (!isDuckDuckGoPage()) {
    return () => {}
  }

  if (window.__duckDuckGoCustomTabsCleanup) {
    return window.__duckDuckGoCustomTabsCleanup
  }

  let observer: MutationObserver | null = null
  let refreshTimer = 0
  let isApplying = false
  let removeSettingsListener: (() => void) | null = null
  let cachedSettings: Settings | null = null

  const loadSettings = async (force = false) => {
    if (!force && cachedSettings) {
      return cachedSettings
    }

    cachedSettings = await readSettings()
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

  const handleDocumentClick = async (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) {
      return
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    const anchor =
      event.target instanceof Element ? event.target.closest("a[href]") : null

    if (!(anchor instanceof HTMLAnchorElement)) {
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
