/**
 * 사주 심층 근거 — 스코어링 경로 **바깥**의 읽기 전용 모듈.
 *
 * 왜 어댑터가 아니라 여기인가:
 *   scripts/verify-destiny-compass-determinism.mjs 가 어댑터 안에서 computeNatalFromInput 호출을
 *   금지한다(계산 경로 무침해 가드). 그 가드를 약화시키지 않으려고 별도 모듈로 뺐다.
 *   이 파일은 directionScore 의 blend 에 절대 참여하지 않는다 — 점수는 한 톨도 바뀌지 않는다.
 *
 * 결정론: 난수·Date 미사용. 입력은 생년 정보뿐이고 calculateLocalSaju 는 그 입력만으로 계산한다.
 *
 * 🔴 대운(daewoonAnalysis)은 여기서 뽑지 않는다. 이 경로는 luckRows 를 주지 않아
 *    엔진이 status:"not_supplied" 를 돌려준다 — 없는 것을 근거로 만들지 않는다.
 */
import { computeNatalFromInput } from "@/app/saju/animal-destiny/lib/sajuAdapter";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import type { Evidence } from "../types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

/** {name: score} 맵에서 상위 n개를 "정관 2.2 · 편재 1.7" 형태로. 동점은 이름 사전순(결정론). */
function topScores(map: unknown, n: number): string {
  const rows = Object.entries(asRecord(map))
    .map(([k, v]) => [k, Number(v) || 0] as [string, number])
    .filter(([, v]) => v > 0);
  rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return rows
    .slice(0, n)
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ");
}

/**
 * 명식에서 이미 계산된 구조 정보를 근거 항목으로 옮긴다.
 *
 * @param expectedDayStem 어댑터가 실제로 쓴 명식의 일간. 이 값과 어긋나면 **전부 버린다** —
 *   어댑터 경로는 KASI 보정을 거칠 수 있어 드물게 일주가 달라질 수 있고, 그때 여기 값을
 *   근거로 내보내면 화면의 십이운성과 앞뒤가 맞지 않는 리포트가 나간다.
 */
export function buildSajuNatalEvidence(birth: AnimalDestinyInput, expectedDayStem?: string): Evidence[] {
  let natal: Record<string, unknown>;
  try {
    natal = asRecord(asRecord(computeNatalFromInput(birth)).natalAnalysis);
  } catch {
    return []; // 심층 근거는 부가 정보다 — 실패해도 결과 전체를 막지 않는다.
  }

  const dayMaster = asRecord(natal.dayMaster);
  const stem = text(dayMaster.stem);
  if (!stem) return [];
  if (expectedDayStem && stem !== expectedDayStem) return [];

  const out: Evidence[] = [];
  const push = (id: string, term: string, detail: string, group: Evidence["group"]) => {
    if (detail) out.push({ system: "saju", term, detail, id, group });
  };

  const elementKo = text(dayMaster.elementKo);
  const strength = text(dayMaster.strength);
  const strengthIndex = Number(dayMaster.strengthIndex);
  push(
    "saju.dayMaster",
    `일간 ${stem}${elementKo ? `(${elementKo})` : ""}`,
    [strength ? `신강도 ${strength}` : "", Number.isFinite(strengthIndex) ? `지수 ${strengthIndex}` : "", text(dayMaster.polarity)]
      .filter(Boolean)
      .join(" · "),
    "core",
  );

  const month = asRecord(natal.monthCommand);
  if (text(month.branch)) push(
    "saju.monthCommand",
    `월령 ${text(month.branch)}`,
    [text(month.season) ? `${text(month.season)}` : "", text(month.commandingElementKo) ? `사령 ${text(month.commandingElementKo)}` : ""]
      .filter(Boolean)
      .join(" · "),
    "structure",
  );

  const ranking = Array.isArray(asRecord(natal.fiveElements).ranking) ? (asRecord(natal.fiveElements).ranking as unknown[]) : [];
  push(
    "saju.fiveElements",
    "오행 분포",
    ranking
      .map((row) => {
        const r = asRecord(row);
        return `${text(r.elementKo)} ${Number(r.power) || 0}`;
      })
      .filter((s) => s.trim().length > 1)
      .join(" · "),
    "structure",
  );

  const tenGods = asRecord(natal.tenGods);
  push("saju.tenGods", "십성(투간)", topScores(tenGods.visible, 3), "structure");
  push("saju.tenGodsHidden", "십성(지장간)", topScores(tenGods.hidden, 3), "structure");

  const useful = asRecord(natal.usefulElements);
  const priority = Array.isArray(useful.finalPriorityKo) ? (useful.finalPriorityKo as unknown[]).map(text).filter(Boolean) : [];
  const johu = asRecord(natal.johu);
  push(
    "saju.yongshin",
    "용신",
    [priority.length ? `우선순위 ${priority.join(" · ")}` : "", text(johu.urgentElementKo) ? `조후 급한 기운 ${text(johu.urgentElementKo)}` : ""]
      .filter(Boolean)
      .join(" / "),
    "core",
  );

  const gyeokguk = asRecord(natal.gyeokgukAnalysis);
  if (text(gyeokguk.finalGyeokguk)) {
    push("saju.gyeokguk", `격국 ${text(gyeokguk.finalGyeokguk)}`, text(gyeokguk.finalType) || "격국 판정", "core");
  }

  const rooting = asRecord(natal.rooting);
  if (typeof rooting.rooted === "boolean") {
    push(
      "saju.rooting",
      "통근",
      `${rooting.strongRooted ? "강하게 뿌리내림" : rooting.rooted ? "뿌리 있음" : "뿌리 약함"}${text(rooting.monthBranchSupport) ? ` · 월지 ${text(rooting.monthBranchSupport)}` : ""}`,
      "structure",
    );
  }

  return out;
}
