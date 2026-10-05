#!/usr/bin/env node
// 로스터 정본 검증. 실패 시 exit 1.
import { ROSTER_GROUPS, ROSTER_CHECKED_ON } from "../../lib/idol-chemi/data/roster.js";
import { validateRoster } from "../../lib/idol-chemi/data/rosterSchema.js";

const result = validateRoster(ROSTER_GROUPS, { checkedOnMax: ROSTER_CHECKED_ON });
const members = ROSTER_GROUPS.reduce((n, g) => n + g.members.length, 0);
if (!result.ok) {
  console.error("roster invalid:");
  for (const e of result.errors) console.error(" - " + e);
  process.exit(1);
}
console.log("roster ok: " + ROSTER_GROUPS.length + " groups, " + members + " members");
