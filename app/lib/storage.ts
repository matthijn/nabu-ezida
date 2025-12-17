type NabuSettings = {
  theme: "light" | "dark";
  sidebarOpen: boolean;
};

const STORAGE_KEY = "nabu-settings";

const defaults: NabuSettings = {
  theme: "dark",
  sidebarOpen: true,
};

function getSettings(): NabuSettings {
  if (typeof localStorage === "undefined") return defaults;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaults;
  return { ...defaults, ...JSON.parse(stored) };
}

function setSetting<K extends keyof NabuSettings>(key: K, value: NabuSettings[K]) {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export { getSettings, setSetting, type NabuSettings };
