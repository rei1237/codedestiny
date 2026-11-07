// CMS ns "home-copy" 발행본을 꿀꿀 홈 정적 셸(public/**/index.html 산출물)에만 적용한다.
//
// - ggulggul-hero : 셸의 data-cms="home-copy:ggulggul-hero:<필드>" 요소 글자를 바꾼다.
// - concern-offer : 무료 결과 화면(js/core/saju/concern-answer.js)이 읽는 JSON 스크립트 #cdConcernCopy 를 싣는다.
// 템플릿 원본·루트 index.html·build-home-funnel --check 대상은 건드리지 않는다. sync:public 이 셸을 다시 만든 뒤에 돈다.
// 수정값이 없으면 기본 문장으로 되돌리고 스크립트를 걷어내므로 몇 번을 돌려도 같은 결과다(멱등).
// 웹툰(entry-webtoon)은 React 가 cmsRecordFlat 으로 직접 읽으므로 여기서 다루지 않는다.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homeCopyDefaults } from '../lib/cms/home-copy.mjs';

const NS = 'home-copy';
const BANNED = /적중|1위|최고|100%|1년 전/;
const MAX_LENGTH = 2000;
const SCRIPT_ID = 'cdConcernCopy';
const SCRIPT_RE = new RegExp(`<script type="application/json" id="${SCRIPT_ID}">[\\s\\S]*?</script>`);
const HERO_RE = /(<([a-z][a-z0-9]*)\b[^>]*\sdata-cms="home-copy:ggulggul-hero:([\w-]+)"[^>]*>)([^<]*)(<\/\2>)/g;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 발행본에서 entry 별 { 필드: 문장 } 을 뽑는다. 기본값에 없는 필드·빈 값·금칙어·기본값과 같은 값은 버린다. */
export function homeCopyOverrides(entries) {
  const defaults = homeCopyDefaults();
  const result = {};
  for (const key of ['ggulggul-hero', 'concern-offer']) {
    const record = entries?.[NS]?.[key]?.record;
    const picked = {};
    if (record && typeof record === 'object') {
      for (const [field, row] of Object.entries(record)) {
        if (!Object.hasOwn(defaults[key], field)) continue;
        const text = row && typeof row === 'object' ? row.text : row;
        if (typeof text !== 'string' || !text.trim() || text.length > MAX_LENGTH || BANNED.test(text)) continue;
        if (text === defaults[key][field]) continue;
        picked[field] = text;
      }
    }
    result[key] = picked;
  }
  return result;
}

/** 셸 HTML 한 벌에 수정값을 적용한다. */
export function applyHomeCopyToHtml(html, entries) {
  const overrides = homeCopyOverrides(entries);
  const hero = { ...homeCopyDefaults()['ggulggul-hero'], ...overrides['ggulggul-hero'] };
  let next = html.replace(HERO_RE, (whole, open, _tag, field, _text, close) =>
    Object.hasOwn(hero, field) ? open + escapeHtml(hero[field]) + close : whole);

  next = next.replace(SCRIPT_RE, '');
  if (Object.keys(overrides['concern-offer']).length && next.includes('</head>')) {
    // 문구 안의 < 가 </script 로 읽히지 않게 이스케이프한다.
    const json = JSON.stringify(overrides['concern-offer']).replace(/</g, '\\u003c');
    next = next.replace('</head>', () => `<script type="application/json" id="${SCRIPT_ID}">${json}</script></head>`);
  }
  return next;
}

/** public/index.html 과 public/<dir>/index.html 중 꿀꿀 홈 셸을 담은 것. */
export function homeShellFiles(rootDir = process.cwd()) {
  const publicDir = resolve(rootDir, 'public');
  const files = [resolve(publicDir, 'index.html')];
  if (existsSync(publicDir)) {
    for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
      if (entry.isDirectory()) files.push(resolve(publicDir, entry.name, 'index.html'));
    }
  }
  return files.filter((file) => existsSync(file) && readFileSync(file, 'utf8').includes('data-yh-home'));
}

export function applyHomeCopy({ rootDir = process.cwd(), entries } = {}) {
  const source = entries ?? JSON.parse(readFileSync(resolve(rootDir, 'app/_content/cms.generated.json'), 'utf8')).entries;
  const changed = [];
  for (const file of homeShellFiles(rootDir)) {
    const html = readFileSync(file, 'utf8');
    const next = applyHomeCopyToHtml(html, source);
    if (next !== html) {
      writeFileSync(file, next);
      changed.push(file);
    }
  }
  console.log(`[apply-home-copy] ${changed.length ? `updated ${changed.length} shell(s)` : 'no changes'}`);
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) applyHomeCopy();
