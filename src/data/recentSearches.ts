/**
 * Recent searches storage and management
 */

import { timeAgo } from '../utils/time';

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  resultCount?: number;
}

const STORAGE_KEY = 'search-prototype-recent-searches';
const MAX_STORED_SEARCHES = 100;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 1000; // Don't record searches within 1 second of each other

class RecentSearchesManager {
  private searches: RecentSearch[] = [];
  private lastRecordedTime = 0;
  private lastRecordedQuery = '';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add a new search to recent searches
   * Only records "complete" queries, not partial keystrokes
   */
  addSearch(query: string, resultCount?: number): void {
    const trimmed = query.trim();
    
    // Don't record empty or very short queries
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return;
    }
    
    // Don't record if it's the same query as the last one within the debounce window
    const now = Date.now();
    if (trimmed === this.lastRecordedQuery && now - this.lastRecordedTime < DEBOUNCE_MS) {
      return;
    }
    
    // Create new search entry
    const search: RecentSearch = {
      id: this.generateId(),
      query: trimmed,
      timestamp: now,
      resultCount,
    };
    
    // Remove any existing search with the same query (to avoid duplicates)
    this.searches = this.searches.filter(s => s.query !== trimmed);
    
    // Add to beginning of array (most recent first)
    this.searches.unshift(search);
    
    // Trim to max stored searches
    if (this.searches.length > MAX_STORED_SEARCHES) {
      this.searches = this.searches.slice(0, MAX_STORED_SEARCHES);
    }
    
    // Update tracking
    this.lastRecordedTime = now;
    this.lastRecordedQuery = trimmed;
    
    // Save to storage
    this.saveToStorage();
  }

  /**
   * Get recent searches, optionally limited to a specific count
   */
  getRecentSearches(limit?: number): RecentSearch[] {
    return limit ? this.searches.slice(0, limit) : [...this.searches];
  }

  /**
   * Clear all recent searches
   */
  clearAll(): void {
    this.searches = [];
    this.lastRecordedTime = 0;
    this.lastRecordedQuery = '';
    this.saveToStorage();
  }

  /**
   * Remove a specific search by ID
   */
  removeSearch(id: string): void {
    this.searches = this.searches.filter(s => s.id !== id);
    this.saveToStorage();
  }

  /**
   * Get searches formatted for display with time ago strings and result count metadata
   */
  getFormattedRecentSearches(limit?: number): Array<RecentSearch & { timeAgo: string; resultCountText: string }> {
    return this.getRecentSearches(limit).map(search => ({
      ...search,
      timeAgo: timeAgo(search.timestamp),
      resultCountText: this.formatResultCount(search.resultCount),
    }));
  }

  /**
   * Format result count with proper pluralization
   */
  private formatResultCount(count?: number): string {
    if (count === undefined || count === null) {
      return '';
    }
    
    if (count === 0) {
      return 'No results';
    } else if (count === 1) {
      return '1 result';
    } else {
      return `${count.toLocaleString()} results`;
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the stored data structure
        if (Array.isArray(parsed)) {
          this.searches = parsed.filter(item => 
            item && 
            typeof item === 'object' && 
            typeof item.id === 'string' && 
            typeof item.query === 'string' && 
            typeof item.timestamp === 'number'
          );
        }
      }
    } catch (error) {
      console.warn('Failed to load recent searches from storage:', error);
      this.searches = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.searches));
    } catch (error) {
      console.warn('Failed to save recent searches to storage:', error);
    }
  }

  private generateId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const recentSearches = new RecentSearchesManager();
