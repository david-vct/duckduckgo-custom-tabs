import { detectBuiltInTabId } from "../../shared/domain/settings"

const TAB_LIST_SELECTOR = "ul, ol"
const PRIMARY_HOSTNAME = "duckduckgo.com"

export interface TabGroup {
  container: Element
  anchorsById: Map<string, HTMLAnchorElement[]>
  ids: Set<string>
  moreItem: Element | undefined
}

function getTabListCandidates(nav: Element) {
  const directLists = Array.from(nav.children).filter((child) =>
    child.matches?.(TAB_LIST_SELECTOR),
  )

  if (directLists.length > 0) {
    return directLists
  }

  return Array.from(nav.querySelectorAll(TAB_LIST_SELECTOR))
}

function isPrimaryTabCandidate(anchor: HTMLAnchorElement) {
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

function collectTabAnchors(listElement: Element) {
  const anchorsById = new Map<string, HTMLAnchorElement[]>()
  const ids = new Set<string>()

  for (const anchor of listElement.querySelectorAll<HTMLAnchorElement>(
    "a[href]",
  )) {
    if (!isPrimaryTabCandidate(anchor)) {
      continue
    }

    const tabId = detectBuiltInTabId(
      anchor.getAttribute("href"),
      anchor.textContent || "",
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

function getListPriority(record: TabGroup) {
  const hasAll = record.ids.has("images") || record.ids.has("videos")
  const hasMore = Boolean(record.moreItem)

  return Number(hasAll) * 100 + Number(hasMore) * 10 + record.ids.size
}

export function findPrimaryTabGroup(): TabGroup | null {
  const candidates: TabGroup[] = []

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
        container: list,
        anchorsById,
        ids,
        moreItem,
      })
    }
  }

  return (
    candidates.sort(
      (left, right) => getListPriority(right) - getListPriority(left),
    )[0] ?? null
  )
}
