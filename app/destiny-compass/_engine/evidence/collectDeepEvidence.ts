/**
 * 심층 리포트용 근거 묶음(EvidencePack) 조립 — 읽기 전용.
 *
 * DirectionField.raw 에 이미 담긴 체계별 근거 + 사주 심층 근거를 한 봉투로 모은다.
 * 서버는 이 봉투에 있는 항목만 인용할 수 있고(화이트리스트), 여기 없는 용어는 검증기가 막는다.
 *
 * 결정론: 난수·Date 미사용. 정렬·상한 모두 고정 규칙.
 * 점수 무관: directionScore 의 blend 는 이 파일을 호출하지 않는다.
 */
import type { CompassInput, DirectionField, Evidence, SystemKey } from "../types";
import { availableAdapters, normalizedWeights } from "../adapters/registry";
import { buildSajuNatalEvidence } from "./sajuNatalEvidence";

export const EVIDENCE_PACK_VERSION = "compass-evidence-v1";

/** 체계당 상한 — 프롬프트가 근거 나열로 부풀지 않게 자른다. */
const MAX_ITEMS_PER_SYSTEM = 12;
const MAX_ITEMS_TOTAL = 40;
const MAX_TERM_CHARS = 80;
const MAX_DETAIL_CHARS = 180;

export interface EvidencePackSystem {
  system: SystemKey;
  /** 0..1 — 어댑터가 보고한 데이터 품질 */
  dataQuality: number;
  /** 0..1 — 정규화 가중치(registry 와 동일 산출) */
  weight: number;
  items: Evidence[];
}

export interface EvidencePack {
  version: typeof EVIDENCE_PACK_VERSION;
  systems: EvidencePackSystem[];
}

function clip(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const t = value.trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function normalizeItem(item: Evidence): Evidence | null {
  const term = clip(item?.term, MAX_TERM_CHARS);
  if (!term) return null;
  return {
    system: item.system,
    term,
    detail: clip(item.detail, MAX_DETAIL_CHARS),
    id: item.id,
    group: item.group,
    tone: item.tone,
  };
}

/**
 * @param input 사주 심층 근거를 위해 생년 정보가 필요하다.
 * @param field computeDirectionField 결과(읽기만 한다 — 절대 쓰지 않는다).
 */
export function collectDeepEvidence(input: CompassInput, field: DirectionField): EvidencePack {
  const weights = normalizedWeights(availableAdapters(input));
  const systems: EvidencePackSystem[] = [];
  let total = 0;

  // field.sources 순서를 그대로 따른다(기여한 엔진만, 결정론 순서).
  for (const system of field.sources) {
    const contribution = field.raw?.[system];
    if (!contribution) continue;

    const items: Evidence[] = [];
    for (const raw of contribution.evidence || []) {
      const item = normalizeItem(raw);
      if (item) items.push(item);
    }

    if (system === "saju") {
      // 어댑터가 쓴 일간과 어긋나면 buildSajuNatalEvidence 가 스스로 빈 배열을 돌려준다.
      const dayStem = (contribution.evidence || []).find((e) => e.id === "saju.dayStem")?.term.replace(/^일간\s*/, "");
      for (const raw of buildSajuNatalEvidence(input.birth, dayStem)) {
        const item = normalizeItem(raw);
        if (item) items.push(item);
      }
    }

    const capped: Evidence[] = [];
    for (const item of items) {
      if (capped.length >= MAX_ITEMS_PER_SYSTEM || total >= MAX_ITEMS_TOTAL) break;
      capped.push(item);
      total += 1;
    }
    if (!capped.length) continue;

    systems.push({
      system,
      dataQuality: Math.max(0, Math.min(1, Number(contribution.dataQuality) || 0)),
      weight: Math.max(0, Math.min(1, weights.get(system) || 0)),
      items: capped,
    });
  }

  return { version: EVIDENCE_PACK_VERSION, systems };
}
