import {
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
  isFinancialRecord,
  isOrganizationRecord,
  isPersonRecord,
} from '../types';
import { settingsStore } from '../state/settingsStore';

const GROUP_ORDER: SearchEntityType[] = [
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
  'groupBy',
];

// Load corpus from multiple files
let CORPUS: SearchRecord[] = [];

async function loadCorpus(): Promise<SearchRecord[]> {
  if (CORPUS.length > 0) {
    return CORPUS; // Return cached corpus if already loaded
  }

  try {
    // Load the index file to get metadata about the split files
    const indexResponse = await fetch('./corpus-parts/index.json');
    const indexData = await indexResponse.json();
    
    const allRecords: any[] = [];
    
    // Load each corpus part file
    for (const fileInfo of indexData.files) {
      const response = await fetch(`./corpus-parts/${fileInfo.filename}`);
      const partData = await response.json();
      allRecords.push(...partData);
    }
    
    CORPUS = allRecords.map((record) => normalizeRecord(record));
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

  if (isFinancialRecord(record)) {
    record.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
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
  const tokens = tokenize(query);
  // Check if query contains numeric tokens that could match monetary values
  return tokens.some(token => {
    // Match pure numbers, numbers with commas, currency symbols, or alphanumeric with numbers
    return /^\d+(,\d{3})*(\.\d+)?$/.test(token) || 
           /^\d+(\.\d+)?$/.test(token) ||
           /^\$?\d+(,\d{3})*(\.\d+)?$/.test(token) ||
           /\d/.test(token); // Any token containing a digit
  });
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
  // Convert to string and remove commas and currency symbols for consistent comparison
  const str = typeof value === 'string' ? value : value.toString();
  return str.replace(/[,$]/g, '');
}

function matchesMonetaryString(queryStr: string, dataValue: number): boolean {
  // Normalize both query and data value for comparison
  const normalizedQuery = normalizeForComparison(queryStr);
  const normalizedData = normalizeForComparison(dataValue.toString());
  
  // Check for exact string match (handles comma differences)
  if (normalizedQuery === normalizedData) {
    return true;
  }
  
  // UX Principle: The more explicit the user input, the more restrictive we should be
  // Analyze the specificity of the query to determine matching behavior
  
  const queryHasDecimal = queryStr.includes('.');
  const queryDigitsAfterDecimal = queryHasDecimal ? queryStr.split('.')[1]?.length || 0 : 0;
  const querySignificantDigits = normalizedQuery.length;
  
  // If user provided decimals (like $800.00), be very restrictive
  if (queryHasDecimal) {
    // For queries with explicit decimals, only match if:
    // 1. Exact match (already handled above)
    // 2. The data value starts with the same significant digits in the same positions
    //    and the precision doesn't conflict
    
    // Convert data value to same precision as query for comparison
    const dataAsDecimal = dataValue.toString();
    const dataHasDecimal = dataAsDecimal.includes('.');
    
      if (queryDigitsAfterDecimal > 0) {
        // User specified decimal places - be very precise
        const queryWithoutTrailingZeros = normalizedQuery.replace(/0+$/, '');
        const dataWithoutTrailingZeros = normalizedData.replace(/0+$/, '');
        
        // Only match if the significant digits align exactly
        // For decimal queries, be very restrictive - only exact matches or where data is a prefix of query
        return dataWithoutTrailingZeros === queryWithoutTrailingZeros ||
               (dataWithoutTrailingZeros.length <= queryWithoutTrailingZeros.replace(/\.$/, '').length && 
                queryWithoutTrailingZeros.replace(/\.$/, '').startsWith(dataWithoutTrailingZeros));
    } else {
      // User typed something like "$800." - match whole numbers starting with those digits
      return normalizedData.startsWith(normalizedQuery);
    }
  }
  
  // For queries without decimals, apply progressive restriction based on specificity
  if (querySignificantDigits >= 4) {
    // 4+ digits (like "8000") - very restrictive, must start with exact digits
    // For very long queries, be extremely restrictive - only allow exact matches or longer values that start with the query
    if (normalizedData.length >= querySignificantDigits) {
      return normalizedData.startsWith(normalizedQuery);
    } else {
      // Don't allow shorter values to match longer queries for 4+ digits
      // This prevents "6" from matching "696013456"
      return false;
    }
  } else if (querySignificantDigits >= 3) {
    // 3 digits (like "800") - restrictive, must start with same 3 digits
    if (normalizedData.length >= 3) {
      return normalizedData.startsWith(normalizedQuery);
    } else {
      return normalizedQuery.startsWith(normalizedData);
    }
  } else if (querySignificantDigits >= 2) {
    // 2 digits (like "80") - moderate restriction, must start with same 2 digits
    if (normalizedData.length >= 2) {
      return normalizedData.startsWith(normalizedQuery);
    } else {
      return normalizedQuery.startsWith(normalizedData);
    }
  } else {
    // 1 digit (like "8") - most restrictive, only exact first digit match
    // This is the "first digit" rule - only for single digit queries
    return normalizedData[0] === normalizedQuery[0];
  }
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
  // but still be more restrictive about what we match against
  if (textTokens.length > 0) {
    for (const lineItem of financialRecord.lineItems) {
      // Only match against line item titles and types, not descriptions or quantities
      const lineItemText = [
        lineItem.lineItemTitle,
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
    // but still be more restrictive about what we match against
    for (const lineItem of financialRecord.lineItems) {
      // Only match against line item titles and types, not descriptions or quantities
      const lineItemText = [
        lineItem.lineItemTitle,
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
    let scoreA: number;
    let scoreB: number;
    
    if (isMonetary) {
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

async function filterRecords({ query, selections, isMonetarySearch }: SearchOptions): Promise<SearchRecord[]> {
  const { isMonetary, searchQuery } = parseMonetaryQuery(query);
  
  const corpus = await loadCorpus();
  const filtered = corpus.filter((record) => {
    let matchesQueryResult: boolean;
    
    if (isMonetary) {
      // Explicit monetary search (query starts with $)
      matchesQueryResult = matchesMonetaryQuery(record, searchQuery);
    } else if (hasMonetaryPotential(searchQuery)) {
      // Hybrid search for queries with numeric potential (like "123")
      matchesQueryResult = matchesHybridQuery(record, searchQuery);
    } else {
      // Regular text search for non-numeric queries
      matchesQueryResult = matchesQuery(record, searchQuery);
    }
    
    return matchesQueryResult && matchesSelections(record, selections);
  });
  
  // Use relevance-based sorting for non-empty queries, recency for empty queries
  return searchQuery.trim() ? sortByRelevance(filtered, searchQuery, isMonetary) : sortByRecency(filtered);
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
  const sortedEntries = Array.from(map.entries()).sort((a, b) => {
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
  
  const records = await filterRecords(searchOptions);
  const facets = computeFacets(records);
  
  // Determine grouping option from selections
  const groupBy = options.selections?.groupBy?.values().next().value;
  const isGrouped = groupBy && groupBy !== 'None';
  
  const fullGroups = buildGroups(records, groupBy);
  const limitedGroups = applyGroupLimits(fullGroups, groupLimits);

  // Reduce delay for better responsiveness, especially for short queries
  const effectiveDelay = options.query.trim().length < 3 ? Math.min(delay, 50) : delay;
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
