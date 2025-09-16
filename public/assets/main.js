// src/components/header.ts
function createHeader(options) {
  const header2 = document.createElement("header");
  header2.className = "app-header";
  const nav = document.createElement("nav");
  nav.className = "app-nav";
  const brand = document.createElement("div");
  brand.className = "brand";
  const searchArea = document.createElement("div");
  searchArea.className = "search-area";
  const searchForm = document.createElement("form");
  searchForm.className = "search-form";
  searchForm.setAttribute("role", "search");
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.name = "global-search";
  searchInput.id = "global-search";
  searchInput.placeholder = "Search projects, invoices, documents\u2026";
  searchInput.autocomplete = "off";
  const dialogHost = document.createElement("div");
  dialogHost.className = "search-dialog-host";
  searchForm.append(searchInput);
  searchArea.append(searchForm, dialogHost);
  const navActions = document.createElement("div");
  navActions.className = "nav-actions";
  const resultsButton = document.createElement("button");
  resultsButton.type = "button";
  resultsButton.dataset.route = "results";
  resultsButton.textContent = "Results";
  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.dataset.route = "settings";
  settingsButton.textContent = "Settings";
  navActions.append(resultsButton, settingsButton);
  nav.append(brand, searchArea, navActions);
  header2.append(nav);
  searchInput.addEventListener("input", () => {
    options.onSearchChange(searchInput.value);
  });
  searchInput.addEventListener("focus", () => {
    options.onSearchFocus?.();
  });
  searchInput.addEventListener("blur", () => {
    options.onSearchBlur?.();
  });
  searchInput.addEventListener("keydown", (event) => {
    options.onSearchKeyDown?.(event);
  });
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    options.onSearchSubmit();
  });
  navActions.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const route = target.dataset.route;
    if (!route) {
      return;
    }
    options.onNavigate(route);
  });
  const setActiveRoute = (route) => {
    for (const button of navActions.querySelectorAll("button[data-route]")) {
      const isActive = button.dataset.route === route;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  };
  const setMonetarySearchMode = (isMonetary) => {
    searchForm.classList.toggle("monetary-search", isMonetary);
    searchInput.classList.toggle("monetary-search", isMonetary);
  };
  return {
    element: header2,
    searchInput,
    dialogHost,
    setActiveRoute,
    setMonetarySearchMode
  };
}

// src/utils/format.ts
var ENTITY_LABELS = {
  Document: { singular: "Document", plural: "Documents" },
  ClientInvoice: { singular: "Client Invoice", plural: "Client Invoices" },
  PurchaseOrder: { singular: "Purchase Order", plural: "Purchase Orders" },
  Bill: { singular: "Bill", plural: "Bills" },
  Receipt: { singular: "Receipt", plural: "Receipts" },
  Payment: { singular: "Payment", plural: "Payments" }
};
function formatEntityType(type, options) {
  const label = ENTITY_LABELS[type];
  if (!label) {
    return type;
  }
  return options?.plural ? label.plural : label.singular;
}
function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

// src/utils/highlight.ts
function highlightText(text, query) {
  if (!query.trim()) {
    return escapeHtml(text);
  }
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return escapeHtml(text);
  }
  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
  for (const token of sortedTokens) {
    if (!textLower.includes(token)) {
      continue;
    }
    const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
    highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
  return highlightedText;
}
function findBestMatch(record, query) {
  if (!query.trim()) {
    return null;
  }
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }
  const searchableFields = [
    { field: "title", content: record.title },
    { field: "summary", content: record.summary },
    { field: "project", content: record.project },
    { field: "client", content: record.client },
    { field: "status", content: record.status },
    { field: "tags", content: record.tags.join(" ") }
  ];
  if (record.entityType === "Document") {
    const docRecord = record;
    if (docRecord.documentType) {
      searchableFields.push({ field: "documentType", content: docRecord.documentType });
    }
    if (docRecord.author) {
      searchableFields.push({ field: "author", content: docRecord.author });
    }
  }
  if (record.entityType !== "Document") {
    const financialRecord = record;
    if (financialRecord.lineItems) {
      financialRecord.lineItems.forEach((item, index) => {
        searchableFields.push(
          { field: `lineItem${index}_title`, content: item.lineItemTitle },
          { field: `lineItem${index}_description`, content: item.lineItemDescription },
          { field: `lineItem${index}_type`, content: item.lineItemType }
        );
      });
    }
  }
  Object.entries(record.metadata || {}).forEach(([key, value]) => {
    if (value != null) {
      searchableFields.push({ field: `metadata_${key}`, content: String(value) });
    }
  });
  let bestMatch = null;
  let bestScore = 0;
  for (const { field, content } of searchableFields) {
    if (!content) continue;
    const contentLower = content.toLowerCase();
    const matchingTokens = tokens.filter((token) => contentLower.includes(token));
    const score = matchingTokens.length;
    if (score > bestScore) {
      bestMatch = {
        field,
        content,
        highlightedContent: highlightText(content, query)
      };
      bestScore = score;
    }
  }
  return bestMatch;
}
function getContextSnippet(match, maxLength = 100, query) {
  if (!match) return "";
  const content = match.content;
  if (content.length <= maxLength) {
    return match.highlightedContent;
  }
  const tokens = content.toLowerCase().split(/\s+/);
  const queryTokens = query ? query.toLowerCase().split(/\s+/) : [];
  let startIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (queryTokens.some((qt) => tokens[i].includes(qt))) {
      startIndex = Math.max(0, i - 2);
      break;
    }
  }
  const words = content.split(/\s+/);
  const snippet = words.slice(startIndex, startIndex + Math.ceil(maxLength / 8)).join(" ");
  if (snippet.length < content.length) {
    return highlightText(snippet + "...", query || "");
  }
  return match.highlightedContent;
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function highlightMonetaryValues(text, query) {
  if (!query.trim()) {
    return escapeHtml(text);
  }
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return escapeHtml(text);
  }
  let highlightedText = escapeHtml(text);
  if (amounts.length > 0) {
    for (const amount of amounts) {
      const amountStr = amount.toString();
      const amountWithCommas = amount.toLocaleString();
      const pattern = new RegExp(
        `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
        "g"
      );
      highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$1</mark>');
    }
  }
  if (range) {
    const rangePatterns = [
      // Range format: min-max
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s*-\\s*${escapeRegex(range.max.toString())}\\b`, "g"),
      // Range format: min to max
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s+to\\s+${escapeRegex(range.max.toString())}\\b`, "gi"),
      // Individual range values
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\b`, "g"),
      new RegExp(`\\b${escapeRegex(range.max.toString())}\\b`, "g")
    ];
    for (const pattern of rangePatterns) {
      highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$&</mark>');
    }
  }
  if (textTokens.length > 0) {
    for (const token of textTokens) {
      const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
      highlightedText = highlightedText.replace(regex, '<mark class="monetary-highlight">$1</mark>');
    }
  }
  return highlightedText;
}
function extractMonetaryTokens(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const amounts = [];
  const textTokens = [];
  const range = parseRangeQuery(query);
  if (range) {
    return { amounts, textTokens, range };
  }
  for (const token of tokens) {
    const parsed = parseCurrencyString(token);
    if (parsed !== null) {
      amounts.push(parsed);
    } else {
      textTokens.push(token);
    }
  }
  return { amounts, textTokens, range: null };
}
function parseCurrencyString(amountStr) {
  const cleaned = amountStr.replace(/[$,\s]/g, "");
  if (cleaned.includes("-") || cleaned.toLowerCase().includes(" to ")) {
    return null;
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
function parseRangeQuery(query) {
  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
    // 100-200
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i,
    // 100 to 200
    /\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)/,
    // $100-$200
    /\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/i
    // $100 to $200
  ];
  for (const pattern of rangePatterns) {
    const match = query.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }
  return null;
}
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/components/searchDialog.ts
function createSearchDialog(host, options) {
  const dialog = document.createElement("div");
  dialog.className = "search-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "false");
  dialog.hidden = true;
  host.append(dialog);
  const setState = (state) => {
    dialog.hidden = !state.visible;
    dialog.classList.toggle("monetary-search", state.isMonetarySearch || false);
    if (dialog.hidden) {
      dialog.innerHTML = "";
      dialog.style.display = "none";
      return;
    }
    dialog.style.display = "flex";
    renderDialogContents(dialog, state, options);
  };
  return {
    element: dialog,
    setState
  };
}
function renderDialogContents(container, state, options) {
  container.innerHTML = "";
  if (state.status === "loading") {
    container.append(renderLoadingState(state.query));
    return;
  }
  if (state.status === "error") {
    container.append(renderErrorState());
    return;
  }
  if (!state.query.trim() && state.status === "idle") {
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
  const footer = document.createElement("div");
  footer.className = "search-dialog__footer";
  const seeAllButton = document.createElement("button");
  seeAllButton.type = "button";
  seeAllButton.className = "see-all-button";
  seeAllButton.textContent = `See ${response.totalResults} results \u2192`;
  seeAllButton.addEventListener("click", () => options.onSeeAllResults());
  footer.append(seeAllButton);
  container.append(footer);
}
function renderEmptyState() {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__empty";
  wrapper.innerHTML = `
    <h3>Quick search</h3>
    <p>Start typing or press <kbd>/</kbd> to jump into the search bar.</p>
  `;
  return wrapper;
}
function renderLoadingState(query) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__loading";
  wrapper.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <div>
      <p>Searching for \u201C${escapeHtml2(query)}\u201D\u2026</p>
    </div>
  `;
  return wrapper;
}
function renderErrorState() {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__error";
  wrapper.innerHTML = `
    <h3>We hit a snag</h3>
    <p>Try again in a few seconds.</p>
  `;
  return wrapper;
}
function renderNoResults(query) {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__empty";
  wrapper.innerHTML = `
    <h3>No matches</h3>
    <p>We couldn\u2019t find results for \u201C${escapeHtml2(query)}\u201D. Adjust your keywords or filters.</p>
  `;
  return wrapper;
}
function renderGroup(group, query, isMonetarySearch) {
  const section = document.createElement("section");
  section.className = "search-dialog__group";
  const heading = document.createElement("h4");
  heading.textContent = formatEntityType(group.entityType, { plural: true });
  section.append(heading);
  const list = document.createElement("ul");
  list.className = "search-dialog__list";
  group.items.forEach((item) => {
    list.append(renderGroupItem(item, query, isMonetarySearch));
  });
  section.append(list);
  return section;
}
function renderGroupItem(item, query, isMonetarySearch) {
  const li = document.createElement("li");
  li.className = "search-dialog__item";
  const title = document.createElement("div");
  title.className = "search-dialog__item-title";
  title.innerHTML = isMonetarySearch ? highlightMonetaryValues(item.title, query) : highlightText(item.title, query);
  const meta = document.createElement("div");
  meta.className = "search-dialog__item-meta";
  const metaText = buildItemMeta(item, query, isMonetarySearch);
  meta.innerHTML = isMonetarySearch ? highlightMonetaryValues(metaText, query) : metaText;
  const match = findBestMatch(item, query);
  if (match && match.field !== "title") {
    const context = document.createElement("div");
    context.className = "search-context";
    const highlightedSnippet = isMonetarySearch ? highlightMonetaryValues(match.content, query) : getContextSnippet(match, 80, query);
    context.innerHTML = highlightedSnippet;
    li.append(title, meta, context);
  } else {
    li.append(title, meta);
  }
  return li;
}
function buildItemMeta(item, query, isMonetarySearch) {
  const parts = [];
  parts.push(item.project);
  if (item.entityType === "Document") {
    parts.push(item.documentType);
    parts.push(`Updated ${formatDate(item.updatedAt)}`);
  } else {
    const financialItem = item;
    if (typeof financialItem.totalValue === "number") {
      parts.push(formatCurrency(financialItem.totalValue));
    }
    if (financialItem.status) {
      parts.push(financialItem.status);
    }
  }
  return parts.filter(Boolean).join(" \u2022 ");
}
function escapeHtml2(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// src/components/resultsView.ts
var FACET_LABELS = {
  entityType: "Type",
  project: "Project",
  status: "Status",
  documentType: "Document Type",
  client: "Client",
  issuedDate: "Issued",
  totalValue: "Total",
  groupBy: "Group by"
};
function createResultsView(options) {
  const container = document.createElement("section");
  container.className = "results-view";
  const header2 = document.createElement("header");
  header2.className = "results-view__header";
  header2.innerHTML = `
    <div>
      <h1>Search Results</h1>
      <p class="results-view__summary" id="results-summary"></p>
    </div>
    <div class="results-view__actions">
      <button type="button" class="clear-facets" hidden>Clear filters</button>
    </div>
  `;
  const mainContent = document.createElement("div");
  mainContent.className = "results-view__main";
  const facetsContainer = document.createElement("aside");
  facetsContainer.className = "results-view__facets";
  const resultsContainer = document.createElement("div");
  resultsContainer.className = "results-view__groups";
  mainContent.append(facetsContainer, resultsContainer);
  container.append(header2, mainContent);
  const summaryEl = header2.querySelector("#results-summary");
  const clearButton = header2.querySelector(".clear-facets");
  clearButton.addEventListener("click", () => {
    options.onClearFacets?.();
  });
  const render = (context) => {
    const { response, selections, status, query, errorMessage, isMonetarySearch } = context;
    renderSummary(summaryEl, status, response, query, errorMessage);
    renderFacets(facetsContainer, status, response, selections, options);
    renderGroups(resultsContainer, status, response, query, errorMessage, isMonetarySearch);
    const hasSelections = selections && Object.keys(selections).length > 0;
    clearButton.hidden = !hasSelections;
  };
  return {
    element: container,
    render
  };
}
function renderSummary(target, status, response, query, errorMessage) {
  switch (status) {
    case "idle":
      target.textContent = "Type a query to explore results and filters.";
      return;
    case "loading":
      target.textContent = query ? `Searching for \u201C${query}\u201D\u2026` : "Searching\u2026";
      return;
    case "error":
      target.textContent = errorMessage ?? "Search failed. Try again.";
      return;
    case "ready":
      if (!response) {
        target.textContent = "No results.";
        return;
      }
      target.textContent = `${response.totalResults} result${response.totalResults === 1 ? "" : "s"} for \u201C${response.query}\u201D.`;
      return;
    default:
      target.textContent = "";
  }
}
function renderFacets(container, status, response, selections, options) {
  container.innerHTML = "";
  if (status === "idle") {
    container.classList.add("is-empty");
    container.textContent = "Facet breakdowns will appear once you run a search.";
    return;
  }
  if (status === "loading") {
    container.classList.add("is-empty");
    container.textContent = "Calculating facets\u2026";
    return;
  }
  if (status === "error") {
    container.classList.add("is-empty");
    container.textContent = "Facets unavailable while search is failing.";
    return;
  }
  if (!response || !response.facets) {
    container.classList.add("is-empty");
    container.textContent = "No facet data for the current results.";
    return;
  }
  const facetsEntries = Object.entries(response.facets);
  if (facetsEntries.length === 0) {
    container.classList.add("is-empty");
    container.textContent = "No facet data for the current results.";
    return;
  }
  container.classList.remove("is-empty");
  facetsEntries.forEach(([key, values]) => {
    const block = document.createElement("section");
    block.className = "results-view__facet-block";
    const heading = document.createElement("h3");
    heading.textContent = FACET_LABELS[key] ?? key;
    block.append(heading);
    const list = document.createElement("ul");
    list.className = "results-view__facet-list";
    values.forEach((facet) => {
      const listItem = document.createElement("li");
      listItem.className = "results-view__facet-item";
      const label = document.createElement("label");
      label.className = "facet-checkbox";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "facet-checkbox__input";
      checkbox.dataset.key = key;
      checkbox.dataset.value = facet.value;
      const isSelected = selections[key]?.has(facet.value) ?? false;
      checkbox.checked = isSelected;
      const text = document.createElement("span");
      text.className = "facet-checkbox__text";
      text.textContent = facet.value;
      const count = document.createElement("span");
      count.className = "facet-checkbox__count";
      count.textContent = String(facet.count);
      label.append(checkbox, text, count);
      listItem.append(label);
      list.append(listItem);
      checkbox.addEventListener("change", () => {
        options.onFacetToggle(key, facet.value);
      });
    });
    block.append(list);
    container.append(block);
  });
}
function renderGroups(container, status, response, query, errorMessage, isMonetarySearch) {
  container.innerHTML = "";
  if (status === "idle") {
    container.innerHTML = '<p class="results-view__empty">Run a search to populate full results.</p>';
    return;
  }
  if (status === "loading") {
    container.innerHTML = '<p class="results-view__empty">Fetching results\u2026</p>';
    return;
  }
  if (status === "error") {
    container.innerHTML = `<p class="results-view__empty">${errorMessage ?? "Something went wrong while searching."}</p>`;
    return;
  }
  if (!response || !response.fullGroups.length) {
    container.innerHTML = `<p class="results-view__empty">No results for "${query}". Adjust search terms or facets.</p>`;
    return;
  }
  if (response.isGrouped) {
    response.fullGroups.forEach((group) => {
      container.append(renderGroup2(group, group.groupTitle, query, isMonetarySearch));
    });
  } else {
    const flatList = document.createElement("div");
    flatList.className = "results-list";
    response.records.forEach((record) => {
      flatList.append(renderResultCard(record, query, isMonetarySearch));
    });
    container.append(flatList);
  }
}
function renderGroup2(group, groupTitle, query, isMonetarySearch) {
  const section = document.createElement("section");
  section.className = "results-group";
  const heading = document.createElement("header");
  heading.className = "results-group__header";
  const title = groupTitle || formatEntityType(group.entityType, { plural: true });
  heading.innerHTML = `
    <h2>${title}</h2>
    <span class="results-group__count">${group.items.length}</span>
  `;
  const list = document.createElement("div");
  list.className = "results-group__list";
  group.items.forEach((item) => {
    list.append(renderResultCard(item, query, isMonetarySearch));
  });
  section.append(heading, list);
  return section;
}
function renderResultCard(item, query, isMonetarySearch) {
  const card = document.createElement("article");
  card.className = "result-card";
  const header2 = document.createElement("div");
  header2.className = "result-card__header";
  const title = document.createElement("h3");
  title.innerHTML = query ? isMonetarySearch ? highlightMonetaryValues(item.title, query) : highlightText(item.title, query) : item.title;
  const badge = document.createElement("span");
  badge.className = "result-card__badge";
  badge.textContent = formatEntityType(item.entityType);
  header2.append(title, badge);
  const summary = document.createElement("p");
  summary.className = "result-card__summary";
  summary.innerHTML = query ? isMonetarySearch ? highlightMonetaryValues(item.summary, query) : highlightText(item.summary, query) : item.summary;
  const metaList = document.createElement("ul");
  metaList.className = "result-card__meta";
  metaList.append(...buildMetaItems(item, query, isMonetarySearch));
  card.append(header2, summary, metaList);
  if (query) {
    const match = findBestMatch(item, query);
    if (match && match.field !== "title" && match.field !== "summary") {
      const context = document.createElement("div");
      context.className = "search-context";
      const highlightedSnippet = isMonetarySearch ? highlightMonetaryValues(match.content, query) : getContextSnippet(match, 120, query);
      context.innerHTML = `<strong>Matched in ${getFieldLabel(match.field)}:</strong> ${highlightedSnippet}`;
      card.append(context);
    }
  }
  if (item.entityType !== "Document") {
    const lineItemsBlock = renderLineItems(item, query, isMonetarySearch);
    if (lineItemsBlock) {
      card.append(lineItemsBlock);
    }
  }
  return card;
}
function buildMetaItems(item, query, isMonetarySearch) {
  const metas = [];
  const project = document.createElement("li");
  project.innerHTML = `<span>Project</span><strong>${query ? isMonetarySearch ? highlightMonetaryValues(item.project, query) : highlightText(item.project, query) : item.project}</strong>`;
  metas.push(project);
  const status = document.createElement("li");
  status.innerHTML = `<span>Status</span><strong>${query ? isMonetarySearch ? highlightMonetaryValues(item.status, query) : highlightText(item.status, query) : item.status}</strong>`;
  metas.push(status);
  if (item.entityType === "Document") {
    const doc = item;
    const docType = document.createElement("li");
    docType.innerHTML = `<span>Type</span><strong>${query ? isMonetarySearch ? highlightMonetaryValues(doc.documentType, query) : highlightText(doc.documentType, query) : doc.documentType}</strong>`;
    metas.push(docType);
    const updated = document.createElement("li");
    updated.innerHTML = `<span>Updated</span><strong>${formatDate(item.updatedAt)}</strong>`;
    metas.push(updated);
  } else {
    const financial = item;
    const issued = document.createElement("li");
    issued.innerHTML = `<span>Issued</span><strong>${formatDate(financial.issuedDate)}</strong>`;
    metas.push(issued);
    if (financial.dueDate) {
      const due = document.createElement("li");
      due.innerHTML = `<span>Due</span><strong>${formatDate(financial.dueDate)}</strong>`;
      metas.push(due);
    }
    const total = document.createElement("li");
    const totalValue = formatCurrency(financial.totalValue);
    total.innerHTML = `<span>Total</span><strong>${query ? isMonetarySearch ? highlightMonetaryValues(totalValue, query) : highlightText(totalValue, query) : totalValue}</strong>`;
    metas.push(total);
  }
  return metas;
}
function renderLineItems(item, query, isMonetarySearch) {
  const financial = item;
  const items = financial.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "result-card__line-items";
  const heading = document.createElement("h4");
  heading.textContent = "Line items";
  wrapper.append(heading);
  const table = document.createElement("table");
  table.className = "line-items-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th>Description</th>
    <th>Type</th>
    <th>Quantity</th>
    <th>Unit Price</th>
    <th>Total</th>
  `;
  thead.append(headerRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  const displayItems = items.slice(0, 3);
  displayItems.forEach((line) => {
    const row = document.createElement("tr");
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    row.innerHTML = `
      <td class="line-item__description">${query ? isMonetarySearch ? highlightMonetaryValues(line.lineItemTitle, query) : highlightText(line.lineItemTitle, query) : line.lineItemTitle}</td>
      <td class="line-item__type">${query ? isMonetarySearch ? highlightMonetaryValues(line.lineItemType, query) : highlightText(line.lineItemType, query) : line.lineItemType}</td>
      <td class="line-item__quantity">${query ? isMonetarySearch ? highlightMonetaryValues(quantity, query) : quantity : quantity}</td>
      <td class="line-item__unit-price">${query ? isMonetarySearch ? highlightMonetaryValues(unitPrice, query) : unitPrice : unitPrice}</td>
      <td class="line-item__total">${query ? isMonetarySearch ? highlightMonetaryValues(total, query) : total : total}</td>
    `;
    tbody.append(row);
  });
  if (items.length > 3) {
    const moreRow = document.createElement("tr");
    moreRow.className = "line-item__more-row";
    const remaining = items.length - 3;
    moreRow.innerHTML = `
      <td colspan="5" class="line-item__more">${remaining} more line item${remaining === 1 ? "" : "s"}\u2026</td>
    `;
    tbody.append(moreRow);
  }
  table.append(tbody);
  wrapper.append(table);
  return wrapper;
}
function getFieldLabel(field) {
  const labels = {
    title: "Title",
    summary: "Summary",
    project: "Project",
    client: "Client",
    status: "Status",
    documentType: "Document Type",
    author: "Author",
    tags: "Tags"
  };
  if (field.startsWith("lineItem") && field.includes("_")) {
    const [, index, type] = field.split("_");
    const typeLabels = {
      title: "Line Item Title",
      description: "Line Item Description",
      type: "Line Item Type"
    };
    return typeLabels[type] || "Line Item";
  }
  if (field.startsWith("metadata_")) {
    return "Metadata";
  }
  return labels[field] || field;
}

// src/config/defaults.json
var defaults_default = {
  searchDelayMs: 100,
  groupLimits: {
    Document: 5,
    ClientInvoice: 4,
    PurchaseOrder: 4,
    Bill: 4,
    Receipt: 4,
    Payment: 4
  }
};

// src/state/store.ts
function createStore(initialState3) {
  let state = initialState3;
  const listeners = /* @__PURE__ */ new Set();
  const getState = () => state;
  const setState = (updater) => {
    const nextState = typeof updater === "function" ? updater(state) : { ...state, ...updater };
    if (Object.is(nextState, state)) {
      return;
    }
    state = nextState;
    listeners.forEach((listener) => listener(state));
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return { getState, setState, subscribe };
}

// src/state/settingsStore.ts
var STORAGE_KEY = "search-prototype.settings";
var DEFAULTS = normalize(defaults_default);
function normalize(state) {
  return {
    ...state,
    groupLimits: { ...state.groupLimits }
  };
}
function mergeSettings(base, overrides) {
  if (!overrides) {
    return normalize(base);
  }
  return {
    ...base,
    ...overrides,
    groupLimits: {
      ...base.groupLimits,
      ...overrides.groupLimits ?? {}
    }
  };
}
function readPersisted() {
  if (typeof window === "undefined") {
    return void 0;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return void 0;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse persisted settings; falling back to defaults.", error);
    return void 0;
  }
}
function persist(state) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
var initialState = mergeSettings(DEFAULTS, readPersisted());
var store = createStore(initialState);
store.subscribe((state) => {
  persist(state);
});
var settingsStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  update(partial) {
    store.setState((prev) => mergeSettings(prev, partial));
  },
  setGroupLimit(section, limit) {
    store.setState(
      (prev) => mergeSettings(prev, {
        groupLimits: {
          ...prev.groupLimits,
          [section]: limit
        }
      })
    );
  },
  reset() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    store.setState(() => normalize(DEFAULTS));
  },
  get defaults() {
    return normalize(DEFAULTS);
  }
};

// src/components/settingsView.ts
function createSettingsView() {
  const container = document.createElement("section");
  container.className = "settings-view";
  const heading = document.createElement("header");
  heading.innerHTML = `
    <h1>Prototype Settings</h1>
    <p>Adjust prototype behaviors. Changes save to the browser local storage and reload the experience.</p>
  `;
  const form = document.createElement("form");
  form.className = "settings-form";
  const delayField = document.createElement("div");
  delayField.className = "settings-field";
  delayField.innerHTML = `
    <label for="search-delay">Simulated search delay (ms)</label>
  `;
  const delayInput = document.createElement("input");
  delayInput.id = "search-delay";
  delayInput.type = "number";
  delayInput.min = "0";
  delayInput.step = "10";
  delayField.append(delayInput);
  const groupSection = document.createElement("fieldset");
  groupSection.className = "settings-group";
  groupSection.innerHTML = `
    <legend>Mini results group sizes</legend>
  `;
  const groupFields = document.createElement("div");
  groupFields.className = "settings-group__grid";
  groupSection.append(groupFields);
  const actions = document.createElement("div");
  actions.className = "settings-actions";
  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "primary";
  saveButton.textContent = "Save & Reload";
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "secondary";
  resetButton.textContent = "Restore defaults";
  actions.append(saveButton, resetButton);
  form.append(delayField, groupSection, actions);
  container.append(heading, form);
  const groupInputs = /* @__PURE__ */ new Map();
  const renderGroupInputs = (groupLimits) => {
    groupFields.innerHTML = "";
    groupInputs.clear();
    Object.entries(groupLimits).forEach(([key, value]) => {
      const field = document.createElement("label");
      field.className = "settings-field";
      field.htmlFor = `group-${key}`;
      const title = document.createElement("span");
      title.textContent = formatEntityType(key, { plural: true });
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.step = "1";
      input.id = `group-${key}`;
      input.value = String(value);
      field.append(title, input);
      groupFields.append(field);
      groupInputs.set(key, input);
    });
  };
  const render = () => {
    const state = settingsStore.getState();
    delayInput.value = String(state.searchDelayMs);
    renderGroupInputs(state.groupLimits);
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextDelay = Number.parseInt(delayInput.value, 10);
    const resolvedDelay = Number.isFinite(nextDelay) && nextDelay >= 0 ? nextDelay : 0;
    const groupLimits = {};
    groupInputs.forEach((input, key) => {
      const parsed = Number.parseInt(input.value, 10);
      groupLimits[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });
    settingsStore.update({
      searchDelayMs: resolvedDelay,
      groupLimits
    });
    window.location.reload();
  });
  resetButton.addEventListener("click", () => {
    settingsStore.reset();
    render();
    window.location.reload();
  });
  render();
  return {
    element: container,
    render
  };
}

// src/state/appState.ts
var initialState2 = {
  route: "home",
  searchQuery: "",
  lastSubmittedQuery: "",
  facetSelections: {},
  recentResponse: null,
  searchStatus: "idle",
  dialogOpen: false,
  errorMessage: void 0
};
function cloneSelections(selections) {
  const next = {};
  for (const key of Object.keys(selections)) {
    const values = selections[key];
    if (values && values.size > 0) {
      next[key] = new Set(values);
    }
  }
  return next;
}
var store2 = createStore(initialState2);
var appState = {
  getState: store2.getState,
  subscribe: store2.subscribe,
  setRoute(route) {
    store2.setState({ route });
  },
  setSearchQuery(searchQuery) {
    store2.setState({ searchQuery });
  },
  setDialogOpen(dialogOpen) {
    store2.setState({ dialogOpen });
  },
  setStatus(status, errorMessage) {
    store2.setState({ searchStatus: status, errorMessage });
  },
  setResponse(response) {
    store2.setState({ recentResponse: response });
  },
  setLastSubmittedQuery(query) {
    store2.setState({ lastSubmittedQuery: query });
  },
  clearFacets() {
    store2.setState({ facetSelections: {} });
  },
  toggleFacet(key, value) {
    store2.setState((prev) => {
      const selections = cloneSelections(prev.facetSelections);
      if (key === "groupBy") {
        if (selections[key]?.has(value)) {
          delete selections[key];
        } else {
          selections[key] = /* @__PURE__ */ new Set([value]);
        }
      } else {
        const current = selections[key] ?? /* @__PURE__ */ new Set();
        if (current.has(value)) {
          current.delete(value);
        } else {
          current.add(value);
        }
        if (current.size === 0) {
          delete selections[key];
        } else {
          selections[key] = current;
        }
      }
      return {
        ...prev,
        facetSelections: selections
      };
    });
  },
  replaceFacets(nextSelections) {
    const clone = cloneSelections(nextSelections);
    store2.setState({ facetSelections: clone });
  },
  reset() {
    store2.setState(initialState2);
  }
};

// src/data/searchService.ts
var FACET_KEYS = [
  "entityType",
  "project",
  "status",
  "documentType",
  "client",
  "issuedDate",
  "totalValue",
  "groupBy"
];
var CORPUS = [];
async function loadCorpus() {
  if (CORPUS.length > 0) {
    return CORPUS;
  }
  try {
    const indexResponse = await fetch("./corpus-parts/index.json");
    const indexData = await indexResponse.json();
    const allRecords = [];
    for (const fileInfo of indexData.files) {
      const response = await fetch(`./corpus-parts/${fileInfo.filename}`);
      const partData = await response.json();
      allRecords.push(...partData);
    }
    CORPUS = allRecords.map((record) => normalizeRecord(record));
    return CORPUS;
  } catch (error) {
    console.error("Error loading corpus:", error);
    CORPUS = [];
    return CORPUS;
  }
}
function normalizeRecord(record) {
  const cleanMetadata = {};
  if (record.metadata) {
    for (const [key, value] of Object.entries(record.metadata)) {
      if (value !== void 0) {
        cleanMetadata[key] = value;
      }
    }
  }
  const baseRecord = {
    ...record,
    tags: record.tags ?? [],
    metadata: cleanMetadata
  };
  if (record.entityType === "Document") {
    return {
      ...baseRecord,
      entityType: "Document",
      documentType: record.documentType,
      author: record.author
    };
  } else {
    return {
      ...baseRecord,
      entityType: record.entityType,
      totalValue: record.totalValue,
      issuedDate: record.issuedDate,
      dueDate: record.dueDate,
      lineItems: record.lineItems ?? []
    };
  }
}
function buildHaystack(record) {
  const base = [
    record.title,
    record.summary,
    record.project,
    record.client,
    record.status,
    record.tags.join(" "),
    ...Object.values(record.metadata ?? {}).map((value) => value == null ? "" : String(value))
  ];
  if (record.entityType !== "Document") {
    const financialRecord = record;
    financialRecord.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
    });
  }
  return base.filter((chunk) => Boolean(chunk)).join(" ").toLowerCase();
}
function tokenize(query) {
  return query.toLowerCase().split(/\s+/).map((token) => token.trim()).filter(Boolean);
}
function parseMonetaryQuery(query) {
  const trimmedQuery = query.trim();
  if (trimmedQuery.startsWith("$")) {
    const amountPart = trimmedQuery.slice(1).trim();
    return {
      isMonetary: true,
      searchQuery: amountPart,
      originalQuery: query
    };
  }
  return {
    isMonetary: false,
    searchQuery: query,
    originalQuery: query
  };
}
function parseCurrencyString2(amountStr) {
  const cleaned = amountStr.replace(/[$,\s]/g, "");
  if (cleaned.includes("-") || cleaned.toLowerCase().includes(" to ")) {
    return null;
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
function normalizeForComparison(value) {
  const str = typeof value === "string" ? value : value.toString();
  return str.replace(/[,$]/g, "");
}
function matchesMonetaryString(queryStr, dataValue) {
  const normalizedQuery = normalizeForComparison(queryStr);
  const normalizedData = normalizeForComparison(dataValue.toString());
  if (normalizedQuery === normalizedData) {
    return true;
  }
  const queryHasDecimal = queryStr.includes(".");
  const queryDigitsAfterDecimal = queryHasDecimal ? queryStr.split(".")[1]?.length || 0 : 0;
  const querySignificantDigits = normalizedQuery.length;
  if (queryHasDecimal) {
    const dataAsDecimal = dataValue.toString();
    const dataHasDecimal = dataAsDecimal.includes(".");
    if (queryDigitsAfterDecimal > 0) {
      const queryWithoutTrailingZeros = normalizedQuery.replace(/0+$/, "");
      const dataWithoutTrailingZeros = normalizedData.replace(/0+$/, "");
      return dataWithoutTrailingZeros === queryWithoutTrailingZeros || dataWithoutTrailingZeros.length <= queryWithoutTrailingZeros.replace(/\.$/, "").length && queryWithoutTrailingZeros.replace(/\.$/, "").startsWith(dataWithoutTrailingZeros);
    } else {
      return normalizedData.startsWith(normalizedQuery);
    }
  }
  if (querySignificantDigits >= 4) {
    if (normalizedData.length >= querySignificantDigits) {
      return normalizedData.startsWith(normalizedQuery);
    } else {
      return normalizedQuery.startsWith(normalizedData);
    }
  } else if (querySignificantDigits >= 3) {
    if (normalizedData.length >= 3) {
      return normalizedData.startsWith(normalizedQuery);
    } else {
      return normalizedQuery.startsWith(normalizedData);
    }
  } else if (querySignificantDigits >= 2) {
    if (normalizedData.length >= 2) {
      return normalizedData.startsWith(normalizedQuery);
    } else {
      return normalizedQuery.startsWith(normalizedData);
    }
  } else {
    return normalizedData[0] === normalizedQuery[0];
  }
}
function isCloseMatch(value1, value2, tolerance = 0.01) {
  return Math.abs(value1 - value2) <= tolerance;
}
function parseRangeQuery2(query) {
  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
    // 100-200
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i,
    // 100 to 200
    /\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)/,
    // $100-$200
    /\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/i
    // $100 to $200
  ];
  for (const pattern of rangePatterns) {
    const match = query.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max) && min <= max) {
        return { min, max };
      }
    }
  }
  return null;
}
function isInRange(value, range) {
  return value >= range.min && value <= range.max;
}
function extractMonetaryTokens2(query) {
  const tokens = tokenize(query);
  const amounts = [];
  const textTokens = [];
  const range = parseRangeQuery2(query);
  if (range) {
    return { amounts, textTokens, range };
  }
  for (const token of tokens) {
    const parsed = parseCurrencyString2(token);
    if (parsed !== null) {
      amounts.push(parsed);
    } else {
      textTokens.push(token);
    }
  }
  return { amounts, textTokens, range: null };
}
function matchesQuery(record, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return true;
  }
  const haystack = buildHaystack(record);
  return tokens.every((token) => haystack.includes(token));
}
function matchesMonetaryQuery(record, query) {
  const { amounts, textTokens, range } = extractMonetaryTokens2(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return true;
  }
  if (record.entityType === "Document") {
    return false;
  }
  const financialRecord = record;
  if (range) {
    if (isInRange(financialRecord.totalValue, range)) {
      return true;
    }
    for (const lineItem of financialRecord.lineItems) {
      if (isInRange(lineItem.lineItemTotal, range) || isInRange(lineItem.lineItemUnitPrice, range)) {
        return true;
      }
    }
  }
  if (amounts.length > 0) {
    for (const queryAmount of amounts) {
      if (isCloseMatch(financialRecord.totalValue, queryAmount)) {
        return true;
      }
    }
    for (const lineItem of financialRecord.lineItems) {
      for (const queryAmount of amounts) {
        if (isCloseMatch(lineItem.lineItemTotal, queryAmount) || isCloseMatch(lineItem.lineItemUnitPrice, queryAmount)) {
          return true;
        }
      }
    }
  }
  const tokens = tokenize(query);
  for (const token of tokens) {
    if (matchesMonetaryString(token, financialRecord.totalValue)) {
      return true;
    }
    for (const lineItem of financialRecord.lineItems) {
      if (matchesMonetaryString(token, lineItem.lineItemTotal) || matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
        return true;
      }
    }
  }
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const lineItemText = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType
      ].join(" ").toLowerCase();
      if (textTokens.every((token) => lineItemText.includes(token))) {
        return true;
      }
    }
  }
  return false;
}
function matchesSelections(record, selections) {
  if (!selections) {
    return true;
  }
  for (const key of Object.keys(selections)) {
    const values = selections[key];
    if (!values || values.size === 0) {
      continue;
    }
    const facetValue = getFacetValue(record, key);
    if (!facetValue || !values.has(facetValue)) {
      return false;
    }
  }
  return true;
}
function getFacetValue(record, key) {
  switch (key) {
    case "entityType":
      return record.entityType;
    case "project":
      return record.project;
    case "status":
      return record.status;
    case "documentType":
      return record.entityType === "Document" ? record.documentType : void 0;
    case "client":
      return record.client;
    case "issuedDate":
      return record.entityType === "Document" ? void 0 : bucketIssuedDate(record.issuedDate);
    case "totalValue":
      if (record.entityType === "Document") {
        return void 0;
      }
      return bucketTotal(record.totalValue);
    case "groupBy":
      return void 0;
    default:
      return void 0;
  }
}
function bucketTotal(total) {
  if (total < 1e4) return "< $10k";
  if (total < 5e4) return "$10k\u2013$50k";
  if (total < 1e5) return "$50k\u2013$100k";
  return "$100k+";
}
function bucketIssuedDate(dateString) {
  const date = new Date(dateString);
  const now = /* @__PURE__ */ new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1e3 * 60 * 60 * 24));
  if (diffInDays <= 7) return "Last 7 days";
  if (diffInDays <= 30) return "Last 30 days";
  if (diffInDays <= 90) return "Last 3 months";
  if (diffInDays <= 180) return "Last 6 months";
  if (diffInDays <= 365) return "Last year";
  if (diffInDays <= 730) return "Last 2 years";
  return "Older than 2 years";
}
function computeFacets(records) {
  const facetMaps = {};
  for (const key of FACET_KEYS) {
    if (key !== "groupBy") {
      facetMaps[key] = /* @__PURE__ */ new Map();
    }
  }
  records.forEach((record) => {
    for (const key of FACET_KEYS) {
      if (key === "groupBy") {
        continue;
      }
      const value = getFacetValue(record, key);
      if (!value) {
        continue;
      }
      const map = facetMaps[key];
      if (!map) {
        continue;
      }
      map.set(value, (map.get(value) ?? 0) + 1);
    }
  });
  const facets = {};
  for (const key of FACET_KEYS) {
    if (key === "groupBy") {
      facets[key] = [
        { key: "groupBy", value: "None", count: records.length },
        { key: "groupBy", value: "Type", count: records.length },
        { key: "groupBy", value: "Project", count: records.length },
        { key: "groupBy", value: "Status", count: records.length },
        { key: "groupBy", value: "Client", count: records.length }
      ];
      continue;
    }
    const map = facetMaps[key];
    if (!map || map.size === 0) {
      continue;
    }
    const values = Array.from(map.entries()).map(([value, count]) => ({ key, value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    facets[key] = values;
  }
  return facets;
}
function calculateRelevanceScore(record, query) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return 0;
  }
  const haystack = buildHaystack(record);
  const titleLower = record.title.toLowerCase();
  const summaryLower = record.summary.toLowerCase();
  let score = 0;
  if (titleLower.includes(query.toLowerCase())) {
    score += 100;
  }
  const titleMatches = tokens.filter((token) => titleLower.includes(token)).length;
  score += titleMatches * 20;
  const summaryMatches = tokens.filter((token) => summaryLower.includes(token)).length;
  score += summaryMatches * 10;
  const contentMatches = tokens.filter((token) => haystack.includes(token)).length;
  score += contentMatches * 5;
  if (titleLower.includes(query.toLowerCase())) {
    score += 50;
  }
  if (summaryLower.includes(query.toLowerCase())) {
    score += 25;
  }
  return score;
}
function calculateMonetaryRelevanceScore(record, query) {
  const { amounts, textTokens, range } = extractMonetaryTokens2(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return 0;
  }
  if (record.entityType === "Document") {
    return 0;
  }
  const financialRecord = record;
  let score = 0;
  if (range) {
    if (isInRange(financialRecord.totalValue, range)) {
      const rangeCenter = (range.min + range.max) / 2;
      const distanceFromCenter = Math.abs(financialRecord.totalValue - rangeCenter);
      const rangeSize = range.max - range.min;
      const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
      score += Math.round(800 * (1 - normalizedDistance));
    }
    for (const lineItem of financialRecord.lineItems) {
      if (isInRange(lineItem.lineItemTotal, range)) {
        const rangeCenter = (range.min + range.max) / 2;
        const distanceFromCenter = Math.abs(lineItem.lineItemTotal - rangeCenter);
        const rangeSize = range.max - range.min;
        const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
        score += Math.round(700 * (1 - normalizedDistance));
      }
      if (isInRange(lineItem.lineItemUnitPrice, range)) {
        const rangeCenter = (range.min + range.max) / 2;
        const distanceFromCenter = Math.abs(lineItem.lineItemUnitPrice - rangeCenter);
        const rangeSize = range.max - range.min;
        const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
        score += Math.round(600 * (1 - normalizedDistance));
      }
    }
  }
  if (amounts.length > 0) {
    for (const queryAmount of amounts) {
      const totalValue = financialRecord.totalValue;
      if (totalValue === queryAmount) {
        score += 1e3;
      } else if (isCloseMatch(totalValue, queryAmount, 0.01)) {
        score += 800;
      } else if (isCloseMatch(totalValue, queryAmount, 1)) {
        score += 600;
      }
    }
    for (const lineItem of financialRecord.lineItems) {
      for (const queryAmount of amounts) {
        if (lineItem.lineItemTotal === queryAmount) {
          score += 900;
        } else if (isCloseMatch(lineItem.lineItemTotal, queryAmount, 0.01)) {
          score += 700;
        } else if (isCloseMatch(lineItem.lineItemTotal, queryAmount, 1)) {
          score += 500;
        }
        if (lineItem.lineItemUnitPrice === queryAmount) {
          score += 800;
        } else if (isCloseMatch(lineItem.lineItemUnitPrice, queryAmount, 0.01)) {
          score += 600;
        } else if (isCloseMatch(lineItem.lineItemUnitPrice, queryAmount, 1)) {
          score += 400;
        }
      }
    }
  }
  const tokens = tokenize(query);
  for (const token of tokens) {
    if (matchesMonetaryString(token, financialRecord.totalValue)) {
      score += 750;
    }
    for (const lineItem of financialRecord.lineItems) {
      if (matchesMonetaryString(token, lineItem.lineItemTotal)) {
        score += 650;
      }
      if (matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
        score += 550;
      }
    }
  }
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const lineItemText = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType
      ].join(" ").toLowerCase();
      const lineItemMatches = textTokens.filter((token) => lineItemText.includes(token)).length;
      score += lineItemMatches * 50;
    }
    const titleLower = record.title.toLowerCase();
    const summaryLower = record.summary.toLowerCase();
    const titleMatches = textTokens.filter((token) => titleLower.includes(token)).length;
    score += titleMatches * 10;
    const summaryMatches = textTokens.filter((token) => summaryLower.includes(token)).length;
    score += summaryMatches * 5;
  }
  return score;
}
function sortByRelevance(records, query, isMonetary = false) {
  return [...records].sort((a, b) => {
    const scoreA = isMonetary ? calculateMonetaryRelevanceScore(a, query) : calculateRelevanceScore(a, query);
    const scoreB = isMonetary ? calculateMonetaryRelevanceScore(b, query) : calculateRelevanceScore(b, query);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
function sortByRecency(records) {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
async function filterRecords({ query, selections, isMonetarySearch }) {
  const { isMonetary, searchQuery } = parseMonetaryQuery(query);
  const corpus = await loadCorpus();
  const filtered = corpus.filter((record) => {
    const matchesQueryResult = isMonetary ? matchesMonetaryQuery(record, searchQuery) : matchesQuery(record, searchQuery);
    return matchesQueryResult && matchesSelections(record, selections);
  });
  return searchQuery.trim() ? sortByRelevance(filtered, searchQuery, isMonetary) : sortByRecency(filtered);
}
function buildGroups(records, groupBy) {
  if (!groupBy || groupBy === "None") {
    return records.length > 0 ? [{ entityType: "Document", items: records }] : [];
  }
  const map = /* @__PURE__ */ new Map();
  records.forEach((record) => {
    let groupKey;
    switch (groupBy) {
      case "Type":
        groupKey = record.entityType;
        break;
      case "Project":
        groupKey = record.project;
        break;
      case "Status":
        groupKey = record.status;
        break;
      case "Client":
        groupKey = record.client;
        break;
      default:
        groupKey = record.entityType;
    }
    if (!map.has(groupKey)) {
      map.set(groupKey, []);
    }
    map.get(groupKey).push(record);
  });
  const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sortedEntries.map(([groupKey, items]) => ({
    entityType: groupBy === "Type" ? groupKey : "Document",
    items,
    groupTitle: groupKey
  })).filter((group) => group.items.length > 0);
}
function applyGroupLimits(groups, limits) {
  return groups.map((group) => {
    const limit = limits[group.entityType] ?? limits["Document"] ?? 4;
    return {
      entityType: group.entityType,
      items: group.items.slice(0, Math.max(0, limit))
    };
  }).filter((group) => group.items.length > 0);
}
function wait(ms) {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    globalThis.setTimeout(resolve, ms);
  });
}
async function runSearch(options, overrides) {
  const settings = settingsStore.getState();
  const delay = overrides?.delayMs ?? settings.searchDelayMs;
  const groupLimits = overrides?.groupLimits ?? settings.groupLimits;
  const { isMonetary } = parseMonetaryQuery(options.query);
  const searchOptions = { ...options, isMonetarySearch: isMonetary };
  const records = await filterRecords(searchOptions);
  const facets = computeFacets(records);
  const groupBy = options.selections?.groupBy?.values().next().value;
  const isGrouped = groupBy && groupBy !== "None";
  const fullGroups = buildGroups(records, groupBy);
  const limitedGroups = applyGroupLimits(fullGroups, groupLimits);
  await wait(delay);
  return {
    query: options.query,
    totalResults: records.length,
    limitedGroups,
    fullGroups,
    facets,
    records,
    isGrouped: !!isGrouped
  };
}

// src/main.ts
function isMonetaryQuery(query) {
  return query.trim().startsWith("$");
}
var root = document.querySelector("#app");
if (!root) {
  throw new Error("Root container #app not found");
}
var main = document.createElement("main");
main.className = "app-main";
var activeSearchToken = 0;
var header = createHeader({
  onNavigate: (route) => navigate(route),
  onSearchChange: (value) => {
    const currentState = appState.getState();
    const previousQuery = currentState.lastSubmittedQuery || currentState.searchQuery;
    if (value.trim() !== previousQuery.trim()) {
      appState.clearFacets();
    }
    appState.setSearchQuery(value);
    header.setMonetarySearchMode(isMonetaryQuery(value));
    const isHome = appState.getState().route === "home";
    void performSearch(value, { openDialog: isHome, updateSubmitted: !isHome });
  },
  onSearchSubmit: () => {
    navigate("results");
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  },
  onSearchFocus: () => {
    if (appState.getState().route !== "home") {
      return;
    }
    appState.setDialogOpen(true);
    const query = appState.getState().searchQuery;
    if (query.trim()) {
      void performSearch(query, { openDialog: true, updateSubmitted: false });
    }
  },
  onSearchBlur: () => {
  },
  onSearchKeyDown: (event) => {
    if (event.key === "Escape") {
      appState.setDialogOpen(false);
      header.searchInput.blur();
    }
  }
});
var searchDialog = createSearchDialog(header.dialogHost, {
  onSeeAllResults: () => {
    navigate("results");
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  }
});
searchDialog.setState({
  visible: false,
  status: appState.getState().searchStatus,
  query: appState.getState().searchQuery,
  response: appState.getState().recentResponse
});
var resultsView = createResultsView({
  onFacetToggle: (key, value) => {
    appState.toggleFacet(key, value);
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query) {
      void performSearch(query, { openDialog: false });
    }
  },
  onClearFacets: () => {
    appState.clearFacets();
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query) {
      void performSearch(query, { openDialog: false });
    }
  }
});
var settingsView = createSettingsView();
var homeScreen = document.createElement("section");
homeScreen.id = "screen-home";
homeScreen.dataset.screen = "home";
homeScreen.className = "screen screen--home";
homeScreen.innerHTML = `
  <div class="home-ghost">
    <h1>Global search prototype</h1>
    <p>This area stands in for future homepage content. Use the search bar above to open the quick results dialog.</p>
  </div>
`;
var resultsScreen = document.createElement("section");
resultsScreen.id = "screen-results";
resultsScreen.dataset.screen = "results";
resultsScreen.className = "screen screen--results";
resultsScreen.append(resultsView.element);
var settingsScreen = document.createElement("section");
settingsScreen.id = "screen-settings";
settingsScreen.dataset.screen = "settings";
settingsScreen.className = "screen screen--settings";
settingsScreen.append(settingsView.element);
main.append(homeScreen, resultsScreen, settingsScreen);
root.append(header.element, main);
var screens = {
  home: homeScreen,
  results: resultsScreen,
  settings: settingsScreen
};
function navigate(route) {
  const previousRoute = appState.getState().route;
  appState.setRoute(route);
  if (route !== "home") {
    appState.setDialogOpen(false);
  }
  if (route === "results") {
    const query = (appState.getState().lastSubmittedQuery || appState.getState().searchQuery).trim();
    if (query && previousRoute !== "results") {
      void performSearch(query, { openDialog: false });
    }
  }
}
async function performSearch(query, options = {}) {
  const { openDialog = false, updateSubmitted = true } = options;
  const trimmed = query.trim();
  if (openDialog && appState.getState().route === "home") {
    appState.setDialogOpen(true);
  }
  if (!trimmed) {
    activeSearchToken += 1;
    if (updateSubmitted) {
      appState.setLastSubmittedQuery("");
    }
    appState.setStatus("idle");
    appState.setResponse(null);
    return;
  }
  const requestId = ++activeSearchToken;
  appState.setStatus("loading");
  try {
    const response = await runSearch({
      query: trimmed,
      selections: appState.getState().facetSelections
    });
    if (requestId !== activeSearchToken) {
      return;
    }
    appState.setResponse(response);
    appState.setStatus("ready");
    if (updateSubmitted) {
      appState.setLastSubmittedQuery(trimmed);
    }
    if (openDialog && appState.getState().route === "home") {
      appState.setDialogOpen(true);
    }
  } catch (error) {
    if (requestId !== activeSearchToken) {
      return;
    }
    console.error("Search failed", error);
    appState.setStatus("error", "Unable to complete search. Try again.");
  }
}
function focusSearchBar() {
  header.searchInput.focus();
  header.searchInput.select();
  const isHome = appState.getState().route === "home";
  if (isHome) {
    appState.setDialogOpen(true);
    const query = appState.getState().searchQuery;
    if (query.trim()) {
      void performSearch(query, { openDialog: true, updateSubmitted: false });
    }
  } else {
    appState.setDialogOpen(false);
  }
}
function handleGlobalKeydown(event) {
  const target = event.target;
  const isEditable = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable) {
    event.preventDefault();
    focusSearchBar();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    focusSearchBar();
    return;
  }
  if (event.key === "Escape" && appState.getState().dialogOpen) {
    appState.setDialogOpen(false);
    header.searchInput.blur();
  }
}
function handleDocumentClick(event) {
  if (!appState.getState().dialogOpen) {
    return;
  }
  const target = event.target;
  if (target && header.element.contains(target)) {
    return;
  }
  appState.setDialogOpen(false);
}
appState.subscribe((state) => {
  Object.entries(screens).forEach(([route, element]) => {
    element.hidden = route !== state.route;
  });
  header.searchInput.value = state.searchQuery;
  header.setActiveRoute(state.route);
  searchDialog.setState({
    visible: state.dialogOpen && state.route === "home",
    status: state.searchStatus,
    query: state.searchQuery,
    response: state.recentResponse,
    isMonetarySearch: isMonetaryQuery(state.searchQuery)
  });
  resultsView.render({
    response: state.recentResponse,
    selections: state.facetSelections,
    status: state.searchStatus,
    query: state.lastSubmittedQuery || state.searchQuery,
    errorMessage: state.errorMessage,
    isMonetarySearch: isMonetaryQuery(state.lastSubmittedQuery || state.searchQuery)
  });
});
document.addEventListener("keydown", handleGlobalKeydown);
document.addEventListener("mousedown", handleDocumentClick);
appState.setRoute("home");
//# sourceMappingURL=main.js.map
