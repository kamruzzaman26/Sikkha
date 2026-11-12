const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;

function findEndOfCentralDirectory(view) {
  const min = Math.max(0, view.byteLength - 22 - 65535);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("XLSX ZIP directory পাওয়া যায়নি।");
}

function readZipEntries(buffer) {
  const view = new DataView(buffer);
  const end = findEndOfCentralDirectory(view);
  const count = view.getUint16(end + 10, true);
  const directoryOffset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map();
  let offset = directoryOffset;
  let total = 0;

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("XLSX ZIP entry সঠিক নয়।");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error("XLSX-এর কোনো অংশ নির্ধারিত সীমার চেয়ে বড়।");
    total += uncompressedSize;
    if (total > MAX_TOTAL_BYTES) throw new Error("XLSX ফাইলটি আনজিপ করার পর অতিরিক্ত বড় হয়ে যাচ্ছে।");
    entries.set(name, { method, compressedSize, uncompressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readZipEntry(buffer, entry) {
  const view = new DataView(buffer);
  const offset = entry.localOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) throw new Error("XLSX ফাইলের local header সঠিক নয়।");
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const start = offset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(buffer, start, entry.compressedSize);
  if (entry.method === 0) return new TextDecoder().decode(compressed);
  if (entry.method !== 8) throw new Error("এই XLSX compression format সমর্থিত নয়।");
  if (typeof DecompressionStream === "undefined") throw new Error("এই Browser-এ XLSX পড়ার সুবিধা নেই। Chrome-এর হালনাগাদ সংস্করণ ব্যবহার করুন।");
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  if (bytes.byteLength !== entry.uncompressedSize || bytes.byteLength > MAX_ENTRY_BYTES) throw new Error("XLSX-এর decompressed data যাচাই করা যায়নি।");
  return new TextDecoder().decode(bytes);
}

function parseXml(source, label) {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.querySelector("parsererror")) throw new Error(`XLSX-এর ${label} অংশটি সঠিক XML নয়।`);
  return document;
}

function localName(element) {
  return element.localName || element.nodeName.split(":").pop();
}

function columnIndex(reference) {
  const letters = String(reference).match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return 0;
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function normalizeTarget(target) {
  const parts = [];
  for (const part of target.replace(/^\//, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

/** Convert the first worksheet of a standard .xlsx workbook to CSV in-browser. */
export async function xlsxToCsv(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 22) throw new Error("XLSX ফাইলটি খালি বা অসম্পূর্ণ।");
  const entries = readZipEntries(buffer);
  const getText = async (name, required = false) => {
    const entry = entries.get(name);
    if (!entry) {
      if (required) throw new Error(`XLSX ফাইলে ${name} পাওয়া যায়নি।`);
      return "";
    }
    return readZipEntry(buffer, entry);
  };

  const workbook = parseXml(await getText("xl/workbook.xml", true), "workbook");
  const relationships = parseXml(await getText("xl/_rels/workbook.xml.rels", true), "relationships");
  const firstSheet = Array.from(workbook.getElementsByTagNameNS("*", "sheet"))[0];
  if (!firstSheet) throw new Error("XLSX workbook-এ কোনো worksheet নেই।");
  const relationshipId = firstSheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  const relationship = Array.from(relationships.getElementsByTagNameNS("*", "Relationship"))
    .find((item) => item.getAttribute("Id") === relationshipId);
  if (!relationship) throw new Error("প্রথম worksheet-এর path পাওয়া যায়নি।");
  const target = relationship.getAttribute("Target");
  const sheetPath = target.startsWith("/") ? normalizeTarget(target) : normalizeTarget(`xl/${target}`);
  const sheet = parseXml(await getText(sheetPath, true), "worksheet");
  const sharedSource = await getText("xl/sharedStrings.xml");
  const shared = sharedSource
    ? Array.from(parseXml(sharedSource, "shared strings").getElementsByTagNameNS("*", "si"))
      .map((item) => Array.from(item.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").join(""))
    : [];

  const rows = [];
  for (const row of Array.from(sheet.getElementsByTagNameNS("*", "row"))) {
    const cells = new Map();
    for (const cell of Array.from(row.children).filter((item) => localName(item) === "c")) {
      const index = columnIndex(cell.getAttribute("r"));
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "inlineStr") {
        value = Array.from(cell.getElementsByTagNameNS("*", "t")).map((node) => node.textContent ?? "").join("");
      } else {
        const valueNode = Array.from(cell.children).find((item) => localName(item) === "v");
        value = valueNode?.textContent ?? "";
        if (type === "s") value = shared[Number(value)] ?? "";
        else if (type === "b") value = value === "1" ? "true" : "false";
      }
      cells.set(index, value);
    }
    const max = Math.max(-1, ...cells.keys());
    if (max >= 0) {
      const values = Array.from({ length: max + 1 }, (_, index) => cells.get(index) ?? "");
      rows.push(values.map(csvEscape).join(","));
    }
  }
  if (!rows.length) throw new Error("প্রথম worksheet-এ কোনো data পাওয়া যায়নি।");
  return rows.join("\r\n");
}
