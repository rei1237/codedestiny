/**
 * 빌드타임 운세 데이터 생성 — KST 오늘 + 내일 2건.
 *
 * 왜 빌드에서 만드는가: 이 데이터는 소스가 아니라 산출물이다. 예전에는 GitHub Actions 가
 * 매일 만들어 main 에 커밋했지만(fortune-daily-publish.yml, 2026-04-29 에 소실), 지금 배포
 * 계약은 main 직접 push 를 막는다. 대신 릴리스가 매일 한 번 다시 빌드하고, 그 빌드가 그날의
 * 데이터를 만든다. 결과적으로 커밋 0건으로 같은 결과에 도달한다.
 *
 * 내일분까지 만드는 이유: /fortune/tomorrow/* 페이지가 서버 렌더로 내일 데이터를 읽는다.
 *
 * 🔴 이 스크립트는 외부 API 를 부르지 않는다. gen-daily.mjs 는 lunar-javascript 역법 계산과
 *    날짜 해시 선택만 쓰므로 LLM·네트워크 비용이 0이다. 매일 돌아도 과금이 없다.
 */
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { kstYmdToday, kstYmdNextDay } from './lib/fortune-date.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const onceScript = path.join(__dirname, 'fortune-daily-once.mjs');

// `FORTUNE_DATE=... node ...` 인라인 접두사는 Windows PowerShell 에서 동작하지 않는다.
// 레포가 with-utf8-console.mjs 를 쓰는 것과 같은 이유로 env 주입을 래퍼가 맡는다.

// 🔴 시계는 한 번만 읽는다. 오늘과 내일을 각각 `new Date()` 로 구하면 두 호출 사이에
// KST 자정이 지날 때 today=D / tomorrow=D+2 가 나온다(이 빌드는 00:10 KST 에 돈다).
const runDateKst = kstYmdToday();
const targets = [
  { label: 'today', date: runDateKst },
  { label: 'tomorrow', date: kstYmdNextDay(runDateKst) },
];

console.log(`[fortune-build-data] RUN_DATE_KST=${runDateKst}`);

for (const target of targets) {
  console.log(`[fortune-build-data] ${target.label} = ${target.date}`);
  const result = spawnSync(process.execPath, [onceScript], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, FORTUNE_DATE: target.date },
  });
  if ((result.status ?? 1) !== 0) {
    console.error(`[fortune-build-data] 생성 실패: ${target.label} (${target.date})`);
    process.exit(result.status === null ? 1 : result.status);
  }
}

// 🔴 render 단계(lib/fortune/daily-data.ts)는 이 스크립트가 끝난 뒤 별도 프로세스(next build 의
// 정적 생성)에서 실행되며, 그 사이 KST 자정을 지날 수 있다(2026-08-22 실측: 릴리스가 이 경계에
// 걸려 daily-YYYY-MM-DD.json ENOENT 로 프리렌더가 죽었다). render 단계가 시계를 다시 읽지 않고
// 이 스크립트가 실제로 만든 날짜를 그대로 쓰도록 매니페스트로 넘긴다.
const manifest = { today: runDateKst, tomorrow: kstYmdNextDay(runDateKst) };
const manifestDir = path.join(root, 'fortune', 'data');
mkdirSync(manifestDir, { recursive: true });
writeFileSync(path.join(manifestDir, 'run-manifest.json'), JSON.stringify(manifest, null, 2));

console.log('[fortune-build-data] 완료 — 오늘/내일 일일 패키지 준비됨.');
