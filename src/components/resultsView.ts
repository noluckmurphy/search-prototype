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

const FACET_LABELS: Record<FacetKey, string> = {
  entityType: 'Type',
  project: 'Project',
  status: 'Status',
  documentType: 'Document Type',
  client: 'Client',
  issuedDate: 'Issued',
  totalValue: 'Total',
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
      <h1>Search results</h1>
      <p class="results-view__summary" id="results-summary"></p>
    </div>
    <div class="results-view__actions">
      <button type="button" class="clear-facets" hidden>Clear filters</button>
    </div>
  `;

  const facetsContainer = document.createElement('div');
  facetsContainer.className = 'results-view__facets';

  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'results-view__groups';

  container.append(header, facetsContainer, resultsContainer);

  const summaryEl = header.querySelector<HTMLParagraphElement>('#results-summary')!;
  const clearButton = header.querySelector<HTMLButtonElement>('.clear-facets')!;

  clearButton.addEventListener('click', () => {
    options.onClearFacets?.();
  });

  const render = (context: ResultsRenderContext) => {
    const { response, selections, status, query, errorMessage } = context;

    renderSummary(summaryEl, status, response, query, errorMessage);
    renderFacets(facetsContainer, status, response, selections, options);
    renderGroups(resultsContainer, status, response?.fullGroups ?? [], query, errorMessage);

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

    const heading = document.createElement('h2');
    heading.textContent = FACET_LABELS[key] ?? key;
    block.append(heading);

    const list = document.createElement('div');
    list.className = 'results-view__facet-list';

    values.forEach((facet) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'facet-chip';
      button.dataset.key = key;
      button.dataset.value = facet.value;
      button.textContent = facet.value;

      const badge = document.createElement('span');
      badge.className = 'facet-chip__badge';
      badge.textContent = String(facet.count);
      button.append(badge);

      const isSelected = selections[key]?.has(facet.value) ?? false;
      button.classList.toggle('is-selected', isSelected);

      button.addEventListener('click', () => {
        options.onFacetToggle(key, facet.value);
      });

      list.append(button);
    });

    block.append(list);
    container.append(block);
  });
}

function renderGroups(
  container: HTMLElement,
  status: SearchStatus,
  groups: SearchGroup[],
  query: string,
  errorMessage?: string,
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

  if (!groups.length) {
    container.innerHTML = `<p class="results-view__empty">No results for “${query}”. Adjust search terms or facets.</p>`;
    return;
  }

  groups.forEach((group) => {
    container.append(renderGroup(group));
  });
}

function renderGroup(group: SearchGroup): HTMLElement {
  const section = document.createElement('section');
  section.className = 'results-group';

  const heading = document.createElement('header');
  heading.className = 'results-group__header';
  heading.innerHTML = `
    <h2>${formatEntityType(group.entityType, { plural: true })}</h2>
    <span class="results-group__count">${group.items.length}</span>
  `;

  const list = document.createElement('div');
  list.className = 'results-group__list';

  group.items.forEach((item) => {
    list.append(renderResultCard(item));
  });

  section.append(heading, list);
  return section;
}

function renderResultCard(item: SearchRecord): HTMLElement {
  const card = document.createElement('article');
  card.className = 'result-card';

  const header = document.createElement('div');
  header.className = 'result-card__header';

  const title = document.createElement('h3');
  title.textContent = item.title;

  const badge = document.createElement('span');
  badge.className = 'result-card__badge';
  badge.textContent = formatEntityType(item.entityType);

  header.append(title, badge);

  const summary = document.createElement('p');
  summary.className = 'result-card__summary';
  summary.textContent = item.summary;

  const metaList = document.createElement('ul');
  metaList.className = 'result-card__meta';
  metaList.append(...buildMetaItems(item));

  card.append(header, summary, metaList);

  if (item.entityType !== 'Document') {
    const lineItemsBlock = renderLineItems(item);
    if (lineItemsBlock) {
      card.append(lineItemsBlock);
    }
  }

  return card;
}

function buildMetaItems(item: SearchRecord): HTMLLIElement[] {
  const metas: HTMLLIElement[] = [];

  const project = document.createElement('li');
  project.innerHTML = `<span>Project</span><strong>${item.project}</strong>`;
  metas.push(project);

  const status = document.createElement('li');
  status.innerHTML = `<span>Status</span><strong>${item.status}</strong>`;
  metas.push(status);

  if (item.entityType === 'Document') {
    const doc = item as any;

    const docType = document.createElement('li');
    docType.innerHTML = `<span>Type</span><strong>${doc.documentType}</strong>`;
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
    total.innerHTML = `<span>Total</span><strong>${formatCurrency(financial.totalValue)}</strong>`;
    metas.push(total);
  }

  return metas;
}

function renderLineItems(item: SearchRecord): HTMLElement | null {
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

  const list = document.createElement('ul');

  items.slice(0, 3).forEach((line: any) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="line-item__title">${line.lineItemTitle}</div>
      <div class="line-item__details">
        <span>${line.lineItemType}</span>
        <span>${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure} @ ${formatCurrency(
          line.lineItemUnitPrice,
        )}</span>
        <span class="line-item__total">${formatCurrency(line.lineItemTotal)}</span>
      </div>
    `;
    list.append(li);
  });

  if (items.length > 3) {
    const remainder = document.createElement('li');
    remainder.className = 'line-item__more';
    const remaining = items.length - 3;
    remainder.textContent = `${remaining} more line item${remaining === 1 ? '' : 's'}…`;
    list.append(remainder);
  }

  wrapper.append(list);
  return wrapper;
}
