const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("fortune planner entry is folded into the diary modal", () => {
  const html = read("index.html");
  const runtime = read("js/core/index-inline-runtime.js");
  const plannerRoute = read("app/fortune-planner/page.tsx");
  const legacyRoute = read("app/luck-sync-diary/page.tsx");
  const dashboard = read("js/core/saju/reportDashboard.js");

  assert.match(runtime, /openFortunePlanner[\s\S]*luck-sync-diary\.js/);
  assert.match(runtime, /LuckSyncDiary\.open/);
  assert.match(plannerRoute, /redirect\("\/\?fortunePlanner=1"\)/);
  assert.match(legacyRoute, /redirect\("\/\?fortunePlanner=1"\)/);
  assert.doesNotMatch(runtime, /location\.assign\('\/fortune-planner'\)/);
  assert.doesNotMatch(runtime, /mountFortunePlannerHomeCard/);
  assert.doesNotMatch(runtime, /cdFortunePlannerCard/);
  assert.match(html, /id="cdDiaryPlannerEntry"[\s\S]*data-action="openLuckSyncDiary"/);
  assert.match(html, /id="cdDiaryPlannerTitle">운기·기일 다이어리와[\s\S]*나의 운세 플래너/);
  assert.ok(html.indexOf('id="cdSignatureConsult"') < html.indexOf('id="cdDiaryPlannerEntry"'));
  assert.ok(html.indexOf('id="cdDiaryPlannerEntry"') < html.indexOf('id="fortuneGatewayEntry"'));
  assert.match(html, /cdDiaryPlannerEntry'\) \|\| document\.getElementById\('cdSignatureConsult'/);
  assert.match(dashboard, /label:'갓생 다이어리'/);
  assert.match(dashboard, /cta:'다이어리 열기'/);
});

test("diary calendar adds local schedules without an entitlement dependency", () => {
  const diary = read("js/luck-sync-diary.js");

  assert.match(diary, /PLANNER_STORAGE_KEY = 'cd\.fortunePlanner\.v2'/);
  assert.match(diary, /function plannerEventOccursOn/);
  assert.match(diary, /lsd-month-schedule-count/);
  assert.match(diary, /id="lsdScheduleForm"/);
  assert.match(diary, /cd:fortune-planner-updated/);
  assert.match(diary, /function isLuckSyncDiaryUnlocked\(\)[\s\S]*return true/);
  assert.doesNotMatch(diary, /fetch\([^)]*entitlement/i);
});
