/**
 * Submits sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver, etc.).
 * Run after deploy: npm run seo:indexnow
 */

import { getAllSitemapUrls } from "../lib/seo-site-urls";
import { submitIndexNowUrls } from "../lib/indexnow";

/** IndexNow allows up to 10,000 URLs per request. */
const BATCH_SIZE = 10_000;

async function main() {
  const urls = getAllSitemapUrls();
  const extra =
    process.env.INDEXNOW_EXTRA_URLS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const all = [...urls, ...extra];

  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const chunk = all.slice(i, i + BATCH_SIZE);
    const res = await submitIndexNowUrls(chunk);
    const body = await res.text();
    const batchNo = Math.floor(i / BATCH_SIZE) + 1;
    console.log(
      `[IndexNow] batch ${batchNo}: ${res.status} ${res.statusText}${body ? ` — ${body}` : ""}`,
    );
    if (!res.ok) {
      process.exit(1);
    }
  }

  console.log(`[IndexNow] OK: submitted ${all.length} URL(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
