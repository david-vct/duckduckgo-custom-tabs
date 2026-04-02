declare global {
  type CleanupFn = () => void

  interface ImportMetaEnv {
    readonly EXTENSION_PUBLIC_BROWSER?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    __duckDuckGoCustomTabsCleanup?: CleanupFn
  }

  interface BrowserRuntimeApi {
    lastError?: { message?: string }
  }

  interface BrowserStorageChange {
    oldValue?: unknown
    newValue?: unknown
  }

  interface BrowserStorageArea {
    get(keys: string): Promise<Record<string, unknown>>
    get(
      keys: string[],
      callback: (items: Record<string, unknown>) => void,
    ): void
    set(items: Record<string, unknown>): Promise<void>
    set(items: Record<string, unknown>, callback: () => void): void
  }

  interface BrowserStorageApi {
    local: BrowserStorageArea
    onChanged: {
      addListener(
        listener: (
          changes: Record<string, BrowserStorageChange>,
          areaName: string,
        ) => void,
      ): void
      removeListener(
        listener: (
          changes: Record<string, BrowserStorageChange>,
          areaName: string,
        ) => void,
      ): void
    }
  }

  interface BrowserApi {
    runtime?: BrowserRuntimeApi
    storage: BrowserStorageApi
  }

  var browser: BrowserApi | undefined
  var chrome: BrowserApi
}

export {}
