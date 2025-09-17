import {
  BuildertrendRecord,
  FacetKey,
  FacetSelectionState,
  FacetValue,
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
import { findBestMatch, getContextSnippet, highlightText, highlightMonetaryValues, highlightHybrid } from '../utils/highlight';
import { settingsStore } from '../state/settingsStore';
import { MIN_EFFECTIVE_QUERY_LENGTH, isQueryTooShort } from '../utils/query';

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
    return highlightMonetaryValues;
  } else if (hasMonetaryPotential(query)) {
    return highlightHybrid;
  } else {
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
};

export interface ResultsViewOptions {
  onFacetToggle(key: FacetKey, value: string): void;
  onClearFacets?(): void;
}

export interface ResultsRenderContext {
  response: SearchResponse | null;
  selections: FacetSelectionState;
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
    const { response, selections, status, query, errorMessage, isMonetarySearch } = context;

    // Only update summary if relevant state changed
    const summaryChanged = !previousContext ||
      previousContext.status !== status ||
      previousContext.response !== response ||
      previousContext.query !== query ||
      previousContext.errorMessage !== errorMessage;

    if (summaryChanged) {
      renderSummary(summaryEl, status, response, query, errorMessage);
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
      previousContext.isMonetarySearch !== isMonetarySearch;

    if (resultsChanged) {
      // Use requestAnimationFrame to defer heavy DOM operations
      requestAnimationFrame(() => {
        renderGroups(resultsContainer, status, response, query, errorMessage, isMonetarySearch);
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
) {
  switch (status) {
    case 'idle':
      if (isQueryTooShort(query)) {
        target.textContent = `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.`;
      } else {
        target.textContent = 'Type a query to explore results and filters.';
      }
      return;
    case 'loading':
      target.textContent = query ? `Searching for “${query}”…` : 'Searching…';
      return;
    case 'error':
      target.textContent = errorMessage ?? 'Search failed. Try again.';
      return;
    case 'ready':
      if (!response) {
        target.textContent = 'No results.';
        return;
      }
      target.textContent = `${response.totalResults} result${
        response.totalResults === 1 ? '' : 's'
      } for “${response.query}”.`;
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
    container.textContent = 'Facet breakdowns will appear once you run a search.';
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
    container.textContent = 'No facet data for the current results.';
    return;
  }

  const facetsEntries = Object.entries(response.facets) as [FacetKey, FacetValue[]][];
  if (facetsEntries.length === 0) {
    container.classList.add('is-empty');
    container.textContent = 'No facet data for the current results.';
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
      text.textContent = facet.value;

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
) {
  container.innerHTML = '';

  if (status === 'idle') {
    const message = isQueryTooShort(query)
      ? `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see matching records.`
      : 'Run a search to populate full results.';
    container.innerHTML = `<p class="results-view__empty">${message}</p>`;
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
    container.innerHTML = `<p class="results-view__empty">No results for "${query}". Adjust search terms or facets.</p>`;
    return;
  }

  // If results are grouped, render groups; otherwise render as flat list
  if (response.isGrouped) {
    response.fullGroups.forEach((group) => {
      container.append(renderGroup(group, group.groupTitle, query, isMonetarySearch));
    });
  } else {
    // Render as flat list without group headers
    const flatList = document.createElement('div');
    flatList.className = 'results-list';
    
    response.records.forEach((record) => {
      flatList.append(renderResultCard(record, query, isMonetarySearch));
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

  group.items.forEach((item) => {
    list.append(renderResultCard(item, query, isMonetarySearch));
  });

  section.append(heading, list);
  return section;
}

function renderResultCard(item: SearchRecord, query?: string, isMonetarySearch?: boolean): HTMLElement {
  const card = document.createElement('article');
  
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
      const highlightedSnippet = isMonetarySearch ? highlightMonetaryValues(match.content, query) : getContextSnippet(match, 120, query);
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
    const searchableFields = [
      lineItem.lineItemTitle,
      lineItem.lineItemDescription,
      lineItem.lineItemType,
      lineItem.lineItemQuantity?.toString(),
      lineItem.lineItemQuantityUnitOfMeasure,
      formatCurrency(lineItem.lineItemUnitPrice),
      formatCurrency(lineItem.lineItemTotal)
    ];
    
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
    const searchableFields = [
      lineItem.lineItemTitle,
      lineItem.lineItemDescription,
      lineItem.lineItemType,
      lineItem.lineItemQuantity?.toString(),
      lineItem.lineItemQuantityUnitOfMeasure,
      formatCurrency(lineItem.lineItemUnitPrice),
      formatCurrency(lineItem.lineItemTotal)
    ];
    
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
  
  // If there are matches in line items, always show them (respect lineItemsContextCount setting)
  // If no matches, respect the showLineItemsByDefault setting
  const shouldShowLineItems = hasMatches || settings.showLineItemsByDefault;

  const wrapper = document.createElement('div');
  wrapper.className = 'result-card__line-items';

  const heading = document.createElement('h4');
  heading.textContent = `Line item${items.length === 1 ? '' : 's'}`;
  wrapper.append(heading);

  // Helper function to render a line item row
  const renderLineItemRow = (line: any, index: number): HTMLTableRowElement => {
    const row = document.createElement('tr');
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
    
    row.innerHTML = `
      <td class="line-item__description">${query && highlightFn ? highlightFn(line.lineItemTitle, query) : line.lineItemTitle}</td>
      <td class="line-item__type">${query && highlightFn ? highlightFn(line.lineItemType, query) : line.lineItemType}</td>
      <td class="line-item__quantity">${query && highlightFn ? highlightFn(quantity, query) : quantity}</td>
      <td class="line-item__unit-price">${query && highlightFn ? highlightFn(unitPrice, query) : unitPrice}</td>
      <td class="line-item__total">${query && highlightFn ? highlightFn(total, query) : total}</td>
    `;
    return row;
  };

  // If we shouldn't show line items by default and there are no matches, show a toggle link
  if (!shouldShowLineItems) {
    const toggleLink = document.createElement('button');
    toggleLink.className = 'line-items-toggle';
    toggleLink.textContent = `Show line item${items.length === 1 ? '' : 's'} (${items.length})`;
    toggleLink.type = 'button';
    
    const table = document.createElement('table');
    table.className = 'line-items-table';
    table.style.display = 'none';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th>Description</th>
      <th>Type</th>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Total</th>
    `;
    thead.append(headerRow);
    table.append(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
    
    items.forEach((line: any) => {
      const row = document.createElement('tr');
      const unitPrice = formatCurrency(line.lineItemUnitPrice);
      const total = formatCurrency(line.lineItemTotal);
      const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
      
      row.innerHTML = `
        <td class="line-item__description">${query && highlightFn ? highlightFn(line.lineItemTitle, query) : line.lineItemTitle}</td>
        <td class="line-item__type">${query && highlightFn ? highlightFn(line.lineItemType, query) : line.lineItemType}</td>
        <td class="line-item__quantity">${query && highlightFn ? highlightFn(quantity, query) : quantity}</td>
        <td class="line-item__unit-price">${query && highlightFn ? highlightFn(unitPrice, query) : unitPrice}</td>
        <td class="line-item__total">${query && highlightFn ? highlightFn(total, query) : total}</td>
      `;
      tbody.append(row);
    });
    table.append(tbody);
    
    toggleLink.addEventListener('click', () => {
      if (table.style.display === 'none') {
        table.style.display = 'table';
        toggleLink.textContent = `Hide line item${items.length === 1 ? '' : 's'}`;
      } else {
        table.style.display = 'none';
        toggleLink.textContent = `Show line item${items.length === 1 ? '' : 's'} (${items.length})`;
      }
    });
    
    wrapper.append(toggleLink, table);
    return wrapper;
  }

  // Show line items normally (either because there are matches or setting is enabled)
  const table = document.createElement('table');
  table.className = 'line-items-table';

  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th>Description</th>
    <th>Type</th>
    <th>Quantity</th>
    <th>Unit Price</th>
    <th>Total</th>
  `;
  thead.append(headerRow);
  table.append(thead);

  // Create table body
  const tbody = document.createElement('tbody');
  
  const contextCount = settings.lineItemsContextCount;
  const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;
  
  // Determine which items to show initially
  let displayRanges: Array<{ start: number; end: number; isCollapsed?: boolean }> = [];
  let hiddenItems: any[] = [];
  
  if (hasMatches && contextCount > 0) {
    const matchingIndices = getMatchingLineItemIndices(item, query, isMonetarySearch);
    
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
      // Fallback: show first contextCount items
      displayRanges = [{ start: 0, end: Math.min(contextCount - 1, items.length - 1) }];
      hiddenItems = items.slice(contextCount);
    }
  } else {
    // No matches or contextCount is 0: show all items
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
      collapsedRow.innerHTML = `
        <td colspan="5" class="line-item__collapsed-content">
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
    } else {
      // Add regular line item rows for this range
      for (let i = range.start; i <= range.end; i++) {
        const lineItemRow = renderLineItemRow(items[i], i);
        tbody.append(lineItemRow);
      }
    }
  });

  // Add hidden items (initially hidden) if there are any
  const hiddenRows: HTMLTableRowElement[] = [];
  hiddenItems.forEach((line: any) => {
    const lineItemRow = renderLineItemRow(line, 0); // index doesn't matter for hidden items
    lineItemRow.style.display = 'none';
    tbody.append(lineItemRow);
    hiddenRows.push(lineItemRow);
  });

  table.append(tbody);
  wrapper.append(table);

  // Calculate total hidden count (collapsed content + hidden items)
  const totalCollapsedCount = collapsedContent.reduce((sum, rows) => sum + rows.length, 0);
  const totalHiddenCount = totalCollapsedCount + hiddenItems.length;

  // Add single toggle button for all hidden content if there are any
  if (totalHiddenCount > 0) {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'line-items-toggle';
    toggleButton.type = 'button';
    toggleButton.textContent = `Show ${totalHiddenCount} more line item${totalHiddenCount === 1 ? '' : 's'}`;
    
    toggleButton.addEventListener('click', () => {
      const isHidden = hiddenRows[0]?.style.display === 'none';
      
      if (isHidden) {
        // Show all hidden content
        // Hide collapsed placeholder rows
        collapsedRows.forEach(row => {
          row.style.display = 'none';
        });
        // Show collapsed content
        collapsedContent.forEach(contentRows => {
          contentRows.forEach(row => {
            row.style.display = '';
          });
        });
        // Show hidden items
        hiddenRows.forEach(row => {
          row.style.display = '';
        });
        toggleButton.textContent = `Hide ${totalHiddenCount} line item${totalHiddenCount === 1 ? '' : 's'}`;
      } else {
        // Hide all hidden content
        // Show collapsed placeholder rows
        collapsedRows.forEach(row => {
          row.style.display = '';
        });
        // Hide collapsed content
        collapsedContent.forEach(contentRows => {
          contentRows.forEach(row => {
            row.style.display = 'none';
          });
        });
        // Hide hidden items
        hiddenRows.forEach(row => {
          row.style.display = 'none';
        });
        toggleButton.textContent = `Show ${totalHiddenCount} more line item${totalHiddenCount === 1 ? '' : 's'}`;
      }
    });
    
    wrapper.append(toggleButton);
  }

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
