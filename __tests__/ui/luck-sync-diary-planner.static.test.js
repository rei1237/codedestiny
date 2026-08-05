const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("fortune planner keeps the diary modal and provides a dedicated mobile planner route", () => {
  const runtime = read("js/core/index-inline-runtime.js");
  const plannerRoute = read("app/fortune-planner/page.tsx");
  const plannerClient = read("app/fortune-planner/FortunePlannerClient.tsx");
  const legacyRoute = read("app/luck-sync-diary/page.tsx");

  assert.match(runtime, /openFortunePlanner[\s\S]*luck-sync-diary\.js/);
  assert.match(runtime, /LuckSyncDiary\.open/);
  assert.match(plannerRoute, /import FortunePlannerClient/);
  assert.match(plannerRoute, /return <FortunePlannerClient \/>/);
  assert.match(plannerClient, /useSearchParams/);
  assert.match(plannerClient, /localStorage/);
  assert.doesNotMatch(plannerRoute, /redirect\("\/\?fortunePlanner=1"\)/);
  assert.match(legacyRoute, /redirect\("\/\?fortunePlanner=1"\)/);
  assert.doesNotMatch(runtime, /location\.assign\('\/fortune-planner'\)/);
});

test("diary calendar adds local schedules without an entitlement dependency", () => {
  const diary = read("js/luck-sync-diary.js");

  assert.match(diary, /PLANNER_STORAGE_KEY = 'cd\.fortunePlanner\.v2'/);
  assert.match(diary, /function plannerEventOccursOn/);
  assert.match(diary, /lsd-month-schedule-count/);
  assert.match(diary, /id="lsdScheduleForm"/);
  assert.match(diary, /function isLuckSyncDiaryUnlocked\(\)[\s\S]*return true/);
  assert.doesNotMatch(diary, /fetch\([^)]*entitlement/i);
});
