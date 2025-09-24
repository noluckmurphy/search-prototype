import { SearchEntityType } from '../types';

const ENTITY_LABELS: Record<SearchEntityType, { singular: string; plural: string }> = {
  Document: { singular: 'Document', plural: 'Documents' },
  DailyLog: { singular: 'Daily Log', plural: 'Daily Logs' },
  ClientInvoice: { singular: 'Client Invoice', plural: 'Client Invoices' },
  PurchaseOrder: { singular: 'Purchase Order', plural: 'Purchase Orders' },
  Bill: { singular: 'Bill', plural: 'Bills' },
  Receipt: { singular: 'Receipt', plural: 'Receipts' },
  Payment: { singular: 'Payment', plural: 'Payments' },
  Person: { singular: 'Person', plural: 'People' },
  Organization: { singular: 'Organization', plural: 'Organizations' },
  Buildertrend: { singular: 'Buildertrend', plural: 'Buildertrend' },
};

export function formatEntityType(type: SearchEntityType, options?: { plural?: boolean }): string {
  const label = ENTITY_LABELS[type];
  if (!label) {
    return type;
  }
  return options?.plural ? label.plural : label.singular;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  if (amount == null || isNaN(amount)) {
    return '$0';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
