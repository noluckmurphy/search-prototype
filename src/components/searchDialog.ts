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
  dialog.setAttribute('aria-label', 'Search results');
  dialog.setAttribute('aria-describedby', 'search-dialog-instructions');
  dialog.hidden = true;

  // Add instructions element for screen readers
  const instructions = document.createElement('div');
  instructions.id = 'search-dialog-instructions';
  instructions.className = 'sr-only';
  instructions.textContent = 'Use arrow keys to navigate results, Enter to select, Escape to close, Ctrl+Enter to see all results';
  
  // Add live region for announcements
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  liveRegion.id = 'search-dialog-announcements';
  
  host.append(instructions, liveRegion, dialog);

  // Track previous state to avoid unnecessary re-renders
  let previousState: SearchDialogState | null = null;

  // Function to announce changes to screen readers
  function announce(message: string) {
    liveRegion.textContent = message;
    // Clear after a short delay to allow for new announcements
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  // Add keyboard event handler with better event capture
  function handleKeyDown(event: KeyboardEvent) {
    if (!previousState?.visible) {
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
            // Handle recent searches state (when no query or no response)
            if (!previousState.response || previousState.query === '') {
              const recentItems = dialog.querySelectorAll('.search-dialog__recent-item');
              const currentIndex = previousState.selectedIndex ?? -1;

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                const newIndex = Math.min(currentIndex + 1, recentItems.length - 1);
                setState({ ...previousState, selectedIndex: newIndex });
                scrollRecentIntoView(newIndex);
                if (newIndex >= 0) {
                  const item = recentItems[newIndex] as HTMLElement;
                  const query = item.getAttribute('data-query') || 'recent search';
                  announce(`Selected recent search: ${query}`);
                }
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                const newIndex = Math.max(currentIndex - 1, -1);
                setState({ ...previousState, selectedIndex: newIndex });
                scrollRecentIntoView(newIndex);
                if (newIndex >= 0) {
                  const item = recentItems[newIndex] as HTMLElement;
                  const query = item.getAttribute('data-query') || 'recent search';
                  announce(`Selected recent search: ${query}`);
                } else {
                  announce('No recent search selected');
                }
              } else if (event.key === 'Enter' && currentIndex >= 0) {
                event.preventDefault();
                event.stopPropagation();
                const selectedItem = recentItems[currentIndex] as HTMLElement;
                if (selectedItem) {
                  const query = selectedItem.getAttribute('data-query') || 'recent search';
                  announce(`Searching for: ${query}`);
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
              setState({ ...previousState, selectedIndex: newIndex });
              scrollSelectedIntoView(newIndex);
              if (newIndex >= 0) {
                const selectedItem = allItems[newIndex];
                announce(`Selected result ${newIndex + 1} of ${allItems.length}: ${selectedItem.title}`);
              }
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              event.stopPropagation();
              // Get the current selectedIndex from the dialog's current state
              const currentIndex = previousState.selectedIndex ?? -1;
              const newIndex = Math.max(currentIndex - 1, -1);
              setState({ ...previousState, selectedIndex: newIndex });
              scrollSelectedIntoView(newIndex);
              if (newIndex >= 0) {
                const selectedItem = allItems[newIndex];
                announce(`Selected result ${newIndex + 1} of ${allItems.length}: ${selectedItem.title}`);
              } else {
                announce('No result selected');
              }
            } else if (event.key === 'Enter' && (previousState.selectedIndex ?? -1) >= 0) {
        event.preventDefault();
        event.stopPropagation();
        const selectedItem = allItems[previousState.selectedIndex || -1];
        if (selectedItem && isBuildertrendRecord(selectedItem)) {
          announce(`Navigating to: ${selectedItem.title}`);
          // TODO: Implement navigation logic
        }
      }
    }
  }

  // Function to scroll selected item into view
  function scrollSelectedIntoView(selectedIndex: number) {
    if (selectedIndex < 0) {
      return;
    }
    
    requestAnimationFrame(() => {
      const selectedElement = dialog.querySelector(`[data-item-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    });
  }

  // Function to scroll recent search item into view
  function scrollRecentIntoView(selectedIndex: number) {
    if (selectedIndex < 0) {
      return;
    }
    
    requestAnimationFrame(() => {
      const recentItems = dialog.querySelectorAll('.search-dialog__recent-item');
      const selectedElement = recentItems[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    });
  }

  // Add event listener with capture phase to ensure we get the events first
  dialog.addEventListener('keydown', handleKeyDown, true);
  
  // Make the dialog focusable so it can receive keyboard events
  dialog.setAttribute('tabindex', '-1');
  
  // Also add to document to catch events when dialog doesn't have focus
  document.addEventListener('keydown', (event) => {
    // Fast path: only handle if dialog is visible
    if (!previousState?.visible) {
      return;
    }

    // Fast path: only handle arrow keys and enter
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      return;
    }
    
    const target = event.target as HTMLElement;
    const isInputField = target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable ||
      (target.closest && target.closest('.search-dialog__recent-item'))
    );

    // For search results (has response), only handle when not in input field
    if (isInputField && previousState?.response) {
      return;
    }

    handleKeyDown(event);
  });

  // Add a more aggressive approach - listen on the search input specifically
  const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('keydown', (event) => {
      // Fast path: only handle specific keys
      if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        return;
      }

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
      // Force a re-render by directly calling renderDialogContents
      // This bypasses the state comparison logic since we know we need to refresh
      requestAnimationFrame(() => {
        renderDialogContents(dialog, previousState!, options);
      });
    }
  });

  const setState = (state: SearchDialogState) => {

    // Only update visibility if it changed
    const visibilityChanged = !previousState || previousState.visible !== state.visible;
    if (visibilityChanged) {
      // Batch visibility changes to reduce layout thrashing
      requestAnimationFrame(() => {
        dialog.hidden = !state.visible;
        if (dialog.hidden) {
          dialog.innerHTML = '';
          dialog.style.display = 'none';
        } else {
          dialog.style.display = 'flex';
        }
      });
      
      if (state.visible) {
        announce('Search dialog opened');
      }
      
      // Early return for hidden state to avoid unnecessary processing
      if (!state.visible) {
        previousState = state;
        return;
      }
    }

    // Only update monetary search class if it changed
    if (!previousState || previousState.isMonetarySearch !== state.isMonetarySearch) {
      // Use requestAnimationFrame to batch style changes
      requestAnimationFrame(() => {
        dialog.classList.toggle('monetary-search', state.isMonetarySearch || false);
      });
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

    if (contentChanged) {
      // Use MessageChannel for better performance than requestAnimationFrame
      const channel = new MessageChannel();
      channel.port2.onmessage = () => {
        renderDialogContents(dialog, state, options);
        
        // Announce status changes
        if (state.status === 'loading') {
          announce('Searching...');
        } else if (state.status === 'error') {
          announce('Search failed. Please try again.');
        } else if (state.status === 'ready' && state.response) {
          const resultCount = state.response.totalResults;
          const resultText = resultCount === 1 ? 'result' : 'results';
          announce(`Found ${resultCount} ${resultText} for "${state.query}"`);
        } else if (state.status === 'ready' && !state.response) {
          announce(`No results found for "${state.query}"`);
        }
      };
      channel.port1.postMessage(null);
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

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Clear container efficiently
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (state.status === 'loading') {
    fragment.appendChild(renderLoadingState(state.query));
    container.appendChild(fragment);
    return;
  }

  if (state.status === 'error') {
    fragment.appendChild(renderErrorState());
    container.appendChild(fragment);
    return;
  }

  const effectiveLength = getEffectiveQueryLength(state.query);

  if (effectiveLength === 0) {
    console.log('🎨 Rendering recent searches with selectedIndex:', state.selectedIndex);
    fragment.appendChild(renderRecentSearchesState(state.selectedIndex));
    
    // Add footer with keyboard shortcuts and clear button for recent searches
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
    fragment.appendChild(footer);
    container.appendChild(fragment);
    return;
  }

  if (isQueryTooShort(state.query)) {
    fragment.appendChild(renderShortQueryState());
    container.appendChild(fragment);
    return;
  }

  const response = state.response;
  if (!response || response.totalResults === 0) {
    fragment.appendChild(renderNoResults(state.query));
    container.appendChild(fragment);
    return;
  }

  const allItems = getAllSearchItems(response);
  let itemIndex = 0;
  
  response.limitedGroups.forEach((group) => {
    fragment.appendChild(renderGroup(group, state.query, state.isMonetarySearch, state.selectedIndex, itemIndex));
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
  fragment.appendChild(footer);
  container.appendChild(fragment);
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
      item.setAttribute('aria-selected', 'true');
    } else {
      item.setAttribute('aria-selected', 'false');
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
    deleteButton.setAttribute('aria-label', `Delete recent search: ${search.query}`);
    deleteButton.setAttribute('title', `Remove "${search.query}" from recent searches`);
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
    item.setAttribute('aria-label', `Search for "${search.query}" - ${search.resultCountText || 'No results'} - ${search.timeAgo}`);
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
    li.setAttribute('aria-label', `Navigate to ${item.title} - ${item.path || item.description || 'Buildertrend record'}`);
    
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
    li.setAttribute('role', 'listitem');
  }

  // Add selected state - batch attribute changes
  li.setAttribute('aria-selected', String(isSelected));
  if (isSelected) {
    li.classList.add('search-dialog__item--selected');
  }

  // Hover effects are now handled by CSS :hover pseudo-class for better performance

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
        window.lucide.createIcons();
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
      { value: formatCurrency(lineItem.lineItemTotal), field: 'total' },
      // Add cost code fields for matching
      { value: lineItem.costCode, field: 'costCode' },
      { value: lineItem.costCodeName, field: 'costCodeName' },
      { value: lineItem.costCodeCategory, field: 'costCodeCategory' },
      { value: lineItem.costCodeCategoryName, field: 'costCodeCategoryName' }
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
