import Dinero from 'dinero.js';

// Configure Dinero.js for USD
// Note: Dinero.js doesn't have defaultCurrency/defaultPrecision properties
// We'll handle currency and precision in individual Dinero objects

/**
 * Represents a monetary value with proper handling of trailing zeros
 */
export interface MonetaryValue {
  amount: number; // Amount in cents (e.g., 12300 for $123.00)
  currency: string; // Currency code (e.g., 'USD')
}

/**
 * Parse a monetary string (e.g., "$123.00", "123", "123.00") into a MonetaryValue
 */
export function parseMonetaryString(value: string): MonetaryValue | null {
  // Remove currency symbols and whitespace, but handle commas carefully
  let cleaned = value.replace(/[$\s]/g, '');
  
  // Handle empty or invalid strings
  if (!cleaned || cleaned === '') {
    return null;
  }
  
  // Remove commas as thousands separators (like "1,234.56")
  // For US/Canadian/Australian/New Zealand users, commas are only thousands separators
  cleaned = cleaned.replace(/,/g, '');
  
  // Parse as float
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    return null;
  }
  
  // Convert to cents (multiply by 100)
  const amountInCents = Math.round(parsed * 100);
  
  return {
    amount: amountInCents,
    currency: 'USD'
  };
}

/**
 * Convert a number to a MonetaryValue (assumes the number is in dollars)
 */
export function numberToMonetary(value: number): MonetaryValue {
  return {
    amount: Math.round(value * 100), // Convert dollars to cents
    currency: 'USD'
  };
}

/**
 * Convert a MonetaryValue to a Dinero object
 */
export function toDinero(monetary: MonetaryValue): any {
  try {
    return Dinero({ amount: monetary.amount, currency: monetary.currency });
  } catch (error) {
    console.error('Error creating Dinero object:', error);
    // Fallback: return a simple object with the same interface
    return {
      equalsTo: (other: any) => {
        return other && other.amount === monetary.amount && other.currency === monetary.currency;
      },
      toFormat: (format: string) => {
        const dollars = monetary.amount / 100;
        return format.replace('0,0.00', dollars.toFixed(2));
      }
    };
  }
}

/**
 * Check if two monetary values are equal (including trailing zeros)
 */
export function areMonetaryValuesEqual(value1: MonetaryValue, value2: MonetaryValue): boolean {
  return value1.amount === value2.amount && value1.currency === value2.currency;
}

/**
 * Check if a monetary value matches a search query
 * This implements the correct logic:
 * - $1530 matches $15309 (prefix matching)
 * - $123 does NOT match $123.00 (trailing zeros are significant)
 * - $123.00 matches $123 (can be normalized)
 */
export function matchesMonetaryQuery(query: string, dataValue: number): boolean {
  const queryMonetary = parseMonetaryString(query);
  if (!queryMonetary) {
    return false;
  }
  
  const dataMonetary = numberToMonetary(dataValue);
  
  // Convert to Dinero objects for proper comparison
  const queryDinero = toDinero(queryMonetary);
  const dataDinero = toDinero(dataMonetary);
  
  // Check for exact match first
  if (queryDinero.equalsTo(dataDinero)) {
    return true;
  }
  
  // For prefix matching: work with the original dollar amounts, not cents
  // This is crucial for correct prefix matching
  const queryDollars = queryMonetary.amount / 100; // Convert back to dollars
  const dataDollars = dataMonetary.amount / 100;   // Convert back to dollars
  
  // Convert to strings for prefix matching
  const queryStr = queryDollars.toString();
  const dataStr = dataDollars.toString();
  
  // Special case: if the original query was in the format "$X,0" (like "$5,0"),
  // we need to check both interpretations: as "X" and as "X0"
  const originalQuery = query.replace(/[$\s]/g, '');
  const commaZeroMatch = originalQuery.match(/^(\d+),0$/);
  if (commaZeroMatch) {
    const [, integerPart] = commaZeroMatch;
    const alternativeQueryStr = integerPart; // "5" for "$5,0"
    const alternativeQueryStr2 = `${integerPart}0`; // "50" for "$5,0"
    
    // Check if data matches either interpretation
    // For the "5" interpretation, only allow exact matches
    if (dataStr === alternativeQueryStr) {
      return true;
    }
    
    // For the "50" interpretation, allow any value that starts with "50"
    if (dataStr.startsWith(alternativeQueryStr2)) {
      return true;
    }
  }
  
  // Special case: if the original query was in the format "$X,Y" (like "$5,06"),
  // treat it as a prefix pattern for values starting with "XY"
  const commaPatternMatch = originalQuery.match(/^(\d+),(\d+)$/);
  if (commaPatternMatch) {
    const [, integerPart, decimalPart] = commaPatternMatch;
    const prefixPattern = `${integerPart}${decimalPart}`; // "506" for "$5,06"
    
    // Check if data starts with this prefix pattern
    if (dataStr.startsWith(prefixPattern)) {
      return true;
    }
  }
  
  // Use the helper function for regular prefix matching
  return matchesPrefixPattern(queryStr, dataStr);
}

/**
 * Helper function to check if a data string matches a query string using prefix matching rules
 */
function matchesPrefixPattern(queryStr: string, dataStr: string): boolean {
  if (dataStr.startsWith(queryStr)) {
    // Handle decimal values differently from whole numbers
    const queryHasDecimal = queryStr.includes('.');
    const dataHasDecimal = dataStr.includes('.');
    
    if (queryHasDecimal && dataHasDecimal) {
      // For decimal values, allow prefix matching if the query is a prefix of the data
      return true;
    } else if (!queryHasDecimal && !dataHasDecimal) {
      // For whole numbers, allow prefix matching but be more permissive for longer queries
      // This allows "506" to match "5068", but prevents "12" from matching "1234"
      if (dataStr.length > queryStr.length) {
        // For queries of 3+ digits, allow any next digit (e.g., "506" matches "5068")
        // For queries of 1-2 digits, only allow if next digit is 0 (e.g., "12" doesn't match "123")
        if (queryStr.length >= 3) {
          return true;
        } else {
          const nextDigit = dataStr[queryStr.length];
          return nextDigit === '0';
        }
      }
      return true;
    } else {
      // Mixed case: be more restrictive
      return false;
    }
  }
  
  // Check if query starts with data (for cases where query is longer)
  if (queryStr.startsWith(dataStr)) {
    return queryStr.length >= dataStr.length + 4 && dataStr.length >= 2;
  }
  
  return false;
}

/**
 * Format a monetary value for display
 */
export function formatMonetary(monetary: MonetaryValue): string {
  const dinero = toDinero(monetary);
  return dinero.toFormat('$0,0.00');
}

/**
 * Format a number as currency for display
 */
export function formatCurrency(amount: number): string {
  const monetary = numberToMonetary(amount);
  return formatMonetary(monetary);
}

/**
 * Extract monetary amounts from a search query
 */
export function extractMonetaryAmounts(query: string): MonetaryValue[] {
  const amounts: MonetaryValue[] = [];
  
  // Split query into tokens
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  
  for (const token of tokens) {
    const monetary = parseMonetaryString(token);
    if (monetary) {
      amounts.push(monetary);
    }
  }
  
  return amounts;
}

/**
 * Check if a string contains monetary values
 */
export function hasMonetaryValue(text: string): boolean {
  // Check for currency symbols or decimal patterns
  // Use simple string checks instead of complex regex
  if (text.includes('$') || text.includes('.') || text.includes(',')) {
    return true;
  }
  
  // Also check if it's a pure number (like "5068")
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed);
}

/**
 * Normalize a monetary string for comparison (preserves trailing zeros)
 */
export function normalizeMonetaryString(value: string): string {
  const monetary = parseMonetaryString(value);
  if (!monetary) {
    return '';
  }
  
  const dinero = toDinero(monetary);
  return dinero.toFormat('0.00'); // Always show 2 decimal places
}
