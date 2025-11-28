import { FacetKey, FacetSelectionState, ScreenRoute, SearchResponse, SortOption } from '../types';
import { createStore } from './store';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppState {
  route: ScreenRoute;
  searchQuery: string;
  lastSubmittedQuery: string;
  isMonetary: boolean;
  facetSelections: FacetSelectionState;
  sortBy: SortOption;
  recentResponse: SearchResponse | null;
  searchStatus: SearchStatus;
  dialogOpen: boolean;
  errorMessage?: string;
}

const initialState: AppState = {
  route: 'home',
  searchQuery: '',
  lastSubmittedQuery: '',
  isMonetary: false,
  facetSelections: {},
  sortBy: 'relevance',
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
  setMonetaryMode(isMonetary: boolean) {
    store.setState({ isMonetary });
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
  setSortBy(sortBy: SortOption) {
    console.log('🔄 setSortBy called:', sortBy);
    store.setState({ sortBy });
  },
  clearFacets() {
    store.setState({ facetSelections: {} });
  },
  toggleFacet(key: FacetKey, value: string) {
    console.log('🔄 toggleFacet called:', { key, value });
    store.setState((prev) => {
      const selections = cloneSelections(prev.facetSelections);
      console.log('🔄 Previous selections:', Object.keys(selections).map(k => ({ key: k, values: Array.from(selections[k] || []) })));
      
      // Special handling for groupBy facet - only one option can be selected at a time
      if (key === 'groupBy') {
        if (selections[key]?.has(value)) {
          // If the same value is selected, deselect it
          console.log('🔄 Deselecting', key, value);
          delete selections[key];
        } else {
          // Select the new value and clear any other groupBy selections
          console.log('🔄 Selecting', key, value);
          selections[key] = new Set([value]);
        }
      } else {
        // Normal facet behavior - multiple selections allowed
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
      }

      console.log('🔄 New selections:', Object.keys(selections).map(k => ({ key: k, values: Array.from(selections[k] || []) })));
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
