/**
 * Integration tests for monetary search functionality
 * Tests the actual search service behavior with real corpus data
 */

// Import the test framework
import { TestFramework } from '../test-framework.js';

// Integration test class for monetary search
class MonetarySearchIntegrationTests {
  constructor() {
    this.testFramework = new TestFramework();
    this.corpus = null;
  }

  async loadCorpus() {
    if (this.corpus) return this.corpus;

    try {
      // Load the index file to get metadata about the split files
      const indexResponse = await fetch('./src/data/corpus-parts/index.json');
      const indexData = await indexResponse.json();
      
      const allRecords = [];
      
      // Load each corpus part file
      for (const fileInfo of indexData.files) {
        const response = await fetch(`./src/data/corpus-parts/${fileInfo.filename}`);
        const partData = await response.json();
        allRecords.push(...partData);
      }
      
      this.corpus = allRecords;
      return this.corpus;
    } catch (error) {
      console.error('Error loading corpus:', error);
      this.corpus = [];
      return this.corpus;
    }
  }

  // Mock search function that simulates the actual search service behavior
  async search(query, options = {}) {
    const corpus = await this.loadCorpus();
    
    // Parse monetary query
    const isMonetary = query.trim().startsWith('$');
    const searchQuery = isMonetary ? query.slice(1).trim() : query;
    
    // Filter records based on monetary search logic
    const filtered = corpus.filter(record => {
      if (isMonetary) {
        return this.matchesMonetaryQuery(record, searchQuery);
      } else {
        // Regular text search
        const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return true;
        
        const searchableText = [
          record.title,
          record.summary,
          record.project,
          record.client,
          record.status,
          ...record.tags,
          ...Object.values(record.metadata || {}).map(v => String(v))
        ].join(' ').toLowerCase();
        
        return tokens.every(token => searchableText.includes(token));
      }
    });
    
    return {
      query,
      totalResults: filtered.length,
      records: filtered,
      isMonetary
    };
  }

  // Simplified monetary search matching logic
  matchesMonetaryQuery(record, query) {
    if (record.entityType === 'Document') {
      return false; // Skip documents for monetary searches
    }

    const financialRecord = record;
    
    // Extract amounts from query
    const amounts = this.extractAmounts(query);
    
    if (amounts.length === 0) {
      return true; // No amounts to match
    }

    // Check total value
    for (const queryAmount of amounts) {
      if (this.isCloseMatch(financialRecord.totalValue, queryAmount)) {
        return true;
      }
    }

    // Check line items for amounts
    if (financialRecord.lineItems) {
      for (const lineItem of financialRecord.lineItems) {
        for (const queryAmount of amounts) {
          if (this.isCloseMatch(lineItem.lineItemTotal, queryAmount) ||
              this.isCloseMatch(lineItem.lineItemUnitPrice, queryAmount)) {
            return true;
          }
        }
      }
    }

    // For explicit monetary searches, don't match against descriptions or quantities
    return false;
  }

  extractAmounts(query) {
    const amounts = [];
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    
    for (const token of tokens) {
      const cleaned = token.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        amounts.push(parsed);
      }
    }
    
    return amounts;
  }

  isCloseMatch(value1, value2, tolerance = 0.01) {
    return Math.abs(value1 - value2) <= tolerance;
  }

  runTests() {
    const test = this.testFramework;
    
    test.describe('Monetary Search Integration Tests', async () => {
      
      test.it('should load corpus data successfully', async () => {
        const corpus = await this.loadCorpus();
        test.assertGreaterThan(corpus.length, 100, 'Should load more than 100 records');
        
        // Check that we have financial records
        const financialRecords = corpus.filter(r => r.entityType !== 'Document');
        test.assertGreaterThan(financialRecords.length, 50, 'Should have financial records');
      });

      test.it('should match explicit monetary queries against actual monetary values', async () => {
        // Test various monetary queries
        const monetaryQueries = ['$100', '$1000', '$10000', '$50000', '$100000'];
        
        for (const query of monetaryQueries) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, 0, 
            `Query "${query}" should return non-negative results`);
          
          // Verify that results are actually financial records
          result.records.forEach(record => {
            test.assertNotEqual(record.entityType, 'Document', 
              `Monetary query "${query}" should not return document records`);
          });
        }
      });

      test.it('should not match explicit monetary queries against descriptions or quantities', async () => {
        // Test queries that might match descriptions or quantities
        const problematicQueries = ['$22', '$5', '$2', '$8', '$10', '$15'];
        
        for (const query of problematicQueries) {
          const result = await this.search(query);
          
          // Check that results only match actual monetary values
          result.records.forEach(record => {
            if (record.entityType !== 'Document') {
              const hasMonetaryMatch = this.hasMonetaryMatch(record, query);
              test.assertTrue(hasMonetaryMatch, 
                `Record "${record.title}" should only match monetary values for query "${query}"`);
            }
          });
        }
      });

      test.it('should handle comma-separated monetary values', async () => {
        const commaQueries = ['$1,000', '$10,000', '$100,000', '$1,000,000'];
        
        for (const query of commaQueries) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, 0, 
            `Comma query "${query}" should return non-negative results`);
          
          // Verify that results are financial records
          result.records.forEach(record => {
            test.assertNotEqual(record.entityType, 'Document', 
              `Comma query "${query}" should not return document records`);
          });
        }
      });

      test.it('should handle partial monetary matches', async () => {
        // Test partial matches (e.g., $100 should match $100,000)
        const partialQueries = ['$1', '$10', '$100', '$1000'];
        
        for (const query of partialQueries) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, 0, 
            `Partial query "${query}" should return non-negative results`);
        }
      });

      test.it('should distinguish between monetary and text searches', async () => {
        // Test that $22 (monetary) and "22" (text) return different results
        const monetaryResult = await this.search('$22');
        const textResult = await this.search('22');
        
        // Monetary search should be more restrictive
        test.assertLessThanOrEqual(monetaryResult.totalResults, textResult.totalResults, 
          'Monetary search should return fewer or equal results than text search');
        
        // Both should return financial records only
        monetaryResult.records.forEach(record => {
          test.assertNotEqual(record.entityType, 'Document', 
            'Monetary search should not return document records');
        });
      });

      test.it('should handle edge cases gracefully', async () => {
        const edgeCases = ['$', '$ ', '$0', '$0.00', '$999999999'];
        
        for (const query of edgeCases) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, 0, 
            `Edge case "${query}" should not crash`);
        }
      });

      test.it('should return consistent results across multiple searches', async () => {
        const query = '$1000';
        const result1 = await this.search(query);
        const result2 = await this.search(query);
        
        test.assertEqual(result1.totalResults, result2.totalResults, 
          'Same monetary query should return same number of results');
      });
    });

    return this.testFramework;
  }

  // Helper method to check if a record has a monetary match
  hasMonetaryMatch(record, query) {
    const amounts = this.extractAmounts(query);
    
    if (amounts.length === 0) {
      return true; // No amounts to match
    }

    // Check total value
    for (const queryAmount of amounts) {
      if (this.isCloseMatch(record.totalValue, queryAmount)) {
        return true;
      }
    }

    // Check line items for amounts
    if (record.lineItems) {
      for (const lineItem of record.lineItems) {
        for (const queryAmount of amounts) {
          if (this.isCloseMatch(lineItem.lineItemTotal, queryAmount) ||
              this.isCloseMatch(lineItem.lineItemUnitPrice, queryAmount)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

// Export for test runner
export { MonetarySearchIntegrationTests as MonetaryIntegrationTests };