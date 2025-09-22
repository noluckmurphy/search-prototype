import {
  BuildertrendRecord,
  FacetKey,
  FacetSelectionState,
  FacetValue,
  SearchGroup,
  SearchRecord,
  SearchResponse,
  SortOption,
  isBuildertrendRecord,
  isFinancialRecord,
  isOrganizationRecord,
  isPersonRecord,
} from '../types';

// Client-side sorting functions
function sortRecordsByMostRecent(records: SearchRecord[]): SearchRecord[] {
  return [...records].sort((a, b) => {
    // Get the most recent date for each record (updatedAt or createdAt/issuedDate)
    const getMostRecentDate = (record: SearchRecord): Date => {
      const updatedDate = new Date(record.updatedAt);
      let createdDate: Date;
      
      if (isFinancialRecord(record)) {
        // For financial records, use issuedDate as created date
        createdDate = new Date(record.issuedDate);
      } else {
        // For other records, use createdAt
        createdDate = new Date(record.createdAt);
      }
      
      return updatedDate > createdDate ? updatedDate : createdDate;
    };
    
    const dateA = getMostRecentDate(a);
    const dateB = getMostRecentDate(b);
    
    // Sort by date (descending - most recent first)
    return dateB.getTime() - dateA.getTime();
  });
}

function sortRecordsByDueFirst(records: SearchRecord[]): SearchRecord[] {
  return [...records].sort((a, b) => {
    // Get due date or fallback to updatedAt
    const getDueDate = (record: SearchRecord): Date => {
      if (isFinancialRecord(record) && record.dueDate) {
        return new Date(record.dueDate);
      }
      return new Date(record.updatedAt);
    };
    
    const dueDateA = getDueDate(a);
    const dueDateB = getDueDate(b);
    
    // Sort by due date (ascending - soonest first)
    return dueDateA.getTime() - dueDateB.getTime();
  });
}

function sortRecordsByDueLast(records: SearchRecord[]): SearchRecord[] {
  return [...records].sort((a, b) => {
    // Get due date or fallback to updatedAt
    const getDueDate = (record: SearchRecord): Date => {
      if (isFinancialRecord(record) && record.dueDate) {
        return new Date(record.dueDate);
      }
      return new Date(record.updatedAt);
    };
    
    const dueDateA = getDueDate(a);
    const dueDateB = getDueDate(b);
    
    // Sort by due date (descending - latest first)
    return dueDateB.getTime() - dueDateA.getTime();
  });
}

function sortRecords(records: SearchRecord[], sortBy: SortOption): SearchRecord[] {
  console.log('🔄 Client-side sorting with sortBy:', sortBy, 'for', records.length, 'records');
  
  switch (sortBy) {
    case 'mostRecent':
      return sortRecordsByMostRecent(records);
    case 'dueFirst':
      return sortRecordsByDueFirst(records);
    case 'dueLast':
      return sortRecordsByDueLast(records);
    case 'relevance':
    default:
      // For relevance, keep the original order (already sorted by relevance from server)
      return records;
  }
}

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
import { settingsStore, LineItemBehavior } from '../state/settingsStore';
import { MIN_EFFECTIVE_QUERY_LENGTH, isQueryTooShort } from '../utils/query';
import { getEntityRelationships, getEntitySmartActions, getRelatedEntities } from '../data/searchService';
import { Relationship, SmartAction } from '../utils/relationshipEngine';

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

  const FACET_LABELS: Record<FacetKey, string> = {
  entityType: 'Type',
  project: 'Project',
  status: 'Status',
  documentType: 'Document Type',
  client: 'Client',
  issuedDate: 'Issued',
  totalValue: 'Total',
  groupBy: 'Group by',
  personType: 'Person Type',
  contactOrganization: 'Contact Organization',
  organizationType: 'Organization Type',
  tradeFocus: 'Trade Focus',
  costCodeCategory: 'Cost Code Category',
  costCode: 'Cost Code',
};

export interface ResultsViewOptions {
  onFacetToggle(key: FacetKey, value: string): void;
  onClearFacets?(): void;
  onSortByChange?(sortBy: SortOption): void;
}

export interface ResultsRenderContext {
  response: SearchResponse | null;
  selections: FacetSelectionState;
  sortBy: SortOption;
  status: SearchStatus;
  query: string;
  errorMessage?: string;
  isMonetarySearch?: boolean;
}

export interface ResultsViewHandles {
  element: HTMLElement;
  render(context: ResultsRenderContext): void;
}

export function createResultsView(options: ResultsViewOptions): ResultsViewHandles {
  const container = document.createElement('section');
  container.className = 'results-view';

  const header = document.createElement('header');
  header.className = 'results-view__header';
  header.innerHTML = `
    <div>
      <h1>Search Results</h1>
      <p class="results-view__summary" id="results-summary"></p>
    </div>
    <div class="results-view__actions">
      <button type="button" class="clear-facets" hidden>Clear filters</button>
    </div>
  `;

  const mainContent = document.createElement('div');
  mainContent.className = 'results-view__main';

  const facetsContainer = document.createElement('aside');
  facetsContainer.className = 'results-view__facets';

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'results-view__groups';

  mainContent.append(facetsContainer, resultsContainer);
  container.append(header, mainContent);

  const summaryEl = header.querySelector<HTMLParagraphElement>('#results-summary')!;
  const clearButton = header.querySelector<HTMLButtonElement>('.clear-facets')!;

  clearButton.addEventListener('click', () => {
    options.onClearFacets?.();
  });


  // Track previous context to avoid unnecessary re-renders
  let previousContext: ResultsRenderContext | null = null;

  const render = (context: ResultsRenderContext) => {
    const { response, selections, sortBy, status, query, errorMessage, isMonetarySearch } = context;

    // Only update summary if relevant state changed
    const summaryChanged = !previousContext ||
      previousContext.status !== status ||
      previousContext.response !== response ||
      previousContext.query !== query ||
      previousContext.errorMessage !== errorMessage ||
      previousContext.sortBy !== sortBy;

    if (summaryChanged) {
      renderSummary(summaryEl, status, response, query, errorMessage, sortBy, options.onSortByChange);
    }

    // Only update facets if relevant state changed
    const facetsChanged = !previousContext ||
      previousContext.status !== status ||
      previousContext.response !== response ||
      previousContext.selections !== selections;

    if (facetsChanged) {
      renderFacets(facetsContainer, status, response, selections, options);
    }


    // Only update results if relevant state changed
    const resultsChanged = !previousContext ||
      previousContext.status !== status ||
      previousContext.response !== response ||
      previousContext.query !== query ||
      previousContext.errorMessage !== errorMessage ||
      previousContext.isMonetarySearch !== isMonetarySearch ||
      previousContext.sortBy !== sortBy;

    if (resultsChanged) {
      // Use requestAnimationFrame to defer heavy DOM operations
      requestAnimationFrame(() => {
        renderGroups(resultsContainer, status, response, query, errorMessage, isMonetarySearch, sortBy);
      });
    }

    // Only update clear button if selections changed
    const selectionsChanged = !previousContext || previousContext.selections !== selections;
    if (selectionsChanged) {
      const hasSelections = selections && Object.keys(selections).length > 0;
      clearButton.hidden = !hasSelections;
    }

    previousContext = context;
  };

  return {
    element: container,
    render,
  };
}

function renderSummary(
  target: HTMLElement,
  status: SearchStatus,
  response: SearchResponse | null,
  query: string,
  errorMessage?: string,
  sortBy?: SortOption,
  onSortByChange?: (sortBy: SortOption) => void,
) {
  target.innerHTML = '';

  switch (status) {
    case 'idle':
      if (isQueryTooShort(query)) {
        target.textContent = `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.`;
      } else {
        target.textContent = 'Type a query to explore results and filters.';
      }
      return;
    case 'loading':
      target.textContent = query ? `Searching for "${query}"…` : 'Searching…';
      return;
    case 'error':
      target.textContent = errorMessage ?? 'Search failed. Try again.';
      return;
    case 'ready':
      if (!response) {
        target.textContent = 'No results.';
        return;
      }
      
      // Create the summary with integrated sort control
      const resultText = response.totalResults === 1 ? 'result' : 'results';
      const shouldShowSort = response.totalResults > 1 && sortBy && onSortByChange;
      
      if (shouldShowSort) {
        // Create container for text and sort control
        const container = document.createElement('div');
        container.className = 'results-summary-with-sort';
        
        // Create text span
        const textSpan = document.createElement('span');
        textSpan.textContent = `${response.totalResults} ${resultText} for "${response.query}" sorted by `;
        
        // Create sort select
        const sortSelect = document.createElement('select');
        sortSelect.className = 'results-summary__sort-select';
        
        // Define sort options with labels
        const sortOptions = [
          { value: 'relevance', label: 'Relevance' },
          { value: 'mostRecent', label: 'Most recent' },
          { value: 'dueFirst', label: 'Due first' },
          { value: 'dueLast', label: 'Due last' },
        ];
        
        // Add options to select
        sortOptions.forEach(option => {
          const optionElement = document.createElement('option');
          optionElement.value = option.value;
          optionElement.textContent = option.label;
          sortSelect.appendChild(optionElement);
        });
        
        // Set current selection
        sortSelect.value = sortBy;
        
        // Add change event listener
        sortSelect.addEventListener('change', () => {
          const newSort = sortSelect.value as SortOption;
          console.log('🔄 Sort By changed from', sortBy, 'to', newSort);
          if (newSort !== sortBy) {
            console.log('🎯 Calling onSortByChange for sortBy:', newSort);
            onSortByChange(newSort);
          }
        });
        
        container.append(textSpan, sortSelect);
        target.appendChild(container);
      } else {
        // Simple text for single result or no sort control
        target.textContent = `${response.totalResults} ${resultText} for "${response.query}".`;
      }
      return;
    default:
      target.textContent = '';
  }
}

function renderFacets(
  container: HTMLElement,
  status: SearchStatus,
  response: SearchResponse | null,
  selections: FacetSelectionState,
  options: ResultsViewOptions,
) {
  container.innerHTML = '';

  if (status === 'idle') {
    container.classList.add('is-empty');
    // Show pro tips instead of simple helper text
    container.innerHTML = renderFacetProTips('idle');
    return;
  }

  if (status === 'loading') {
    container.classList.add('is-empty');
    container.textContent = 'Calculating facets…';
    return;
  }

  if (status === 'error') {
    container.classList.add('is-empty');
    container.textContent = 'Facets unavailable while search is failing.';
    return;
  }

  if (!response || !response.facets) {
    container.classList.add('is-empty');
    // Show pro tips instead of simple helper text
    container.innerHTML = renderFacetProTips('empty');
    return;
  }

  const facetsEntries = Object.entries(response.facets) as [FacetKey, FacetValue[]][];
  if (facetsEntries.length === 0) {
    container.classList.add('is-empty');
    // Show pro tips instead of simple helper text
    container.innerHTML = renderFacetProTips('no-results');
    return;
  }

  container.classList.remove('is-empty');

  const settings = settingsStore.getState();
  const maxFacetValues = settings.maxFacetValues;

  facetsEntries.forEach(([key, values]) => {
    const block = document.createElement('section');
    block.className = 'results-view__facet-block';

    const heading = document.createElement('h3');
    heading.textContent = FACET_LABELS[key] ?? key;
    block.append(heading);

    const list = document.createElement('ul');
    list.className = 'results-view__facet-list';

    // Determine how many values to show initially
    const shouldLimit = maxFacetValues > 0 && values.length > maxFacetValues;
    const initialCount = shouldLimit ? maxFacetValues : values.length;
    const hiddenCount = values.length - initialCount;

    // Create facet items
    values.forEach((facet, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'results-view__facet-item';
      
      // Hide items beyond the initial count
      if (shouldLimit && index >= initialCount) {
        listItem.classList.add('facet-item--hidden');
      }

      const label = document.createElement('label');
      label.className = 'facet-checkbox';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'facet-checkbox__input';
      checkbox.dataset.key = key;
      checkbox.dataset.value = facet.value;

      const isSelected = selections[key]?.has(facet.value) ?? false;
      checkbox.checked = isSelected;

      const text = document.createElement('span');
      text.className = 'facet-checkbox__text';
      // Format entity type facet values for better display
      if (key === 'entityType') {
        text.textContent = formatEntityType(facet.value as any);
      } else {
        text.textContent = facet.value;
      }

      const count = document.createElement('span');
      count.className = 'facet-checkbox__count';
      count.textContent = String(facet.count);

      label.append(checkbox, text, count);
      listItem.append(label);
      list.append(listItem);

      checkbox.addEventListener('change', () => {
        options.onFacetToggle(key, facet.value);
      });
    });

    block.append(list);

    // Add show more/less toggle if needed
    if (shouldLimit && hiddenCount > 0) {
      const toggleContainer = document.createElement('div');
      toggleContainer.className = 'facet-toggle-container';

      const toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'facet-toggle-button';
      toggleButton.textContent = `Show ${hiddenCount} more${hiddenCount === 1 ? '' : '...'}`;
      toggleButton.dataset.facetKey = key;

      toggleContainer.append(toggleButton);
      block.append(toggleContainer);

      // Add toggle functionality
      toggleButton.addEventListener('click', () => {
        const isExpanded = toggleButton.classList.contains('is-expanded');
        const allItems = list.querySelectorAll('.results-view__facet-item');
        
        if (isExpanded) {
          // Collapse: hide items beyond initial count
          allItems.forEach((item, index) => {
            if (index >= initialCount) {
              item.classList.add('facet-item--hidden');
            }
          });
          toggleButton.textContent = `Show ${hiddenCount} more${hiddenCount === 1 ? '' : '...'}`;
          toggleButton.classList.remove('is-expanded');
        } else {
          // Expand: show all items
          allItems.forEach(item => item.classList.remove('facet-item--hidden'));
          toggleButton.textContent = 'Show less';
          toggleButton.classList.add('is-expanded');
        }
      });
    }

    container.append(block);
  });
}

function renderGroups(
  container: HTMLElement,
  status: SearchStatus,
  response: SearchResponse | null,
  query: string,
  errorMessage?: string,
  isMonetarySearch?: boolean,
  sortBy?: SortOption,
) {
  container.innerHTML = '';

  if (status === 'idle') {
    if (isQueryTooShort(query)) {
      // Show pro tips for short queries - hide facets entirely
      const message = `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see matching records.`;
      container.innerHTML = renderProTipsState(message, 'idle');
      // Hide the facets container for idle state
      const facetsContainer = container.closest('.results-view__main')?.querySelector('.results-view__facets') as HTMLElement;
      if (facetsContainer) {
        facetsContainer.style.display = 'none';
      }
    } else {
      // Show empty state with pro tips - no heading message
      container.innerHTML = renderProTipsState('', 'empty');
      // Hide the facets container for empty state
      const facetsContainer = container.closest('.results-view__main')?.querySelector('.results-view__facets') as HTMLElement;
      if (facetsContainer) {
        facetsContainer.style.display = 'none';
      }
    }
    return;
  }

  if (status === 'loading') {
    container.innerHTML = '<p class="results-view__empty">Fetching results…</p>';
    return;
  }

  if (status === 'error') {
    container.innerHTML = `<p class="results-view__empty">${
      errorMessage ?? 'Something went wrong while searching.'
    }</p>`;
    return;
  }

  if (!response || !response.fullGroups.length) {
    // Show no results state with pro tips instead of simple message - hide facets entirely
    container.innerHTML = renderProTipsState('No results found', 'no-results', query);
    // Hide the facets container for no results state
    const facetsContainer = container.closest('.results-view__main')?.querySelector('.results-view__facets') as HTMLElement;
    if (facetsContainer) {
      facetsContainer.style.display = 'none';
    }
    return;
  }

  // Show facets container again when we have results
  const facetsContainer = container.closest('.results-view__main')?.querySelector('.results-view__facets') as HTMLElement;
  if (facetsContainer) {
    facetsContainer.style.display = '';
  }

  // Apply client-side sorting if sortBy is specified and not relevance
  let sortedResponse = response;
  if (sortBy && sortBy !== 'relevance') {
    console.log('🔄 Applying client-side sorting:', sortBy);
    
    // Sort the records
    const sortedRecords = sortRecords(response.records, sortBy);
    
    // Create a new response with sorted records
    sortedResponse = {
      ...response,
      records: sortedRecords,
      // Also sort the groups if they exist
      fullGroups: response.fullGroups.map(group => ({
        ...group,
        items: sortRecords(group.items, sortBy)
      })),
      limitedGroups: response.limitedGroups.map(group => ({
        ...group,
        items: sortRecords(group.items, sortBy)
      }))
    };
  }

  // If results are grouped, render groups; otherwise render as flat list
  if (sortedResponse.isGrouped) {
    sortedResponse.fullGroups.forEach((group) => {
      container.append(renderGroup(group, group.groupTitle, query, isMonetarySearch));
    });
  } else {
    // Render as flat list without group headers
    const flatList = document.createElement('div');
    flatList.className = 'results-list';
    
    // Use Promise.all to handle async rendering properly
    Promise.all(sortedResponse.records.map(async (record) => {
      const card = await renderResultCard(record, query, isMonetarySearch);
      return { record, card };
    })).then(results => {
      results.forEach(({ card }) => {
        flatList.append(card);
      });
    });
    
    container.append(flatList);
  }
}

function renderGroup(group: SearchGroup, groupTitle?: string, query?: string, isMonetarySearch?: boolean): HTMLElement {
  const section = document.createElement('section');
  section.className = 'results-group';

  const heading = document.createElement('header');
  heading.className = 'results-group__header';
  
  const title = groupTitle || formatEntityType(group.entityType, { plural: true });
  heading.innerHTML = `
    <h2>${title}</h2>
    <span class="results-group__count">${group.items.length}</span>
  `;

  const list = document.createElement('div');
  list.className = 'results-group__list';

  // Use Promise.all to handle async rendering properly
  Promise.all(group.items.map(async (item) => {
    const card = await renderResultCard(item, query, isMonetarySearch);
    return { item, card };
  })).then(results => {
    results.forEach(({ card }) => {
      list.append(card);
    });
  });

  section.append(heading, list);
  return section;
}

async function renderResultCard(item: SearchRecord, query?: string, isMonetarySearch?: boolean): Promise<HTMLElement> {
  const card = document.createElement('article');
  
  // Add document ID metadata for debugging
  card.setAttribute('data-document-id', item.id);
  
  // Add Buildertrend-specific styling
  if (isBuildertrendRecord(item)) {
    card.className = 'result-card result-card--buildertrend';
    card.setAttribute('data-url', item.url);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Navigate to ${item.title}`);
    
    // Add click handler for navigation
    card.addEventListener('click', () => {
      // TODO: Implement navigation logic
      console.log('Navigate to:', item.url);
    });
    
    // Add keyboard support
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        console.log('Navigate to:', item.url);
      }
    });
  } else {
    card.className = 'result-card';
  }

  const header = document.createElement('div');
  header.className = 'result-card__header';

  const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;

  const title = document.createElement('h3');
  title.innerHTML = query && highlightFn ? highlightFn(item.title, query) : item.title;

  // Add icon for Buildertrend records
  if (isBuildertrendRecord(item)) {
    const icon = document.createElement('i');
    icon.className = 'result-card__icon';
    icon.setAttribute('data-lucide', item.icon);
    header.append(icon, title);
    
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
  } else {
    header.append(title);
  }

  const badge = document.createElement('span');
  badge.className = 'result-card__badge';
  badge.textContent = formatEntityType(item.entityType);

  header.append(badge);

  const summary = document.createElement('p');
  summary.className = 'result-card__summary';
  summary.innerHTML = query && highlightFn ? highlightFn(item.summary, query) : item.summary;

  const metaList = document.createElement('ul');
  metaList.className = 'result-card__meta';
  metaList.append(...buildMetaItems(item, query, isMonetarySearch));

  card.append(header, summary, metaList);

  // Add context line if the match is not in title, summary, or line items
  if (query) {
    const match = findBestMatch(item, query);
    if (match && match.field !== 'title' && match.field !== 'summary' && !match.field.startsWith('lineItem')) {
      const context = document.createElement('div');
      context.className = 'search-context';
      const highlightedSnippet = isMonetarySearch ? highlightMonetaryValuesWithPartialMatches(match.content, query) : getContextSnippet(match, 120, query);
      context.innerHTML = `<strong>Matched in ${getFieldLabel(match.field)}:</strong> ${highlightedSnippet}`;
      card.append(context);
    }
  }

  if (isFinancialRecord(item)) {
    const lineItemsBlock = renderLineItems(item, query, isMonetarySearch);
    if (lineItemsBlock) {
      card.append(lineItemsBlock);
    }
  }

  // Add related items and smart actions
  const settings = settingsStore.getState();
  const includeInferred = settings.showInferredRelationships ?? true;
  
  try {
    // Get related entities
    const relatedEntities = await getRelatedEntities(item.id, {
      includeInferred,
      limit: 3
    });

    // Get smart actions
    const smartActions = await getEntitySmartActions(item, includeInferred);

    // Render related items if any exist
    if (relatedEntities.length > 0) {
      const relatedSection = renderRelatedItems(relatedEntities, item.id);
      card.append(relatedSection);
    }

    // Render smart actions if any exist
    if (smartActions.length > 0) {
      const actionsSection = renderSmartActions(smartActions, item);
      card.append(actionsSection);
    }
  } catch (error) {
    console.warn('Error loading relationships for', item.id, ':', error);
  }

  return card;
}

function buildMetaItems(item: SearchRecord, query?: string, isMonetarySearch?: boolean): HTMLLIElement[] {
  const metas: HTMLLIElement[] = [];

  const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
  const highlightValue = (value: string) => (highlightFn ? highlightFn(value, query!) : value);

  const pushMeta = (label: string, value?: string) => {
    if (!value) {
      return;
    }
    const entry = document.createElement('li');
    entry.innerHTML = `<span>${label}</span><strong>${highlightValue(value)}</strong>`;
    metas.push(entry);
  };

  if (isBuildertrendRecord(item)) {
    pushMeta('Navigate To', item.path);
    pushMeta('Description', item.description);
    return metas;
  }

  pushMeta('Project', item.project);
  pushMeta('Status', item.status);

  if (item.entityType === 'Document') {
    const doc = item as any;
    pushMeta('Type', doc.documentType);
    pushMeta('Updated', formatDate(item.updatedAt));
    return metas;
  }

  if (isFinancialRecord(item)) {
    pushMeta('Issued', formatDate(item.issuedDate));
    if (item.dueDate) {
      pushMeta('Due', formatDate(item.dueDate));
    }
    pushMeta('Total', formatCurrency(item.totalValue));
    return metas;
  }

  if (isPersonRecord(item)) {
    pushMeta('Person Type', item.personType);
    pushMeta('Role', item.jobTitle);
    pushMeta('Organization', item.associatedOrganization);
    pushMeta('Location', item.location);
    pushMeta('Email', item.email);
    pushMeta('Phone', item.phone);
    pushMeta('Trade Focus', item.tradeFocus ?? undefined);
    return metas;
  }

  if (isOrganizationRecord(item)) {
    pushMeta('Business Type', item.organizationType);
    pushMeta('Trade', item.tradeFocus);
    pushMeta('Service Area', item.serviceArea);
    pushMeta('Primary Contact', item.primaryContact);
    pushMeta('Phone', item.phone);
    pushMeta('Email', item.email);
    pushMeta('Website', item.website ?? undefined);
    return metas;
  }

  return metas;
}

function hasLineItemMatches(item: SearchRecord, query?: string, isMonetarySearch?: boolean): boolean {
  if (!query || !isFinancialRecord(item)) return false;
  
  const items = item.lineItems ?? [];
  if (items.length === 0) return false;

  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);

  // Check if any line item has actual highlighting matches
  return items.some((lineItem) => {
    let searchableFields: string[] = [];
    
    if (isMonetarySearch) {
      // For monetary searches, ONLY check actual monetary value fields
      // Never check quantities, descriptions, or other non-monetary fields
      const monetaryFields: string[] = [];
      
      // Only include unit price and total as these are the actual monetary values
      monetaryFields.push(formatCurrency(lineItem.lineItemUnitPrice));
      monetaryFields.push(formatCurrency(lineItem.lineItemTotal));
      
      searchableFields = monetaryFields.filter(field => field && field.trim() !== '');
    } else {
      // For non-monetary searches, check all fields (backward compatibility)
      searchableFields = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType,
        lineItem.lineItemQuantity?.toString(),
        lineItem.lineItemQuantityUnitOfMeasure,
        formatCurrency(lineItem.lineItemUnitPrice),
        formatCurrency(lineItem.lineItemTotal),
        // Add cost code fields for matching
        lineItem.costCode,
        lineItem.costCodeName,
        lineItem.costCodeCategory,
        lineItem.costCodeCategoryName
      ].filter((field): field is string => field != null && field.trim() !== '');
    }
    
    return searchableFields.some((value) => {
      if (!value) return false;
      
      const highlighted = highlightFn(value, query);
      return highlighted.includes('<mark');
    });
  });
}

function getMatchingLineItemIndices(item: SearchRecord, query?: string, isMonetarySearch?: boolean): number[] {
  if (!query || !isFinancialRecord(item)) return [];
  
  const items = item.lineItems ?? [];
  if (items.length === 0) return [];

  const matchingIndices: number[] = [];
  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);
  
  items.forEach((lineItem: any, index: number) => {
    let searchableFields: string[] = [];
    
    if (isMonetarySearch) {
      // For monetary searches, ONLY check actual monetary value fields
      // Never check quantities, descriptions, or other non-monetary fields
      const monetaryFields: string[] = [];
      
      // Only include unit price and total as these are the actual monetary values
      monetaryFields.push(formatCurrency(lineItem.lineItemUnitPrice));
      monetaryFields.push(formatCurrency(lineItem.lineItemTotal));
      
      searchableFields = monetaryFields.filter(field => field && field.trim() !== '');
    } else {
      // For non-monetary searches, check all fields (backward compatibility)
      searchableFields = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType,
        lineItem.lineItemQuantity?.toString(),
        lineItem.lineItemQuantityUnitOfMeasure,
        formatCurrency(lineItem.lineItemUnitPrice),
        formatCurrency(lineItem.lineItemTotal),
        // Add cost code fields for matching
        lineItem.costCode,
        lineItem.costCodeName,
        lineItem.costCodeCategory,
        lineItem.costCodeCategoryName
      ].filter((field): field is string => field != null && field.trim() !== '');
    }
    
    const hasMatch = searchableFields.some((value) => {
      if (!value) return false;
      
      const highlighted = highlightFn(value, query);
      return highlighted.includes('<mark');
    });
    
    if (hasMatch) {
      matchingIndices.push(index);
    }
  });
  
  return matchingIndices;
}

interface MatchGroup {
  startIndex: number;
  endIndex: number;
  indices: number[];
}

function groupMatchingLineItems(matchingIndices: number[], collapseThreshold: number): MatchGroup[] {
  if (matchingIndices.length === 0) return [];
  
  const groups: MatchGroup[] = [];
  let currentGroup: MatchGroup = {
    startIndex: matchingIndices[0],
    endIndex: matchingIndices[0],
    indices: [matchingIndices[0]]
  };
  
  for (let i = 1; i < matchingIndices.length; i++) {
    const currentIndex = matchingIndices[i];
    const lastIndex = matchingIndices[i - 1];
    
    // If the gap is within the threshold, add to current group
    if (currentIndex - lastIndex <= collapseThreshold) {
      currentGroup.endIndex = currentIndex;
      currentGroup.indices.push(currentIndex);
    } else {
      // Gap is too large, start a new group
      groups.push(currentGroup);
      currentGroup = {
        startIndex: currentIndex,
        endIndex: currentIndex,
        indices: [currentIndex]
      };
    }
  }
  
  // Add the last group
  groups.push(currentGroup);
  
  return groups;
}

function calculateDisplayRanges(
  groups: MatchGroup[], 
  contextCount: number, 
  totalItems: number
): Array<{ start: number; end: number; isCollapsed?: boolean }> {
  if (groups.length === 0) return [];
  
  const ranges: Array<{ start: number; end: number; isCollapsed?: boolean }> = [];
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    
    // Calculate the range for this group with context
    const start = Math.max(0, group.startIndex - contextCount);
    const end = Math.min(totalItems - 1, group.endIndex + contextCount);
    
    ranges.push({ start, end });
    
    // Add collapsed range between groups (except after the last group)
    if (i < groups.length - 1) {
      const nextGroup = groups[i + 1];
      const gapStart = end + 1;
      const gapEnd = Math.max(0, nextGroup.startIndex - contextCount) - 1;
      
      if (gapStart <= gapEnd) {
        ranges.push({ start: gapStart, end: gapEnd, isCollapsed: true });
      }
    }
  }
  
  return ranges;
}

// Helper function to extract context count from behavior setting
function getContextCountFromBehavior(behavior: LineItemBehavior): number {
  switch (behavior) {
    case 'show-matched-only':
      return 0;
    case 'show-matched-with-context-1':
      return 1;
    case 'show-matched-with-context-2':
      return 2;
    case 'show-matched-with-context-3':
      return 3;
    case 'show-matched-with-context-5':
      return 5;
    case 'show-all-always':
    case 'hide-all-always':
      return 0; // Not used for these behaviors
    default:
      return 3;
  }
}

function renderLineItems(item: SearchRecord, query?: string, isMonetarySearch?: boolean): HTMLElement | null {
  if (!isFinancialRecord(item)) {
    return null;
  }

  const items = item.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }

  const settings = settingsStore.getState();
  const hasMatches = hasLineItemMatches(item, query, isMonetarySearch);
  
  // Determine behavior based on the new setting
  const behavior = settings.lineItemBehavior;
  const shouldShowLineItems = behavior !== 'hide-all-always';
  const shouldShowAllItems = behavior === 'show-all-always';
  const contextCount = getContextCountFromBehavior(behavior);
  

  const wrapper = document.createElement('div');
  wrapper.className = 'result-card__line-items';


  // Helper function to group line items by cost code category
  const groupLineItemsByCostCode = (items: any[]): Record<string, { categoryName: string; items: any[] }> => {
    const groups: Record<string, { categoryName: string; items: any[] }> = {};
    
    items.forEach(item => {
      const categoryId = item.costCodeCategory || 'buildertrend-default';
      const categoryName = item.costCodeCategoryName || 'Buildertrend Default';
      
      if (!groups[categoryId]) {
        groups[categoryId] = { categoryName, items: [] };
      }
      groups[categoryId].items.push(item);
    });
    
    return groups;
  };

  // Helper function to render a line item row
  const renderLineItemRow = (line: any, index: number): HTMLTableRowElement => {
    const row = document.createElement('tr');
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
    
    // Add cost code column if available
    const costCodeDisplay = line.costCodeName || line.costCode || '';
    
    // For monetary searches, only highlight monetary fields (unit price and total)
    // For non-monetary searches, highlight all fields
    const shouldHighlightDescription = query && highlightFn && !isMonetarySearch;
    const shouldHighlightCostCode = query && highlightFn && !isMonetarySearch;
    const shouldHighlightType = query && highlightFn && !isMonetarySearch;
    const shouldHighlightQuantity = query && highlightFn && !isMonetarySearch;
    const shouldHighlightUnitPrice = query && highlightFn; // Always highlight monetary fields
    const shouldHighlightTotal = query && highlightFn; // Always highlight monetary fields
    
    row.innerHTML = `
      <td class="line-item__description">${shouldHighlightDescription ? highlightFn(line.lineItemTitle, query) : line.lineItemTitle}</td>
      ${costCodeDisplay ? `<td class="line-item__cost-code">${shouldHighlightCostCode ? highlightFn(costCodeDisplay, query) : costCodeDisplay}</td>` : ''}
      <td class="line-item__type">${shouldHighlightType ? highlightFn(line.lineItemType, query) : line.lineItemType}</td>
      <td class="line-item__quantity">${shouldHighlightQuantity ? highlightFn(quantity, query) : quantity}</td>
      <td class="line-item__unit-price">${shouldHighlightUnitPrice ? highlightFn(unitPrice, query) : unitPrice}</td>
      <td class="line-item__total">${shouldHighlightTotal ? highlightFn(total, query) : total}</td>
    `;
    return row;
  };

  // Function to render table content (supports both grouped and ungrouped views)
  const renderTableContent = (container?: HTMLElement, forceShowAll: boolean = false) => {
    const targetContainer = container || wrapper;
    // Remove existing table if it exists
    const existingTable = targetContainer.querySelector('.line-items-table');
    if (existingTable) {
      existingTable.remove();
    }
    
    const table = document.createElement('table');
    table.className = 'line-items-table';
    
    // Check if any line item has cost code data
    const hasCostCodes = items.some((item: any) => item.costCode || item.costCodeName);
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    headerRow.innerHTML = `
      <th>Description</th>
      ${hasCostCodes ? '<th>Cost Code</th>' : ''}
      <th>Type</th>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Total</th>
    `;
    thead.append(headerRow);
    table.append(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    if (hasCostCodes) {
      // Render grouped by cost code category, but respect context settings
      const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
      
      // Determine which items to show based on behavior setting
      let itemsToShow: any[] = [];
      
      if (forceShowAll || shouldShowAllItems) {
        // Show all items when forceShowAll is true or behavior is show-all-always
        itemsToShow = items;
      } else if (behavior === 'hide-all-always') {
        // Don't show any items when behavior is hide-all-always
        itemsToShow = [];
      } else if (hasMatches && (behavior === 'show-matched-only' || behavior.startsWith('show-matched-with-context'))) {
        const matchingIndices = getMatchingLineItemIndices(item as any, query, isMonetarySearch);
        
        if (matchingIndices.length > 0) {
          if (settings.collapseIrrelevantLineItems && matchingIndices.length > 1) {
            // Use smart grouping logic
            const groups = groupMatchingLineItems(matchingIndices, settings.lineItemsCollapseThreshold);
            const displayRanges = calculateDisplayRanges(groups, contextCount, items.length);
            
            // Get items from display ranges
            displayRanges.forEach(range => {
              if (!range.isCollapsed) {
                for (let i = range.start; i <= range.end; i++) {
                  itemsToShow.push(items[i]);
                }
              }
            });
          } else {
            // Original logic: show all items between first and last match
            const minIndex = Math.min(...matchingIndices);
            const maxIndex = Math.max(...matchingIndices);
            
            const startIndex = Math.max(0, minIndex - contextCount);
            const endIndex = Math.min(items.length, maxIndex + contextCount + 1);
            
            itemsToShow = items.slice(startIndex, endIndex);
          }
        } else {
          // No matches found, don't show any items for matched-only behaviors
          itemsToShow = [];
        }
      } else {
        // No matches or behavior doesn't require matches: show all items
        itemsToShow = items;
      }
      
      // Now group the filtered items by cost code category
      const groups = groupLineItemsByCostCode(itemsToShow);
      const sortedCategories = Object.keys(groups).sort((a, b) => {
        // Sort categories by their numeric order (1000-1999, 2000-2999, etc.)
        const getNumericOrder = (categoryId: string) => {
          if (categoryId === 'buildertrend-default') return 9999; // Put at end
          const match = categoryId.match(/(\d+)/);
          return match ? parseInt(match[1]) : 9999;
        };
        return getNumericOrder(a) - getNumericOrder(b);
      });
      
      sortedCategories.forEach(categoryId => {
        const group = groups[categoryId];
        
        // Add category header row
        const categoryRow = document.createElement('tr');
        categoryRow.className = 'line-item__category-header';
        const colspan = hasCostCodes ? 6 : 5;
        categoryRow.innerHTML = `<td colspan="${colspan}" class="line-item__category-title">${group.categoryName}</td>`;
        tbody.append(categoryRow);
        
        // Add line items for this category
        group.items.forEach((item: any, index: number) => {
          const row = renderLineItemRow(item, index);
          tbody.append(row);
        });
      });
      
      // Add "Show all" button if there are hidden items
      if (itemsToShow.length < items.length) {
        const showAllRow = document.createElement('tr');
        showAllRow.className = 'line-item__show-all';
        const colspan = hasCostCodes ? 6 : 5;
        showAllRow.innerHTML = `
          <td colspan="${colspan}" class="line-item__show-all-content">
            <button type="button" class="line-item__show-all-button">
              Show all ${items.length} item${items.length === 1 ? '' : 's'}
            </button>
          </td>
        `;
        tbody.append(showAllRow);
        
        const showAllButton = showAllRow.querySelector('.line-item__show-all-button') as HTMLButtonElement;
        showAllButton.addEventListener('click', () => {
          // Re-render with all items
          renderTableContent(targetContainer, true);
        });
      }
    } else {
      // Render ungrouped (original logic)
      const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
      
      // Determine which items to show initially
      let displayRanges: Array<{ start: number; end: number; isCollapsed?: boolean }> = [];
      let hiddenItems: any[] = [];
      
      if (forceShowAll || shouldShowAllItems) {
        // Show all items when forceShowAll is true or behavior is show-all-always
        displayRanges = [{ start: 0, end: items.length - 1 }];
        hiddenItems = [];
      } else if (behavior === 'hide-all-always') {
        // Don't show any items when behavior is hide-all-always
        displayRanges = [];
        hiddenItems = items;
      } else if (hasMatches && (behavior === 'show-matched-only' || behavior.startsWith('show-matched-with-context'))) {
        const matchingIndices = getMatchingLineItemIndices(item as any, query, isMonetarySearch);
        
        if (matchingIndices.length > 0) {
          if (settings.collapseIrrelevantLineItems && matchingIndices.length > 1) {
            // Use smart grouping logic
            const groups = groupMatchingLineItems(matchingIndices, settings.lineItemsCollapseThreshold);
            displayRanges = calculateDisplayRanges(groups, contextCount, items.length);
            
            // Calculate hidden items (items in collapsed ranges)
            hiddenItems = [];
            displayRanges.forEach(range => {
              if (range.isCollapsed) {
                for (let i = range.start; i <= range.end; i++) {
                  hiddenItems.push(items[i]);
                }
              }
            });
          } else {
            // Original logic: show all items between first and last match
            const minIndex = Math.min(...matchingIndices);
            const maxIndex = Math.max(...matchingIndices);
            
            const startIndex = Math.max(0, minIndex - contextCount);
            const endIndex = Math.min(items.length, maxIndex + contextCount + 1);
            
            displayRanges = [{ start: startIndex, end: endIndex - 1 }];
            hiddenItems = [
              ...items.slice(0, startIndex),
              ...items.slice(endIndex)
            ];
          }
        } else {
          // No matches found, don't show any items for matched-only behaviors
          displayRanges = [];
          hiddenItems = items;
        }
      } else {
        // No matches or behavior doesn't require matches: show all items
        displayRanges = [{ start: 0, end: items.length - 1 }];
        hiddenItems = [];
      }
      
      // Track collapsed rows and their replacement content
      const collapsedRows: HTMLTableRowElement[] = [];
      const collapsedContent: HTMLTableRowElement[][] = [];

      // Render items according to display ranges
      displayRanges.forEach((range) => {
        if (range.isCollapsed) {
          // Add collapsed placeholder row
          const collapsedRow = document.createElement('tr');
          collapsedRow.className = 'line-item__collapsed';
          const itemCount = range.end - range.start + 1;
          const colspan = hasCostCodes ? 6 : 5;
          collapsedRow.innerHTML = `
            <td colspan="${colspan}" class="line-item__collapsed-content">
              <span class="line-item__collapsed-text">...</span>
              <span class="line-item__collapsed-count">${itemCount} item${itemCount === 1 ? '' : 's'}</span>
            </td>
          `;
          tbody.append(collapsedRow);
          collapsedRows.push(collapsedRow);
          
          // Create the actual content rows for this collapsed range
          const contentRows: HTMLTableRowElement[] = [];
          for (let i = range.start; i <= range.end; i++) {
            const lineItemRow = renderLineItemRow(items[i], i);
            lineItemRow.style.display = 'none'; // Initially hidden
            tbody.append(lineItemRow);
            contentRows.push(lineItemRow);
          }
          collapsedContent.push(contentRows);
          
          // Add click handler to expand/collapse
          collapsedRow.addEventListener('click', () => {
            const isExpanded = contentRows[0].style.display !== 'none';
            if (isExpanded) {
              // Collapse
              contentRows.forEach(row => row.style.display = 'none');
              collapsedRow.innerHTML = `
                <td colspan="${colspan}" class="line-item__collapsed-content">
                  <span class="line-item__collapsed-text">...</span>
                  <span class="line-item__collapsed-count">${itemCount} item${itemCount === 1 ? '' : 's'}</span>
                </td>
              `;
            } else {
              // Expand
              contentRows.forEach(row => row.style.display = '');
              collapsedRow.innerHTML = `
                <td colspan="${colspan}" class="line-item__collapsed-content">
                  <span class="line-item__collapsed-text">↑</span>
                  <span class="line-item__collapsed-count">Hide ${itemCount} item${itemCount === 1 ? '' : 's'}</span>
                </td>
              `;
            }
          });
        } else {
          // Add regular rows for this range
          for (let i = range.start; i <= range.end; i++) {
            const row = renderLineItemRow(items[i], i);
            tbody.append(row);
          }
        }
      });

      // Add "Show all" button if there are hidden items
      if (hiddenItems.length > 0) {
        const showAllRow = document.createElement('tr');
        showAllRow.className = 'line-item__show-all';
        const colspan = hasCostCodes ? 6 : 5;
        showAllRow.innerHTML = `
          <td colspan="${colspan}" class="line-item__show-all-content">
            <button type="button" class="line-item__show-all-button">
              Show all ${items.length} item${items.length === 1 ? '' : 's'}
            </button>
          </td>
        `;
        tbody.append(showAllRow);
        
        const showAllButton = showAllRow.querySelector('.line-item__show-all-button') as HTMLButtonElement;
        showAllButton.addEventListener('click', () => {
          // Re-render with all items
          renderTableContent(targetContainer, true);
        });
      }
    }
    
    table.append(tbody);
    targetContainer.append(table);
  };

  // Handle the hide-all-always behavior
  if (behavior === 'hide-all-always') {
    const toggleLink = document.createElement('button');
    toggleLink.className = 'line-items-toggle';
    toggleLink.textContent = `Show line item${items.length === 1 ? '' : 's'} (${items.length})`;
    toggleLink.type = 'button';
    
    const tableContainer = document.createElement('div');
    tableContainer.style.display = 'none';
    
    toggleLink.addEventListener('click', () => {
      if (tableContainer.style.display === 'none') {
        tableContainer.style.display = 'block';
        toggleLink.textContent = `Hide line item${items.length === 1 ? '' : 's'}`;
        // Render table content when first shown
        if (!tableContainer.querySelector('.line-items-table')) {
          renderTableContent(tableContainer);
        }
      } else {
        tableContainer.style.display = 'none';
        toggleLink.textContent = `Show line item${items.length === 1 ? '' : 's'} (${items.length})`;
      }
    });
    
    wrapper.append(toggleLink, tableContainer);
    return wrapper;
  }

  // For matched-only behaviors without matches, show a toggle link
  if ((behavior === 'show-matched-only' || behavior.startsWith('show-matched-with-context')) && !hasMatches) {
    const toggleLink = document.createElement('button');
    toggleLink.className = 'line-items-toggle';
    toggleLink.textContent = `Show line item${items.length === 1 ? '' : 's'} (${items.length})`;
    toggleLink.type = 'button';
    
    const tableContainer = document.createElement('div');
    tableContainer.style.display = 'none';
    
    toggleLink.addEventListener('click', () => {
      if (tableContainer.style.display === 'none') {
        tableContainer.style.display = 'block';
        toggleLink.textContent = `Hide line item${items.length === 1 ? '' : 's'}`;
        // Render table content when first shown
        if (!tableContainer.querySelector('.line-items-table')) {
          renderTableContent(tableContainer);
        }
      } else {
        tableContainer.style.display = 'none';
        toggleLink.textContent = `Show line item${items.length === 1 ? '' : 's'} (${items.length})`;
      }
    });
    
    wrapper.append(toggleLink, tableContainer);
    return wrapper;
  }

  // Show line items normally (for show-all-always or when there are matches for matched behaviors)
  // Render the table content using the new function
  renderTableContent();

  return wrapper;
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    title: 'Title',
    summary: 'Summary',
    project: 'Project',
    client: 'Client',
    status: 'Status',
    documentType: 'Document Type',
    author: 'Author',
    tags: 'Tags',
  };

  if (field.startsWith('lineItem') && field.includes('_')) {
    const [, index, type] = field.split('_');
    const typeLabels: Record<string, string> = {
      title: 'Line Item Title',
      description: 'Line Item Description',
      type: 'Line Item Type',
    };
    return typeLabels[type] || 'Line Item';
  }

  if (field.startsWith('metadata_')) {
    return 'Metadata';
  }

  return labels[field] || field;
}

function renderProTipsState(message: string, state: 'idle' | 'empty' | 'no-results', query?: string): string {
  const proTips = getProTips(state, query);
  
  return `
    <div class="pro-tips-state">
      ${message ? `
        <div class="pro-tips-state__header">
          <h2 class="pro-tips-state__title">${message}</h2>
        </div>
      ` : ''}
      <div class="pro-tips-state__content">
        <div class="pro-tips">
          <h3 class="pro-tips__title">Pro Tips & Tricks</h3>
          <div class="pro-tips__grid">
            ${proTips.map(tip => `
              <div class="pro-tip">
                <div class="pro-tip__content">
                  <h4 class="pro-tip__title">
                    <span class="pro-tip__icon">${tip.icon}</span>
                    ${tip.title}
                  </h4>
                  <p class="pro-tip__description">${tip.description}</p>
                  <div class="pro-tip__examples">
                    ${tip.examples.map(example => `
                      <code class="pro-tip__example">${example}</code>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function getProTips(state: 'idle' | 'empty' | 'no-results', query?: string): Array<{
  icon: string;
  title: string;
  description: string;
  examples: string[];
}> {
  const tips: Array<{
    icon: string;
    title: string;
    description: string;
    examples: string[];
  }> = [];

  // Always include basic search tips
  tips.push({
    icon: '🔍',
    title: 'Basic Text Search',
    description: 'Search for any text in titles, summaries, projects, clients, and more.',
    examples: ['kitchen renovation', 'John Smith', 'Project Alpha']
  });

  // Add monetary search tips
  tips.push({
    icon: '💰',
    title: 'Monetary Searches',
    description: 'Find invoices, bills, and receipts by exact amounts or ranges.',
    examples: ['$1234.56', '$500-$1000', '1234.56', '1000 to 2000']
  });

  // Add range search tips
  tips.push({
    icon: '📊',
    title: 'Range Queries',
    description: 'Search for amounts within specific ranges using various formats.',
    examples: ['$500-$1000', '1000 to 2000', '$50k-$100k']
  });

  // Add entity type tips
  tips.push({
    icon: '📋',
    title: 'Entity Types',
    description: 'Search for specific types of records and documents.',
    examples: ['invoices', 'contracts', 'people', 'organizations']
  });

  // Add project/client tips
  tips.push({
    icon: '🏗️',
    title: 'Project & Client Search',
    description: 'Find records related to specific projects or clients.',
    examples: ['Project Alpha', 'Smith Construction', 'residential']
  });

  // Add date-based tips
  tips.push({
    icon: '📅',
    title: 'Date-Based Search',
    description: 'Search for records by date ranges, recent activity, or time periods.',
    examples: ['recent', 'last month', '2024', 'Q1 2024']
  });

  // Add Buildertrend-specific tips
  tips.push({
    icon: '⚡',
    title: 'Buildertrend Navigation',
    description: 'Use trigger queries to quickly navigate to specific Buildertrend sections.',
    examples: ['schedule', 'estimates', 'change orders', 'punch list']
  });

  // Add line item tips
  tips.push({
    icon: '📝',
    title: 'Line Item Details',
    description: 'Search within detailed line items of invoices and purchase orders.',
    examples: ['lumber', 'labor', 'materials', 'equipment']
  });

  // Add status-based tips
  tips.push({
    icon: '📊',
    title: 'Status Filters',
    description: 'Find records by their current status or workflow stage.',
    examples: ['pending', 'approved', 'paid', 'overdue']
  });

  // Add advanced search tips
  tips.push({
    icon: '🎯',
    title: 'Advanced Techniques',
    description: 'Combine multiple search terms and use facets to refine results.',
    examples: ['kitchen AND renovation', 'invoice AND pending', 'Smith OR Johnson']
  });

  // Customize tips based on state
  if (state === 'no-results' && query) {
    // Add troubleshooting tips for no results
    tips.unshift({
      icon: '🔧',
      title: 'No Results? Try These',
      description: 'Adjust your search strategy when no results are found.',
      examples: [
        'Use fewer keywords',
        'Check spelling',
        'Try broader terms',
        'Use different formats'
      ]
    });
  }

  if (state === 'idle') {
    // For idle state, emphasize getting started
    tips.unshift({
      icon: '🚀',
      title: 'Get Started',
      description: 'Begin your search with any of these popular search types.',
      examples: ['$5000', 'kitchen', 'Smith Construction', 'recent invoices']
    });
  }

  return tips;
}

/**
 * Render related items section
 */
function renderRelatedItems(relatedEntities: SearchRecord[], sourceEntityId: string): HTMLElement {
  const section = document.createElement('div');
  section.className = 'result-card__related-items';

  const header = document.createElement('h4');
  header.className = 'related-items__header';
  header.textContent = 'Related Items';

  const itemsList = document.createElement('div');
  itemsList.className = 'related-items__list';

  relatedEntities.forEach(entity => {
    const item = document.createElement('div');
    item.className = 'related-item';
    
    // Add confidence class for styling
    const confidence = getRelationshipConfidence(sourceEntityId, entity.id);
    if (confidence) {
      item.classList.add(`related-item--${confidence}`);
    }

    const title = document.createElement('span');
    title.className = 'related-item__title';
    title.textContent = entity.title;

    const type = document.createElement('span');
    type.className = 'related-item__type';
    type.textContent = formatEntityType(entity.entityType);

    item.append(title, type);
    itemsList.append(item);
  });

  section.append(header, itemsList);
  return section;
}

/**
 * Render smart actions section
 */
function renderSmartActions(smartActions: SmartAction[], entity: SearchRecord): HTMLElement {
  const section = document.createElement('div');
  section.className = 'result-card__smart-actions';

  const header = document.createElement('h4');
  header.className = 'smart-actions__header';
  header.textContent = 'Quick Actions';

  const actionsList = document.createElement('div');
  actionsList.className = 'smart-actions__list';

  smartActions.forEach((action, index) => {
    const actionElement = document.createElement('a');
    actionElement.href = action.href;
    actionElement.className = index === 0 ? 'smart-action smart-action--primary' : 'smart-action smart-action--secondary';
    actionElement.textContent = action.label;
    actionElement.title = action.description || action.label;
    
    // Add data attributes for future functionality
    actionElement.setAttribute('data-action-id', action.id);
    actionElement.setAttribute('data-entity-id', entity.id);
    actionElement.setAttribute('data-entity-type', entity.entityType);

    actionsList.append(actionElement);
  });

  section.append(header, actionsList);
  return section;
}

/**
 * Get relationship confidence for styling (simplified for now)
 */
function getRelationshipConfidence(sourceId: string, targetId: string): string | null {
  // This is a simplified version - in a real implementation, you'd look up the actual relationship
  // For now, we'll use a simple heuristic based on entity types
  return 'explicit'; // Default to explicit for now
}

function renderFacetProTips(state: 'idle' | 'empty' | 'no-results'): string {
  const facetTips = getFacetProTips(state);
  
  return `
    <div class="facet-pro-tips">
      <h3 class="facet-pro-tips__title">Filter & Refine</h3>
      <div class="facet-pro-tips__list">
        ${facetTips.map(tip => `
          <div class="facet-pro-tip">
            <div class="facet-pro-tip__icon">${tip.icon}</div>
            <div class="facet-pro-tip__content">
              <h4 class="facet-pro-tip__title">${tip.title}</h4>
              <p class="facet-pro-tip__description">${tip.description}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getFacetProTips(state: 'idle' | 'empty' | 'no-results'): Array<{
  icon: string;
  title: string;
  description: string;
}> {
  const tips: Array<{
    icon: string;
    title: string;
    description: string;
  }> = [];

  if (state === 'idle') {
    tips.push({
      icon: '🔍',
      title: 'Search First',
      description: 'Run a search to see filter options and refine your results.'
    });
    
    tips.push({
      icon: '⚡',
      title: 'Quick Filters',
      description: 'Use facets to narrow down results by type, project, status, and more.'
    });
  } else {
    tips.push({
      icon: '📊',
      title: 'Type Filters',
      description: 'Filter by Document, Invoice, Person, Organization, or Buildertrend records.'
    });
    
    tips.push({
      icon: '🏗️',
      title: 'Project & Client',
      description: 'Narrow results to specific projects or clients.'
    });
    
    tips.push({
      icon: '💰',
      title: 'Amount Ranges',
      description: 'Filter financial records by total value ranges.'
    });
    
    tips.push({
      icon: '📅',
      title: 'Date Filters',
      description: 'Find records by issue date ranges (last week, month, year).'
    });
    
    tips.push({
      icon: '📋',
      title: 'Status Filters',
      description: 'Filter by record status like pending, approved, or paid.'
    });
    
    tips.push({
      icon: '🎯',
      title: 'Advanced Grouping',
      description: 'Group results by type, project, status, or client for better organization.'
    });
  }

  return tips;
}
