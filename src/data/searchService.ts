import {
  BuildertrendRecord,
  DocumentRecord,
  FacetKey,
  FacetSelectionState,
  FacetValue,
  FinancialRecord,
  OrganizationRecord,
  PersonRecord,
  SearchEntityType,
  SearchGroup,
  SearchOptions,
  SearchRecord,
  SearchResponse,
  isBuildertrendRecord,
  isFinancialRecord,
  isOrganizationRecord,
  isPersonRecord,
} from '../types';
import { settingsStore } from '../state/settingsStore';
import { 
  matchesMonetaryQuery as matchesMonetaryValue, 
  extractMonetaryAmounts, 
  hasMonetaryValue,
  parseMonetaryString,
  numberToMonetary,
  areMonetaryValuesEqual
} from '../utils/monetary';
import { RelationshipEngine, Relationship, SmartAction } from '../utils/relationshipEngine';

const GROUP_ORDER: SearchEntityType[] = [
  'Buildertrend',
  'Document',
  'Person',
  'Organization',
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
  'personType',
  'contactOrganization',
  'organizationType',
  'tradeFocus',
  'costCodeCategory',
  'costCode',
  'groupBy',
];

// Load corpus from multiple files
let CORPUS: SearchRecord[] = [];
let RELATIONSHIP_ENGINE: RelationshipEngine | null = null;

async function loadCorpus(): Promise<SearchRecord[]> {
  if (CORPUS.length > 0) {
    return CORPUS; // Return cached corpus if already loaded
  }

  try {
    const allRecords: any[] = [];
    
    // Load Buildertrend corpus first (for priority ordering)
    try {
      const buildertrendResponse = await fetch('./buildertrend-corpus.json');
      const buildertrendData = await buildertrendResponse.json();
      allRecords.push(...buildertrendData);
    } catch (error) {
      console.warn('Could not load Buildertrend corpus:', error);
    }
    
    // Load the index file to get metadata about the split files
    const indexResponse = await fetch('./corpus-parts/index.json');
    const indexData = await indexResponse.json();
    
    // Load each corpus part file
    for (const fileInfo of indexData.files) {
      const response = await fetch(`./corpus-parts/${fileInfo.filename}`);
      const partData = await response.json();
      allRecords.push(...partData);
    }
    
    CORPUS = allRecords.map((record) => normalizeRecord(record));
    
    // Initialize relationship engine
    RELATIONSHIP_ENGINE = new RelationshipEngine(CORPUS);
    
    return CORPUS;
  } catch (error) {
    console.error('Error loading corpus:', error);
    // Fallback to empty corpus
    CORPUS = [];
    return CORPUS;
  }
}

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

  switch (record.entityType as SearchEntityType) {
    case 'Buildertrend':
      return {
        ...baseRecord,
        entityType: 'Buildertrend',
        path: record.path,
        description: record.description,
        icon: record.icon,
        url: record.url,
        triggerQueries: record.triggerQueries,
      } as BuildertrendRecord;
    case 'Document':
      return {
        ...baseRecord,
        entityType: 'Document',
        documentType: record.documentType,
        author: record.author,
      } as DocumentRecord;
    case 'Person':
      return {
        ...baseRecord,
        entityType: 'Person',
        personType: record.personType,
        jobTitle: record.jobTitle,
        associatedOrganization: record.associatedOrganization,
        email: record.email,
        phone: record.phone,
        location: record.location,
        tradeFocus: record.tradeFocus,
      } as PersonRecord;
    case 'Organization':
      return {
        ...baseRecord,
        entityType: 'Organization',
        organizationType: record.organizationType,
        tradeFocus: record.tradeFocus,
        serviceArea: record.serviceArea,
        primaryContact: record.primaryContact,
        phone: record.phone,
        email: record.email,
        website: record.website,
      } as OrganizationRecord;
    default:
      return {
        ...baseRecord,
        entityType: record.entityType,
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

  if (isBuildertrendRecord(record)) {
    base.push(
      record.path,
      record.description,
      record.icon,
      record.url,
      ...record.triggerQueries,
    );
  } else if (isFinancialRecord(record)) {
    record.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
      // Add cost code information to searchable content
      if (item.costCode) base.push(item.costCode);
      if (item.costCodeName) base.push(item.costCodeName);
      if (item.costCodeCategory) base.push(item.costCodeCategory);
      if (item.costCodeCategoryName) base.push(item.costCodeCategoryName);
    });
  } else if (isPersonRecord(record)) {
    base.push(
      record.personType,
      record.jobTitle,
      record.associatedOrganization ?? '',
      record.email,
      record.phone,
      record.location,
      record.tradeFocus ?? '',
    );
  } else if (isOrganizationRecord(record)) {
    base.push(
      record.organizationType,
      record.tradeFocus,
      record.serviceArea,
      record.primaryContact,
      record.phone,
      record.email,
      record.website ?? '',
    );
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

// Boolean query types
interface BooleanQuery {
  type: 'boolean';
  operator: 'AND' | 'OR' | 'NOT';
  left: string | ParsedQuery;
  right?: string | ParsedQuery;
}

interface SimpleQuery {
  type: 'simple';
  query: string;
}

type ParsedQuery = BooleanQuery | SimpleQuery;

function parseBooleanQuery(query: string): ParsedQuery {
  const trimmed = query.trim();
  
  // Check for boolean operators with proper spacing
  // Only match uppercase operators with spaces before and after
  const andMatch = trimmed.match(/^(.+?)\s+AND\s+(.+)$/);
  const orMatch = trimmed.match(/^(.+?)\s+OR\s+(.+)$/);
  const notMatch = trimmed.match(/^(.+?)\s+NOT\s+(.+)$/);
  
  if (andMatch) {
    return {
      type: 'boolean',
      operator: 'AND',
      left: parseBooleanQuery(andMatch[1].trim()),
      right: parseBooleanQuery(andMatch[2].trim())
    };
  }
  
  if (orMatch) {
    return {
      type: 'boolean',
      operator: 'OR',
      left: parseBooleanQuery(orMatch[1].trim()),
      right: parseBooleanQuery(orMatch[2].trim())
    };
  }
  
  if (notMatch) {
    return {
      type: 'boolean',
      operator: 'NOT',
      left: parseBooleanQuery(notMatch[1].trim()),
      right: parseBooleanQuery(notMatch[2].trim())
    };
  }
  
  // No boolean operators found, return as simple query
  return {
    type: 'simple',
    query: trimmed
  };
}

function isBooleanQuery(query: string): boolean {
  const parsed = parseBooleanQuery(query);
  return parsed.type === 'boolean';
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

function isNumericQuery(query: string): boolean {
  const tokens = tokenize(query);
  // Check if any token is purely numeric (could be a monetary amount)
  return tokens.some(token => /^\d+(\.\d+)?$/.test(token));
}

function hasMonetaryPotential(query: string): boolean {
  return hasMonetaryValue(query);
}

// Old monetary functions removed - now using monetary utility module

function matchesMonetaryString(queryStr: string, dataValue: number): boolean {
  return matchesMonetaryValue(queryStr, dataValue);
}

/**
 * Determines which monetary matches will be visible (highlighted) in the UI
 * This helps prioritize results that users can actually see the match in
 */
function getVisibleMonetaryMatches(record: FinancialRecord, query: string): {
  hasVisibleMatches: boolean;
  hasExactVisibleMatches: boolean;
  visibleMatchTypes: string[];
} {
  const { amounts } = extractMonetaryTokens(query);
  
  if (amounts.length === 0) {
    return { hasVisibleMatches: false, hasExactVisibleMatches: false, visibleMatchTypes: [] };
  }
  
  const visibleMatchTypes: string[] = [];
  let hasVisibleMatches = false;
  let hasExactVisibleMatches = false;
  
  // Check if total value will be highlighted (visible in the main record display)
  for (const queryAmount of amounts) {
    if (record.totalValue === queryAmount) {
      visibleMatchTypes.push('totalValue');
      hasVisibleMatches = true;
      hasExactVisibleMatches = true;
    } else if (matchesMonetaryValue(query, record.totalValue)) {
      visibleMatchTypes.push('totalValue');
      hasVisibleMatches = true;
    }
  }
  
  // Check if any line items will be highlighted (visible in the line items table)
  for (const lineItem of record.lineItems) {
    for (const queryAmount of amounts) {
      // Check line item total
      if (lineItem.lineItemTotal === queryAmount) {
        visibleMatchTypes.push('lineItemTotal');
        hasVisibleMatches = true;
        hasExactVisibleMatches = true;
      } else if (matchesMonetaryValue(query, lineItem.lineItemTotal)) {
        visibleMatchTypes.push('lineItemTotal');
        hasVisibleMatches = true;
      }
      
      // Check line item unit price
      if (lineItem.lineItemUnitPrice === queryAmount) {
        visibleMatchTypes.push('lineItemUnitPrice');
        hasVisibleMatches = true;
        hasExactVisibleMatches = true;
      } else if (matchesMonetaryValue(query, lineItem.lineItemUnitPrice)) {
        visibleMatchTypes.push('lineItemUnitPrice');
        hasVisibleMatches = true;
      }
    }
  }
  
  return {
    hasVisibleMatches,
    hasExactVisibleMatches,
    visibleMatchTypes: [...new Set(visibleMatchTypes)] // Remove duplicates
  };
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
  
  // Use the new monetary utility to extract amounts
  const monetaryAmounts = extractMonetaryAmounts(query);
  for (const monetary of monetaryAmounts) {
    // Convert from cents back to dollars for compatibility
    amounts.push(monetary.amount / 100);
  }
  
  // Add non-monetary tokens
  for (const token of tokens) {
    const parsed = parseMonetaryString(token);
    if (!parsed) {
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

function matchesBooleanQuery(record: SearchRecord, parsedQuery: ParsedQuery): boolean {
  console.log(`🔍 matchesBooleanQuery called for record "${record.title}" with query:`, JSON.stringify(parsedQuery, null, 2));
  
  if (parsedQuery.type === 'simple') {
    // For simple queries, use monetary-aware matching logic
    const result = matchesQueryWithMonetarySupport(record, parsedQuery.query);
    console.log(`🔍 Simple query "${parsedQuery.query}" result: ${result}`);
    return result;
  }
  
  const booleanQuery = parsedQuery as BooleanQuery;
  
  // Evaluate left side
  const leftMatch = typeof booleanQuery.left === 'string' 
    ? matchesQueryWithMonetarySupport(record, booleanQuery.left)
    : matchesBooleanQuery(record, booleanQuery.left);
  
  console.log(`🔍 Left side match: ${leftMatch}`);
  
  // Handle NOT operator (left AND NOT right)
  if (booleanQuery.operator === 'NOT') {
    if (!booleanQuery.right) {
      const result = !leftMatch;
      console.log(`🔍 NOT result (no right): ${result}`);
      return result;
    }
    
    const rightMatch = typeof booleanQuery.right === 'string'
      ? matchesQueryWithMonetarySupport(record, booleanQuery.right)
      : matchesBooleanQuery(record, booleanQuery.right);
    
    console.log(`🔍 Right side match for NOT: ${rightMatch}`);
    const result = leftMatch && !rightMatch;
    console.log(`🔍 NOT result: ${leftMatch} && !${rightMatch} = ${result}`);
    return result;
  }
  
  // Handle AND and OR operators (have both left and right sides)
  if (!booleanQuery.right) {
    console.log(`🔍 No right side, returning left match: ${leftMatch}`);
    return leftMatch;
  }
  
  const rightMatch = typeof booleanQuery.right === 'string'
    ? matchesQueryWithMonetarySupport(record, booleanQuery.right)
    : matchesBooleanQuery(record, booleanQuery.right);
  
  console.log(`🔍 Right side match: ${rightMatch}`);
  
  let result;
  switch (booleanQuery.operator) {
    case 'AND':
      result = leftMatch && rightMatch;
      console.log(`🔍 AND result: ${leftMatch} && ${rightMatch} = ${result}`);
      break;
    case 'OR':
      result = leftMatch || rightMatch;
      console.log(`🔍 OR result: ${leftMatch} || ${rightMatch} = ${result}`);
      break;
    default:
      result = leftMatch;
      console.log(`🔍 Default result: ${result}`);
  }
  
  return result;
}

/**
 * Matches a query term with support for both text and monetary matching
 */
function matchesQueryWithMonetarySupport(record: SearchRecord, query: string): boolean {
  console.log(`🔍 matchesQueryWithMonetarySupport called for record "${record.title}" with query: "${query}"`);
  
  // Check if this is a monetary query (starts with $)
  if (query.startsWith('$')) {
    const amountPart = query.slice(1).trim();
    console.log(`🔍 Monetary query detected, amount part: "${amountPart}"`);
    const monetaryMatch = matchesMonetaryQuery(record, amountPart);
    console.log(`🔍 Monetary match for "${amountPart}": ${monetaryMatch}`);
    return monetaryMatch;
  }
  
  // First try regular text matching
  const textMatch = matchesQuery(record, query);
  console.log(`🔍 Text match for "${query}": ${textMatch}`);
  if (textMatch) {
    return true;
  }
  
  // If no text match and query has monetary potential, try monetary matching
  const hasMonetary = hasMonetaryPotential(query);
  console.log(`🔍 Has monetary potential for "${query}": ${hasMonetary}`);
  if (hasMonetary) {
    const monetaryMatch = matchesMonetaryQuery(record, query);
    console.log(`🔍 Monetary match for "${query}": ${monetaryMatch}`);
    return monetaryMatch;
  }
  
  console.log(`🔍 No match for "${query}"`);
  return false;
}

function matchesHybridQuery(record: SearchRecord, query: string): boolean {
  // First try regular text matching
  const regularMatch = matchesQuery(record, query);
  
  // If regular match succeeds, return true
  if (regularMatch) {
    return true;
  }
  
  // If no regular match and query has monetary potential, try monetary matching
  if (hasMonetaryPotential(query)) {
    return matchesMonetaryQuery(record, query);
  }
  
  return false;
}

function matchesMonetaryQuery(record: SearchRecord, query: string): boolean {
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return true;
  }

  // For monetary searches, focus on financial records and their line items
  if (!isFinancialRecord(record)) {
    return false; // Skip non-financial records for monetary searches
  }

  const financialRecord = record;
  
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
            isCloseMatch(lineItem.lineItemUnitPrice, queryAmount)) {
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
          matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
        return true;
      }
    }
  }

  // For explicit monetary searches (queries starting with $), be more restrictive
  // Only match against monetary values, not descriptions or quantities
  const isExplicitMonetary = query.trim().startsWith('$');
  
  if (isExplicitMonetary) {
    // For explicit monetary searches, don't match against descriptions or quantities
    // Only match against actual monetary values (totals, unit prices)
    return false; // We've already checked all monetary values above
  }

  // For non-explicit monetary searches (like "123"), allow text token matching
  // but ONLY match against fields marked as monetary in the metadata
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      // Only match against fields marked as monetary in the metadata
      const monetaryFields: string[] = [];
      
      if (lineItem.fieldMetadata) {
        // Check each field and only include monetary ones
        if (lineItem.fieldMetadata.lineItemTitle === 'monetary') {
          monetaryFields.push(lineItem.lineItemTitle);
        }
        if (lineItem.fieldMetadata.lineItemDescription === 'monetary') {
          monetaryFields.push(lineItem.lineItemDescription);
        }
        if (lineItem.fieldMetadata.lineItemType === 'monetary') {
          monetaryFields.push(lineItem.lineItemType);
        }
      } else {
        // Fallback: if no metadata, only match against monetary value fields
        // This ensures backward compatibility
        monetaryFields.push(lineItem.lineItemType); // Only type field for now
      }
      
      const lineItemText = monetaryFields.join(' ').toLowerCase();
      
      if (lineItemText && textTokens.every(token => lineItemText.includes(token))) {
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

    // Skip groupBy facet - it's used for organization, not filtering
    if (key === 'groupBy') {
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
    case 'personType':
      return isPersonRecord(record) ? record.personType : undefined;
    case 'contactOrganization':
      if (isPersonRecord(record)) {
        return record.associatedOrganization ?? undefined;
      }
      if (isOrganizationRecord(record)) {
        return record.title;
      }
      return undefined;
    case 'organizationType':
      return isOrganizationRecord(record) ? record.organizationType : undefined;
    case 'tradeFocus': {
      if (isPersonRecord(record) && record.tradeFocus) {
        return record.tradeFocus;
      }
      if (isOrganizationRecord(record)) {
        return record.tradeFocus;
      }
      const metadataTrade = record.metadata?.tradeFocus;
      return typeof metadataTrade === 'string' ? metadataTrade : undefined;
    }
    case 'costCodeCategory': {
      // For financial records, return the most common cost code category among line items
      if (isFinancialRecord(record) && record.lineItems.length > 0) {
        const categories = record.lineItems
          .map(item => item.costCodeCategory)
          .filter(Boolean);
        if (categories.length > 0) {
          // Return the most common category
          const categoryCounts = categories.reduce((acc, cat) => {
            acc[cat!] = (acc[cat!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          return Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)[0][0];
        }
      }
      return undefined;
    }
    case 'costCode': {
      // For financial records, return the most common cost code among line items
      if (isFinancialRecord(record) && record.lineItems.length > 0) {
        const codes = record.lineItems
          .map(item => item.costCode)
          .filter(Boolean);
        if (codes.length > 0) {
          // Return the most common code
          const codeCounts = codes.reduce((acc, code) => {
            acc[code!] = (acc[code!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          return Object.entries(codeCounts)
            .sort(([,a], [,b]) => b - a)[0][0];
        }
      }
      return undefined;
    }
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

function calculateBooleanRelevanceScore(record: SearchRecord, parsedQuery: ParsedQuery): number {
  if (parsedQuery.type === 'simple') {
    return calculateRelevanceScoreWithMonetarySupport(record, parsedQuery.query);
  }
  
  const booleanQuery = parsedQuery as BooleanQuery;
  
  // Calculate scores for left and right sides
  const leftScore = typeof booleanQuery.left === 'string' 
    ? calculateRelevanceScoreWithMonetarySupport(record, booleanQuery.left)
    : calculateBooleanRelevanceScore(record, booleanQuery.left);
  
  if (booleanQuery.operator === 'NOT') {
    // For NOT queries, return a base score if the left side matches
    // This ensures NOT queries still get some relevance scoring
    return leftScore > 0 ? 10 : 0;
  }
  
  if (!booleanQuery.right) {
    return leftScore;
  }
  
  const rightScore = typeof booleanQuery.right === 'string'
    ? calculateRelevanceScoreWithMonetarySupport(record, booleanQuery.right)
    : calculateBooleanRelevanceScore(record, booleanQuery.right);
  
  switch (booleanQuery.operator) {
    case 'AND':
      // For AND, both sides must match, so use the minimum score
      return Math.min(leftScore, rightScore);
    case 'OR':
      // For OR, use the maximum score (best match)
      return Math.max(leftScore, rightScore);
    default:
      return leftScore;
  }
}

/**
 * Calculates relevance score with support for both text and monetary matching
 */
function calculateRelevanceScoreWithMonetarySupport(record: SearchRecord, query: string): number {
  // First try regular text scoring
  const textScore = calculateRelevanceScore(record, query);
  if (textScore > 0) {
    return textScore;
  }
  
  // If no text score and query has monetary potential, try monetary scoring
  if (hasMonetaryPotential(query)) {
    return calculateMonetaryRelevanceScore(record, query);
  }
  
  return 0;
}

function calculateHybridRelevanceScore(record: SearchRecord, query: string): number {
  // First calculate regular relevance score
  const regularScore = calculateRelevanceScore(record, query);
  
  // If regular score is high enough, use it
  if (regularScore > 0) {
    return regularScore;
  }
  
  // If no regular match and query has monetary potential, try monetary scoring
  if (hasMonetaryPotential(query)) {
    return calculateMonetaryRelevanceScore(record, query);
  }
  
  return 0;
}

function calculateMonetaryRelevanceScore(record: SearchRecord, query: string): number {
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return 0;
  }

  if (!isFinancialRecord(record)) {
    return 0; // Skip non-financial records for monetary searches
  }

  const financialRecord = record;
  let score = 0;
  
  // Enhanced scoring: prioritize matches that will be highlighted in the UI
  const visibleMatches = getVisibleMonetaryMatches(financialRecord, query);
  
  // Boost score for records with visible matches
  if (visibleMatches.hasVisibleMatches) {
    score += 2000; // High boost for visible matches
    
    // Additional scoring based on match types
    for (const matchType of visibleMatches.visibleMatchTypes) {
      switch (matchType) {
        case 'totalValue':
          score += 500; // High priority for total value matches (most visible)
          break;
        case 'lineItemTotal':
          score += 300; // Medium priority for line item totals
          break;
        case 'lineItemUnitPrice':
          score += 200; // Lower priority for unit prices
          break;
      }
    }
  }
  
  // Additional boost for exact visible matches
  if (visibleMatches.hasExactVisibleMatches) {
    score += 1000; // Extra boost for exact visible matches
  }
  
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
    }
  }

  // For explicit monetary searches (queries starting with $), be more restrictive
  // Only score against monetary values, not descriptions or quantities
  const isExplicitMonetary = query.trim().startsWith('$');
  
  if (!isExplicitMonetary && textTokens.length > 0) {
    // For non-explicit monetary searches (like "123"), allow text token matching
    // but ONLY match against fields marked as monetary in the metadata
    for (const lineItem of financialRecord.lineItems) {
      // Only match against fields marked as monetary in the metadata
      const monetaryFields: string[] = [];
      
      if (lineItem.fieldMetadata) {
        // Check each field and only include monetary ones
        if (lineItem.fieldMetadata.lineItemTitle === 'monetary') {
          monetaryFields.push(lineItem.lineItemTitle);
        }
        if (lineItem.fieldMetadata.lineItemDescription === 'monetary') {
          monetaryFields.push(lineItem.lineItemDescription);
        }
        if (lineItem.fieldMetadata.lineItemType === 'monetary') {
          monetaryFields.push(lineItem.lineItemType);
        }
      } else {
        // Fallback: if no metadata, only match against monetary value fields
        // This ensures backward compatibility
        monetaryFields.push(lineItem.lineItemType); // Only type field for now
      }
      
      const lineItemText = monetaryFields.join(' ').toLowerCase();
      
      if (lineItemText) {
        const lineItemMatches = textTokens.filter(token => lineItemText.includes(token)).length;
        score += lineItemMatches * 50;
      }
    }
    
    // Small bonus for title/summary matches in financial records
    // Only if they are marked as monetary in metadata
    if (financialRecord.fieldMetadata) {
      const titleLower = record.title.toLowerCase();
      const summaryLower = record.summary.toLowerCase();
      
      if (financialRecord.fieldMetadata.title === 'monetary') {
        const titleMatches = textTokens.filter(token => titleLower.includes(token)).length;
        score += titleMatches * 10;
      }
      
      if (financialRecord.fieldMetadata.summary === 'monetary') {
        const summaryMatches = textTokens.filter(token => summaryLower.includes(token)).length;
        score += summaryMatches * 5;
      }
    }
  }
  
  return score;
}

function sortByRelevance(records: SearchRecord[], query: string, isMonetary: boolean = false): SearchRecord[] {
  return [...records].sort((a, b) => {
    let scoreA: number;
    let scoreB: number;
    
    // Check if this is a boolean query
    const isBoolean = isBooleanQuery(query);
    const parsedQuery = isBoolean ? parseBooleanQuery(query) : null;
    
    if (isBoolean && parsedQuery) {
      // Boolean scoring
      scoreA = calculateBooleanRelevanceScore(a, parsedQuery);
      scoreB = calculateBooleanRelevanceScore(b, parsedQuery);
    } else if (isMonetary) {
      // Explicit monetary search (query starts with $)
      scoreA = calculateMonetaryRelevanceScore(a, query);
      scoreB = calculateMonetaryRelevanceScore(b, query);
    } else if (hasMonetaryPotential(query)) {
      // Hybrid scoring for queries with numeric potential (like "123")
      scoreA = calculateHybridRelevanceScore(a, query);
      scoreB = calculateHybridRelevanceScore(b, query);
    } else {
      // Regular scoring for non-numeric queries
      scoreA = calculateRelevanceScore(a, query);
      scoreB = calculateRelevanceScore(b, query);
    }
    
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

function sortByMostRecent(records: SearchRecord[], query: string, isMonetary: boolean = false): SearchRecord[] {
  return [...records].sort((a, b) => {
    // Get the most recent date for each record (updatedAt or createdAt/issuedDate)
    const getMostRecentDate = (record: SearchRecord): Date => {
      const updatedDate = new Date(record.updatedAt);
      let createdDate: Date;
      
      if (isFinancialRecord(record)) {
        // For financial records, use issuedDate as created date
        createdDate = new Date(record.issuedDate);
      } else {
        // For other records, use createdAt
        createdDate = new Date(record.createdAt);
      }
      
      return updatedDate > createdDate ? updatedDate : createdDate;
    };
    
    const dateA = getMostRecentDate(a);
    const dateB = getMostRecentDate(b);
    
    // Primary sort by date (descending - most recent first)
    if (dateA.getTime() !== dateB.getTime()) {
      return dateB.getTime() - dateA.getTime();
    }
    
    // Secondary sort by relevance as tiebreaker
    let scoreA: number;
    let scoreB: number;
    
    const isBoolean = isBooleanQuery(query);
    const parsedQuery = isBoolean ? parseBooleanQuery(query) : null;
    
    if (isBoolean && parsedQuery) {
      scoreA = calculateBooleanRelevanceScore(a, parsedQuery);
      scoreB = calculateBooleanRelevanceScore(b, parsedQuery);
    } else if (isMonetary) {
      scoreA = calculateMonetaryRelevanceScore(a, query);
      scoreB = calculateMonetaryRelevanceScore(b, query);
    } else if (hasMonetaryPotential(query)) {
      scoreA = calculateHybridRelevanceScore(a, query);
      scoreB = calculateHybridRelevanceScore(b, query);
    } else {
      scoreA = calculateRelevanceScore(a, query);
      scoreB = calculateRelevanceScore(b, query);
    }
    
    return scoreB - scoreA;
  });
}

function sortByDueFirst(records: SearchRecord[], query: string, isMonetary: boolean = false): SearchRecord[] {
  return [...records].sort((a, b) => {
    // Get due date or fallback to updatedAt
    const getDueDate = (record: SearchRecord): Date => {
      if (isFinancialRecord(record) && record.dueDate) {
        return new Date(record.dueDate);
      }
      return new Date(record.updatedAt);
    };
    
    const dueDateA = getDueDate(a);
    const dueDateB = getDueDate(b);
    
    // Primary sort by due date (ascending - soonest first)
    if (dueDateA.getTime() !== dueDateB.getTime()) {
      return dueDateA.getTime() - dueDateB.getTime();
    }
    
    // Secondary sort by relevance as tiebreaker
    let scoreA: number;
    let scoreB: number;
    
    const isBoolean = isBooleanQuery(query);
    const parsedQuery = isBoolean ? parseBooleanQuery(query) : null;
    
    if (isBoolean && parsedQuery) {
      scoreA = calculateBooleanRelevanceScore(a, parsedQuery);
      scoreB = calculateBooleanRelevanceScore(b, parsedQuery);
    } else if (isMonetary) {
      scoreA = calculateMonetaryRelevanceScore(a, query);
      scoreB = calculateMonetaryRelevanceScore(b, query);
    } else if (hasMonetaryPotential(query)) {
      scoreA = calculateHybridRelevanceScore(a, query);
      scoreB = calculateHybridRelevanceScore(b, query);
    } else {
      scoreA = calculateRelevanceScore(a, query);
      scoreB = calculateRelevanceScore(b, query);
    }
    
    return scoreB - scoreA;
  });
}

function sortByDueLast(records: SearchRecord[], query: string, isMonetary: boolean = false): SearchRecord[] {
  return [...records].sort((a, b) => {
    // Get due date or fallback to updatedAt
    const getDueDate = (record: SearchRecord): Date => {
      if (isFinancialRecord(record) && record.dueDate) {
        return new Date(record.dueDate);
      }
      return new Date(record.updatedAt);
    };
    
    const dueDateA = getDueDate(a);
    const dueDateB = getDueDate(b);
    
    // Primary sort by due date (descending - latest first)
    if (dueDateA.getTime() !== dueDateB.getTime()) {
      return dueDateB.getTime() - dueDateA.getTime();
    }
    
    // Secondary sort by relevance as tiebreaker
    let scoreA: number;
    let scoreB: number;
    
    const isBoolean = isBooleanQuery(query);
    const parsedQuery = isBoolean ? parseBooleanQuery(query) : null;
    
    if (isBoolean && parsedQuery) {
      scoreA = calculateBooleanRelevanceScore(a, parsedQuery);
      scoreB = calculateBooleanRelevanceScore(b, parsedQuery);
    } else if (isMonetary) {
      scoreA = calculateMonetaryRelevanceScore(a, query);
      scoreB = calculateMonetaryRelevanceScore(b, query);
    } else if (hasMonetaryPotential(query)) {
      scoreA = calculateHybridRelevanceScore(a, query);
      scoreB = calculateHybridRelevanceScore(b, query);
    } else {
      scoreA = calculateRelevanceScore(a, query);
      scoreB = calculateRelevanceScore(b, query);
    }
    
    return scoreB - scoreA;
  });
}

async function filterRecords({ query, selections, isMonetarySearch }: SearchOptions): Promise<SearchRecord[]> {
  console.log('🔍 filterRecords called with:', {
    query,
    selections: Object.keys(selections || {}),
    isMonetarySearch
  });
  
  const { isMonetary, searchQuery } = parseMonetaryQuery(query);
  
  const corpus = await loadCorpus();
  
  // First, check for Buildertrend matches (exact trigger query matches)
  const buildertrendMatches: SearchRecord[] = [];
  const otherMatches: SearchRecord[] = [];
  
  console.log('🔍 Starting search for:', searchQuery, 'with corpus size:', corpus.length);
  console.log('🔍 Original query:', query);
  console.log('🔍 Is monetary:', isMonetary);
  
  // Check if this is a boolean query
  const isBoolean = isBooleanQuery(searchQuery);
  const parsedQuery = isBoolean ? parseBooleanQuery(searchQuery) : null;
  
  console.log('🔍 Is boolean query:', isBoolean);
  if (isBoolean && parsedQuery) {
    console.log('🔍 Parsed boolean query:', JSON.stringify(parsedQuery, null, 2));
  }
  
  corpus.forEach((record, index) => {
    let matchesQueryResult: boolean;
    
    // Check for Buildertrend trigger query matches first
    if (isBuildertrendRecord(record)) {
      console.log(`Checking Buildertrend record ${index}:`, record.title, 'triggerQueries:', record.triggerQueries);
      matchesQueryResult = record.triggerQueries.some(triggerQuery => {
        const match = triggerQuery.toLowerCase() === searchQuery.toLowerCase();
        if (match) {
          console.log('Found exact match:', triggerQuery, '===', searchQuery);
        }
        return match;
      });
      if (matchesQueryResult) {
        console.log('Buildertrend match found:', record.title, 'for query:', searchQuery);
        buildertrendMatches.push(record);
      }
      return; // Always skip regular matching for Buildertrend records
    }
    
    // Determine which matching logic to use
    if (isBoolean && parsedQuery) {
      // Boolean search
      matchesQueryResult = matchesBooleanQuery(record, parsedQuery);
    } else if (isMonetary) {
      // Explicit monetary search (query starts with $)
      matchesQueryResult = matchesMonetaryQuery(record, searchQuery);
    } else if (hasMonetaryPotential(searchQuery)) {
      // Hybrid search for queries with numeric potential (like "123")
      matchesQueryResult = matchesHybridQuery(record, searchQuery);
    } else {
      // Regular text search for non-numeric queries
      matchesQueryResult = matchesQuery(record, searchQuery);
    }
    
    if (matchesQueryResult && matchesSelections(record, selections)) {
      otherMatches.push(record);
    }
  });
  
  // Sort other matches by relevance (default sorting)
  const sortedOtherMatches = searchQuery.trim() ? sortByRelevance(otherMatches, searchQuery, isMonetary) : sortByRecency(otherMatches);
  
  console.log('Search results for "' + searchQuery + '":', {
    buildertrendMatches: buildertrendMatches.length,
    otherMatches: sortedOtherMatches.length,
    total: buildertrendMatches.length + sortedOtherMatches.length,
    isBoolean: isBoolean
  });
  
  // Return Buildertrend matches first, then other matches
  return [...buildertrendMatches, ...sortedOtherMatches];
}

function determineGroupEntityType(records: SearchRecord[]): SearchEntityType {
  if (records.length === 0) {
    return 'Document';
  }
  
  // If all records have the same entity type, use that
  const firstType = records[0].entityType;
  if (records.every(record => record.entityType === firstType)) {
    return firstType;
  }
  
  // If records are mixed types, use the most common type
  const typeCounts = new Map<SearchEntityType, number>();
  records.forEach(record => {
    typeCounts.set(record.entityType, (typeCounts.get(record.entityType) || 0) + 1);
  });
  
  let mostCommonType: SearchEntityType = 'Document';
  let maxCount = 0;
  
  for (const [type, count] of typeCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonType = type;
    }
  }
  
  return mostCommonType;
}

function buildGroups(records: SearchRecord[], groupBy?: string): SearchGroup[] {
  if (!groupBy || groupBy === 'None') {
    // When not grouping, create separate groups for each entity type
    // This allows us to apply individual limits to each type
    const typeGroups = new Map<SearchEntityType, SearchRecord[]>();
    
    records.forEach((record) => {
      if (!typeGroups.has(record.entityType)) {
        typeGroups.set(record.entityType, []);
      }
      typeGroups.get(record.entityType)!.push(record);
    });
    
    // Convert to SearchGroup array, sorted by entity type
    return Array.from(typeGroups.entries())
      .sort((a, b) => {
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
      })
      .map(([entityType, items]) => ({
        entityType,
        items,
        groupTitle: entityType,
      }));
  }

  const map = new Map<string, SearchRecord[]>();

  records.forEach((record) => {
    let groupKey: string;
    
    switch (groupBy) {
      case 'Type':
        groupKey = record.entityType;
        break;
      case 'Project':
        groupKey = record.project || 'No Project';
        break;
      case 'Status':
        groupKey = record.status || 'No Status';
        break;
      case 'Client':
        groupKey = record.client || 'No Client';
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
  const sortedEntries = Array.from(map.entries()).sort((a, b) => {
    // Handle "No X" groups by putting them at the end
    const aIsEmpty = a[0].startsWith('No ');
    const bIsEmpty = b[0].startsWith('No ');
    
    if (aIsEmpty && !bIsEmpty) return 1;
    if (!aIsEmpty && bIsEmpty) return -1;
    
    if (groupBy === 'Type') {
      const orderA = GROUP_ORDER.indexOf(a[0] as SearchEntityType);
      const orderB = GROUP_ORDER.indexOf(b[0] as SearchEntityType);
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
    entityType: groupBy === 'Type' ? groupKey as SearchEntityType : determineGroupEntityType(items),
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

/**
 * Generate a normally distributed random number using Box-Muller transform
 * @param mean - The mean of the distribution
 * @param variance - The variance of the distribution
 * @returns A random number from the normal distribution
 */
function generateNormalRandom(mean: number, variance: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Convert to our desired mean and variance
  return mean + z0 * Math.sqrt(variance);
}

export async function runSearch(
  options: SearchOptions,
  overrides?: {
    delayMs?: number;
    groupLimits?: Record<string, number>;
  },
): Promise<SearchResponse> {
  console.log('🚀 runSearch called with options:', {
    query: options.query,
    selections: Object.keys(options.selections || {}),
    isMonetarySearch: options.isMonetarySearch
  });
  
  const settings = settingsStore.getState();
  const meanDelay = overrides?.delayMs ?? settings.searchDelayMs;
  const variance = settings.searchDelayVarianceMs;
  const groupLimits = overrides?.groupLimits ?? settings.groupLimits;

  const { isMonetary } = parseMonetaryQuery(options.query);
  const searchOptions = { ...options, isMonetarySearch: isMonetary };
  
  const records = await filterRecords(searchOptions);
  console.log('📊 filterRecords returned', records.length, 'records');
  
  const facets = computeFacets(records);
  console.log('🎯 computeFacets returned facets for keys:', Object.keys(facets));
  
  // Determine grouping option from selections
  const groupBy = options.selections?.groupBy?.values().next().value;
  const isGrouped = groupBy && groupBy !== 'None';
  
  const fullGroups = buildGroups(records, groupBy);
  const limitedGroups = applyGroupLimits(fullGroups, groupLimits);

  // Generate random delay using normal distribution
  const randomDelay = generateNormalRandom(meanDelay, variance);
  // Ensure delay is non-negative and reduce for short queries
  const effectiveDelay = Math.max(0, options.query.trim().length < 3 ? Math.min(randomDelay, 50) : randomDelay);
  await wait(effectiveDelay);

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

export async function getCorpus(): Promise<SearchRecord[]> {
  const corpus = await loadCorpus();
  return [...corpus];
}

/**
 * Get relationships for a specific entity
 */
export async function getEntityRelationships(
  entityId: string, 
  options?: {
    type?: string;
    confidence?: string;
    includeInferred?: boolean;
  }
): Promise<Relationship[]> {
  await loadCorpus();
  if (!RELATIONSHIP_ENGINE) {
    return [];
  }
  
  return RELATIONSHIP_ENGINE.getRelationships(entityId, {
    type: options?.type as any,
    confidence: options?.confidence as any,
    includeInferred: options?.includeInferred
  });
}

/**
 * Get smart actions for a specific entity
 */
export async function getEntitySmartActions(
  entity: SearchRecord,
  includeInferred: boolean = true
): Promise<SmartAction[]> {
  await loadCorpus();
  if (!RELATIONSHIP_ENGINE) {
    return [];
  }
  
  return RELATIONSHIP_ENGINE.getSmartActions(entity, includeInferred);
}

/**
 * Get related entities for a specific entity
 */
export async function getRelatedEntities(
  entityId: string,
  options?: {
    type?: string;
    confidence?: string;
    includeInferred?: boolean;
    limit?: number;
  }
): Promise<SearchRecord[]> {
  await loadCorpus();
  if (!RELATIONSHIP_ENGINE) {
    return [];
  }
  
  return RELATIONSHIP_ENGINE.getRelatedEntities(entityId, {
    type: options?.type as any,
    confidence: options?.confidence as any,
    includeInferred: options?.includeInferred,
    limit: options?.limit
  });
}

/**
 * Get relationship engine statistics
 */
export async function getRelationshipStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  byConfidence: Record<string, number>;
}> {
  await loadCorpus();
  if (!RELATIONSHIP_ENGINE) {
    return { total: 0, byType: {}, byConfidence: {} };
  }
  
  return RELATIONSHIP_ENGINE.getStats();
}
