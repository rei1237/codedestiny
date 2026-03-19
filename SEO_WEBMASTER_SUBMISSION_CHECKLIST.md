# CODE DESTINY Search Console Submission Checklist

This checklist is for immediate execution after deployment.

## 0) Pre-submit technical checks (must pass)

- [ ] `https://code-destiny.com/` returns `200`
- [ ] `https://code-destiny.com/sitemap.xml` returns `200` with XML body
- [ ] `https://code-destiny.com/robots.txt` returns `200` and includes `Sitemap: https://code-destiny.com/sitemap.xml`
- [ ] Locale landings return `200` (`/en-us`, `/ja-jp`, `/zh-cn`, `/es-es`, `/ms-my`)
- [ ] `view-source` contains canonical + hreflang tags

Quick checks (PowerShell):

```powershell
Invoke-WebRequest https://code-destiny.com/sitemap.xml -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest https://code-destiny.com/robots.txt -UseBasicParsing | Select-Object StatusCode,Content
Invoke-WebRequest https://code-destiny.com/en-us -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest https://code-destiny.com/ja-jp -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest https://code-destiny.com/zh-cn -UseBasicParsing | Select-Object StatusCode
```

---

## 1) Google Search Console (priority 1, required)

Property:
- Use **Domain property**: `code-destiny.com` (recommended)

Submit:
- [Google Search Console](https://search.google.com/search-console)
- Indexing > Sitemaps > Add sitemap: `https://code-destiny.com/sitemap.xml`

After submit:
- [ ] URL Inspection for `/`, `/en-us`, `/ja-jp`, `/zh-cn`
- [ ] URL Inspection for `/es-es`, `/ms-my`
- [ ] Request indexing for top landing pages
- [ ] Check International Targeting signals via hreflang report (if available in your account tools)

---

## 2) Bing Webmaster Tools (priority 2, Yahoo included)

- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- Add site `https://code-destiny.com`
- Submit sitemap: `https://code-destiny.com/sitemap.xml`
- [ ] Run Site Scan once
- [ ] Check crawl errors and blocked URLs

Note:
- Bing submission is also the practical submission route for Yahoo Search distribution.

---

## 2-1) Yahoo (Global + Japan) handling

- [Yahoo Help: submit your website](https://help.yahoo.com/kb/SLN2217.html)
- [ ] Treat Yahoo as covered by Google + Bing submissions
- [ ] Keep `robots.txt` sitemap declaration always valid
- [ ] Keep Japanese landing (`/ja-jp`) and English landing (`/en-us`) both indexable for Yahoo users

Practical rule:
- Yahoo global visibility follows Bing index.
- Yahoo Japan query demand is best served by strong Google indexation plus Japanese content quality.

---

## 3) Naver Search Advisor (KR priority)

- [Naver Search Advisor](https://searchadvisor.naver.com/)
- Register site `https://code-destiny.com`
- Submit sitemap: `https://code-destiny.com/sitemap.xml`
- Submit RSS if used: `https://code-destiny.com/rss.xml`
- [ ] Verify robots and mobile compatibility

---

## 4) Baidu Zhanzhang (CN priority)

- [Baidu Zhanzhang](https://ziyuan.baidu.com/)
- Add/verify `https://code-destiny.com`
- Submit sitemap: `https://code-destiny.com/sitemap.xml`
- [ ] Check ICP/host accessibility from mainland (if targeting CN deeply)
- [ ] Ensure simplified Chinese landing (`/zh-cn`) stays indexable

---

## 5) Re-submit schedule

- Day 0 (deploy): submit all engines
- Day 2: re-check crawl status + 4xx/5xx
- Day 7: re-submit sitemap once after first content updates
- Weekly: monitor indexed pages, Core Web Vitals, crawl anomalies

## 5-1) 1/2/3 execution snapshot

1. Re-submit sitemap now (Google + Bing)
2. Request indexing for Tier 1 URLs
3. Re-run `npm run seo:check` after 48 hours and compare status/index counts

---

## 6) Launch KPIs (first 30 days)

- Indexed pages count trend (weekly uptrend)
- Non-brand impressions/clicks for:
  - `zi wei dou shu free`
  - `korean astrology`
  - `무료 자미두수`
  - `四柱推命 無料`
  - `紫微斗数 免费`
- Locale page CTR: `/en-us`, `/ja-jp`, `/zh-cn`
- Crawl health: zero recurring 5xx on sitemap/robots
