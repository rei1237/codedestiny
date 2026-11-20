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
