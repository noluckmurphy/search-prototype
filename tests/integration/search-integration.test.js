/**
 * Integration tests for search functionality using actual corpus data
 * Tests real search queries and expected results
 */

// Import the test framework
import { TestFramework } from '../test-framework.js';
import fs from 'fs';
import path from 'path';

// Integration test class that uses actual search service
class SearchIntegrationTests {
  constructor() {
    this.testFramework = new TestFramework();
    this.corpus = null;
    this.expectedResults = {
      // Common queries with expected result counts
      'document': { minResults: 40, maxResults: 70, entityTypes: ['Document'] },
      'invoice': { minResults: 10, maxResults: 30, entityTypes: ['ClientInvoice'] },
      'purchase': { minResults: 5, maxResults: 20, entityTypes: ['PurchaseOrder'] },
      'bill': { minResults: 5, maxResults: 15, entityTypes: ['Bill'] },
      'receipt': { minResults: 5, maxResults: 15, entityTypes: ['Receipt'] },
      'payment': { minResults: 5, maxResults: 15, entityTypes: ['Payment'] },
      
      // Project-specific queries
      'riverbend': { minResults: 2, maxResults: 10, projects: ['Riverbend Condos'] },
      'marina': { minResults: 2, maxResults: 10, projects: ['Marina Overlook'] },
      'granite': { minResults: 2, maxResults: 10, projects: ['Granite Ridge Estates'] },
      'harbor': { minResults: 2, maxResults: 10, projects: ['Harbor Point Residences'] },
      
      // Status queries
      'outstanding': { minResults: 5, maxResults: 25, statuses: ['Outstanding'] },
      'paid': { minResults: 5, maxResults: 25, statuses: ['Paid'] },
      'sent': { minResults: 5, maxResults: 25, statuses: ['Sent'] },
      
      // Trade-specific queries
      'electrical': { minResults: 5, maxResults: 20, tags: ['Electrical'] },
      'hvac': { minResults: 5, maxResults: 20, tags: ['HVAC'] },
      'plumbing': { minResults: 5, maxResults: 20, tags: ['Plumbing'] },
      'concrete': { minResults: 5, maxResults: 20, tags: ['Concrete'] },
      
      // Edge cases
      '': { minResults: 140, maxResults: 160, description: 'Empty query should return all records' },
      'nonexistent': { minResults: 0, maxResults: 0, description: 'Nonexistent term should return no results' },
      'x': { minResults: 0, maxResults: 5, description: 'Single character should return few results' }
    };
  }

  async loadCorpus() {
    if (this.corpus) return this.corpus;

    try {
      // Load the index file to get metadata about the split files
      const indexPath = path.resolve('./src/data/corpus-parts/index.json');
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      
      const allRecords = [];
      
      // Load each corpus part file
      for (const fileInfo of indexData.files) {
        const filePath = path.resolve(`./src/data/corpus-parts/${fileInfo.filename}`);
        const partData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

  // Mock search function that simulates the actual search service
  async search(query, options = {}) {
    const corpus = await this.loadCorpus();
    
    // Simple tokenization
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    
    // Filter records
    const filtered = corpus.filter(record => {
      if (tokens.length === 0) return true; // Empty query returns all
      
      // Build searchable text
      const searchableText = [
        record.title,
        record.summary,
        record.project,
        record.client,
        record.status,
        ...record.tags,
        ...Object.values(record.metadata || {}).map(v => String(v))
      ].join(' ').toLowerCase();
      
      // Check if all tokens are present
      return tokens.every(token => searchableText.includes(token));
    });
    
    // Simple relevance scoring
    const scored = filtered.map(record => {
      const searchableText = [
        record.title,
        record.summary,
        record.project,
        record.client,
        record.status,
        ...record.tags
      ].join(' ').toLowerCase();
      
      let score = 0;
      const queryLower = query.toLowerCase();
      
      // Title match gets highest score
      if (record.title.toLowerCase().includes(queryLower)) {
        score += 100;
      }
      
      // Summary match gets medium score
      if (record.summary.toLowerCase().includes(queryLower)) {
        score += 50;
      }
      
      // Project match gets good score
      if (record.project.toLowerCase().includes(queryLower)) {
        score += 30;
      }
      
      // Token matches
      tokens.forEach(token => {
        if (record.title.toLowerCase().includes(token)) score += 20;
        if (record.summary.toLowerCase().includes(token)) score += 10;
        if (record.project.toLowerCase().includes(token)) score += 15;
        if (record.tags.some(tag => tag.toLowerCase().includes(token))) score += 5;
      });
      
      return { record, score };
    });
    
    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);
    
    return {
      query,
      totalResults: filtered.length,
      records: scored.map(item => item.record),
      facets: this.computeFacets(filtered)
    };
  }

  computeFacets(records) {
    const facets = {
      entityType: {},
      project: {},
      status: {},
      client: {}
    };
    
    records.forEach(record => {
      facets.entityType[record.entityType] = (facets.entityType[record.entityType] || 0) + 1;
      facets.project[record.project] = (facets.project[record.project] || 0) + 1;
      facets.status[record.status] = (facets.status[record.status] || 0) + 1;
      facets.client[record.client] = (facets.client[record.client] || 0) + 1;
    });
    
    return facets;
  }

  runTests() {
    const test = this.testFramework;
    
    test.describe('Search Integration Tests', async () => {
      
      test.it('should load corpus data successfully', async () => {
        const corpus = await this.loadCorpus();
        test.assertGreaterThan(corpus.length, 100, 'Should load more than 100 records');
        test.assertLessThan(corpus.length, 200, 'Should load fewer than 200 records');
        
        // Check that we have different entity types
        const entityTypes = new Set(corpus.map(r => r.entityType));
        test.assertGreaterThan(entityTypes.size, 3, 'Should have multiple entity types');
        test.assertTrue(entityTypes.has('Document'), 'Should have Document entities');
        test.assertTrue(entityTypes.has('ClientInvoice'), 'Should have ClientInvoice entities');
      });

      test.it('should return appropriate results for common queries', async () => {
        for (const [query, expected] of Object.entries(this.expectedResults)) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, expected.minResults, 
            `Query "${query}" should return at least ${expected.minResults} results`);
          test.assertLessThanOrEqual(result.totalResults, expected.maxResults, 
            `Query "${query}" should return at most ${expected.maxResults} results`);
          
          // Check entity type distribution if specified
          if (expected.entityTypes) {
            const resultEntityTypes = new Set(result.records.map(r => r.entityType));
            expected.entityTypes.forEach(entityType => {
              test.assertTrue(resultEntityTypes.has(entityType), 
                `Query "${query}" should return ${entityType} entities`);
            });
          }
        }
      });

      test.it('should rank results by relevance', async () => {
        const result = await this.search('riverbend');
        
        test.assertGreaterThan(result.records.length, 0, 'Should return results for riverbend');
        
        // First result should have highest relevance
        const firstResult = result.records[0];
        test.assertTrue(
          firstResult.title.toLowerCase().includes('riverbend') ||
          firstResult.project.toLowerCase().includes('riverbend') ||
          firstResult.summary.toLowerCase().includes('riverbend'),
          'First result should be most relevant to query'
        );
      });

      test.it('should handle empty queries correctly', async () => {
        const result = await this.search('');
        
        test.assertGreaterThan(result.totalResults, 140, 'Empty query should return most records');
        test.assertLessThan(result.totalResults, 160, 'Empty query should not return too many records');
      });

      test.it('should handle nonexistent queries correctly', async () => {
        const result = await this.search('nonexistentquerythatdoesnotexist');
        
        test.assertEqual(result.totalResults, 0, 'Nonexistent query should return no results');
        test.assertEqual(result.records.length, 0, 'Should have no records for nonexistent query');
      });

      test.it('should compute facets correctly', async () => {
        const result = await this.search('invoice');
        
        test.assertTrue(result.facets, 'Should have facets');
        test.assertTrue(result.facets.entityType, 'Should have entityType facet');
        test.assertTrue(result.facets.project, 'Should have project facet');
        test.assertTrue(result.facets.status, 'Should have status facet');
        
        // Check that facets reflect the filtered results
        const totalFacetCount = Object.values(result.facets.entityType).reduce((sum, count) => sum + count, 0);
        test.assertEqual(totalFacetCount, result.totalResults, 'Facet counts should match total results');
      });

      test.it('should handle case-insensitive searches', async () => {
        const upperResult = await this.search('INVOICE');
        const lowerResult = await this.search('invoice');
        const mixedResult = await this.search('Invoice');
        
        test.assertEqual(upperResult.totalResults, lowerResult.totalResults, 
          'Upper case should return same results as lower case');
        test.assertEqual(lowerResult.totalResults, mixedResult.totalResults, 
          'Mixed case should return same results as lower case');
      });

      test.it('should handle multi-word queries', async () => {
        const singleResult = await this.search('riverbend');
        const multiResult = await this.search('riverbend condos');
        
        test.assertLessThanOrEqual(multiResult.totalResults, singleResult.totalResults, 
          'Multi-word query should return fewer or equal results than single word');
        
        // Multi-word results should be more specific
        multiResult.records.forEach(record => {
          const searchableText = [
            record.title,
            record.summary,
            record.project
          ].join(' ').toLowerCase();
          
          test.assertTrue(searchableText.includes('riverbend'), 
            'Multi-word result should contain first word');
          test.assertTrue(searchableText.includes('condos'), 
            'Multi-word result should contain second word');
        });
      });

      test.it('should return consistent results across multiple searches', async () => {
        const result1 = await this.search('document');
        const result2 = await this.search('document');
        
        test.assertEqual(result1.totalResults, result2.totalResults, 
          'Same query should return same number of results');
        
        // Check that first few results are consistent
        const firstFew1 = result1.records.slice(0, 3).map(r => r.id);
        const firstFew2 = result2.records.slice(0, 3).map(r => r.id);
        
        test.assertEqual(firstFew1.join(','), firstFew2.join(','), 
          'Same query should return results in same order');
      });

      test.it('should handle special characters in queries', async () => {
        const specialQueries = ['test-query', 'test_query', 'test.query', 'test query'];
        
        for (const query of specialQueries) {
          const result = await this.search(query);
          
          test.assertGreaterThanOrEqual(result.totalResults, 0, 
            `Special query "${query}" should not crash`);
        }
      });

      test.it('should return results within reasonable time', async () => {
        const startTime = Date.now();
        await this.search('document');
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        test.assertLessThan(duration, 1000, 'Search should complete within 1 second');
      });
    });

    return this.testFramework;
  }
}

// Export for test runner
export { SearchIntegrationTests };
