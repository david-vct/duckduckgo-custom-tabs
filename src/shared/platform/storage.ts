import { getBrowserApi, isFirefoxLike } from "./runtime"
import {
  SETTINGS_STORAGE_KEY,
  createDefaultSettings,
  getSettingsValidationErrors,
  normalizeSettings,
  type SettingsInput,
} from "../domain/settings"
import type { Settings } from "../domain/types"

const browserApi = getBrowserApi()

function normalizeStoredSettings(value: unknown) {
  return normalizeSettings((value ?? undefined) as SettingsInput | undefined)
}

export async function readSettings(): Promise<Settings> {
  if (isFirefoxLike) {
    const result = await browserApi.storage.local.get(SETTINGS_STORAGE_KEY)
    return normalizeStoredSettings(result?.[SETTINGS_STORAGE_KEY])
  }

  return new Promise<Settings>((resolve, reject) => {
    browserApi.storage.local.get(
      [SETTINGS_STORAGE_KEY],
      (result: Record<string, unknown>) => {
        const error = browserApi.runtime?.lastError

        if (error) {
          reject(new Error(error.message))
          return
        }

        resolve(normalizeStoredSettings(result?.[SETTINGS_STORAGE_KEY]))
      },
    )
  })
}

export async function writeSettings(
  candidate: SettingsInput,
): Promise<Settings> {
  const normalized = normalizeSettings(candidate)
  const errors = getSettingsValidationErrors(normalized)

  if (errors.length > 0) {
    throw new Error(errors[0])
  }

  if (isFirefoxLike) {
    await browserApi.storage.local.set({ [SETTINGS_STORAGE_KEY]: normalized })
    return normalized
  }

  return new Promise<Settings>((resolve, reject) => {
    browserApi.storage.local.set({ [SETTINGS_STORAGE_KEY]: normalized }, () => {
      const error = browserApi.runtime?.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(normalized)
    })
  })
}

export function resetSettings(): Promise<Settings> {
  return writeSettings(createDefaultSettings())
}

export function onSettingsChanged(listener: (settings: Settings) => void) {
  const handleChange = (
    changes: Record<string, BrowserStorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local" || !changes?.[SETTINGS_STORAGE_KEY]) {
      return
    }

    listener(normalizeStoredSettings(changes[SETTINGS_STORAGE_KEY].newValue))
  }

  browserApi.storage.onChanged.addListener(handleChange)

  return () => {
    browserApi.storage.onChanged.removeListener(handleChange)
  }
}
