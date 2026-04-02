import {
  buildTargetUrl,
  detectBuiltInTabId,
} from "../../shared/domain/settings"
import type { Settings } from "../../shared/domain/types"
import type { TabGroup } from "./tab-group-finder"

const INJECTED_ITEM_ATTR = "data-ddg-custom-tabs-item"
const INJECTED_LINK_ATTR = "data-ddg-custom-tabs-link"
const ORIGINAL_HREF_ATTR = "data-ddg-custom-tabs-original-href"

function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE
}

function isOwnedNode(node: Node) {
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

export function shouldProcessMutations(mutations: MutationRecord[]) {
  return mutations.some((mutation) => {
    const added = Array.from(mutation.addedNodes || [])
    const removed = Array.from(mutation.removedNodes || [])

    return [...added, ...removed].some((node) => !isOwnedNode(node))
  })
}

function restoreOriginalHref(anchor: HTMLAnchorElement) {
  const originalHref = anchor.getAttribute(ORIGINAL_HREF_ATTR)

  if (!originalHref) {
    return
  }

  anchor.setAttribute("href", originalHref)
  anchor.removeAttribute("rel")
  anchor.removeAttribute(ORIGINAL_HREF_ATTR)
}

export function restoreOriginalHrefs(scope: ParentNode = document) {
  for (const anchor of scope.querySelectorAll<HTMLAnchorElement>(
    `[${ORIGINAL_HREF_ATTR}]`,
  )) {
    restoreOriginalHref(anchor)
  }
}

export function rewriteBuiltInTabs(
  group: TabGroup,
  settings: Settings,
  searchTerm: string,
) {
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

export function removeInjectedCustomTabs(scope: ParentNode = document) {
  for (const node of scope.querySelectorAll(`[${INJECTED_ITEM_ATTR}]`)) {
    node.remove()
  }
}

function createCustomTabNode(
  referenceAnchor: HTMLAnchorElement | null,
  customTab: Settings["customTabs"][number],
  targetUrl: string,
) {
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

export function injectCustomTabs(
  group: TabGroup,
  settings: Settings,
  searchTerm: string,
) {
  removeInjectedCustomTabs(group.container)

  const referenceAnchor =
    group.container.querySelector<HTMLAnchorElement>("a[href]")
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

export function resolveManagedNavigation(
  anchor: HTMLAnchorElement,
  settings: Settings,
  searchTerm: string,
) {
  if (anchor.hasAttribute(INJECTED_LINK_ATTR)) {
    return anchor.href
  }

  const originalHref = anchor.getAttribute(ORIGINAL_HREF_ATTR)
  const tabId = detectBuiltInTabId(
    originalHref || anchor.getAttribute("href"),
    anchor.textContent || "",
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
