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

## 1) Google Search Console (priority 1)

Property:
- Use **Domain property**: `code-destiny.com` (recommended)

Submit:
- [Google Search Console](https://search.google.com/search-console)
- Indexing > Sitemaps > Add sitemap: `https://code-destiny.com/sitemap.xml`

After submit:
- [ ] URL Inspection for `/`, `/en-us`, `/ja-jp`, `/zh-cn`
- [ ] Request indexing for top landing pages
- [ ] Check International Targeting signals via hreflang report (if available in your account tools)

---

## 2) Bing Webmaster Tools (priority 2)

- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- Add site `https://code-destiny.com`
- Submit sitemap: `https://code-destiny.com/sitemap.xml`
- [ ] Run Site Scan once
- [ ] Check crawl errors and blocked URLs

Note:
- Bing feeds Yahoo global search partnerships in several regions, so this is high-value.

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
