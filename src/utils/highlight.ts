import { SearchRecord } from '../types';

export interface HighlightMatch {
  field: string;
  content: string;
  highlightedContent: string;
}

/**
 * Highlights matching text in a string with yellow background
 */
export function highlightText(text: string, query: string): string {
  if (!query.trim()) {
    return escapeHtml(text);
  }

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return escapeHtml(text);
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

  return highlightedText;
}

/**
 * Finds the best matching field and content for a search record
 */
export function findBestMatch(record: SearchRecord, query: string): HighlightMatch | null {
  if (!query.trim()) {
    return null;
  }

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
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

  // Add financial record fields
  if (record.entityType !== 'Document') {
    const financialRecord = record as any;
    if (financialRecord.lineItems) {
      financialRecord.lineItems.forEach((item: any, index: number) => {
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
  
  // Highlight numeric values that match the query amounts
  if (amounts.length > 0) {
    for (const amount of amounts) {
      // Create patterns to match the amount in various formats
      const patterns = [
        // Exact amount with optional commas and decimals
        new RegExp(`\\b${escapeRegex(amount.toString())}\\b`, 'g'),
        // Amount with commas (e.g., 1,234.56)
        new RegExp(`\\b${escapeRegex(amount.toLocaleString())}\\b`, 'g'),
        // Amount with currency symbol
        new RegExp(`\\$${escapeRegex(amount.toString())}\\b`, 'g'),
        new RegExp(`\\$${escapeRegex(amount.toLocaleString())}\\b`, 'g'),
      ];
      
      for (const pattern of patterns) {
        highlightedText = highlightedText.replace(pattern, '<mark class="monetary-highlight">$&</mark>');
      }
    }
  }
  
  // Highlight range values if it's a range query
  if (range) {
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
 * Extracts monetary tokens from a query (reused from searchService.ts logic)
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
 * Parses currency string to extract numeric value
 */
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
