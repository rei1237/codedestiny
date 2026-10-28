// 저장된 사주 결과의 재분석 점검(dry-run). 읽기만 하고 아무것도 쓰지 않는다.
// 저장본은 작성 당시 스냅샷으로 남기고, 재분석은 새 버전으로 따로 만든다. 여기서는 지금 규칙으로 다시 계산하면
// 종격·격국·강약·용신·조후 중 무엇이 달라지는지만 돌려준다.
// 옛 과거 길흉 설문이 원국을 바꾼 흔적:
//  - 영냥이 saju context: jong.rejectedByUser·confirmedByUser, strengthHeuristic.flippedByUser·confirmedByUser
//  - 본 화면 sajuResult: jong.verifiedText의 [종격 확정]·[가종격 확정]·[일반 내격 전환]
import { analyzeJohu, applyRuntimeYongshinPolicy, calcPower, detectJong } from "../yeongnyangi/fortune/saju-runtime.mjs";
import { gyeokgukView, NATAL_CORE_VERSION } from "../../lib/saju/natal-core/index.mjs";

export const NATAL_REANALYSIS_VERSION = "saju-natal-reanalysis-v1";
const FIELDS = ["jong", "gyeokguk", "strength", "usefulGod", "climate"];
const POS = { y: "year", m: "month", d: "day", h: "hour" };

const pillarFromText = (text) => ({ g: String(text || "")[0] || "", j: String(text || "")[1] || "" });
const elements = (value) => (Array.isArray(value) ? value.map(String) : null);
const baseName = (name) => (typeof name === "string" && name.trim() ? name.replace(/\s*\([^()]*\)\s*$/u, "").trim() : null);

function readSnapshot(snapshot) {
  if (snapshot?.domain === "saju" && Array.isArray(snapshot.facts)) {
    const fact = (label) => snapshot.facts.find((f) => f?.label === label)?.value;
    const pillars = fact("pillars");
    const jong = fact("jong") || {}, strength = fact("strengthHeuristic") || {}, climate = fact("seasonalBalance") || {};
    return {
      source: "yeongnyangi",
      pillars: pillars && Object.fromEntries(Object.entries(POS).map(([k, label]) => [k, pillarFromText(pillars[label])])),
      jong, strength, climate,
      usefulGod: fact("usefulGod") ?? strength.yongshin,
      gyeokguk: fact("advancedFactors")?.gyeokguk?.finalGyeokguk,
      storedNatalCoreVersion: snapshot.natalCore?.version || null,
    };
  }
  if (snapshot?.pillars?.d) {
    const pillars = Object.fromEntries(Object.keys(POS).map((k) => [k, { g: String(snapshot.pillars[k]?.g || ""), j: String(snapshot.pillars[k]?.j || "") }]));
    return {
      source: "main-shell",
      pillars, jong: snapshot.jong || {}, strength: snapshot.power || {}, climate: snapshot.johu || {},
      usefulGod: snapshot.power?.yongshin,
      gyeokguk: snapshot.advancedFactors?.gyeokguk?.finalGyeokguk,
      // jong.natalCore는 열거되지 않아 저장본에 남지 않는다.
      storedNatalCoreVersion: null,
    };
  }
  return null;
}

function markersOf(read) {
  const markers = [];
  if (read.jong.rejectedByUser) markers.push("jong.rejectedByUser");
  if (read.jong.confirmedByUser) markers.push("jong.confirmedByUser");
  if (read.strength.flippedByUser) markers.push("strength.flippedByUser");
  if (read.strength.confirmedByUser) markers.push("strength.confirmedByUser");
  const verified = String(read.jong.verifiedText || "");
  if (/가종격 확정|종격 확정/u.test(verified)) markers.push("jong.verifiedText:confirmed");
  if (/일반 내격 전환/u.test(verified)) markers.push("jong.verifiedText:rejected");
  return markers;
}

const view = ({ jong, gyeokguk, strength, usefulGod, climate }) => ({
  jong: { isJong: Boolean(jong?.isJong), name: jong?.isJong ? baseName(jong.name) : null },
  gyeokguk: baseName(gyeokguk),
  strength: typeof strength?.isStrong === "boolean" ? (strength.isStrong ? "신강" : "신약") : null,
  usefulGod: elements(usefulGod),
  climate: climate?.type || climate?.moistType ? { type: climate.type || null, moistType: climate.moistType || null } : null,
});

/**
 * 저장본 하나를 지금 규칙으로 다시 계산해 비교한다. 저장본은 바꾸지 않는다.
 * snapshot: 영냥이 saju DomainContext 또는 본 화면 sajuResult.
 * 저장본에 없던 항목(null)은 비교하지 않고 unchecked로 남긴다.
 */
export function inspectNatalReanalysis(snapshot) {
  const read = readSnapshot(snapshot);
  if (!read?.pillars?.d?.g || !read.pillars.d.j) return { version: NATAL_REANALYSIS_VERSION, status: "unreadable", reason: "일주가 없는 저장본" };
  const p = read.pillars;
  const johu = analyzeJohu(p), jong = detectJong(p), power = applyRuntimeYongshinPolicy(calcPower(p), jong, johu);
  const core = jong.natalCore;
  const before = view(read);
  const after = view({ jong, gyeokguk: gyeokgukView(core).name, strength: power, usefulGod: power?.yongshin, climate: johu });
  const unchecked = FIELDS.filter((key) => before[key] === null || (key === "jong" && !("isJong" in read.jong)));
  const changes = FIELDS.filter((key) => !unchecked.includes(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  const markers = markersOf(read);
  return {
    version: NATAL_REANALYSIS_VERSION,
    status: "ok",
    source: read.source,
    markers,
    surveyAffected: markers.length > 0,
    storedNatalCoreVersion: read.storedNatalCoreVersion,
    natalCore: { version: NATAL_CORE_VERSION, ruleProfile: core?.ruleProfile || null, analysisId: core?.analysisId || null },
    before, after, changes, unchecked,
  };
}
