import { SearchGroup, SearchRecord, SearchResponse } from '../types';
import { formatCurrency, formatDate, formatEntityType } from '../utils/format';
import { SearchStatus } from '../state/appState';
import { findBestMatch, getContextSnippet, highlightText, highlightMonetaryValues } from '../utils/highlight';

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

  const setState = (state: SearchDialogState) => {
    dialog.hidden = !state.visible;
    dialog.classList.toggle('monetary-search', state.isMonetarySearch || false);

    if (dialog.hidden) {
      dialog.innerHTML = '';
      dialog.style.display = 'none';
      return;
    }

    dialog.style.display = 'flex';
    renderDialogContents(dialog, state, options);
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

  if (!state.query.trim() && state.status === 'idle') {
    container.append(renderEmptyState());
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

  const title = document.createElement('div');
  title.className = 'search-dialog__item-title';
  title.innerHTML = isMonetarySearch ? highlightMonetaryValues(item.title, query) : highlightText(item.title, query);

  const meta = document.createElement('div');
  meta.className = 'search-dialog__item-meta';
  const metaText = buildItemMeta(item, query, isMonetarySearch);
  meta.innerHTML = isMonetarySearch ? highlightMonetaryValues(metaText, query) : metaText;

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

  return li;
}

function buildItemMeta(item: SearchRecord, query?: string, isMonetarySearch?: boolean): string {
  const parts: string[] = [];
  parts.push(item.project);

  if (item.entityType === 'Document') {
    parts.push((item as any).documentType);
    parts.push(`Updated ${formatDate(item.updatedAt)}`);
  } else {
    const financialItem = item as any;
    if (typeof financialItem.totalValue === 'number') {
      parts.push(formatCurrency(financialItem.totalValue));
    }
    if (financialItem.status) {
      parts.push(financialItem.status);
    }
  }

  return parts.filter(Boolean).join(' • ');
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}
