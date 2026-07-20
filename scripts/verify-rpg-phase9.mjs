import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const workerRpgSource = readFileSync(resolve(root, "worker/routes/rpg.js"), "utf8");
const workerIndexSource = readFileSync(resolve(root, "worker/index.js"), "utf8");
const modelSource = readFileSync(resolve(root, "worker/lib/models.js"), "utf8");
const rpgUiSource = readFileSync(resolve(root, "js/entertain-engine.js"), "utf8");
const mainShellSource = readFileSync(resolve(root, "index.html"), "utf8");

function expectContains(source, marker, label) {
  assert.ok(source.includes(marker), `${label}: missing marker -> ${marker}`);
}

function expectNotContains(source, marker, label) {
  assert.ok(!source.includes(marker), `${label}: unexpected marker -> ${marker}`);
}

function expectCount(source, marker, expected, label) {
  const count = source.split(marker).length - 1;
  assert.equal(count, expected, `${label}: expected ${expected}, received ${count} -> ${marker}`);
}

function expectOneOf(source, markers, label) {
  const found = markers.some((marker) => source.includes(marker));
  assert.ok(found, `${label}: missing markers -> ${markers.join(" | ")}`);
}

console.log("=== Phase 9 RPG regression validation ===");

console.log("\n[1] Server route wiring");
expectContains(workerIndexSource, '"/api/rpg"', "worker/index.js route dispatch");
expectContains(workerIndexSource, "handleRpgRoutes", "worker/index.js route handler import");
expectContains(workerRpgSource, "export async function handleRpgRoutes", "worker/routes/rpg.js handler");
expectContains(workerRpgSource, "path === \"/status\"", "worker/routes/rpg.js GET status route");
expectContains(workerRpgSource, "path === \"/complete\"", "worker/routes/rpg.js POST complete route");

console.log("[2] RPG data model");
expectContains(modelSource, "collection: \"user_rpg_progresses\"", "user_rpg_progresses collection");
expectContains(modelSource, "collection: \"user_daily_quest_logs\"", "user_daily_quest_logs collection");
expectContains(modelSource, "collection: \"user_rpg_reward_logs\"", "user_rpg_reward_logs collection");
expectContains(modelSource, "userRpgProgressSchema.index({ userId: 1, profileId: 1 }, { unique: true });", "progress unique index");
expectContains(modelSource, "userDailyQuestLogSchema.index({ userId: 1, profileId: 1, questDateKst: 1, questId: 1 }, { unique: true });", "daily quest unique index");
expectContains(modelSource, "userRpgRewardLogSchema.index({ userId: 1, profileId: 1, rewardType: 1, rewardKey: 1 }, { unique: true });", "reward unique index");

console.log("[3] Quest payload and completion flow");
expectContains(workerRpgSource, "afterCompleteMessage", "after-complete message generation");
expectContains(workerRpgSource, "buildAfterCompleteMessage", "after-complete message builder");
expectContains(workerRpgSource, "todayMaxExp", "daily exp cap");
expectContains(workerRpgSource, "questDateKst", "kst quest date");
expectContains(workerRpgSource, "profileId: resolved.profileId", "profile-scoped progress");
expectContains(workerRpgSource, "calculateLevelState", "level calculation");
expectContains(workerRpgSource, "UserDailyQuestLog.create", "quest completion log write");
expectContains(workerRpgSource, "UserRpgRewardLog.create", "reward log write");

console.log("[4] Frontend RPG rendering");
// 이 시트는 여전히 스스로 서버를 부르지 않는다. 서버 동기화는 프로필 카드 쪽 CDLevel이 전담하고,
// 시트는 그 공용 저장소를 읽기만 하므로 렌더가 네트워크에 묶이지 않는다.
expectNotContains(rpgUiSource, "/api/rpg/status", "status fetch removed from RPG UI");
expectNotContains(rpgUiSource, "/api/rpg/complete", "complete fetch removed from RPG UI");
expectContains(rpgUiSource, "getRpgLevelApi", "shared level store bridge");
expectNotContains(rpgUiSource, "UNLOCK SAVED ON SERVER", "false server-persistence claim removed");
expectContains(rpgUiSource, "RPG_LOCAL_STORAGE_MARKER", "local RPG storage marker");
expectContains(rpgUiSource, "rpg-local-progress-v20260617", "local RPG storage version");
expectContains(rpgUiSource, "completeRpgLocalQuest", "local quest completion flow");
expectContains(rpgUiSource, "resolveRpgProfileId", "profile resolve helper");
expectContains(rpgUiSource, "buildRpgTemplate", "RPG template builder");
expectContains(rpgUiSource, "ent-rpg-quest-after", "after-complete UI block");
expectContains(rpgUiSource, "quest.afterCompleteMessage", "after-complete message render");
expectContains(rpgUiSource, "data-rpg-complete", "quest completion button");
expectContains(rpgUiSource, "renderSkillTree", "skill tree hook");
expectContains(rpgUiSource, "rpg-character-sheet-stable-bottom-v20260617", "stable bottom render marker");
expectContains(rpgUiSource, "buildRpgCrashFallbackTemplate", "render fallback template");
expectContains(rpgUiSource, "syncRpgLayoutHeight", "RPG height sync guard");
expectCount(rpgUiSource, "오늘의 일일 퀘스트", 1, "single daily quest heading");

console.log("[5] Main shell entry point");
expectContains(mainShellSource, 'id="skillTreeSection"', "skill tree section in main shell");

console.log("[6] Policy compatibility markers");
expectOneOf(workerRpgSource, ["User.findById(auth.userId)", "User.findOne({ _id: auth.userId"], "auth-bound user lookup");
expectOneOf(workerRpgSource, ["ProfileCard.findOne({ userId: auth.userId, profileId: resolved.profileId })", "ProfileCard.findOne({ userId: auth.userId }).sort"], "profile-card scoping");
expectContains(workerRpgSource, "requireAuth", "login required on RPG routes");

console.log("\nAll static regression checks passed.\n");
console.log("Manual browser checklist:");
console.log("  1. Log out and open the RPG section. Clicking 완료 should surface the login prompt.");
console.log("  2. Confirm today's quests render from localStorage without a server request.");
console.log("  3. Complete one quest and verify EXP, level, and today's EXP update once.");
console.log("  4. Click the same quest twice and confirm no duplicate EXP is granted.");
console.log("  5. Refresh and confirm completion state persists.");
console.log("  6. Finish enough quests to confirm the daily EXP cap stops further gains.");
console.log("  7. Level up and confirm currentLevel, currentLevelExp, totalExp are consistent.");
console.log("  8. Cross KST midnight and confirm a new quest set appears.");
console.log("  9. Switch or delete profile cards and confirm level/EXP stay put (progress is account-scoped, not per card).");
console.log(" 10. Resize to mobile and confirm cards/buttons remain usable.");
console.log(" 11. Re-enter the main saju result screen and confirm it still loads.");
console.log(" 12. Confirm paid features, coin, pass, and profile-card flows still behave normally.");
