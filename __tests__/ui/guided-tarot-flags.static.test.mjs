import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 공통 스텝 플로우 이관(3c-A1) 롤백 스위치 계약: 흐름마다 코드 상수 하나, 끄면 이관 전 컴포넌트가 그대로 돈다.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('흐름별 롤백 플래그는 boolean 코드 상수다', async () => {
  const flags = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof flags.GUIDED_DAILY_TAROT_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_HEALING_TAROT_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_FREE_SAJU_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_WEBTOON_RESULT_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_BIRTH_FREE_SAJU_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_BIRTH_STAR_HUG_ENABLED, 'boolean');
  assert.equal(typeof flags.GUIDED_BIRTH_INPUT_V2_ENABLED, 'boolean');
});

test('W1 공용 출생 입력은 흐름마다 플래그 하나로 이전 입력 단계(LEGACY_STEPS)와 고른다', () => {
  for (const [file, flag] of [
    ['app/saju/free/FreeSajuGuided.tsx', 'GUIDED_BIRTH_FREE_SAJU_ENABLED'],
    ['app/saju/animal-destiny/components/AnimalDestinyGuided.tsx', 'GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED'],
    ['app/yeon-star-hug/YeonStarHugGuided.tsx', 'GUIDED_BIRTH_STAR_HUG_ENABLED'],
  ]) {
    const src = read(file);
    assert.match(src, new RegExp(`const BIRTH = ${flag};`), file);
    assert.match(src, /const STEPS = BIRTH [?] BIRTH_STEPS : LEGACY_STEPS;/, file);
    for (const m of src.matchAll(/"place"/g)) {
      assert.match(src.slice(Math.max(0, m.index - 160), m.index), /BIRTH_V2 \?|GUIDED_BIRTH_INPUT_V2_ENABLED\s*\?/, `${file}: 장소 단계는 출생 입력 확대 플래그(GUIDED_BIRTH_INPUT_V2_ENABLED) 안에서만 묻는다`);
    }
    assert.match(src, /placeMode: "record"/, `${file}: 장소는 기록·확인 표시만 한다`);
    assert.doesNotMatch(src, /\/api\/geocode|BirthPlaceInput/, `${file}: 위치 조회를 부르지 않는다(계산은 서울 기준 그대로)`);
  }
});

test('/saju/free/ 는 플래그로 공통 플로우판과 원본 FreeSajuForm 사이를 고른다(3c-A2)', () => {
  const entry = read('app/saju/free/FreeSajuEntry.tsx');
  assert.match(entry, /GUIDED_FREE_SAJU_ENABLED\s*\?\s*dynamic\(\(\) => import\("\.\/FreeSajuGuided"\)/);
  assert.match(entry, /:\s*dynamic\(\(\) => import\("\.\/FreeSajuForm"\)/);
  assert.match(read('app/saju/free/page.js'), /<FreeSajuEntry \/>/);
});

test('셸은 영냥이 전용 밤 예화 CSS 를 싣지 않는다(꿀꿀 흐름 번들 분리)', () => {
  const shell = read('app/components/guided-flow/GuidedFlowShell.tsx');
  assert.equal(/^import\s+['"][^'"]*yehwa-night\.generated\.css['"]/m.test(shell), false);
  assert.match(read('app/dev/guided-flow/GuidedFlowDemo.tsx'), /^import '@\/app\/yeongnyangi\/yehwa-night\.generated\.css';/m);
});

test('/today/ 는 플래그로 공통 플로우판과 원본 DailyTarot 사이를 고른다', () => {
  const hub = read('app/today/TodayHubClient.tsx');
  assert.match(hub, /GUIDED_DAILY_TAROT_ENABLED\s*\?\s*dynamic\(\(\) => import\("\.\/DailyTarotGuided"\)/);
  assert.match(hub, /:\s*dynamic\(\(\) => import\("\.\/DailyTarot"\)/);
  assert.match(read('app/today/DailyTarotGuided.tsx'), /DAILY_TAROT_KEY/);
});

test('/tarot/healing/ 은 플래그로 공통 플로우판과 원본 SunHealingTarot 사이를 고른다', () => {
  const client = read('app/tarot/healing/TarotHealingClient.tsx');
  assert.match(client, /GUIDED_HEALING_TAROT_ENABLED\s*\?\s*dynamic\(\(\) => import\("\.\.\/\.\.\/components\/SunHealingTarotGuided"\)/);
  assert.match(client, /:\s*dynamic\(\(\) => import\("\.\.\/\.\.\/components\/SunHealingTarot"\)/);
  // 토스 코어 로더가 원본 파일의 Tailwind 클래스를 읽으므로 결과 본문은 원본 파일에 남는다.
  assert.match(read('app/components/SunHealingTarot.tsx'), /export function SunHealingResultBody/);
  assert.match(read('app/components/SunHealingTarotGuided.tsx'), /SunHealingResultBody/);
});

test('/today/ 공통 플로우는 history 를 쌓지 않는다(허브가 popstate 마다 열람 권한을 초기화)', () => {
  const src = read('app/today/DailyTarotGuided.tsx');
  assert.match(read('app/_lib/use-reading-identity-reset.ts'), /'popstate'/);
  const steps = src.match(/const STEPS[^;]*?\];/s)?.[0] || '';
  assert.ok(steps, 'STEPS 정의를 찾지 못함');
  for (const line of steps.split('\n').filter((l) => /\{id:'/.test(l))) {
    assert.match(line, /history:'(replace|none)'/, `push 기본값 단계: ${line.trim()}`);
  }
});

test('/today/ 결과는 웹툰 플래그로 캐릭터 웹툰과 이전 섹션 목록 사이를 고른다(4단계)', () => {
  const src = read('app/today/DailyTarotGuided.tsx');
  assert.match(src, /GUIDED_WEBTOON_RESULT_ENABLED\?buildTarotWebtoon\(/);
  assert.match(src, /<NarratorWebtoon /);
  assert.match(src, /dailyTarot\.positionsTitle/);
});

test('/saju/animal-destiny/ 는 플래그로 입력만 공통 플로우판으로 바꾸고 결과·유료 풀이 확인은 원본을 쓴다(3c-A3)', async () => {
  const flags = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof flags.GUIDED_ANIMAL_DESTINY_ENABLED, 'boolean');
  const page = read('app/saju/animal-destiny/components/AnimalDestinyPage.tsx');
  assert.match(page, /GUIDED_ANIMAL_DESTINY_ENABLED \? dynamic\(\(\) => import\("\.\/AnimalDestinyGuided"\)/);
  assert.match(page, /AnimalDestinyGuided \? null : <TwelveAnimalHero /);
  assert.match(page, /!AnimalDestinyGuided && \(status === "idle" \|\| status === "input" \|\| status === "error"\) \? \(/);
  assert.match(page, /<AnimalResultScreen[\s\S]*paid=\{paid\}[\s\S]*onRetryPaid=\{loadPaid\}/);
  const guided = read('app/saju/animal-destiny/components/AnimalDestinyGuided.tsx');
  assert.match(guided, /calculate\(\)/);
  assert.equal(/authFetch|\/api\//.test(guided), false, '입력 플로우는 서버를 직접 부르지 않는다(유료 확인은 스토어 calculate 안)');
});

test('/yeon-star-hug/ 는 플래그로 입력만 공통 플로우판으로 바꾸고 결과는 원본 입력 패널+결과를 쓴다(3c-A4)', async () => {
  const flags = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof flags.GUIDED_STAR_HUG_ENABLED, 'boolean');
  const page = read('app/yeon-star-hug/YeonStarHugClient.tsx');
  assert.match(page, /GUIDED_STAR_HUG_ENABLED \? dynamic\(\(\) => import\("\.\/YeonStarHugGuided"\)/);
  assert.match(page, /\{YeonStarHugGuided \? null : \(\r?\n\s*<m\.section/);
  assert.match(page, /\{!YeonStarHugGuided \|\| guidedStep === "result" \? \(\r?\n\s*<section className="grid gap-6/);
  assert.match(page, /run=\{runConsultation\}/);
  const guided = read('app/yeon-star-hug/YeonStarHugGuided.tsx');
  assert.match(guided, /if \(stepId === "result"\) return null;/);
  assert.equal(/authFetch|\/api\//.test(guided), false, '입력 플로우는 서버를 직접 부르지 않는다(별자리 신호 조회는 원본 applyProfileAndAstro 안)');
});

test('/yeongnyangi/room/ 출석 운세 16종은 플래그로 고르기·질문만 공통 플로우판으로 바꾸고 출석 게이트·결과는 원본을 쓴다(3c-A5)', async () => {
  const flags = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof flags.GUIDED_YN_FREE_FORTUNE_ENABLED, 'boolean');
  const page = read('app/yeongnyangi/_components/FreeFortune.tsx');
  assert.match(page, /GUIDED_YN_FREE_FORTUNE_ENABLED\?dynamic\(\(\)=>import\('\.\/FreeFortuneGuided'\),\{ssr:false\}\):null/);
  assert.match(page, /const guided=Boolean\(FreeFortuneGuided\)&&!guest&&Boolean\(state\?\.unlocked\);/);
  assert.match(page, /\{guided\?guidedStep==='result'&&[\s\S]*?:<>\r?\n\s*<div className="free-categories"/, '플래그 끔·게스트·잠김은 원본 칩·폼 그대로');
  assert.match(page, /run=\{read\}/);
  const guided = read('app/yeongnyangi/_components/FreeFortuneGuided.tsx');
  assert.equal(/authFetch|fetch\(|\/api\//.test(guided), false, '플로우판은 서버를 직접 부르지 않는다(출석·멸치·읽기는 원본 read 안)');
});

test('/tarot/mingri/ 는 플래그가 켜질 때만 랜딩 안에 무료 세 장 흐름을 붙인다(5단계 ①)', async () => {
  const flags = await import('../../lib/guided-flow/flags.mjs');
  assert.equal(typeof flags.GUIDED_MINGRI_TAROT_ENABLED, 'boolean');
  const page = read('app/tarot/mingri/page.tsx');
  assert.match(page, /inlineFlow=\{GUIDED_MINGRI_TAROT_ENABLED \? <MingriTarotEntry \/> : undefined\}/);
  const landing = read('app/components/FeatureLandingPage.tsx');
  // 끄면 inlineFlow 가 없어 주 CTA 는 기존 runHref 그대로다.
  assert.match(landing, /href=\{inlineFlow \? `#\$\{FEATURE_INLINE_FLOW_ID\}` : runHref\}/);
  assert.match(landing, /\{inlineFlow \? <section id=\{FEATURE_INLINE_FLOW_ID\}/);
  const flow = read('app/tarot/mingri/MingriTarotGuided.tsx');
  // 결정적 엔진만 쓴다: 서버 호출·저장 없이 master-reading 을 브라우저에서 부른다.
  assert.match(flow, /import\('@\/js\/core\/tarot\/master-reading\.mjs'\)/);
  assert.doesNotMatch(flow, /fetch\(|\/api\//);
});
