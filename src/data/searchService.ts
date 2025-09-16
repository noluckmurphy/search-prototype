import corpusJson from './search_corpus.json';
import {
  DocumentRecord,
  FacetKey,
  FacetSelectionState,
  FacetValue,
  FinancialRecord,
  SearchEntityType,
  SearchGroup,
  SearchOptions,
  SearchRecord,
  SearchResponse,
} from '../types';
import { settingsStore } from '../state/settingsStore';

const GROUP_ORDER: SearchEntityType[] = [
  'Document',
  'ClientInvoice',
  'PurchaseOrder',
  'Bill',
  'Receipt',
  'Payment',
];

const FACET_KEYS: FacetKey[] = [
  'entityType',
  'project',
  'status',
  'documentType',
  'client',
  'issuedDate',
  'totalValue',
  'groupBy',
];

const CORPUS: SearchRecord[] = (corpusJson as any[]).map((record) => normalizeRecord(record));

function normalizeRecord(record: any): SearchRecord {
  // Clean up metadata to remove undefined values and ensure type safety
  const cleanMetadata: Record<string, string | number | boolean | null> = {};
  if (record.metadata) {
    for (const [key, value] of Object.entries(record.metadata)) {
      if (value !== undefined) {
        cleanMetadata[key] = value as string | number | boolean | null;
      }
    }
  }

  const baseRecord = {
    ...record,
    tags: record.tags ?? [],
    metadata: cleanMetadata,
  };

  if (record.entityType === 'Document') {
    return {
      ...baseRecord,
      entityType: 'Document' as const,
      documentType: record.documentType,
      author: record.author,
    } as DocumentRecord;
  } else {
    return {
      ...baseRecord,
      entityType: record.entityType as Exclude<SearchEntityType, 'Document'>,
      totalValue: record.totalValue,
      issuedDate: record.issuedDate,
      dueDate: record.dueDate,
      lineItems: record.lineItems ?? [],
    } as FinancialRecord;
  }
}

function buildHaystack(record: SearchRecord): string {
  const base = [
    record.title,
    record.summary,
    record.project,
    record.client,
    record.status,
    record.tags.join(' '),
    ...Object.values(record.metadata ?? {}).map((value) => (value == null ? '' : String(value))),
  ];

  if (record.entityType !== 'Document') {
    const financialRecord = record as Extract<SearchRecord, { entityType: Exclude<SearchEntityType, 'Document'> }>;
    financialRecord.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
    });
  }

  return base
    .filter((chunk) => Boolean(chunk))
    .join(' ')
    .toLowerCase();
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseMonetaryQuery(query: string): { isMonetary: boolean; searchQuery: string; originalQuery: string } {
  const trimmedQuery = query.trim();
  
  if (trimmedQuery.startsWith('$')) {
    // Extract the amount part after the dollar sign
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

function normalizeMonetaryValue(value: number | string): string {
  // Convert to number first to handle any string inputs
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN or invalid numbers
  if (isNaN(num)) {
    return '';
  }
  
  // Normalize to remove trailing zeros and unnecessary decimal places
  // e.g., 123.00 -> 123, 123.40 -> 123.4, 123.45 -> 123.45
  return num.toString();
}

function parseCurrencyString(amountStr: string): number | null {
  // Remove currency symbols, commas, and whitespace
  const cleaned = amountStr.replace(/[$,\s]/g, '');
  
  // Handle range queries (e.g., "100-200", "100 to 200")
  if (cleaned.includes('-') || cleaned.toLowerCase().includes(' to ')) {
    return null; // Will be handled separately
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function normalizeForComparison(value: number | string): string {
  // Convert to string and remove commas for consistent comparison
  const str = typeof value === 'string' ? value : value.toString();
  return str.replace(/,/g, '');
}

function matchesMonetaryString(queryStr: string, dataValue: number): boolean {
  // Normalize both query and data value for comparison
  const normalizedQuery = normalizeForComparison(queryStr);
  const normalizedData = normalizeForComparison(dataValue.toString());
  
  // Check for exact string match (handles comma differences)
  if (normalizedQuery === normalizedData) {
    return true;
  }
  
  // Only do partial matching for meaningful substrings
  // Both query and data must be at least 3 digits to prevent single-digit matches
  if (normalizedQuery.length >= 3 && normalizedData.length >= 3) {
    // Check if the query is contained in the data value string
    // This handles cases like searching "1234" matching "12,345" (partial match)
    if (normalizedData.includes(normalizedQuery)) {
      return true;
    }
    
    // Check if the data value is contained in the query string
    // This handles cases like searching "12,345" matching "1234" (partial match)
    if (normalizedQuery.includes(normalizedData)) {
      return true;
    }
  }
  
  return false;
}

function isCloseMatch(value1: number, value2: number, tolerance: number = 0.01): boolean {
  return Math.abs(value1 - value2) <= tolerance;
}

function parseRangeQuery(query: string): { min: number; max: number } | null {
  // Handle various range formats: "100-200", "100 to 200", "$100-$200", "$100 to $200"
  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,  // 100-200
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i, // 100 to 200
    /\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)/, // $100-$200
    /\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/i, // $100 to $200
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

function isInRange(value: number, range: { min: number; max: number }): boolean {
  return value >= range.min && value <= range.max;
}

function extractMonetaryTokens(query: string): { amounts: number[]; textTokens: string[]; range: { min: number; max: number } | null } {
  const tokens = tokenize(query);
  const amounts: number[] = [];
  const textTokens: string[] = [];
  
  // Check for range query first
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

function matchesQuery(record: SearchRecord, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = buildHaystack(record);
  return tokens.every((token) => haystack.includes(token));
}

function matchesMonetaryQuery(record: SearchRecord, query: string): boolean {
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return true;
  }

  // For monetary searches, focus on financial records and their line items
  if (record.entityType === 'Document') {
    return false; // Skip documents for monetary searches
  }

  const financialRecord = record as FinancialRecord;
  
  // Handle range queries
  if (range) {
    // Check if total value is in range
    if (isInRange(financialRecord.totalValue, range)) {
      return true;
    }

    // Check if any line item amounts are in range
    for (const lineItem of financialRecord.lineItems) {
      if (isInRange(lineItem.lineItemTotal, range) ||
          isInRange(lineItem.lineItemUnitPrice, range)) {
        return true;
      }
    }
  }
  
  // Check if any monetary amounts match (exact or close)
  if (amounts.length > 0) {
    // Check total value
    for (const queryAmount of amounts) {
      if (isCloseMatch(financialRecord.totalValue, queryAmount)) {
        return true;
      }
    }

    // Check line items for amounts
    for (const lineItem of financialRecord.lineItems) {
      for (const queryAmount of amounts) {
        if (isCloseMatch(lineItem.lineItemTotal, queryAmount) ||
            isCloseMatch(lineItem.lineItemUnitPrice, queryAmount) ||
            isCloseMatch(lineItem.lineItemQuantity, queryAmount)) {
          return true;
        }
      }
    }
  }

  // Check for string-based matches (handles comma differences)
  const tokens = tokenize(query);
  for (const token of tokens) {
    // Check total value string match
    if (matchesMonetaryString(token, financialRecord.totalValue)) {
      return true;
    }

    // Check line items for string matches
    for (const lineItem of financialRecord.lineItems) {
      if (matchesMonetaryString(token, lineItem.lineItemTotal) ||
          matchesMonetaryString(token, lineItem.lineItemUnitPrice) ||
          matchesMonetaryString(token, lineItem.lineItemQuantity)) {
        return true;
      }
    }
  }

  // Check text tokens against line item descriptions
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const lineItemText = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType
      ].join(' ').toLowerCase();

      if (textTokens.every(token => lineItemText.includes(token))) {
        return true;
      }
    }
  }

  return false;
}

function matchesSelections(record: SearchRecord, selections?: FacetSelectionState): boolean {
  if (!selections) {
    return true;
  }

  for (const key of Object.keys(selections) as FacetKey[]) {
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

function getFacetValue(record: SearchRecord, key: FacetKey): string | undefined {
  switch (key) {
    case 'entityType':
      return record.entityType;
    case 'project':
      return record.project;
    case 'status':
      return record.status;
    case 'documentType':
      return record.entityType === 'Document' ? record.documentType : undefined;
    case 'client':
      return record.client;
    case 'issuedDate':
      return record.entityType === 'Document' ? undefined : bucketIssuedDate((record as any).issuedDate);
    case 'totalValue':
      if (record.entityType === 'Document') {
        return undefined;
      }
      return bucketTotal((record as any).totalValue);
    case 'groupBy':
      // This facet is handled specially - it's not a property of individual records
      return undefined;
    default:
      return undefined;
  }
}

function bucketTotal(total: number): string {
  if (total < 10000) return '< $10k';
  if (total < 50000) return '$10k–$50k';
  if (total < 100000) return '$50k–$100k';
  return '$100k+';
}

function bucketIssuedDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays <= 7) return 'Last 7 days';
  if (diffInDays <= 30) return 'Last 30 days';
  if (diffInDays <= 90) return 'Last 3 months';
  if (diffInDays <= 180) return 'Last 6 months';
  if (diffInDays <= 365) return 'Last year';
  if (diffInDays <= 730) return 'Last 2 years';
  return 'Older than 2 years';
}

function computeFacets(records: SearchRecord[]): Partial<Record<FacetKey, FacetValue[]>> {
  const facetMaps: Partial<Record<FacetKey, Map<string, number>>> = {};

  for (const key of FACET_KEYS) {
    if (key !== 'groupBy') {
      facetMaps[key] = new Map<string, number>();
    }
  }

  records.forEach((record) => {
    for (const key of FACET_KEYS) {
      if (key === 'groupBy') {
        continue; // Skip groupBy as it's handled separately
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

  const facets: Partial<Record<FacetKey, FacetValue[]>> = {};

  for (const key of FACET_KEYS) {
    if (key === 'groupBy') {
      // Add special groupBy facet options
      facets[key] = [
        { key: 'groupBy', value: 'None', count: records.length },
        { key: 'groupBy', value: 'Type', count: records.length },
        { key: 'groupBy', value: 'Project', count: records.length },
        { key: 'groupBy', value: 'Status', count: records.length },
        { key: 'groupBy', value: 'Client', count: records.length },
      ];
      continue;
    }
    
    const map = facetMaps[key];
    if (!map || map.size === 0) {
      continue;
    }

    const values = Array.from(map.entries())
      .map(([value, count]) => ({ key, value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    facets[key] = values;
  }

  return facets;
}

function calculateRelevanceScore(record: SearchRecord, query: string): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return 0;
  }

  const haystack = buildHaystack(record);
  const titleLower = record.title.toLowerCase();
  const summaryLower = record.summary.toLowerCase();
  
  let score = 0;
  
  // Exact title match (highest priority)
  if (titleLower.includes(query.toLowerCase())) {
    score += 100;
  }
  
  // Title word matches
  const titleMatches = tokens.filter(token => titleLower.includes(token)).length;
  score += titleMatches * 20;
  
  // Summary matches
  const summaryMatches = tokens.filter(token => summaryLower.includes(token)).length;
  score += summaryMatches * 10;
  
  // Content matches (haystack)
  const contentMatches = tokens.filter(token => haystack.includes(token)).length;
  score += contentMatches * 5;
  
  // Bonus for exact phrase matches in title
  if (titleLower.includes(query.toLowerCase())) {
    score += 50;
  }
  
  // Bonus for exact phrase matches in summary
  if (summaryLower.includes(query.toLowerCase())) {
    score += 25;
  }
  
  return score;
}

function calculateMonetaryRelevanceScore(record: SearchRecord, query: string): number {
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return 0;
  }

  if (record.entityType === 'Document') {
    return 0; // Skip documents for monetary searches
  }

  const financialRecord = record as FinancialRecord;
  let score = 0;
  
  // Handle range queries
  if (range) {
    // Check total value range matches
    if (isInRange(financialRecord.totalValue, range)) {
      // Score based on how close to the center of the range
      const rangeCenter = (range.min + range.max) / 2;
      const distanceFromCenter = Math.abs(financialRecord.totalValue - rangeCenter);
      const rangeSize = range.max - range.min;
      const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
      score += Math.round(800 * (1 - normalizedDistance)); // 800 points max, decreasing with distance
    }
    
    // Check line items for range matches
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
  
  // Check monetary amounts for exact and close matches
  if (amounts.length > 0) {
    // Check total value matches
    for (const queryAmount of amounts) {
      const totalValue = financialRecord.totalValue;
      
      if (totalValue === queryAmount) {
        score += 1000; // Exact total value match
      } else if (isCloseMatch(totalValue, queryAmount, 0.01)) {
        score += 800; // Very close total value match
      } else if (isCloseMatch(totalValue, queryAmount, 1.00)) {
        score += 600; // Close total value match
      }
    }
    
    // Check line items for exact and close amount matches
    for (const lineItem of financialRecord.lineItems) {
      for (const queryAmount of amounts) {
        // Line item total matches
        if (lineItem.lineItemTotal === queryAmount) {
          score += 900; // Exact line item total match
        } else if (isCloseMatch(lineItem.lineItemTotal, queryAmount, 0.01)) {
          score += 700; // Very close line item total match
        } else if (isCloseMatch(lineItem.lineItemTotal, queryAmount, 1.00)) {
          score += 500; // Close line item total match
        }
        
        // Unit price matches
        if (lineItem.lineItemUnitPrice === queryAmount) {
          score += 800; // Exact unit price match
        } else if (isCloseMatch(lineItem.lineItemUnitPrice, queryAmount, 0.01)) {
          score += 600; // Very close unit price match
        } else if (isCloseMatch(lineItem.lineItemUnitPrice, queryAmount, 1.00)) {
          score += 400; // Close unit price match
        }
        
        // Quantity matches (lower priority)
        if (lineItem.lineItemQuantity === queryAmount) {
          score += 300; // Exact quantity match
        } else if (isCloseMatch(lineItem.lineItemQuantity, queryAmount, 0.01)) {
          score += 200; // Close quantity match
        }
      }
    }
  }
  
  // Check for string-based matches (handles comma differences)
  const tokens = tokenize(query);
  for (const token of tokens) {
    // Check total value string match
    if (matchesMonetaryString(token, financialRecord.totalValue)) {
      score += 750; // High score for string-based total value match
    }

    // Check line items for string matches
    for (const lineItem of financialRecord.lineItems) {
      if (matchesMonetaryString(token, lineItem.lineItemTotal)) {
        score += 650; // High score for string-based line item total match
      }
      if (matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
        score += 550; // Good score for string-based unit price match
      }
      if (matchesMonetaryString(token, lineItem.lineItemQuantity)) {
        score += 250; // Lower score for string-based quantity match
      }
    }
  }

  // Check text tokens against line item descriptions
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      const lineItemText = [
        lineItem.lineItemTitle,
        lineItem.lineItemDescription,
        lineItem.lineItemType
      ].join(' ').toLowerCase();
      
      const lineItemMatches = textTokens.filter(token => lineItemText.includes(token)).length;
      score += lineItemMatches * 50;
    }
    
    // Small bonus for title/summary matches in financial records
    const titleLower = record.title.toLowerCase();
    const summaryLower = record.summary.toLowerCase();
    
    const titleMatches = textTokens.filter(token => titleLower.includes(token)).length;
    score += titleMatches * 10;
    
    const summaryMatches = textTokens.filter(token => summaryLower.includes(token)).length;
    score += summaryMatches * 5;
  }
  
  return score;
}

function sortByRelevance(records: SearchRecord[], query: string, isMonetary: boolean = false): SearchRecord[] {
  return [...records].sort((a, b) => {
    const scoreA = isMonetary ? calculateMonetaryRelevanceScore(a, query) : calculateRelevanceScore(a, query);
    const scoreB = isMonetary ? calculateMonetaryRelevanceScore(b, query) : calculateRelevanceScore(b, query);
    
    // Primary sort by relevance score (descending)
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Secondary sort by recency (descending) as tiebreaker
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function sortByRecency(records: SearchRecord[]): SearchRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function filterRecords({ query, selections, isMonetarySearch }: SearchOptions): SearchRecord[] {
  const { isMonetary, searchQuery } = parseMonetaryQuery(query);
  
  const filtered = CORPUS.filter((record) => {
    const matchesQueryResult = isMonetary ? matchesMonetaryQuery(record, searchQuery) : matchesQuery(record, searchQuery);
    return matchesQueryResult && matchesSelections(record, selections);
  });
  
  // Use relevance-based sorting for non-empty queries, recency for empty queries
  return searchQuery.trim() ? sortByRelevance(filtered, searchQuery, isMonetary) : sortByRecency(filtered);
}

function buildGroups(records: SearchRecord[], groupBy?: string): SearchGroup[] {
  if (!groupBy || groupBy === 'None') {
    // Return a single group with all records
    return records.length > 0 ? [{ entityType: 'Document' as SearchEntityType, items: records }] : [];
  }

  const map = new Map<string, SearchRecord[]>();

  records.forEach((record) => {
    let groupKey: string;
    
    switch (groupBy) {
      case 'Type':
        groupKey = record.entityType;
        break;
      case 'Project':
        groupKey = record.project;
        break;
      case 'Status':
        groupKey = record.status;
        break;
      case 'Client':
        groupKey = record.client;
        break;
      default:
        groupKey = record.entityType;
    }

    if (!map.has(groupKey)) {
      map.set(groupKey, []);
    }
    map.get(groupKey)!.push(record);
  });

  // Sort groups by key name for consistent ordering
  const sortedEntries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return sortedEntries.map(([groupKey, items]) => ({
    entityType: groupBy === 'Type' ? groupKey as SearchEntityType : 'Document' as SearchEntityType,
    items,
    groupTitle: groupKey,
  })).filter((group) => group.items.length > 0);
}

function applyGroupLimits(groups: SearchGroup[], limits: Record<string, number>): SearchGroup[] {
  return groups
    .map((group) => {
      const limit = limits[group.entityType] ?? limits['Document'] ?? 4;
      return {
        entityType: group.entityType,
        items: group.items.slice(0, Math.max(0, limit)),
      } satisfies SearchGroup;
    })
    .filter((group) => group.items.length > 0);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    globalThis.setTimeout(resolve, ms);
  });
}

export async function runSearch(
  options: SearchOptions,
  overrides?: {
    delayMs?: number;
    groupLimits?: Record<string, number>;
  },
): Promise<SearchResponse> {
  const settings = settingsStore.getState();
  const delay = overrides?.delayMs ?? settings.searchDelayMs;
  const groupLimits = overrides?.groupLimits ?? settings.groupLimits;

  const { isMonetary } = parseMonetaryQuery(options.query);
  const searchOptions = { ...options, isMonetarySearch: isMonetary };
  
  const records = filterRecords(searchOptions);
  const facets = computeFacets(records);
  
  // Determine grouping option from selections
  const groupBy = options.selections?.groupBy?.values().next().value;
  const isGrouped = groupBy && groupBy !== 'None';
  
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
    isGrouped: !!isGrouped,
  };
}

export function getCorpus(): SearchRecord[] {
  return [...CORPUS];
}
