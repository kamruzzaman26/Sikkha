import { parseAffiliateUrl } from "./affiliate-url.mjs";
import {
  MAX_BOOK_IMPORT_BYTES,
  MAX_BOOK_IMPORT_ROWS,
} from "./book-import-limits.mjs";
import { parseProductImageUrl } from "./product-image-url.mjs";

export { MAX_BOOK_IMPORT_BYTES, MAX_BOOK_IMPORT_ROWS };

/**
 * @typedef {{
 *   rowNumber: number;
 *   bookName: string;
 *   affiliateUrl: string;
 *   imageUrl: string;
 *   status: "ready" | "invalid" | "duplicate";
 *   reasons: string[];
 *   partner: string | null;
 * }} ParsedBookImportRow
 */

/**
 * @param {string} csvText
 * @returns {{ records: Array<{rowNumber: number, values: string[]}>, error?: string }}
 */
function parseRecords(csvText) {
  /** @type {Array<{rowNumber: number, values: string[]}>} */
  const records = [];
  /** @type {string[]} */
  let values = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let recordLine = 1;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];

    if (quoted) {
      if (character === '"') {
        if (csvText[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += character;
        if (character === "\n") {
          line += 1;
        } else if (character === "\r" && csvText[index + 1] !== "\n") {
          line += 1;
        }
      }
      continue;
    }

    if (afterQuote && character !== "," && character !== "\r" && character !== "\n") {
      return {
        records: [],
        error: `CSV row ${recordLine}: closing quote-এর পরে অতিরিক্ত অক্ষর আছে।`,
      };
    }

    if (character === '"') {
      if (field.length !== 0 || afterQuote) {
        return {
          records: [],
          error: `CSV row ${recordLine}: quote সঠিকভাবে ব্যবহার করা হয়নি।`,
        };
      }
      quoted = true;
    } else if (character === ",") {
      values.push(field);
      field = "";
      afterQuote = false;
    } else if (character === "\r" || character === "\n") {
      values.push(field);
      if (values.some((value) => value !== "")) {
        records.push({ rowNumber: recordLine, values });
      }
      values = [];
      field = "";
      afterQuote = false;
      if (character === "\r" && csvText[index + 1] === "\n") {
        index += 1;
      }
      line += 1;
      recordLine = line;
    } else {
      field += character;
    }
  }

  if (quoted) {
    return {
      records: [],
      error: `CSV row ${recordLine}: অসমাপ্ত quoted field আছে।`,
    };
  }

  values.push(field);
  if (values.some((value) => value !== "")) {
    records.push({ rowNumber: recordLine, values });
  }

  return { records };
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizedName(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("bn");
}

/**
 * @param {string} csvText
 * @param {ReadonlyMap<string, string>} partnerByHostname
 * @returns {{ rows: ParsedBookImportRow[], error?: string }}
 */
export function prepareBookImportCsv(csvText, partnerByHostname) {
  if (typeof csvText !== "string" || csvText.length === 0) {
    return { rows: [], error: "একটি CSV ফাইল নির্বাচন করুন।" };
  }
  if (Buffer.byteLength(csvText, "utf8") > MAX_BOOK_IMPORT_BYTES) {
    return { rows: [], error: "CSV ফাইল 512 KiB-এর বেশি হতে পারবে না।" };
  }

  const parsed = parseRecords(csvText.replace(/^\uFEFF/, ""));
  if (parsed.error) {
    return { rows: [], error: parsed.error };
  }
  if (parsed.records.length < 2) {
    return { rows: [], error: "CSV ফাইলে header ও অন্তত একটি data row থাকতে হবে।" };
  }
  if (parsed.records.length - 1 > MAX_BOOK_IMPORT_ROWS) {
    return {
      rows: [],
      error: `একটি import-এ সর্বোচ্চ ${MAX_BOOK_IMPORT_ROWS}টি data row দেওয়া যাবে।`,
    };
  }

  const header = parsed.records[0].values;
  const expectedHeaders = ["book_name", "affiliate_url", "image_url"];
  if (
    header.length !== expectedHeaders.length ||
    new Set(header).size !== expectedHeaders.length ||
    expectedHeaders.some((name) => !header.includes(name))
  ) {
    return {
      rows: [],
      error: "CSV header-এ ঠিক book_name, affiliate_url, image_url কলাম থাকতে হবে।",
    };
  }

  const columnIndex = new Map(
    expectedHeaders.map((name) => [name, header.indexOf(name)]),
  );
  const allowedHostnames = new Set(partnerByHostname.keys());
  const rows = parsed.records.slice(1).map(({ rowNumber, values }) => {
    const bookName = values[columnIndex.get("book_name")] ?? "";
    const affiliateUrl = values[columnIndex.get("affiliate_url")] ?? "";
    const imageUrl = values[columnIndex.get("image_url")] ?? "";
    /** @type {string[]} */
    const reasons = [];
    let partner = null;
    let normalizedAffiliateUrl;

    if (values.length !== header.length) {
      reasons.push("কলামের সংখ্যা header-এর সঙ্গে মেলেনি।");
    }
    if (!bookName.trim()) {
      reasons.push("বইয়ের নাম খালি।");
    } else if (bookName.length > 200 || /[\u0000-\u001f\u007f]/u.test(bookName)) {
      reasons.push("বইয়ের নাম 200 অক্ষরের মধ্যে ও control character-মুক্ত হতে হবে।");
    }

    if (!affiliateUrl || /\s/u.test(affiliateUrl)) {
      reasons.push("Affiliate URL আবশ্যক; URL-এ whitespace রাখা যাবে না।");
    } else {
      normalizedAffiliateUrl = parseAffiliateUrl(
        affiliateUrl,
        allowedHostnames,
      );
      if (!normalizedAffiliateUrl) {
        reasons.push("Affiliate URL অবশ্যই অনুমোদিত partner-এর নিরাপদ HTTPS URL হতে হবে।");
      } else {
        try {
          partner =
            partnerByHostname.get(new URL(affiliateUrl).hostname.toLowerCase()) ??
            null;
        } catch {
          reasons.push("Affiliate URL সঠিকভাবে parse করা যায়নি।");
        }
      }
    }

    if (!imageUrl || /\s/u.test(imageUrl)) {
      reasons.push("Image URL আবশ্যক; URL-এ whitespace রাখা যাবে না।");
    } else if (!parseProductImageUrl(imageUrl)) {
      reasons.push("Image URL অবশ্যই নিরাপদ HTTPS URL হতে হবে।");
    }

    return {
      rowNumber,
      bookName,
      affiliateUrl,
      imageUrl,
      status: reasons.length === 0 ? "ready" : "invalid",
      reasons,
      partner,
      normalizedAffiliateUrl,
    };
  });

  const duplicateRows = new Set();
  const rowsByName = new Map();
  const rowsByUrl = new Map();
  for (const row of rows) {
    if (row.status !== "ready") {
      continue;
    }

    const nameKey = normalizedName(row.bookName);
    const urlKey = row.normalizedAffiliateUrl;
    for (const previousRow of rowsByName.get(nameKey) ?? []) {
      duplicateRows.add(previousRow);
      duplicateRows.add(row);
    }
    for (const previousRow of rowsByUrl.get(urlKey) ?? []) {
      duplicateRows.add(previousRow);
      duplicateRows.add(row);
    }
    rowsByName.set(nameKey, [...(rowsByName.get(nameKey) ?? []), row]);
    rowsByUrl.set(urlKey, [...(rowsByUrl.get(urlKey) ?? []), row]);
  }

  for (const row of duplicateRows) {
    row.status = "duplicate";
    row.reasons.push("এই CSV-তে একই নাম বা affiliate URL একাধিকবার আছে।");
  }

  return { rows };
}
