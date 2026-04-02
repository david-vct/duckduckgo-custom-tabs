export interface FocusState {
  key: string | null
  selectionStart: number | null
  selectionEnd: number | null
}

export function captureFocusState(root: HTMLElement) {
  const activeElement = document.activeElement

  if (
    !(activeElement instanceof HTMLElement) ||
    !root.contains(activeElement)
  ) {
    return null
  }

  const inputElement =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement
      ? activeElement
      : null

  return {
    key: activeElement.getAttribute("data-focus-key"),
    selectionStart: inputElement ? inputElement.selectionStart : null,
    selectionEnd: inputElement ? inputElement.selectionEnd : null,
  } satisfies FocusState
}

export function restoreFocusState(
  root: HTMLElement,
  focusState: FocusState | null,
) {
  if (!focusState?.key) {
    return
  }

  const nextActiveElement = root.querySelector<HTMLElement>(
    `[data-focus-key="${focusState.key}"]`,
  )

  if (!nextActiveElement) {
    return
  }

  nextActiveElement.focus()

  if (
    (nextActiveElement instanceof HTMLInputElement ||
      nextActiveElement instanceof HTMLTextAreaElement) &&
    typeof focusState.selectionStart === "number" &&
    typeof focusState.selectionEnd === "number"
  ) {
    nextActiveElement.setSelectionRange(
      focusState.selectionStart,
      focusState.selectionEnd,
    )
  }
}
