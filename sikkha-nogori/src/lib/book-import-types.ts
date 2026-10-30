export type BookImportRowStatus =
  | "ready"
  | "invalid"
  | "duplicate"
  | "imported"
  | "failed";

export type BookImportRowResult = {
  rowNumber: number;
  bookName: string;
  affiliateUrl: string;
  imageUrl: string;
  status: BookImportRowStatus;
  reasons: string[];
};

export type BookImportActionResult = {
  error?: string;
  rows: BookImportRowResult[];
};
