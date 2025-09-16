/**
 * Unit tests for monetary search functionality
 * Tests monetary query parsing, matching, and scoring
 */

// Import the test framework
import { TestFramework } from '../test-framework.js';

// Mock monetary search utilities
class MockMonetarySearch {
  constructor() {
    this.testFinancialRecords = [
      {
        id: 'invoice-1',
        entityType: 'ClientInvoice',
        title: 'Invoice for Material',
        summary: 'Material invoice',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Outstanding',
        updatedAt: '2023-01-01T00:00:00.000Z',
        tags: ['material'],
        metadata: {},
        totalValue: 1500,
        issuedDate: '2023-01-01T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-1',
            lineItemTitle: 'Material A',
            lineItemDescription: 'High quality material',
            lineItemQuantity: 2,
            lineItemQuantityUnitOfMeasure: 'unit',
            lineItemUnitPrice: 750,
            lineItemTotal: 1500,
            lineItemType: 'Material'
          }
        ]
      },
      {
        id: 'invoice-2',
        entityType: 'ClientInvoice',
        title: 'Invoice for Labor',
        summary: 'Labor invoice',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Paid',
        updatedAt: '2023-01-02T00:00:00.000Z',
        tags: ['labor'],
        metadata: {},
        totalValue: 2500,
        issuedDate: '2023-01-02T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-2',
            lineItemTitle: 'Labor Hours',
            lineItemDescription: 'Professional labor',
            lineItemQuantity: 10,
            lineItemQuantityUnitOfMeasure: 'hr',
            lineItemUnitPrice: 250,
            lineItemTotal: 2500,
            lineItemType: 'Labor'
          }
        ]
      },
      {
        id: 'invoice-3',
        entityType: 'ClientInvoice',
        title: 'Large Invoice',
        summary: 'Large amount invoice',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Sent',
        updatedAt: '2023-01-03T00:00:00.000Z',
        tags: ['large'],
        metadata: {},
        totalValue: 50000,
        issuedDate: '2023-01-03T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-3',
            lineItemTitle: 'Expensive Item',
            lineItemDescription: 'Very expensive item',
            lineItemQuantity: 1,
            lineItemQuantityUnitOfMeasure: 'unit',
            lineItemUnitPrice: 50000,
            lineItemTotal: 50000,
            lineItemType: 'Material'
          }
        ]
      }
    ];
  }

  // Mock implementation of parseCurrencyString function
  parseCurrencyString(amountStr) {
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    
    if (cleaned.includes('-') || cleaned.toLowerCase().includes(' to ')) {
      return null;
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Mock implementation of parseRangeQuery function
  parseRangeQuery(query) {
    const rangePatterns = [
      /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)/i,
      /\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)/,
      /\$(\d+(?:\.\d+)?)\s+to\s+\$(\d+(?:\.\d+)?)/i,
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

  // Mock implementation of extractMonetaryTokens function
  extractMonetaryTokens(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const amounts = [];
    const textTokens = [];
    
    const range = this.parseRangeQuery(query);
    if (range) {
      return { amounts, textTokens, range };
    }
    
    for (const token of tokens) {
      const parsed = this.parseCurrencyString(token);
      if (parsed !== null) {
        amounts.push(parsed);
      } else {
        textTokens.push(token);
      }
    }
    
    return { amounts, textTokens, range: null };
  }

  // Mock implementation of isCloseMatch function
  isCloseMatch(value1, value2, tolerance = 0.01) {
    return Math.abs(value1 - value2) <= tolerance;
  }

  // Mock implementation of normalizeForComparison function
  normalizeForComparison(value) {
    const str = typeof value === 'string' ? value : value.toString();
    return str.replace(/[,$]/g, '');
  }

  // Mock implementation of matchesMonetaryString function (NEW RESTRICTIVE LOGIC)
  matchesMonetaryString(queryStr, dataValue) {
    const normalizedQuery = this.normalizeForComparison(queryStr);
    const normalizedData = this.normalizeForComparison(dataValue.toString());
    
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
      // Allow if data starts with query (for cases like "1500" matching "150")
      if (normalizedData.length >= querySignificantDigits) {
        return normalizedData.startsWith(normalizedQuery);
      } else {
        return normalizedQuery.startsWith(normalizedData);
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

  // Mock implementation of matchesMonetaryQuery function
  matchesMonetaryQuery(record, query) {
    const { amounts, textTokens, range } = this.extractMonetaryTokens(query);
    
    if (amounts.length === 0 && textTokens.length === 0 && !range) {
      return true;
    }

    if (record.entityType === 'Document') {
      return false;
    }

    const financialRecord = record;
    
    // Handle range queries
    if (range) {
      if (financialRecord.totalValue >= range.min && financialRecord.totalValue <= range.max) {
        return true;
      }

      for (const lineItem of financialRecord.lineItems) {
        if ((lineItem.lineItemTotal >= range.min && lineItem.lineItemTotal <= range.max) ||
            (lineItem.lineItemUnitPrice >= range.min && lineItem.lineItemUnitPrice <= range.max)) {
          return true;
        }
      }
    }
    
    // Check monetary amounts
    if (amounts.length > 0) {
      for (const queryAmount of amounts) {
        if (this.isCloseMatch(financialRecord.totalValue, queryAmount)) {
          return true;
        }

        for (const lineItem of financialRecord.lineItems) {
          if (this.isCloseMatch(lineItem.lineItemTotal, queryAmount) ||
              this.isCloseMatch(lineItem.lineItemUnitPrice, queryAmount) ||
              this.isCloseMatch(lineItem.lineItemQuantity, queryAmount)) {
            return true;
          }
        }
      }
    }

    // Check string-based matches
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      if (this.matchesMonetaryString(token, financialRecord.totalValue)) {
        return true;
      }

      for (const lineItem of financialRecord.lineItems) {
        if (this.matchesMonetaryString(token, lineItem.lineItemTotal) ||
            this.matchesMonetaryString(token, lineItem.lineItemUnitPrice) ||
            this.matchesMonetaryString(token, lineItem.lineItemQuantity)) {
          return true;
        }
      }
    }

    return false;
  }
}

// Create test framework instance
const test = new TestFramework();
const monetarySearch = new MockMonetarySearch();

// Test suite for monetary search functionality
test.describe('Monetary Search Unit Tests', () => {
  
  test.it('should parse currency strings correctly', () => {
    test.assertEqual(monetarySearch.parseCurrencyString('1500'), 1500, 'Should parse plain number');
    test.assertEqual(monetarySearch.parseCurrencyString('$1500'), 1500, 'Should parse with dollar sign');
    test.assertEqual(monetarySearch.parseCurrencyString('1,500'), 1500, 'Should parse with comma');
    test.assertEqual(monetarySearch.parseCurrencyString('$1,500'), 1500, 'Should parse with dollar sign and comma');
    test.assertEqual(monetarySearch.parseCurrencyString(' 1500.50 '), 1500.50, 'Should parse decimal and trim spaces');
    
    test.assertEqual(monetarySearch.parseCurrencyString('invalid'), null, 'Should return null for invalid input');
    test.assertEqual(monetarySearch.parseCurrencyString('100-200'), null, 'Should return null for range');
    test.assertEqual(monetarySearch.parseCurrencyString(''), null, 'Should return null for empty string');
  });

  test.it('should parse range queries correctly', () => {
    const range1 = monetarySearch.parseRangeQuery('100-200');
    test.assertNotEqual(range1, null, 'Should parse dash range');
    test.assertEqual(range1.min, 100, 'Should extract min value');
    test.assertEqual(range1.max, 200, 'Should extract max value');

    const range2 = monetarySearch.parseRangeQuery('$1000 to $2000');
    test.assertNotEqual(range2, null, 'Should parse "to" range with dollar signs');
    test.assertEqual(range2.min, 1000, 'Should extract min value');
    test.assertEqual(range2.max, 2000, 'Should extract max value');

    const range3 = monetarySearch.parseRangeQuery('500.50-750.75');
    test.assertNotEqual(range3, null, 'Should parse decimal range');
    test.assertEqual(range3.min, 500.50, 'Should extract decimal min');
    test.assertEqual(range3.max, 750.75, 'Should extract decimal max');

    const range4 = monetarySearch.parseRangeQuery('not a range');
    test.assertEqual(range4, null, 'Should return null for non-range');
  });

  test.it('should extract monetary tokens correctly', () => {
    const result1 = monetarySearch.extractMonetaryTokens('$1500 material');
    test.assertEqual(result1.amounts.length, 1, 'Should extract one amount');
    test.assertEqual(result1.amounts[0], 1500, 'Should extract correct amount');
    test.assertEqual(result1.textTokens.length, 1, 'Should extract one text token');
    test.assertEqual(result1.textTokens[0], 'material', 'Should extract text token');

    const result2 = monetarySearch.extractMonetaryTokens('1000-2000 range');
    test.assertNotEqual(result2.range, null, 'Should detect range query');
    test.assertEqual(result2.range.min, 1000, 'Should extract range min');
    test.assertEqual(result2.range.max, 2000, 'Should extract range max');

    const result3 = monetarySearch.extractMonetaryTokens('$1,500 $2,000 multiple');
    test.assertEqual(result3.amounts.length, 2, 'Should extract multiple amounts');
    test.assertEqual(result3.amounts[0], 1500, 'Should extract first amount');
    test.assertEqual(result3.amounts[1], 2000, 'Should extract second amount');
    test.assertEqual(result3.textTokens[0], 'multiple', 'Should extract text token');
  });

  test.it('should check close matches correctly', () => {
    test.assertTrue(monetarySearch.isCloseMatch(1500, 1500), 'Should match exact values');
    test.assertTrue(monetarySearch.isCloseMatch(1500, 1500.01), 'Should match close values');
    test.assertTrue(monetarySearch.isCloseMatch(1500, 1499.99), 'Should match close values');
    test.assertFalse(monetarySearch.isCloseMatch(1500, 1600), 'Should not match distant values');
    
    test.assertTrue(monetarySearch.isCloseMatch(1500, 1500.005, 0.01), 'Should match within custom tolerance');
    test.assertFalse(monetarySearch.isCloseMatch(1500, 1500.02, 0.01), 'Should not match outside tolerance');
  });

  test.it('should normalize monetary values for comparison', () => {
    test.assertEqual(monetarySearch.normalizeForComparison(1500), '1500', 'Should normalize number');
    test.assertEqual(monetarySearch.normalizeForComparison('1,500'), '1500', 'Should remove commas');
    test.assertEqual(monetarySearch.normalizeForComparison('$1,500'), '1500', 'Should remove dollar sign and commas');
    test.assertEqual(monetarySearch.normalizeForComparison('1500.50'), '1500.50', 'Should preserve decimals');
  });

  test.it('should match monetary strings correctly', () => {
    test.assertTrue(monetarySearch.matchesMonetaryString('1500', 1500), 'Should match exact values');
    test.assertTrue(monetarySearch.matchesMonetaryString('1,500', 1500), 'Should match with comma');
    test.assertTrue(monetarySearch.matchesMonetaryString('150', 1500), 'Should match prefix');
    test.assertTrue(monetarySearch.matchesMonetaryString('1500', 150), 'Should match when data is prefix');
    test.assertTrue(monetarySearch.matchesMonetaryString('1', 1500), 'Should match first digit');
    
    test.assertFalse(monetarySearch.matchesMonetaryString('1600', 1500), 'Should not match different values');
    test.assertFalse(monetarySearch.matchesMonetaryString('1', 150), 'Should not match single digit to short data');
  });

  test.it('should implement progressive restriction for decimal queries', () => {
    // Test $800.00 (very explicit with decimals) - should be very restrictive
    test.assertTrue(monetarySearch.matchesMonetaryString('800.00', 800), 'Should match exact 800 with 800.00');
    test.assertTrue(monetarySearch.matchesMonetaryString('800.00', 800.00), 'Should match exact 800.00 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 8000), 'Should not match 8000 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 8800), 'Should not match 8800 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 880), 'Should not match 880 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 88), 'Should not match 88 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 8), 'Should not match 8 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 800.01), 'Should not match 800.01 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 800.10), 'Should not match 800.10 with 800.00');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.00', 801), 'Should not match 801 with 800.00');
    
    // Test $800.50 (decimal with non-zero digits) - should be very restrictive
    test.assertTrue(monetarySearch.matchesMonetaryString('800.50', 800.50), 'Should match exact 800.50 with 800.50');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.50', 800), 'Should not match 800 with 800.50');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.50', 800.00), 'Should not match 800.00 with 800.50');
    
    // Test $800. (decimal point but no decimal digits) - should match whole numbers starting with 800
    test.assertTrue(monetarySearch.matchesMonetaryString('800.', 800), 'Should match 800 with 800.');
    test.assertTrue(monetarySearch.matchesMonetaryString('800.', 8000), 'Should match 8000 with 800.');
    test.assertFalse(monetarySearch.matchesMonetaryString('800.', 8800), 'Should not match 8800 with 800.');
  });

  test.it('should implement progressive restriction for whole number queries', () => {
    // Test $800 (3 digits) - should match values starting with "800"
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 800), 'Should match exact 800 with 800');
    test.assertFalse(monetarySearch.matchesMonetaryString('800', 8000), 'Should not match 8000 with 800 (data longer than query)');
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 800.01), 'Should match 800.01 with 800');
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 800.10), 'Should match 800.10 with 800');
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 801), 'Should match 801 with 800');
    test.assertFalse(monetarySearch.matchesMonetaryString('800', 8800), 'Should not match 8800 with 800');
    test.assertFalse(monetarySearch.matchesMonetaryString('800', 880), 'Should not match 880 with 800');
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 88), 'Should match 88 with 800 (query starts with data)');
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 8), 'Should match 8 with 800 (query starts with data)');
    
    // Test $80 (2 digits) - should match values starting with "80"
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 800), 'Should match 800 with 80');
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 8000), 'Should match 8000 with 80');
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 800.01), 'Should match 800.01 with 80');
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 880), 'Should match 880 with 80');
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 88), 'Should match 88 with 80');
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 801), 'Should match 801 with 80');
    test.assertFalse(monetarySearch.matchesMonetaryString('80', 8), 'Should not match 8 with 80');
    
    // Test $8 (1 digit) - should match any value starting with "8" (first digit rule)
    test.assertTrue(monetarySearch.matchesMonetaryString('8', 800), 'Should match 800 with 8');
    test.assertTrue(monetarySearch.matchesMonetaryString('8', 8000), 'Should match 8000 with 8');
    test.assertTrue(monetarySearch.matchesMonetaryString('8', 8800), 'Should match 8800 with 8');
    test.assertTrue(monetarySearch.matchesMonetaryString('8', 880), 'Should match 880 with 8');
    test.assertTrue(monetarySearch.matchesMonetaryString('8', 88), 'Should match 88 with 8');
    test.assertTrue(monetarySearch.matchesMonetaryString('8', 8), 'Should match 8 with 8');
    test.assertFalse(monetarySearch.matchesMonetaryString('8', 900), 'Should not match 900 with 8');
    test.assertFalse(monetarySearch.matchesMonetaryString('8', 700), 'Should not match 700 with 8');
  });

  test.it('should implement progressive restriction for 4+ digit queries', () => {
    // Test $8000 (4 digits) - should be very restrictive, must start with exact digits
    test.assertTrue(monetarySearch.matchesMonetaryString('8000', 8000), 'Should match exact 8000 with 8000');
    test.assertTrue(monetarySearch.matchesMonetaryString('8000', 80000), 'Should match 80000 with 8000');
    test.assertTrue(monetarySearch.matchesMonetaryString('8000', 80001), 'Should match 80001 with 8000');
    test.assertTrue(monetarySearch.matchesMonetaryString('8000', 800), 'Should match 800 with 8000 (query starts with data)');
    test.assertFalse(monetarySearch.matchesMonetaryString('8000', 88000), 'Should not match 88000 with 8000');
    test.assertFalse(monetarySearch.matchesMonetaryString('8000', 8800), 'Should not match 8800 with 8000');
    test.assertTrue(monetarySearch.matchesMonetaryString('8000', 8), 'Should match 8 with 8000 (query starts with data)');
  });

  test.it('should handle edge cases in progressive restriction', () => {
    // Test with short data values - now allowed due to bidirectional prefix matching
    test.assertTrue(monetarySearch.matchesMonetaryString('800', 80), 'Should match 80 with 800 (bidirectional prefix matching)');
    test.assertTrue(monetarySearch.matchesMonetaryString('80', 8), 'Should match 8 with 80 (bidirectional prefix matching)');
    
    // Test with very short queries
    test.assertTrue(monetarySearch.matchesMonetaryString('1', 1000), 'Should match 1000 with 1 (first digit rule)');
    test.assertTrue(monetarySearch.matchesMonetaryString('2', 2000), 'Should match 2000 with 2 (first digit rule)');
    test.assertFalse(monetarySearch.matchesMonetaryString('1', 2000), 'Should not match 2000 with 1 (different first digit)');
    
    // Test exact matches always work regardless of progressive restriction
    test.assertTrue(monetarySearch.matchesMonetaryString('1500.00', 1500), 'Should match exact values even with decimals');
    test.assertTrue(monetarySearch.matchesMonetaryString('1,500', 1500), 'Should match exact values with comma formatting');
  });

  test.it('should match monetary queries for financial records', () => {
    const record = monetarySearch.testFinancialRecords[0]; // 1500 total value
    
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, '1500'), 'Should match exact total value');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, '1,500'), 'Should match with comma');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, '750'), 'Should match line item total');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, '2'), 'Should match quantity');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, '1000-2000'), 'Should match range query');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, 'material'), 'Should match line item description');
    
    test.assertFalse(monetarySearch.matchesMonetaryQuery(record, '5000'), 'Should not match wrong amount');
    test.assertFalse(monetarySearch.matchesMonetaryQuery(record, '3000-4000'), 'Should not match wrong range');
  });

  test.it('should not match monetary queries for documents', () => {
    const docRecord = {
      id: 'doc-1',
      entityType: 'Document',
      title: 'Test Document',
      summary: 'Test summary',
      project: 'Test Project',
      client: 'Test Client',
      status: 'Active',
      updatedAt: '2023-01-01T00:00:00.000Z',
      tags: [],
      metadata: {},
      documentType: 'Test',
      author: 'Test Author'
    };
    
    test.assertFalse(monetarySearch.matchesMonetaryQuery(docRecord, '1500'), 'Should not match documents');
    test.assertFalse(monetarySearch.matchesMonetaryQuery(docRecord, '1000-2000'), 'Should not match documents with range');
  });

  test.it('should handle edge cases in monetary matching', () => {
    const record = monetarySearch.testFinancialRecords[0];
    
    test.assertTrue(monetarySearch.matchesMonetaryQuery(record, ''), 'Empty query should match all');
    test.assertFalse(monetarySearch.matchesMonetaryQuery(record, 'invalid'), 'Invalid query should not match');
    
    // Test with record that has no line items
    const recordNoLineItems = {
      ...monetarySearch.testFinancialRecords[0],
      lineItems: []
    };
    
    test.assertTrue(monetarySearch.matchesMonetaryQuery(recordNoLineItems, '1500'), 'Should match total value even without line items');
    test.assertFalse(monetarySearch.matchesMonetaryQuery(recordNoLineItems, '750'), 'Should not match line item values without line items');
  });

  test.it('should handle large monetary values', () => {
    const largeRecord = monetarySearch.testFinancialRecords[2]; // 50000 total value
    
    test.assertTrue(monetarySearch.matchesMonetaryQuery(largeRecord, '50000'), 'Should match large exact value');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(largeRecord, '50,000'), 'Should match large value with comma');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(largeRecord, '500'), 'Should match prefix of large value');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(largeRecord, '40000-60000'), 'Should match large value range');
  });

  test.it('should fix the original $800.00 issue with progressive restriction', () => {
    // Create test records that would have matched the old overly broad logic
    const problematicRecords = [
      {
        id: 'record-1',
        entityType: 'ClientInvoice',
        title: 'Invoice with 8476 total',
        totalValue: 8476,
        lineItems: []
      },
      {
        id: 'record-2', 
        entityType: 'PurchaseOrder',
        title: 'PO with 8402 line item',
        totalValue: 10000,
        lineItems: [
          {
            lineItemTotal: 8402,
            lineItemUnitPrice: 4201,
            lineItemQuantity: 2
          }
        ]
      },
      {
        id: 'record-3',
        entityType: 'Bill',
        title: 'Bill with 8800 unit price',
        totalValue: 20000,
        lineItems: [
          {
            lineItemTotal: 17600,
            lineItemUnitPrice: 8800,
            lineItemQuantity: 2
          }
        ]
      },
      {
        id: 'record-4',
        entityType: 'Receipt',
        title: 'Receipt with 888 unit price',
        totalValue: 5000,
        lineItems: [
          {
            lineItemTotal: 888,
            lineItemUnitPrice: 888,
            lineItemQuantity: 1
          }
        ]
      }
    ];

    // Test $800.00 query - should be very restrictive and NOT match these records
    problematicRecords.forEach(record => {
      test.assertFalse(monetarySearch.matchesMonetaryQuery(record, '800.00'), 
        `Should NOT match ${record.title} with 800.00 query`);
    });

    // Test $800 query - should match records that start with "800"
    const matchingRecords = [
      {
        id: 'record-5',
        entityType: 'ClientInvoice',
        title: 'Invoice with 8000 total',
        totalValue: 8000,
        lineItems: []
      },
      {
        id: 'record-6',
        entityType: 'PurchaseOrder', 
        title: 'PO with 800.50 line item',
        totalValue: 10000,
        lineItems: [
          {
            lineItemTotal: 800.50,
            lineItemUnitPrice: 400.25,
            lineItemQuantity: 2
          }
        ]
      }
    ];

    matchingRecords.forEach(record => {
      test.assertTrue(monetarySearch.matchesMonetaryQuery(record, '800'), 
        `Should match ${record.title} with 800 query`);
    });

    // Test $8 query - should match records that start with "8" (first digit rule)
    test.assertTrue(monetarySearch.matchesMonetaryQuery(problematicRecords[0], '8'), 
      'Should match 8476 record with 8 query (first digit rule)');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(problematicRecords[1], '8'), 
      'Should match 8402 record with 8 query (first digit rule)');
    test.assertTrue(monetarySearch.matchesMonetaryQuery(problematicRecords[2], '8'), 
      'Should match 8800 record with 8 query (first digit rule)');
  });
});

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  test.run().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}

// Export for test runner
export { test as monetaryTests };
