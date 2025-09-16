/**
 * Simple test framework for the search prototype
 * Provides basic testing utilities and test runner functionality
 */

class TestFramework {
  constructor() {
    this.tests = [];
    this.results = [];
    this.currentSuite = null;
  }

  describe(suiteName, testFunction) {
    this.currentSuite = suiteName;
    console.log(`\n📁 ${suiteName}`);
    testFunction();
    this.currentSuite = null;
  }

  it(testName, testFunction) {
    this.tests.push({
      suite: this.currentSuite || 'Unknown Suite',
      name: testName,
      function: testFunction
    });
  }

  // Assertion methods
  assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
  }

  assertNotEqual(actual, expected, message = '') {
    if (actual === expected) {
      throw new Error(`${message}: Expected not to equal ${expected}`);
    }
  }

  assertTrue(condition, message = '') {
    if (!condition) {
      throw new Error(`${message}: Expected true, got ${condition}`);
    }
  }

  assertFalse(condition, message = '') {
    if (condition) {
      throw new Error(`${message}: Expected false, got ${condition}`);
    }
  }

  assertGreaterThan(actual, expected, message = '') {
    if (actual <= expected) {
      throw new Error(`${message}: Expected ${actual} > ${expected}`);
    }
  }

  assertGreaterThanOrEqual(actual, expected, message = '') {
    if (actual < expected) {
      throw new Error(`${message}: Expected ${actual} >= ${expected}`);
    }
  }

  assertLessThan(actual, expected, message = '') {
    if (actual >= expected) {
      throw new Error(`${message}: Expected ${actual} < ${expected}`);
    }
  }

  assertLessThanOrEqual(actual, expected, message = '') {
    if (actual > expected) {
      throw new Error(`${message}: Expected ${actual} <= ${expected}`);
    }
  }

  assertArrayContains(array, item, message = '') {
    if (!array.includes(item)) {
      throw new Error(`${message}: Array does not contain ${item}`);
    }
  }

  assertArrayNotContains(array, item, message = '') {
    if (array.includes(item)) {
      throw new Error(`${message}: Array should not contain ${item}`);
    }
  }

  assertArrayLength(array, expectedLength, message = '') {
    if (array.length !== expectedLength) {
      throw new Error(`${message}: Expected array length ${expectedLength}, got ${array.length}`);
    }
  }

  assertObjectHasProperty(obj, property, message = '') {
    if (!(property in obj)) {
      throw new Error(`${message}: Object does not have property ${property}`);
    }
  }

  assertThrows(fn, message = '') {
    try {
      fn();
      throw new Error(`${message}: Expected function to throw an error`);
    } catch (error) {
      // Expected behavior
    }
  }

  // Utility methods
  log(message) {
    console.log(`  ℹ️  ${message}`);
  }

  // Run all tests
  async run() {
    console.log('🚀 Running Search Prototype Tests\n');
    console.log('=' .repeat(50));
    
    let passed = 0;
    let failed = 0;
    const startTime = Date.now();

    for (const test of this.tests) {
      try {
        await test.function();
        console.log(`  ✅ ${test.name}`);
        passed++;
        this.results.push({ ...test, status: 'PASSED' });
      } catch (error) {
        console.log(`  ❌ ${test.name}`);
        console.log(`     Error: ${error.message}`);
        failed++;
        this.results.push({ ...test, status: 'FAILED', error: error.message });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('\n' + '=' .repeat(50));
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed (${duration}ms)`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   • ${r.suite}: ${r.name} - ${r.error}`));
    }

    console.log('\n🎯 Test Summary:');
    const suites = [...new Set(this.results.map(r => r.suite))];
    suites.forEach(suite => {
      const suiteResults = this.results.filter(r => r.suite === suite);
      const passedCount = suiteResults.filter(r => r.status === 'PASSED').length;
      const totalCount = suiteResults.length;
      const status = passedCount === totalCount ? '✅' : '❌';
      console.log(`   ${status} ${suite}: ${passedCount}/${totalCount} tests passed`);
    });

    return { passed, failed, total: this.tests.length };
  }

  // Get test results for programmatic access
  getResults() {
    return this.results;
  }
}

// Global test framework instance (for browser)
if (typeof window !== 'undefined') {
  window.testFramework = new TestFramework();
}

// Export for Node.js usage
export { TestFramework };
