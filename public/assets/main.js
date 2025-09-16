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
      const patterns = [
        // Exact amount with optional commas and decimals
        new RegExp(`\\b${escapeRegex(amount.toString())}\\b`, "g"),
        // Amount with commas (e.g., 1,234.56)
        new RegExp(`\\b${escapeRegex(amount.toLocaleString())}\\b`, "g"),
        // Amount with currency symbol
        new RegExp(`\\$${escapeRegex(amount.toString())}\\b`, "g"),
        new RegExp(`\\$${escapeRegex(amount.toLocaleString())}\\b`, "g")
      ];
      for (const pattern of patterns) {
        highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$&</mark>');
      }
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

// src/data/search_corpus.json
var search_corpus_default = [
  {
    id: "document-001",
    entityType: "Document",
    title: "Riverbend Condos \u2013 Punch List",
    summary: "Punch List prepared for Riverbend Condos covering finish carpentry scope updates.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "In Review",
    updatedAt: "2023-05-20T09:02:20.698Z",
    tags: [
      "Interior",
      "Exterior",
      "Green Build"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Tanya Singh",
      location: "Portland, OR",
      revision: "R4",
      tradeFocus: "Roofing"
    },
    documentType: "Punch List",
    author: "Aaron Patel"
  },
  {
    id: "document-002",
    entityType: "Document",
    title: "Sunset Heights \u2013 Specification Sheet",
    summary: "Specification Sheet prepared for Sunset Heights covering plumbing scope updates.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Approved",
    updatedAt: "2023-07-07T22:28:11.890Z",
    tags: [
      "HVAC",
      "Exterior",
      "Procurement"
    ],
    metadata: {
      projectPhase: "Foundation",
      projectManager: "Caleb Winters",
      location: "Sacramento, CA",
      revision: "R1",
      tradeFocus: "Plumbing"
    },
    documentType: "Specification Sheet",
    author: "Rebecca Miles"
  },
  {
    id: "document-003",
    entityType: "Document",
    title: "Mesa Verde Townhomes \u2013 Inspection Report",
    summary: "Inspection Report prepared for Mesa Verde Townhomes covering plumbing scope updates.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "In Review",
    updatedAt: "2023-11-01T00:52:19.715Z",
    tags: [
      "Procurement",
      "Prefabrication",
      "Exterior"
    ],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Leslie Ortega",
      location: "Phoenix, AZ",
      revision: "R5",
      tradeFocus: "Plumbing"
    },
    documentType: "Inspection Report",
    author: "Olivia Chen"
  },
  {
    id: "document-004",
    entityType: "Document",
    title: "Harbor Point Residences \u2013 Specification Sheet",
    summary: "Specification Sheet prepared for Harbor Point Residences covering roofing scope updates.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Draft",
    updatedAt: "2023-01-19T16:23:47.385Z",
    tags: [
      "Foundations",
      "Interior",
      "Schedule"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Noah Kim",
      location: "Tacoma, WA",
      revision: "R4",
      tradeFocus: "Finish Carpentry"
    },
    documentType: "Specification Sheet",
    author: "Rebecca Miles"
  },
  {
    id: "document-005",
    entityType: "Document",
    title: "Willow Creek Ranch \u2013 Change Order",
    summary: "Change Order prepared for Willow Creek Ranch covering roofing scope updates.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Draft",
    updatedAt: "2024-03-12T10:15:59.797Z",
    tags: [
      "Procurement",
      "Interior",
      "HVAC"
    ],
    metadata: {
      projectPhase: "Design Development",
      projectManager: "Hannah Cole",
      location: "Fort Collins, CO",
      revision: "R1",
      tradeFocus: "Concrete"
    },
    documentType: "Change Order",
    author: "Aaron Patel"
  },
  {
    id: "document-006",
    entityType: "Document",
    title: "Mesa Verde Townhomes \u2013 Punch List",
    summary: "Punch List prepared for Mesa Verde Townhomes covering sitework scope updates.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Superseded",
    updatedAt: "2023-01-08T04:04:46.586Z",
    tags: [
      "Green Build",
      "Fire Protection",
      "Prefabrication"
    ],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Leslie Ortega",
      location: "Phoenix, AZ",
      revision: "R2",
      tradeFocus: "Solar"
    },
    documentType: "Punch List",
    author: "Aaron Patel"
  },
  {
    id: "document-007",
    entityType: "Document",
    title: "Harbor Point Residences \u2013 Permit Package",
    summary: "Permit Package prepared for Harbor Point Residences covering concrete scope updates.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Draft",
    updatedAt: "2023-04-21T06:18:36.685Z",
    tags: [
      "Safety",
      "Green Build",
      "HVAC"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Noah Kim",
      location: "Tacoma, WA",
      revision: "R1",
      tradeFocus: "Plumbing"
    },
    documentType: "Permit Package",
    author: "Rebecca Miles"
  },
  {
    id: "document-008",
    entityType: "Document",
    title: "Riverbend Condos \u2013 Permit Package",
    summary: "Permit Package prepared for Riverbend Condos covering hvac scope updates.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Approved",
    updatedAt: "2023-01-30T18:52:07.840Z",
    tags: [
      "Interior",
      "Foundations",
      "Exterior"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Tanya Singh",
      location: "Portland, OR",
      revision: "R5",
      tradeFocus: "Landscaping"
    },
    documentType: "Permit Package",
    author: "Victor Huang"
  },
  {
    id: "document-009",
    entityType: "Document",
    title: "Harbor Point Residences \u2013 Inspection Report",
    summary: "Inspection Report prepared for Harbor Point Residences covering roofing scope updates.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Approved",
    updatedAt: "2024-01-07T11:52:22.233Z",
    tags: [
      "Procurement",
      "HVAC",
      "Schedule"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Noah Kim",
      location: "Tacoma, WA",
      revision: "R5",
      tradeFocus: "Finish Carpentry"
    },
    documentType: "Inspection Report",
    author: "Miguel Alvarez"
  },
  {
    id: "document-010",
    entityType: "Document",
    title: "Pinecrest Estate \u2013 Permit Package",
    summary: "Permit Package prepared for Pinecrest Estate covering hvac scope updates.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Superseded",
    updatedAt: "2023-04-13T11:14:52.330Z",
    tags: [
      "Prefabrication",
      "Procurement",
      "Fire Protection"
    ],
    metadata: {
      projectPhase: "Pre-Construction",
      projectManager: "Marcus Hall",
      location: "Bend, OR",
      revision: "R4",
      tradeFocus: "Concrete"
    },
    documentType: "Permit Package",
    author: "Olivia Chen"
  },
  {
    id: "document-011",
    entityType: "Document",
    title: "Willow Creek Ranch \u2013 Inspection Report",
    summary: "Inspection Report prepared for Willow Creek Ranch covering electrical scope updates.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Approved",
    updatedAt: "2023-12-05T23:10:27.741Z",
    tags: [
      "Schedule",
      "Prefabrication",
      "HVAC"
    ],
    metadata: {
      projectPhase: "Design Development",
      projectManager: "Hannah Cole",
      location: "Fort Collins, CO",
      revision: "R4",
      tradeFocus: "Solar"
    },
    documentType: "Inspection Report",
    author: "Aaron Patel"
  },
  {
    id: "document-012",
    entityType: "Document",
    title: "Pinecrest Estate \u2013 Punch List",
    summary: "Punch List prepared for Pinecrest Estate covering plumbing scope updates.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Draft",
    updatedAt: "2024-05-17T12:08:35.441Z",
    tags: [
      "Green Build",
      "Procurement",
      "Fire Protection"
    ],
    metadata: {
      projectPhase: "Pre-Construction",
      projectManager: "Marcus Hall",
      location: "Bend, OR",
      revision: "R1",
      tradeFocus: "Sitework"
    },
    documentType: "Punch List",
    author: "Sofia Brooks"
  },
  {
    id: "document-013",
    entityType: "Document",
    title: "Granite Ridge Estates \u2013 Inspection Report",
    summary: "Inspection Report prepared for Granite Ridge Estates covering structural scope updates.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Draft",
    updatedAt: "2023-01-16T15:20:34.463Z",
    tags: [
      "Fire Protection",
      "Exterior",
      "Safety"
    ],
    metadata: {
      projectPhase: "Sitework",
      projectManager: "Jordan Blake",
      location: "Boise, ID",
      revision: "R3",
      tradeFocus: "HVAC"
    },
    documentType: "Inspection Report",
    author: "Victor Huang"
  },
  {
    id: "document-014",
    entityType: "Document",
    title: "Granite Ridge Estates \u2013 Punch List",
    summary: "Punch List prepared for Granite Ridge Estates covering roofing scope updates.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Approved",
    updatedAt: "2024-04-17T06:37:55.767Z",
    tags: [
      "Fire Protection",
      "Safety",
      "Procurement"
    ],
    metadata: {
      projectPhase: "Sitework",
      projectManager: "Jordan Blake",
      location: "Boise, ID",
      revision: "R5",
      tradeFocus: "Concrete"
    },
    documentType: "Punch List",
    author: "Olivia Chen"
  },
  {
    id: "document-015",
    entityType: "Document",
    title: "Mesa Verde Townhomes \u2013 Inspection Report",
    summary: "Inspection Report prepared for Mesa Verde Townhomes covering concrete scope updates.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Approved",
    updatedAt: "2023-06-03T07:33:04.164Z",
    tags: [
      "Safety",
      "Prefabrication",
      "Procurement"
    ],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Leslie Ortega",
      location: "Phoenix, AZ",
      revision: "R3",
      tradeFocus: "Solar"
    },
    documentType: "Inspection Report",
    author: "Aaron Patel"
  },
  {
    id: "document-016",
    entityType: "Document",
    title: "Cedar Ridge Homes \u2013 Permit Package",
    summary: "Permit Package prepared for Cedar Ridge Homes covering hvac scope updates.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Approved",
    updatedAt: "2023-05-03T07:03:34.046Z",
    tags: [
      "Exterior",
      "Safety",
      "Fire Protection"
    ],
    metadata: {
      projectPhase: "Closeout",
      projectManager: "Priya Desai",
      location: "Spokane, WA",
      revision: "R2",
      tradeFocus: "Roofing"
    },
    documentType: "Permit Package",
    author: "Victor Huang"
  },
  {
    id: "document-017",
    entityType: "Document",
    title: "Cedar Ridge Homes \u2013 Architectural Drawing",
    summary: "Architectural Drawing prepared for Cedar Ridge Homes covering concrete scope updates.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "In Review",
    updatedAt: "2024-02-19T15:52:24.692Z",
    tags: [
      "Foundations",
      "Procurement",
      "Prefabrication"
    ],
    metadata: {
      projectPhase: "Closeout",
      projectManager: "Priya Desai",
      location: "Spokane, WA",
      revision: "R3",
      tradeFocus: "Electrical"
    },
    documentType: "Architectural Drawing",
    author: "Sofia Brooks"
  },
  {
    id: "document-018",
    entityType: "Document",
    title: "Cedar Ridge Homes \u2013 Change Order",
    summary: "Change Order prepared for Cedar Ridge Homes covering sitework scope updates.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Draft",
    updatedAt: "2023-05-12T16:43:54.997Z",
    tags: [
      "HVAC",
      "Prefabrication",
      "Foundations"
    ],
    metadata: {
      projectPhase: "Closeout",
      projectManager: "Priya Desai",
      location: "Spokane, WA",
      revision: "R5",
      tradeFocus: "Structural"
    },
    documentType: "Change Order",
    author: "Miguel Alvarez"
  },
  {
    id: "document-019",
    entityType: "Document",
    title: "Pinecrest Estate \u2013 Specification Sheet",
    summary: "Specification Sheet prepared for Pinecrest Estate covering sitework scope updates.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Draft",
    updatedAt: "2023-11-28T00:33:17.537Z",
    tags: [
      "Safety",
      "Schedule",
      "Interior"
    ],
    metadata: {
      projectPhase: "Pre-Construction",
      projectManager: "Marcus Hall",
      location: "Bend, OR",
      revision: "R2",
      tradeFocus: "Structural"
    },
    documentType: "Specification Sheet",
    author: "Aaron Patel"
  },
  {
    id: "document-020",
    entityType: "Document",
    title: "Harbor Point Residences \u2013 Permit Package",
    summary: "Permit Package prepared for Harbor Point Residences covering landscaping scope updates.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Approved",
    updatedAt: "2023-10-20T20:04:16.212Z",
    tags: [
      "Prefabrication",
      "Exterior",
      "HVAC"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Noah Kim",
      location: "Tacoma, WA",
      revision: "R3",
      tradeFocus: "Structural"
    },
    documentType: "Permit Package",
    author: "Sofia Brooks"
  },
  {
    id: "clientinvoice-001",
    entityType: "ClientInvoice",
    title: "Invoice Mesa-2001",
    summary: "Client invoice for Mesa Verde Townhomes covering material progress.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Outstanding",
    updatedAt: "2023-02-17T02:17:05.656Z",
    tags: [
      "Interior",
      "Foundations",
      "Green Build"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Exterior Finishes",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30"
    },
    totalValue: 37800,
    issuedDate: "2023-02-06T02:17:05.656Z",
    dueDate: "2023-03-19T02:17:05.656Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-001-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4602,
        lineItemTotal: 18408,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-001-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3298,
        lineItemTotal: 16490,
        lineItemType: "Material"
      },
      {
        lineItemId: "clientinvoice-001-item-3",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Labor for main service panel on Building core areas",
        lineItemQuantity: 8,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 111,
        lineItemTotal: 888,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-001-item-4",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2014,
        lineItemTotal: 2014,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "clientinvoice-002",
    entityType: "ClientInvoice",
    title: "Invoice Lakeside-2002",
    summary: "Client invoice for Lakeside Villas covering electrical progress.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Partial",
    updatedAt: "2024-01-30T14:11:31.444Z",
    tags: [
      "Exterior",
      "Prefabrication",
      "Foundations"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Framing",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 45"
    },
    totalValue: 14330,
    issuedDate: "2024-01-01T14:11:31.444Z",
    dueDate: "2024-01-31T14:11:31.444Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-002-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 826,
        lineItemTotal: 2478,
        lineItemType: "Material"
      },
      {
        lineItemId: "clientinvoice-002-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Material for elevator cab finishes on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2963,
        lineItemTotal: 11852,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "clientinvoice-003",
    entityType: "ClientInvoice",
    title: "Invoice Marina-2003",
    summary: "Client invoice for Marina Overlook covering material progress.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Outstanding",
    updatedAt: "2023-04-15T00:54:05.038Z",
    tags: [
      "HVAC",
      "Prefabrication",
      "Exterior"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Punch List",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 26008,
    issuedDate: "2023-03-19T00:54:05.038Z",
    dueDate: "2023-05-08T00:54:05.038Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-003-item-1",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2086,
        lineItemTotal: 6258,
        lineItemType: "Material"
      },
      {
        lineItemId: "clientinvoice-003-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3950,
        lineItemTotal: 19750,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "clientinvoice-004",
    entityType: "ClientInvoice",
    title: "Invoice Granite-2004",
    summary: "Client invoice for Granite Ridge Estates covering electrical progress.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Sent",
    updatedAt: "2023-10-06T11:52:58.884Z",
    tags: [
      "Safety",
      "Exterior",
      "Foundations"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Sitework",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 45"
    },
    totalValue: 65315,
    issuedDate: "2023-09-19T11:52:58.884Z",
    dueDate: "2023-11-17T11:52:58.884Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-004-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4730,
        lineItemTotal: 18920,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-004-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4909,
        lineItemTotal: 29454,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-004-item-3",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3255,
        lineItemTotal: 9765,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-004-item-4",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1196,
        lineItemTotal: 7176,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "clientinvoice-005",
    entityType: "ClientInvoice",
    title: "Invoice Riverbend-2005",
    summary: "Client invoice for Riverbend Condos covering hvac progress.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Paid",
    updatedAt: "2023-10-04T16:33:19.485Z",
    tags: [
      "Schedule",
      "Fire Protection",
      "Prefabrication"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Finishes",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 26136,
    issuedDate: "2023-09-01T16:33:19.485Z",
    dueDate: "2023-10-27T16:33:19.485Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-005-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2892,
        lineItemTotal: 11568,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-005-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4528,
        lineItemTotal: 13584,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-005-item-3",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Labor for main service panel on Building core areas",
        lineItemQuantity: 8,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 123,
        lineItemTotal: 984,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "clientinvoice-006",
    entityType: "ClientInvoice",
    title: "Invoice Harbor-2006",
    summary: "Client invoice for Harbor Point Residences covering other progress.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Draft",
    updatedAt: "2023-08-20T22:47:02.831Z",
    tags: [
      "Procurement",
      "HVAC",
      "Interior"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Mechanical Rough-In",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30"
    },
    totalValue: 8476,
    issuedDate: "2023-08-11T22:47:02.831Z",
    dueDate: "2023-09-24T22:47:02.831Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-006-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1301,
        lineItemTotal: 5204,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-006-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 818,
        lineItemTotal: 3272,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "clientinvoice-007",
    entityType: "ClientInvoice",
    title: "Invoice Marina-2007",
    summary: "Client invoice for Marina Overlook covering electrical progress.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Outstanding",
    updatedAt: "2024-01-19T04:46:50.075Z",
    tags: [
      "Schedule",
      "Prefabrication",
      "Exterior"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Punch List",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 45"
    },
    totalValue: 2630,
    issuedDate: "2023-12-29T04:46:50.075Z",
    dueDate: "2024-02-17T04:46:50.075Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-007-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 17,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 121,
        lineItemTotal: 2057,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-007-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 573,
        lineItemTotal: 573,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "clientinvoice-008",
    entityType: "ClientInvoice",
    title: "Invoice Harbor-2008",
    summary: "Client invoice for Harbor Point Residences covering concrete progress.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Sent",
    updatedAt: "2023-12-02T18:59:29.884Z",
    tags: [
      "Prefabrication",
      "Green Build",
      "Schedule"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Mechanical Rough-In",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 14913,
    issuedDate: "2023-11-27T18:59:29.884Z",
    dueDate: "2023-12-24T18:59:29.884Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-008-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Other for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 880,
        lineItemTotal: 5280,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-008-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1932,
        lineItemTotal: 7728,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-008-item-3",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Material for foundation waterproofing on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1905,
        lineItemTotal: 1905,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "clientinvoice-009",
    entityType: "ClientInvoice",
    title: "Invoice Marina-2009",
    summary: "Client invoice for Marina Overlook covering hvac progress.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Sent",
    updatedAt: "2023-08-17T17:18:05.607Z",
    tags: [
      "Exterior",
      "Green Build",
      "HVAC"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Punch List",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 35761,
    issuedDate: "2023-08-12T17:18:05.607Z",
    dueDate: "2023-09-10T17:18:05.607Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-009-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4363,
        lineItemTotal: 17452,
        lineItemType: "Material"
      },
      {
        lineItemId: "clientinvoice-009-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Other for elevator cab finishes on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 889,
        lineItemTotal: 5334,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-009-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Material for interior paint on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4325,
        lineItemTotal: 12975,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "clientinvoice-010",
    entityType: "ClientInvoice",
    title: "Invoice Granite-2010",
    summary: "Client invoice for Granite Ridge Estates covering finish carpentry progress.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Paid",
    updatedAt: "2024-02-25T16:11:20.090Z",
    tags: [
      "Schedule",
      "Foundations",
      "Interior"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Sitework",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 15"
    },
    totalValue: 24194,
    issuedDate: "2024-02-07T16:11:20.090Z",
    dueDate: "2024-03-04T16:11:20.090Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-010-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3724,
        lineItemTotal: 7448,
        lineItemType: "Material"
      },
      {
        lineItemId: "clientinvoice-010-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5582,
        lineItemTotal: 16746,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "clientinvoice-011",
    entityType: "ClientInvoice",
    title: "Invoice Harbor-2011",
    summary: "Client invoice for Harbor Point Residences covering plumbing progress.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Partial",
    updatedAt: "2023-05-15T10:40:11.015Z",
    tags: [
      "Interior",
      "Safety",
      "Green Build"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Mechanical Rough-In",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 12829,
    issuedDate: "2023-05-02T10:40:11.015Z",
    dueDate: "2023-05-23T10:40:11.015Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-011-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3344,
        lineItemTotal: 6688,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-011-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Other for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1540,
        lineItemTotal: 4620,
        lineItemType: "Other"
      },
      {
        lineItemId: "clientinvoice-011-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 13,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 117,
        lineItemTotal: 1521,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "clientinvoice-012",
    entityType: "ClientInvoice",
    title: "Invoice Cedar-2012",
    summary: "Client invoice for Cedar Ridge Homes covering finish carpentry progress.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Overdue",
    updatedAt: "2023-06-05T18:17:32.039Z",
    tags: [
      "Fire Protection",
      "Procurement",
      "Foundations"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Closeout",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 15"
    },
    totalValue: 18710,
    issuedDate: "2023-05-30T18:17:32.039Z",
    dueDate: "2023-07-26T18:17:32.039Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-012-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Labor for exterior siding on Building core areas",
        lineItemQuantity: 26,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 85,
        lineItemTotal: 2210,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-012-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3300,
        lineItemTotal: 16500,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "clientinvoice-013",
    entityType: "ClientInvoice",
    title: "Invoice Granite-2013",
    summary: "Client invoice for Granite Ridge Estates covering hvac progress.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Partial",
    updatedAt: "2023-06-28T12:11:26.310Z",
    tags: [
      "Fire Protection",
      "Exterior",
      "Interior"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Sitework",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 32476,
    issuedDate: "2023-06-10T12:11:26.310Z",
    dueDate: "2023-06-26T12:11:26.310Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-013-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Labor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 26,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 120,
        lineItemTotal: 3120,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-013-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Labor for low-voltage wiring on Building core areas",
        lineItemQuantity: 28,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 127,
        lineItemTotal: 3556,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-013-item-3",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Subcontractor for elevator cab finishes on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 5160,
        lineItemTotal: 25800,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "clientinvoice-014",
    entityType: "ClientInvoice",
    title: "Invoice Granite-2014",
    summary: "Client invoice for Granite Ridge Estates covering electrical progress.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Overdue",
    updatedAt: "2023-08-02T19:58:56.093Z",
    tags: [
      "Green Build",
      "HVAC",
      "Exterior"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Sitework",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 45"
    },
    totalValue: 29828,
    issuedDate: "2023-07-24T19:58:56.093Z",
    dueDate: "2023-08-27T19:58:56.093Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-014-item-1",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Subcontractor for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 5399,
        lineItemTotal: 5399,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-014-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Subcontractor for foundation waterproofing on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4362,
        lineItemTotal: 17448,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-014-item-3",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Other for rooftop units on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2327,
        lineItemTotal: 6981,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "clientinvoice-015",
    entityType: "ClientInvoice",
    title: "Invoice Riverbend-2015",
    summary: "Client invoice for Riverbend Condos covering concrete progress.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Paid",
    updatedAt: "2023-04-27T19:40:56.382Z",
    tags: [
      "Procurement",
      "Green Build",
      "Foundations"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Finishes",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 30"
    },
    totalValue: 18223,
    issuedDate: "2023-03-31T19:40:56.382Z",
    dueDate: "2023-05-23T19:40:56.382Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-015-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 895,
        lineItemTotal: 895,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "clientinvoice-015-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Subcontractor for foundation waterproofing on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2888,
        lineItemTotal: 17328,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "clientinvoice-016",
    entityType: "ClientInvoice",
    title: "Invoice Lakeside-2016",
    summary: "Client invoice for Lakeside Villas covering other progress.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Draft",
    updatedAt: "2023-04-28T04:34:15.986Z",
    tags: [
      "Green Build",
      "Prefabrication",
      "Exterior"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Framing",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30"
    },
    totalValue: 7825,
    issuedDate: "2023-04-12T04:34:15.986Z",
    dueDate: "2023-05-11T04:34:15.986Z",
    lineItems: [
      {
        lineItemId: "clientinvoice-016-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 22,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 119,
        lineItemTotal: 2618,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-016-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Labor for foundation waterproofing on Building core areas",
        lineItemQuantity: 18,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 127,
        lineItemTotal: 2286,
        lineItemType: "Labor"
      },
      {
        lineItemId: "clientinvoice-016-item-3",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2921,
        lineItemTotal: 2921,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "purchaseorder-001",
    entityType: "PurchaseOrder",
    title: "PO Marina-3001",
    summary: "Purchase order issued to Northwest Scaffold for other scope.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Pending",
    updatedAt: "2023-08-29T04:44:18.295Z",
    tags: [
      "Prefabrication",
      "Green Build",
      "Exterior"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Punch List",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30"
    },
    totalValue: 46250,
    issuedDate: "2023-08-24T04:44:18.295Z",
    dueDate: "2023-10-04T04:44:18.295Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-001-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3514,
        lineItemTotal: 3514,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-001-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Material for foundation waterproofing on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2336,
        lineItemTotal: 9344,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-001-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4201,
        lineItemTotal: 8402,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-001-item-4",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Material for interior paint on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4165,
        lineItemTotal: 24990,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "purchaseorder-002",
    entityType: "PurchaseOrder",
    title: "PO Sunset-3002",
    summary: "Purchase order issued to Ridge Roofing for roofing scope.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Closed",
    updatedAt: "2023-07-27T00:46:25.275Z",
    tags: [
      "Schedule",
      "Foundations",
      "HVAC"
    ],
    metadata: {
      vendor: "Ridge Roofing",
      vendorTrade: "Roofing",
      projectPhase: "Foundation",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 45"
    },
    totalValue: 16735,
    issuedDate: "2023-06-24T00:46:25.275Z",
    dueDate: "2023-08-08T00:46:25.275Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-002-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Material for interior paint on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1129,
        lineItemTotal: 1129,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-002-item-2",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2601,
        lineItemTotal: 15606,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "purchaseorder-003",
    entityType: "PurchaseOrder",
    title: "PO Cedar-3003",
    summary: "Purchase order issued to Northwest Scaffold for other scope.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Issued",
    updatedAt: "2023-09-02T06:40:17.203Z",
    tags: [
      "Safety",
      "HVAC",
      "Green Build"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Closeout",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 28940,
    issuedDate: "2023-08-28T06:40:17.203Z",
    dueDate: "2023-10-18T06:40:17.203Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-003-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1477,
        lineItemTotal: 4431,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-003-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 11,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 87,
        lineItemTotal: 957,
        lineItemType: "Labor"
      },
      {
        lineItemId: "purchaseorder-003-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3779,
        lineItemTotal: 15116,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "purchaseorder-003-item-4",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2109,
        lineItemTotal: 8436,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "purchaseorder-004",
    entityType: "PurchaseOrder",
    title: "PO Harbor-3004",
    summary: "Purchase order issued to Summit Electric for electrical scope.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Pending",
    updatedAt: "2023-03-13T13:08:08.596Z",
    tags: [
      "Foundations",
      "Prefabrication",
      "Fire Protection"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Mechanical Rough-In",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 45"
    },
    totalValue: 20405,
    issuedDate: "2023-02-28T13:08:08.596Z",
    dueDate: "2023-03-23T13:08:08.596Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-004-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3294,
        lineItemTotal: 13176,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-004-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2236,
        lineItemTotal: 2236,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-004-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 29,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 91,
        lineItemTotal: 2639,
        lineItemType: "Labor"
      },
      {
        lineItemId: "purchaseorder-004-item-4",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 22,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 107,
        lineItemTotal: 2354,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "purchaseorder-005",
    entityType: "PurchaseOrder",
    title: "PO Lakeside-3005",
    summary: "Purchase order issued to Northwest Scaffold for other scope.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Acknowledged",
    updatedAt: "2023-08-14T02:42:36.989Z",
    tags: [
      "Safety",
      "Interior",
      "Procurement"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Framing",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30"
    },
    totalValue: 29640,
    issuedDate: "2023-07-22T02:42:36.989Z",
    dueDate: "2023-09-18T02:42:36.989Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-005-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2534,
        lineItemTotal: 15204,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-005-item-2",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2406,
        lineItemTotal: 14436,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "purchaseorder-006",
    entityType: "PurchaseOrder",
    title: "PO Mesa-3006",
    summary: "Purchase order issued to Evergreen Mechanical for hvac scope.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Acknowledged",
    updatedAt: "2023-03-05T03:59:10.974Z",
    tags: [
      "Interior",
      "HVAC",
      "Exterior"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Exterior Finishes",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30"
    },
    totalValue: 40484,
    issuedDate: "2023-02-15T03:59:10.974Z",
    dueDate: "2023-03-31T03:59:10.974Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-006-item-1",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Subcontractor for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4636,
        lineItemTotal: 4636,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "purchaseorder-006-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Labor for landscape irrigation on Building core areas",
        lineItemQuantity: 19,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 87,
        lineItemTotal: 1653,
        lineItemType: "Labor"
      },
      {
        lineItemId: "purchaseorder-006-item-3",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4991,
        lineItemTotal: 24955,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-006-item-4",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Subcontractor for foundation waterproofing on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1848,
        lineItemTotal: 9240,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "purchaseorder-007",
    entityType: "PurchaseOrder",
    title: "PO Pinecrest-3007",
    summary: "Purchase order issued to Ridge Roofing for roofing scope.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Closed",
    updatedAt: "2023-09-14T15:58:39.982Z",
    tags: [
      "Prefabrication",
      "Procurement",
      "Exterior"
    ],
    metadata: {
      vendor: "Ridge Roofing",
      vendorTrade: "Roofing",
      projectPhase: "Pre-Construction",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 45"
    },
    totalValue: 29877,
    issuedDate: "2023-08-15T15:58:39.982Z",
    dueDate: "2023-10-06T15:58:39.982Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-007-item-1",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Material for main service panel on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3625,
        lineItemTotal: 10875,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-007-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Material for main service panel on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2739,
        lineItemTotal: 10956,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-007-item-3",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2682,
        lineItemTotal: 8046,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "purchaseorder-008",
    entityType: "PurchaseOrder",
    title: "PO Willow-3008",
    summary: "Purchase order issued to BlueSky Concrete for concrete scope.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Closed",
    updatedAt: "2024-02-22T08:01:37.980Z",
    tags: [
      "Schedule",
      "Safety",
      "Exterior"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Design Development",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30"
    },
    totalValue: 43175,
    issuedDate: "2024-02-07T08:01:37.980Z",
    dueDate: "2024-02-25T08:01:37.980Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-008-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Labor for exterior siding on Building core areas",
        lineItemQuantity: 27,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 112,
        lineItemTotal: 3024,
        lineItemType: "Labor"
      },
      {
        lineItemId: "purchaseorder-008-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5465,
        lineItemTotal: 10930,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-008-item-3",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Material for exterior siding on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5505,
        lineItemTotal: 27525,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-008-item-4",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Labor for foundation waterproofing on Building core areas",
        lineItemQuantity: 16,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 106,
        lineItemTotal: 1696,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "purchaseorder-009",
    entityType: "PurchaseOrder",
    title: "PO Sunset-3009",
    summary: "Purchase order issued to Granite State Supply for material scope.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Pending",
    updatedAt: "2024-02-29T20:52:33.929Z",
    tags: [
      "HVAC",
      "Interior",
      "Exterior"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Foundation",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 30"
    },
    totalValue: 13558,
    issuedDate: "2024-02-01T20:52:33.929Z",
    dueDate: "2024-02-27T20:52:33.929Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-009-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 782,
        lineItemTotal: 2346,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-009-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Other for elevator cab finishes on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2803,
        lineItemTotal: 11212,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "purchaseorder-010",
    entityType: "PurchaseOrder",
    title: "PO Sunset-3010",
    summary: "Purchase order issued to Northwest Scaffold for other scope.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Acknowledged",
    updatedAt: "2023-11-20T09:30:01.348Z",
    tags: [
      "Exterior",
      "Foundations",
      "Prefabrication"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Foundation",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 31776,
    issuedDate: "2023-10-31T09:30:01.348Z",
    dueDate: "2023-12-08T09:30:01.348Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-010-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Subcontractor for elevator cab finishes on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2974,
        lineItemTotal: 17844,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "purchaseorder-010-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1118,
        lineItemTotal: 3354,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-010-item-3",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3236,
        lineItemTotal: 9708,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-010-item-4",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 870,
        lineItemTotal: 870,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "purchaseorder-011",
    entityType: "PurchaseOrder",
    title: "PO Willow-3011",
    summary: "Purchase order issued to Summit Electric for electrical scope.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Pending",
    updatedAt: "2024-02-24T02:44:05.618Z",
    tags: [
      "HVAC",
      "Exterior",
      "Schedule"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Design Development",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 45"
    },
    totalValue: 40508,
    issuedDate: "2024-02-08T02:44:05.618Z",
    dueDate: "2024-02-23T02:44:05.618Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-011-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Material for elevator cab finishes on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2164,
        lineItemTotal: 10820,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-011-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3865,
        lineItemTotal: 19325,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "purchaseorder-011-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1815,
        lineItemTotal: 7260,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-011-item-4",
        lineItemTitle: "Window package",
        lineItemDescription: "Labor for window package on Building core areas",
        lineItemQuantity: 29,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 107,
        lineItemTotal: 3103,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "purchaseorder-012",
    entityType: "PurchaseOrder",
    title: "PO Willow-3012",
    summary: "Purchase order issued to Northwest Scaffold for other scope.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Pending",
    updatedAt: "2023-05-24T00:53:43.687Z",
    tags: [
      "Procurement",
      "HVAC",
      "Green Build"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Design Development",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 17025,
    issuedDate: "2023-05-16T00:53:43.687Z",
    dueDate: "2023-06-11T00:53:43.687Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-012-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2349,
        lineItemTotal: 7047,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-012-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Material for elevator cab finishes on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1663,
        lineItemTotal: 9978,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "purchaseorder-013",
    entityType: "PurchaseOrder",
    title: "PO Mesa-3013",
    summary: "Purchase order issued to Evergreen Mechanical for hvac scope.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Issued",
    updatedAt: "2023-05-30T23:31:28.978Z",
    tags: [
      "Prefabrication",
      "Foundations",
      "Schedule"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Exterior Finishes",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 8040,
    issuedDate: "2023-05-15T23:31:28.978Z",
    dueDate: "2023-06-08T23:31:28.978Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-013-item-1",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1275,
        lineItemTotal: 1275,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-013-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2255,
        lineItemTotal: 6765,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "purchaseorder-014",
    entityType: "PurchaseOrder",
    title: "PO Cedar-3014",
    summary: "Purchase order issued to Summit Electric for electrical scope.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Issued",
    updatedAt: "2023-12-19T01:01:46.647Z",
    tags: [
      "Prefabrication",
      "Foundations",
      "Green Build"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Closeout",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 45"
    },
    totalValue: 36402,
    issuedDate: "2023-11-28T01:01:46.647Z",
    dueDate: "2023-12-25T01:01:46.647Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-014-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Subcontractor for foundation waterproofing on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4323,
        lineItemTotal: 17292,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "purchaseorder-014-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5561,
        lineItemTotal: 11122,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-014-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Material for interior paint on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 645,
        lineItemTotal: 2580,
        lineItemType: "Material"
      },
      {
        lineItemId: "purchaseorder-014-item-4",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5408,
        lineItemTotal: 5408,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "purchaseorder-015",
    entityType: "PurchaseOrder",
    title: "PO Marina-3015",
    summary: "Purchase order issued to Northwest Scaffold for other scope.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Issued",
    updatedAt: "2023-06-24T09:00:53.665Z",
    tags: [
      "Fire Protection",
      "Procurement",
      "Exterior"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Punch List",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 45402,
    issuedDate: "2023-05-30T09:00:53.665Z",
    dueDate: "2023-06-17T09:00:53.665Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-015-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2533,
        lineItemTotal: 15198,
        lineItemType: "Other"
      },
      {
        lineItemId: "purchaseorder-015-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Other for rooftop units on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5034,
        lineItemTotal: 30204,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "purchaseorder-016",
    entityType: "PurchaseOrder",
    title: "PO Pinecrest-3016",
    summary: "Purchase order issued to Granite State Supply for material scope.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Acknowledged",
    updatedAt: "2024-03-04T12:11:17.277Z",
    tags: [
      "Interior",
      "Safety",
      "Exterior"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Pre-Construction",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 33558,
    issuedDate: "2024-02-04T12:11:17.277Z",
    dueDate: "2024-03-25T12:11:17.277Z",
    lineItems: [
      {
        lineItemId: "purchaseorder-016-item-1",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Labor for main service panel on Building core areas",
        lineItemQuantity: 18,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 123,
        lineItemTotal: 2214,
        lineItemType: "Labor"
      },
      {
        lineItemId: "purchaseorder-016-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5224,
        lineItemTotal: 31344,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "bill-001",
    entityType: "Bill",
    title: "Bill from Summit Electric",
    summary: "Vendor bill from Summit Electric for recent electrical work.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Scheduled",
    updatedAt: "2023-03-08T17:05:08.389Z",
    tags: [
      "Green Build",
      "Exterior",
      "Procurement"
    ],
    metadata: {
      vendor: "Summit Electric",
      vendorTrade: "Electrical",
      projectPhase: "Punch List",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 45"
    },
    totalValue: 22024,
    issuedDate: "2023-02-19T17:05:08.389Z",
    dueDate: "2023-03-31T17:05:08.389Z",
    lineItems: [
      {
        lineItemId: "bill-001-item-1",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3178,
        lineItemTotal: 19068,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-001-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 739,
        lineItemTotal: 2956,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "bill-002",
    entityType: "Bill",
    title: "Bill from Evergreen Mechanical",
    summary: "Vendor bill from Evergreen Mechanical for recent hvac work.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Approved",
    updatedAt: "2024-03-23T13:01:16.736Z",
    tags: [
      "Exterior",
      "Fire Protection",
      "Safety"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Sitework",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30"
    },
    totalValue: 11731,
    issuedDate: "2024-02-21T13:01:16.736Z",
    dueDate: "2024-03-17T13:01:16.736Z",
    lineItems: [
      {
        lineItemId: "bill-002-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4914,
        lineItemTotal: 9828,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-002-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Subcontractor for rooftop units on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1903,
        lineItemTotal: 1903,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "bill-003",
    entityType: "Bill",
    title: "Bill from Evergreen Mechanical",
    summary: "Vendor bill from Evergreen Mechanical for recent hvac work.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Approved",
    updatedAt: "2023-08-16T09:26:27.941Z",
    tags: [
      "HVAC",
      "Green Build",
      "Interior"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Sitework",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 30"
    },
    totalValue: 22580,
    issuedDate: "2023-07-14T09:26:27.941Z",
    dueDate: "2023-08-13T09:26:27.941Z",
    lineItems: [
      {
        lineItemId: "bill-003-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Other for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1472,
        lineItemTotal: 5888,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-003-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2782,
        lineItemTotal: 16692,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "bill-004",
    entityType: "Bill",
    title: "Bill from Cascade Finishes",
    summary: "Vendor bill from Cascade Finishes for recent finish carpentry work.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Scheduled",
    updatedAt: "2023-03-17T07:09:23.383Z",
    tags: [
      "Interior",
      "Safety",
      "Foundations"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Pre-Construction",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 15"
    },
    totalValue: 25448,
    issuedDate: "2023-02-22T07:09:23.383Z",
    dueDate: "2023-03-19T07:09:23.383Z",
    lineItems: [
      {
        lineItemId: "bill-004-item-1",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Material for main service panel on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4058,
        lineItemTotal: 24348,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-004-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Labor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 10,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 110,
        lineItemTotal: 1100,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "bill-005",
    entityType: "Bill",
    title: "Bill from Precision Plumbing",
    summary: "Vendor bill from Precision Plumbing for recent plumbing work.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Received",
    updatedAt: "2024-01-18T16:31:29.877Z",
    tags: [
      "Interior",
      "Green Build",
      "Safety"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Closeout",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 34597,
    issuedDate: "2023-12-28T16:31:29.877Z",
    dueDate: "2024-02-03T16:31:29.877Z",
    lineItems: [
      {
        lineItemId: "bill-005-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Subcontractor for window package on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3198,
        lineItemTotal: 15990,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-005-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Other for rooftop units on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4443,
        lineItemTotal: 17772,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-005-item-3",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 835,
        lineItemTotal: 835,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "bill-006",
    entityType: "Bill",
    title: "Bill from Evergreen Mechanical",
    summary: "Vendor bill from Evergreen Mechanical for recent hvac work.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Approved",
    updatedAt: "2023-03-17T14:45:53.753Z",
    tags: [
      "Foundations",
      "Fire Protection",
      "Exterior"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Closeout",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 69944,
    issuedDate: "2023-02-15T14:45:53.753Z",
    dueDate: "2023-04-04T14:45:53.753Z",
    lineItems: [
      {
        lineItemId: "bill-006-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Material for elevator cab finishes on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5354,
        lineItemTotal: 32124,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-006-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5605,
        lineItemTotal: 33630,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-006-item-3",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4190,
        lineItemTotal: 4190,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "bill-007",
    entityType: "Bill",
    title: "Bill from Granite State Supply",
    summary: "Vendor bill from Granite State Supply for recent material work.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Scheduled",
    updatedAt: "2024-01-10T06:52:46.042Z",
    tags: [
      "Foundations",
      "Schedule",
      "HVAC"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Finishes",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 22135,
    issuedDate: "2023-12-13T06:52:46.042Z",
    dueDate: "2024-01-22T06:52:46.042Z",
    lineItems: [
      {
        lineItemId: "bill-007-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1932,
        lineItemTotal: 1932,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-007-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Labor for foundation waterproofing on Building core areas",
        lineItemQuantity: 29,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 98,
        lineItemTotal: 2842,
        lineItemType: "Labor"
      },
      {
        lineItemId: "bill-007-item-3",
        lineItemTitle: "Window package",
        lineItemDescription: "Labor for window package on Building core areas",
        lineItemQuantity: 9,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 115,
        lineItemTotal: 1035,
        lineItemType: "Labor"
      },
      {
        lineItemId: "bill-007-item-4",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5442,
        lineItemTotal: 16326,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "bill-008",
    entityType: "Bill",
    title: "Bill from Precision Plumbing",
    summary: "Vendor bill from Precision Plumbing for recent plumbing work.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Received",
    updatedAt: "2023-03-26T01:41:46.025Z",
    tags: [
      "Procurement",
      "Fire Protection",
      "Interior"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Finishes",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 32754,
    issuedDate: "2023-02-24T01:41:46.025Z",
    dueDate: "2023-04-14T01:41:46.025Z",
    lineItems: [
      {
        lineItemId: "bill-008-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4200,
        lineItemTotal: 21e3,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-008-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 18,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 99,
        lineItemTotal: 1782,
        lineItemType: "Labor"
      },
      {
        lineItemId: "bill-008-item-3",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1330,
        lineItemTotal: 6650,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-008-item-4",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3322,
        lineItemTotal: 3322,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "bill-009",
    entityType: "Bill",
    title: "Bill from Evergreen Mechanical",
    summary: "Vendor bill from Evergreen Mechanical for recent hvac work.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Received",
    updatedAt: "2023-02-22T17:35:14.918Z",
    tags: [
      "Schedule",
      "Exterior",
      "HVAC"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Exterior Finishes",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 23870,
    issuedDate: "2023-02-09T17:35:14.918Z",
    dueDate: "2023-04-07T17:35:14.918Z",
    lineItems: [
      {
        lineItemId: "bill-009-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Subcontractor for exterior siding on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4306,
        lineItemTotal: 21530,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-009-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 26,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 90,
        lineItemTotal: 2340,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "bill-010",
    entityType: "Bill",
    title: "Bill from Precision Plumbing",
    summary: "Vendor bill from Precision Plumbing for recent plumbing work.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Approved",
    updatedAt: "2023-05-07T06:40:53.331Z",
    tags: [
      "Green Build",
      "Procurement",
      "Schedule"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Punch List",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 39199,
    issuedDate: "2023-04-17T06:40:53.331Z",
    dueDate: "2023-05-31T06:40:53.331Z",
    lineItems: [
      {
        lineItemId: "bill-010-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Material for foundation waterproofing on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2721,
        lineItemTotal: 10884,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-010-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1260,
        lineItemTotal: 3780,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-010-item-3",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4907,
        lineItemTotal: 24535,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "bill-011",
    entityType: "Bill",
    title: "Bill from Evergreen Mechanical",
    summary: "Vendor bill from Evergreen Mechanical for recent hvac work.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Paid",
    updatedAt: "2023-12-31T03:17:03.732Z",
    tags: [
      "Procurement",
      "Foundations",
      "HVAC"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Exterior Finishes",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 40904,
    issuedDate: "2023-11-30T03:17:03.732Z",
    dueDate: "2023-12-29T03:17:03.732Z",
    lineItems: [
      {
        lineItemId: "bill-011-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2852,
        lineItemTotal: 2852,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-011-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5204,
        lineItemTotal: 26020,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-011-item-3",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Material for exterior siding on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3008,
        lineItemTotal: 12032,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "bill-012",
    entityType: "Bill",
    title: "Bill from Northwest Scaffold",
    summary: "Vendor bill from Northwest Scaffold for recent other work.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Received",
    updatedAt: "2024-05-19T21:32:48.757Z",
    tags: [
      "Safety",
      "Foundations",
      "Procurement"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Closeout",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 14391,
    issuedDate: "2024-04-15T21:32:48.757Z",
    dueDate: "2024-05-04T21:32:48.757Z",
    lineItems: [
      {
        lineItemId: "bill-012-item-1",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1261,
        lineItemTotal: 3783,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-012-item-2",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4335,
        lineItemTotal: 8670,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-012-item-3",
        lineItemTitle: "Window package",
        lineItemDescription: "Labor for window package on Building core areas",
        lineItemQuantity: 19,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 102,
        lineItemTotal: 1938,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "bill-013",
    entityType: "Bill",
    title: "Bill from BlueSky Concrete",
    summary: "Vendor bill from BlueSky Concrete for recent concrete work.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Scheduled",
    updatedAt: "2024-04-10T17:38:03.735Z",
    tags: [
      "Fire Protection",
      "Interior",
      "Prefabrication"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Pre-Construction",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 29783,
    issuedDate: "2024-03-18T17:38:03.735Z",
    dueDate: "2024-05-10T17:38:03.735Z",
    lineItems: [
      {
        lineItemId: "bill-013-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2055,
        lineItemTotal: 8220,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-013-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Other for low-voltage wiring on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 766,
        lineItemTotal: 766,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-013-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3661,
        lineItemTotal: 18305,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-013-item-4",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 28,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 89,
        lineItemTotal: 2492,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "bill-014",
    entityType: "Bill",
    title: "Bill from Northwest Scaffold",
    summary: "Vendor bill from Northwest Scaffold for recent other work.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Approved",
    updatedAt: "2023-09-20T23:02:01.541Z",
    tags: [
      "Safety",
      "Schedule",
      "Exterior"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Punch List",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30"
    },
    totalValue: 33770,
    issuedDate: "2023-08-29T23:02:01.541Z",
    dueDate: "2023-09-16T23:02:01.541Z",
    lineItems: [
      {
        lineItemId: "bill-014-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Other for elevator cab finishes on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4598,
        lineItemTotal: 9196,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-014-item-2",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Material for exterior siding on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2073,
        lineItemTotal: 6219,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-014-item-3",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5521,
        lineItemTotal: 16563,
        lineItemType: "Material"
      },
      {
        lineItemId: "bill-014-item-4",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Labor for main service panel on Building core areas",
        lineItemQuantity: 16,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 112,
        lineItemTotal: 1792,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "bill-015",
    entityType: "Bill",
    title: "Bill from Northwest Scaffold",
    summary: "Vendor bill from Northwest Scaffold for recent other work.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Approved",
    updatedAt: "2023-03-19T20:52:03.704Z",
    tags: [
      "Schedule",
      "Green Build",
      "Safety"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Punch List",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 39292,
    issuedDate: "2023-02-15T20:52:03.704Z",
    dueDate: "2023-04-09T20:52:03.704Z",
    lineItems: [
      {
        lineItemId: "bill-015-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Other for elevator cab finishes on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3065,
        lineItemTotal: 9195,
        lineItemType: "Other"
      },
      {
        lineItemId: "bill-015-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Subcontractor for rooftop units on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3694,
        lineItemTotal: 7388,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-015-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4189,
        lineItemTotal: 20945,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-015-item-4",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 14,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 126,
        lineItemTotal: 1764,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "bill-016",
    entityType: "Bill",
    title: "Bill from Cascade Finishes",
    summary: "Vendor bill from Cascade Finishes for recent finish carpentry work.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Paid",
    updatedAt: "2024-01-24T16:32:49.417Z",
    tags: [
      "Safety",
      "Schedule",
      "Procurement"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Mechanical Rough-In",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 15"
    },
    totalValue: 20717,
    issuedDate: "2024-01-04T16:32:49.417Z",
    dueDate: "2024-02-05T16:32:49.417Z",
    lineItems: [
      {
        lineItemId: "bill-016-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1422,
        lineItemTotal: 1422,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-016-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Subcontractor for main service panel on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3184,
        lineItemTotal: 15920,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "bill-016-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 27,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 125,
        lineItemTotal: 3375,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "receipt-001",
    entityType: "Receipt",
    title: "Evergreen Mechanical receipt",
    summary: "Receipt logged from Evergreen Mechanical to confirm delivery of materials.",
    project: "Granite Ridge Estates",
    client: "Patricia & Antonio Lopez",
    status: "Reconciled",
    updatedAt: "2024-01-10T06:40:41.598Z",
    tags: [
      "Fire Protection",
      "Green Build",
      "Interior"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Sitework",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 5559,
    issuedDate: "2023-12-25T06:40:41.598Z",
    lineItems: [
      {
        lineItemId: "receipt-001-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 24,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 124,
        lineItemTotal: 2976,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-001-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Material for elevator cab finishes on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2583,
        lineItemTotal: 2583,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "receipt-002",
    entityType: "Receipt",
    title: "Northwest Scaffold receipt",
    summary: "Receipt logged from Northwest Scaffold to confirm delivery of materials.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Reconciled",
    updatedAt: "2023-08-23T18:42:42.351Z",
    tags: [
      "Safety",
      "Green Build",
      "Procurement"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Framing",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 30"
    },
    totalValue: 31566,
    issuedDate: "2023-08-14T18:42:42.351Z",
    lineItems: [
      {
        lineItemId: "receipt-002-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 20,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 105,
        lineItemTotal: 2100,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-002-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Subcontractor for elevator cab finishes on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 4029,
        lineItemTotal: 8058,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "receipt-002-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4266,
        lineItemTotal: 8532,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-002-item-4",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3219,
        lineItemTotal: 12876,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "receipt-003",
    entityType: "Receipt",
    title: "BlueSky Concrete receipt",
    summary: "Receipt logged from BlueSky Concrete to confirm delivery of materials.",
    project: "Harbor Point Residences",
    client: "Sarah & James Wilson",
    status: "Reconciled",
    updatedAt: "2023-08-23T15:48:36.420Z",
    tags: [
      "Interior",
      "Safety",
      "Schedule"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Mechanical Rough-In",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 33050,
    issuedDate: "2023-08-16T15:48:36.420Z",
    lineItems: [
      {
        lineItemId: "receipt-003-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3394,
        lineItemTotal: 16970,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-003-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Labor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 31,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 108,
        lineItemTotal: 3348,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-003-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2122,
        lineItemTotal: 12732,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "receipt-004",
    entityType: "Receipt",
    title: "Granite State Supply receipt",
    summary: "Receipt logged from Granite State Supply to confirm delivery of materials.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Reconciled",
    updatedAt: "2023-11-03T09:32:44.563Z",
    tags: [
      "Fire Protection",
      "Green Build",
      "Schedule"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Pre-Construction",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 31355,
    issuedDate: "2023-10-29T09:32:44.563Z",
    lineItems: [
      {
        lineItemId: "receipt-004-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 945,
        lineItemTotal: 4725,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "receipt-004-item-2",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Material for exterior siding on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5326,
        lineItemTotal: 26630,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "receipt-005",
    entityType: "Receipt",
    title: "Precision Plumbing receipt",
    summary: "Receipt logged from Precision Plumbing to confirm delivery of materials.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Reconciled",
    updatedAt: "2024-03-31T23:56:03.966Z",
    tags: [
      "Exterior",
      "Green Build",
      "HVAC"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Design Development",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 12780,
    issuedDate: "2024-03-05T23:56:03.966Z",
    lineItems: [
      {
        lineItemId: "receipt-005-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1710,
        lineItemTotal: 10260,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-005-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Labor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 24,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 105,
        lineItemTotal: 2520,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "receipt-006",
    entityType: "Receipt",
    title: "Precision Plumbing receipt",
    summary: "Receipt logged from Precision Plumbing to confirm delivery of materials.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Logged",
    updatedAt: "2023-09-25T01:36:52.271Z",
    tags: [
      "Green Build",
      "Interior",
      "Procurement"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Closeout",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 13350,
    issuedDate: "2023-08-28T01:36:52.271Z",
    lineItems: [
      {
        lineItemId: "receipt-006-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 17,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 120,
        lineItemTotal: 2040,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-006-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Other for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3770,
        lineItemTotal: 11310,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "receipt-007",
    entityType: "Receipt",
    title: "Precision Plumbing receipt",
    summary: "Receipt logged from Precision Plumbing to confirm delivery of materials.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Logged",
    updatedAt: "2023-12-02T15:40:30.120Z",
    tags: [
      "Schedule",
      "Green Build",
      "Foundations"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Pre-Construction",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30"
    },
    totalValue: 9321,
    issuedDate: "2023-11-09T15:40:30.120Z",
    lineItems: [
      {
        lineItemId: "receipt-007-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2644,
        lineItemTotal: 2644,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-007-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 21,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 99,
        lineItemTotal: 2079,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-007-item-3",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Labor for foundation waterproofing on Building core areas",
        lineItemQuantity: 27,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 98,
        lineItemTotal: 2646,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-007-item-4",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Labor for main service panel on Building core areas",
        lineItemQuantity: 16,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 122,
        lineItemTotal: 1952,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "receipt-008",
    entityType: "Receipt",
    title: "Cascade Finishes receipt",
    summary: "Receipt logged from Cascade Finishes to confirm delivery of materials.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Logged",
    updatedAt: "2023-08-18T18:11:27.008Z",
    tags: [
      "Procurement",
      "Foundations",
      "Schedule"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Punch List",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 15"
    },
    totalValue: 7432,
    issuedDate: "2023-07-21T18:11:27.008Z",
    lineItems: [
      {
        lineItemId: "receipt-008-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Other for foundation waterproofing on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5576,
        lineItemTotal: 5576,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-008-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Labor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 16,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 116,
        lineItemTotal: 1856,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "receipt-009",
    entityType: "Receipt",
    title: "BlueSky Concrete receipt",
    summary: "Receipt logged from BlueSky Concrete to confirm delivery of materials.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Reconciled",
    updatedAt: "2023-10-10T19:56:06.395Z",
    tags: [
      "Fire Protection",
      "Safety",
      "Green Build"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Pre-Construction",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 29651,
    issuedDate: "2023-10-05T19:56:06.395Z",
    lineItems: [
      {
        lineItemId: "receipt-009-item-1",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 18,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 112,
        lineItemTotal: 2016,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-009-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Other for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5578,
        lineItemTotal: 22312,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-009-item-3",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Subcontractor for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3932,
        lineItemTotal: 3932,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "receipt-009-item-4",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Labor for interior paint on Building core areas",
        lineItemQuantity: 13,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 107,
        lineItemTotal: 1391,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "receipt-010",
    entityType: "Receipt",
    title: "Evergreen Mechanical receipt",
    summary: "Receipt logged from Evergreen Mechanical to confirm delivery of materials.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Logged",
    updatedAt: "2024-05-09T07:15:14.863Z",
    tags: [
      "Fire Protection",
      "Exterior",
      "Procurement"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Closeout",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30"
    },
    totalValue: 39132,
    issuedDate: "2024-04-22T07:15:14.863Z",
    lineItems: [
      {
        lineItemId: "receipt-010-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3602,
        lineItemTotal: 21612,
        lineItemType: "Material"
      },
      {
        lineItemId: "receipt-010-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Other for main service panel on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3475,
        lineItemTotal: 10425,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-010-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2920,
        lineItemTotal: 2920,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "receipt-010-item-4",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Other for low-voltage wiring on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4175,
        lineItemTotal: 4175,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "receipt-011",
    entityType: "Receipt",
    title: "BlueSky Concrete receipt",
    summary: "Receipt logged from BlueSky Concrete to confirm delivery of materials.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Logged",
    updatedAt: "2024-05-05T21:32:16.806Z",
    tags: [
      "HVAC",
      "Fire Protection",
      "Procurement"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Foundation",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 30"
    },
    totalValue: 39247,
    issuedDate: "2024-04-08T21:32:16.806Z",
    lineItems: [
      {
        lineItemId: "receipt-011-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4155,
        lineItemTotal: 20775,
        lineItemType: "Material"
      },
      {
        lineItemId: "receipt-011-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Labor for landscape irrigation on Building core areas",
        lineItemQuantity: 12,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 97,
        lineItemTotal: 1164,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-011-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Other for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4327,
        lineItemTotal: 17308,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "receipt-012",
    entityType: "Receipt",
    title: "Northwest Scaffold receipt",
    summary: "Receipt logged from Northwest Scaffold to confirm delivery of materials.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Reconciled",
    updatedAt: "2024-03-03T02:31:58.033Z",
    tags: [
      "Exterior",
      "Safety",
      "Foundations"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Design Development",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 30"
    },
    totalValue: 49121,
    issuedDate: "2024-01-29T02:31:58.033Z",
    lineItems: [
      {
        lineItemId: "receipt-012-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4432,
        lineItemTotal: 4432,
        lineItemType: "Material"
      },
      {
        lineItemId: "receipt-012-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Other for elevator cab finishes on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2256,
        lineItemTotal: 11280,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-012-item-3",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 5135,
        lineItemTotal: 15405,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-012-item-4",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Material for elevator cab finishes on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4501,
        lineItemTotal: 18004,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "receipt-013",
    entityType: "Receipt",
    title: "BlueSky Concrete receipt",
    summary: "Receipt logged from BlueSky Concrete to confirm delivery of materials.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Logged",
    updatedAt: "2023-10-14T14:56:39.893Z",
    tags: [
      "Foundations",
      "Fire Protection",
      "Green Build"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Punch List",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30"
    },
    totalValue: 5665,
    issuedDate: "2023-09-25T14:56:39.893Z",
    lineItems: [
      {
        lineItemId: "receipt-013-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Labor for window package on Building core areas",
        lineItemQuantity: 26,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 96,
        lineItemTotal: 2496,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-013-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Labor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 19,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 123,
        lineItemTotal: 2337,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-013-item-3",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 8,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 104,
        lineItemTotal: 832,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "receipt-014",
    entityType: "Receipt",
    title: "Northwest Scaffold receipt",
    summary: "Receipt logged from Northwest Scaffold to confirm delivery of materials.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Reconciled",
    updatedAt: "2024-04-25T00:00:09.685Z",
    tags: [
      "Fire Protection",
      "Procurement",
      "HVAC"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Pre-Construction",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 30"
    },
    totalValue: 13433,
    issuedDate: "2024-04-03T00:00:09.685Z",
    lineItems: [
      {
        lineItemId: "receipt-014-item-1",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Other for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1966,
        lineItemTotal: 5898,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-014-item-2",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1507,
        lineItemTotal: 7535,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "receipt-015",
    entityType: "Receipt",
    title: "BlueSky Concrete receipt",
    summary: "Receipt logged from BlueSky Concrete to confirm delivery of materials.",
    project: "Mesa Verde Townhomes",
    client: "Ana & David Martinez",
    status: "Reconciled",
    updatedAt: "2023-03-12T04:58:14.068Z",
    tags: [
      "Green Build",
      "Foundations",
      "Fire Protection"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Exterior Finishes",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30"
    },
    totalValue: 43095,
    issuedDate: "2023-02-23T04:58:14.068Z",
    lineItems: [
      {
        lineItemId: "receipt-015-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Other for rooftop units on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 975,
        lineItemTotal: 975,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-015-item-2",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3310,
        lineItemTotal: 9930,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-015-item-3",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2051,
        lineItemTotal: 12306,
        lineItemType: "Other"
      },
      {
        lineItemId: "receipt-015-item-4",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Material for low-voltage wiring on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4971,
        lineItemTotal: 19884,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "receipt-016",
    entityType: "Receipt",
    title: "BlueSky Concrete receipt",
    summary: "Receipt logged from BlueSky Concrete to confirm delivery of materials.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Logged",
    updatedAt: "2024-03-30T21:32:42.249Z",
    tags: [
      "HVAC",
      "Safety",
      "Prefabrication"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Framing",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30"
    },
    totalValue: 3864,
    issuedDate: "2024-03-07T21:32:42.249Z",
    lineItems: [
      {
        lineItemId: "receipt-016-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 24,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 109,
        lineItemTotal: 2616,
        lineItemType: "Labor"
      },
      {
        lineItemId: "receipt-016-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 12,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 104,
        lineItemTotal: 1248,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "payment-001",
    entityType: "Payment",
    title: "Granite State Supply payment",
    summary: "Payment recorded to Granite State Supply via Check.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Cleared",
    updatedAt: "2024-05-06T13:49:00.162Z",
    tags: [
      "Procurement",
      "Safety",
      "Schedule"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Punch List",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30",
      paymentMethod: "Wire Transfer"
    },
    totalValue: 15133,
    issuedDate: "2024-04-30T13:49:00.162Z",
    dueDate: "2024-05-19T13:49:00.162Z",
    lineItems: [
      {
        lineItemId: "payment-001-item-1",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1115,
        lineItemTotal: 5575,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-001-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1593,
        lineItemTotal: 9558,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "payment-002",
    entityType: "Payment",
    title: "Evergreen Mechanical payment",
    summary: "Payment recorded to Evergreen Mechanical via ACH.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Processing",
    updatedAt: "2023-04-02T11:14:50.974Z",
    tags: [
      "Procurement",
      "Exterior",
      "Fire Protection"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Closeout",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30",
      paymentMethod: "Check"
    },
    totalValue: 42598,
    issuedDate: "2023-03-10T11:14:50.974Z",
    dueDate: "2023-04-26T11:14:50.974Z",
    lineItems: [
      {
        lineItemId: "payment-002-item-1",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Other for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4992,
        lineItemTotal: 19968,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-002-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3143,
        lineItemTotal: 12572,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-002-item-3",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Subcontractor for exterior siding on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 5358,
        lineItemTotal: 5358,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-002-item-4",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1175,
        lineItemTotal: 4700,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "payment-003",
    entityType: "Payment",
    title: "BlueSky Concrete payment",
    summary: "Payment recorded to BlueSky Concrete via ACH.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Processing",
    updatedAt: "2023-12-11T02:19:40.136Z",
    tags: [
      "Interior",
      "Exterior",
      "Safety"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Punch List",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30",
      paymentMethod: "Check"
    },
    totalValue: 32697,
    issuedDate: "2023-11-22T02:19:40.136Z",
    dueDate: "2023-12-16T02:19:40.136Z",
    lineItems: [
      {
        lineItemId: "payment-003-item-1",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Other for low-voltage wiring on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4287,
        lineItemTotal: 12861,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-003-item-2",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 776,
        lineItemTotal: 3880,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-003-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2302,
        lineItemTotal: 4604,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-003-item-4",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1892,
        lineItemTotal: 11352,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "payment-004",
    entityType: "Payment",
    title: "Cascade Finishes payment",
    summary: "Payment recorded to Cascade Finishes via Check.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Scheduled",
    updatedAt: "2023-09-11T05:20:45.486Z",
    tags: [
      "Green Build",
      "Interior",
      "Schedule"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Framing",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 15",
      paymentMethod: "Check"
    },
    totalValue: 16198,
    issuedDate: "2023-08-10T05:20:45.486Z",
    dueDate: "2023-09-29T05:20:45.486Z",
    lineItems: [
      {
        lineItemId: "payment-004-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Other for elevator cab finishes on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2086,
        lineItemTotal: 2086,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-004-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Subcontractor for elevator cab finishes on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2352,
        lineItemTotal: 14112,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "payment-005",
    entityType: "Payment",
    title: "Ridge Roofing payment",
    summary: "Payment recorded to Ridge Roofing via Credit Card.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Processing",
    updatedAt: "2023-12-21T16:22:12.738Z",
    tags: [
      "HVAC",
      "Prefabrication",
      "Foundations"
    ],
    metadata: {
      vendor: "Ridge Roofing",
      vendorTrade: "Roofing",
      projectPhase: "Closeout",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 45",
      paymentMethod: "Wire Transfer"
    },
    totalValue: 14820,
    issuedDate: "2023-12-13T16:22:12.738Z",
    dueDate: "2024-01-29T16:22:12.738Z",
    lineItems: [
      {
        lineItemId: "payment-005-item-1",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 10,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 105,
        lineItemTotal: 1050,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-005-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4591,
        lineItemTotal: 9182,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-005-item-3",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Subcontractor for low-voltage wiring on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2294,
        lineItemTotal: 4588,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "payment-006",
    entityType: "Payment",
    title: "Cascade Finishes payment",
    summary: "Payment recorded to Cascade Finishes via Credit Card.",
    project: "Marina Overlook",
    client: "Amanda & Christopher Davis",
    status: "Cleared",
    updatedAt: "2023-11-28T04:53:40.494Z",
    tags: [
      "Green Build",
      "Fire Protection",
      "Procurement"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Punch List",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 15",
      paymentMethod: "Credit Card"
    },
    totalValue: 35560,
    issuedDate: "2023-11-06T04:53:40.494Z",
    dueDate: "2023-12-20T04:53:40.494Z",
    lineItems: [
      {
        lineItemId: "payment-006-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4768,
        lineItemTotal: 28608,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-006-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 24,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 113,
        lineItemTotal: 2712,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-006-item-3",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Material for foundation waterproofing on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4240,
        lineItemTotal: 4240,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "payment-007",
    entityType: "Payment",
    title: "Precision Plumbing payment",
    summary: "Payment recorded to Precision Plumbing via Wire Transfer.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Cleared",
    updatedAt: "2024-04-20T21:43:08.282Z",
    tags: [
      "Green Build",
      "Procurement",
      "Fire Protection"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Foundation",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30",
      paymentMethod: "Credit Card"
    },
    totalValue: 16265,
    issuedDate: "2024-04-14T21:43:08.282Z",
    dueDate: "2024-05-22T21:43:08.282Z",
    lineItems: [
      {
        lineItemId: "payment-007-item-1",
        lineItemTitle: "Low-voltage wiring",
        lineItemDescription: "Labor for low-voltage wiring on Building core areas",
        lineItemQuantity: 28,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 104,
        lineItemTotal: 2912,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-007-item-2",
        lineItemTitle: "Fire sprinkler rough-in",
        lineItemDescription: "Subcontractor for fire sprinkler rough-in on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2579,
        lineItemTotal: 7737,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-007-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Other for interior paint on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4328,
        lineItemTotal: 4328,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-007-item-4",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Labor for landscape irrigation on Building core areas",
        lineItemQuantity: 14,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 92,
        lineItemTotal: 1288,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "payment-008",
    entityType: "Payment",
    title: "Granite State Supply payment",
    summary: "Payment recorded to Granite State Supply via Wire Transfer.",
    project: "Pinecrest Estate",
    client: "Lisa & Robert Johnson",
    status: "Scheduled",
    updatedAt: "2023-11-03T07:24:44.071Z",
    tags: [
      "HVAC",
      "Procurement",
      "Interior"
    ],
    metadata: {
      vendor: "Granite State Supply",
      vendorTrade: "Material",
      projectPhase: "Pre-Construction",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30",
      paymentMethod: "ACH"
    },
    totalValue: 14030,
    issuedDate: "2023-10-15T07:24:44.071Z",
    dueDate: "2023-10-31T07:24:44.071Z",
    lineItems: [
      {
        lineItemId: "payment-008-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Subcontractor for exterior siding on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3320,
        lineItemTotal: 6640,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-008-item-2",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 1284,
        lineItemTotal: 3852,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-008-item-3",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Labor for landscape irrigation on Building core areas",
        lineItemQuantity: 29,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 122,
        lineItemTotal: 3538,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "payment-009",
    entityType: "Payment",
    title: "Precision Plumbing payment",
    summary: "Payment recorded to Precision Plumbing via Check.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Processing",
    updatedAt: "2023-09-29T22:51:30.279Z",
    tags: [
      "Prefabrication",
      "HVAC",
      "Safety"
    ],
    metadata: {
      vendor: "Precision Plumbing",
      vendorTrade: "Plumbing",
      projectPhase: "Foundation",
      costCode: "16-420 Lighting Fixtures",
      paymentTerms: "Net 30",
      paymentMethod: "Check"
    },
    totalValue: 10512,
    issuedDate: "2023-09-17T22:51:30.279Z",
    dueDate: "2023-11-02T22:51:30.279Z",
    lineItems: [
      {
        lineItemId: "payment-009-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Other for exterior siding on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 2360,
        lineItemTotal: 7080,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-009-item-2",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Labor for exterior siding on Building core areas",
        lineItemQuantity: 9,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 128,
        lineItemTotal: 1152,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-009-item-3",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 24,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 95,
        lineItemTotal: 2280,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "payment-010",
    entityType: "Payment",
    title: "Ridge Roofing payment",
    summary: "Payment recorded to Ridge Roofing via Wire Transfer.",
    project: "Sunset Heights",
    client: "Jennifer & Michael Thompson",
    status: "Cleared",
    updatedAt: "2023-11-01T11:25:08.390Z",
    tags: [
      "Safety",
      "Green Build",
      "Schedule"
    ],
    metadata: {
      vendor: "Ridge Roofing",
      vendorTrade: "Roofing",
      projectPhase: "Foundation",
      costCode: "07-150 Roofing Assembly",
      paymentTerms: "Net 45",
      paymentMethod: "Credit Card"
    },
    totalValue: 14558,
    issuedDate: "2023-10-11T11:25:08.390Z",
    dueDate: "2023-11-25T11:25:08.390Z",
    lineItems: [
      {
        lineItemId: "payment-010-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Other for rooftop units on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 1420,
        lineItemTotal: 5680,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-010-item-2",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Labor for rooftop units on Building core areas",
        lineItemQuantity: 14,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 118,
        lineItemTotal: 1652,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-010-item-3",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Subcontractor for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 5273,
        lineItemTotal: 5273,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-010-item-4",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 21,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 93,
        lineItemTotal: 1953,
        lineItemType: "Labor"
      }
    ]
  },
  {
    id: "payment-011",
    entityType: "Payment",
    title: "Northwest Scaffold payment",
    summary: "Payment recorded to Northwest Scaffold via Wire Transfer.",
    project: "Lakeside Villas",
    client: "Elena & Miguel Hernandez",
    status: "Cleared",
    updatedAt: "2023-11-23T07:45:41.800Z",
    tags: [
      "Schedule",
      "Green Build",
      "Prefabrication"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Framing",
      costCode: "09-300 Tiling",
      paymentTerms: "Net 30",
      paymentMethod: "Wire Transfer"
    },
    totalValue: 19639,
    issuedDate: "2023-10-21T07:45:41.800Z",
    dueDate: "2023-11-30T07:45:41.800Z",
    lineItems: [
      {
        lineItemId: "payment-011-item-1",
        lineItemTitle: "Exterior siding",
        lineItemDescription: "Labor for exterior siding on Building core areas",
        lineItemQuantity: 24,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 94,
        lineItemTotal: 2256,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-011-item-2",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 623,
        lineItemTotal: 3115,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-011-item-3",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Subcontractor for elevator cab finishes on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3567,
        lineItemTotal: 14268,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "payment-012",
    entityType: "Payment",
    title: "BlueSky Concrete payment",
    summary: "Payment recorded to BlueSky Concrete via ACH.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Scheduled",
    updatedAt: "2023-10-05T17:34:44.842Z",
    tags: [
      "Green Build",
      "Foundations",
      "HVAC"
    ],
    metadata: {
      vendor: "BlueSky Concrete",
      vendorTrade: "Concrete",
      projectPhase: "Finishes",
      costCode: "03-310 Concrete Footings",
      paymentTerms: "Net 30",
      paymentMethod: "Credit Card"
    },
    totalValue: 34976,
    issuedDate: "2023-09-21T17:34:44.842Z",
    dueDate: "2023-10-13T17:34:44.842Z",
    lineItems: [
      {
        lineItemId: "payment-012-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Other for rooftop units on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3583,
        lineItemTotal: 7166,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-012-item-2",
        lineItemTitle: "Elevator cab finishes",
        lineItemDescription: "Labor for elevator cab finishes on Building core areas",
        lineItemQuantity: 30,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 116,
        lineItemTotal: 3480,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-012-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Material for interior paint on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4055,
        lineItemTotal: 24330,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "payment-013",
    entityType: "Payment",
    title: "Evergreen Mechanical payment",
    summary: "Payment recorded to Evergreen Mechanical via ACH.",
    project: "Cedar Ridge Homes",
    client: "Michelle & Daniel Brown",
    status: "Cleared",
    updatedAt: "2023-07-15T16:51:14.351Z",
    tags: [
      "Safety",
      "Interior",
      "Fire Protection"
    ],
    metadata: {
      vendor: "Evergreen Mechanical",
      vendorTrade: "HVAC",
      projectPhase: "Closeout",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 30",
      paymentMethod: "Check"
    },
    totalValue: 12757,
    issuedDate: "2023-06-27T16:51:14.351Z",
    dueDate: "2023-07-20T16:51:14.351Z",
    lineItems: [
      {
        lineItemId: "payment-013-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Material for rooftop units on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 549,
        lineItemTotal: 2745,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-013-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Material for landscape irrigation on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4588,
        lineItemTotal: 4588,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-013-item-3",
        lineItemTitle: "Interior paint",
        lineItemDescription: "Subcontractor for interior paint on Building core areas",
        lineItemQuantity: 6,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 904,
        lineItemTotal: 5424,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "payment-014",
    entityType: "Payment",
    title: "Northwest Scaffold payment",
    summary: "Payment recorded to Northwest Scaffold via ACH.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Scheduled",
    updatedAt: "2023-02-26T04:16:46.982Z",
    tags: [
      "Fire Protection",
      "Schedule",
      "Procurement"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Finishes",
      costCode: "06-200 Finish Carpentry",
      paymentTerms: "Net 30",
      paymentMethod: "Credit Card"
    },
    totalValue: 4777,
    issuedDate: "2023-02-17T04:16:46.982Z",
    dueDate: "2023-04-07T04:16:46.982Z",
    lineItems: [
      {
        lineItemId: "payment-014-item-1",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Subcontractor for rooftop units on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 575,
        lineItemTotal: 1725,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-014-item-2",
        lineItemTitle: "Main service panel",
        lineItemDescription: "Material for main service panel on Building core areas",
        lineItemQuantity: 1,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3052,
        lineItemTotal: 3052,
        lineItemType: "Material"
      }
    ]
  },
  {
    id: "payment-015",
    entityType: "Payment",
    title: "Cascade Finishes payment",
    summary: "Payment recorded to Cascade Finishes via Wire Transfer.",
    project: "Willow Creek Ranch",
    client: "Carmen & Roberto Garcia",
    status: "Cleared",
    updatedAt: "2023-10-27T05:53:51.063Z",
    tags: [
      "Safety",
      "Procurement",
      "HVAC"
    ],
    metadata: {
      vendor: "Cascade Finishes",
      vendorTrade: "Finish Carpentry",
      projectPhase: "Design Development",
      costCode: "05-120 Structural Steel",
      paymentTerms: "Net 15",
      paymentMethod: "Check"
    },
    totalValue: 51399,
    issuedDate: "2023-10-04T05:53:51.063Z",
    dueDate: "2023-11-14T05:53:51.063Z",
    lineItems: [
      {
        lineItemId: "payment-015-item-1",
        lineItemTitle: "Window package",
        lineItemDescription: "Material for window package on Building core areas",
        lineItemQuantity: 5,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3955,
        lineItemTotal: 19775,
        lineItemType: "Material"
      },
      {
        lineItemId: "payment-015-item-2",
        lineItemTitle: "Landscape irrigation",
        lineItemDescription: "Subcontractor for landscape irrigation on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 2888,
        lineItemTotal: 11552,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-015-item-3",
        lineItemTitle: "Window package",
        lineItemDescription: "Subcontractor for window package on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 5107,
        lineItemTotal: 10214,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-015-item-4",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 3,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 3286,
        lineItemTotal: 9858,
        lineItemType: "Other"
      }
    ]
  },
  {
    id: "payment-016",
    entityType: "Payment",
    title: "Northwest Scaffold payment",
    summary: "Payment recorded to Northwest Scaffold via Wire Transfer.",
    project: "Riverbend Condos",
    client: "Maria & Carlos Rodriguez",
    status: "Processing",
    updatedAt: "2023-12-26T01:57:22.658Z",
    tags: [
      "Schedule",
      "Safety",
      "Fire Protection"
    ],
    metadata: {
      vendor: "Northwest Scaffold",
      vendorTrade: "Other",
      projectPhase: "Finishes",
      costCode: "15-500 HVAC Equipment",
      paymentTerms: "Net 30",
      paymentMethod: "Wire Transfer"
    },
    totalValue: 32386,
    issuedDate: "2023-11-22T01:57:22.658Z",
    dueDate: "2024-01-05T01:57:22.658Z",
    lineItems: [
      {
        lineItemId: "payment-016-item-1",
        lineItemTitle: "Foundation waterproofing",
        lineItemDescription: "Labor for foundation waterproofing on Building core areas",
        lineItemQuantity: 15,
        lineItemQuantityUnitOfMeasure: "hr",
        lineItemUnitPrice: 116,
        lineItemTotal: 1740,
        lineItemType: "Labor"
      },
      {
        lineItemId: "payment-016-item-2",
        lineItemTitle: "Window package",
        lineItemDescription: "Subcontractor for window package on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 947,
        lineItemTotal: 3788,
        lineItemType: "Subcontractor"
      },
      {
        lineItemId: "payment-016-item-3",
        lineItemTitle: "Window package",
        lineItemDescription: "Other for window package on Building core areas",
        lineItemQuantity: 4,
        lineItemQuantityUnitOfMeasure: "unit",
        lineItemUnitPrice: 4872,
        lineItemTotal: 19488,
        lineItemType: "Other"
      },
      {
        lineItemId: "payment-016-item-4",
        lineItemTitle: "Rooftop units",
        lineItemDescription: "Subcontractor for rooftop units on Building core areas",
        lineItemQuantity: 2,
        lineItemQuantityUnitOfMeasure: "ls",
        lineItemUnitPrice: 3685,
        lineItemTotal: 7370,
        lineItemType: "Subcontractor"
      }
    ]
  },
  {
    id: "document-021",
    entityType: "Document",
    title: "Oakwood Estates \u2013 Drywall Installation Specifications",
    summary: "Detailed specifications for drywall installation covering framing preparation, moisture control, and finishing requirements.",
    project: "Oakwood Estates",
    client: "Lisa & Robert Chen",
    status: "Approved",
    updatedAt: "2024-01-15T10:30:00.000Z",
    tags: [
      "Interior",
      "Drywall",
      "Finishes"
    ],
    metadata: {
      projectPhase: "Interior Finishes",
      projectManager: "Marcus Johnson",
      location: "Austin, TX",
      revision: "R2",
      tradeFocus: "Drywall"
    },
    documentType: "Specification Sheet",
    author: "Sarah Mitchell"
  },
  {
    id: "document-022",
    entityType: "Document",
    title: "Pine Ridge Homes \u2013 Electrical Rough-In Inspection",
    summary: "Electrical rough-in inspection report covering panel installation, outlet placement, and code compliance verification.",
    project: "Pine Ridge Homes",
    client: "Amanda & Kevin Davis",
    status: "In Review",
    updatedAt: "2024-01-20T14:45:00.000Z",
    tags: [
      "Electrical",
      "Rough-In",
      "Inspection"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Jennifer Walsh",
      location: "Denver, CO",
      revision: "R1",
      tradeFocus: "Electrical"
    },
    documentType: "Inspection Report",
    author: "David Thompson"
  },
  {
    id: "document-023",
    entityType: "Document",
    title: "Maple Grove Development \u2013 Foundation Pour Schedule",
    summary: "Foundation pour schedule and concrete specifications for basement and crawl space construction.",
    project: "Maple Grove Development",
    client: "Rachel & Michael Foster",
    status: "Approved",
    updatedAt: "2024-01-25T09:15:00.000Z",
    tags: [
      "Foundation",
      "Concrete",
      "Schedule"
    ],
    metadata: {
      projectPhase: "Foundation",
      projectManager: "Thomas Anderson",
      location: "Seattle, WA",
      revision: "R3",
      tradeFocus: "Concrete"
    },
    documentType: "Schedule",
    author: "Emily Rodriguez"
  },
  {
    id: "document-024",
    entityType: "Document",
    title: "Cedar Valley Subdivision \u2013 Framing Inspection Checklist",
    summary: "Comprehensive framing inspection checklist covering structural integrity, load paths, and building code compliance.",
    project: "Cedar Valley Subdivision",
    client: "Nicole & James Wilson",
    status: "Draft",
    updatedAt: "2024-01-30T16:20:00.000Z",
    tags: [
      "Framing",
      "Structural",
      "Inspection"
    ],
    metadata: {
      projectPhase: "Framing",
      projectManager: "Christopher Lee",
      location: "Portland, OR",
      revision: "R1",
      tradeFocus: "Framing"
    },
    documentType: "Inspection Report",
    author: "Michael Chang"
  },
  {
    id: "document-025",
    entityType: "Document",
    title: "Birchwood Manor \u2013 Appliance Installation Guide",
    summary: "Appliance installation specifications covering kitchen and laundry room equipment placement and connections.",
    project: "Birchwood Manor",
    client: "Stephanie & Daniel Martinez",
    status: "Approved",
    updatedAt: "2024-02-05T11:30:00.000Z",
    tags: [
      "Appliances",
      "Kitchen",
      "Installation"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Ashley Kim",
      location: "San Diego, CA",
      revision: "R2",
      tradeFocus: "Appliances"
    },
    documentType: "Installation Guide",
    author: "Robert Garcia"
  },
  {
    id: "document-026",
    entityType: "Document",
    title: "Elm Street Residences \u2013 Plumbing Rough-In Specifications",
    summary: "Plumbing rough-in specifications covering water supply lines, drain systems, and fixture rough-in requirements.",
    project: "Elm Street Residences",
    client: "Jessica & Mark Thompson",
    status: "Approved",
    updatedAt: "2024-02-10T13:45:00.000Z",
    tags: [
      "Plumbing",
      "Rough-In",
      "Mechanical"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Kevin Park",
      location: "Phoenix, AZ",
      revision: "R2",
      tradeFocus: "Plumbing"
    },
    documentType: "Specification Sheet",
    author: "Lisa Chen"
  },
  {
    id: "document-027",
    entityType: "Document",
    title: "Willowbrook Commons \u2013 Flooring Installation Schedule",
    summary: "Flooring installation schedule covering hardwood, tile, and carpet installation phases and material requirements.",
    project: "Willowbrook Commons",
    client: "Michelle & Andrew Johnson",
    status: "In Review",
    updatedAt: "2024-02-15T08:30:00.000Z",
    tags: [
      "Flooring",
      "Installation",
      "Schedule"
    ],
    metadata: {
      projectPhase: "Interior Finishes",
      projectManager: "Rachel Davis",
      location: "Nashville, TN",
      revision: "R1",
      tradeFocus: "Flooring"
    },
    documentType: "Schedule",
    author: "James Wilson"
  },
  {
    id: "document-028",
    entityType: "Document",
    title: "Sycamore Heights \u2013 Tile Installation Guidelines",
    summary: "Tile installation guidelines covering substrate preparation, adhesive selection, and grouting specifications.",
    project: "Sycamore Heights",
    client: "Amanda & Ryan Miller",
    status: "Approved",
    updatedAt: "2024-02-20T15:15:00.000Z",
    tags: [
      "Tile",
      "Installation",
      "Bathrooms"
    ],
    metadata: {
      projectPhase: "Interior Finishes",
      projectManager: "Daniel Brown",
      location: "Miami, FL",
      revision: "R3",
      tradeFocus: "Tile"
    },
    documentType: "Installation Guide",
    author: "Maria Rodriguez"
  },
  {
    id: "document-029",
    entityType: "Document",
    title: "Poplar Grove \u2013 Bathroom Fixture Installation",
    summary: "Bathroom fixture installation specifications covering vanity, toilet, shower, and tub installation requirements.",
    project: "Poplar Grove",
    client: "Sarah & Brian Anderson",
    status: "Draft",
    updatedAt: "2024-02-25T12:00:00.000Z",
    tags: [
      "Bathrooms",
      "Fixtures",
      "Installation"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Jennifer Taylor",
      location: "Atlanta, GA",
      revision: "R1",
      tradeFocus: "Plumbing"
    },
    documentType: "Installation Guide",
    author: "Christopher Lee"
  },
  {
    id: "document-030",
    entityType: "Document",
    title: "Ashwood Village \u2013 HVAC Rough-In Inspection",
    summary: "HVAC rough-in inspection report covering ductwork installation, equipment placement, and ventilation requirements.",
    project: "Ashwood Village",
    client: "Nicole & David White",
    status: "Approved",
    updatedAt: "2024-03-01T09:45:00.000Z",
    tags: [
      "HVAC",
      "Rough-In",
      "Inspection"
    ],
    metadata: {
      projectPhase: "Mechanical Rough-In",
      projectManager: "Michael Chang",
      location: "Chicago, IL",
      revision: "R2",
      tradeFocus: "HVAC"
    },
    documentType: "Inspection Report",
    author: "Emily Foster"
  },
  {
    id: "document-031",
    entityType: "Document",
    title: "Hickory Ridge \u2013 Insulation Installation Specifications",
    summary: "Insulation installation specifications covering wall, ceiling, and floor insulation requirements and R-value standards.",
    project: "Hickory Ridge",
    client: "Laura & Steven Garcia",
    status: "Approved",
    updatedAt: "2024-03-05T11:20:00.000Z",
    tags: [
      "Insulation",
      "Energy Efficiency",
      "Installation"
    ],
    metadata: {
      projectPhase: "Insulation",
      projectManager: "Thomas Wilson",
      location: "Minneapolis, MN",
      revision: "R2",
      tradeFocus: "Insulation"
    },
    documentType: "Specification Sheet",
    author: "Jennifer Martinez"
  },
  {
    id: "document-032",
    entityType: "Document",
    title: "Dogwood Lane \u2013 Window Installation Guidelines",
    summary: "Window installation guidelines covering flashing, weatherproofing, and energy efficiency requirements.",
    project: "Dogwood Lane",
    client: "Catherine & Robert Kim",
    status: "In Review",
    updatedAt: "2024-03-10T14:30:00.000Z",
    tags: [
      "Windows",
      "Installation",
      "Weatherproofing"
    ],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Amanda Foster",
      location: "Boston, MA",
      revision: "R1",
      tradeFocus: "Windows"
    },
    documentType: "Installation Guide",
    author: "Kevin Park"
  },
  {
    id: "document-033",
    entityType: "Document",
    title: "Magnolia Court \u2013 Door Installation Schedule",
    summary: "Door installation schedule covering interior and exterior door placement, hardware installation, and security requirements.",
    project: "Magnolia Court",
    client: "Patricia & William Davis",
    status: "Draft",
    updatedAt: "2024-03-15T10:15:00.000Z",
    tags: [
      "Doors",
      "Installation",
      "Hardware"
    ],
    metadata: {
      projectPhase: "Interior Finishes",
      projectManager: "Rachel Thompson",
      location: "Dallas, TX",
      revision: "R1",
      tradeFocus: "Doors"
    },
    documentType: "Schedule",
    author: "Michael Rodriguez"
  },
  {
    id: "document-034",
    entityType: "Document",
    title: "Redwood Estates \u2013 Paint Specifications",
    summary: "Paint specifications covering interior and exterior paint selection, surface preparation, and application requirements.",
    project: "Redwood Estates",
    client: "Susan & John Anderson",
    status: "Approved",
    updatedAt: "2024-03-20T16:45:00.000Z",
    tags: [
      "Paint",
      "Finishes",
      "Exterior"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "David Lee",
      location: "San Francisco, CA",
      revision: "R3",
      tradeFocus: "Paint"
    },
    documentType: "Specification Sheet",
    author: "Sarah Johnson"
  },
  {
    id: "document-035",
    entityType: "Document",
    title: "Cypress Gardens \u2013 Landscaping Installation Plan",
    summary: "Landscaping installation plan covering irrigation systems, plant selection, and hardscape installation.",
    project: "Cypress Gardens",
    client: "Margaret & Charles White",
    status: "In Review",
    updatedAt: "2024-03-25T12:30:00.000Z",
    tags: [
      "Landscaping",
      "Irrigation",
      "Exterior"
    ],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Lisa Chen",
      location: "Orlando, FL",
      revision: "R2",
      tradeFocus: "Landscaping"
    },
    documentType: "Installation Plan",
    author: "Robert Taylor"
  },
  {
    id: "document-036",
    entityType: "Document",
    title: "Juniper Hills \u2013 Kitchen Cabinet Installation",
    summary: "Kitchen cabinet installation specifications covering layout, hardware, and countertop integration requirements.",
    project: "Juniper Hills",
    client: "Barbara & Richard Miller",
    status: "Approved",
    updatedAt: "2024-03-30T09:00:00.000Z",
    tags: [
      "Kitchen",
      "Cabinets",
      "Installation"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Christopher Kim",
      location: "Las Vegas, NV",
      revision: "R2",
      tradeFocus: "Cabinets"
    },
    documentType: "Installation Guide",
    author: "Amanda Wilson"
  },
  {
    id: "document-037",
    entityType: "Document",
    title: "Spruce Valley \u2013 Countertop Installation Guidelines",
    summary: "Countertop installation guidelines covering granite, quartz, and laminate installation procedures and sealing requirements.",
    project: "Spruce Valley",
    client: "Helen & George Thompson",
    status: "In Review",
    updatedAt: "2024-04-05T13:15:00.000Z",
    tags: [
      "Countertops",
      "Installation",
      "Kitchen"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Jennifer Davis",
      location: "Salt Lake City, UT",
      revision: "R1",
      tradeFocus: "Countertops"
    },
    documentType: "Installation Guide",
    author: "Michael Foster"
  },
  {
    id: "document-038",
    entityType: "Document",
    title: "Fir Grove \u2013 Lighting Installation Schedule",
    summary: "Lighting installation schedule covering recessed, pendant, and fixture installation phases and electrical connections.",
    project: "Fir Grove",
    client: "Dorothy & Edward Garcia",
    status: "Draft",
    updatedAt: "2024-04-10T11:30:00.000Z",
    tags: [
      "Lighting",
      "Electrical",
      "Installation"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Thomas Rodriguez",
      location: "Kansas City, MO",
      revision: "R1",
      tradeFocus: "Electrical"
    },
    documentType: "Schedule",
    author: "Sarah Martinez"
  },
  {
    id: "document-039",
    entityType: "Document",
    title: "Pinecone Ridge \u2013 Fireplace Installation Specifications",
    summary: "Fireplace installation specifications covering gas and wood-burning fireplace requirements, venting, and safety standards.",
    project: "Pinecone Ridge",
    client: "Ruth & Frank Anderson",
    status: "Approved",
    updatedAt: "2024-04-15T15:45:00.000Z",
    tags: [
      "Fireplace",
      "Installation",
      "Safety"
    ],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Rachel Kim",
      location: "Milwaukee, WI",
      revision: "R3",
      tradeFocus: "Fireplace"
    },
    documentType: "Specification Sheet",
    author: "Kevin Lee"
  },
  {
    id: "document-040",
    entityType: "Document",
    title: "Hemlock Falls \u2013 Staircase Installation Guide",
    summary: "Staircase installation guide covering structural requirements, railing installation, and safety compliance standards.",
    project: "Hemlock Falls",
    client: "Betty & Harold White",
    status: "In Review",
    updatedAt: "2024-04-20T10:20:00.000Z",
    tags: [
      "Staircase",
      "Structural",
      "Installation"
    ],
    metadata: {
      projectPhase: "Framing",
      projectManager: "David Chen",
      location: "Cleveland, OH",
      revision: "R2",
      tradeFocus: "Framing"
    },
    documentType: "Installation Guide",
    author: "Lisa Johnson"
  },
  {
    id: "document-041",
    entityType: "Document",
    title: "Cedar Point \u2013 Roofing Installation Specifications",
    summary: "Roofing installation specifications covering shingle installation, flashing, and weatherproofing requirements.",
    project: "Cedar Point",
    client: "Nancy & Robert Davis",
    status: "Approved",
    updatedAt: "2024-04-25T14:10:00.000Z",
    tags: ["Roofing", "Installation", "Weatherproofing"],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Amanda Taylor",
      location: "Tampa, FL",
      revision: "R2",
      tradeFocus: "Roofing"
    },
    documentType: "Specification Sheet",
    author: "Christopher Wilson"
  },
  {
    id: "document-042",
    entityType: "Document",
    title: "Sycamore Springs \u2013 Siding Installation Guide",
    summary: "Siding installation guide covering vinyl, wood, and fiber cement siding installation procedures and weatherproofing.",
    project: "Sycamore Springs",
    client: "Carol & Michael Brown",
    status: "In Review",
    updatedAt: "2024-04-30T12:45:00.000Z",
    tags: ["Siding", "Installation", "Exterior"],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Jennifer Martinez",
      location: "Richmond, VA",
      revision: "R1",
      tradeFocus: "Siding"
    },
    documentType: "Installation Guide",
    author: "David Kim"
  },
  {
    id: "document-043",
    entityType: "Document",
    title: "Poplar Ridge \u2013 Gutters Installation Schedule",
    summary: "Gutters installation schedule covering aluminum and copper gutter installation, downspout placement, and drainage requirements.",
    project: "Poplar Ridge",
    client: "Sharon & James Wilson",
    status: "Draft",
    updatedAt: "2024-05-05T09:30:00.000Z",
    tags: ["Gutters", "Drainage", "Installation"],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Thomas Anderson",
      location: "Louisville, KY",
      revision: "R1",
      tradeFocus: "Gutters"
    },
    documentType: "Schedule",
    author: "Sarah Foster"
  },
  {
    id: "document-044",
    entityType: "Document",
    title: "Birchwood Manor \u2013 Garage Door Installation",
    summary: "Garage door installation specifications covering automatic opener installation, safety features, and weatherproofing requirements.",
    project: "Birchwood Manor",
    client: "Linda & Richard Garcia",
    status: "Approved",
    updatedAt: "2024-05-10T16:20:00.000Z",
    tags: ["Garage", "Doors", "Installation"],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Rachel Lee",
      location: "Memphis, TN",
      revision: "R3",
      tradeFocus: "Garage"
    },
    documentType: "Installation Guide",
    author: "Michael Rodriguez"
  },
  {
    id: "document-045",
    entityType: "Document",
    title: "Oakwood Estates \u2013 Driveway Installation Plan",
    summary: "Driveway installation plan covering concrete, asphalt, and paver installation procedures and drainage considerations.",
    project: "Oakwood Estates",
    client: "Donna & William Thompson",
    status: "In Review",
    updatedAt: "2024-05-15T11:15:00.000Z",
    tags: ["Driveway", "Concrete", "Installation"],
    metadata: {
      projectPhase: "Sitework",
      projectManager: "Kevin Park",
      location: "Birmingham, AL",
      revision: "R2",
      tradeFocus: "Concrete"
    },
    documentType: "Installation Plan",
    author: "Emily Chen"
  },
  {
    id: "document-046",
    entityType: "Document",
    title: "Pine Ridge Homes \u2013 Basement Waterproofing",
    summary: "Basement waterproofing specifications covering interior and exterior waterproofing systems, drainage, and moisture control.",
    project: "Pine Ridge Homes",
    client: "Patricia & Robert Johnson",
    status: "Approved",
    updatedAt: "2024-05-20T13:30:00.000Z",
    tags: ["Basement", "Waterproofing", "Drainage"],
    metadata: {
      projectPhase: "Foundation",
      projectManager: "Lisa Taylor",
      location: "Indianapolis, IN",
      revision: "R2",
      tradeFocus: "Waterproofing"
    },
    documentType: "Specification Sheet",
    author: "Christopher Martinez"
  },
  {
    id: "document-047",
    entityType: "Document",
    title: "Maple Grove Development \u2013 Deck Construction Guide",
    summary: "Deck construction guide covering structural requirements, material selection, and safety compliance standards.",
    project: "Maple Grove Development",
    client: "Deborah & Steven Anderson",
    status: "In Review",
    updatedAt: "2024-05-25T10:45:00.000Z",
    tags: ["Deck", "Construction", "Structural"],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "David Wilson",
      location: "Columbus, OH",
      revision: "R1",
      tradeFocus: "Framing"
    },
    documentType: "Construction Guide",
    author: "Amanda Kim"
  },
  {
    id: "document-048",
    entityType: "Document",
    title: "Cedar Valley Subdivision \u2013 Fence Installation Schedule",
    summary: "Fence installation schedule covering privacy, decorative, and security fence installation phases and material requirements.",
    project: "Cedar Valley Subdivision",
    client: "Janet & Michael Davis",
    status: "Draft",
    updatedAt: "2024-05-30T15:20:00.000Z",
    tags: ["Fence", "Installation", "Security"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Rachel Foster",
      location: "Detroit, MI",
      revision: "R1",
      tradeFocus: "Fencing"
    },
    documentType: "Schedule",
    author: "Thomas Rodriguez"
  },
  {
    id: "document-049",
    entityType: "Document",
    title: "Birchwood Manor \u2013 Patio Installation Specifications",
    summary: "Patio installation specifications covering concrete, stone, and paver patio construction procedures and drainage requirements.",
    project: "Birchwood Manor",
    client: "Sandra & James White",
    status: "Approved",
    updatedAt: "2024-06-05T12:10:00.000Z",
    tags: ["Patio", "Concrete", "Installation"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Jennifer Lee",
      location: "Buffalo, NY",
      revision: "R3",
      tradeFocus: "Concrete"
    },
    documentType: "Specification Sheet",
    author: "Michael Chen"
  },
  {
    id: "document-050",
    entityType: "Document",
    title: "Elm Street Residences \u2013 Retaining Wall Construction",
    summary: "Retaining wall construction specifications covering concrete, stone, and block wall construction procedures and drainage systems.",
    project: "Elm Street Residences",
    client: "Cynthia & Richard Brown",
    status: "In Review",
    updatedAt: "2024-06-10T09:35:00.000Z",
    tags: ["Retaining Wall", "Construction", "Drainage"],
    metadata: {
      projectPhase: "Sitework",
      projectManager: "Kevin Anderson",
      location: "Rochester, NY",
      revision: "R2",
      tradeFocus: "Concrete"
    },
    documentType: "Construction Guide",
    author: "Sarah Wilson"
  },
  {
    id: "document-051",
    entityType: "Document",
    title: "Willowbrook Commons \u2013 Septic System Installation",
    summary: "Septic system installation specifications covering tank placement, drain field installation, and permit requirements.",
    project: "Willowbrook Commons",
    client: "Brenda & Donald Miller",
    status: "Approved",
    updatedAt: "2024-06-15T14:25:00.000Z",
    tags: ["Septic", "Installation", "Permits"],
    metadata: {
      projectPhase: "Sitework",
      projectManager: "Lisa Johnson",
      location: "Hartford, CT",
      revision: "R2",
      tradeFocus: "Plumbing"
    },
    documentType: "Installation Guide",
    author: "Christopher Taylor"
  },
  {
    id: "document-052",
    entityType: "Document",
    title: "Sycamore Heights \u2013 Well Installation Specifications",
    summary: "Well installation specifications covering drilling requirements, pump installation, and water quality testing procedures.",
    project: "Sycamore Heights",
    client: "Pamela & Ronald Garcia",
    status: "In Review",
    updatedAt: "2024-06-20T11:50:00.000Z",
    tags: ["Well", "Installation", "Water"],
    metadata: {
      projectPhase: "Sitework",
      projectManager: "David Martinez",
      location: "Providence, RI",
      revision: "R1",
      tradeFocus: "Plumbing"
    },
    documentType: "Specification Sheet",
    author: "Amanda Foster"
  },
  {
    id: "document-053",
    entityType: "Document",
    title: "Poplar Grove \u2013 Solar Panel Installation Plan",
    summary: "Solar panel installation plan covering roof mounting, electrical connections, and grid-tie system requirements.",
    project: "Poplar Grove",
    client: "Joyce & Gary Thompson",
    status: "Draft",
    updatedAt: "2024-06-25T16:15:00.000Z",
    tags: ["Solar", "Installation", "Electrical"],
    metadata: {
      projectPhase: "Exterior Finishes",
      projectManager: "Rachel Kim",
      location: "Burlington, VT",
      revision: "R1",
      tradeFocus: "Solar"
    },
    documentType: "Installation Plan",
    author: "Thomas Wilson"
  },
  {
    id: "document-054",
    entityType: "Document",
    title: "Ashwood Village \u2013 Generator Installation Guide",
    summary: "Generator installation guide covering standby generator placement, electrical connections, and fuel system requirements.",
    project: "Ashwood Village",
    client: "Virginia & Edward White",
    status: "Approved",
    updatedAt: "2024-06-30T10:40:00.000Z",
    tags: ["Generator", "Installation", "Electrical"],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Jennifer Rodriguez",
      location: "Montpelier, VT",
      revision: "R3",
      tradeFocus: "Electrical"
    },
    documentType: "Installation Guide",
    author: "Michael Lee"
  },
  {
    id: "document-055",
    entityType: "Document",
    title: "Hickory Ridge \u2013 Security System Installation",
    summary: "Security system installation specifications covering alarm systems, cameras, and smart home integration requirements.",
    project: "Hickory Ridge",
    client: "Marie & Frank Anderson",
    status: "In Review",
    updatedAt: "2024-07-05T13:20:00.000Z",
    tags: ["Security", "Installation", "Smart Home"],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Kevin Chen",
      location: "Concord, NH",
      revision: "R2",
      tradeFocus: "Security"
    },
    documentType: "Installation Guide",
    author: "Sarah Martinez"
  },
  {
    id: "document-056",
    entityType: "Document",
    title: "Dogwood Lane \u2013 Smart Home Integration",
    summary: "Smart home integration specifications covering home automation systems, device connectivity, and control interfaces.",
    project: "Dogwood Lane",
    client: "Gloria & Raymond Davis",
    status: "Approved",
    updatedAt: "2024-07-10T15:30:00.000Z",
    tags: ["Smart Home", "Automation", "Integration"],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "David Foster",
      location: "Augusta, ME",
      revision: "R2",
      tradeFocus: "Smart Home"
    },
    documentType: "Integration Guide",
    author: "Amanda Rodriguez"
  },
  {
    id: "document-057",
    entityType: "Document",
    title: "Magnolia Court \u2013 Home Theater Installation",
    summary: "Home theater installation specifications covering audio-visual equipment, wiring, and acoustic treatment requirements.",
    project: "Magnolia Court",
    client: "Cheryl & Wayne Brown",
    status: "In Review",
    updatedAt: "2024-07-15T12:45:00.000Z",
    tags: ["Home Theater", "Audio", "Installation"],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Thomas Kim",
      location: "Annapolis, MD",
      revision: "R1",
      tradeFocus: "Audio"
    },
    documentType: "Installation Guide",
    author: "Christopher Wilson"
  },
  {
    id: "document-058",
    entityType: "Document",
    title: "Redwood Estates \u2013 Wine Cellar Construction",
    summary: "Wine cellar construction specifications covering climate control, storage systems, and ventilation requirements.",
    project: "Redwood Estates",
    client: "Diane & Gregory Miller",
    status: "Draft",
    updatedAt: "2024-07-20T09:15:00.000Z",
    tags: ["Wine Cellar", "Climate Control", "Construction"],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Rachel Taylor",
      location: "Dover, DE",
      revision: "R1",
      tradeFocus: "HVAC"
    },
    documentType: "Construction Guide",
    author: "Michael Martinez"
  },
  {
    id: "document-059",
    entityType: "Document",
    title: "Cypress Gardens \u2013 Sauna Installation",
    summary: "Sauna installation specifications covering electrical requirements, ventilation, and safety compliance standards.",
    project: "Cypress Gardens",
    client: "Janice & Harold Garcia",
    status: "Approved",
    updatedAt: "2024-07-25T14:20:00.000Z",
    tags: ["Sauna", "Installation", "Electrical"],
    metadata: {
      projectPhase: "Finishes",
      projectManager: "Jennifer Lee",
      location: "Tallahassee, FL",
      revision: "R3",
      tradeFocus: "Electrical"
    },
    documentType: "Installation Guide",
    author: "David Chen"
  },
  {
    id: "document-060",
    entityType: "Document",
    title: "Juniper Hills \u2013 Pool Installation Plan",
    summary: "Pool installation plan covering excavation, plumbing, electrical, and safety barrier requirements.",
    project: "Juniper Hills",
    client: "Martha & Albert Thompson",
    status: "In Review",
    updatedAt: "2024-07-30T11:35:00.000Z",
    tags: ["Pool", "Installation", "Safety"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Kevin Anderson",
      location: "Atlanta, GA",
      revision: "R2",
      tradeFocus: "Pool"
    },
    documentType: "Installation Plan",
    author: "Sarah Foster"
  },
  {
    id: "document-061",
    entityType: "Document",
    title: "Spruce Valley \u2013 Hot Tub Installation",
    summary: "Hot tub installation specifications covering electrical requirements, plumbing connections, and safety compliance standards.",
    project: "Spruce Valley",
    client: "Frances & Eugene White",
    status: "Approved",
    updatedAt: "2024-08-05T16:50:00.000Z",
    tags: ["Hot Tub", "Installation", "Electrical"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Lisa Rodriguez",
      location: "Baton Rouge, LA",
      revision: "R2",
      tradeFocus: "Electrical"
    },
    documentType: "Installation Guide",
    author: "Christopher Kim"
  },
  {
    id: "document-062",
    entityType: "Document",
    title: "Fir Grove \u2013 Outdoor Kitchen Construction",
    summary: "Outdoor kitchen construction specifications covering gas line installation, countertop materials, and weatherproofing requirements.",
    project: "Fir Grove",
    client: "Evelyn & Arthur Anderson",
    status: "In Review",
    updatedAt: "2024-08-10T13:25:00.000Z",
    tags: ["Outdoor Kitchen", "Construction", "Gas"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "David Wilson",
      location: "Jackson, MS",
      revision: "R1",
      tradeFocus: "Plumbing"
    },
    documentType: "Construction Guide",
    author: "Amanda Taylor"
  },
  {
    id: "document-063",
    entityType: "Document",
    title: "Pinecone Ridge \u2013 Fire Pit Installation",
    summary: "Fire pit installation specifications covering gas and wood-burning options, safety requirements, and permit compliance.",
    project: "Pinecone Ridge",
    client: "Alice & Walter Davis",
    status: "Draft",
    updatedAt: "2024-08-15T10:40:00.000Z",
    tags: ["Fire Pit", "Installation", "Safety"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Thomas Martinez",
      location: "Little Rock, AR",
      revision: "R1",
      tradeFocus: "Gas"
    },
    documentType: "Installation Guide",
    author: "Michael Foster"
  },
  {
    id: "document-064",
    entityType: "Document",
    title: "Hemlock Falls \u2013 Pergola Construction",
    summary: "Pergola construction specifications covering structural requirements, material selection, and anchoring systems.",
    project: "Hemlock Falls",
    client: "Ruth & Clarence Brown",
    status: "Approved",
    updatedAt: "2024-08-20T15:15:00.000Z",
    tags: ["Pergola", "Construction", "Structural"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Rachel Chen",
      location: "Oklahoma City, OK",
      revision: "R3",
      tradeFocus: "Framing"
    },
    documentType: "Construction Guide",
    author: "Kevin Lee"
  },
  {
    id: "document-065",
    entityType: "Document",
    title: "Cedar Point \u2013 Gazebo Installation Plan",
    summary: "Gazebo installation plan covering foundation requirements, assembly procedures, and electrical connections for lighting.",
    project: "Cedar Point",
    client: "Betty & Roy Miller",
    status: "In Review",
    updatedAt: "2024-08-25T12:30:00.000Z",
    tags: ["Gazebo", "Installation", "Foundation"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Jennifer Anderson",
      location: "Des Moines, IA",
      revision: "R2",
      tradeFocus: "Framing"
    },
    documentType: "Installation Plan",
    author: "David Rodriguez"
  },
  {
    id: "document-066",
    entityType: "Document",
    title: "Sycamore Springs \u2013 Water Feature Installation",
    summary: "Water feature installation specifications covering fountain systems, pump installation, and electrical requirements.",
    project: "Sycamore Springs",
    client: "Helen & Carl Thompson",
    status: "Approved",
    updatedAt: "2024-08-30T14:45:00.000Z",
    tags: ["Water Feature", "Installation", "Electrical"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Lisa Wilson",
      location: "Pierre, SD",
      revision: "R2",
      tradeFocus: "Plumbing"
    },
    documentType: "Installation Guide",
    author: "Christopher Martinez"
  },
  {
    id: "document-067",
    entityType: "Document",
    title: "Poplar Ridge \u2013 Sprinkler System Installation",
    summary: "Sprinkler system installation specifications covering zone layout, controller installation, and water pressure requirements.",
    project: "Poplar Ridge",
    client: "Dorothy & Ralph Garcia",
    status: "In Review",
    updatedAt: "2024-09-05T11:20:00.000Z",
    tags: ["Sprinkler", "Irrigation", "Installation"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Thomas Foster",
      location: "Bismarck, ND",
      revision: "R1",
      tradeFocus: "Plumbing"
    },
    documentType: "Installation Guide",
    author: "Amanda Kim"
  },
  {
    id: "document-068",
    entityType: "Document",
    title: "Birchwood Manor \u2013 Outdoor Lighting Plan",
    summary: "Outdoor lighting installation plan covering landscape lighting, security lighting, and electrical connections.",
    project: "Birchwood Manor",
    client: "Lois & Howard White",
    status: "Draft",
    updatedAt: "2024-09-10T16:35:00.000Z",
    tags: ["Outdoor Lighting", "Installation", "Electrical"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Rachel Taylor",
      location: "Helena, MT",
      revision: "R1",
      tradeFocus: "Electrical"
    },
    documentType: "Installation Plan",
    author: "Michael Chen"
  },
  {
    id: "document-069",
    entityType: "Document",
    title: "Oakwood Estates \u2013 Compost System Installation",
    summary: "Compost system installation specifications covering bin placement, drainage requirements, and maintenance procedures.",
    project: "Oakwood Estates",
    client: "Norma & Eugene Anderson",
    status: "Approved",
    updatedAt: "2024-09-15T13:10:00.000Z",
    tags: ["Compost", "Installation", "Drainage"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "David Rodriguez",
      location: "Cheyenne, WY",
      revision: "R3",
      tradeFocus: "Landscaping"
    },
    documentType: "Installation Guide",
    author: "Sarah Wilson"
  },
  {
    id: "document-070",
    entityType: "Document",
    title: "Pine Ridge Homes \u2013 Greenhouse Construction",
    summary: "Greenhouse construction specifications covering structural requirements, ventilation systems, and electrical connections.",
    project: "Pine Ridge Homes",
    client: "Phyllis & Stanley Davis",
    status: "In Review",
    updatedAt: "2024-09-20T10:55:00.000Z",
    tags: ["Greenhouse", "Construction", "Ventilation"],
    metadata: {
      projectPhase: "Landscaping",
      projectManager: "Jennifer Lee",
      location: "Denver, CO",
      revision: "R2",
      tradeFocus: "Framing"
    },
    documentType: "Construction Guide",
    author: "Kevin Anderson"
  }
];

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
var CORPUS = search_corpus_default.map((record) => normalizeRecord(record));
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
  return str.replace(/,/g, "");
}
function matchesMonetaryString(queryStr, dataValue) {
  const normalizedQuery = normalizeForComparison(queryStr);
  const normalizedData = normalizeForComparison(dataValue.toString());
  if (normalizedQuery === normalizedData) {
    return true;
  }
  if (normalizedQuery.length >= 3 && normalizedData.length >= 3) {
    if (normalizedData.includes(normalizedQuery)) {
      return true;
    }
    if (normalizedQuery.includes(normalizedData)) {
      return true;
    }
  }
  return false;
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
        if (isCloseMatch(lineItem.lineItemTotal, queryAmount) || isCloseMatch(lineItem.lineItemUnitPrice, queryAmount) || isCloseMatch(lineItem.lineItemQuantity, queryAmount)) {
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
      if (matchesMonetaryString(token, lineItem.lineItemTotal) || matchesMonetaryString(token, lineItem.lineItemUnitPrice) || matchesMonetaryString(token, lineItem.lineItemQuantity)) {
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
        if (lineItem.lineItemQuantity === queryAmount) {
          score += 300;
        } else if (isCloseMatch(lineItem.lineItemQuantity, queryAmount, 0.01)) {
          score += 200;
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
      if (matchesMonetaryString(token, lineItem.lineItemQuantity)) {
        score += 250;
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
function filterRecords({ query, selections, isMonetarySearch }) {
  const { isMonetary, searchQuery } = parseMonetaryQuery(query);
  const filtered = CORPUS.filter((record) => {
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
  const records = filterRecords(searchOptions);
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
