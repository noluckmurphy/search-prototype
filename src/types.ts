export type SearchEntityType =
  | 'Document'
  | 'ClientInvoice'
  | 'PurchaseOrder'
  | 'Bill'
  | 'Receipt'
  | 'Payment'
  | 'Person'
  | 'Organization';

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

export type SearchRecord =
  | DocumentRecord
  | FinancialRecord
  | PersonRecord
  | OrganizationRecord;

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
  | 'tradeFocus';

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

export interface SearchOptions {
  query: string;
  selections?: FacetSelectionState;
  isMonetarySearch?: boolean;
}
