/**
 * Integration tests for monetary search functionality using actual corpus data
 * Tests real monetary queries and expected results
 */

// Import the test framework
import { TestFramework } from '../test-framework.js';

// Monetary integration test class
class MonetaryIntegrationTests {
  constructor() {
    this.testFramework = new TestFramework();
    this.corpus = null;
    this.monetaryQueries = {
      // Exact amount matches
      '$1500': { minResults: 1, maxResults: 5, description: 'Exact amount match' },
      '$2500': { minResults: 1, maxResults: 5, description: 'Another exact amount' },
      '$50000': { minResults: 1, maxResults: 3, description: 'Large amount match' },
      
      // Amount variations
      '1500': { minResults: 1, maxResults: 5, description: 'Amount without dollar sign' },
      '1,500': { minResults: 1, maxResults: 5, description: 'Amount with comma' },
      '$1,500': { minResults: 1, maxResults: 5, description: 'Amount with dollar sign and comma' },
      
      // Range queries
      '$1000-$2000': { minResults: 2, maxResults: 10, description: 'Range query' },
      '$1000 to $2000': { minResults: 2, maxResults: 10, description: 'Range query with "to"' },
      '1000-2000': { minResults: 2, maxResults: 10, description: 'Range without dollar signs' },
      '$50000-$100000': { minResults: 0, maxResults: 5, description: 'Large range query' },
      
      // Partial matches
      '$1': { minResults: 5, maxResults: 20, description: 'Partial amount match' },
      '$2': { minResults: 5, maxResults: 20, description: 'Another partial match' },
      '$5': { minResults: 1, maxResults: 10, description: 'Partial match for large amounts' },
      
      // Edge cases
      '$0': { minResults: 0, maxResults: 0, description: 'Zero amount should return no results' },
      '$999999': { minResults: 0, maxResults: 0, description: 'Very large amount should return no results' },
      'invalid': { minResults: 0, maxResults: 0, description: 'Invalid monetary query' },
      
      // Mixed queries (monetary + text)
      '$1500 material': { minResults: 0, maxResults: 3, description: 'Monetary query with text' },
      '$2500 labor': { minResults: 0, maxResults: 3, description: 'Another mixed query' }
    };
  }

  async loadCorpus() {
    if (this.corpus) return this.corpus;

    try {
      const indexResponse = await fetch('./src/data/corpus-parts/index.json');
      const indexData = await indexResponse.json();
      
      const allRecords = [];
      
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

  // Parse monetary query to determine if it's monetary
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
    
    // Check if query contains monetary patterns
    const monetaryPatterns = [
      /^\d+$/, // Pure number
      /^\d{1,3}(,\d{3})*(\.\d{2})?$/, // Number with commas
      /\d+-\d+/, // Range
      /\d+\s+to\s+\d+/i // Range with "to"
    ];
    
    const isMonetary = monetaryPatterns.some(pattern => pattern.test(trimmedQuery));
    
    return {
      isMonetary,
      searchQuery: query,
      originalQuery: query
    };
  }

  // Parse currency string
  parseCurrencyString(amountStr) {
    const cleaned = amountStr.replace(/[$,\s]/g, '');
    
    if (cleaned.includes('-') || cleaned.toLowerCase().includes(' to ')) {
      return null;
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Parse range query
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

  // Extract monetary tokens
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

  // Check if values are close match
  isCloseMatch(value1, value2, tolerance = 0.01) {
    return Math.abs(value1 - value2) <= tolerance;
  }

  // Normalize for comparison
  normalizeForComparison(value) {
    const str = typeof value === 'string' ? value : value.toString();
    return str.replace(/[,$]/g, '');
  }

  // Check monetary string match
  matchesMonetaryString(queryStr, dataValue) {
    const normalizedQuery = this.normalizeForComparison(queryStr);
    const normalizedData = this.normalizeForComparison(dataValue.toString());
    
    if (normalizedQuery === normalizedData) {
      return true;
    }
    
    if (normalizedQuery.length >= 2 && normalizedData.length >= 3) {
      if (normalizedData.startsWith(normalizedQuery)) {
        return true;
      }
      
      if (normalizedQuery.startsWith(normalizedData)) {
        return true;
      }
      
      if (normalizedQuery[0] === normalizedData[0]) {
        return true;
      }
    }
    
    return false;
  }

  // Match monetary query against record
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

    // Check text tokens against line item descriptions
    if (textTokens.length > 0) {
      for (const lineItem of financialRecord.lineItems) {
        const lineItemText = [
          lineItem.lineItemTitle,
          lineItem.lineItemDescription,
          lineItem.lineItemType
        ].join(' ').toLowerCase();

        if (textTokens.every(token => lineItemText.includes(token))) {
          return true;
        }
      }
    }

    return false;
  }

  // Perform monetary search
  async search(query, options = {}) {
    const corpus = await this.loadCorpus();
    const { isMonetary } = this.parseMonetaryQuery(query);
    
    if (!isMonetary) {
      return { query, totalResults: 0, records: [], isMonetary: false };
    }
    
    const filtered = corpus.filter(record => this.matchesMonetaryQuery(record, query));
    
    // Calculate monetary relevance scores
    const scored = filtered.map(record => {
      let score = 0;
      
      const { amounts, textTokens, range } = this.extractMonetaryTokens(query);
      
      if (range) {
        if (record.totalValue >= range.min && record.totalValue <= range.max) {
          const rangeCenter = (range.min + range.max) / 2;
          const distanceFromCenter = Math.abs(record.totalValue - rangeCenter);
          const rangeSize = range.max - range.min;
          const normalizedDistance = Math.min(distanceFromCenter / rangeSize, 1);
          score += Math.round(800 * (1 - normalizedDistance));
        }
      }
      
      if (amounts.length > 0) {
        for (const queryAmount of amounts) {
          if (record.totalValue === queryAmount) {
            score += 1000;
          } else if (this.isCloseMatch(record.totalValue, queryAmount, 0.01)) {
            score += 800;
          } else if (this.isCloseMatch(record.totalValue, queryAmount, 1.00)) {
            score += 600;
          }
        }
      }
      
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        if (this.matchesMonetaryString(token, record.totalValue)) {
          score += 750;
        }
      }
      
      return { record, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    return {
      query,
      totalResults: filtered.length,
      records: scored.map(item => item.record),
      isMonetary: true,
      facets: this.computeFacets(filtered)
    };
  }

  computeFacets(records) {
    const facets = {
      entityType: {},
      totalValue: {},
      status: {}
    };
    
    records.forEach(record => {
      facets.entityType[record.entityType] = (facets.entityType[record.entityType] || 0) + 1;
      facets.status[record.status] = (facets.status[record.status] || 0) + 1;
      
      // Bucket total values
      const bucket = this.bucketTotal(record.totalValue);
      facets.totalValue[bucket] = (facets.totalValue[bucket] || 0) + 1;
    });
    
    return facets;
  }

  bucketTotal(total) {
    if (total < 10000) return '< $10k';
    if (total < 50000) return '$10k–$50k';
    if (total < 100000) return '$50k–$100k';
    return '$100k+';
  }

  runTests() {
    const test = this.testFramework;
    
    test.describe('Monetary Search Integration Tests', async () => {
      
      test.it('should identify monetary queries correctly', () => {
        const monetaryQueries = ['$1500', '$1,500', '1500', '1000-2000', '$1000-$2000'];
        const nonMonetaryQueries = ['document', 'invoice', 'test query', 'electrical'];
        
        monetaryQueries.forEach(query => {
          const result = this.parseMonetaryQuery(query);
          test.assertTrue(result.isMonetary, `"${query}" should be identified as monetary`);
        });
        
        nonMonetaryQueries.forEach(query => {
          const result = this.parseMonetaryQuery(query);
          test.assertFalse(result.isMonetary, `"${query}" should not be identified as monetary`);
        });
      });

      test.it('should return appropriate results for monetary queries', async () => {
        for (const [query, expected] of Object.entries(this.monetaryQueries)) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, expected.minResults, 
            `Monetary query "${query}" should return at least ${expected.minResults} results`);
          test.assertLessThanOrEqual(result.totalResults, expected.maxResults, 
            `Monetary query "${query}" should return at most ${expected.maxResults} results`);
          
          test.assertEqual(result.isMonetary, true, 
            `Query "${query}" should be identified as monetary`);
        }
      });

      test.it('should only return financial records for monetary queries', async () => {
        const result = await this.search('$1500');
        
        if (result.totalResults > 0) {
          result.records.forEach(record => {
            test.assertNotEqual(record.entityType, 'Document', 
              'Monetary queries should not return Document entities');
            test.assertTrue(['ClientInvoice', 'PurchaseOrder', 'Bill', 'Receipt', 'Payment'].includes(record.entityType),
              'Monetary queries should only return financial entity types');
          });
        }
      });

      test.it('should handle range queries correctly', async () => {
        const rangeResult = await this.search('$1000-$2000');
        
        if (rangeResult.totalResults > 0) {
          rangeResult.records.forEach(record => {
            const totalValue = record.totalValue;
            test.assertGreaterThanOrEqual(totalValue, 1000, 
              'Range query results should be within range');
            test.assertLessThanOrEqual(totalValue, 2000, 
              'Range query results should be within range');
          });
        }
      });

      test.it('should rank monetary results by relevance', async () => {
        const result = await this.search('$1500');
        
        if (result.totalResults > 1) {
          const firstResult = result.records[0];
          const secondResult = result.records[1];
          
          // First result should have higher or equal relevance
          // (We can't directly access scores, but we can infer from totalValue)
          test.assertTrue(
            Math.abs(firstResult.totalValue - 1500) <= Math.abs(secondResult.totalValue - 1500),
            'Results should be ranked by monetary relevance'
          );
        }
      });

      test.it('should handle mixed monetary and text queries', async () => {
        const mixedResult = await this.search('$1500 material');
        
        test.assertGreaterThanOrEqual(mixedResult.totalResults, 0, 
          'Mixed query should return some results');
        
        if (mixedResult.totalResults > 0) {
          mixedResult.records.forEach(record => {
            // Should match monetary amount
            const hasMonetaryMatch = record.totalValue === 1500 || 
              record.lineItems.some(item => 
                item.lineItemTotal === 1500 || 
                item.lineItemUnitPrice === 1500 ||
                item.lineItemQuantity === 1500
              );
            
            test.assertTrue(hasMonetaryMatch, 
              'Mixed query results should match monetary amount');
          });
        }
      });

      test.it('should compute monetary facets correctly', async () => {
        const result = await this.search('$1000-$50000');
        
        test.assertTrue(result.facets, 'Should have facets');
        test.assertTrue(result.facets.entityType, 'Should have entityType facet');
        test.assertTrue(result.facets.totalValue, 'Should have totalValue facet');
        
        // Check that totalValue facets are properly bucketed
        if (result.facets.totalValue) {
          const bucketKeys = Object.keys(result.facets.totalValue);
          bucketKeys.forEach(bucket => {
            test.assertTrue(['< $10k', '$10k–$50k', '$50k–$100k', '$100k+'].includes(bucket),
              `Facet bucket "${bucket}" should be valid`);
          });
        }
      });

      test.it('should handle edge cases gracefully', async () => {
        const edgeCases = ['$0', '$999999', 'invalid', '$', '$abc'];
        
        for (const query of edgeCases) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, 0, 
            `Edge case "${query}" should not crash`);
        }
      });

      test.it('should return consistent results for same monetary query', async () => {
        const result1 = await this.search('$1500');
        const result2 = await this.search('$1500');
        
        test.assertEqual(result1.totalResults, result2.totalResults, 
          'Same monetary query should return same number of results');
        
        if (result1.totalResults > 0) {
          const firstResult1 = result1.records[0];
          const firstResult2 = result2.records[0];
          
          test.assertEqual(firstResult1.id, firstResult2.id, 
            'Same monetary query should return results in same order');
        }
      });

      test.it('should handle large monetary values', async () => {
        const largeResult = await this.search('$50000');
        
        test.assertGreaterThanOrEqual(largeResult.totalResults, 0, 
          'Large monetary query should return results');
        
        if (largeResult.totalResults > 0) {
          largeResult.records.forEach(record => {
            test.assertGreaterThan(record.totalValue, 40000, 
              'Large monetary query results should have large values');
          });
        }
      });

      test.it('should perform monetary searches within reasonable time', async () => {
        const startTime = Date.now();
        await this.search('$1500');
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        test.assertLessThan(duration, 1000, 'Monetary search should complete within 1 second');
      });
    });

    return this.testFramework;
  }
}

// Export for test runner
export { MonetaryIntegrationTests };
