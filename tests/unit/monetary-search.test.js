/**
 * Unit tests for monetary search functionality
 * Tests the specific behavior of monetary searches to prevent regressions
 */

// Import the test framework
import { TestFramework } from '../test-framework.js';

// Mock search service for monetary search testing
class MockMonetarySearchService {
  constructor() {
    this.testRecords = [
      {
        id: 'bill-1',
        entityType: 'Bill',
        title: 'Bill from Evergreen Mechanical',
        summary: 'recent hvac work',
        project: 'Granite Ridge Estates',
        client: 'Evergreen Mechanical',
        status: 'Approved',
        updatedAt: '2024-02-01T00:00:00.000Z',
        tags: ['HVAC', 'Mechanical'],
        metadata: {},
        totalValue: 416662,
        issuedDate: '2024-02-01T00:00:00.000Z',
        dueDate: '2024-03-17T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-1',
            lineItemTitle: 'Contingency reporting and analysis - 5 hours',
            lineItemDescription: 'Contingency reporting and analysis - 5 hours',
            lineItemQuantity: 5,
            lineItemQuantityUnitOfMeasure: 'pieces',
            lineItemUnitPrice: 87,
            lineItemTotal: 435,
            lineItemType: 'Subcontract'
          },
          {
            lineItemId: 'item-2',
            lineItemTitle: 'Bathroom plumbing rough-in - 22 bathrooms',
            lineItemDescription: 'Bathroom plumbing rough-in - 22 bathrooms',
            lineItemQuantity: 22,
            lineItemQuantityUnitOfMeasure: 'hours',
            lineItemUnitPrice: 43,
            lineItemTotal: 946,
            lineItemType: 'Other'
          },
          {
            lineItemId: 'item-3',
            lineItemTitle: 'bath work',
            lineItemDescription: 'bath work',
            lineItemQuantity: 2,
            lineItemQuantityUnitOfMeasure: 'cubic yards',
            lineItemUnitPrice: 86,
            lineItemTotal: 172,
            lineItemType: 'Subcontractor'
          },
          {
            lineItemId: 'item-4',
            lineItemTitle: 'clean work',
            lineItemDescription: 'clean work',
            lineItemQuantity: 8,
            lineItemQuantityUnitOfMeasure: 'sq ft',
            lineItemUnitPrice: 7,
            lineItemTotal: 56,
            lineItemType: 'Equipment'
          }
        ]
      },
      {
        id: 'invoice-1',
        entityType: 'ClientInvoice',
        title: 'Invoice for $22,500 project',
        summary: 'Project work totaling $22,500',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Outstanding',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tags: ['Construction'],
        metadata: {},
        totalValue: 22500,
        issuedDate: '2024-01-01T00:00:00.000Z',
        dueDate: '2024-02-01T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-1',
            lineItemTitle: 'Main work item',
            lineItemDescription: 'Main work item description',
            lineItemQuantity: 1,
            lineItemQuantityUnitOfMeasure: 'unit',
            lineItemUnitPrice: 22500,
            lineItemTotal: 22500,
            lineItemType: 'Labor'
          }
        ]
      },
      {
        id: 'receipt-1',
        entityType: 'Receipt',
        title: 'Receipt for $22 purchase',
        summary: 'Small purchase receipt',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Paid',
        updatedAt: '2024-01-15T00:00:00.000Z',
        tags: ['Purchase'],
        metadata: {},
        totalValue: 22,
        issuedDate: '2024-01-15T00:00:00.000Z',
        dueDate: null,
        lineItems: [
          {
            lineItemId: 'item-1',
            lineItemTitle: 'Small item',
            lineItemDescription: 'Small item description',
            lineItemQuantity: 1,
            lineItemQuantityUnitOfMeasure: 'unit',
            lineItemUnitPrice: 22,
            lineItemTotal: 22,
            lineItemType: 'Material'
          }
        ]
      },
      {
        id: 'test-bill-1',
        entityType: 'Bill',
        title: 'Test Bill with quantities and descriptions',
        summary: 'Test bill for testing monetary search restrictions',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Outstanding',
        updatedAt: '2024-01-01T00:00:00.000Z',
        tags: ['Test'],
        metadata: {},
        totalValue: 1000,
        issuedDate: '2024-01-01T00:00:00.000Z',
        dueDate: '2024-02-01T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-1',
            lineItemTitle: 'Work item with 5 units',
            lineItemDescription: 'Description mentioning 5 units of work',
            lineItemQuantity: 5,
            lineItemQuantityUnitOfMeasure: 'units',
            lineItemUnitPrice: 200,
            lineItemTotal: 1000,
            lineItemType: 'Labor'
          }
        ]
      }
    ];
  }

  // Mock implementation of parseMonetaryQuery function
  parseMonetaryQuery(query) {
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.startsWith('$')) {
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

  // Mock implementation of extractMonetaryTokens function
  extractMonetaryTokens(query) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const amounts = [];
    const textTokens = [];
    
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

  parseCurrencyString(amountStr) {
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
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
    
    // Check if any monetary amounts match (exact or close)
    if (amounts.length > 0) {
      // Check total value
      for (const queryAmount of amounts) {
        if (this.isCloseMatch(financialRecord.totalValue, queryAmount)) {
          return true;
        }
      }

      // Check line items for amounts
      for (const lineItem of financialRecord.lineItems) {
        for (const queryAmount of amounts) {
          if (this.isCloseMatch(lineItem.lineItemTotal, queryAmount) ||
              this.isCloseMatch(lineItem.lineItemUnitPrice, queryAmount)) {
            return true;
          }
        }
      }
    }

    // Check for string-based matches (handles comma differences)
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      // Check total value string match
      if (this.matchesMonetaryString(token, financialRecord.totalValue)) {
        return true;
      }

      // Check line items for string matches
      for (const lineItem of financialRecord.lineItems) {
        if (this.matchesMonetaryString(token, lineItem.lineItemTotal) ||
            this.matchesMonetaryString(token, lineItem.lineItemUnitPrice)) {
          return true;
        }
      }
    }

    // For explicit monetary searches (queries starting with $), be more restrictive
    const isExplicitMonetary = query.trim().startsWith('$');
    
    if (isExplicitMonetary) {
      // For explicit monetary searches, don't match against descriptions or quantities
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

  isCloseMatch(value1, value2, tolerance = 0.01) {
    return Math.abs(value1 - value2) <= tolerance;
  }

  matchesMonetaryString(queryStr, dataValue) {
    const normalizedQuery = this.normalizeForComparison(queryStr);
    const normalizedData = this.normalizeForComparison(dataValue.toString());
    
    if (normalizedQuery === normalizedData) {
      return true;
    }
    
    // Simple prefix matching for monetary values
    return normalizedData.startsWith(normalizedQuery);
  }

  normalizeForComparison(value) {
    const str = typeof value === 'string' ? value : value.toString();
    return str.replace(/[,$]/g, '');
  }
}

// Create test framework instance
const test = new TestFramework();
const searchService = new MockMonetarySearchService();

// Test suite for monetary search functionality
test.describe('Monetary Search Tests', () => {
  
  test.it('should match explicit monetary queries against total values', () => {
    const bill = searchService.testRecords[0];
    const invoice = searchService.testRecords[1];
    const receipt = searchService.testRecords[2];
    
    // Test $22 query - should match receipt with $22 total
    test.assertTrue(searchService.matchesMonetaryQuery(receipt, '$22'), 
      'Should match $22 against $22 total value');
    
    // Test $22500 query - should match invoice with $22,500 total
    test.assertTrue(searchService.matchesMonetaryQuery(invoice, '$22500'), 
      'Should match $22500 against $22,500 total value');
    
    // Test $416662 query - should match bill with $416,662 total
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$416662'), 
      'Should match $416662 against $416,662 total value');
  });

  test.it('should match explicit monetary queries against line item totals', () => {
    const bill = searchService.testRecords[0];
    
    // Test $435 query - should match first line item total
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$435'), 
      'Should match $435 against line item total of $435');
    
    // Test $946 query - should match second line item total
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$946'), 
      'Should match $946 against line item total of $946');
    
    // Test $172 query - should match third line item total
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$172'), 
      'Should match $172 against line item total of $172');
    
    // Test $56 query - should match fourth line item total
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$56'), 
      'Should match $56 against line item total of $56');
  });

  test.it('should match explicit monetary queries against line item unit prices', () => {
    const bill = searchService.testRecords[0];
    
    // Test $87 query - should match first line item unit price
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$87'), 
      'Should match $87 against line item unit price of $87');
    
    // Test $43 query - should match second line item unit price
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$43'), 
      'Should match $43 against line item unit price of $43');
    
    // Test $86 query - should match third line item unit price
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$86'), 
      'Should match $86 against line item unit price of $86');
    
    // Test $7 query - should match fourth line item unit price
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$7'), 
      'Should match $7 against line item unit price of $7');
  });

  test.it('should NOT match explicit monetary queries against descriptions without dollar signs', () => {
    const testBill = searchService.testRecords[3]; // Use the test bill
    
    // Test $5 query - should NOT match "5 units" in description or quantity
    // It should only match if there's an actual monetary value of $5
    test.assertFalse(searchService.matchesMonetaryQuery(testBill, '$5'), 
      'Should NOT match $5 against "5 units" in description or quantity');
    
    // Test $200 query - should match the $200 unit price
    test.assertTrue(searchService.matchesMonetaryQuery(testBill, '$200'), 
      'Should match $200 against $200 unit price');
    
    // Test $1000 query - should match the $1000 total
    test.assertTrue(searchService.matchesMonetaryQuery(testBill, '$1000'), 
      'Should match $1000 against $1000 total');
  });

  test.it('should NOT match explicit monetary queries against quantities', () => {
    const testBill = searchService.testRecords[3]; // Use the test bill
    
    // Test $5 query - should NOT match quantity of 5 units
    test.assertFalse(searchService.matchesMonetaryQuery(testBill, '$5'), 
      'Should NOT match $5 against quantity of 5 units');
    
    // Test $1 query - should NOT match quantity of 1 unit
    test.assertFalse(searchService.matchesMonetaryQuery(testBill, '$1'), 
      'Should NOT match $1 against quantity of 1 unit');
  });

  test.it('should handle non-explicit monetary queries differently', () => {
    const testBill = searchService.testRecords[3]; // Use the test bill
    
    // Test "5" query (without $) - should match against monetary values
    test.assertTrue(searchService.matchesMonetaryQuery(testBill, '5'), 
      'Should match "5" against monetary values');
    
    // Test "200" query (without $) - should match against monetary values
    test.assertTrue(searchService.matchesMonetaryQuery(testBill, '200'), 
      'Should match "200" against monetary values');
  });

  test.it('should handle comma-separated monetary values', () => {
    const bill = searchService.testRecords[0];
    const invoice = searchService.testRecords[1];
    
    // Test $416,662 query - should match bill total
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$416,662'), 
      'Should match $416,662 against $416,662 total value');
    
    // Test $22,500 query - should match invoice total
    test.assertTrue(searchService.matchesMonetaryQuery(invoice, '$22,500'), 
      'Should match $22,500 against $22,500 total value');
  });

  test.it('should handle partial monetary matches correctly', () => {
    const bill = searchService.testRecords[0];
    
    // Test $416 query - should match $416,662 total (prefix match)
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$416'), 
      'Should match $416 against $416,662 total (prefix match)');
    
    // Test $22 query - should match $22,500 total (prefix match)
    const invoice = searchService.testRecords[1];
    test.assertTrue(searchService.matchesMonetaryQuery(invoice, '$22'), 
      'Should match $22 against $22,500 total (prefix match)');
  });

  test.it('should not match non-monetary queries against financial records', () => {
    const testBill = searchService.testRecords[3]; // Use the test bill
    
    // Test non-monetary queries
    test.assertFalse(searchService.matchesMonetaryQuery(testBill, 'bathroom'), 
      'Should not match "bathroom" in monetary search');
    test.assertFalse(searchService.matchesMonetaryQuery(testBill, 'plumbing'), 
      'Should not match "plumbing" in monetary search');
    test.assertFalse(searchService.matchesMonetaryQuery(testBill, 'hvac'), 
      'Should not match "hvac" in monetary search');
  });

  test.it('should skip document records in monetary searches', () => {
    const documentRecord = {
      id: 'doc-1',
      entityType: 'Document',
      title: 'Test Document',
      summary: 'Test document summary',
      project: 'Test Project',
      client: 'Test Client',
      status: 'Active',
      updatedAt: '2024-01-01T00:00:00.000Z',
      tags: ['test'],
      metadata: {},
      documentType: 'Test Document',
      author: 'Test Author'
    };
    
    // Test that document records are skipped in monetary searches
    test.assertFalse(searchService.matchesMonetaryQuery(documentRecord, '$100'), 
      'Should skip document records in monetary searches');
  });

  test.it('should handle edge cases gracefully', () => {
    const bill = searchService.testRecords[0];
    
    // Test empty query
    test.assertTrue(searchService.matchesMonetaryQuery(bill, ''), 
      'Empty query should match all records');
    
    // Test query with only spaces
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '   '), 
      'Query with only spaces should match all records');
    
    // Test query with only dollar sign
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$'), 
      'Query with only dollar sign should match all records');
    
    // Test query with dollar sign and spaces
    test.assertTrue(searchService.matchesMonetaryQuery(bill, '$   '), 
      'Query with dollar sign and spaces should match all records');
  });
});

// Export for test runner
export { test as monetarySearchTests };
