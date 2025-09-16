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
  const homeButton = document.createElement("button");
  homeButton.type = "button";
  homeButton.className = "home-button";
  homeButton.textContent = "Home";
  const resultsButton = document.createElement("button");
  resultsButton.type = "button";
  resultsButton.dataset.route = "results";
  resultsButton.textContent = "Results";
  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.dataset.route = "settings";
  settingsButton.textContent = "Settings";
  navActions.append(homeButton, resultsButton, settingsButton);
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
  homeButton.addEventListener("click", () => {
    options.onHome();
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
    const isHomeActive = route === "home";
    homeButton.classList.toggle("is-active", isHomeActive);
    homeButton.setAttribute("aria-pressed", String(isHomeActive));
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

// src/types.ts
function isFinancialRecord(record) {
  return record.entityType === "ClientInvoice" || record.entityType === "PurchaseOrder" || record.entityType === "Bill" || record.entityType === "Receipt" || record.entityType === "Payment";
}
function isPersonRecord(record) {
  return record.entityType === "Person";
}
function isOrganizationRecord(record) {
  return record.entityType === "Organization";
}

// src/utils/format.ts
var ENTITY_LABELS = {
  Document: { singular: "Document", plural: "Documents" },
  ClientInvoice: { singular: "Client Invoice", plural: "Client Invoices" },
  PurchaseOrder: { singular: "Purchase Order", plural: "Purchase Orders" },
  Bill: { singular: "Bill", plural: "Bills" },
  Receipt: { singular: "Receipt", plural: "Receipts" },
  Payment: { singular: "Payment", plural: "Payments" },
  Person: { singular: "Person", plural: "People" },
  Organization: { singular: "Organization", plural: "Organizations" }
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
  if (isPersonRecord(record)) {
    searchableFields.push(
      { field: "personType", content: record.personType },
      { field: "jobTitle", content: record.jobTitle },
      { field: "organization", content: record.associatedOrganization ?? "" },
      { field: "email", content: record.email },
      { field: "phone", content: record.phone },
      { field: "location", content: record.location },
      { field: "tradeFocus", content: record.tradeFocus ?? "" }
    );
  } else if (isOrganizationRecord(record)) {
    searchableFields.push(
      { field: "organizationType", content: record.organizationType },
      { field: "tradeFocus", content: record.tradeFocus },
      { field: "serviceArea", content: record.serviceArea },
      { field: "primaryContact", content: record.primaryContact },
      { field: "phone", content: record.phone },
      { field: "email", content: record.email },
      { field: "website", content: record.website ?? "" }
    );
  } else if (isFinancialRecord(record)) {
    if (record.lineItems) {
      record.lineItems.forEach((item, index) => {
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
function highlightHybrid(text, query) {
  if (!query.trim()) {
    return escapeHtml(text);
  }
  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
    for (const token of sortedTokens) {
      if (!textLower.includes(token)) {
        continue;
      }
      const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
      highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
  }
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  if (amounts.length > 0 || textTokens.length > 0 || range) {
    if (amounts.length > 0) {
      const isExplicitMonetary = query.trim().startsWith("$");
      for (const amount of amounts) {
        const amountStr = amount.toString();
        const amountWithCommas = amount.toLocaleString();
        if (isExplicitMonetary) {
          const monetaryPattern = new RegExp(
            `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
            "g"
          );
          highlightedText = highlightedText.replace(monetaryPattern, '<mark class="monetary-highlight">$1</mark>');
        } else {
          const pattern = new RegExp(
            `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
            "g"
          );
          highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$1</mark>');
        }
      }
    }
    if (range) {
      const rangePatterns = [
        new RegExp(`\\b${escapeRegex(range.min.toString())}\\s*-\\s*${escapeRegex(range.max.toString())}\\b`, "g"),
        new RegExp(`\\b${escapeRegex(range.min.toString())}\\s+to\\s+${escapeRegex(range.max.toString())}\\b`, "gi"),
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
  }
  return highlightedText;
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
  const isExplicitMonetary = query.trim().startsWith("$");
  if (amounts.length > 0) {
    for (const amount of amounts) {
      const amountStr = amount.toString();
      const amountWithCommas = amount.toLocaleString();
      if (isExplicitMonetary) {
        const monetaryPattern = new RegExp(
          `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
          "g"
        );
        highlightedText = highlightedText.replace(monetaryPattern, '<mark class="monetary-highlight">$1</mark>');
      } else {
        const pattern = new RegExp(
          `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
          "g"
        );
        highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$1</mark>');
      }
    }
    if (!isExplicitMonetary) {
      const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
      highlightedText = highlightedText.replace(monetaryValuePattern, (match) => {
        if (match.includes("<mark")) {
          return match;
        }
        const numericValue = parseFloat(match.replace(/[$,\s]/g, ""));
        for (const queryAmount of amounts) {
          if (isPartialMonetaryMatch(queryAmount, numericValue)) {
            return `<mark class="monetary-highlight">${match}</mark>`;
          }
        }
        return match;
      });
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
    const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
    highlightedText = highlightedText.replace(monetaryValuePattern, (match) => {
      const numericValue = parseFloat(match.replace(/[$,\s]/g, ""));
      if (!isNaN(numericValue) && numericValue >= range.min && numericValue <= range.max) {
        if (!match.includes("<mark")) {
          return `<mark class="monetary-highlight">${match}</mark>`;
        }
      }
      return match;
    });
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
function isPartialMonetaryMatch(queryAmount, dataValue) {
  const queryStr = queryAmount.toString();
  const dataStr = dataValue.toString();
  if (dataStr.startsWith(queryStr)) {
    return true;
  }
  const dataWithoutTrailingZeros = dataStr.replace(/0+$/, "");
  if (dataWithoutTrailingZeros.startsWith(queryStr)) {
    return true;
  }
  return false;
}

// src/utils/query.ts
var MIN_EFFECTIVE_QUERY_LENGTH = 2;
function getEffectiveQueryLength(query) {
  if (!query) {
    return 0;
  }
  return query.replace(/\$/g, "").replace(/\s+/g, "").length;
}
function isQueryTooShort(query) {
  const effectiveLength = getEffectiveQueryLength(query);
  return effectiveLength > 0 && effectiveLength < MIN_EFFECTIVE_QUERY_LENGTH;
}

// src/components/searchDialog.ts
function hasMonetaryPotential(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.some((token) => {
    return /^\d+(,\d{3})*(\.\d+)?$/.test(token) || /^\d+(\.\d+)?$/.test(token) || /^\$?\d+(,\d{3})*(\.\d+)?$/.test(token) || /\d/.test(token);
  });
}
function getHighlightFunction(query, isMonetarySearch) {
  if (isMonetarySearch) {
    return highlightMonetaryValues;
  } else if (hasMonetaryPotential(query)) {
    return highlightHybrid;
  } else {
    return highlightText;
  }
}
function createSearchDialog(host, options) {
  const dialog = document.createElement("div");
  dialog.className = "search-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "false");
  dialog.hidden = true;
  host.append(dialog);
  let previousState2 = null;
  const setState = (state) => {
    const visibilityChanged = !previousState2 || previousState2.visible !== state.visible;
    if (visibilityChanged) {
      dialog.hidden = !state.visible;
      if (dialog.hidden) {
        dialog.innerHTML = "";
        dialog.style.display = "none";
        previousState2 = state;
        return;
      }
      dialog.style.display = "flex";
    }
    if (!previousState2 || previousState2.isMonetarySearch !== state.isMonetarySearch) {
      dialog.classList.toggle("monetary-search", state.isMonetarySearch || false);
    }
    const contentChanged = visibilityChanged || !previousState2 || previousState2.status !== state.status || previousState2.query !== state.query || previousState2.response !== state.response;
    if (contentChanged) {
      requestAnimationFrame(() => {
        renderDialogContents(dialog, state, options);
      });
    }
    previousState2 = state;
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
function renderShortQueryState() {
  const wrapper = document.createElement("div");
  wrapper.className = "search-dialog__empty";
  wrapper.innerHTML = `
    <h3>Keep typing</h3>
    <p>Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.</p>
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
  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);
  const title = document.createElement("div");
  title.className = "search-dialog__item-title";
  title.innerHTML = highlightFn(item.title, query);
  const meta = document.createElement("div");
  meta.className = "search-dialog__item-meta";
  const metaText = buildItemMeta(item, query, isMonetarySearch);
  meta.innerHTML = highlightFn(metaText, query);
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
  if (query && isFinancialRecord(item)) {
    const lineItemsMatch = renderMiniLineItems(item, query, isMonetarySearch);
    if (lineItemsMatch) {
      li.append(lineItemsMatch);
    }
  }
  return li;
}
function buildItemMeta(item, query, isMonetarySearch) {
  const parts = [];
  parts.push(item.project);
  if (item.entityType === "Document") {
    parts.push(item.documentType);
    parts.push(`Updated ${formatDate(item.updatedAt)}`);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  if (isFinancialRecord(item)) {
    parts.push(formatCurrency(item.totalValue));
    if (item.status) {
      parts.push(item.status);
    }
    return parts.filter(Boolean).join(" \u2022 ");
  }
  if (isPersonRecord(item)) {
    parts.push(item.personType);
    parts.push(item.jobTitle);
    if (item.associatedOrganization) {
      parts.push(item.associatedOrganization);
    }
    parts.push(item.location);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  if (isOrganizationRecord(item)) {
    parts.push(item.organizationType);
    parts.push(item.tradeFocus);
    parts.push(item.serviceArea);
    return parts.filter(Boolean).join(" \u2022 ");
  }
  return parts.filter(Boolean).join(" \u2022 ");
}
function renderMiniLineItems(item, query, isMonetarySearch) {
  if (!isFinancialRecord(item)) {
    return null;
  }
  const items = item.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }
  const highlightFn = getHighlightFunction(query, isMonetarySearch || false);
  const matchingItems = items.filter((lineItem) => {
    const searchableFields = [
      { value: lineItem.lineItemTitle, field: "title" },
      { value: lineItem.lineItemDescription, field: "description" },
      { value: lineItem.lineItemType, field: "type" },
      { value: lineItem.lineItemQuantity?.toString(), field: "quantity" },
      { value: lineItem.lineItemQuantityUnitOfMeasure, field: "unit" },
      { value: formatCurrency(lineItem.lineItemUnitPrice), field: "unitPrice" },
      { value: formatCurrency(lineItem.lineItemTotal), field: "total" }
    ];
    return searchableFields.some(({ value }) => {
      if (!value) return false;
      const highlighted = highlightFn(value, query);
      return highlighted.includes("<mark");
    });
  });
  if (matchingItems.length === 0) {
    return null;
  }
  const wrapper = document.createElement("small");
  wrapper.className = "mini-line-items";
  const table = document.createElement("table");
  table.className = "mini-line-items__table";
  const displayItems = matchingItems.slice(0, 3);
  displayItems.forEach((line) => {
    const row = document.createElement("tr");
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
  if (matchingItems.length > 3) {
    const moreRow = document.createElement("tr");
    moreRow.className = "mini-line-items__more-row";
    const remaining = matchingItems.length - 3;
    moreRow.innerHTML = `
      <td colspan="5" class="mini-line-items__more">+${remaining} more matching line item${remaining === 1 ? "" : "s"}\u2026</td>
    `;
    table.append(moreRow);
  }
  wrapper.append(table);
  return wrapper;
}
function escapeHtml2(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// src/config/defaults.json
var defaults_default = {
  searchDelayMs: 100,
  groupLimits: {
    Document: 4,
    ClientInvoice: 4,
    PurchaseOrder: 4,
    Bill: 4,
    Receipt: 4,
    Payment: 4,
    Person: 4,
    Organization: 4
  },
  lineItemsContextCount: 3,
  showLineItemsByDefault: true,
  collapseIrrelevantLineItems: true,
  lineItemsCollapseThreshold: 5
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
    groupLimits: { ...state.groupLimits },
    lineItemsContextCount: state.lineItemsContextCount ?? 3,
    showLineItemsByDefault: state.showLineItemsByDefault ?? true,
    collapseIrrelevantLineItems: state.collapseIrrelevantLineItems ?? true,
    lineItemsCollapseThreshold: state.lineItemsCollapseThreshold ?? 5
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

// src/components/resultsView.ts
function hasMonetaryPotential2(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.some((token) => {
    return /^\d+(,\d{3})*(\.\d+)?$/.test(token) || /^\d+(\.\d+)?$/.test(token) || /^\$?\d+(,\d{3})*(\.\d+)?$/.test(token) || /\d/.test(token);
  });
}
function getHighlightFunction2(query, isMonetarySearch) {
  if (isMonetarySearch) {
    return highlightMonetaryValues;
  } else if (hasMonetaryPotential2(query)) {
    return highlightHybrid;
  } else {
    return highlightText;
  }
}
var FACET_LABELS = {
  entityType: "Type",
  project: "Project",
  status: "Status",
  documentType: "Document Type",
  client: "Client",
  issuedDate: "Issued",
  totalValue: "Total",
  groupBy: "Group by",
  personType: "Person Type",
  contactOrganization: "Contact Organization",
  organizationType: "Organization Type",
  tradeFocus: "Trade Focus"
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
  let previousContext = null;
  const render = (context) => {
    const { response, selections, status, query, errorMessage, isMonetarySearch } = context;
    const summaryChanged = !previousContext || previousContext.status !== status || previousContext.response !== response || previousContext.query !== query || previousContext.errorMessage !== errorMessage;
    if (summaryChanged) {
      renderSummary(summaryEl, status, response, query, errorMessage);
    }
    const facetsChanged = !previousContext || previousContext.status !== status || previousContext.response !== response || previousContext.selections !== selections;
    if (facetsChanged) {
      renderFacets(facetsContainer, status, response, selections, options);
    }
    const resultsChanged = !previousContext || previousContext.status !== status || previousContext.response !== response || previousContext.query !== query || previousContext.errorMessage !== errorMessage || previousContext.isMonetarySearch !== isMonetarySearch;
    if (resultsChanged) {
      requestAnimationFrame(() => {
        renderGroups(resultsContainer, status, response, query, errorMessage, isMonetarySearch);
      });
    }
    const selectionsChanged = !previousContext || previousContext.selections !== selections;
    if (selectionsChanged) {
      const hasSelections = selections && Object.keys(selections).length > 0;
      clearButton.hidden = !hasSelections;
    }
    previousContext = context;
  };
  return {
    element: container,
    render
  };
}
function renderSummary(target, status, response, query, errorMessage) {
  switch (status) {
    case "idle":
      if (isQueryTooShort(query)) {
        target.textContent = `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see results.`;
      } else {
        target.textContent = "Type a query to explore results and filters.";
      }
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
    const message = isQueryTooShort(query) ? `Enter at least ${MIN_EFFECTIVE_QUERY_LENGTH} characters to see matching records.` : "Run a search to populate full results.";
    container.innerHTML = `<p class="results-view__empty">${message}</p>`;
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
  const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
  const title = document.createElement("h3");
  title.innerHTML = query && highlightFn ? highlightFn(item.title, query) : item.title;
  const badge = document.createElement("span");
  badge.className = "result-card__badge";
  badge.textContent = formatEntityType(item.entityType);
  header2.append(title, badge);
  const summary = document.createElement("p");
  summary.className = "result-card__summary";
  summary.innerHTML = query && highlightFn ? highlightFn(item.summary, query) : item.summary;
  const metaList = document.createElement("ul");
  metaList.className = "result-card__meta";
  metaList.append(...buildMetaItems(item, query, isMonetarySearch));
  card.append(header2, summary, metaList);
  if (query) {
    const match = findBestMatch(item, query);
    if (match && match.field !== "title" && match.field !== "summary" && !match.field.startsWith("lineItem")) {
      const context = document.createElement("div");
      context.className = "search-context";
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
function buildMetaItems(item, query, isMonetarySearch) {
  const metas = [];
  const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
  const highlightValue = (value) => highlightFn ? highlightFn(value, query) : value;
  const pushMeta = (label, value) => {
    if (!value) {
      return;
    }
    const entry = document.createElement("li");
    entry.innerHTML = `<span>${label}</span><strong>${highlightValue(value)}</strong>`;
    metas.push(entry);
  };
  pushMeta("Project", item.project);
  pushMeta("Status", item.status);
  if (item.entityType === "Document") {
    const doc = item;
    pushMeta("Type", doc.documentType);
    pushMeta("Updated", formatDate(item.updatedAt));
    return metas;
  }
  if (isFinancialRecord(item)) {
    pushMeta("Issued", formatDate(item.issuedDate));
    if (item.dueDate) {
      pushMeta("Due", formatDate(item.dueDate));
    }
    pushMeta("Total", formatCurrency(item.totalValue));
    return metas;
  }
  if (isPersonRecord(item)) {
    pushMeta("Person Type", item.personType);
    pushMeta("Role", item.jobTitle);
    pushMeta("Organization", item.associatedOrganization);
    pushMeta("Location", item.location);
    pushMeta("Email", item.email);
    pushMeta("Phone", item.phone);
    pushMeta("Trade Focus", item.tradeFocus ?? void 0);
    return metas;
  }
  if (isOrganizationRecord(item)) {
    pushMeta("Business Type", item.organizationType);
    pushMeta("Trade", item.tradeFocus);
    pushMeta("Service Area", item.serviceArea);
    pushMeta("Primary Contact", item.primaryContact);
    pushMeta("Phone", item.phone);
    pushMeta("Email", item.email);
    pushMeta("Website", item.website ?? void 0);
    return metas;
  }
  return metas;
}
function hasLineItemMatches(item, query, isMonetarySearch) {
  if (!query || !isFinancialRecord(item)) return false;
  const items = item.lineItems ?? [];
  if (items.length === 0) return false;
  const highlightFn = getHighlightFunction2(query, isMonetarySearch || false);
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
      return highlighted.includes("<mark");
    });
  });
}
function getMatchingLineItemIndices(item, query, isMonetarySearch) {
  if (!query || !isFinancialRecord(item)) return [];
  const items = item.lineItems ?? [];
  if (items.length === 0) return [];
  const matchingIndices = [];
  const highlightFn = getHighlightFunction2(query, isMonetarySearch || false);
  items.forEach((lineItem, index) => {
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
      return highlighted.includes("<mark");
    });
    if (hasMatch) {
      matchingIndices.push(index);
    }
  });
  return matchingIndices;
}
function groupMatchingLineItems(matchingIndices, collapseThreshold) {
  if (matchingIndices.length === 0) return [];
  const groups = [];
  let currentGroup = {
    startIndex: matchingIndices[0],
    endIndex: matchingIndices[0],
    indices: [matchingIndices[0]]
  };
  for (let i = 1; i < matchingIndices.length; i++) {
    const currentIndex = matchingIndices[i];
    const lastIndex = matchingIndices[i - 1];
    if (currentIndex - lastIndex <= collapseThreshold) {
      currentGroup.endIndex = currentIndex;
      currentGroup.indices.push(currentIndex);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        startIndex: currentIndex,
        endIndex: currentIndex,
        indices: [currentIndex]
      };
    }
  }
  groups.push(currentGroup);
  return groups;
}
function calculateDisplayRanges(groups, contextCount, totalItems) {
  if (groups.length === 0) return [];
  const ranges = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const start = Math.max(0, group.startIndex - contextCount);
    const end = Math.min(totalItems - 1, group.endIndex + contextCount);
    ranges.push({ start, end });
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
function renderLineItems(item, query, isMonetarySearch) {
  if (!isFinancialRecord(item)) {
    return null;
  }
  const items = item.lineItems ?? [];
  if (items.length === 0) {
    return null;
  }
  const settings = settingsStore.getState();
  const hasMatches = hasLineItemMatches(item, query, isMonetarySearch);
  const shouldShowLineItems = hasMatches || settings.showLineItemsByDefault;
  const wrapper = document.createElement("div");
  wrapper.className = "result-card__line-items";
  const heading = document.createElement("h4");
  heading.textContent = "Line items";
  wrapper.append(heading);
  const renderLineItemRow = (line, index) => {
    const row = document.createElement("tr");
    const unitPrice = formatCurrency(line.lineItemUnitPrice);
    const total = formatCurrency(line.lineItemTotal);
    const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
    const highlightFn2 = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
    row.innerHTML = `
      <td class="line-item__description">${query && highlightFn2 ? highlightFn2(line.lineItemTitle, query) : line.lineItemTitle}</td>
      <td class="line-item__type">${query && highlightFn2 ? highlightFn2(line.lineItemType, query) : line.lineItemType}</td>
      <td class="line-item__quantity">${query && highlightFn2 ? highlightFn2(quantity, query) : quantity}</td>
      <td class="line-item__unit-price">${query && highlightFn2 ? highlightFn2(unitPrice, query) : unitPrice}</td>
      <td class="line-item__total">${query && highlightFn2 ? highlightFn2(total, query) : total}</td>
    `;
    return row;
  };
  if (!shouldShowLineItems) {
    const toggleLink = document.createElement("button");
    toggleLink.className = "line-items-toggle";
    toggleLink.textContent = `Show line items (${items.length})`;
    toggleLink.type = "button";
    const table2 = document.createElement("table");
    table2.className = "line-items-table";
    table2.style.display = "none";
    const thead2 = document.createElement("thead");
    const headerRow2 = document.createElement("tr");
    headerRow2.innerHTML = `
      <th>Description</th>
      <th>Type</th>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Total</th>
    `;
    thead2.append(headerRow2);
    table2.append(thead2);
    const tbody2 = document.createElement("tbody");
    const highlightFn2 = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
    items.forEach((line) => {
      const row = document.createElement("tr");
      const unitPrice = formatCurrency(line.lineItemUnitPrice);
      const total = formatCurrency(line.lineItemTotal);
      const quantity = `${line.lineItemQuantity} ${line.lineItemQuantityUnitOfMeasure}`;
      row.innerHTML = `
        <td class="line-item__description">${query && highlightFn2 ? highlightFn2(line.lineItemTitle, query) : line.lineItemTitle}</td>
        <td class="line-item__type">${query && highlightFn2 ? highlightFn2(line.lineItemType, query) : line.lineItemType}</td>
        <td class="line-item__quantity">${query && highlightFn2 ? highlightFn2(quantity, query) : quantity}</td>
        <td class="line-item__unit-price">${query && highlightFn2 ? highlightFn2(unitPrice, query) : unitPrice}</td>
        <td class="line-item__total">${query && highlightFn2 ? highlightFn2(total, query) : total}</td>
      `;
      tbody2.append(row);
    });
    table2.append(tbody2);
    toggleLink.addEventListener("click", () => {
      if (table2.style.display === "none") {
        table2.style.display = "table";
        toggleLink.textContent = "Hide line items";
      } else {
        table2.style.display = "none";
        toggleLink.textContent = `Show line items (${items.length})`;
      }
    });
    wrapper.append(toggleLink, table2);
    return wrapper;
  }
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
  const contextCount = settings.lineItemsContextCount;
  const highlightFn = query ? getHighlightFunction2(query, isMonetarySearch || false) : null;
  let displayRanges = [];
  let hiddenItems = [];
  if (hasMatches && contextCount > 0) {
    const matchingIndices = getMatchingLineItemIndices(item, query, isMonetarySearch);
    if (matchingIndices.length > 0) {
      if (settings.collapseIrrelevantLineItems && matchingIndices.length > 1) {
        const groups = groupMatchingLineItems(matchingIndices, settings.lineItemsCollapseThreshold);
        displayRanges = calculateDisplayRanges(groups, contextCount, items.length);
        hiddenItems = [];
        displayRanges.forEach((range) => {
          if (range.isCollapsed) {
            for (let i = range.start; i <= range.end; i++) {
              hiddenItems.push(items[i]);
            }
          }
        });
      } else {
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
      displayRanges = [{ start: 0, end: Math.min(contextCount - 1, items.length - 1) }];
      hiddenItems = items.slice(contextCount);
    }
  } else {
    displayRanges = [{ start: 0, end: items.length - 1 }];
    hiddenItems = [];
  }
  const collapsedRows = [];
  const collapsedContent = [];
  displayRanges.forEach((range) => {
    if (range.isCollapsed) {
      const collapsedRow = document.createElement("tr");
      collapsedRow.className = "line-item__collapsed";
      const itemCount = range.end - range.start + 1;
      collapsedRow.innerHTML = `
        <td colspan="5" class="line-item__collapsed-content">
          <span class="line-item__collapsed-text">...</span>
          <span class="line-item__collapsed-count">${itemCount} items</span>
        </td>
      `;
      tbody.append(collapsedRow);
      collapsedRows.push(collapsedRow);
      const contentRows = [];
      for (let i = range.start; i <= range.end; i++) {
        const lineItemRow = renderLineItemRow(items[i], i);
        lineItemRow.style.display = "none";
        tbody.append(lineItemRow);
        contentRows.push(lineItemRow);
      }
      collapsedContent.push(contentRows);
    } else {
      for (let i = range.start; i <= range.end; i++) {
        const lineItemRow = renderLineItemRow(items[i], i);
        tbody.append(lineItemRow);
      }
    }
  });
  const hiddenRows = [];
  hiddenItems.forEach((line) => {
    const lineItemRow = renderLineItemRow(line, 0);
    lineItemRow.style.display = "none";
    tbody.append(lineItemRow);
    hiddenRows.push(lineItemRow);
  });
  table.append(tbody);
  wrapper.append(table);
  const totalCollapsedCount = collapsedContent.reduce((sum, rows) => sum + rows.length, 0);
  const totalHiddenCount = totalCollapsedCount + hiddenItems.length;
  if (totalHiddenCount > 0) {
    const toggleButton = document.createElement("button");
    toggleButton.className = "line-items-toggle";
    toggleButton.type = "button";
    toggleButton.textContent = `Show ${totalHiddenCount} more line item${totalHiddenCount === 1 ? "" : "s"}`;
    toggleButton.addEventListener("click", () => {
      const isHidden = hiddenRows[0]?.style.display === "none";
      if (isHidden) {
        collapsedRows.forEach((row) => {
          row.style.display = "none";
        });
        collapsedContent.forEach((contentRows) => {
          contentRows.forEach((row) => {
            row.style.display = "";
          });
        });
        hiddenRows.forEach((row) => {
          row.style.display = "";
        });
        toggleButton.textContent = `Hide ${totalHiddenCount} line item${totalHiddenCount === 1 ? "" : "s"}`;
      } else {
        collapsedRows.forEach((row) => {
          row.style.display = "";
        });
        collapsedContent.forEach((contentRows) => {
          contentRows.forEach((row) => {
            row.style.display = "none";
          });
        });
        hiddenRows.forEach((row) => {
          row.style.display = "none";
        });
        toggleButton.textContent = `Show ${totalHiddenCount} more line item${totalHiddenCount === 1 ? "" : "s"}`;
      }
    });
    wrapper.append(toggleButton);
  }
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
  const overallSection = document.createElement("fieldset");
  overallSection.className = "settings-group";
  overallSection.innerHTML = `
    <legend>Overall</legend>
  `;
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
  overallSection.append(delayField);
  const resultsSection = document.createElement("fieldset");
  resultsSection.className = "settings-group";
  resultsSection.innerHTML = `
    <legend>Full Results Page</legend>
  `;
  const lineItemsContextField = document.createElement("div");
  lineItemsContextField.className = "settings-field";
  lineItemsContextField.innerHTML = `
    <label for="line-items-context">Line items context around matches</label>
  `;
  const lineItemsContextSelect = document.createElement("select");
  lineItemsContextSelect.id = "line-items-context";
  lineItemsContextSelect.innerHTML = `
    <option value="1">1 before/after</option>
    <option value="2">2 before/after</option>
    <option value="3">3 before/after</option>
    <option value="0">All line items</option>
  `;
  lineItemsContextField.append(lineItemsContextSelect);
  resultsSection.append(lineItemsContextField);
  const showLineItemsField = document.createElement("div");
  showLineItemsField.className = "settings-field settings-field--checkbox";
  const showLineItemsCheckbox = document.createElement("input");
  showLineItemsCheckbox.id = "show-line-items-default";
  showLineItemsCheckbox.type = "checkbox";
  const showLineItemsLabel = document.createElement("label");
  showLineItemsLabel.htmlFor = "show-line-items-default";
  showLineItemsLabel.textContent = 'Show line items by default (uncheck to collapse behind "Show line items" link)';
  showLineItemsField.append(showLineItemsCheckbox, showLineItemsLabel);
  resultsSection.append(showLineItemsField);
  const collapseLineItemsField = document.createElement("div");
  collapseLineItemsField.className = "settings-field settings-field--checkbox";
  const collapseLineItemsCheckbox = document.createElement("input");
  collapseLineItemsCheckbox.id = "collapse-irrelevant-line-items";
  collapseLineItemsCheckbox.type = "checkbox";
  const collapseLineItemsLabel = document.createElement("label");
  collapseLineItemsLabel.htmlFor = "collapse-irrelevant-line-items";
  collapseLineItemsLabel.textContent = 'Collapse irrelevant line items between results (shows "..." for large gaps between matches)';
  collapseLineItemsField.append(collapseLineItemsCheckbox, collapseLineItemsLabel);
  resultsSection.append(collapseLineItemsField);
  const collapseThresholdField = document.createElement("div");
  collapseThresholdField.className = "settings-field";
  collapseThresholdField.innerHTML = `
    <label for="line-items-collapse-threshold">Collapse threshold</label>
  `;
  const collapseThresholdSelect = document.createElement("select");
  collapseThresholdSelect.id = "line-items-collapse-threshold";
  collapseThresholdSelect.innerHTML = `
    <option value="3">3 items</option>
    <option value="5">5 items</option>
    <option value="7">7 items</option>
    <option value="10">10 items</option>
  `;
  collapseThresholdField.append(collapseThresholdSelect);
  resultsSection.append(collapseThresholdField);
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
  form.append(overallSection, resultsSection, groupSection, actions);
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
    lineItemsContextSelect.value = String(state.lineItemsContextCount);
    showLineItemsCheckbox.checked = state.showLineItemsByDefault;
    collapseLineItemsCheckbox.checked = state.collapseIrrelevantLineItems;
    collapseThresholdSelect.value = String(state.lineItemsCollapseThreshold);
    renderGroupInputs(state.groupLimits);
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nextDelay = Number.parseInt(delayInput.value, 10);
    const resolvedDelay = Number.isFinite(nextDelay) && nextDelay >= 0 ? nextDelay : 0;
    const lineItemsContext = Number.parseInt(lineItemsContextSelect.value, 10);
    const resolvedLineItemsContext = Number.isFinite(lineItemsContext) && lineItemsContext >= 0 ? lineItemsContext : 3;
    const collapseThreshold = Number.parseInt(collapseThresholdSelect.value, 10);
    const resolvedCollapseThreshold = Number.isFinite(collapseThreshold) && collapseThreshold >= 0 ? collapseThreshold : 5;
    const groupLimits = {};
    groupInputs.forEach((input, key) => {
      const parsed = Number.parseInt(input.value, 10);
      groupLimits[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });
    settingsStore.update({
      searchDelayMs: resolvedDelay,
      lineItemsContextCount: resolvedLineItemsContext,
      showLineItemsByDefault: showLineItemsCheckbox.checked,
      collapseIrrelevantLineItems: collapseLineItemsCheckbox.checked,
      lineItemsCollapseThreshold: resolvedCollapseThreshold,
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
var GROUP_ORDER = [
  "Document",
  "Person",
  "Organization",
  "ClientInvoice",
  "PurchaseOrder",
  "Bill",
  "Receipt",
  "Payment"
];
var FACET_KEYS = [
  "entityType",
  "project",
  "status",
  "documentType",
  "client",
  "issuedDate",
  "totalValue",
  "personType",
  "contactOrganization",
  "organizationType",
  "tradeFocus",
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
  switch (record.entityType) {
    case "Document":
      return {
        ...baseRecord,
        entityType: "Document",
        documentType: record.documentType,
        author: record.author
      };
    case "Person":
      return {
        ...baseRecord,
        entityType: "Person",
        personType: record.personType,
        jobTitle: record.jobTitle,
        associatedOrganization: record.associatedOrganization,
        email: record.email,
        phone: record.phone,
        location: record.location,
        tradeFocus: record.tradeFocus
      };
    case "Organization":
      return {
        ...baseRecord,
        entityType: "Organization",
        organizationType: record.organizationType,
        tradeFocus: record.tradeFocus,
        serviceArea: record.serviceArea,
        primaryContact: record.primaryContact,
        phone: record.phone,
        email: record.email,
        website: record.website
      };
    default:
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
  if (isFinancialRecord(record)) {
    record.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
    });
  } else if (isPersonRecord(record)) {
    base.push(
      record.personType,
      record.jobTitle,
      record.associatedOrganization ?? "",
      record.email,
      record.phone,
      record.location,
      record.tradeFocus ?? ""
    );
  } else if (isOrganizationRecord(record)) {
    base.push(
      record.organizationType,
      record.tradeFocus,
      record.serviceArea,
      record.primaryContact,
      record.phone,
      record.email,
      record.website ?? ""
    );
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
function hasMonetaryPotential3(query) {
  const tokens = tokenize(query);
  return tokens.some((token) => {
    return /^\d+(,\d{3})*(\.\d+)?$/.test(token) || /^\d+(\.\d+)?$/.test(token) || /^\$?\d+(,\d{3})*(\.\d+)?$/.test(token) || /\d/.test(token);
  });
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
      return false;
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
function matchesHybridQuery(record, query) {
  const regularMatch = matchesQuery(record, query);
  if (regularMatch) {
    return true;
  }
  if (hasMonetaryPotential3(query)) {
    return matchesMonetaryQuery(record, query);
  }
  return false;
}
function matchesMonetaryQuery(record, query) {
  const { amounts, textTokens, range } = extractMonetaryTokens2(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return true;
  }
  if (!isFinancialRecord(record)) {
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
  const isExplicitMonetary = query.trim().startsWith("$");
  if (isExplicitMonetary) {
    return false;
  }
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const lineItemText = [
        lineItem.lineItemTitle,
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
    case "personType":
      return isPersonRecord(record) ? record.personType : void 0;
    case "contactOrganization":
      if (isPersonRecord(record)) {
        return record.associatedOrganization ?? void 0;
      }
      if (isOrganizationRecord(record)) {
        return record.title;
      }
      return void 0;
    case "organizationType":
      return isOrganizationRecord(record) ? record.organizationType : void 0;
    case "tradeFocus": {
      if (isPersonRecord(record) && record.tradeFocus) {
        return record.tradeFocus;
      }
      if (isOrganizationRecord(record)) {
        return record.tradeFocus;
      }
      const metadataTrade = record.metadata?.tradeFocus;
      return typeof metadataTrade === "string" ? metadataTrade : void 0;
    }
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
function calculateHybridRelevanceScore(record, query) {
  const regularScore = calculateRelevanceScore(record, query);
  if (regularScore > 0) {
    return regularScore;
  }
  if (hasMonetaryPotential3(query)) {
    return calculateMonetaryRelevanceScore(record, query);
  }
  return 0;
}
function calculateMonetaryRelevanceScore(record, query) {
  const { amounts, textTokens, range } = extractMonetaryTokens2(query);
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return 0;
  }
  if (!isFinancialRecord(record)) {
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
  const isExplicitMonetary = query.trim().startsWith("$");
  if (!isExplicitMonetary && textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const lineItemText = [
        lineItem.lineItemTitle,
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
    let scoreA;
    let scoreB;
    if (isMonetary) {
      scoreA = calculateMonetaryRelevanceScore(a, query);
      scoreB = calculateMonetaryRelevanceScore(b, query);
    } else if (hasMonetaryPotential3(query)) {
      scoreA = calculateHybridRelevanceScore(a, query);
      scoreB = calculateHybridRelevanceScore(b, query);
    } else {
      scoreA = calculateRelevanceScore(a, query);
      scoreB = calculateRelevanceScore(b, query);
    }
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
    let matchesQueryResult;
    if (isMonetary) {
      matchesQueryResult = matchesMonetaryQuery(record, searchQuery);
    } else if (hasMonetaryPotential3(searchQuery)) {
      matchesQueryResult = matchesHybridQuery(record, searchQuery);
    } else {
      matchesQueryResult = matchesQuery(record, searchQuery);
    }
    return matchesQueryResult && matchesSelections(record, selections);
  });
  return searchQuery.trim() ? sortByRelevance(filtered, searchQuery, isMonetary) : sortByRecency(filtered);
}
function determineGroupEntityType(records) {
  if (records.length === 0) {
    return "Document";
  }
  const firstType = records[0].entityType;
  if (records.every((record) => record.entityType === firstType)) {
    return firstType;
  }
  const typeCounts = /* @__PURE__ */ new Map();
  records.forEach((record) => {
    typeCounts.set(record.entityType, (typeCounts.get(record.entityType) || 0) + 1);
  });
  let mostCommonType = "Document";
  let maxCount = 0;
  for (const [type, count] of typeCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonType = type;
    }
  }
  return mostCommonType;
}
function buildGroups(records, groupBy) {
  if (!groupBy || groupBy === "None") {
    const typeGroups = /* @__PURE__ */ new Map();
    records.forEach((record) => {
      if (!typeGroups.has(record.entityType)) {
        typeGroups.set(record.entityType, []);
      }
      typeGroups.get(record.entityType).push(record);
    });
    return Array.from(typeGroups.entries()).sort((a, b) => {
      const orderA = GROUP_ORDER.indexOf(a[0]);
      const orderB = GROUP_ORDER.indexOf(b[0]);
      if (orderA !== -1 || orderB !== -1) {
        const safeOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
        const safeOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
        if (safeOrderA !== safeOrderB) {
          return safeOrderA - safeOrderB;
        }
      }
      return a[0].localeCompare(b[0]);
    }).map(([entityType, items]) => ({
      entityType,
      items,
      groupTitle: entityType
    }));
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
  const sortedEntries = Array.from(map.entries()).sort((a, b) => {
    if (groupBy === "Type") {
      const orderA = GROUP_ORDER.indexOf(a[0]);
      const orderB = GROUP_ORDER.indexOf(b[0]);
      if (orderA !== -1 || orderB !== -1) {
        const safeOrderA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
        const safeOrderB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
        if (safeOrderA !== safeOrderB) {
          return safeOrderA - safeOrderB;
        }
      }
    }
    return a[0].localeCompare(b[0]);
  });
  return sortedEntries.map(([groupKey, items]) => ({
    entityType: groupBy === "Type" ? groupKey : determineGroupEntityType(items),
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
  const effectiveDelay = options.query.trim().length < 3 ? Math.min(delay, 50) : delay;
  await wait(effectiveDelay);
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
var searchDebounceTimer = null;
function debouncedSearch(value, options) {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  const effectiveLength = getEffectiveQueryLength(value.trim());
  const delay = effectiveLength < 2 ? 0 : 150;
  searchDebounceTimer = window.setTimeout(() => {
    void performSearch(value, options);
    searchDebounceTimer = null;
  }, delay);
}
var header = createHeader({
  onNavigate: (route) => navigate(route),
  onHome: () => {
    appState.setSearchQuery("");
    appState.setLastSubmittedQuery("");
    appState.setResponse(null);
    appState.setStatus("idle");
    appState.setDialogOpen(false);
    appState.clearFacets();
    navigate("home");
  },
  onSearchChange: (value) => {
    const currentState = appState.getState();
    const previousQuery = currentState.lastSubmittedQuery || currentState.searchQuery;
    if (value.trim() !== previousQuery.trim()) {
      appState.clearFacets();
    }
    appState.setSearchQuery(value);
    header.setMonetarySearchMode(isMonetaryQuery(value));
    const isHome = appState.getState().route === "home";
    debouncedSearch(value, { openDialog: isHome, updateSubmitted: !isHome });
  },
  onSearchSubmit: () => {
    navigate("results");
    void performSearch(appState.getState().searchQuery, { openDialog: false });
  },
  onSearchFocus: () => {
    if (appState.getState().route !== "home") {
      return;
    }
    requestAnimationFrame(() => {
      appState.setDialogOpen(true);
      const query = appState.getState().searchQuery;
      if (query.trim()) {
        debouncedSearch(query, { openDialog: true, updateSubmitted: false });
      }
    });
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
  const effectiveLength = getEffectiveQueryLength(trimmed);
  if (openDialog && appState.getState().route === "home") {
    appState.setDialogOpen(true);
  }
  if (effectiveLength === 0) {
    activeSearchToken += 1;
    if (updateSubmitted) {
      appState.setLastSubmittedQuery("");
    }
    appState.setStatus("idle");
    appState.setResponse(null);
    return;
  }
  if (effectiveLength < MIN_EFFECTIVE_QUERY_LENGTH) {
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
var previousState = null;
appState.subscribe((state) => {
  if (!previousState || previousState.route !== state.route) {
    Object.entries(screens).forEach(([route, element]) => {
      element.hidden = route !== state.route;
    });
  }
  if (!previousState || previousState.searchQuery !== state.searchQuery) {
    header.searchInput.value = state.searchQuery;
  }
  if (!previousState || previousState.route !== state.route) {
    header.setActiveRoute(state.route);
  }
  const dialogStateChanged = !previousState || previousState.dialogOpen !== state.dialogOpen || previousState.route !== state.route || previousState.searchStatus !== state.searchStatus || previousState.searchQuery !== state.searchQuery || previousState.recentResponse !== state.recentResponse;
  if (dialogStateChanged) {
    searchDialog.setState({
      visible: state.dialogOpen && state.route === "home",
      status: state.searchStatus,
      query: state.searchQuery,
      response: state.recentResponse,
      isMonetarySearch: isMonetaryQuery(state.searchQuery)
    });
  }
  const resultsStateChanged = !previousState || previousState.recentResponse !== state.recentResponse || previousState.facetSelections !== state.facetSelections || previousState.searchStatus !== state.searchStatus || previousState.lastSubmittedQuery !== state.lastSubmittedQuery || previousState.searchQuery !== state.searchQuery || previousState.errorMessage !== state.errorMessage;
  if (resultsStateChanged) {
    resultsView.render({
      response: state.recentResponse,
      selections: state.facetSelections,
      status: state.searchStatus,
      query: state.lastSubmittedQuery || state.searchQuery,
      errorMessage: state.errorMessage,
      isMonetarySearch: isMonetaryQuery(state.lastSubmittedQuery || state.searchQuery)
    });
  }
  previousState = state;
});
document.addEventListener("keydown", handleGlobalKeydown);
document.addEventListener("mousedown", handleDocumentClick);
appState.setRoute("home");
//# sourceMappingURL=main.js.map
