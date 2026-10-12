/**
 * 사주 종합(section_summary)·대운 풀이(section_daewun) 본문이 브라우저로 되돌아오지 않게 막는 가드.
 *
 * 2026-10-12 이전: renderSummary·대운 풀이 생성기가 js/saju-engine.js 에 통째로 실려 있어
 * 콘솔에서 함수 하나만 부르면 결제 없이 본문이 나왔다. 이제 본문은 /api/saju/section 이
 * 해금을 확인한 뒤 worker/lib/saju-section 렌더러로 만든다.
 *
 * 🔴 정적 호스팅이라 js/·public/ 아래 파일은 URL 로 그대로 열린다. sync:public 은 소스에서
 *    지운 선언을 미러에서 지우지 않을 수 있으므로 미러(public/)까지 함께 본다.
 * 🔴 여기는 배치만 본다. 해금이 실제로 막히는지는 __tests__/worker/saju-section.test.js 가 맡는다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.replace(/^\s*\/\/.*$/, ""))
  .join("\n");

function browserServedFiles() {
  const out = ["index.html"];
  const skip = new Set(["node_modules", ".git", "coverage"]);
  for (const rel of ["js", "public"]) {
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(js|html)$/.test(entry.name)) out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    })(path.join(root, rel));
  }
  assert.ok(out.length > 100, `서빙 파일을 ${out.length}개만 찾았다 — 스캐너가 빗나갔다`);
  assert.ok(out.includes("public/js/saju-engine.js"), "미러의 사주 엔진을 못 봤다 — 배포되는 쪽을 안 보는 가드는 가드가 아니다");
  return out;
}

test("종합·대운 유료 렌더러와 문장이 브라우저 경로에 없다", () => {
  // 함수·표 이름과, 유료 본문에만 있는 장 제목.
  const FORBIDDEN = [
    "generateDetailedAdvice", "generateNeoFactPunch", "getDaewunBranchEvidence", "buildDaewunReadingGuide",
    "buildDaewunDetailHtml", "_buildMonthCommandFromEngine", "HEALTH_DATA", "GAEUN_TIPS", "cycleRoleConditions",
    "보유 십성 랭킹", "내면과 겉모습의 간격", "관계에서 반드시 기억할 것", "대운과 세운, 다음 시기를 함께 읽기",
  ];
  const offenders = [];
  for (const rel of browserServedFiles()) {
    const source = stripComments(read(rel));
    for (const needle of FORBIDDEN) if (source.includes(needle)) offenders.push(`${rel} → ${needle}`);
  }
  assert.deepEqual(offenders, [], "브라우저 파일에 유료 본문 생성기가 남아 있다:\n  " + offenders.join("\n  "));
  // 옮긴 정본이 서버에 있어야 한다(옮기다 만 상태 방지).
  const paid = read("worker/lib/saju-section/paid-renderers.src.js");
  for (const name of ["generateDetailedAdvice", "getDaewunBranchEvidence", "buildDaewunDetailHtml"]) {
    assert.ok(paid.includes("function " + name + "("), `${name} 정본이 서버에 없다`);
  }
});

test("브라우저는 본문을 서버에만 묻는다", () => {
  const client = stripComments(read("js/core/saju/section-client.js"));
  assert.match(client, /'\/api\/saju\/section'/, "서버 본문 요청 경로가 없다");
  const engine = stripComments(read("js/saju-engine.js"));
  assert.match(engine, /function renderSummary\(\)\{[^}]*CdSajuSectionClient\.loadSummary\(\)/, "renderSummary 가 서버 로더를 거치지 않는다");
  assert.match(engine, /function showDwDetail\([^)]*\)\{[^}]*CdSajuSectionClient\.showDaewun\(/, "showDwDetail 이 서버 로더를 거치지 않는다");
  assert.match(read("index.html"), /<script defer src="\/js\/core\/saju\/section-client\.js"><\/script>/, "index.html 이 본문 로더를 싣지 않는다");
});
