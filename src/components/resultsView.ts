import {
  FacetKey,
  FacetSelectionState,
  FacetValue,
  SearchGroup,
  SearchRecord,
  SearchResponse,
} from '../types';
import { formatCurrency, formatDate, formatEntityType } from '../utils/format';
import { SearchStatus } from '../state/appState';
import { findBestMatch, getContextSnippet, highlightText, highlightMonetaryValues, highlightHybrid } from '../utils/highlight';
import { settingsStore } from '../state/settingsStore';

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

  const render = (context: ResultsRenderContext) => {
    const { response, selections, status, query, errorMessage, isMonetarySearch } = context;

    renderSummary(summaryEl, status, response, query, errorMessage);
    renderFacets(facetsContainer, status, response, selections, options);
    renderGroups(resultsContainer, status, response, query, errorMessage, isMonetarySearch);

    const hasSelections = selections && Object.keys(selections).length > 0;
    clearButton.hidden = !hasSelections;
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
      target.textContent = 'Type a query to explore results and filters.';
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

  facetsEntries.forEach(([key, values]) => {
    const block = document.createElement('section');
    block.className = 'results-view__facet-block';

    const heading = document.createElement('h3');
    heading.textContent = FACET_LABELS[key] ?? key;
    block.append(heading);

    const list = document.createElement('ul');
    list.className = 'results-view__facet-list';

    values.forEach((facet) => {
      const listItem = document.createElement('li');
      listItem.className = 'results-view__facet-item';

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
    container.innerHTML = '<p class="results-view__empty">Run a search to populate full results.</p>';
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
  card.className = 'result-card';

  const header = document.createElement('div');
  header.className = 'result-card__header';

  const highlightFn = query ? getHighlightFunction(query, isMonetarySearch || false) : null;

  const title = document.createElement('h3');
  title.innerHTML = query && highlightFn ? highlightFn(item.title, query) : item.title;

  const badge = document.createElement('span');
  badge.className = 'result-card__badge';
  badge.textContent = formatEntityType(item.entityType);

  header.append(title, badge);

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

  if (item.entityType !== 'Document') {
    const lineItemsBlock = renderLineItems(item, query, isMonetarySearch);
    if (lineItemsBlock) {
      card.append(lineItemsBlock);
    }
  }

  return card;
}

function buildMetaItems(item: SearchRecord, query?: string, isMonetarySearch?: boolean): HTMLLIElement[] {
  const metas: HTMLLIElement[] = [];

  const project = document.createElement('li');
  project.innerHTML = `<span>Project</span><strong>${query ? (isMonetarySearch ? highlightMonetaryValues(item.project, query) : highlightText(item.project, query)) : item.project}</strong>`;
  metas.push(project);

  const status = document.createElement('li');
  status.innerHTML = `<span>Status</span><strong>${query ? (isMonetarySearch ? highlightMonetaryValues(item.status, query) : highlightText(item.status, query)) : item.status}</strong>`;
  metas.push(status);

  if (item.entityType === 'Document') {
    const doc = item as any;

    const docType = document.createElement('li');
    docType.innerHTML = `<span>Type</span><strong>${query ? (isMonetarySearch ? highlightMonetaryValues(doc.documentType, query) : highlightText(doc.documentType, query)) : doc.documentType}</strong>`;
    metas.push(docType);

    const updated = document.createElement('li');
    updated.innerHTML = `<span>Updated</span><strong>${formatDate(item.updatedAt)}</strong>`;
    metas.push(updated);
  } else {
    const financial = item as any;

    const issued = document.createElement('li');
    issued.innerHTML = `<span>Issued</span><strong>${formatDate(financial.issuedDate)}</strong>`;
    metas.push(issued);

    if (financial.dueDate) {
      const due = document.createElement('li');
      due.innerHTML = `<span>Due</span><strong>${formatDate(financial.dueDate)}</strong>`;
      metas.push(due);
    }

    const total = document.createElement('li');
    const totalValue = formatCurrency(financial.totalValue);
    total.innerHTML = `<span>Total</span><strong>${query ? (isMonetarySearch ? highlightMonetaryValues(totalValue, query) : highlightText(totalValue, query)) : totalValue}</strong>`;
    metas.push(total);
  }

  return metas;
}

function hasLineItemMatches(item: SearchRecord, query?: string, isMonetarySearch?: boolean): boolean {
  if (!query) return false;
  
  const financial = item as any;
  const items = financial.lineItems ?? [];
  if (items.length === 0) return false;

  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);

  // Check if any line item has actual highlighting matches
  return items.some((lineItem: any) => {
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
  if (!query) return [];
  
  const financial = item as any;
  const items = financial.lineItems ?? [];
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

function renderLineItems(item: SearchRecord, query?: string, isMonetarySearch?: boolean): HTMLElement | null {
  const financial = item as any;
  const items = financial.lineItems ?? [];
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
  heading.textContent = 'Line items';
  wrapper.append(heading);

  // If we shouldn't show line items by default and there are no matches, show a toggle link
  if (!shouldShowLineItems) {
    const toggleLink = document.createElement('button');
    toggleLink.className = 'line-items-toggle';
    toggleLink.textContent = `Show line items (${items.length})`;
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
        toggleLink.textContent = 'Hide line items';
      } else {
        table.style.display = 'none';
        toggleLink.textContent = `Show line items (${items.length})`;
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
  
  // Determine which items to show
  let displayItems: any[];
  let remainingItems: any[] = [];
  
  if (hasMatches && contextCount > 0) {
    // When there are matches, always include matched items and show context around them
    const matchingIndices = getMatchingLineItemIndices(item, query, isMonetarySearch);
    
    if (matchingIndices.length > 0) {
      // Find the range of items to show around matches
      const minIndex = Math.min(...matchingIndices);
      const maxIndex = Math.max(...matchingIndices);
      
      // Calculate start and end indices with context
      const startIndex = Math.max(0, minIndex - contextCount);
      const endIndex = Math.min(items.length, maxIndex + contextCount + 1);
      
      displayItems = items.slice(startIndex, endIndex);
      remainingItems = [
        ...items.slice(0, startIndex),
        ...items.slice(endIndex)
      ];
    } else {
      // Fallback: show first contextCount items
      displayItems = items.slice(0, contextCount);
      remainingItems = items.slice(contextCount);
    }
  } else {
    // No matches or contextCount is 0: show all items
    displayItems = items;
    remainingItems = [];
  }
  
  // Render visible items
  displayItems.forEach((line: any) => {
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

  // Add remaining items (initially hidden) if there are any
  const hiddenRows: HTMLTableRowElement[] = [];
  remainingItems.forEach((line: any) => {
    const row = document.createElement('tr');
    row.style.display = 'none';
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
    hiddenRows.push(row);
  });

  table.append(tbody);
  wrapper.append(table);

  // Add toggle button for remaining items if there are any
  if (remainingItems.length > 0) {
    const toggleButton = document.createElement('button');
    toggleButton.className = 'line-items-toggle';
    toggleButton.type = 'button';
    const remainingCount = remainingItems.length;
    toggleButton.textContent = `Show ${remainingCount} more line item${remainingCount === 1 ? '' : 's'}`;
    
    toggleButton.addEventListener('click', () => {
      const isHidden = hiddenRows[0]?.style.display === 'none';
      
      if (isHidden) {
        // Show remaining items
        hiddenRows.forEach(row => {
          row.style.display = '';
        });
        toggleButton.textContent = `Hide ${remainingCount} line item${remainingCount === 1 ? '' : 's'}`;
      } else {
        // Hide remaining items
        hiddenRows.forEach(row => {
          row.style.display = 'none';
        });
        toggleButton.textContent = `Show ${remainingCount} more line item${remainingCount === 1 ? '' : 's'}`;
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
