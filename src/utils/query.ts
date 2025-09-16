export const MIN_EFFECTIVE_QUERY_LENGTH = 2;

/**
 * Calculates the number of characters that should count toward the search length
 * requirement. We ignore whitespace so people cannot satisfy the minimum with
 * a space, and we ignore the dollar sign because monetary searches always
 * begin with it.
 */
export function getEffectiveQueryLength(query: string): number {
  if (!query) {
    return 0;
  }

  return query
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .length;
}

export function isQueryTooShort(query: string): boolean {
  const effectiveLength = getEffectiveQueryLength(query);
  return effectiveLength > 0 && effectiveLength < MIN_EFFECTIVE_QUERY_LENGTH;
}
