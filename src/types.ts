export type SearchEntityType =
  | 'Document'
  | 'ClientInvoice'
  | 'PurchaseOrder'
  | 'Bill'
  | 'Receipt'
  | 'Payment';

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
  entityType: Exclude<SearchEntityType, 'Document'>;
  totalValue: number;
  issuedDate: string;
  dueDate?: string;
  lineItems: LineItem[];
}

export type SearchRecord = DocumentRecord | FinancialRecord;

export interface SearchGroup {
  entityType: SearchEntityType;
  items: SearchRecord[];
}

export type FacetKey =
  | 'entityType'
  | 'project'
  | 'status'
  | 'documentType'
  | 'client'
  | 'issuedDate'
  | 'totalValue';

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
}

export type ScreenRoute = 'home' | 'results' | 'settings';

export type FacetSelectionState = Partial<Record<FacetKey, Set<string>>>;

export interface SearchOptions {
  query: string;
  selections?: FacetSelectionState;
}
