import defaultsJson from '../config/defaults.json';
import { createStore } from './store';

export type LineItemBehavior = 
  | 'show-matched-only'           // Option 1: Show only matched line items
  | 'show-matched-with-context-1' // Option 2a: Show matched + 1 line context
  | 'show-matched-with-context-2' // Option 2b: Show matched + 2 lines context  
  | 'show-matched-with-context-3' // Option 2c: Show matched + 3 lines context
  | 'show-matched-with-context-5' // Option 2d: Show matched + 5 lines context
  | 'show-all-always'            // Option 3: Always show all line items
  | 'hide-all-always';           // Option 4: Always hide all line items

export interface SettingsState {
  searchDelayMs: number;
  searchDelayVarianceMs: number;
  groupLimits: Record<string, number>;
  lineItemBehavior: LineItemBehavior;
  collapseIrrelevantLineItems: boolean;
  lineItemsCollapseThreshold: number;
  maxFacetValues: number;
  recentSearchesDisplayLimit: number;
  showInferredRelationships: boolean;
}

const STORAGE_KEY = 'search-prototype.settings';
const DEFAULTS: SettingsState = normalize(defaultsJson as SettingsState);

function normalize(state: SettingsState): SettingsState {
  return {
    ...state,
    groupLimits: { ...state.groupLimits },
    searchDelayVarianceMs: state.searchDelayVarianceMs ?? 10,
    lineItemBehavior: state.lineItemBehavior ?? 'show-matched-with-context-3',
    collapseIrrelevantLineItems: state.collapseIrrelevantLineItems ?? true,
    lineItemsCollapseThreshold: state.lineItemsCollapseThreshold ?? 5,
    maxFacetValues: state.maxFacetValues ?? 5,
    recentSearchesDisplayLimit: state.recentSearchesDisplayLimit ?? 5,
    showInferredRelationships: state.showInferredRelationships ?? true,
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
