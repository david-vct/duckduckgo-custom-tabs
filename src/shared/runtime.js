export const isFirefoxLike =
  import.meta.env.EXTENSION_PUBLIC_BROWSER === "firefox" ||
  import.meta.env.EXTENSION_PUBLIC_BROWSER === "gecko-based"

export function getBrowserApi() {
  if (typeof globalThis.browser !== "undefined") {
    return globalThis.browser
  }

  return globalThis.chrome
}
