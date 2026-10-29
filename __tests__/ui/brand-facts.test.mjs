import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_FACTS, findFormerBrandNames } from '../../lib/brand/brand-facts.mjs';
import { brandCopy } from '../../lib/seo/brand-copy.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = file => readFileSync(join(ROOT, file), 'utf8');
const { service, operator } = BRAND_FACTS;
const SITE_NAME_META = /<meta\s+(?:property|name)="(og:site_name|application-name|apple-mobile-web-app-title)"\s+content="([^"]*)"/g;

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) htmlFiles(file, out);
    else if (entry.name === 'index.html') out.push(file);
  }
  return out;
}

// FAQ 의 질문·답은 이력 문항을 담을 수 있어 뺀다. 이름·설명·제목 같은 신호 필드만 남는다.
function signalStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(item => signalStrings(item, out));
  else if (value && typeof value === 'object' && !['Question', 'Answer'].includes(value['@type'])) {
    Object.values(value).forEach(item => signalStrings(item, out));
  }
  return out;
}

test('brand facts keep the service, its alias and the operator apart', () => {
  assert.equal(service.name, '꿀꿀 운세');
  assert.deepEqual([...service.alternateNames], ['꿀꿀운세']);
  assert.equal(operator.name, 'CODE DESTINY');
  assert.equal(operator.nameKo, '코드 데스티니');
  assert.ok(Number.isInteger(BRAND_FACTS.version) && BRAND_FACTS.version >= 1);
  assert.match(BRAND_FACTS.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(BRAND_FACTS.sameAs.length, 5);
  for (const profile of BRAND_FACTS.sameAs) assert.match(profile.url, /^https:\/\//);
  assert.ok(!BRAND_FACTS.sameAs.some(profile => /pf\.kakao\.com/.test(profile.url)), 'Kakao channel is pending confirmation');
  for (const name of [service.name, ...service.alternateNames, operator.name]) {
    assert.deepEqual(findFormerBrandNames(name), [], name);
  }
  assert.ok(Object.isFrozen(BRAND_FACTS) && Object.isFrozen(BRAND_FACTS.service));
});

test('운세보는 영냥이 names the yeongnyangi service on its landing without becoming a site alias', () => {
  const yeongnyangi = BRAND_FACTS.characters.find(character => character.key === 'yeongnyangi');
  assert.equal(yeongnyangi.serviceName, '운세보는 영냥이');
  assert.ok(!service.alternateNames.includes(yeongnyangi.serviceName), 'service alias stays 꿀꿀운세 only');
  assert.ok(brandCopy('yeongnyangiTitle').startsWith(yeongnyangi.serviceName));
  const page = read('app/yeongnyangi/page.tsx');
  assert.ok(page.includes('buildServiceJsonLd({name:YEONGNYANGI.serviceName,alternateName:'), 'Service name');
  assert.ok(page.includes("buildBreadcrumbJsonLd([{name:BRAND_FACTS.service.name,path:'/'}"), 'breadcrumb home is /');
  const hero = read('app/yeongnyangi/_components/NightHero.tsx');
  const heading = hero.indexOf("brandCopy('yeongnyangiHeading')");
  assert.ok(heading >= 0 && heading < hero.indexOf("brandCopy('yeongnyangiServiceName')"), 'H1 keeps 사주보는 고양이 and names 운세보는 영냥이');
});

test('former names are detected exactly and never inside protected feature names', () => {
  for (const name of BRAND_FACTS.formerNames) assert.deepEqual(findFormerBrandNames(`예전 이름 ${name}`), [name]);
  for (const name of BRAND_FACTS.protectedNames) assert.deepEqual(findFormerBrandNames(name), []);
  assert.ok(findFormerBrandNames(BRAND_FACTS.historyKo).length > 0, 'history text names the former names');
});

test('public shells carry the official name in every site-name signal and no former name', () => {
  const files = ['index.html', ...htmlFiles('public')];
  let scanned = 0;
  for (const file of files) {
    const html = read(file);
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const signals = [title];
    for (const [, field, content] of html.matchAll(SITE_NAME_META)) {
      assert.equal(content, service.name, `${file}: ${field}`);
      signals.push(content);
    }
    for (const alias of service.alternateNames) {
      assert.ok(!title.trimEnd().endsWith(alias), `${file}: title suffix uses the alias "${alias}"`);
    }
    for (const [, body] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      signals.push(...signalStrings(JSON.parse(body)));
    }
    assert.deepEqual(findFormerBrandNames(signals.join('\n')), [], file);
    scanned += 1;
  }
  assert.ok(scanned >= 10, `only ${scanned} public shells were scanned`);
});

test('manifests, locale dictionaries, llms.txt, brand copy and mail never present a former name as current', () => {
  const manifests = [
    ...readdirSync(ROOT).filter(name => /^manifest.*\.json$/.test(name)),
    ...readdirSync(join(ROOT, 'public')).filter(name => /^manifest.*\.json$/.test(name)).map(name => `public/${name}`),
  ];
  assert.ok(manifests.length >= 4, 'manifest scan found too few files');
  for (const file of manifests) assert.deepEqual(findFormerBrandNames(read(file)), [], file);

  const dictionaries = readdirSync(join(ROOT, 'public/i18n')).filter(name => /^[a-z-]+\.json$/.test(name));
  assert.ok(dictionaries.length >= 12, 'dictionary scan found too few locales');
  for (const name of dictionaries) {
    const dictionary = JSON.parse(read(`public/i18n/${name}`));
    const fields = [dictionary.shell?.CODEDESTINY, ...Object.values(dictionary.seo || {})];
    assert.deepEqual(findFormerBrandNames(JSON.stringify(fields)), [], name);
  }

  // llms.txt·llms-full.txt 는 "## 이름 이력" 절에서만 과거 이름을 말한다.
  for (const file of ['llms.txt', 'public/llms.txt', 'llms-full.txt', 'public/llms-full.txt']) {
    const text = read(file);
    assert.ok(text.includes(BRAND_FACTS.historyKo), `${file}: history section`);
    assert.deepEqual(findFormerBrandNames(text.replace(/## 이름 이력[\s\S]*?(?=\n## )/, '')), [], file);
  }

  // 과거 이름은 brandHistory(BRAND_FACTS.historyKo)로만 들어온다. 문구 원본에 직접 적지 않는다.
  assert.deepEqual(findFormerBrandNames(read('lib/seo/brand-copy.mjs')), [], 'brand-copy');

  for (const file of ['worker/lib/email-marketing-template.js', 'worker/routes/email-marketing.js']) {
    const source = read(file);
    assert.deepEqual(findFormerBrandNames(source), [], file);
    assert.doesNotMatch(source, /\(구 /, `${file}: "(구 …)" self-reference`);
  }
  assert.match(read('worker/lib/email-marketing-template.js'), /\[꿀꿀 운세\]/);
});
