import { SearchRecord, isFinancialRecord, isOrganizationRecord, isPersonRecord } from '../types';
import { hasMonetaryValue } from './monetary';

// Memoization cache for highlighting functions
const highlightCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000; // Prevent memory leaks

// Cache key generator for highlighting functions
function getCacheKey(text: string, query: string, type: string): string {
  return `${type}:${text.length}:${query}:${text.substring(0, 50)}`;
}

// Cache management
function setCache(key: string, value: string): void {
  if (highlightCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (simple LRU approximation)
    const firstKey = highlightCache.keys().next().value;
    highlightCache.delete(firstKey);
  }
  highlightCache.set(key, value);
}

function getCache(key: string): string | undefined {
  return highlightCache.get(key);
}

// Clear cache when search context changes significantly
export function clearHighlightCache(): void {
  highlightCache.clear();
}

// Get cache statistics for debugging
export function getHighlightCacheStats(): { size: number; maxSize: number } {
  return {
    size: highlightCache.size,
    maxSize: MAX_CACHE_SIZE
  };
}

export interface HighlightMatch {
  field: string;
  content: string;
  highlightedContent: string;
}

/**
 * Highlights matching text in a string with yellow background
 * Optimized with memoization for better performance
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) {
    return escapeHtml(text);
  }

  // Check cache first
  const cacheKey = getCacheKey(text, query, 'text');
  const cached = getCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Check if this is a boolean query and extract search terms
  const tokens = extractSearchTermsFromQuery(query);
  if (tokens.length === 0) {
    const result = escapeHtml(text);
    setCache(cacheKey, result);
    return result;
  }

  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();

  // Sort tokens by length (longest first) to avoid partial highlighting
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    if (!textLower.includes(token)) {
      continue;
    }

    // Create a case-insensitive regex that preserves original case
    const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // Cache the result
  setCache(cacheKey, highlightedText);
  return highlightedText;
}

/**
 * Extracts search terms from a query, filtering out boolean operators
 */
function extractSearchTermsFromQuery(query: string): string[] {
  // Check if this is a boolean query
  if (isBooleanQuery(query)) {
    return extractTermsFromBooleanQuery(query);
  }
  
  // For simple queries, return all tokens
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Checks if a query contains boolean operators
 */
function isBooleanQuery(query: string): boolean {
  const trimmed = query.trim();
  return /\s+(AND|OR|NOT)\s+/.test(trimmed);
}

/**
 * Extracts search terms from a boolean query, excluding operators
 */
function extractTermsFromBooleanQuery(query: string): string[] {
  const trimmed = query.trim();
  const terms: string[] = [];
  
  // Split by boolean operators and extract terms
  const parts = trimmed.split(/\s+(AND|OR|NOT)\s+/);
  
  for (const part of parts) {
    // Skip boolean operators
    if (part === 'AND' || part === 'OR' || part === 'NOT') {
      continue;
    }
    
    // Extract individual terms from each part
    const partTerms = part.toLowerCase().split(/\s+/).filter(Boolean);
    terms.push(...partTerms);
  }
  
  return terms;
}

/**
 * Hybrid highlighting for boolean queries that handles both text and monetary terms
 * Uses the same position tracking approach to prevent double highlighting
 */
function highlightHybridBoolean(text: string, query: string, tokens: string[]): string {
  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();
  
  // Track which character positions have been highlighted to prevent overlaps
  const highlightedPositions = new Set<number>();
  
  // Helper function to check if a position range is already highlighted
  const isPositionHighlighted = (start: number, end: number): boolean => {
    for (let i = start; i < end; i++) {
      if (highlightedPositions.has(i)) {
        return true;
      }
    }
    return false;
  };
  
  // Helper function to mark positions as highlighted
  const markPositionsHighlighted = (start: number, end: number): void => {
    for (let i = start; i < end; i++) {
      highlightedPositions.add(i);
    }
  };
  
  // Helper function to apply highlighting with position tracking
  const applyHighlighting = (pattern: RegExp, className: string): void => {
    let match;
    const matches: Array<{ match: string; start: number; end: number }> = [];
    
    // First, collect all matches and their positions
    while ((match = pattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Only add if not already highlighted
      if (!isPositionHighlighted(start, end)) {
        matches.push({ match: match[0], start, end });
      }
    }
    
    // Apply highlighting in reverse order to maintain positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = matches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="${className}">${matchText}</mark>`;
      
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  };
  
  // Process each token to determine if it should be highlighted as text or monetary
  for (const token of tokens) {
    // Check if this token is a monetary query (starts with $)
    if (token.startsWith('$')) {
      const amountPart = token.slice(1).trim();
      // Try monetary highlighting for this token by creating a monetary query
      const monetaryQuery = `$${amountPart}`;
      const { amounts, textTokens, range } = extractMonetaryTokens(monetaryQuery);
      
      if (amounts.length > 0 || textTokens.length > 0 || range) {
        // Use the same position tracking approach for monetary highlighting
        const originalQuery = monetaryQuery.replace(/[$\s]/g, '');
        const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
        
        if (commaPatternMatch) {
          const [, integerPart, decimalPart] = commaPatternMatch;
          const prefixPattern = `${integerPart}${decimalPart}`;
          
          const prefixPatternRegex = new RegExp(
            `(\\$\\b${escapeRegex(prefixPattern)}\\d*\\b|\\$\\b${escapeRegex(prefixPattern.slice(0, -2))},${escapeRegex(prefixPattern.slice(-2))}\\d*\\b)`,
            'g'
          );
          
          applyHighlighting(prefixPatternRegex, 'monetary-highlight-partial');
          continue;
        }
        
        // Handle exact matches
        for (const amount of amounts) {
          const amountStr = amount.toString();
          const amountWithCommas = amount.toLocaleString();
          
          const monetaryPattern = new RegExp(
            `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
            'g'
          );
          applyHighlighting(monetaryPattern, 'monetary-highlight-exact');
        }
        continue;
      }
    }
    
    // Check if this token has monetary potential
    if (hasMonetaryValue(token)) {
      // Try monetary highlighting first by creating a monetary query
      const monetaryQuery = `$${token}`;
      const { amounts, textTokens, range } = extractMonetaryTokens(monetaryQuery);
      
      if (amounts.length > 0 || textTokens.length > 0 || range) {
        // Use the same position tracking approach for monetary highlighting
        for (const amount of amounts) {
          const amountStr = amount.toString();
          const amountWithCommas = amount.toLocaleString();
          
          const pattern = new RegExp(
            `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
            'g'
          );
          applyHighlighting(pattern, 'monetary-highlight-exact');
        }
        continue;
      }
    }
    
    // If no monetary highlighting worked, try text highlighting
    if (textLower.includes(token)) {
      const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
      applyHighlighting(regex, 'search-highlight');
    }
  }
  
  return highlightedText;
}

/**
 * Finds the best matching field and content for a search record
 */
export function findBestMatch(record: SearchRecord, query: string): HighlightMatch | null {
  if (!query.trim()) {
    return null;
  }

  const tokens = extractSearchTermsFromQuery(query);
  if (tokens.length === 0) {
    return null;
  }

  // Define searchable fields with their content
  const searchableFields: Array<{ field: string; content: string }> = [
    { field: 'title', content: record.title },
    { field: 'summary', content: record.summary },
    { field: 'project', content: record.project },
    { field: 'client', content: record.client },
    { field: 'status', content: record.status },
    { field: 'tags', content: record.tags.join(' ') },
  ];

  // Add document-specific fields
  if (record.entityType === 'Document') {
    const docRecord = record as any;
    if (docRecord.documentType) {
      searchableFields.push({ field: 'documentType', content: docRecord.documentType });
    }
    if (docRecord.author) {
      searchableFields.push({ field: 'author', content: docRecord.author });
    }
  }

  if (isPersonRecord(record)) {
    searchableFields.push(
      { field: 'personType', content: record.personType },
      { field: 'jobTitle', content: record.jobTitle },
      { field: 'organization', content: record.associatedOrganization ?? '' },
      { field: 'email', content: record.email },
      { field: 'phone', content: record.phone },
      { field: 'location', content: record.location },
      { field: 'tradeFocus', content: record.tradeFocus ?? '' },
    );
  } else if (isOrganizationRecord(record)) {
    searchableFields.push(
      { field: 'organizationType', content: record.organizationType },
      { field: 'tradeFocus', content: record.tradeFocus },
      { field: 'serviceArea', content: record.serviceArea },
      { field: 'primaryContact', content: record.primaryContact },
      { field: 'phone', content: record.phone },
      { field: 'email', content: record.email },
      { field: 'website', content: record.website ?? '' },
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

  // Add metadata fields
  Object.entries(record.metadata || {}).forEach(([key, value]) => {
    if (value != null) {
      searchableFields.push({ field: `metadata_${key}`, content: String(value) });
    }
  });

  // Find the field with the most token matches
  let bestMatch: HighlightMatch | null = null;
  let bestScore = 0;

  for (const { field, content } of searchableFields) {
    if (!content) continue;

    const contentLower = content.toLowerCase();
    const matchingTokens = tokens.filter(token => contentLower.includes(token));
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

/**
 * Gets a context snippet from the best matching field
 */
export function getContextSnippet(match: HighlightMatch, maxLength: number = 100, query?: string): string {
  if (!match) return '';

  const content = match.content;
  if (content.length <= maxLength) {
    return match.highlightedContent;
  }

  // Try to find a good snippet around the first match
  const tokens = content.toLowerCase().split(/\s+/);
  const queryTokens = query ? query.toLowerCase().split(/\s+/) : [];
  
  // Find the first token that matches any query token
  let startIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (queryTokens.some(qt => tokens[i].includes(qt))) {
      startIndex = Math.max(0, i - 2); // Start 2 words before the match
      break;
    }
  }

  const words = content.split(/\s+/);
  const snippet = words.slice(startIndex, startIndex + Math.ceil(maxLength / 8)).join(' ');
  
  if (snippet.length < content.length) {
    return highlightText(snippet + '...', query || '');
  }
  
  return match.highlightedContent;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Hybrid highlighting that combines regular text highlighting with monetary value highlighting
 * This is used for queries that have both text and monetary potential (like "123")
 */
export function highlightHybrid(text: string, query: string): string {
  if (!query.trim()) {
    return escapeHtml(text);
  }

  // Start with escaped HTML
  let highlightedText = escapeHtml(text);
  const textLower = text.toLowerCase();
  const tokens = extractSearchTermsFromQuery(query);
  
  // Apply regular text highlighting (yellow) first
  if (tokens.length > 0) {
    const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
    
    for (const token of sortedTokens) {
      if (!textLower.includes(token)) {
        continue;
      }
      
      // Create a case-insensitive regex that preserves original case
      const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
  }
  
  // Then apply monetary highlighting (green) on top
  // This will highlight monetary values even if they weren't caught by text highlighting
  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length > 0 || textTokens.length > 0 || range) {
    // Apply monetary highlighting logic directly to avoid double-escaping
    if (amounts.length > 0) {
      // For explicit monetary searches (queries starting with $), be more restrictive
      const isExplicitMonetary = query.trim().startsWith('$');
      
      for (const amount of amounts) {
        const amountStr = amount.toString();
        const amountWithCommas = amount.toLocaleString();
        
        if (isExplicitMonetary) {
          // For explicit monetary searches, only highlight values that are clearly monetary
          const monetaryPattern = new RegExp(
            `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
            'g'
          );
          
          highlightedText = highlightedText.replace(monetaryPattern, '<mark class="monetary-highlight">$1</mark>');
        } else {
          // For non-explicit monetary searches, use the original broader pattern
          const pattern = new RegExp(
            `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
            'g'
          );
          
          highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$1</mark>');
        }
      }
    }
    
    // Handle range highlighting
    if (range) {
      const rangePatterns = [
        new RegExp(`\\b${escapeRegex(range.min.toString())}\\s*-\\s*${escapeRegex(range.max.toString())}\\b`, 'g'),
        new RegExp(`\\b${escapeRegex(range.min.toString())}\\s+to\\s+${escapeRegex(range.max.toString())}\\b`, 'gi'),
        new RegExp(`\\b${escapeRegex(range.min.toString())}\\b`, 'g'),
        new RegExp(`\\b${escapeRegex(range.max.toString())}\\b`, 'g'),
      ];
      
      for (const pattern of rangePatterns) {
        highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$&</mark>');
      }
    }
    
    // Handle text tokens
    if (textTokens.length > 0) {
      for (const token of textTokens) {
        const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="monetary-highlight">$1</mark>');
      }
    }
  }
  
  return highlightedText;
}

/**
 * Highlights matching numeric values in monetary search mode with light green background
 */
export function highlightMonetaryValues(text: string, query: string): string {
  if (!query.trim()) {
    return escapeHtml(text);
  }

  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    return escapeHtml(text);
  }

  let highlightedText = escapeHtml(text);
  
  // For explicit monetary searches (queries starting with $), be more restrictive
  const isExplicitMonetary = query.trim().startsWith('$');
  
  // Highlight numeric values that match the query amounts
  if (amounts.length > 0) {
    for (const amount of amounts) {
      // Create a single comprehensive pattern that matches the amount in various formats
      // This avoids double highlighting by using a single replacement
      const amountStr = amount.toString();
      const amountWithCommas = amount.toLocaleString();
      
      if (isExplicitMonetary) {
        // For explicit monetary searches, only highlight values that are clearly monetary
        // Look for patterns that indicate monetary values: $X, $X,XXX, $X.XX, etc.
        const monetaryPattern = new RegExp(
          `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
          'g'
        );
        
        highlightedText = highlightedText.replace(monetaryPattern, '<mark class="monetary-highlight">$1</mark>');
      } else {
        // For non-explicit monetary searches, use the original broader pattern
        const pattern = new RegExp(
          `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
          'g'
        );
        
        highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$1</mark>');
      }
    }
    
    // Special handling for comma pattern matches (like "$5,06")
    // Check if the original query has comma patterns that should match prefix values
    const originalQuery = query.replace(/[$\s]/g, '');
    const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
    if (commaPatternMatch) {
      const [, integerPart, decimalPart] = commaPatternMatch;
      const prefixPattern = `${integerPart}${decimalPart}`; // "506" for "$5,06"
      
      // Highlight monetary values that start with this prefix pattern
      // Account for comma thousands separators in formatted currency (e.g., "$5,068")
      // For "506", we want to match both "$5068" and "$5,068"
      const prefixPatternRegex = new RegExp(
        `(\\$\\b${escapeRegex(prefixPattern)}\\d*\\b|\\$\\b${escapeRegex(prefixPattern.slice(0, -2))},${escapeRegex(prefixPattern.slice(-2))}\\d*\\b)`,
        'g'
      );
      
      highlightedText = highlightedText.replace(prefixPatternRegex, (match) => {
        // Skip if already highlighted to prevent double wrapping
        if (match.includes('<mark')) {
          return match;
        }
        return `<mark class="monetary-highlight">${match}</mark>`;
      });
    }
    
    if (!isExplicitMonetary) {
      // Additionally, handle partial matches for monetary values (only for non-explicit searches)
      // This handles cases like searching for "127" and highlighting "$1,275"
      const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
      highlightedText = highlightedText.replace(monetaryValuePattern, (match) => {
        // Only process if not already highlighted
        if (match.includes('<mark')) {
          return match;
        }
        
        // Extract the numeric value from the match
        const numericValue = parseFloat(match.replace(/[$,\s]/g, ''));
        
        // Check if any query amount is a partial match of this value
        for (const queryAmount of amounts) {
          if (isPartialMonetaryMatch(queryAmount, numericValue)) {
            return `<mark class="monetary-highlight">${match}</mark>`;
          }
        }
        
        return match;
      });
    }
  }
  
  // Highlight range values if it's a range query
  if (range) {
    // First, highlight the range pattern itself in the text
    const rangePatterns = [
      // Range format: min-max
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s*-\\s*${escapeRegex(range.max.toString())}\\b`, 'g'),
      // Range format: min to max
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s+to\\s+${escapeRegex(range.max.toString())}\\b`, 'gi'),
      // Individual range values
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\b`, 'g'),
      new RegExp(`\\b${escapeRegex(range.max.toString())}\\b`, 'g'),
    ];
    
    for (const pattern of rangePatterns) {
      highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$&</mark>');
    }
    
    // Additionally, highlight any monetary values in the text that fall within the range
    // This handles cases where the displayed value (like $31,344) falls within the range ($30000-40000)
    const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
    highlightedText = highlightedText.replace(monetaryValuePattern, (match) => {
      // Extract the numeric value from the match
      const numericValue = parseFloat(match.replace(/[$,\s]/g, ''));
      
      // Check if this value falls within the range
      if (!isNaN(numericValue) && numericValue >= range.min && numericValue <= range.max) {
        // Only highlight if it's not already highlighted
        if (!match.includes('<mark')) {
          return `<mark class="monetary-highlight">${match}</mark>`;
        }
      }
      
      return match;
    });
  }
  
  // Also highlight any text tokens that match
  if (textTokens.length > 0) {
    for (const token of textTokens) {
      const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="monetary-highlight">$1</mark>');
    }
  }
  
  return highlightedText;
}

/**
 * Extracts monetary tokens from a query using the improved monetary parsing
 */
function extractMonetaryTokens(query: string): { amounts: number[]; textTokens: string[]; range: { min: number; max: number } | null } {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
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

/**
 * Parses currency string to extract numeric value using improved parsing logic
 */
function parseCurrencyString(amountStr: string): number | null {
  // Remove currency symbols and whitespace, but handle commas carefully
  let cleaned = amountStr.replace(/[$\s]/g, '');
  
  // Handle empty or invalid strings
  if (!cleaned || cleaned === '') {
    return null;
  }
  
  // Handle range queries (e.g., "100-200", "100 to 200")
  if (cleaned.includes('-') || cleaned.toLowerCase().includes(' to ')) {
    return null; // Will be handled separately
  }
  
  // Remove commas as thousands separators (like "1,234.56")
  // For US/Canadian/Australian/New Zealand users, commas are only thousands separators
  cleaned = cleaned.replace(/,/g, '');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parses range query from string
 */
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

/**
 * Escapes regex special characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a query amount is a partial match of a data value
 * This handles cases like searching for "$55,13" and matching "$551.32"
 */
function isPartialMonetaryMatch(queryAmount: number, dataValue: number): boolean {
  // Convert both to strings for comparison
  const queryStr = queryAmount.toString();
  const dataStr = dataValue.toString();
  
  // Check for exact match first
  if (queryStr === dataStr) {
    return true;
  }
  
  // Check if the query amount appears at the start of the data value
  // This handles cases like 55.13 matching 55.13, 55.130, 55.1300, etc.
  if (dataStr.startsWith(queryStr)) {
    // Only allow prefix matching if the next character is a decimal point or zero
    if (dataStr.length > queryStr.length) {
      const nextChar = dataStr[queryStr.length];
      return nextChar === '.' || nextChar === '0';
    }
    return true; // Same length, already handled by exact match above
  }
  
  // Check if the query amount appears at the start when we remove trailing zeros
  // This handles cases like 55.13 matching 55.130, 55.1300, etc.
  const dataWithoutTrailingZeros = dataStr.replace(/0+$/, '');
  if (dataWithoutTrailingZeros.startsWith(queryStr)) {
    return true;
  }
  
  // Check for more sophisticated partial matches
  // Handle cases where the query is a prefix of the data value
  // For example: "55" should match "551.32" (but not "155.32")
  if (queryStr.length >= 2 && dataStr.length > queryStr.length) {
    // Check if the query appears at the start of the data value
    if (dataStr.startsWith(queryStr)) {
      // Additional validation: ensure the next character makes sense
      const nextChar = dataStr[queryStr.length];
      // Allow if next char is a digit (like 55 matching 551)
      if (/^\d$/.test(nextChar)) {
        return true;
      }
    }
  }
  
  // Special case: handle European decimal format queries
  // If query is like "55,13" (55.13) and data is "551.32", check if "55" matches "551"
  if (queryStr.includes('.')) {
    const queryIntegerPart = queryStr.split('.')[0];
    const dataIntegerPart = dataStr.split('.')[0];
    
    if (dataIntegerPart.startsWith(queryIntegerPart) && queryIntegerPart.length >= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Enhanced monetary highlighting that shows different colors for exact vs partial matches
 * This provides better UX by visually distinguishing match types
 * 
 * OPTIMIZED: Single-pass highlighting with memoization for better performance
 */
export function highlightMonetaryValuesWithPartialMatches(text: string, query: string): string {
  if (!query.trim()) {
    return escapeHtml(text);
  }

  // Check cache first - this is the most expensive highlighting function
  const cacheKey = getCacheKey(text, query, 'monetary');
  const cached = getCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Check if this is a boolean query and extract search terms
  const tokens = extractSearchTermsFromQuery(query);
  if (tokens.length === 0) {
    const result = escapeHtml(text);
    setCache(cacheKey, result);
    return result;
  }

  // For boolean queries, use hybrid highlighting (both text and monetary)
  if (isBooleanQuery(query)) {
    const result = highlightHybridBoolean(text, query, tokens);
    setCache(cacheKey, result);
    return result;
  }

  const { amounts, textTokens, range } = extractMonetaryTokens(query);
  
  if (amounts.length === 0 && textTokens.length === 0 && !range) {
    const result = escapeHtml(text);
    setCache(cacheKey, result);
    return result;
  }

  // NEW APPROACH: Single-pass highlighting with position tracking
  const result = highlightWithPositionTracking(text, query, amounts, textTokens, range);
  setCache(cacheKey, result);
  return result;
}

/**
 * Single-pass highlighting that tracks positions to prevent double highlighting
 */
function highlightWithPositionTracking(
  text: string, 
  query: string, 
  amounts: number[], 
  textTokens: string[], 
  range: { min: number; max: number } | null
): string {
  const isExplicitMonetary = query.trim().startsWith('$');
  let highlightedText = escapeHtml(text);
  
  // Track which character positions have been highlighted to prevent overlaps
  const highlightedPositions = new Set<number>();
  
  // Helper function to check if a position range is already highlighted
  const isPositionHighlighted = (start: number, end: number): boolean => {
    for (let i = start; i < end; i++) {
      if (highlightedPositions.has(i)) {
        return true;
      }
    }
    return false;
  };
  
  // Helper function to mark positions as highlighted
  const markPositionsHighlighted = (start: number, end: number): void => {
    for (let i = start; i < end; i++) {
      highlightedPositions.add(i);
    }
  };
  
  // Helper function to apply highlighting with position tracking
  const applyHighlighting = (pattern: RegExp, className: string): void => {
    let match;
    const matches: Array<{ match: string; start: number; end: number }> = [];
    
    // First, collect all matches and their positions
    while ((match = pattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Only add if not already highlighted
      if (!isPositionHighlighted(start, end)) {
        matches.push({ match: match[0], start, end });
      }
    }
    
    // Apply highlighting in reverse order to maintain positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = matches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="${className}">${matchText}</mark>`;
      
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  };
  
  // 1. Handle comma pattern matches first (highest priority)
  const originalQuery = query.replace(/[$\s]/g, '');
  const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
  if (commaPatternMatch) {
    const [, integerPart, decimalPart] = commaPatternMatch;
    const prefixPattern = `${integerPart}${decimalPart}`;
    
    const prefixPatternRegex = new RegExp(
      `(\\$\\b${escapeRegex(prefixPattern)}\\d*\\b|\\$\\b${escapeRegex(prefixPattern.slice(0, -2))},${escapeRegex(prefixPattern.slice(-2))}\\d*\\b)`,
      'g'
    );
    
    applyHighlighting(prefixPatternRegex, 'monetary-highlight-partial');
  }
  
  // 2. Handle exact matches (only if no comma pattern highlighting occurred)
  if (!commaPatternMatch) {
    for (const amount of amounts) {
      const amountStr = amount.toString();
      const amountWithCommas = amount.toLocaleString();
      
      if (isExplicitMonetary) {
        const monetaryPattern = new RegExp(
          `(\\$\\b${escapeRegex(amountWithCommas)}\\b|\\$\\b${escapeRegex(amountStr)}\\b)`,
          'g'
        );
        applyHighlighting(monetaryPattern, 'monetary-highlight-exact');
      } else {
        const pattern = new RegExp(
          `(\\$?\\b${escapeRegex(amountWithCommas)}\\b|\\$?\\b${escapeRegex(amountStr)}\\b)`,
          'g'
        );
        applyHighlighting(pattern, 'monetary-highlight-exact');
      }
    }
  }
  
  // 3. Handle partial matches (only if no exact matches were found)
  const hasExactMatches = highlightedText.includes('monetary-highlight-exact');
  const hasPartialMatches = highlightedText.includes('monetary-highlight-partial');
  const shouldDoPartialMatching = !isExplicitMonetary || (!hasExactMatches && !hasPartialMatches);
  
  if (shouldDoPartialMatching) {
    const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
    let match;
    const partialMatches: Array<{ match: string; start: number; end: number; numericValue: number }> = [];
    
    // Collect partial matches
    while ((match = monetaryValuePattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      if (!isPositionHighlighted(start, end)) {
        const numericValue = parseFloat(match[0].replace(/[$,\s]/g, ''));
        
        // Check if any query amount is a partial match of this value
        for (const queryAmount of amounts) {
          if (isPartialMonetaryMatch(queryAmount, numericValue)) {
            partialMatches.push({ match: match[0], start, end, numericValue });
            break;
          }
        }
      }
    }
    
    // Apply partial match highlighting in reverse order
    for (let i = partialMatches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = partialMatches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="monetary-highlight-partial">${matchText}</mark>`;
      
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  }
  
  // 4. Handle range highlighting
  if (range) {
    const rangePatterns = [
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s*-\\s*${escapeRegex(range.max.toString())}\\b`, 'g'),
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\s+to\\s+${escapeRegex(range.max.toString())}\\b`, 'gi'),
      new RegExp(`\\b${escapeRegex(range.min.toString())}\\b`, 'g'),
      new RegExp(`\\b${escapeRegex(range.max.toString())}\\b`, 'g'),
    ];
    
    for (const pattern of rangePatterns) {
      applyHighlighting(pattern, 'monetary-highlight-range');
    }
    
    // Additionally, highlight monetary values within range
    const monetaryValuePattern = /\$?[\d,]+(?:\.\d{2})?/g;
    let match;
    const rangeMatches: Array<{ match: string; start: number; end: number }> = [];
    
    while ((match = monetaryValuePattern.exec(highlightedText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      if (!isPositionHighlighted(start, end)) {
        const numericValue = parseFloat(match[0].replace(/[$,\s]/g, ''));
        
        if (!isNaN(numericValue) && numericValue >= range.min && numericValue <= range.max) {
          rangeMatches.push({ match: match[0], start, end });
        }
      }
    }
    
    // Apply range highlighting in reverse order
    for (let i = rangeMatches.length - 1; i >= 0; i--) {
      const { match: matchText, start, end } = rangeMatches[i];
      const before = highlightedText.substring(0, start);
      const after = highlightedText.substring(end);
      const highlighted = `<mark class="monetary-highlight-range">${matchText}</mark>`;
      
      highlightedText = before + highlighted + after;
      markPositionsHighlighted(start, start + highlighted.length);
    }
  }
  
  // 5. Handle text tokens
  for (const token of textTokens) {
    const regex = new RegExp(`(${escapeRegex(token)})`, 'gi');
    applyHighlighting(regex, 'monetary-highlight-text');
  }
  
  return highlightedText;
}
