import { chromium } from "playwright";

const baseUrl = (process.env.BASE_URL || "https://sikkha-nogori.vercel.app").replace(/\/$/, "");
const routes = ["/", "/books", "/courses", "/blog", "/cart", "/checkout", "/login"];
const failures = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const pageErrors = [];

page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.locator("body").waitFor({ state: "visible", timeout: 15000 });
    const bodyText = (await page.locator("body").innerText()).trim();

    if (!response || response.status() >= 500) {
      failures.push(`${route}: HTTP ${response?.status() ?? "no response"}`);
    }
    if (!bodyText) failures.push(`${route}: empty page body`);
    if (/application error|internal server error|500 - server error/i.test(bodyText)) {
      failures.push(`${route}: server error content rendered`);
    }

    console.log(`${response?.status() ?? "NO_RESPONSE"} ${route} ${page.url()}`);
  }

  // Exercise an actual in-site navigation from the home page.
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  const booksLink = page.locator('a[href^="/books"]').first();
  if (await booksLink.count()) {
    await booksLink.click();
    await page.waitForURL((url) => url.pathname.startsWith("/books"), { timeout: 15000 });
    console.log("PASS homepage → books navigation");
  } else {
    failures.push("Homepage has no books navigation link");
  }

  if (pageErrors.length) {
    failures.push(...pageErrors.map((message) => `browser runtime error: ${message}`));
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("\nBrowser smoke test failures:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("\nBrowser route smoke tests passed.");
}
