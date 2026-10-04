// 파트너(최애) 해석 — 로스터(검증된 K-POP) 우선, 기존 295 프리셋은 "기타"로 뒤에 둔다.
// 반환 레코드에는 생시가 절대 없다(birthTimeKnown:false 고정).
import { ROSTER_GROUPS, ROSTER_VERSION } from "./roster.js";
import { LEGACY_PRESETS, LEGACY_PRESET_VERSION } from "./legacyPresets.generated.js";

export { ROSTER_GROUPS, ROSTER_VERSION, LEGACY_PRESETS, LEGACY_PRESET_VERSION };

export const PARTNER_KINDS = Object.freeze(["roster", "preset"]);
export const PARTNER_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function rosterRecord(group, member) {
  return Object.freeze({
    kind: "roster",
    id: member.id,
    displayName: member.stageNameKo,
    displayNameEn: member.stageNameEn,
    groupLabel: group.nameKo,
    groupLabelEn: group.nameEn,
    groupId: group.id,
    category: "K-POP",
    birthDate: member.birthDate,
    birthTimeKnown: false,
    status: member.status,
    sourceVersion: ROSTER_VERSION,
    searchText: [member.stageNameKo, member.stageNameEn, ...member.aliases, group.nameKo, group.nameEn, ...group.aliases].join(" ").toLowerCase(),
  });
}

function presetRecord(preset) {
  return Object.freeze({
    kind: "preset",
    id: preset.id,
    displayName: preset.name,
    displayNameEn: "",
    groupLabel: preset.artist || preset.category,
    groupLabelEn: "",
    groupId: null,
    category: preset.category,
    birthDate: preset.birthDate,
    birthTimeKnown: false,
    status: "active",
    sourceVersion: LEGACY_PRESET_VERSION,
    searchText: preset.searchText,
  });
}

const ROSTER_INDEX = new Map();
for (const group of ROSTER_GROUPS) {
  for (const member of group.members) ROSTER_INDEX.set(member.id, rosterRecord(group, member));
}
const PRESET_INDEX = new Map(LEGACY_PRESETS.map((p) => [p.id, presetRecord(p)]));

/** 선택 UI 용 — 활동 멤버만. 비활성(불일치) 멤버는 노출하지 않는다. */
export const ROSTER_PARTNERS = Object.freeze([...ROSTER_INDEX.values()].filter((r) => r.status === "active"));

// 로스터가 이미 덮는 아이돌(같은 이름 + 그룹 별칭 일치)은 프리셋 검색에서 가린다. 딥링크 해석(resolvePartner)은 그대로 된다.
const ROSTER_SHADOW_KEYS = new Set();
for (const group of ROSTER_GROUPS) {
  const groupKeys = [group.nameKo, group.nameEn, ...group.aliases].map((s) => String(s).toLowerCase());
  for (const member of group.members) {
    const nameKeys = [member.stageNameKo, member.stageNameEn, ...member.aliases].map((s) => String(s).toLowerCase());
    for (const g of groupKeys) for (const n of nameKeys) ROSTER_SHADOW_KEYS.add(g + "|" + n);
  }
}
export function isShadowedByRoster(record) {
  if (!record || record.kind !== "preset") return false;
  return ROSTER_SHADOW_KEYS.has(String(record.groupLabel).toLowerCase() + "|" + String(record.displayName).toLowerCase());
}
export const PRESET_PARTNERS = Object.freeze([...PRESET_INDEX.values()].filter((r) => !isShadowedByRoster(r)));

export function listRosterGroups() {
  return ROSTER_GROUPS.map((g) => Object.freeze({
    id: g.id,
    nameKo: g.nameKo,
    nameEn: g.nameEn,
    debutYear: g.debutYear,
    memberCount: g.members.filter((m) => m.status === "active").length,
  }));
}

export function listGroupMembers(groupId) {
  return ROSTER_PARTNERS.filter((r) => r.groupId === groupId);
}

/**
 * @param {{kind:string,id:string}} ref
 * @returns {object|null} 해석 실패·비활성은 null (fail-closed)
 */
export function resolvePartner(ref) {
  const kind = String((ref && ref.kind) || "");
  const id = String((ref && ref.id) || "");
  if (!PARTNER_KINDS.includes(kind) || !PARTNER_ID_PATTERN.test(id)) return null;
  const record = kind === "roster" ? ROSTER_INDEX.get(id) : PRESET_INDEX.get(id);
  if (!record || record.status !== "active") return null;
  return record;
}

/** 로스터 우선 → 프리셋. 빈 질의는 빈 배열. */
export function searchPartners(query, limit) {
  const q = normalizeQuery(query);
  const max = Number.isFinite(limit) ? limit : 24;
  if (!q) return [];
  const hit = (r) => r.searchText.includes(q);
  const out = [];
  for (const r of ROSTER_PARTNERS) if (hit(r)) out.push(r);
  for (const r of PRESET_PARTNERS) if (hit(r)) out.push(r);
  return out.slice(0, max);
}
