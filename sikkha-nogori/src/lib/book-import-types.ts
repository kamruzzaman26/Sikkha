export type BookImportRowStatus = "ready" | "invalid" | "duplicate" | "imported" | "failed";
export type BookImportRowResult = {
  rowNumber: number;
  bookName: string;
  affiliateUrl: string;
  imageUrl: string;
  productType?: string;
  salesType?: string;
  authors?: string[];
  publishers?: string[];
  brands?: string[];
  instructors?: string[];
  categories?: string[];
  bestseller?: boolean;
  status: BookImportRowStatus;
  reasons: string[];
};
export type BookImportActionResult = { error?: string; rows: BookImportRowResult[] };
