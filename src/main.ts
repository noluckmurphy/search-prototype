import './tokens.css';
import './styles.css';
import { createHeader } from './components/header';
import { createSearchDialog } from './components/searchDialog';
import { createResultsView } from './components/resultsView';
import { createSettingsView } from './components/settingsView';
import { appState } from './state/appState';
import { runSearch } from './data/searchService';
import { ScreenRoute } from './types';
import { getEffectiveQueryLength, MIN_EFFECTIVE_QUERY_LENGTH } from './utils/query';

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
    
    appState.setSearchQuery(value);
    
    // Set monetary search mode based on query
    header.setMonetarySearchMode(isMonetaryQuery(value));
    
    const isHome = appState.getState().route === 'home';
    void performSearch(value, { openDialog: isHome, updateSubmitted: !isHome });
  },
  onSearchSubmit: () => {
    navigate('results');
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  },
  onSearchFocus: () => {
    if (appState.getState().route !== 'home') {
      return;
    }
    appState.setDialogOpen(true);
    const query = appState.getState().searchQuery;
    if (query.trim()) {
      void performSearch(query, { openDialog: true, updateSubmitted: false });
    }
  },
  onSearchBlur: () => {
    // Defer closing to outside-click + escape handlers.
  },
  onSearchKeyDown: (event) => {
    if (event.key === 'Escape') {
      appState.setDialogOpen(false);
      header.searchInput.blur();
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
homeScreen.innerHTML = `
  <div class="home-ghost">
    <h1>Global search prototype</h1>
    <p>This area stands in for future homepage content. Use the search bar above to open the quick results dialog.</p>
  </div>
`;

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

appState.subscribe((state) => {
  Object.entries(screens).forEach(([route, element]) => {
    element.hidden = route !== state.route;
  });

  header.searchInput.value = state.searchQuery;
  header.setActiveRoute(state.route);

  searchDialog.setState({
    visible: state.dialogOpen && state.route === 'home',
    status: state.searchStatus,
    query: state.searchQuery,
    response: state.recentResponse,
    isMonetarySearch: isMonetaryQuery(state.searchQuery),
  });

  resultsView.render({
    response: state.recentResponse,
    selections: state.facetSelections,
    status: state.searchStatus,
    query: state.lastSubmittedQuery || state.searchQuery,
    errorMessage: state.errorMessage,
    isMonetarySearch: isMonetaryQuery(state.lastSubmittedQuery || state.searchQuery),
  });
});

document.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('mousedown', handleDocumentClick);

// Initial render
appState.setRoute('home');
