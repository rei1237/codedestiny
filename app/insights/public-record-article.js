import { publicRecordCopy, PUBLIC_RECORD_PATH } from '../../lib/seo/public-record-copy.mjs';
const c = publicRecordCopy.ko;
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
export const PUBLIC_RECORD_ARTICLE = {
  slug: PUBLIC_RECORD_PATH.split('/').filter(Boolean).at(-1),
  title: c.heading, metaTitle: c.title, description: c.description,
  ogImage: '/og/presidential-public-records.png',
  featuredImage: { url: '/og/presidential-public-records.png', alt: c.heading, width: 1200, height: 630 },
  category: '사주', author: 'Code Destiny 편집팀',
  publishedAt: '2026-10-05', updatedAt: '2026-10-05', useOriginalContent: true,
  keywords: ['대통령 사주', '정치인 사주', '박병하', '네오', '꿀꿀 사주'],
  targetRoute: '/ggulggul/',
  faq: c.faqs,
  internalLinks: [{href:'/insights/famous-saju/',label:c.famous},{href:'/ggulggul/',label:c.home},{href:'/yeongnyangi/',label:c.cat}],
  contentHtml: `<p><strong>${c.lead}</strong></p><p>${c.author}</p><p>${c.scope}</p><p>${c.provenance}</p>
<table><thead><tr>${c.columns.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${c.rows.map(r=>`<tr><td><time datetime="${r.date}">${r.date}</time></td><td><a href="${r.url}">${esc(r.title)}</a></td><td>${esc(r.summary)}</td><td><a href="${r.source}">${esc(r.event)}</a></td><td>${esc(r.timing)}</td><td>${esc(r.method)}</td></tr>`).join('')}</tbody></table>
<h2>${c.criteriaHeading}</h2><p>${c.criteria}</p><p>${c.interval}</p>
<h2>${c.readingHeading}</h2><p>${c.reading}</p><p>${c.citation} <a href="${c.rows[1].url}">분석 원문</a> · <a href="${c.rows[1].source}">헌법재판소 결정</a></p><p>${c.limitation}</p>
<h2>${c.faqHeading}</h2>${c.faqs.map(f=>`<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')}
<p><a href="/insights/famous-saju/">${c.famous}</a> · <a href="/ggulggul/">${c.home}</a> · <a href="/yeongnyangi/">${c.cat}</a></p>`,
};
