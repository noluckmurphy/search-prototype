/**
 * Unit tests for search service core functionality
 * Tests individual functions and utilities
 */

// Import the test framework
import { TestFramework } from '../test-framework.js';

// Mock the search service for unit testing
class MockSearchService {
  constructor() {
    this.testRecords = [
      {
        id: 'test-doc-1',
        entityType: 'Document',
        title: 'Test Document Title',
        summary: 'This is a test document summary',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Active',
        updatedAt: '2023-01-01T00:00:00.000Z',
        tags: ['test', 'document'],
        metadata: { phase: 'testing' },
        documentType: 'Test Document',
        author: 'Test Author'
      },
      {
        id: 'test-invoice-1',
        entityType: 'ClientInvoice',
        title: 'Test Invoice',
        summary: 'Test invoice for testing purposes',
        project: 'Test Project',
        client: 'Test Client',
        status: 'Outstanding',
        updatedAt: '2023-01-02T00:00:00.000Z',
        tags: ['test', 'invoice'],
        metadata: { vendor: 'Test Vendor' },
        totalValue: 1500,
        issuedDate: '2023-01-01T00:00:00.000Z',
        lineItems: [
          {
            lineItemId: 'item-1',
            lineItemTitle: 'Test Item',
            lineItemDescription: 'Test item description',
            lineItemQuantity: 2,
            lineItemQuantityUnitOfMeasure: 'unit',
            lineItemUnitPrice: 750,
            lineItemTotal: 1500,
            lineItemType: 'Material'
          }
        ]
      }
    ];
  }

  // Mock implementation of tokenize function
  tokenize(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
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

  // Mock implementation of buildHaystack function
  buildHaystack(record) {
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
      const financialRecord = record;
      financialRecord.lineItems.forEach((item) => {
        base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
      });
    }

    return base
      .filter((chunk) => Boolean(chunk))
      .join(' ')
      .toLowerCase();
  }

  // Mock implementation of matchesQuery function
  matchesQuery(record, query) {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) {
      return true;
    }

    const haystack = this.buildHaystack(record);
    return tokens.every((token) => haystack.includes(token));
  }

  // Mock implementation of calculateRelevanceScore function
  calculateRelevanceScore(record, query) {
    const tokens = this.tokenize(query);
    if (tokens.length === 0) {
      return 0;
    }

    const haystack = this.buildHaystack(record);
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
    
    return score;
  }
}

// Create test framework instance
const test = new TestFramework();
const searchService = new MockSearchService();

// Test suite for core search functionality
test.describe('Search Service Unit Tests', () => {
  
  test.it('should tokenize queries correctly', () => {
    const tokens1 = searchService.tokenize('test query');
    test.assertEqual(tokens1.length, 2, 'Should tokenize into 2 tokens');
    test.assertEqual(tokens1[0], 'test', 'First token should be "test"');
    test.assertEqual(tokens1[1], 'query', 'Second token should be "query"');

    const tokens2 = searchService.tokenize('  multiple   spaces  ');
    test.assertEqual(tokens2.length, 2, 'Should handle multiple spaces');
    test.assertEqual(tokens2[0], 'multiple', 'Should trim spaces');
    test.assertEqual(tokens2[1], 'spaces', 'Should trim spaces');

    const tokens3 = searchService.tokenize('');
    test.assertEqual(tokens3.length, 0, 'Empty query should return empty tokens');
  });

  test.it('should parse monetary queries correctly', () => {
    const result1 = searchService.parseMonetaryQuery('$1500');
    test.assertTrue(result1.isMonetary, 'Should detect monetary query');
    test.assertEqual(result1.searchQuery, '1500', 'Should extract amount');
    test.assertEqual(result1.originalQuery, '$1500', 'Should preserve original query');

    const result2 = searchService.parseMonetaryQuery('regular query');
    test.assertFalse(result2.isMonetary, 'Should not detect monetary query');
    test.assertEqual(result2.searchQuery, 'regular query', 'Should preserve query');
    test.assertEqual(result2.originalQuery, 'regular query', 'Should preserve original query');

    const result3 = searchService.parseMonetaryQuery('$ 1500');
    test.assertTrue(result3.isMonetary, 'Should detect monetary query with space');
    test.assertEqual(result3.searchQuery, '1500', 'Should extract amount with space');
  });

  test.it('should build haystack correctly', () => {
    const doc = searchService.testRecords[0];
    const haystack = searchService.buildHaystack(doc);
    
    test.assertTrue(haystack.includes('test document title'), 'Should include title');
    test.assertTrue(haystack.includes('test document summary'), 'Should include summary');
    test.assertTrue(haystack.includes('test project'), 'Should include project');
    test.assertTrue(haystack.includes('test client'), 'Should include client');
    test.assertTrue(haystack.includes('active'), 'Should include status');
    test.assertTrue(haystack.includes('test document'), 'Should include tags');
    test.assertTrue(haystack.includes('testing'), 'Should include metadata');
  });

  test.it('should build haystack for financial records', () => {
    const invoice = searchService.testRecords[1];
    const haystack = searchService.buildHaystack(invoice);
    
    test.assertTrue(haystack.includes('test invoice'), 'Should include title');
    test.assertTrue(haystack.includes('test item'), 'Should include line item title');
    test.assertTrue(haystack.includes('test item description'), 'Should include line item description');
    test.assertTrue(haystack.includes('material'), 'Should include line item type');
  });

  test.it('should match queries correctly', () => {
    const doc = searchService.testRecords[0];
    
    test.assertTrue(searchService.matchesQuery(doc, 'test'), 'Should match single word');
    test.assertTrue(searchService.matchesQuery(doc, 'test document'), 'Should match multiple words');
    test.assertTrue(searchService.matchesQuery(doc, 'project'), 'Should match project name');
    test.assertFalse(searchService.matchesQuery(doc, 'nonexistent'), 'Should not match nonexistent word');
    test.assertTrue(searchService.matchesQuery(doc, ''), 'Empty query should match all');
  });

  test.it('should calculate relevance scores correctly', () => {
    const doc = searchService.testRecords[0];
    
    const score1 = searchService.calculateRelevanceScore(doc, 'test document title');
    test.assertGreaterThan(score1, 100, 'Exact title match should have high score');
    
    const score2 = searchService.calculateRelevanceScore(doc, 'test');
    test.assertGreaterThan(score2, 0, 'Partial match should have positive score');
    test.assertLessThan(score2, score1, 'Partial match should have lower score than exact match');
    
    const score3 = searchService.calculateRelevanceScore(doc, 'nonexistent');
    test.assertEqual(score3, 0, 'No match should have zero score');
  });

  test.it('should handle edge cases', () => {
    // Test with empty record
    const emptyRecord = {
      id: 'empty',
      entityType: 'Document',
      title: '',
      summary: '',
      project: '',
      client: '',
      status: '',
      updatedAt: '2023-01-01T00:00:00.000Z',
      tags: [],
      metadata: {},
      documentType: '',
      author: ''
    };

    const haystack = searchService.buildHaystack(emptyRecord);
    test.assertEqual(haystack, '', 'Empty record should produce empty haystack');
    
    const matches = searchService.matchesQuery(emptyRecord, 'anything');
    test.assertFalse(matches, 'Empty record should not match any query');
  });
});

// Export for test runner
export { test as searchServiceTests };
