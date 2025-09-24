export type SearchEntityType =
  | 'Document'
  | 'ClientInvoice'
  | 'PurchaseOrder'
  | 'Bill'
  | 'Receipt'
  | 'Payment'
  | 'Person'
  | 'Organization'
  | 'Buildertrend'
  | 'DailyLog';

export type LineItemType = 'Labor' | 'Material' | 'Subcontractor' | 'Other';

export interface LineItem {
  lineItemId: string;
  lineItemTitle: string;
  lineItemDescription: string;
  lineItemQuantity: number;
  lineItemQuantityUnitOfMeasure: string;
  lineItemUnitPrice: number;
  lineItemTotal: number;
  lineItemType: LineItemType;
  // Cost code metadata
  costCode?: string; // The code number (e.g., "1000")
  costCodeName?: string; // The full name (e.g., "1000 - Permits")
  costCodeCategory?: string; // The category ID (e.g., "1000-1999")
  costCodeCategoryName?: string; // The category name (e.g., "1000 - 1999 Preparation Preliminaries")
  // Metadata to mark which fields are monetary for search purposes
  fieldMetadata?: {
    lineItemTitle: 'monetary' | 'non-monetary';
    lineItemDescription: 'monetary' | 'non-monetary';
    lineItemQuantity: 'monetary' | 'non-monetary';
    lineItemQuantityUnitOfMeasure: 'monetary' | 'non-monetary';
    lineItemUnitPrice: 'monetary' | 'non-monetary';
    lineItemTotal: 'monetary' | 'non-monetary';
    lineItemType: 'monetary' | 'non-monetary';
  };
}

export interface SearchRecordBase {
  id: string;
  entityType: SearchEntityType;
  title: string;
  summary: string;
  project: string;
  client: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  tags: string[];
  metadata: Record<string, string | number | boolean | null>;
}

export interface DocumentRecord extends SearchRecordBase {
  entityType: 'Document';
  documentType: string;
  author: string;
}

export interface FinancialRecord extends SearchRecordBase {
  entityType: 'ClientInvoice' | 'PurchaseOrder' | 'Bill' | 'Receipt' | 'Payment';
  totalValue: number;
  issuedDate: string;
  dueDate?: string;
  lineItems: LineItem[];
  // Metadata to mark which fields are monetary for search purposes
  fieldMetadata?: {
    title: 'monetary' | 'non-monetary';
    summary: 'monetary' | 'non-monetary';
    totalValue: 'monetary' | 'non-monetary';
  };
}

export type PersonType = 'Client' | 'Contact';

export interface PersonRecord extends SearchRecordBase {
  entityType: 'Person';
  personType: PersonType;
  jobTitle: string;
  associatedOrganization?: string;
  email: string;
  phone: string;
  location: string;
  tradeFocus?: string;
}

export type OrganizationType = 'Subcontractor' | 'Vendor';

export interface OrganizationRecord extends SearchRecordBase {
  entityType: 'Organization';
  organizationType: OrganizationType;
  tradeFocus: string;
  serviceArea: string;
  primaryContact: string;
  phone: string;
  email: string;
  website?: string;
}

export interface BuildertrendRecord extends SearchRecordBase {
  entityType: 'Buildertrend';
  path: string;
  description: string;
  icon: string;
  url: string;
  triggerQueries: string[];
}

export interface DailyLogRecord extends SearchRecordBase {
  entityType: 'DailyLog';
  logDate: string; // ISO date string
  author: string; // Person who created the log
  weatherConditions?: {
    description: string; // "Partly cloudy with isolated showers"
    temperature: {
      current: number; // 76
      low: number; // 58
      unit: 'F' | 'C'; // 'F'
    };
    wind: {
      speed: number; // 10
      unit: 'mph' | 'kmh'; // 'mph'
    };
    humidity: number; // 97 (percentage)
    precipitation: {
      total: number; // 0
      unit: 'in' | 'mm'; // 'in'
    };
    timestamp: string; // When weather was recorded
  };
  weatherNotes?: string;
  structuredNotes: {
    progress?: string;
    issues?: string;
    materialsDelivered?: string;
    additional?: string; // For other custom note sections
  };
  attachments: string[]; // Array of attachment IDs/names
}

export type SearchRecord =
  | DocumentRecord
  | FinancialRecord
  | PersonRecord
  | OrganizationRecord
  | BuildertrendRecord
  | DailyLogRecord;

export function isFinancialRecord(record: SearchRecord): record is FinancialRecord {
  return (
    record.entityType === 'ClientInvoice' ||
    record.entityType === 'PurchaseOrder' ||
    record.entityType === 'Bill' ||
    record.entityType === 'Receipt' ||
    record.entityType === 'Payment'
  );
}

export function isPersonRecord(record: SearchRecord): record is PersonRecord {
  return record.entityType === 'Person';
}

export function isOrganizationRecord(record: SearchRecord): record is OrganizationRecord {
  return record.entityType === 'Organization';
}

export function isBuildertrendRecord(record: SearchRecord): record is BuildertrendRecord {
  return record.entityType === 'Buildertrend';
}

export function isDailyLogRecord(record: SearchRecord): record is DailyLogRecord {
  return record.entityType === 'DailyLog';
}

export interface SearchGroup {
  entityType: SearchEntityType;
  items: SearchRecord[];
  groupTitle?: string;
}

export type FacetKey =
  | 'entityType'
  | 'project'
  | 'status'
  | 'documentType'
  | 'client'
  | 'issuedDate'
  | 'totalValue'
  | 'groupBy'
  | 'personType'
  | 'contactOrganization'
  | 'organizationType'
  | 'tradeFocus'
  | 'costCodeCategory'
  | 'costCode';

export interface FacetValue {
  key: FacetKey;
  value: string;
  count: number;
}

export interface FacetSelection {
  key: FacetKey;
  value: string;
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  limitedGroups: SearchGroup[];
  fullGroups: SearchGroup[];
  facets: Partial<Record<FacetKey, FacetValue[]>>;
  records: SearchRecord[];
  isGrouped: boolean;
}

export type ScreenRoute = 'home' | 'results' | 'settings';

export type FacetSelectionState = Partial<Record<FacetKey, Set<string>>>;

export type SortOption = 'relevance' | 'mostRecent' | 'dueFirst' | 'dueLast';

export interface SearchOptions {
  query: string;
  selections?: FacetSelectionState;
  isMonetarySearch?: boolean;
}
