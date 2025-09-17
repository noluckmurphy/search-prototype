import {
  BuildertrendRecord,
  SearchGroup,
  SearchRecord,
  SearchResponse,
  isBuildertrendRecord,
  isFinancialRecord,
  isOrganizationRecord,
  isPersonRecord,
} from '../types';

// Declare Lucide global
declare global {
  interface Window {
    lucide?: {
      createIcons: () => void;
    };
  }
}
import { formatCurrency, formatDate, formatEntityType } from '../utils/format';
import { SearchStatus } from '../state/appState';
import { findBestMatch, getContextSnippet, highlightText, highlightMonetaryValues, highlightHybrid, highlightMonetaryValuesWithPartialMatches } from '../utils/highlight';
import { getEffectiveQueryLength, isQueryTooShort, MIN_EFFECTIVE_QUERY_LENGTH } from '../utils/query';
import { recentSearches } from '../data/recentSearches';
import { settingsStore } from '../state/settingsStore';

// OS detection utility
function isMacOS(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

function getModifierKey(): string {
  return isMacOS() ? '⌘' : 'Ctrl';
}

// Helper function to detect if a query has monetary potential (for hybrid highlighting)
function hasMonetaryPotential(query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.some(token => {
    return /^\d+(,\d{3})*(\.\d+)?$/.test(token) || 
           /^\d+(\.\d+)?$/.test(token) ||
           /^\$?\d+(,\d{3})*(\.\d+)?$/.test(token) ||
           /\d/.test(token); // Any token containing a digit
  });
}

// Helper function to determine which highlighting function to use
function getHighlightFunction(query: string, isMonetarySearch: boolean) {
  if (isMonetarySearch) {
    return highlightMonetaryValuesWithPartialMatches;
  } else {
    // For non-monetary searches, always use regular text highlighting
    // This prevents monetary highlighting classes from being applied to non-monetary searches
    return highlightText;
  }
}

export interface SearchDialogState {
  visible: boolean;
  status: SearchStatus;
  query: string;
  response: SearchResponse | null;
  isMonetarySearch?: boolean;
  selectedIndex?: number;
}

export interface SearchDialogOptions {
  onSeeAllResults(): void;
  onKeyDown?(event: KeyboardEvent): void;
}

export interface SearchDialogHandles {
  element: HTMLDivElement;
  setState(state: SearchDialogState): void;
}

export function createSearchDialog(
  host: HTMLDivElement,
  options: SearchDialogOptions,
): SearchDialogHandles {
  const dialog = document.createElement('div');
  dialog.className = 'search-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'false');
  dialog.hidden = true;

  host.append(dialog);

  // Track previous state to avoid unnecessary re-renders
  let previousState: SearchDialogState | null = null;

  // Add keyboard event handler with better event capture
  function handleKeyDown(event: KeyboardEvent) {
    console.log('🔍 SearchDialog handleKeyDown:', {
      key: event.key,
      target: event.target,
      visible: previousState?.visible,
      hasResponse: !!previousState?.response,
      query: previousState?.query
    });

    if (!previousState?.visible) {
      console.log('❌ Dialog not visible, ignoring');
      return;
    }

    // Handle CMD/CTRL+Enter for "See all results"
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.stopPropagation();
      options.onSeeAllResults();
      return;
    }

    // Only handle arrow keys and enter when the dialog is visible
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter') {
      console.log('🎯 Handling navigation key:', event.key);
            // Handle recent searches state (when no query or no response)
            if (!previousState.response || previousState.query === '') {
              console.log('🎯 In recent searches mode');
              const recentItems = dialog.querySelectorAll('.search-dialog__recent-item');
              // Get the current selectedIndex from the dialog's current state
              const currentIndex = previousState.selectedIndex ?? -1;
              console.log('🎯 Recent searches: currentIndex =', currentIndex, 'totalItems =', recentItems.length);

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                const newIndex = Math.min(currentIndex + 1, recentItems.length - 1);
                console.log('🔽 Recent ArrowDown: currentIndex =', currentIndex, 'newIndex =', newIndex);
                setState({ ...previousState, selectedIndex: newIndex });
                scrollRecentIntoView(newIndex);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                const newIndex = Math.max(currentIndex - 1, -1);
                console.log('🔼 Recent ArrowUp: currentIndex =', currentIndex, 'newIndex =', newIndex);
                setState({ ...previousState, selectedIndex: newIndex });
                scrollRecentIntoView(newIndex);
              } else if (event.key === 'Enter' && currentIndex >= 0) {
                event.preventDefault();
                event.stopPropagation();
                const selectedItem = recentItems[currentIndex] as HTMLElement;
                if (selectedItem) {
                  selectedItem.click();
                }
              }
              return;
            }

      // Handle search results state
      if (!previousState.response) {
        return;
      }

      const allItems = getAllSearchItems(previousState.response);
      
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              event.stopPropagation();
              // Get the current selectedIndex from the dialog's current state
              const currentIndex = previousState.selectedIndex ?? -1;
              const newIndex = Math.min(currentIndex + 1, allItems.length - 1);
              console.log('🔽 ArrowDown: currentIndex =', currentIndex, 'newIndex =', newIndex, 'totalItems =', allItems.length);
              setState({ ...previousState, selectedIndex: newIndex });
              scrollSelectedIntoView(newIndex);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              event.stopPropagation();
              // Get the current selectedIndex from the dialog's current state
              const currentIndex = previousState.selectedIndex ?? -1;
              const newIndex = Math.max(currentIndex - 1, -1);
              console.log('🔼 ArrowUp: currentIndex =', currentIndex, 'newIndex =', newIndex);
              setState({ ...previousState, selectedIndex: newIndex });
              scrollSelectedIntoView(newIndex);
            } else if (event.key === 'Enter' && (previousState.selectedIndex ?? -1) >= 0) {
        event.preventDefault();
        event.stopPropagation();
        const selectedItem = allItems[previousState.selectedIndex || -1];
        console.log('⏎ Enter: selectedIndex =', previousState.selectedIndex, 'selectedItem =', selectedItem);
        if (selectedItem && isBuildertrendRecord(selectedItem)) {
          // TODO: Implement navigation logic
          console.log('Navigate to:', selectedItem.url);
        }
      }
    }
  }

  // Function to scroll selected item into view
  function scrollSelectedIntoView(selectedIndex: number) {
    if (selectedIndex < 0) {
      console.log('📍 Scroll: selectedIndex < 0, skipping scroll');
      return;
    }
    
    requestAnimationFrame(() => {
      const selectedElement = dialog.querySelector(`[data-item-index="${selectedIndex}"]`);
      console.log('📍 Scroll: looking for element with data-item-index="' + selectedIndex + '"', 'found:', selectedElement);
      if (selectedElement) {
        console.log('📍 Scroll: scrolling element into view');
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      } else {
        console.log('📍 Scroll: element not found!');
      }
    });
  }

  // Function to scroll recent search item into view
  function scrollRecentIntoView(selectedIndex: number) {
    if (selectedIndex < 0) {
      console.log('📍 Recent Scroll: selectedIndex < 0, skipping scroll');
      return;
    }
    
    requestAnimationFrame(() => {
      const recentItems = dialog.querySelectorAll('.search-dialog__recent-item');
      const selectedElement = recentItems[selectedIndex] as HTMLElement;
      console.log('📍 Recent Scroll: looking for recent item at index', selectedIndex, 'found:', selectedElement, 'total items:', recentItems.length);
      if (selectedElement) {
        console.log('📍 Recent Scroll: scrolling recent item into view');
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      } else {
        console.log('📍 Recent Scroll: recent item not found!');
      }
    });
  }

  // Add event listener with capture phase to ensure we get the events first
  dialog.addEventListener('keydown', handleKeyDown, true);
  
  // Make the dialog focusable so it can receive keyboard events
  dialog.setAttribute('tabindex', '-1');
  
  // Also add to document to catch events when dialog doesn't have focus
  document.addEventListener('keydown', (event) => {
    console.log('📄 Document keydown:', {
      key: event.key,
      target: event.target,
      visible: previousState?.visible,
      hasResponse: !!previousState?.response
    });

    // Only handle if dialog is visible
    if (!previousState?.visible) {
      console.log('❌ Document handler: dialog not visible');
      return;
    }

    // For recent searches (no response), we still want to handle navigation
    // For search results (has response), we also want to handle navigation
    // So we don't need to check hasResponse here
    
    const target = event.target as HTMLElement;
    const isInputField = target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable ||
      (target.closest && target.closest('.search-dialog__recent-item')) // Don't interfere with recent searches
    );

    console.log('🎯 Document handler: isInputField =', isInputField, 'target =', target);

    // For recent searches (no response), we want to handle arrow keys even from input field
    // For search results (has response), we only handle when not in input field
    if (isInputField && previousState?.response) {
      console.log('❌ Document handler: in input field with response, ignoring');
      return;
    }

    // If we're in an input field but have no response (recent searches), handle the event
    if (isInputField && !previousState?.response) {
      console.log('🎯 Document handler: in input field but no response (recent searches), handling');
    }

    console.log('✅ Document handler: calling handleKeyDown');
    handleKeyDown(event);
  });

  // Add a more aggressive approach - listen on the search input specifically
  const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('keydown', (event) => {
      console.log('🔍 Search input keydown:', {
        key: event.key,
        target: event.target,
        visible: previousState?.visible,
        hasResponse: !!previousState?.response
      });

      // Handle CMD/CTRL+Enter for "See all results" even when input is focused
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.stopPropagation();
        options.onSeeAllResults();
        return;
      }

      // If we have results and user presses arrow keys, blur the input and handle navigation
      if (previousState?.visible && previousState?.response && 
          (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        console.log('🎯 Search input: handling arrow key, blurring input');
        event.preventDefault();
        event.stopPropagation();
        
        // Blur the input to remove focus
        searchInput.blur();
        
        // Handle the navigation
        handleKeyDown(event);
      }
    });
  }

  // Listen for refresh-dialog events to re-render when recent searches are cleared
  window.addEventListener('refresh-dialog', () => {
    if (previousState?.visible) {
      console.log('🔄 Refreshing dialog due to recent searches clear');
      // Force a re-render by directly calling renderDialogContents
      // This bypasses the state comparison logic since we know we need to refresh
      requestAnimationFrame(() => {
        renderDialogContents(dialog, previousState!, options);
      });
    }
  });

  const setState = (state: SearchDialogState) => {
    console.log('🔄 setState called:', {
      oldSelectedIndex: previousState?.selectedIndex,
      newSelectedIndex: state.selectedIndex,
      visible: state.visible,
      hasResponse: !!state.response
    });

    // Only update visibility if it changed
    const visibilityChanged = !previousState || previousState.visible !== state.visible;
    if (visibilityChanged) {
      dialog.hidden = !state.visible;
      if (dialog.hidden) {
        dialog.innerHTML = '';
        dialog.style.display = 'none';
        previousState = state;
        return;
      }
      dialog.style.display = 'flex';
    }

    // Only update monetary search class if it changed
    if (!previousState || previousState.isMonetarySearch !== state.isMonetarySearch) {
      dialog.classList.toggle('monetary-search', state.isMonetarySearch || false);
    }

    // Always re-render when selectedIndex changes
    // This ensures the visual state is always in sync
    const selectedIndexChanged = !previousState || previousState.selectedIndex !== state.selectedIndex;
    
    // Re-render content if visibility changed OR if relevant state changed
    const contentChanged = visibilityChanged ||
      !previousState ||
      previousState.status !== state.status ||
      previousState.query !== state.query ||
      previousState.response !== state.response ||
      selectedIndexChanged;

    console.log('🔄 Content changed:', contentChanged, {
      visibilityChanged,
      statusChanged: !previousState || previousState.status !== state.status,
      queryChanged: !previousState || previousState.query !== state.query,
      responseChanged: !previousState || previousState.response !== state.response,
      selectedIndexChanged
    });

    if (contentChanged) {
      console.log('🔄 Re-rendering dialog contents');
      // Use requestAnimationFrame to defer heavy DOM operations
      requestAnimationFrame(() => {
        renderDialogContents(dialog, state, options);
      });
    } else {
      console.log('🔄 No content change, skipping re-render');
    }

    // Always update previousState to keep it in sync
    previousState = state;
  };

  return {
    element: dialog,
    setState,
  };
}

// Helper function to get all search items from response
function getAllSearchItems(response: SearchResponse): SearchRecord[] {
  const allItems: SearchRecord[] = [];
  response.limitedGroups.forEach(group => {
    allItems.push(...group.items);
  });
  return allItems;
}

function renderDialogContents(
  container: HTMLDivElement,
  state: SearchDialogState,
  options: SearchDialogOptions,
) {
  console.log('🎨 renderDialogContents called:', {
    status: state.status,
    query: state.query,
    selectedIndex: state.selectedIndex,
    hasResponse: !!state.response
  });

  container.innerHTML = '';

  if (state.status === 'loading') {
    container.append(renderLoadingState(state.query));
    return;
  }

  if (state.status === 'error') {
    container.append(renderErrorState());
    return;
  }

  const effectiveLength = getEffectiveQueryLength(state.query);

  if (effectiveLength === 0) {
    console.log('🎨 Rendering recent searches with selectedIndex:', state.selectedIndex);
    container.append(renderRecentSearchesState(state.selectedIndex));
    return;
  }

  if (isQueryTooShort(state.query)) {
    container.append(renderShortQueryState());
    return;
  }

  const response = state.response;
  if (!response || response.totalResults === 0) {
    container.append(renderNoResults(state.query));
    return;
  }

  const allItems = getAllSearchItems(response);
  let itemIndex = 0;
  
  response.limitedGroups.forEach((group) => {
    container.append(renderGroup(group, state.query, state.isMonetarySearch, state.selectedIndex, itemIndex));
    itemIndex += group.items.length;
  });

  const footer = document.createElement('div');
  footer.className = 'search-dialog__footer';

  // Create keyboard shortcuts container
  const shortcutsContainer = document.createElement('div');
  shortcutsContainer.className = 'search-dialog__shortcuts';
  
  // ESC to close
  const escShortcut = document.createElement('div');
  escShortcut.className = 'search-dialog__shortcut';
  const escKey = document.createElement('kbd');
  escKey.className = 'search-dialog__shortcut-key';
  escKey.textContent = 'esc';
  const escText = document.createElement('span');
  escText.className = 'search-dialog__shortcut-text';
  escText.textContent = 'to close';
  escShortcut.append(escKey, escText);
  
  // Enter to select
  const enterShortcut = document.createElement('div');
  enterShortcut.className = 'search-dialog__shortcut';
  const enterKey = document.createElement('kbd');
  enterKey.className = 'search-dialog__shortcut-key';
  enterKey.innerHTML = '↵'; // Enter symbol
  const enterText = document.createElement('span');
  enterText.className = 'search-dialog__shortcut-text';
  enterText.textContent = 'to select';
  enterShortcut.append(enterKey, enterText);
  
  // Arrows to navigate
  const arrowsShortcut = document.createElement('div');
  arrowsShortcut.className = 'search-dialog__shortcut';
  const arrowsContainer = document.createElement('div');
  arrowsContainer.className = 'search-dialog__shortcut-arrows';
  const upArrow = document.createElement('kbd');
  upArrow.className = 'search-dialog__shortcut-key';
  upArrow.innerHTML = '↑';
  const downArrow = document.createElement('kbd');
  downArrow.className = 'search-dialog__shortcut-key';
  downArrow.innerHTML = '↓';
  arrowsContainer.append(upArrow, downArrow);
  const arrowsText = document.createElement('span');
  arrowsText.className = 'search-dialog__shortcut-text';
  arrowsText.textContent = 'to navigate';
  arrowsShortcut.append(arrowsContainer, arrowsText);
  
  // CMD/CTRL+Enter to see all results
  const seeAllShortcut = document.createElement('div');
  seeAllShortcut.className = 'search-dialog__shortcut';
  const modifierKey = getModifierKey();
  const seeAllKeyContainer = document.createElement('div');
  seeAllKeyContainer.className = 'search-dialog__shortcut-keys';
  const modifierKeyElement = document.createElement('kbd');
  modifierKeyElement.className = 'search-dialog__shortcut-key';
  modifierKeyElement.textContent = modifierKey;
  const enterKeyElement = document.createElement('kbd');
  enterKeyElement.className = 'search-dialog__shortcut-key';
  enterKeyElement.innerHTML = '↵';
  seeAllKeyContainer.append(modifierKeyElement, enterKeyElement);
  const seeAllText = document.createElement('span');
  seeAllText.className = 'search-dialog__shortcut-text';
  seeAllText.textContent = 'to see all';
  seeAllShortcut.append(seeAllKeyContainer, seeAllText);
  
  shortcutsContainer.append(escShortcut, enterShortcut, arrowsShortcut, seeAllShortcut);

  const seeAllButton = document.createElement('button');
  seeAllButton.type = 'button';
  seeAllButton.className = 'see-all-button';
  seeAllButton.textContent = `See ${response.totalResults} result${response.totalResults === 1 ? '' : 's'} →`;
  seeAllButton.addEventListener('click', () => options.onSeeAllResults());

  footer.append(shortcutsContainer, seeAllButton);
  container.append(footer);
}

function renderEmptyState(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-dialog__empty';
  wrapper.innerHTML = `
    <h3>Quick search</h3>
    <p>Start typing or press <kbd>/</kbd> to jump into the search bar.</p>
  `;
  return wrapper;
}

function renderRecentSearchesState(selectedIndex?: number): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-dialog__recent';
  
  const settings = settingsStore.getState();
  const recentSearchesList = recentSearches.getFormattedRecentSearches(settings.recentSearchesDisplayLimit);
  
  if (recentSearchesList.length === 0) {
    wrapper.innerHTML = `
      <h3>Quick search</h3>
      <p>Start typing or press <kbd>/</kbd> to jump into the search bar.</p>
    `;
    return wrapper;
  }
  
  // Create the header
  const header = document.createElement('div');
  header.className = 'search-dialog__recent-header';
  header.innerHTML = `
    <h4>RECENT SEARCHES</h4>
  `;
  wrapper.append(header);
  
  // Create the list
  const list = document.createElement('ul');
  list.className = 'search-dialog__recent-list';
  
  recentSearchesList.forEach((search, index) => {
    const item = document.createElement('li');
    item.className = 'search-dialog__recent-item';
    item.setAttribute('data-query', search.query);
    
    // Add selected state
    if (selectedIndex === index) {
      item.classList.add('search-dialog__recent-item--selected');
    }
    
    // Create the main content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'search-dialog__recent-content';
    
    // Create the query text
    const queryText = document.createElement('div');
    queryText.className = 'search-dialog__recent-query';
    queryText.textContent = search.query;
    
    // Create the metadata container
    const metaText = document.createElement('div');
    metaText.className = 'search-dialog__recent-meta';
    
    // Add result count if available
    if (search.resultCountText) {
      const resultText = document.createElement('span');
      resultText.className = 'search-dialog__recent-results';
      resultText.textContent = search.resultCountText;
      metaText.append(resultText);
    }
    
    // Add time ago
    const timeText = document.createElement('span');
    timeText.className = 'search-dialog__recent-time';
    timeText.textContent = search.timeAgo;
    metaText.append(timeText);
    
    contentContainer.append(queryText, metaText);
    
    // Create the delete button
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'search-dialog__recent-delete';
    deleteButton.setAttribute('aria-label', `Delete search: ${search.query}`);
    deleteButton.innerHTML = '×';
    
    // Add delete button click handler
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the item click
      recentSearches.removeSearch(search.id);
      // Re-render the dialog to show updated list
      const event = new CustomEvent('refresh-dialog');
      window.dispatchEvent(event);
    });
    
    item.append(contentContainer, deleteButton);
    
    // Add click handler to perform the search
    item.addEventListener('click', () => {
      // Trigger a search with this query
      const event = new CustomEvent('search-query', {
        detail: { query: search.query }
      });
      window.dispatchEvent(event);
    });
    
    // Add keyboard support
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const event = new CustomEvent('search-query', {
          detail: { query: search.query }
        });
        window.dispatchEvent(event);
      }
    });
    
    list.append(item);
  });
  
  wrapper.append(list);
  
  // Add footer with keyboard shortcuts and clear button
  const footer = document.createElement('div');
  footer.className = 'search-dialog__footer';
  
  // Create keyboard shortcuts container
  const shortcutsContainer = document.createElement('div');
  shortcutsContainer.className = 'search-dialog__shortcuts';
  
  // ESC to close
  const escShortcut = document.createElement('div');
  escShortcut.className = 'search-dialog__shortcut';
  const escKey = document.createElement('kbd');
  escKey.className = 'search-dialog__shortcut-key';
  escKey.textContent = 'esc';
  const escText = document.createElement('span');
  escText.className = 'search-dialog__shortcut-text';
  escText.textContent = 'to close';
  escShortcut.append(escKey, escText);
  
  // Enter to select
  const enterShortcut = document.createElement('div');
  enterShortcut.className = 'search-dialog__shortcut';
  const enterKey = document.createElement('kbd');
  enterKey.className = 'search-dialog__shortcut-key';
  enterKey.innerHTML = '↵'; // Enter symbol
  const enterText = document.createElement('span');
  enterText.className = 'search-dialog__shortcut-text';
  enterText.textContent = 'to select';
  enterShortcut.append(enterKey, enterText);
  
  // Arrows to navigate
  const arrowsShortcut = document.createElement('div');
  arrowsShortcut.className = 'search-dialog__shortcut';
  const arrowsContainer = document.createElement('div');
  arrowsContainer.className = 'search-dialog__shortcut-arrows';
  const upArrow = document.createElement('kbd');
  upArrow.className = 'search-dialog__shortcut-key';
  upArrow.innerHTML = '↑';
  const downArrow = document.createElement('kbd');
  downArrow.className = 'search-dialog__shortcut-key';
  downArrow.innerHTML = '↓';
  arrowsContainer.append(upArrow, downArrow);
  const arrowsText = document.createElement('span');
  arrowsText.className = 'search-dialog__shortcut-text';
  arrowsText.textContent = 'to navigate';
  arrowsShortcut.append(arrowsContainer, arrowsText);
  
  shortcutsContainer.append(escShortcut, enterShortcut, arrowsShortcut);
  
  // Create clear button
  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'clear-recent-button';
  clearButton.textContent = 'Clear recent searches';
  clearButton.addEventListener('click', () => {
    recentSearches.clearAll();
    // Re-render the dialog to show empty state
    const event = new CustomEvent('refresh-dialog');
    window.dispatchEvent(event);
  });
  
  footer.append(shortcutsContainer, clearButton);
  wrapper.append(footer);
  
  return wrapper;
}

function renderShortQueryState(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-dialog__empty';
  wrapper.innerHTML = `
    <h3>Keep typing</h3>
    <p>Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.</p>
  `;
  return wrapper;
}

function renderLoadingState(query: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-dialog__loading';
  wrapper.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <div>
      <p>Searching for “${escapeHtml(query)}”…</p>
    </div>
  `;
  return wrapper;
}

function renderErrorState(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-dialog__error';
  wrapper.innerHTML = `
    <h3>We hit a snag</h3>
    <p>Try again in a few seconds.</p>
  `;
  return wrapper;
}

function renderNoResults(query: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-dialog__empty';
  wrapper.innerHTML = `
    <h3>No matches</h3>
    <p>We couldn’t find results for “${escapeHtml(query)}”. Adjust your keywords or filters.</p>
  `;
  return wrapper;
}


function renderGroup(group: SearchGroup, query: string, isMonetarySearch?: boolean, selectedIndex?: number, startIndex: number = 0): HTMLElement {
  const section = document.createElement('section');
  section.className = 'search-dialog__group';

  const heading = document.createElement('h4');
  heading.textContent = formatEntityType(group.entityType, { plural: true });
  section.append(heading);

  const list = document.createElement('ul');
  list.className = 'search-dialog__list';

  group.items.forEach((item, index) => {
    const globalIndex = startIndex + index;
    const isSelected = selectedIndex === globalIndex;
    list.append(renderGroupItem(item, query, isMonetarySearch, isSelected, globalIndex));
  });

  section.append(list);
  return section;
}

function renderGroupItem(item: SearchRecord, query: string, isMonetarySearch?: boolean, isSelected?: boolean, itemIndex?: number): HTMLLIElement {
  const li = document.createElement('li');
  
  // Add document ID metadata for debugging
  li.setAttribute('data-document-id', item.id);
  
  // Add item index for scrolling
  if (itemIndex !== undefined) {
    li.setAttribute('data-item-index', itemIndex.toString());
  }
  
  // Add Buildertrend-specific styling and behavior
  if (isBuildertrendRecord(item)) {
    li.className = 'search-dialog__item search-dialog__item--buildertrend';
    li.setAttribute('data-url', item.url);
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Navigate to ${item.title}`);
    
    // Add click handler for navigation
    li.addEventListener('click', () => {
      // TODO: Implement navigation logic
      console.log('Navigate to:', item.url);
    });
    
    // Add keyboard support
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        console.log('Navigate to:', item.url);
      }
    });
  } else {
    li.className = 'search-dialog__item';
  }

  // Add selected state
  if (isSelected) {
    li.classList.add('search-dialog__item--selected');
  }

  // Add hover effects
  li.addEventListener('mouseenter', () => {
    li.classList.add('search-dialog__item--hover');
  });

  li.addEventListener('mouseleave', () => {
    li.classList.remove('search-dialog__item--hover');
  });

  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);

  const header = document.createElement('div');
  header.className = 'search-dialog__item-header';

  // Add icon for Buildertrend records
  if (isBuildertrendRecord(item)) {
    const icon = document.createElement('i');
    icon.className = 'search-dialog__item-icon';
    icon.setAttribute('data-lucide', item.icon);
    header.append(icon);
    
    // Update icons after DOM is ready
    requestAnimationFrame(() => {
      if (window.lucide) {
        try {
          window.lucide.createIcons();
        } catch (error) {
          console.warn('Error updating icons:', error);
        }
      }
    });
  }

  const title = document.createElement('div');
  title.className = 'search-dialog__item-title';
  title.innerHTML = highlightFn(item.title, query);
  header.append(title);

  const meta = document.createElement('div');
  meta.className = 'search-dialog__item-meta';
  const metaText = buildItemMeta(item, query, isMonetarySearch);
  meta.innerHTML = highlightFn(metaText, query);

  // Add context line showing what was matched (skip for Buildertrend)
  if (!isBuildertrendRecord(item)) {
    const match = findBestMatch(item, query);
    if (match && match.field !== 'title') {
      const context = document.createElement('div');
      context.className = 'search-context';
      const highlightedSnippet = isMonetarySearch ? highlightMonetaryValuesWithPartialMatches(match.content, query) : getContextSnippet(match, 80, query);
      context.innerHTML = highlightedSnippet;
      li.append(header, meta, context);
    } else {
      li.append(header, meta);
    }
  } else {
    li.append(header, meta);
  }

  // Add line item matches for non-Document entities
  if (query && isFinancialRecord(item)) {
    const lineItemsMatch = renderMiniLineItems(item, query, isMonetarySearch);
    if (lineItemsMatch) {
      li.append(lineItemsMatch);
    }
  }

  return li;
}

function buildItemMeta(item: SearchRecord, query?: string, isMonetarySearch?: boolean): string {
  const parts: string[] = [];

  if (isBuildertrendRecord(item)) {
    parts.push(item.path);
    parts.push(item.description);
    return parts.filter(Boolean).join(' • ');
  }

  parts.push(item.project);

  if (item.entityType === 'Document') {
    parts.push((item as any).documentType);
    parts.push(`Updated ${formatDate(item.updatedAt)}`);
    return parts.filter(Boolean).join(' • ');
  }

  if (isFinancialRecord(item)) {
    parts.push(formatCurrency(item.totalValue));
    if (item.status) {
      parts.push(item.status);
    }
    return parts.filter(Boolean).join(' • ');
  }

  if (isPersonRecord(item)) {
    parts.push(item.personType);
    parts.push(item.jobTitle);
    if (item.associatedOrganization) {
      parts.push(item.associatedOrganization);
    }
    parts.push(item.location);
    return parts.filter(Boolean).join(' • ');
  }

  if (isOrganizationRecord(item)) {
    parts.push(item.organizationType);
    parts.push(item.tradeFocus);
    parts.push(item.serviceArea);
    return parts.filter(Boolean).join(' • ');
  }

  return parts.filter(Boolean).join(' • ');
}

function renderMiniLineItems(item: SearchRecord, query: string, isMonetarySearch?: boolean): HTMLElement | null {
  if (!isFinancialRecord(item)) {
    return null;
  }

  const items = item.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }

  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);

  // Find line items that have actual highlighting matches (not just text matches)
  const matchingItems = items.filter((lineItem: any) => {
    const searchableFields = [
      { value: lineItem.lineItemTitle, field: 'title' },
      { value: lineItem.lineItemDescription, field: 'description' },
      { value: lineItem.lineItemType, field: 'type' },
      { value: lineItem.lineItemQuantity?.toString(), field: 'quantity' },
      { value: lineItem.lineItemQuantityUnitOfMeasure, field: 'unit' },
      { value: formatCurrency(lineItem.lineItemUnitPrice), field: 'unitPrice' },
      { value: formatCurrency(lineItem.lineItemTotal), field: 'total' }
    ];
    
    // Check if any field has actual highlighting (contains <mark> tags)
    return searchableFields.some(({ value }) => {
      if (!value) return false;
      
      const highlighted = highlightFn(value, query);
      return highlighted.includes('<mark');
    });
  });

  if (matchingItems.length === 0) {
    return null;
  }

  const wrapper = document.createElement('small');
  wrapper.className = 'mini-line-items';

  const table = document.createElement('table');
  table.className = 'mini-line-items__table';

  // Show up to 3 matching line items
  const displayItems = matchingItems.slice(0, 3);
  
  displayItems.forEach((line: any) => {
    const row = document.createElement('tr');
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    
    row.innerHTML = `
      <td class="mini-line-items__description">${highlightFn(line.lineItemTitle, query)}</td>
      <td class="mini-line-items__type">${highlightFn(line.lineItemType, query)}</td>
      <td class="mini-line-items__quantity">${highlightFn(quantity, query)}</td>
      <td class="mini-line-items__unit-price">${highlightFn(unitPrice, query)}</td>
      <td class="mini-line-items__total">${highlightFn(total, query)}</td>
    `;
    table.append(row);
  });

  // Add "more items" row if there are additional matching items
  if (matchingItems.length > 3) {
    const moreRow = document.createElement('tr');
    moreRow.className = 'mini-line-items__more-row';
    const remaining = matchingItems.length - 3;
    moreRow.innerHTML = `
      <td colspan="5" class="mini-line-items__more">+${remaining} more matching line item${remaining === 1 ? '' : 's'}…</td>
    `;
    table.append(moreRow);
  }

  wrapper.append(table);
  return wrapper;
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
