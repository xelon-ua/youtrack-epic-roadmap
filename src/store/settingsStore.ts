import { create } from 'zustand';
import { loadSettings, saveSettings, type Settings } from '../auth/storage';

interface SettingsState {
  settings: Settings;
  update(patch: Partial<Settings>): void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: loadSettings(),
  update(patch) {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    set({ settings });
  },
}));
