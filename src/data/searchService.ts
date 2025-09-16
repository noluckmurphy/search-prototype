import corpusJson from './search_corpus.json';
import {
  FacetKey,
  FacetSelectionState,
  FacetValue,
  SearchEntityType,
  SearchGroup,
  SearchOptions,
  SearchRecord,
  SearchResponse,
} from '../types';
import { settingsStore } from '../state/settingsStore';

const GROUP_ORDER: SearchEntityType[] = [
  'Document',
  'ClientInvoice',
  'PurchaseOrder',
  'Bill',
  'Receipt',
  'Payment',
];

const FACET_KEYS: FacetKey[] = [
  'entityType',
  'project',
  'status',
  'documentType',
  'client',
  'issuedDate',
  'totalValue',
];

const CORPUS: SearchRecord[] = (corpusJson as SearchRecord[]).map((record) => normalizeRecord(record));

function normalizeRecord(record: SearchRecord): SearchRecord {
  return {
    ...record,
    tags: record.tags ?? [],
    metadata: record.metadata ?? {},
    ...(record.entityType === 'Document'
      ? { documentType: record.documentType }
      : {
          lineItems: record.lineItems ?? [],
        }),
  } as SearchRecord;
}

function buildHaystack(record: SearchRecord): string {
  const base = [
    record.title,
    record.summary,
    record.project,
    record.client,
    record.status,
    record.tags.join(' '),
    ...Object.values(record.metadata ?? {}).map((value) => (value == null ? '' : String(value))),
  ];

  if (record.entityType !== 'Document') {
    const financialRecord = record as Extract<SearchRecord, { entityType: Exclude<SearchEntityType, 'Document'> }>;
    financialRecord.lineItems.forEach((item) => {
      base.push(item.lineItemTitle, item.lineItemDescription, item.lineItemType);
    });
  }

  return base
    .filter((chunk) => Boolean(chunk))
    .join(' ')
    .toLowerCase();
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function matchesQuery(record: SearchRecord, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return true;
  }

  const haystack = buildHaystack(record);
  return tokens.every((token) => haystack.includes(token));
}

function matchesSelections(record: SearchRecord, selections?: FacetSelectionState): boolean {
  if (!selections) {
    return true;
  }

  for (const key of Object.keys(selections) as FacetKey[]) {
    const values = selections[key];
    if (!values || values.size === 0) {
      continue;
    }

    const facetValue = getFacetValue(record, key);
    if (!facetValue || !values.has(facetValue)) {
      return false;
    }
  }

  return true;
}

function getFacetValue(record: SearchRecord, key: FacetKey): string | undefined {
  switch (key) {
    case 'entityType':
      return record.entityType;
    case 'project':
      return record.project;
    case 'status':
      return record.status;
    case 'documentType':
      return record.entityType === 'Document' ? record.documentType : undefined;
    case 'client':
      return record.client;
    case 'issuedDate':
      return record.entityType === 'Document' ? undefined : (record as any).issuedDate;
    case 'totalValue':
      if (record.entityType === 'Document') {
        return undefined;
      }
      return bucketTotal((record as any).totalValue);
    default:
      return undefined;
  }
}

function bucketTotal(total: number): string {
  if (total < 10000) return '< $10k';
  if (total < 50000) return '$10k–$50k';
  if (total < 100000) return '$50k–$100k';
  return '$100k+';
}

function computeFacets(records: SearchRecord[]): Partial<Record<FacetKey, FacetValue[]>> {
  const facetMaps: Partial<Record<FacetKey, Map<string, number>>> = {};

  for (const key of FACET_KEYS) {
    facetMaps[key] = new Map<string, number>();
  }

  records.forEach((record) => {
    for (const key of FACET_KEYS) {
      const value = getFacetValue(record, key);
      if (!value) {
        continue;
      }

      const map = facetMaps[key];
      if (!map) {
        continue;
      }

      map.set(value, (map.get(value) ?? 0) + 1);
    }
  });

  const facets: Partial<Record<FacetKey, FacetValue[]>> = {};

  for (const key of FACET_KEYS) {
    const map = facetMaps[key];
    if (!map || map.size === 0) {
      continue;
    }

    const values = Array.from(map.entries())
      .map(([value, count]) => ({ key, value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    facets[key] = values;
  }

  return facets;
}

function sortByRecency(records: SearchRecord[]): SearchRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function filterRecords({ query, selections }: SearchOptions): SearchRecord[] {
  return sortByRecency(
    CORPUS.filter(
      (record) => matchesQuery(record, query) && matchesSelections(record, selections),
    ),
  );
}

function buildGroups(records: SearchRecord[]): SearchGroup[] {
  const map = new Map<SearchEntityType, SearchRecord[]>();
  GROUP_ORDER.forEach((type) => map.set(type, []));

  records.forEach((record) => {
    if (!map.has(record.entityType)) {
      map.set(record.entityType, []);
    }
    map.get(record.entityType)!.push(record);
  });

  return GROUP_ORDER.map((entityType) => ({
    entityType,
    items: map.get(entityType) ?? [],
  })).filter((group) => group.items.length > 0);
}

function applyGroupLimits(groups: SearchGroup[], limits: Record<string, number>): SearchGroup[] {
  return groups
    .map((group) => {
      const limit = limits[group.entityType] ?? limits['Document'] ?? 4;
      return {
        entityType: group.entityType,
        items: group.items.slice(0, Math.max(0, limit)),
      } satisfies SearchGroup;
    })
    .filter((group) => group.items.length > 0);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    globalThis.setTimeout(resolve, ms);
  });
}

export async function runSearch(
  options: SearchOptions,
  overrides?: {
    delayMs?: number;
    groupLimits?: Record<string, number>;
  },
): Promise<SearchResponse> {
  const settings = settingsStore.getState();
  const delay = overrides?.delayMs ?? settings.searchDelayMs;
  const groupLimits = overrides?.groupLimits ?? settings.groupLimits;

  const records = filterRecords(options);
  const facets = computeFacets(records);
  const fullGroups = buildGroups(records);
  const limitedGroups = applyGroupLimits(fullGroups, groupLimits);

  await wait(delay);

  return {
    query: options.query,
    totalResults: records.length,
    limitedGroups,
    fullGroups,
    facets,
    records,
  };
}

export function getCorpus(): SearchRecord[] {
  return [...CORPUS];
}
