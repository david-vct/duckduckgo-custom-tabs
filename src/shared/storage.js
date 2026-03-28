import { getBrowserApi, isFirefoxLike } from "./runtime.js"
import {
  SETTINGS_STORAGE_KEY,
  createDefaultSettings,
  getSettingsValidationErrors,
  normalizeSettings,
} from "./settings.js"

const browserApi = getBrowserApi()

export async function readSettings() {
  if (isFirefoxLike) {
    const result = await browserApi.storage.local.get(SETTINGS_STORAGE_KEY)
    return normalizeSettings(result?.[SETTINGS_STORAGE_KEY])
  }

  return new Promise((resolve, reject) => {
    browserApi.storage.local.get([SETTINGS_STORAGE_KEY], (result) => {
      const error = browserApi.runtime?.lastError

      if (error) {
        reject(new Error(error.message))
        return
      }

      resolve(normalizeSettings(result?.[SETTINGS_STORAGE_KEY]))
    })
  })
}

export async function writeSettings(candidate) {
  const normalized = normalizeSettings(candidate)
  const errors = getSettingsValidationErrors(normalized)

  if (errors.length > 0) {
    throw new Error(errors[0])
  }

  if (isFirefoxLike) {
    await browserApi.storage.local.set({ [SETTINGS_STORAGE_KEY]: normalized })
    return normalized
  }

  return new Promise((resolve, reject) => {
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

export function resetSettings() {
  return writeSettings(createDefaultSettings())
}

export function onSettingsChanged(listener) {
  const handleChange = (changes, areaName) => {
    if (areaName !== "local" || !changes?.[SETTINGS_STORAGE_KEY]) {
      return
    }

    listener(normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue))
  }

  browserApi.storage.onChanged.addListener(handleChange)

  return () => {
    browserApi.storage.onChanged.removeListener(handleChange)
  }
}
