export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getPublicSiteOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error(
      "Site URL is not configured: set NEXT_PUBLIC_SITE_URL to the canonical public origin.",
    );
  }

  try {
    const parsedUrl = new URL(siteUrl);
    const isLocalhost =
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "[::1]";
    if (
      (parsedUrl.protocol !== "https:" &&
        !(isLocalhost && parsedUrl.protocol === "http:")) ||
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.pathname !== "/" ||
      parsedUrl.search ||
      parsedUrl.hash
    ) {
      throw new Error();
    }

    return parsedUrl.origin;
  } catch {
    throw new Error(
      "Invalid site URL: NEXT_PUBLIC_SITE_URL must be a canonical HTTPS origin (HTTP is allowed for localhost).",
    );
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL in .env.local and restart the development server.",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local and restart the development server.",
    );
  }

  if (!publishableKey.startsWith("sb_publishable_")) {
    throw new Error(
      "Invalid Supabase publishable key: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be an sb_publishable_ key.",
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "Invalid Supabase URL: NEXT_PUBLIC_SUPABASE_URL must be a valid https://<project-ref>.supabase.co URL.",
    );
  }

  return { url, publishableKey };
}
