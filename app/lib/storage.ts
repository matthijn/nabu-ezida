interface NabuSettings {
  theme: "light" | "dark"
  sidebarOpen: boolean
  docSortMode: "name" | "date"
}

const STORAGE_KEY = "nabu-settings"

const defaults: NabuSettings = {
  theme: "dark",
  sidebarOpen: true,
  docSortMode: "name",
}

function getSettings(): NabuSettings {
  if (typeof localStorage === "undefined") return defaults
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return defaults
  return { ...defaults, ...JSON.parse(stored) }
}

function setSetting<K extends keyof NabuSettings>(key: K, value: NabuSettings[K]) {
  const settings = getSettings()
  settings[key] = value
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export { getSettings, setSetting }
