import { FacetKey, FacetSelectionState, ScreenRoute, SearchResponse } from '../types';
import { createStore } from './store';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  route: ScreenRoute;
  searchQuery: string;
  lastSubmittedQuery: string;
  facetSelections: FacetSelectionState;
  recentResponse: SearchResponse | null;
  searchStatus: SearchStatus;
  dialogOpen: boolean;
  errorMessage?: string;
}

const initialState: AppState = {
  route: 'home',
  searchQuery: '',
  lastSubmittedQuery: '',
  facetSelections: {},
  recentResponse: null,
  searchStatus: 'idle',
  dialogOpen: false,
  errorMessage: undefined,
};

function cloneSelections(selections: FacetSelectionState): FacetSelectionState {
  const next: FacetSelectionState = {};
  for (const key of Object.keys(selections) as FacetKey[]) {
    const values = selections[key];
    if (values && values.size > 0) {
      next[key] = new Set(values);
    }
  }
  return next;
}

const store = createStore<AppState>(initialState);

export const appState = {
  getState: store.getState,
  subscribe: store.subscribe,
  setRoute(route: ScreenRoute) {
    store.setState({ route });
  },
  setSearchQuery(searchQuery: string) {
    store.setState({ searchQuery });
  },
  setDialogOpen(dialogOpen: boolean) {
    store.setState({ dialogOpen });
  },
  setStatus(status: SearchStatus, errorMessage?: string) {
    store.setState({ searchStatus: status, errorMessage });
  },
  setResponse(response: SearchResponse | null) {
    store.setState({ recentResponse: response });
  },
  setLastSubmittedQuery(query: string) {
    store.setState({ lastSubmittedQuery: query });
  },
  clearFacets() {
    store.setState({ facetSelections: {} });
  },
  toggleFacet(key: FacetKey, value: string) {
    store.setState((prev) => {
      const selections = cloneSelections(prev.facetSelections);
      const current = selections[key] ?? new Set<string>();

      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }

      if (current.size === 0) {
        delete selections[key];
      } else {
        selections[key] = current;
      }

      return {
        ...prev,
        facetSelections: selections,
      };
    });
  },
  replaceFacets(nextSelections: FacetSelectionState) {
    const clone = cloneSelections(nextSelections);
    store.setState({ facetSelections: clone });
  },
  reset() {
    store.setState(initialState);
  },
};

export type AppStateStore = typeof appState;
