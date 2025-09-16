import defaultsJson from '../config/defaults.json';
import { createStore } from './store';

export interface SettingsState {
  searchDelayMs: number;
  groupLimits: Record<string, number>;
  lineItemsContextCount: number;
}

const STORAGE_KEY = 'search-prototype.settings';
const DEFAULTS: SettingsState = normalize(defaultsJson as SettingsState);

function normalize(state: SettingsState): SettingsState {
  return {
    ...state,
    groupLimits: { ...state.groupLimits },
    lineItemsContextCount: state.lineItemsContextCount ?? 3,
  };
}

function mergeSettings(base: SettingsState, overrides?: Partial<SettingsState>): SettingsState {
  if (!overrides) {
    return normalize(base);
  }

  return {
    ...base,
    ...overrides,
    groupLimits: {
      ...base.groupLimits,
      ...(overrides.groupLimits ?? {}),
    },
  };
}

function readPersisted(): Partial<SettingsState> | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }
    return JSON.parse(raw) as Partial<SettingsState>;
  } catch (error) {
    console.warn('Failed to parse persisted settings; falling back to defaults.', error);
    return undefined;
  }
}

function persist(state: SettingsState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialState = mergeSettings(DEFAULTS, readPersisted());
const store = createStore<SettingsState>(initialState);

store.subscribe((state) => {
  persist(state);
});

export const settingsStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  update(partial: Partial<SettingsState>) {
    store.setState((prev) => mergeSettings(prev, partial));
  },
  setGroupLimit(section: string, limit: number) {
    store.setState((prev) =>
      mergeSettings(prev, {
        groupLimits: {
          ...prev.groupLimits,
          [section]: limit,
        },
      }),
    );
  },
  reset() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    store.setState(() => normalize(DEFAULTS));
  },
  get defaults() {
    return normalize(DEFAULTS);
  },
};

export type SettingsStore = typeof settingsStore;
