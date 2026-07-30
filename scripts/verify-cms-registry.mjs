// CMS 레지스트리 정합성 검사.
//
// 레지스트리는 관리자 메뉴·에디터·검증을 전부 파생시키는 단일 정본이라, 여기가 어긋나면
// "관리자에서는 고칠 수 있는데 사이트에는 안 나오는" 유령 항목이 생긴다. 그걸 막는 가드다.
//
// 검사 항목
//   1) ns 중복 없음 / group 이 CMS_GROUPS 에 존재
//   2) channel·editor·listSource 값이 허용 집합 안
//   3) 필드 이름 중복 없음, kind 가 알려진 종류
//   4) listSource: "static" 이면 entries 가 있고 키가 유효·중복 없음
//   5) build 채널 네임스페이스는 빌드 산출물(cms.generated.json)에 실릴 수 있는 형태여야 함
//   6) 라이트 노벨 constraints 가 apply-vn-overrides / verify-vn-override-safety 와 일치
import { CMS_GROUPS, CMS_NAMESPACES, isValidCmsKey } from "../lib/cms/registry.mjs";

const CHANNELS = new Set(["runtime", "build"]);
const EDITORS = new Set(["plain", "rich", "beats", "prompt"]);
const LIST_SOURCES = new Set(["static", "code", "user"]);
const FIELD_KINDS = new Set(["text", "textarea", "richtext", "lines", "qa-list", "beats", "json", "number", "select"]);

// apply-vn-overrides.mjs / verify-vn-override-safety.mjs 의 상수와 같아야 한다.
const EXPECTED_NOVEL_CONSTRAINTS = {
  beatMaxLength: 250,
  forbiddenInBeat: ["\"", "\\", "</script"],
  minKoreanCharsPerEpisode: 1800,
};

const problems = [];
const groupIds = new Set(CMS_GROUPS.map((group) => group.id));
const seenNamespaces = new Set();

for (const entry of CMS_NAMESPACES) {
  const label = entry?.ns || "(이름 없음)";

  if (!entry?.ns) problems.push("ns 가 없는 네임스페이스가 있습니다.");
  if (seenNamespaces.has(entry.ns)) problems.push(`${label}: ns 가 중복됩니다.`);
  seenNamespaces.add(entry.ns);

  if (!groupIds.has(entry.group)) problems.push(`${label}: group "${entry.group}" 이 CMS_GROUPS 에 없습니다.`);
  if (!CHANNELS.has(entry.channel)) problems.push(`${label}: channel "${entry.channel}" 이 올바르지 않습니다.`);
  if (!EDITORS.has(entry.editor)) problems.push(`${label}: editor "${entry.editor}" 이 올바르지 않습니다.`);
  if (!LIST_SOURCES.has(entry.listSource)) problems.push(`${label}: listSource "${entry.listSource}" 이 올바르지 않습니다.`);
  if (!String(entry.label || "").trim()) problems.push(`${label}: label 이 비어 있습니다.`);
  if (!String(entry.description || "").trim()) problems.push(`${label}: description 이 비어 있습니다(관리자 화면 안내 문구).`);

  if (!Array.isArray(entry.fields) || !entry.fields.length) {
    problems.push(`${label}: fields 가 비어 있습니다.`);
  } else {
    const seenFields = new Set();
    for (const field of entry.fields) {
      if (!field?.name) problems.push(`${label}: 이름 없는 필드가 있습니다.`);
      if (seenFields.has(field.name)) problems.push(`${label}: 필드 "${field.name}" 이 중복됩니다.`);
      seenFields.add(field.name);
      if (!FIELD_KINDS.has(field.kind)) problems.push(`${label}.${field.name}: kind "${field.kind}" 이 올바르지 않습니다.`);
      if (!String(field.label || "").trim()) problems.push(`${label}.${field.name}: label 이 비어 있습니다.`);
      if (field.kind === "select" && (!Array.isArray(field.options) || !field.options.length)) {
        problems.push(`${label}.${field.name}: select 인데 options 가 없습니다.`);
      }
    }

    const beatsFields = entry.fields.filter((field) => field.kind === "beats");
    if (entry.editor === "beats" && beatsFields.length !== 1) {
      problems.push(`${label}: beats 에디터인데 beats 필드가 ${beatsFields.length}개입니다(1개여야 합니다).`);
    }
    if (entry.editor !== "beats" && beatsFields.length) {
      problems.push(`${label}: beats 필드는 beats 에디터에서만 쓸 수 있습니다.`);
    }
  }

  if (entry.listSource === "static") {
    if (!Array.isArray(entry.entries) || !entry.entries.length) {
      problems.push(`${label}: listSource 가 static 인데 entries 가 없습니다.`);
    } else {
      const seenKeys = new Set();
      for (const item of entry.entries) {
        if (!isValidCmsKey(item?.key)) problems.push(`${label}: 키 "${item?.key}" 형식이 올바르지 않습니다.`);
        if (seenKeys.has(item.key)) problems.push(`${label}: 키 "${item.key}" 가 중복됩니다.`);
        seenKeys.add(item.key);
        if (!String(item?.label || "").trim()) problems.push(`${label}.${item?.key}: label 이 비어 있습니다.`);
      }
    }
  } else if (entry.entries) {
    problems.push(`${label}: listSource 가 ${entry.listSource} 인데 entries 가 선언돼 있습니다(무시됩니다).`);
  }

  if (entry.supportsSchedule && entry.channel !== "runtime") {
    problems.push(`${label}: 예약 발행은 즉시 반영(runtime) 채널에서만 의미가 있습니다 — 빌드 채널은 재배포 시점에 좌우됩니다.`);
  }
}

const novel = CMS_NAMESPACES.find((entry) => entry.ns === "light-novel");
if (!novel) {
  problems.push("light-novel 네임스페이스가 없습니다.");
} else {
  const actual = novel.constraints || {};
  if (actual.beatMaxLength !== EXPECTED_NOVEL_CONSTRAINTS.beatMaxLength) {
    problems.push(`light-novel: beatMaxLength 가 apply-vn-overrides 상수(${EXPECTED_NOVEL_CONSTRAINTS.beatMaxLength})와 다릅니다.`);
  }
  if (actual.minKoreanCharsPerEpisode !== EXPECTED_NOVEL_CONSTRAINTS.minKoreanCharsPerEpisode) {
    problems.push(`light-novel: minKoreanCharsPerEpisode 가 색인 임계값(${EXPECTED_NOVEL_CONSTRAINTS.minKoreanCharsPerEpisode})과 다릅니다.`);
  }
  const forbidden = Array.isArray(actual.forbiddenInBeat) ? actual.forbiddenInBeat : [];
  for (const token of EXPECTED_NOVEL_CONSTRAINTS.forbiddenInBeat) {
    if (!forbidden.includes(token)) problems.push(`light-novel: 금칙문자 목록에 ${JSON.stringify(token)} 이 빠졌습니다.`);
  }
}

if (problems.length) {
  for (const problem of problems) console.error(`[cms-registry] 실패 — ${problem}`);
  console.error(`[cms-registry] ${problems.length}건의 문제로 검사에 실패했습니다.`);
  process.exit(1);
}

const runtime = CMS_NAMESPACES.filter((entry) => entry.channel === "runtime").length;
const build = CMS_NAMESPACES.length - runtime;
console.log(`[cms-registry] OK: 네임스페이스 ${CMS_NAMESPACES.length}개 (즉시 반영 ${runtime} · 사이트 반영 ${build})`);
