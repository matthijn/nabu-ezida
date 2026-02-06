type NabuSettings = {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  chatOpen: boolean;
  chatWidth: number;
  chatHeight: number;
};

const STORAGE_KEY = "nabu-settings";

const defaults: NabuSettings = {
  theme: "dark",
  sidebarOpen: true,
  chatOpen: false,
  chatWidth: 320,
  chatHeight: 600,
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
