// Keyword research for Korean Naver/Google search.
//   node scripts/seo/keyword-research.mjs collect   autocomplete expansion (no key)
//   node scripts/seo/keyword-research.mjs enrich    Naver search-ad volume + Naver search doc counts (keys in .env.local)
//   node scripts/seo/keyword-research.mjs report    classify, assign one canonical URL, write CSV
// Volumes are never estimated: a keyword without API data keeps empty volume cells.
import { createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

const OUT_DIR = 'docs/seo/keyword-research-2026-10';
const CACHE_DIR = '.cache/keyword-research';
const COLLECTED = path.join(CACHE_DIR, 'collected.json');
const ENRICHED = path.join(CACHE_DIR, 'enriched.json');

// Product and system nouns taken from worker/lib/paid-feature-registry.js, SERVICE_INVENTORY.md and llms.txt.
// `core: true` seeds also get Korean initial-consonant expansion.
export const SEEDS = [
  ['사주', true], ['사주풀이', true], ['무료사주', true], ['만세력', true], ['사주팔자', true], ['오행'], ['십신'],
  ['용신'], ['대운'], ['세운'], ['일주'], ['일간'], ['도화살'], ['홍염살'], ['역마살'], ['천을귀인'], ['신살'],
  ['사주 궁합', true], ['궁합', true], ['결혼 궁합'], ['띠 궁합'], ['이름 궁합'], ['생년월일 궁합'],
  ['연애운', true], ['재회운', true], ['재회 타로'], ['속마음 타로'], ['짝사랑 타로'], ['썸 타로'], ['결혼운'],
  ['결혼 시기'], ['배우자 사주'], ['인연'], ['재물운'], ['금전운'], ['직업운'], ['취업운'], ['이직운'], ['시험운'],
  ['신년운세', true], ['2027 신년운세', true], ['2027 운세'], ['정미년 운세'], ['토정비결', true],
  ['오늘의 운세', true], ['내일의 운세', true], ['띠별 운세', true], ['별자리 운세', true], ['주간 운세'],
  ['월간 운세'], ['이번달 운세'], ['11월 운세'], ['12월 운세'],
  ['자미두수', true], ['자미두수 명반'], ['명궁'], ['숙요점', true], ['숙요 궁합'], ['본명숙'],
  ['베다 점성술', true], ['인도 점성술'], ['나크샤트라'], ['라그나'], ['점성술', true], ['출생차트'],
  ['네이탈 차트'], ['상승궁'], ['달 별자리'], ['금성 별자리'], ['휴먼디자인'],
  ['타로', true], ['무료 타로', true], ['타로 카드'], ['오늘의 타로'], ['연애 타로'], ['타로 사이트'],
  ['꿈해몽', true], ['태몽'], ['돈 꿈'], ['관상', true], ['얼굴 관상'], ['손금', true],
  ['작명', true], ['아기 이름'], ['개명'], ['이름 풀이'], ['성명학'], ['택일'], ['결혼 택일'], ['이사 택일'],
  ['주역'], ['룬 점'], ['오미쿠지'], ['화투점'], ['마야력'], ['수비학'],
  ['운세 사이트'], ['사주 사이트', true], ['사주 잘보는곳'], ['사주 상담'], ['온라인 사주'], ['사주 ai', true],
  ['ai 사주'], ['ai 타로'], ['챗gpt 사주'], ['사주 프롬프트', true], ['천원 사주'], ['평생 사주'], ['인생 총운'],
  ['연예인 사주'], ['반려동물 사주'], ['강아지 사주'], ['고양이 사주'], ['십이운성'], ['동물점'],
  ['심리테스트'], ['연애 심리테스트'], ['mbti 궁합'], ['바람기 테스트'], ['전생'], ['카르마'], ['붉은 실'],
];
export const MODIFIERS = ['무료', '사이트', '보는법', '계산기', '뜻', '테스트', 'ai', '프롬프트', '2027', '궁합', '잘보는곳', '어플'];
const JAMO = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

// Homonyms, competitor brands, community/portal navigation and adult intent are never targeted.
const EXCLUDE = [
  /관상(동맥|어)|관상 ?영화|용신(중|호|동|양말|목)|올스테드|청소부|무직전생|대운(하|산|각|식당|동회|을 잡아라)|양자택일|택일(적|하다|비승)|손금(산입|주|불산입)|사줘|쿠폰|다시보기|드라마|웹툰|가사|노래|아파트|호텔|식당/,
  /김사주|신한|무당손녀|척척|갑술|플러스만세력|원광|점신|포스텔러|헬로우봇|사주도령|사주아이|에깊|림버스|중앙일보|조선일보|국민은행|하나은행|농협|우리은행|카카오|네이버|토스|티몬|쿠팡/,
  /디시|더쿠|네이트판|인스티즈|에펨|펨코|블라인드|지식인|나무위키|위키/,
  /속궁합|섹스|19금|야한/,
  // Media titles, games, food and goods that share a fortune noun.
  /결말|줄거리|명대사|촬영지|단종|세조|수양대군|배우(?!자)|ost|원곡|ott|출시일|사전예약|인벤|라운지|애니|소설|외전|히로인|살인사건|라그나로크|토르|도요 라그나|라그나 크림슨|전생(슬|검신|기|한|체험 후기)|마도전생|예토전생|중기사|은하의 점성술|슬픈 ?인연|나미/,
  /타로 ?(토란|버블티|밀크티|고구마|채소|카페인|파우더|빵|케이크|라떼|영화)|버블티|러쉬|서도호|팔찌|오행산|명궁(관|약수|칼국수)|서산 명궁|한정식/,
  // Other operators, offline/phone services, legal procedures, maker tools and medical timing.
  /지윤철학원|백운산|고고 별자리|수잔 ?밀러|평생사주닷컴|박대희|푸망|먼작귀|치이카와|철학관|철학원|전화|060|만들기|개명 ?(절차|신청|허가|서류)|개명허가|제왕절개|출산 ?택일/,
  /서울|부산|대구|인천|광주|대전|울산|수원|일산|분당|강남|홍대|신촌|종로|해운대|창원|청주|전주|천안|제주|성남|용인|순천|군산|서산/,
];
export const isExcluded = keyword => EXCLUDE.some(re => re.test(keyword));

// First match wins. Keeps the one-URL-per-keyword-group table in docs/seo/2026-10-18-search-rebuild.md.
export const URL_RULES = [
  [/프롬프트|챗 ?gpt|지피티/, '/fortune/prompt-hub/'],
  [/천원/, '/yeongnyangi/1000-won-fortune/'],
  [/영냥이|사주.*고양이|고양이.*사주/, '/yeongnyangi/'],
  [/꽃돼지|꿀꿀/, '/'],
  [/신년|토정비결|2027|정미년|새해/, '/new-year-ai-consultation/'],
  [/만세력|천을귀인|대운|세운|사주팔자 ?(계산|조회|확인)|일주 ?(계산|확인|조회)/, '/manse/'],
  [/십신|십성|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인/, '/saju/ten-gods/'],
  [/오행|용신|목화토금수/, '/saju/five-elements/'],
  [/십이운성|동물점/, '/saju/animal-destiny/'],
  [/자미두수|명반|명궁 ?(뜻|보는|사주|자리)/, '/ziwei/'],
  [/숙요|본명숙|27수/, '/sukuyo/'],
  [/나크샤트라/, '/nakshatra/'],
  [/베다|베딕|인도 ?점성|라그나|다샤|조티시/, '/vedic/'],
  [/휴먼 ?디자인/, '/human-design/'],
  [/점성술|출생 ?차트|네이탈|상승궁|달 ?별자리|금성 ?별자리|하우스/, '/astrology/'],
  [/(오늘|내일|주간|이번 ?주|월간|이번 ?달|\d+월).*(운세)|띠별|별자리 ?운세|(쥐|소|호랑이|토끼|용|뱀|말|양|원숭이|닭|개|돼지)띠 ?운세/, '/fortune/'],
  [/재회/, '/love/'],
  [/궁합/, '/compatibility/'],
  [/연애|짝사랑|썸|결혼 ?(운|시기)|배우자|인연/, '/love/'],
  [/타로/, '/tarot/'],
  [/꿈|해몽|태몽/, '/dream/'],
  [/손금/, '/palm-reading/'],
  [/관상/, '/physiognomy/'],
  [/작명|이름|개명|성명학/, '/naming-ai/'],
  [/택일/, '/nakshatra/muhurta/'],
  [/룬/, '/oracle/rune/'],
  [/화투/, '/oracle/hwatu-life/'],
  [/마야/, '/maya/'],
  [/바람기|바람끼/, '/relationship-boundary-test/'],
  [/mbti/, '/animal/mbti/'],
  [/심리 ?테스트/, '/psychotest/'],
  [/연예인|아이돌|유명인/, '/insights/famous-saju/'],
  [/카르마|업보|붉은 ?실|전생 ?(테스트|사주|궁합|보기|무료)/, '/karma-destiny-ai/'],
  [/평생|총운|인생/, '/life-book-ai/'],
  [/사주|운세/, '/saju/'],
];
export const assignUrl = keyword => URL_RULES.find(([re]) => re.test(keyword))?.[1] ?? '';

const INFO = /뜻|보는 ?법|종류|특징|차이|징조|의미|해석|읽는 ?법|계산법/;
export const intentOf = keyword =>
  INFO.test(keyword) ? 'I' : /사이트|잘 ?보는 ?곳|어플|앱|계산기|무료|테스트|보기|확인|조회|ai/.test(keyword) ? 'T' : 'M';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
const squash = s => s.replace(/\s+/g, '').toLowerCase();

async function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : fallback;
}

async function naverSuggest(q) {
  const url = `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(q)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&q_enc=UTF-8&st=100`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`naver ac ${res.status}`);
  return ((await res.json()).items?.[0] ?? []).map(item => item[0]);
}

async function googleSuggest(q) {
  const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&gl=kr&q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`google suggest ${res.status}`);
  return JSON.parse(await res.text())[1] ?? [];
}

async function pool(items, size, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) { const item = items[i++]; await fn(item); }
  }));
}

async function collect() {
  const state = await readJson(COLLECTED, { queried: {}, keywords: {} });
  const queries = [];
  for (const [seed, core] of SEEDS) {
    queries.push(seed, ...MODIFIERS.filter(m => !seed.includes(m)).map(m => `${seed} ${m}`));
    if (core) queries.push(...JAMO.map(j => `${seed} ${j}`));
  }
  const run = async list => {
    const todo = list.filter(q => !state.queried[q]);
    let done = 0;
    await pool(todo, 4, async q => {
      const out = {};
      for (const [engine, fn] of [['naver', naverSuggest], ['google', googleSuggest]]) {
        try { out[engine] = await fn(q); } catch { out[engine] = null; }
        await sleep(120);
      }
      state.queried[q] = out;
      for (const engine of ['naver', 'google']) {
        for (const raw of out[engine] ?? []) {
          const k = norm(raw);
          if (!k || k.length < 2) continue;
          const row = (state.keywords[k] ??= { naver: false, google: false, from: q });
          row[engine] = true;
        }
      }
      if (++done % 200 === 0) {
        console.log(`  ${done}/${todo.length}`);
        await writeFile(COLLECTED, JSON.stringify(state));
      }
    });
  };
  await mkdir(CACHE_DIR, { recursive: true });
  console.log(`depth 1: ${queries.length} queries`);
  await run(queries);
  // Depth 2: re-expand what the bare seeds suggested, so second-order long tails surface.
  const depth2 = [...new Set(SEEDS.flatMap(([seed]) =>
    [...(state.queried[seed]?.naver ?? []), ...(state.queried[seed]?.google ?? [])].map(norm)))]
    .filter(k => !isExcluded(k));
  console.log(`depth 2: ${depth2.length} queries`);
  await run(depth2);
  await writeFile(COLLECTED, JSON.stringify(state));
  const failed = Object.values(state.queried).filter(v => v.naver === null || v.google === null).length;
  console.log(`keywords: ${Object.keys(state.keywords).length}, queries: ${Object.keys(state.queried).length}, partial failures: ${failed}`);
}

function requireEnv(names) {
  const missing = names.filter(n => !process.env[n]);
  if (missing.length) throw new Error(`Missing in .env.local: ${missing.join(', ')}`);
}

const parseCount = v => (typeof v === 'number' ? v : /</.test(String(v)) ? 5 : Number(v) || 0);

async function searchAd(hints) {
  const ts = String(Date.now());
  const uri = '/keywordstool';
  const sig = createHmac('sha256', process.env.NAVER_SEARCHAD_SECRET_KEY).update(`${ts}.GET.${uri}`).digest('base64');
  const qs = new URLSearchParams({ hintKeywords: hints.join(','), showDetail: '1' });
  const res = await fetch(`https://api.searchad.naver.com${uri}?${qs}`, {
    headers: {
      'X-Timestamp': ts, 'X-API-KEY': process.env.NAVER_SEARCHAD_ACCESS_LICENSE,
      'X-Customer': process.env.NAVER_SEARCHAD_CUSTOMER_ID, 'X-Signature': sig,
    },
  });
  if (res.status === 429) { await sleep(3000); return searchAd(hints); }
  if (!res.ok) throw new Error(`searchad ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).keywordList ?? [];
}

async function docCount(query, type) {
  const res = await fetch(`https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=1`, {
    headers: { 'X-Naver-Client-Id': process.env.NAVER_OPENAPI_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_OPENAPI_CLIENT_SECRET },
  });
  if (res.status === 429) { await sleep(2000); return docCount(query, type); }
  if (!res.ok) throw new Error(`openapi ${type} ${res.status}`);
  return (await res.json()).total ?? null;
}

async function enrich() {
  config({ path: '.env.local', quiet: true });
  requireEnv(['NAVER_SEARCHAD_CUSTOMER_ID', 'NAVER_SEARCHAD_ACCESS_LICENSE', 'NAVER_SEARCHAD_SECRET_KEY',
    'NAVER_OPENAPI_CLIENT_ID', 'NAVER_OPENAPI_CLIENT_SECRET']);
  const collected = await readJson(COLLECTED, null);
  if (!collected) throw new Error('Run collect first');
  const state = await readJson(ENRICHED, { observedAt: null, volume: {}, related: {}, docs: {} });
  state.observedAt = new Date().toISOString();
  const candidates = Object.keys(collected.keywords).filter(k => !isExcluded(k) && assignUrl(k));
  // The search-ad tool rejects spaces and accepts five hints per call.
  const pending = [...new Set(candidates.map(squash))].filter(k => !(k in state.volume) && k.length <= 25);
  console.log(`volume: ${pending.length} keywords`);
  for (let i = 0; i < pending.length; i += 5) {
    const batch = pending.slice(i, i + 5);
    try {
      const list = await searchAd(batch);
      for (const row of list) {
        const key = squash(row.relKeyword);
        const entry = { pc: parseCount(row.monthlyPcQcCnt), mobile: parseCount(row.monthlyMobileQcCnt), compIdx: row.compIdx ?? '' };
        if (batch.includes(key)) state.volume[key] = entry;
        else if (!isExcluded(row.relKeyword) && assignUrl(row.relKeyword)) state.related[key] = { ...entry, keyword: row.relKeyword };
      }
      for (const key of batch) state.volume[key] ??= null; // not returned by the tool: stays unknown, not zero
    } catch (err) { console.warn(`  batch ${i}: ${err.message}`); }
    if (i % 100 === 0) { console.log(`  ${i}/${pending.length}`); await writeFile(ENRICHED, JSON.stringify(state)); }
    await sleep(250);
  }
  // Doc counts only for keywords with measured demand, to stay well inside the 25,000/day quota.
  const withDemand = [
    ...candidates.filter(k => (state.volume[squash(k)]?.pc ?? 0) + (state.volume[squash(k)]?.mobile ?? 0) >= 50),
    ...Object.values(state.related).filter(r => r.pc + r.mobile >= 50).map(r => r.keyword),
  ];
  const docTodo = [...new Set(withDemand.map(norm))].filter(k => !(k in state.docs));
  console.log(`docs: ${docTodo.length} keywords`);
  let n = 0;
  await pool(docTodo, 3, async k => {
    try { state.docs[k] = { blog: await docCount(k, 'blog'), web: await docCount(k, 'webkr') }; }
    catch (err) { console.warn(`  ${k}: ${err.message}`); }
    if (++n % 200 === 0) { console.log(`  ${n}/${docTodo.length}`); await writeFile(ENRICHED, JSON.stringify(state)); }
    await sleep(150);
  });
  await writeFile(ENRICHED, JSON.stringify(state));
  console.log('enriched');
}

const csvCell = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

async function report() {
  const collected = await readJson(COLLECTED, null);
  if (!collected) throw new Error('Run collect first');
  const enriched = await readJson(ENRICHED, { volume: {}, related: {}, docs: {} });
  const rows = new Map();
  const add = (keyword, source) => {
    const k = norm(keyword);
    if (isExcluded(k)) return;
    const row = rows.get(k) ?? { keyword: k, sources: new Set() };
    source.forEach(s => row.sources.add(s));
    rows.set(k, row);
  };
  for (const [k, v] of Object.entries(collected.keywords)) add(k, [v.naver && 'naver-ac', v.google && 'google-ac'].filter(Boolean));
  for (const r of Object.values(enriched.related)) add(r.keyword, ['searchad-related']);

  const out = [];
  for (const row of rows.values()) {
    const url = assignUrl(row.keyword);
    if (!url) continue;
    const vol = enriched.volume[squash(row.keyword)] ?? enriched.related[squash(row.keyword)] ?? null;
    const total = vol ? vol.pc + vol.mobile : null;
    const docs = enriched.docs[row.keyword] ?? null;
    out.push({
      keyword: row.keyword, url, intent: intentOf(row.keyword), evidence: [...row.sources].join('+'),
      pc: vol?.pc ?? null, mobile: vol?.mobile ?? null, total, compIdx: vol?.compIdx ?? '',
      blogDocs: docs?.blog ?? null, webDocs: docs?.web ?? null,
      saturation: total && docs?.blog != null ? +(docs.blog / total).toFixed(2) : null,
    });
  }
  // Niche threshold: bottom quartile of saturation among keywords with at least 100 monthly searches.
  const sats = out.filter(r => r.total >= 100 && r.saturation != null && r.total < 10000).map(r => r.saturation).sort((a, b) => a - b);
  const p25 = sats.length ? sats[Math.floor(sats.length * 0.25)] : null;
  for (const r of out) {
    r.tier = r.total == null ? (r.evidence.includes('naver-ac') && r.evidence.includes('google-ac') ? 'S2' : 'S1')
      : r.total >= 10000 ? 'H'
      : r.total >= 100 && p25 != null && r.saturation != null && r.saturation <= p25 ? 'N'
      : r.intent === 'I' && r.total >= 50 ? 'L'
      : r.total >= 100 ? 'M' : 'W';
  }
  const order = { H: 0, N: 1, L: 2, M: 3, S2: 4, W: 5, S1: 6 };
  out.sort((a, b) => order[a.tier] - order[b.tier] || (b.total ?? 0) - (a.total ?? 0) || a.keyword.localeCompare(b.keyword, 'ko'));
  const cols = ['tier', 'keyword', 'url', 'intent', 'total', 'pc', 'mobile', 'compIdx', 'blogDocs', 'webDocs', 'saturation', 'evidence'];
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, 'keywords.csv'), '﻿' + [cols.join(','), ...out.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n'));
  const count = out.reduce((acc, r) => ({ ...acc, [r.tier]: (acc[r.tier] ?? 0) + 1 }), {});
  await writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), volumeObservedAt: enriched.observedAt ?? null, saturationP25: p25,
    tiers: count, rows: out.length,
  }, null, 2));
  console.log({ rows: out.length, p25, tiers: count });
}

const cmd = process.argv[2];
const commands = { collect, enrich, report };
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('keyword-research.mjs')) {
  if (!commands[cmd]) { console.error('usage: keyword-research.mjs <collect|enrich|report>'); process.exit(1); }
  commands[cmd]().catch(err => { console.error(err.message); process.exit(1); });
}
