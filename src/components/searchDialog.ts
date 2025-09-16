import {
  SearchGroup,
  SearchRecord,
  SearchResponse,
  isFinancialRecord,
  isOrganizationRecord,
  isPersonRecord,
} from '../types';
import { formatCurrency, formatDate, formatEntityType } from '../utils/format';
import { SearchStatus } from '../state/appState';
import { findBestMatch, getContextSnippet, highlightText, highlightMonetaryValues, highlightHybrid } from '../utils/highlight';
import { getEffectiveQueryLength, isQueryTooShort, MIN_EFFECTIVE_QUERY_LENGTH } from '../utils/query';

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

export interface SearchDialogState {
  visible: boolean;
  status: SearchStatus;
  query: string;
  response: SearchResponse | null;
  isMonetarySearch?: boolean;
}

export interface SearchDialogOptions {
  onSeeAllResults(): void;
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

  const setState = (state: SearchDialogState) => {
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

    // Re-render content if visibility changed OR if relevant state changed
    const contentChanged = visibilityChanged ||
      !previousState ||
      previousState.status !== state.status ||
      previousState.query !== state.query ||
      previousState.response !== state.response;

    if (contentChanged) {
      // Use requestAnimationFrame to defer heavy DOM operations
      requestAnimationFrame(() => {
        renderDialogContents(dialog, state, options);
      });
    }

    previousState = state;
  };

  return {
    element: dialog,
    setState,
  };
}

function renderDialogContents(
  container: HTMLDivElement,
  state: SearchDialogState,
  options: SearchDialogOptions,
) {
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
    container.append(renderEmptyState());
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

  response.limitedGroups.forEach((group) => {
    container.append(renderGroup(group, state.query, state.isMonetarySearch));
  });

  const footer = document.createElement('div');
  footer.className = 'search-dialog__footer';

  const seeAllButton = document.createElement('button');
  seeAllButton.type = 'button';
  seeAllButton.className = 'see-all-button';
  seeAllButton.textContent = `See ${response.totalResults} results →`;
  seeAllButton.addEventListener('click', () => options.onSeeAllResults());

  footer.append(seeAllButton);
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


function renderGroup(group: SearchGroup, query: string, isMonetarySearch?: boolean): HTMLElement {
  const section = document.createElement('section');
  section.className = 'search-dialog__group';

  const heading = document.createElement('h4');
  heading.textContent = formatEntityType(group.entityType, { plural: true });
  section.append(heading);

  const list = document.createElement('ul');
  list.className = 'search-dialog__list';

  group.items.forEach((item) => {
    list.append(renderGroupItem(item, query, isMonetarySearch));
  });

  section.append(list);
  return section;
}

function renderGroupItem(item: SearchRecord, query: string, isMonetarySearch?: boolean): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'search-dialog__item';

  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);

  const title = document.createElement('div');
  title.className = 'search-dialog__item-title';
  title.innerHTML = highlightFn(item.title, query);

  const meta = document.createElement('div');
  meta.className = 'search-dialog__item-meta';
  const metaText = buildItemMeta(item, query, isMonetarySearch);
  meta.innerHTML = highlightFn(metaText, query);

  // Add context line showing what was matched
  const match = findBestMatch(item, query);
  if (match && match.field !== 'title') {
    const context = document.createElement('div');
    context.className = 'search-context';
    const highlightedSnippet = isMonetarySearch ? highlightMonetaryValues(match.content, query) : getContextSnippet(match, 80, query);
    context.innerHTML = highlightedSnippet;
    li.append(title, meta, context);
  } else {
    li.append(title, meta);
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
