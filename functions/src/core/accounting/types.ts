export type JournalLineInput = {
  accountId: string;
  debitCents?: number;
  creditCents?: number;
  description?: string | null;
  currencyCode?: string;
  branchId?: string | null;
};

export type CreateJournalEntryInput = {
  id?: string;
  storeId?: string | null;
  entryDate?: string;
  documentType?: string | null;
  documentId?: string | null;
  sourceContext?: Record<string, unknown> | null;
  memo?: string | null;
  createdByUid?: string | null;
  lines: JournalLineInput[];
};

export type PostingRuleMatchInput = {
  documentType: string;
  eventKey: string;
  storeId?: string | null;
};
