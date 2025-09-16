# Search Prototype Test Suite

This directory contains a comprehensive test suite for the search prototype, including unit tests, integration tests, and specialized monetary query tests.

## Test Structure

```
tests/
├── test-framework.js           # Custom test framework
├── test-runner.js              # Node.js test runner
├── run-tests.html              # Web-based test interface
├── unit/                       # Unit tests
│   ├── search-service.test.js  # Core search functionality
│   └── monetary.test.js        # Monetary search utilities
├── integration/                # Integration tests
│   ├── search-integration.test.js      # End-to-end search tests
│   └── monetary-integration.test.js    # End-to-end monetary tests
└── README.md                   # This file
```

## Running Tests

### Command Line

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:monetary      # Monetary tests only

# Run tests with web interface
npm run test:web
```

### Web Interface

Open `tests/run-tests.html` in your browser for a visual test interface with:
- Real-time test output
- Test statistics and progress
- Individual test suite execution
- Detailed error reporting

## Test Coverage

### Unit Tests

**Search Service Unit Tests** (`unit/search-service.test.js`)
- Query tokenization
- Monetary query parsing
- Haystack building
- Query matching logic
- Relevance score calculation
- Edge case handling

**Monetary Search Unit Tests** (`unit/monetary.test.js`)
- Currency string parsing
- Range query parsing
- Monetary token extraction
- Close match detection
- Monetary string matching
- Edge cases for monetary queries

### Integration Tests

**Search Integration Tests** (`integration/search-integration.test.js`)
- Real corpus data loading
- End-to-end search functionality
- Result ranking and relevance
- Facet computation
- Performance benchmarks
- Case-insensitive searches
- Multi-word queries
- Consistency checks

**Monetary Integration Tests** (`integration/monetary-integration.test.js`)
- Monetary query identification
- Financial record filtering
- Range query handling
- Mixed monetary/text queries
- Monetary facet computation
- Large value handling
- Performance testing

## Test Scenarios

### Common Search Queries
- `document` - Should return 40-70 Document entities
- `invoice` - Should return 10-30 ClientInvoice entities
- `riverbend` - Should return 2-10 Riverbend Condos project records
- `outstanding` - Should return 5-25 Outstanding status records
- `electrical` - Should return 5-20 Electrical trade records

### Monetary Search Queries
- `$1500` - Exact amount matches
- `1,500` - Amount with comma formatting
- `$1000-$2000` - Range queries
- `$1000 to $2000` - Range with "to" syntax
- `$1` - Partial amount matches
- `$1500 material` - Mixed monetary and text queries

### Edge Cases
- Empty queries (`""`) - Should return all records
- Nonexistent queries (`"nonexistent"`) - Should return no results
- Single character queries (`"x"`) - Should return few results
- Special characters (`"test-query"`, `"test_query"`)
- Case variations (`"INVOICE"`, `"Invoice"`, `"invoice"`)

### Performance Benchmarks
- Search completion within 1 second
- Consistent results across multiple runs
- Proper error handling for invalid inputs

## Expected Results

The test suite validates:

1. **Correct Result Counts**: Each query should return results within expected ranges
2. **Entity Type Filtering**: Monetary queries should only return financial records
3. **Relevance Ranking**: Results should be ordered by relevance to the query
4. **Facet Accuracy**: Computed facets should match filtered results
5. **Performance**: All operations should complete within reasonable time
6. **Consistency**: Same queries should return consistent results
7. **Error Handling**: Invalid inputs should be handled gracefully

## Test Framework Features

The custom test framework provides:
- Descriptive test output with emojis and formatting
- Comprehensive assertion methods
- Test suite organization
- Performance timing
- Detailed error reporting
- Browser and Node.js compatibility

## Adding New Tests

To add new tests:

1. **Unit Tests**: Add to existing test files or create new ones in `unit/`
2. **Integration Tests**: Add to existing test files or create new ones in `integration/`
3. **Test Cases**: Use the framework's assertion methods:
   - `assertEqual(actual, expected, message)`
   - `assertTrue(condition, message)`
   - `assertGreaterThan(actual, expected, message)`
   - `assertArrayContains(array, item, message)`
   - And many more...

## Troubleshooting

### Common Issues

1. **Corpus Loading Errors**: Ensure corpus files are accessible and properly formatted
2. **Test Timeouts**: Check that search operations complete within expected timeframes
3. **Result Count Mismatches**: Verify corpus data hasn't changed significantly
4. **Import Errors**: Ensure all test files use proper ES module syntax

### Debug Mode

Run tests with verbose output to see detailed execution information:

```bash
# Add debug logging to test framework
node tests/test-runner.js --debug
```

## Continuous Integration

The test suite is designed to work in CI environments:
- Exit codes indicate success (0) or failure (1)
- Comprehensive error reporting
- Performance benchmarks
- No external dependencies beyond the corpus data

## Contributing

When contributing to the test suite:
1. Follow the existing test structure and naming conventions
2. Add appropriate test cases for new functionality
3. Update this README with new test scenarios
4. Ensure tests are deterministic and don't depend on external state
5. Include both positive and negative test cases
6. Test edge cases and error conditions
