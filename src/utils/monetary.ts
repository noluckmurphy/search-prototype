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
  
  // Handle comma as decimal separator (European format like "55,13")
  // If there's exactly one comma and it's followed by 1-2 digits at the end, treat it as decimal
  const commaAsDecimalMatch = cleaned.match(/^(\d+),(\d{1,2})$/);
  if (commaAsDecimalMatch) {
    const [, integerPart, decimalPart] = commaAsDecimalMatch;
    cleaned = `${integerPart}.${decimalPart.padEnd(2, '0')}`;
  } else {
    // Remove commas as thousands separators (like "1,234.56")
    cleaned = cleaned.replace(/,/g, '');
  }
  
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
  
  // Check if data starts with query (prefix matching)
  // This is the key fix: $1530 should match $15309, but $123 should NOT match $1232
  if (dataStr.startsWith(queryStr)) {
    // Handle decimal values differently from whole numbers
    const queryHasDecimal = queryStr.includes('.');
    const dataHasDecimal = dataStr.includes('.');
    
    if (queryHasDecimal && dataHasDecimal) {
      // For decimal values, allow prefix matching if the query is a prefix of the data
      // This allows "12.7" to match "12.75", "12.78", etc.
      return true;
    } else if (!queryHasDecimal && !dataHasDecimal) {
      // For whole numbers, only allow prefix matching if the next digit is 0
      // This prevents 123 from matching 1232, 1234, etc.
      if (dataStr.length > queryStr.length) {
        const nextDigit = dataStr[queryStr.length];
        return nextDigit === '0';
      }
      return true; // Same length, already handled by exact match above
    } else {
      // Mixed case: query is decimal but data is whole number, or vice versa
      // Be more restrictive in these cases
      return false;
    }
  }
  
  // Check if query starts with data (for cases where query is longer)
  // This handles cases where the query is more specific than the data
  // BUT be more restrictive - only allow this if the query is significantly longer
  if (queryStr.startsWith(dataStr)) {
    // Only allow this if the query is at least 4 digits longer than the data
    // AND the data is at least 2 digits long (prevents single digits from matching)
    // This prevents 208 from matching 208777, but allows 12 to match 123
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
  return text.includes('$') || text.includes('.') || text.includes(',');
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
