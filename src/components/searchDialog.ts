import { SearchGroup, SearchRecord, SearchResponse } from '../types';
import { formatCurrency, formatDate, formatEntityType } from '../utils/format';
import { SearchStatus } from '../state/appState';

export interface SearchDialogState {
  visible: boolean;
  status: SearchStatus;
  query: string;
  response: SearchResponse | null;
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

    if (dialog.hidden) {
      dialog.innerHTML = '';
      return;
    }

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

  container.append(renderResultsSummary(response));

  response.limitedGroups.forEach((group) => {
    container.append(renderGroup(group));
  });

  const footer = document.createElement('div');
  footer.className = 'search-dialog__footer';

  const seeAllButton = document.createElement('button');
  seeAllButton.type = 'button';
  seeAllButton.className = 'see-all-button';
  seeAllButton.textContent = 'See all results';
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

function renderResultsSummary(response: SearchResponse): HTMLElement {
  const summary = document.createElement('div');
  summary.className = 'search-dialog__summary';
  summary.textContent = `${response.totalResults} result${
    response.totalResults === 1 ? '' : 's'
  } for “${response.query}”`;
  return summary;
}

function renderGroup(group: SearchGroup): HTMLElement {
  const section = document.createElement('section');
  section.className = 'search-dialog__group';

  const heading = document.createElement('h4');
  heading.textContent = formatEntityType(group.entityType, { plural: true });
  section.append(heading);

  const list = document.createElement('ul');
  list.className = 'search-dialog__list';

  group.items.forEach((item) => {
    list.append(renderGroupItem(item));
  });

  section.append(list);
  return section;
}

function renderGroupItem(item: SearchRecord): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'search-dialog__item';

  const title = document.createElement('div');
  title.className = 'search-dialog__item-title';
  title.textContent = item.title;

  const meta = document.createElement('div');
  meta.className = 'search-dialog__item-meta';
  meta.textContent = buildItemMeta(item);

  li.append(title, meta);
  return li;
}

function buildItemMeta(item: SearchRecord): string {
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
