// Parses an indented Markdown-style list into a category tree.
//
//   - বই বিভাগ | my-slug
//     - উপবিভাগ
//       - আরও ভেতরে
//
// Rules: one category per line; nesting by indentation (2 spaces or a tab);
// optional "| slug" suffix; bullets (-, *, +) are optional.

export const MAX_LINES = 200;
export const MAX_NAME_LENGTH = 120;

export function slugifyAscii(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug.slice(0, 160) : null;
}

export function isValidSlug(value) {
  return (
    typeof value === "string" &&
    value.length <= 160 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function parseCategoryMarkdown(text) {
  const items = [];
  const errors = [];
  const stack = []; // { indent, index }
  const lines = String(text).replace(/\r/g, "").split("\n");
  let counted = 0;

  for (let lineNo = 0; lineNo < lines.length; lineNo += 1) {
    const raw = lines[lineNo];
    if (raw.trim() === "") continue;

    counted += 1;
    if (counted > MAX_LINES) {
      errors.push(`একবারে সর্বোচ্চ ${MAX_LINES}টি লাইন দেওয়া যাবে।`);
      break;
    }

    const expanded = raw.replace(/\t/g, "  ");
    const indent = expanded.length - expanded.trimStart().length;
    let body = expanded.trim().replace(/^[-*+]\s+/, "");

    let slug = null;
    const pipe = body.indexOf("|");
    if (pipe !== -1) {
      const candidate = body.slice(pipe + 1).trim();
      body = body.slice(0, pipe).trim();
      if (candidate !== "") {
        if (!isValidSlug(candidate)) {
          errors.push(
            `লাইন ${lineNo + 1}: slug শুধু ছোট ইংরেজি অক্ষর, সংখ্যা ও হাইফেন হতে পারে।`,
          );
          continue;
        }
        slug = candidate;
      }
    }

    const name = body.trim();
    if (name === "" || name.length > MAX_NAME_LENGTH) {
      errors.push(
        `লাইন ${lineNo + 1}: নাম খালি বা ${MAX_NAME_LENGTH} অক্ষরের বেশি।`,
      );
      continue;
    }

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    if (stack.length === 0 && indent > 0 && items.length === 0) {
      errors.push(`লাইন ${lineNo + 1}: প্রথম লাইনে ইন্ডেন্ট থাকবে না।`);
      continue;
    }

    const parent = stack.length > 0 ? stack[stack.length - 1].index : null;
    const depth = stack.length;
    if (depth > 6) {
      errors.push(`লাইন ${lineNo + 1}: খুব গভীর স্তর।`);
      continue;
    }

    const index = items.length;
    items.push({ name, slug, depth, parent });
    stack.push({ indent, index });
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push("কোনো ক্যাটাগরি পাওয়া যায়নি।");
  }

  return { items, errors };
}

// Picks a slug that is unique inside the group. `taken` is mutated.
export function pickSlug({ preferred, name, group, taken }) {
  const base = preferred ?? slugifyAscii(name);
  if (base) {
    let candidate = base;
    let n = 2;
    while (taken.has(candidate)) {
      candidate = `${base}-${n}`.slice(0, 160);
      n += 1;
    }
    taken.add(candidate);
    return candidate;
  }

  let n = 1;
  while (taken.has(`${group}-${n}`)) n += 1;
  const candidate = `${group}-${n}`;
  taken.add(candidate);
  return candidate;
}
