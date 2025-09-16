#!/usr/bin/env node

/**
 * Test runner for the search prototype
 * Runs all test suites and provides comprehensive reporting
 */

import { TestFramework } from './test-framework.js';
import { searchServiceTests } from './unit/search-service.test.js';
import { monetaryTests } from './unit/monetary.test.js';
import { monetarySearchTests } from './unit/monetary-search.test.js';
import { SearchIntegrationTests } from './integration/search-integration.test.js';
import { MonetaryIntegrationTests } from './integration/monetary-integration.test.js';

class TestRunner {
  constructor() {
    this.testSuites = [];
    this.results = [];
    this.startTime = null;
  }

  addTestSuite(name, testSuite) {
    this.testSuites.push({ name, testSuite });
  }

  async runAllTests() {
    console.log('🚀 Starting Search Prototype Test Suite');
    console.log('=' .repeat(60));
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');

    this.startTime = Date.now();
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    // Run unit tests
    console.log('🔬 Running Unit Tests...');
    console.log('-'.repeat(40));
    
    const unitTestSuites = [
      { name: 'Search Service Unit Tests', suite: searchServiceTests },
      { name: 'Monetary Search Unit Tests', suite: monetaryTests },
      { name: 'Monetary Search Behavior Tests', suite: monetarySearchTests }
    ];

    for (const { name, suite } of unitTestSuites) {
      console.log(`\n📁 ${name}`);
      const suiteResults = await this.runTestSuite(suite);
      totalPassed += suiteResults.passed;
      totalFailed += suiteResults.failed;
      totalTests += suiteResults.total;
    }

    // Run integration tests
    console.log('\n\n🔗 Running Integration Tests...');
    console.log('-'.repeat(40));

    const integrationTestSuites = [
      { name: 'Search Integration Tests', suite: new SearchIntegrationTests() },
      { name: 'Monetary Integration Tests', suite: new MonetaryIntegrationTests() }
    ];

    for (const { name, suite } of integrationTestSuites) {
      console.log(`\n📁 ${name}`);
      const suiteResults = await this.runTestSuite(suite.runTests());
      totalPassed += suiteResults.passed;
      totalFailed += suiteResults.failed;
      totalTests += suiteResults.total;
    }

    // Generate final report
    this.generateFinalReport(totalPassed, totalFailed, totalTests);
    
    return {
      passed: totalPassed,
      failed: totalFailed,
      total: totalTests,
      success: totalFailed === 0
    };
  }

  async runTestSuite(testFramework) {
    const results = await testFramework.run();
    this.results.push(results);
    return results;
  }

  generateFinalReport(passed, failed, total) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 FINAL TEST REPORT');
    console.log('=' .repeat(60));
    
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📈 Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.forEach((suiteResult, index) => {
        if (suiteResult.failed > 0 && suiteResult.results) {
          console.log(`\n📁 Test Suite ${index + 1}:`);
          suiteResult.results
            .filter(r => r.status === 'FAILED')
            .forEach(r => console.log(`   • ${r.suite}: ${r.name} - ${r.error}`));
        }
      });
      
      console.log('\n💡 TROUBLESHOOTING TIPS:');
      console.log('   • Check that the corpus data is properly loaded');
      console.log('   • Verify that the search service functions are working correctly');
      console.log('   • Ensure monetary parsing logic handles edge cases');
      console.log('   • Check that integration tests have access to the corpus files');
    } else {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('   Your search prototype is working correctly!');
    }
    
    console.log('\n📋 TEST COVERAGE SUMMARY:');
    console.log('   • Unit Tests: Core search functionality and utilities');
    console.log('   • Integration Tests: End-to-end search with real corpus data');
    console.log('   • Monetary Tests: Specialized financial search functionality');
    console.log('   • Edge Cases: Error handling and boundary conditions');
    
    console.log('\n🔍 TEST SCENARIOS COVERED:');
    console.log('   • Text search queries (documents, invoices, etc.)');
    console.log('   • Monetary queries ($1500, $1000-$2000, etc.)');
    console.log('   • Range queries and partial matches');
    console.log('   • Case-insensitive searches');
    console.log('   • Multi-word queries');
    console.log('   • Empty and invalid queries');
    console.log('   • Relevance scoring and ranking');
    console.log('   • Facet computation');
    console.log('   • Performance benchmarks');
    
    console.log('\n' + '=' .repeat(60));
    
    if (failed === 0) {
      console.log('🎯 Test Suite Status: PASSED ✅');
      process.exit(0);
    } else {
      console.log('🎯 Test Suite Status: FAILED ❌');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();
  
  try {
    const results = await runner.runAllTests();
    
    if (results.success) {
      console.log('\n✨ Test run completed successfully!');
    } else {
      console.log('\n⚠️  Test run completed with failures.');
    }
  } catch (error) {
    console.error('\n💥 Test runner encountered an error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestRunner };