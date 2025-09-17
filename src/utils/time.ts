/**
 * Utility functions for time formatting and pretty printing
 */

export interface TimeAgoOptions {
  includeSeconds?: boolean;
  compact?: boolean;
}

/**
 * Calculate the difference between two timestamps and return a pretty "time ago" string
 */
export function timeAgo(timestamp: number, options: TimeAgoOptions = {}): string {
  const { includeSeconds = false, compact = false } = options;
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 0) {
    return 'just now';
  }
  
  // Less than a minute
  if (diff < 60 * 1000) {
    if (includeSeconds) {
      const seconds = Math.floor(diff / 1000);
      return compact ? `${seconds}s` : seconds <= 1 ? 'just now' : `${seconds} seconds ago`;
    }
    return 'just now';
  }
  
  // Less than an hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return compact ? `${minutes}m` : minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  
  // Less than a day
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return compact ? `${hours}h` : hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  
  // Less than a week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return compact ? `${days}d` : days === 1 ? '1 day ago' : `${days} days ago`;
  }
  
  // Less than a month
  if (diff < 30 * 24 * 60 * 60 * 1000) {
    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    return compact ? `${weeks}w` : weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  // Less than a year
  if (diff < 365 * 24 * 60 * 60 * 1000) {
    const months = Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
    return compact ? `${months}mo` : months === 1 ? '1 month ago' : `${months} months ago`;
  }
  
  // Years
  const years = Math.floor(diff / (365 * 24 * 60 * 60 * 1000));
  return compact ? `${years}y` : years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format a timestamp as a readable date string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (dateOnly.getTime() === today.getTime()) {
    return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  
  // More than 2 days ago, show the date
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  });
}

/**
 * Check if a timestamp is recent (within the last hour)
 */
export function isRecent(timestamp: number, thresholdMs: number = 60 * 60 * 1000): boolean {
  return Date.now() - timestamp < thresholdMs;
}
