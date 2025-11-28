# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A custom TypeScript search application prototype with advanced query parsing, relationship engine, and monetary query support. Built with vanilla TypeScript and esbuild for minimal bundle size and fast performance.

## Essential Commands

```bash
npm run dev                  # Watch mode - rebuild on file changes
npm run build                # Build for production
npm run test                 # Run all tests
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests
npm run test:monetary        # Run monetary-specific tests
npm run test:watch           # Run tests in watch mode
npm run test:web             # Instructions for browser-based test UI
```

### Test Execution
- Tests can run in Node.js (via test runners) or browser (open `tests/run-tests.html`)
- Custom test framework built in `tests/test-framework.js`
- No external test dependencies required

## Architecture Overview

### Technology Stack
- **TypeScript** for type safety
- **esbuild** for fast bundling
- **Vanilla JavaScript** - no framework dependencies
- **dinero.js** for monetary calculations
- **Custom state management** with reactive patterns

### Project Structure
```
src/
├── components/
│   ├── header.ts              # App header component
│   ├── searchDialog.ts        # Search input and dialog UI
│   ├── resultsView.ts         # Search results display
│   ├── settingsView.ts        # Settings panel
│   ├── homeSkeleton.ts        # Loading skeleton states
│   ├── shortcutPill.ts        # Keyboard shortcut indicators
│   └── skeletonComponents.ts  # Reusable skeleton loaders
├── state/
│   ├── appState.ts            # Central application state
│   ├── store.ts               # State management utilities
│   └── settingsStore.ts       # Settings persistence
├── utils/
│   ├── query.ts               # Query parsing and validation
│   ├── monetary.ts            # Monetary query handling
│   ├── costCodeAssigner.ts    # Cost code logic
│   ├── relationshipEngine.ts  # Entity relationship matching
│   ├── time.ts                # Time/date utilities
│   ├── format.ts              # Text formatting utilities
│   └── highlight.ts           # Search term highlighting
├── data/
│   ├── searchService.ts       # Search execution logic
│   └── recentSearches.ts      # Recent search history
├── types.ts                   # Shared TypeScript types
└── main.ts                    # Application entry point
```

### Build Output
- Bundles to `public/assets/`
- ES modules format
- Source maps included
- CSS bundled inline

## Key Features

### Search Capabilities
- **Real-time search** with optimized debouncing:
  - 0ms for 1-2 characters (instant feedback)
  - 25ms for 3-4 characters
  - 75ms for 5-6 characters
  - 150ms for 7+ characters
- **Monetary queries** - special handling for queries starting with `$`
- **Relationship engine** - matches related entities
- **Recent searches** - persists search history
- **Search term highlighting** - cached for performance

### State Management
- Custom reactive state with observers
- Centralized app state in `appState.ts`
- Settings persistence in localStorage
- Type-safe state updates

### Component Architecture
- Vanilla TypeScript components (no framework)
- Functional component pattern
- Manual DOM manipulation for performance
- Event-driven architecture

## Development Guidelines

### Query Parsing
The query system (`utils/query.ts`) handles:
- Minimum effective query length validation
- Special character handling
- Monetary query detection (`$` prefix)
- Query normalization and trimming

### Monetary Queries
When query starts with `$`:
- Routes through monetary-specific logic
- Uses dinero.js for currency handling
- Special formatting and parsing rules
- Cost code assignment via `costCodeAssigner.ts`

### Relationship Engine
The relationship engine (`utils/relationshipEngine.ts`):
- Matches entities based on relationships
- Supports complex entity connections
- Used for enhanced search relevance

### Highlighting System
Search term highlighting (`utils/highlight.ts`):
- Caches highlighted results for performance
- Supports multiple search terms
- HTML-safe highlighting
- Clear cache function for memory management

### Testing Strategy
- Custom test framework (no Jest/Mocha dependencies)
- Unit tests for utilities and pure functions
- Integration tests for component interactions
- Monetary-specific test suite
- Browser and Node.js test execution

### Performance Optimizations
- Aggressive debouncing for search input
- Highlight result caching
- Skeleton loaders for perceived performance
- Minimal bundle size with esbuild
- ES modules for tree-shaking

## File Naming Conventions
- Component files: camelCase (e.g., `searchDialog.ts`)
- Utility files: camelCase (e.g., `monetary.ts`)
- State files: camelCase (e.g., `appState.ts`)
- Types: `types.ts` for shared definitions

## Browser Support
- Modern ES modules support required
- No transpilation for legacy browsers
- Native CSS custom properties
- Targets current evergreen browsers

## Design System
- Design tokens in `tokens.css`
- Global styles in `styles.css`
- CSS custom properties for theming
- Consistent spacing and typography scale
