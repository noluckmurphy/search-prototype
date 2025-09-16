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
import { findBestMatch, getContextSnippet, highlightText, highlightMonetaryValues } from '../utils/highlight';
import { settingsStore } from '../state/settingsStore';

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

  const title = document.createElement('h3');
  title.innerHTML = query ? (isMonetarySearch ? highlightMonetaryValues(item.title, query) : highlightText(item.title, query)) : item.title;

  const badge = document.createElement('span');
  badge.className = 'result-card__badge';
  badge.textContent = formatEntityType(item.entityType);

  header.append(title, badge);

  const summary = document.createElement('p');
  summary.className = 'result-card__summary';
  summary.innerHTML = query ? (isMonetarySearch ? highlightMonetaryValues(item.summary, query) : highlightText(item.summary, query)) : item.summary;

  const metaList = document.createElement('ul');
  metaList.className = 'result-card__meta';
  metaList.append(...buildMetaItems(item, query, isMonetarySearch));

  card.append(header, summary, metaList);

  // Add context line if the match is not in title or summary
  if (query) {
    const match = findBestMatch(item, query);
    if (match && match.field !== 'title' && match.field !== 'summary') {
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

function renderLineItems(item: SearchRecord, query?: string, isMonetarySearch?: boolean): HTMLElement | null {
  const financial = item as any;
  const items = financial.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'result-card__line-items';

  const heading = document.createElement('h4');
  heading.textContent = 'Line items';
  wrapper.append(heading);

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
  
  const settings = settingsStore.getState();
  const contextCount = settings.lineItemsContextCount;
  const displayItems = contextCount === 0 ? items : items.slice(0, contextCount);
  displayItems.forEach((line: any) => {
    const row = document.createElement('tr');
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    
    row.innerHTML = `
      <td class="line-item__description">${query ? (isMonetarySearch ? highlightMonetaryValues(line.lineItemTitle, query) : highlightText(line.lineItemTitle, query)) : line.lineItemTitle}</td>
      <td class="line-item__type">${query ? (isMonetarySearch ? highlightMonetaryValues(line.lineItemType, query) : highlightText(line.lineItemType, query)) : line.lineItemType}</td>
      <td class="line-item__quantity">${query ? (isMonetarySearch ? highlightMonetaryValues(quantity, query) : quantity) : quantity}</td>
      <td class="line-item__unit-price">${query ? (isMonetarySearch ? highlightMonetaryValues(unitPrice, query) : unitPrice) : unitPrice}</td>
      <td class="line-item__total">${query ? (isMonetarySearch ? highlightMonetaryValues(total, query) : total) : total}</td>
    `;
    tbody.append(row);
  });

  // Add "more items" row if there are additional items and we're not showing all
  if (contextCount > 0 && items.length > contextCount) {
    const moreRow = document.createElement('tr');
    moreRow.className = 'line-item__more-row';
    const remaining = items.length - contextCount;
    moreRow.innerHTML = `
      <td colspan="5" class="line-item__more">${remaining} more line item${remaining === 1 ? '' : 's'}…</td>
    `;
    tbody.append(moreRow);
  }

  table.append(tbody);
  wrapper.append(table);
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
