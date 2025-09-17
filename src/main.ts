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

let activeSearchToken = 0;
let searchDebounceTimer: number | null = null;

// Debounce search operations to reduce UI blocking
function debouncedSearch(value: string, options: { openDialog?: boolean; updateSubmitted?: boolean }) {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  // For very short queries, search immediately to provide instant feedback
  const effectiveLength = getEffectiveQueryLength(value.trim());
  const delay = effectiveLength < 2 ? 0 : 150; // 150ms debounce for longer queries
  
  searchDebounceTimer = window.setTimeout(() => {
    void performSearch(value, options);
    searchDebounceTimer = null;
  }, delay);
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
    navigate('home');
  },
  onSearchChange: (value) => {
    const currentState = appState.getState();
    const previousQuery = currentState.lastSubmittedQuery || currentState.searchQuery;
    
    // Clear filters if the search query has changed from the last submitted query
    if (value.trim() !== previousQuery.trim()) {
      appState.clearFacets();
    }
    
    // Update search query immediately for responsive UI
    appState.setSearchQuery(value);
    
    // Set monetary search mode based on query
    header.setMonetarySearchMode(isMonetaryQuery(value));
    
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
    // Use requestAnimationFrame to defer heavy operations and keep UI responsive
    requestAnimationFrame(() => {
      appState.setDialogOpen(true);
      const query = appState.getState().searchQuery;
      if (query.trim()) {
        // Use debounced search for focus events too
        debouncedSearch(query, { openDialog: true, updateSubmitted: false });
      }
    });
  },
  onSearchBlur: () => {
    // Defer closing to outside-click + escape handlers.
  },
  onSearchKeyDown: (event) => {
    console.log('🔍 Header onSearchKeyDown:', {
      key: event.key,
      target: event.target,
      dialogOpen: appState.getState().dialogOpen
    });

    // Handle CMD/CTRL+Enter for "See all results" when search input is focused
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && appState.getState().dialogOpen) {
      event.preventDefault();
      event.stopPropagation();
      navigate('results');
      void performSearch(appState.getState().searchQuery, { openDialog: false });
      return;
    }

    if (event.key === 'Escape') {
      console.log('🎯 Header: handling Escape');
      appState.setDialogOpen(false);
      header.searchInput.blur();
    }

          // Handle arrow keys when dialog is open and we have results
          if (appState.getState().dialogOpen && appState.getState().recentResponse &&
              (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            console.log('🎯 Header: handling arrow key, blurring input');
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
    appState.toggleFacet(key, value);
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
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

  const requestId = ++activeSearchToken;
  appState.setStatus('loading');

  try {
    const response = await runSearch({
      query: trimmed,
      selections: appState.getState().facetSelections,
    });

    if (requestId !== activeSearchToken) {
      return;
    }

    appState.setResponse(response);
    appState.setStatus('ready');

    if (updateSubmitted) {
      appState.setLastSubmittedQuery(trimmed);
      // Record the search in recent searches when it's a submitted query
      recentSearches.addSearch(trimmed, response.totalResults);
    }

    if (openDialog && appState.getState().route === 'home') {
      appState.setDialogOpen(true);
    }
  } catch (error) {
    if (requestId !== activeSearchToken) {
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
  console.log('🌍 Global keydown:', {
    key: event.key,
    target: event.target,
    dialogOpen: appState.getState().dialogOpen
  });

  const target = event.target as HTMLElement | null;
  const isEditable =
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable);

  if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable) {
    console.log('🎯 Global: handling / key');
    event.preventDefault();
    focusSearchBar();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    console.log('🎯 Global: handling Cmd/Ctrl+K');
    event.preventDefault();
    focusSearchBar();
    return;
  }

  if (event.key === 'Escape' && appState.getState().dialogOpen) {
    console.log('🎯 Global: handling Escape');
    appState.setDialogOpen(false);
    header.searchInput.blur();
  }

  // Handle arrow keys when dialog is open
  if (appState.getState().dialogOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    console.log('🎯 Global: handling arrow key in dialog');
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
    previousState.recentResponse !== state.recentResponse;

  if (dialogStateChanged) {
    // Only reset selectedIndex if the query actually changed
    const queryChanged = !previousState || previousState.searchQuery !== state.searchQuery;
    searchDialog.setState({
      visible: state.dialogOpen && state.route === 'home',
      status: state.searchStatus,
      query: state.searchQuery,
      response: state.recentResponse,
      isMonetarySearch: isMonetaryQuery(state.searchQuery),
      selectedIndex: queryChanged ? -1 : (previousState?.selectedIndex ?? -1), // Preserve existing selection or default to -1
    });
  }

  // Only update results view if relevant state changed
  const resultsStateChanged = !previousState ||
    previousState.recentResponse !== state.recentResponse ||
    previousState.facetSelections !== state.facetSelections ||
    previousState.searchStatus !== state.searchStatus ||
    previousState.lastSubmittedQuery !== state.lastSubmittedQuery ||
    previousState.searchQuery !== state.searchQuery ||
    previousState.errorMessage !== state.errorMessage;

  if (resultsStateChanged) {
    resultsView.render({
      response: state.recentResponse,
      selections: state.facetSelections,
      status: state.searchStatus,
      query: state.lastSubmittedQuery || state.searchQuery,
      errorMessage: state.errorMessage,
      isMonetarySearch: isMonetaryQuery(state.lastSubmittedQuery || state.searchQuery),
    });
  }

  previousState = state;
});

document.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('mousedown', handleDocumentClick);

// Handle custom search-query events from recent searches
function handleSearchQueryEvent(event: CustomEvent) {
  const query = event.detail?.query;
  if (query && typeof query === 'string') {
    // Set the search query and trigger a search
    appState.setSearchQuery(query);
    header.setMonetarySearchMode(isMonetaryQuery(query));
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
