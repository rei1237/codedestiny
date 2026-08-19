#!/usr/bin/env node
/**
 * 스테이징이 색인·광고·IndexNow 에서 빠져 있는 **배선**을 fail-closed 로 지킨다.
 *
 * 무엇을 지키는가 — 이 배선은 여러 파일에 흩어져 있고, 하나만 빠져도 증상이 조용하다.
 * 스테이징이 색인되면 프로덕션과 중복 콘텐츠로 경쟁하고, 광고가 뜨면 AdSense 정책 위반이며,
 * IndexNow 가 돌면 아직 배포되지도 않은 변경을 기준으로 프로덕션 URL 을 알리게 된다.
 *
 * 🔴 실제로 색인을 막는 것은 이 가드가 아니라 릴리스 워크플로의 라이브 프로브다. 여기서 하는
 *    일은 그 배선이 사라지는 것을 PR 단계에서 시끄럽게 만드는 것이다. 둘 다 있어야 한다.
 *
 * 실행: npm run verify:staging-noindex [--self-test]
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TAG = "[verify-staging-noindex]";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = {
  applyScript: "scripts/apply-staging-noindex.mjs",
  postbuild: "scripts/run-postbuild.mjs",
  deploySafe: "scripts/deploy-safe.mjs",
  adsense: "app/components/DeferredAdsense.tsx",
  indexnow: "scripts/indexnow-submit.mjs",
  workflow: ".github/workflows/cloudflare-pages-deploy.yml",
};

/** 워크플로에서 잡 하나의 본문만 잘라낸다. 파일 전체 부분문자열 검사는 잡 경계를 못 본다. */
export function jobBody(workflow, jobName) {
  const start = workflow.indexOf(`\n  ${jobName}:\n`);
  if (start === -1) return "";
  const rest = workflow.slice(start + 1);
  const next = rest.search(/\n {2}[a-z][a-z0-9_-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next);
}

export function checkStagingNoindex(sources) {
  const failures = [];
  const need = (condition, message) => { if (!condition) failures.push(message); };

  // ① 산출물 변환기가 실재하고, 프로덕션에서 도는 것을 스스로 거부한다.
  need(
    /deployTarget !== "staging"/.test(sources.applyScript),
    `${SOURCES.applyScript}: CD_DEPLOY_TARGET 이 staging 이 아닐 때 거부하는 가드가 없다. 프로덕션 산출물에 돌면 사이트가 색인에서 빠진다.`,
  );
  need(
    /Disallow: \//.test(sources.applyScript),
    `${SOURCES.applyScript}: robots.txt 전면 차단 문구가 없다.`,
  );
  need(
    /name="robots" content="noindex,nofollow"/.test(sources.applyScript),
    `${SOURCES.applyScript}: noindex 메타 주입이 없다.`,
  );
  need(
    /X-Robots-Tag/.test(sources.applyScript),
    `${SOURCES.applyScript}: _headers 에 X-Robots-Tag 를 넣는 처리가 없다.`,
  );

  // ② 그 변환기가 스테이징 빌드에 실제로 배선돼 있다.
  need(
    sources.postbuild.includes("scripts/apply-staging-noindex.mjs"),
    `${SOURCES.postbuild}: apply-staging-noindex 단계가 배선돼 있지 않다. 스크립트만 있고 아무도 안 부르면 가드가 아니다.`,
  );
  need(
    /CD_DEPLOY_TARGET[\s\S]{0,200}staging/.test(sources.postbuild),
    `${SOURCES.postbuild}: 그 단계가 CD_DEPLOY_TARGET=staging 조건 아래 있지 않다. 프로덕션 빌드에서도 돌면 안 된다.`,
  );

  // ③ 마커가 워크플로 env 가 아니라 배포 타깃에서 파생된다.
  need(
    /CD_DEPLOY_TARGET:\s*target\.id/.test(sources.deploySafe),
    `${SOURCES.deploySafe}: envForChecks 가 CD_DEPLOY_TARGET 을 target.id 에서 넣지 않는다. 워크플로 env 에만 의존하면 잡을 추가할 때 빠뜨린다.`,
  );

  // ④ noindex 메타가 곧 광고 차단이라는 결합이 살아 있다.
  //    이게 끊기면 스테이징에 광고가 뜨는데 화면도 로그도 조용하다.
  need(
    /robotsText[\s\S]{0,200}noindex/.test(sources.adsense),
    `${SOURCES.adsense}: robots 메타로 광고 로드를 막는 판정이 사라졌다. 스테이징 색인 차단이 광고 차단을 겸하는 근거가 이것이다 — 없어졌으면 별도 차단을 넣어야 한다.`,
  );

  // ⑤ IndexNow 는 프로덕션에서만.
  need(
    /CD_DEPLOY_TARGET[\s\S]{0,200}production/.test(sources.indexnow),
    `${SOURCES.indexnow}: 프로덕션이 아닌 타깃에서 제출을 거부하는 가드가 없다.`,
  );
  const indexnowCount = (sources.workflow.match(/npm run seo:indexnow/g) || []).length;
  need(
    indexnowCount === 1,
    `${SOURCES.workflow}: seo:indexnow 호출이 정확히 1회여야 한다 (현재 ${indexnowCount}회).`,
  );

  // ⑥ 스테이징 잡은 IndexNow 를 부르지 않고, 라이브 프로브를 갖는다.
  const staging = jobBody(sources.workflow, "staging");
  need(staging.length > 0, `${SOURCES.workflow}: staging 잡을 찾지 못했다.`);
  if (staging) {
    need(
      !staging.includes("seo:indexnow"),
      `${SOURCES.workflow}: staging 잡이 seo:indexnow 를 부른다. 스테이징 릴리스가 프로덕션 URL 을 색인 요청하게 된다.`,
    );
    need(
      staging.includes("robots.txt") && /x-robots-tag/i.test(staging),
      `${SOURCES.workflow}: staging 잡에 색인 차단 라이브 프로브가 없다. 정적 배선만으로는 산출물이 실제로 막혔는지 알 수 없다.`,
    );
  }

  return failures;
}

// ── self-test ────────────────────────────────────────────────────────────────

function readAll() {
  const sources = {};
  for (const [key, relativePath] of Object.entries(SOURCES)) {
    const fullPath = join(REPO_ROOT, relativePath);
    if (!existsSync(fullPath)) {
      console.error(`${TAG} FAIL: ${relativePath} 가 없습니다. 검사 대상이 없을 때 통과하는 가드는 가드가 아닙니다.`);
      process.exit(1);
    }
    // 🔴 개행을 정규화한다. 이 레포는 `* text=auto` 라 Windows 체크아웃에서 워크플로가 CRLF 로
    //    내려오고, 그러면 `\n  staging:\n` 같은 경계 탐색이 조용히 빗나가 "잡을 못 찾았다"가 된다.
    sources[key] = readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n");
  }
  return sources;
}

function runSelfTest() {
  const sources = readAll();
  const baseline = checkStagingNoindex(sources);
  if (baseline.length) {
    console.error(`${TAG} self-test FAIL: 현재 레포가 이미 실패합니다 — ${baseline.join(" | ")}`);
    process.exit(1);
  }

  // 각 단언이 공허하지 않은지, 해당 배선을 지운 사본으로 증명한다.
  const mutations = [
    ["applyScript", (text) => text.replace(/deployTarget !== "staging"/, 'deployTarget !== "anything"'), /프로덕션 산출물에 돌면/],
    ["postbuild", (text) => text.replace(/scripts\/apply-staging-noindex\.mjs/g, "scripts/nope.mjs"), /배선돼 있지 않다/],
    ["deploySafe", (text) => text.replace(/CD_DEPLOY_TARGET: target\.id/, 'CD_DEPLOY_TARGET: "production"'), /target\.id 에서 넣지 않는다/],
    ["adsense", (text) => text.replace(/robotsText/g, "someOtherText"), /광고 로드를 막는 판정이 사라졌다/],
    ["indexnow", (text) => text.replace(/CD_DEPLOY_TARGET/g, "CD_OTHER"), /제출을 거부하는 가드가 없다/],
    ["workflow", (text) => text.replace(/npm run seo:indexnow/, "npm run seo:indexnow\n          npm run seo:indexnow"), /정확히 1회여야/],
  ];

  const problems = [];
  for (const [key, mutate, expected] of mutations) {
    const mutated = { ...sources, [key]: mutate(sources[key]) };
    const joined = checkStagingNoindex(mutated).join(" | ");
    if (!expected.test(joined)) {
      problems.push(`${key}: 배선을 지웠는데 잡히지 않았다 — ${joined || "(실패 없음)"}`);
    }
  }

  // 잡 본문 추출이 실제로 경계를 지키는지.
  const staging = jobBody(sources.workflow, "staging");
  if (staging.includes("CD_PRODUCTION_ORIGIN")) {
    problems.push("staging 잡 본문에 CD_PRODUCTION_ORIGIN 이 있다 — 잡 경계 추출이 깨졌거나 실제로 새고 있다.");
  }

  if (problems.length) {
    console.error(`${TAG} self-test 실패 ${problems.length}건:`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`${TAG} self-test passed (${mutations.length} mutations + 잡 경계).`);
}

// ── 진입점 ───────────────────────────────────────────────────────────────────

function main() {
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const failures = checkStagingNoindex(readAll());
  if (failures.length) {
    console.error(`${TAG} FAIL: 스테이징 색인·광고 차단 배선이 끊겼습니다 (${failures.length}건).`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`${TAG} OK — 스테이징은 색인·광고·IndexNow 에서 빠져 있고, 그 배선이 전부 제자리에 있다.`);
}

main();
