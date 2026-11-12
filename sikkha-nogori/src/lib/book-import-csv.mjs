import { parseAffiliateUrl } from "./affiliate-url.mjs";
import { MAX_BOOK_IMPORT_BYTES, MAX_BOOK_IMPORT_ROWS } from "./book-import-limits.mjs";
import { parseProductImageUrl } from "./product-image-url.mjs";

export { MAX_BOOK_IMPORT_BYTES, MAX_BOOK_IMPORT_ROWS };

function parseRecords(csvText) {
  const records = [];
  let values = [], field = "", quoted = false, afterQuote = false;
  let line = 1, recordLine = 1;
  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    if (quoted) {
      if (character === '"') {
        if (csvText[index + 1] === '"') { field += '"'; index += 1; }
        else { quoted = false; afterQuote = true; }
      } else {
        field += character;
        if (character === "\n" || (character === "\r" && csvText[index + 1] !== "\n")) line += 1;
      }
      continue;
    }
    if (afterQuote && character !== "," && character !== "\r" && character !== "\n") {
      return { records: [], error: `CSV row ${recordLine}: closing quote-এর পরে অতিরিক্ত অক্ষর আছে।` };
    }
    if (character === '"') {
      if (field.length !== 0 || afterQuote) return { records: [], error: `CSV row ${recordLine}: quote সঠিকভাবে ব্যবহার করা হয়নি।` };
      quoted = true;
    } else if (character === ",") {
      values.push(field); field = ""; afterQuote = false;
    } else if (character === "\r" || character === "\n") {
      values.push(field);
      if (values.some((value) => value !== "")) records.push({ rowNumber: recordLine, values });
      values = []; field = ""; afterQuote = false;
      if (character === "\r" && csvText[index + 1] === "\n") index += 1;
      line += 1; recordLine = line;
    } else field += character;
  }
  if (quoted) return { records: [], error: `CSV row ${recordLine}: অসমাপ্ত quoted field আছে।` };
  values.push(field);
  if (values.some((value) => value !== "")) records.push({ rowNumber: recordLine, values });
  return { records };
}

function normalizedName(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("bn");
}
function splitNames(value) {
  return String(value ?? "").split("|").map((item) => item.trim()).filter(Boolean);
}
function validHttpsUrl(value) {
  return Boolean(value) && !/\s/u.test(value) && Boolean(parseProductImageUrl(value));
}
function parseBoolean(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true","yes","1","হ্যাঁ"].includes(normalized)) return true;
  if (["false","no","0","না",""].includes(normalized)) return false;
  return null;
}

/**
 * CSV supports the legacy book_name header and the expanded Smart Catalog format.
 * Multi-value author/category fields use | as a separator; category paths retain ›.
 */
export function prepareBookImportCsv(csvText, partnerByHostname) {
  if (typeof csvText !== "string" || csvText.length === 0) return { rows: [], error: "একটি CSV ফাইল নির্বাচন করুন।" };
  if (Buffer.byteLength(csvText, "utf8") > MAX_BOOK_IMPORT_BYTES) return { rows: [], error: "CSV ফাইল 512 KiB-এর বেশি হতে পারবে না।" };
  const parsed = parseRecords(csvText.replace(/^\uFEFF/, ""));
  if (parsed.error) return { rows: [], error: parsed.error };
  if (parsed.records.length < 2) return { rows: [], error: "CSV ফাইলে header ও অন্তত একটি data row থাকতে হবে।" };
  if (parsed.records.length - 1 > MAX_BOOK_IMPORT_ROWS) return { rows: [], error: `একটি import-এ সর্বোচ্চ ${MAX_BOOK_IMPORT_ROWS}টি data row দেওয়া যাবে।` };

  const header = parsed.records[0].values.map((value) => value.trim());
  if (new Set(header).size !== header.length) return { rows: [], error: "CSV header-এ একই কলাম একাধিকবার আছে।" };
  const nameHeader = header.includes("product_name") ? "product_name" : "book_name";
  const legacyBookCsv = nameHeader === "book_name" && !header.includes("sales_type");
  const required = [nameHeader, "image_url"];
  const missing = required.filter((name) => !header.includes(name));
  if (missing.length) return { rows: [], error: `CSV header-এ এই কলামগুলো আবশ্যক: ${missing.join(", ")}।` };
  const column = new Map(header.map((name, index) => [name, index]));
  const get = (values, key) => values[column.get(key)] ?? "";
  const allowedHostnames = new Set(partnerByHostname.keys());

  const rows = parsed.records.slice(1).map(({ rowNumber, values }) => {
    const productName = get(values, nameHeader);
    const productType = get(values, "product_type").trim() || (header.includes("instructor_names") ? "course" : "book");
    const salesType = get(values, "sales_type").trim().toLowerCase() || (legacyBookCsv || productType === "course" ? "affiliate" : "");
    const affiliateUrl = get(values, "affiliate_url");
    const imageUrl = get(values, "image_url");
    const reasons = [];
    let partner = null;
    if (values.length !== header.length) reasons.push("কলামের সংখ্যা header-এর সঙ্গে মেলেনি।");
    if (!productName.trim()) reasons.push("পণ্যের নাম খালি।");
    else if (productName.length > 200 || /[\u0000-\u001f\u007f]/u.test(productName)) reasons.push("পণ্যের নাম ২০০ অক্ষরের মধ্যে ও control character-মুক্ত হতে হবে।");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productType)) reasons.push("product_type অবশ্যই lowercase slug হতে হবে।");
    if (!["affiliate","direct"].includes(salesType)) reasons.push("sales_type অবশ্যই affiliate অথবা direct হতে হবে।");

    if (salesType === "affiliate") {
      if (!affiliateUrl || /\s/u.test(affiliateUrl)) reasons.push("Affiliate পণ্যের জন্য affiliate_url আবশ্যক।");
      else {
        const safeUrl = parseAffiliateUrl(affiliateUrl, allowedHostnames);
        if (!safeUrl) reasons.push("Affiliate URL অবশ্যই অনুমোদিত partner-এর নিরাপদ HTTPS URL হতে হবে।");
        else {
          try { partner = partnerByHostname.get(new URL(affiliateUrl).hostname.toLowerCase()) ?? null; }
          catch { reasons.push("Affiliate URL সঠিকভাবে parse করা যায়নি।"); }
        }
      }
    } else if (affiliateUrl.trim()) reasons.push("Direct পণ্যে affiliate_url ফাঁকা রাখতে হবে।");

    if (imageUrl && !validHttpsUrl(imageUrl)) reasons.push("Image URL অবশ্যই নিরাপদ HTTPS URL হতে হবে।");
    const salePrice = get(values, "sale_price").trim();
    const regularPrice = get(values, "price").trim();
    const price = get(values, "selling_price").trim() || salePrice || regularPrice;
    if (salesType === "direct" && !price) reasons.push("Direct পণ্যের selling_price আবশ্যক।");
    for (const field of ["selling_price","sale_price","price","cost_price","list_price","weight_kg"]) {
      const value = get(values, field).trim();
      if (value && (!/^\d+(?:\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)))) reasons.push(`${field} সঠিক সংখ্যা হতে হবে।`);
    }
    const pageCount = get(values, "page_count").trim();
    if (pageCount && (!/^\d+$/.test(pageCount) || Number(pageCount) < 1)) reasons.push("page_count ধনাত্মক পূর্ণসংখ্যা হতে হবে।");
    if (get(values, "description").length > 5000) reasons.push("Description সর্বোচ্চ ৫০০০ অক্ষর হতে পারবে।");
    const bestseller = parseBoolean(get(values, "bestseller"));
    if (bestseller === null) reasons.push("bestseller ঘরে true/false অথবা yes/no দিন।");

    const categories = splitNames(get(values, "category_paths"));
    const authors = splitNames(get(values, "author_names"));
    const publishers = splitNames(get(values, "publisher_name"));
    const brands = splitNames(get(values, "brand_name"));
    const instructors = splitNames(get(values, "instructor_names"));
    const slug = get(values, "slug").trim();
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) reasons.push("slug lowercase letters, numbers ও hyphen দিয়ে লিখতে হবে।");
    const primaryCategory = get(values, "primary_category").trim();
    if (primaryCategory && !categories.includes(primaryCategory)) reasons.push("primary_category অবশ্যই category_paths-এর একটি হতে হবে.");

    return {
      rowNumber, bookName: productName, productName, affiliateUrl, imageUrl,
      productType, salesType, slug, description: get(values,"description"),
      authors, publishers, brands, instructors, categories, primaryCategory,
      isbn: get(values,"isbn"), edition: get(values,"edition"),
      pageCount: pageCount || "", language: get(values,"language"),
      country: get(values,"country"), weightKg: get(values,"weight_kg"),
      costPrice: get(values,"cost_price"), sellingPrice: price,
      listPrice: get(values,"list_price").trim() || (salePrice ? regularPrice : ""), bestseller: bestseller === true,
      status: reasons.length ? "invalid" : "ready", reasons, partner,
    };
  });

  const duplicateRows = new Set(), names = new Map(), urls = new Map(), slugs = new Map();
  for (const row of rows) {
    if (row.status !== "ready") continue;
    const keys = [[names, normalizedName(row.productName)], ...(row.affiliateUrl ? [[urls,row.affiliateUrl]] : []), ...(row.slug ? [[slugs,row.slug]] : [])];
    for (const [map,key] of keys) {
      for (const previous of map.get(key) ?? []) { duplicateRows.add(previous); duplicateRows.add(row); }
      map.set(key,[...(map.get(key) ?? []),row]);
    }
  }
  for (const row of duplicateRows) { row.status = "duplicate"; row.reasons.push("এই CSV-তে একই নাম, slug বা affiliate URL একাধিকবার আছে।"); }
  return { rows };
}
