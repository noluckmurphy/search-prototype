import './tokens.css';
import './styles.css';
import { createHeader } from './components/header';
import { createSearchDialog } from './components/searchDialog';
import { createResultsView } from './components/resultsView';
import { createSettingsView } from './components/settingsView';
import { createHomeSkeleton } from './components/homeSkeleton';
import { appState, AppState } from './state/appState';
import { runSearch } from './data/searchService';
import { recentSearches } from './data/recentSearches';
import { ScreenRoute } from './types';
import { getEffectiveQueryLength, MIN_EFFECTIVE_QUERY_LENGTH } from './utils/query';
import { clearHighlightCache } from './utils/highlight';

// Declare Lucide global
declare global {
  interface Window {
    lucide?: {
      createIcons: () => void;
    };
  }
}

function isMonetaryQuery(query: string): boolean {
  return query.trim().startsWith('$');
}

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Root container #app not found');
}

const main = document.createElement('main');
main.className = 'app-main';

// Search context to capture all parameters atomically
interface SearchContext {
  requestId: number;
  query: string;
  facetSelections: FacetSelectionState;
  isMonetary: boolean;
  timestamp: number;
}

let activeSearchToken = 0;
let searchDebounceTimer: number | null = null;
let currentSearchAbort: AbortController | null = null;

// Optimized debouncing for better performance
function debouncedSearch(value: string, options: { openDialog?: boolean; updateSubmitted?: boolean }) {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  const effectiveLength = getEffectiveQueryLength(value.trim());
  
  // More aggressive debouncing strategy to reduce input delay:
  // - 0ms for 1-2 chars (instant feedback for common short queries)
  // - 25ms for 3-4 chars (faster response for medium queries)
  // - 75ms for 5-6 chars (balanced response for longer queries)
  // - 100ms for 7+ chars (reduced server load for complex queries)
  let delay: number;
  if (effectiveLength <= 2) {
    delay = 0;
  } else if (effectiveLength <= 4) {
    delay = 25;
  } else if (effectiveLength <= 6) {
    delay = 75;
  } else {
    delay = 100;
  }
  
  // Use MessageChannel for better performance than setTimeout
  if (delay === 0) {
    // Immediate execution for short queries
    void performSearch(value, options);
  } else {
    searchDebounceTimer = window.setTimeout(() => {
      void performSearch(value, options);
      searchDebounceTimer = null;
    }, delay);
  }
}

const header = createHeader({
  onNavigate: (route) => navigate(route),
  onHome: () => {
    // Reset search state but keep settings
    appState.setSearchQuery('');
    appState.setLastSubmittedQuery('');
    appState.setResponse(null);
    appState.setStatus('idle');
    appState.setDialogOpen(false);
    appState.clearFacets();
    // Clear highlighting cache when navigating home
    clearHighlightCache();
    navigate('home');
  },
  onSearchChange: (value) => {
    const currentState = appState.getState();
    const previousQuery = currentState.lastSubmittedQuery || currentState.searchQuery;

    // Clear filters if the search query has changed from the last submitted query
    if (value.trim() !== previousQuery.trim()) {
      appState.clearFacets();
    }

    // Detect monetary mode ONCE at entry point
    const isMonetary = isMonetaryQuery(value);

    // Update search query and monetary mode atomically
    appState.setSearchQuery(value);
    appState.setMonetaryMode(isMonetary);

    // Set UI monetary search mode
    header.setMonetarySearchMode(isMonetary);

    const isHome = appState.getState().route === 'home';
    debouncedSearch(value, { openDialog: isHome, updateSubmitted: !isHome });
  },
  onSearchSubmit: () => {
    navigate('results');
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  },
  onSearchFocus: () => {
    if (appState.getState().route !== 'home') {
      return;
    }
    // Use MessageChannel for better performance than requestAnimationFrame
    const channel = new MessageChannel();
    channel.port2.onmessage = () => {
      appState.setDialogOpen(true);
      const query = appState.getState().searchQuery;
      if (query.trim()) {
        // Use debounced search for focus events too
        debouncedSearch(query, { openDialog: true, updateSubmitted: false });
      }
    };
    channel.port1.postMessage(null);
  },
  onSearchBlur: () => {
    // Defer closing to outside-click + escape handlers.
  },
  onSearchKeyDown: (event) => {
    // Fast path: only handle specific keys
    if (!['Enter', 'Escape', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      return;
    }

    // Handle CMD/CTRL+Enter for "See all results" when search input is focused
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && appState.getState().dialogOpen) {
      event.preventDefault();
      event.stopPropagation();
      navigate('results');
      void performSearch(appState.getState().searchQuery, { openDialog: false });
      return;
    }

    if (event.key === 'Escape') {
      appState.setDialogOpen(false);
      header.searchInput.blur();
    }

    // Handle arrow keys when dialog is open and we have results
    if (appState.getState().dialogOpen && appState.getState().recentResponse &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      event.stopPropagation();

      // Blur the input to remove focus
      header.searchInput.blur();

      // Focus the dialog so it can receive subsequent keyboard events
      const dialog = document.querySelector('.search-dialog') as HTMLElement;
      if (dialog) {
        dialog.focus();
      }

      // Let the search dialog handle the navigation
      // We'll dispatch a custom event to trigger navigation
      const customEvent = new KeyboardEvent('keydown', {
        key: event.key,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(customEvent);
    }
  },
});

const searchDialog = createSearchDialog(header.dialogHost, {
  onSeeAllResults: () => {
    navigate('results');
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  },
});

// Initialize dialog as hidden
searchDialog.setState({
  visible: false,
  status: appState.getState().searchStatus,
  query: appState.getState().searchQuery,
  response: appState.getState().recentResponse,
  selectedIndex: -1,
});

const resultsView = createResultsView({
  onFacetToggle: (key, value) => {
    console.log('🎯 onFacetToggle called:', { key, value });
    appState.toggleFacet(key, value);
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    console.log('🔍 Triggering search after facet toggle with query:', query);
    if (query) {
      void performSearch(query, { openDialog: false });
    }
  },
  onClearFacets: () => {
    appState.clearFacets();
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query) {
      void performSearch(query, { openDialog: false });
    }
  },
  onSortByChange: (sortBy) => {
    console.log('🎯 onSortByChange called:', sortBy);
    appState.setSortBy(sortBy);
    // No need to trigger a new search - just update the sort state
  },
});

const settingsView = createSettingsView();

const homeScreen = document.createElement('section');
homeScreen.id = 'screen-home';
homeScreen.dataset.screen = 'home';
homeScreen.className = 'screen screen--home';
homeScreen.appendChild(createHomeSkeleton());

const resultsScreen = document.createElement('section');
resultsScreen.id = 'screen-results';
resultsScreen.dataset.screen = 'results';
resultsScreen.className = 'screen screen--results';
resultsScreen.append(resultsView.element);

const settingsScreen = document.createElement('section');
settingsScreen.id = 'screen-settings';
settingsScreen.dataset.screen = 'settings';
settingsScreen.className = 'screen screen--settings';
settingsScreen.append(settingsView.element);

main.append(homeScreen, resultsScreen, settingsScreen);
root.append(header.element, main);

// Initialize icons after header is in DOM
requestAnimationFrame(() => {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.warn('Error initializing header icons:', error);
    }
  }
});

const screens: Record<ScreenRoute, HTMLElement> = {
  home: homeScreen,
  results: resultsScreen,
  settings: settingsScreen,
};

function navigate(route: ScreenRoute) {
  const previousRoute = appState.getState().route;
  appState.setRoute(route);

  if (route !== 'home') {
    appState.setDialogOpen(false);
  }

  if (route === 'results') {
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query && previousRoute !== 'results') {
      void performSearch(query, { openDialog: false });
    }
  }
}

async function performSearch(
  query: string,
  options: { openDialog?: boolean; updateSubmitted?: boolean } = {},
): Promise<void> {
  const { openDialog = false, updateSubmitted = true } = options;
  const trimmed = query.trim();
  const effectiveLength = getEffectiveQueryLength(trimmed);

  if (openDialog && appState.getState().route === 'home') {
    appState.setDialogOpen(true);
  }

  if (effectiveLength === 0) {
    activeSearchToken += 1;
    if (updateSubmitted) {
      appState.setLastSubmittedQuery('');
    }
    appState.setStatus('idle');
    appState.setResponse(null);
    return;
  }

  if (effectiveLength < MIN_EFFECTIVE_QUERY_LENGTH) {
    activeSearchToken += 1;
    if (updateSubmitted) {
      appState.setLastSubmittedQuery('');
    }
    appState.setStatus('idle');
    appState.setResponse(null);
    return;
  }

  // Cancel any in-flight search
  if (currentSearchAbort) {
    currentSearchAbort.abort();
  }
  currentSearchAbort = new AbortController();

  // Capture ALL search parameters atomically at token assignment
  const currentState = appState.getState();
  const searchContext: SearchContext = {
    requestId: ++activeSearchToken,
    query: trimmed,
    facetSelections: { ...currentState.facetSelections },
    isMonetary: currentState.isMonetary,
    timestamp: Date.now()
  };

  console.log('🔍 performSearch - context captured:', {
    requestId: searchContext.requestId,
    query: searchContext.query,
    isMonetary: searchContext.isMonetary,
    allSelections: Object.keys(searchContext.facetSelections).map(key => ({
      key,
      values: Array.from(searchContext.facetSelections[key] || [])
    }))
  });

  appState.setStatus('loading');

  try {
    const response = await runSearch({
      query: searchContext.query,
      selections: searchContext.facetSelections,
      isMonetarySearch: searchContext.isMonetary,
    });

    // Check if this search is still the most recent
    if (searchContext.requestId !== activeSearchToken) {
      console.log('🔍 Search outdated, discarding results for request', searchContext.requestId);
      return;
    }

    // Check if aborted
    if (currentSearchAbort?.signal.aborted) {
      console.log('🔍 Search aborted for request', searchContext.requestId);
      return;
    }

    appState.setResponse(response);
    appState.setStatus('ready');

    if (updateSubmitted) {
      appState.setLastSubmittedQuery(searchContext.query);
      // Record the search in recent searches when it's a submitted query
      recentSearches.addSearch(searchContext.query, response.totalResults);
    }

    if (openDialog && appState.getState().route === 'home') {
      appState.setDialogOpen(true);
    }
  } catch (error) {
    // Check if this search is still the most recent
    if (searchContext.requestId !== activeSearchToken) {
      console.log('🔍 Search error outdated, ignoring for request', searchContext.requestId);
      return;
    }

    // Check if aborted (don't show error for aborted searches)
    if (currentSearchAbort?.signal.aborted) {
      console.log('🔍 Search aborted (error path) for request', searchContext.requestId);
      return;
    }

    console.error('Search failed', error);
    appState.setStatus('error', 'Unable to complete search. Try again.');
  }
}

function focusSearchBar() {
  header.searchInput.focus();
  header.searchInput.select();
  const isHome = appState.getState().route === 'home';
  if (isHome) {
    appState.setDialogOpen(true);
    const query = appState.getState().searchQuery;
    if (query.trim()) {
      void performSearch(query, { openDialog: true, updateSubmitted: false });
    }
  } else {
    appState.setDialogOpen(false);
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  // Fast path: only handle specific keys
  if (!['/', 'k', 'Escape', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    return;
  }

  const target = event.target as HTMLElement | null;
  const isEditable =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable);

  if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable) {
    event.preventDefault();
    focusSearchBar();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    focusSearchBar();
    return;
  }

  if (event.key === 'Escape' && appState.getState().dialogOpen) {
    appState.setDialogOpen(false);
    header.searchInput.blur();
  }

  // Handle arrow keys when dialog is open
  if (appState.getState().dialogOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    // Don't prevent default here, let the search dialog handle it
  }
}

function handleDocumentClick(event: MouseEvent) {
  if (!appState.getState().dialogOpen) {
    return;
  }

  const target = event.target as Node | null;
  if (target && header.element.contains(target)) {
    return;
  }

  appState.setDialogOpen(false);
}

// Track previous state to avoid unnecessary re-renders
let previousState: AppState | null = null;

appState.subscribe((state) => {
  // Only update route visibility if route changed
  if (!previousState || previousState.route !== state.route) {
    Object.entries(screens).forEach(([route, element]) => {
      element.hidden = route !== state.route;
    });
  }

  // Only update search input if query changed
  if (!previousState || previousState.searchQuery !== state.searchQuery) {
    header.searchInput.value = state.searchQuery;
  }

  // Only update active route if route changed
  if (!previousState || previousState.route !== state.route) {
    header.setActiveRoute(state.route);
  }

  // Only update search dialog if relevant state changed
  const dialogStateChanged = !previousState ||
    previousState.dialogOpen !== state.dialogOpen ||
    previousState.route !== state.route ||
    previousState.searchStatus !== state.searchStatus ||
    previousState.searchQuery !== state.searchQuery ||
    previousState.isMonetary !== state.isMonetary ||
    previousState.recentResponse !== state.recentResponse;

  if (dialogStateChanged) {
    // Only reset selectedIndex if the query actually changed
    const queryChanged = !previousState || previousState.searchQuery !== state.searchQuery;
    searchDialog.setState({
      visible: state.dialogOpen && state.route === 'home',
      status: state.searchStatus,
      query: state.searchQuery,
      response: state.recentResponse,
      isMonetarySearch: state.isMonetary,
      selectedIndex: queryChanged ? -1 : (previousState?.selectedIndex ?? -1), // Preserve existing selection or default to -1
    });
  }

  // Only update results view if relevant state changed
  const resultsStateChanged = !previousState ||
    previousState.recentResponse !== state.recentResponse ||
    previousState.facetSelections !== state.facetSelections ||
    previousState.sortBy !== state.sortBy ||
    previousState.searchStatus !== state.searchStatus ||
    previousState.lastSubmittedQuery !== state.lastSubmittedQuery ||
    previousState.searchQuery !== state.searchQuery ||
    previousState.isMonetary !== state.isMonetary ||
    previousState.errorMessage !== state.errorMessage;

  if (resultsStateChanged) {
    // Use MessageChannel to defer results rendering and reduce input delay
    const channel = new MessageChannel();
    channel.port2.onmessage = () => {
      resultsView.render({
        response: state.recentResponse,
        selections: state.facetSelections,
        sortBy: state.sortBy,
        status: state.searchStatus,
        query: state.lastSubmittedQuery || state.searchQuery,
        errorMessage: state.errorMessage,
        isMonetarySearch: state.isMonetary,
      });
    };
    channel.port1.postMessage(null);
  }

  previousState = state;
});

document.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('mousedown', handleDocumentClick);

// Handle custom search-query events from recent searches
function handleSearchQueryEvent(event: CustomEvent) {
  const query = event.detail?.query;
  if (query && typeof query === 'string') {
    // Detect monetary mode ONCE at entry point
    const isMonetary = isMonetaryQuery(query);

    // Set the search query and monetary mode atomically
    appState.setSearchQuery(query);
    appState.setMonetaryMode(isMonetary);

    // Set UI monetary search mode
    header.setMonetarySearchMode(isMonetary);

    navigate('results');
    void performSearch(query, { openDialog: false });
  }
}

// Register event listener on both document and window
document.addEventListener('search-query', handleSearchQueryEvent, true);
window.addEventListener('search-query', handleSearchQueryEvent, true);

// Initialize Lucide icons - simplified to prevent loops
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.warn('Error initializing Lucide icons:', error);
    }
  }
});

// Simple icon update function - called manually when needed
function updateIcons() {
  if (window.lucide) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.warn('Error updating Lucide icons:', error);
    }
  }
}

// Initial render
appState.setRoute('home');
