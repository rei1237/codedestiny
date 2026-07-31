"use client";

import { ChevronDown } from "lucide-react";
import { NorthStarIcon } from "./ObservatorySvg";
import { LENS_LABELS, type EvidenceItem } from "../_lib/report-model";

const EVIDENCE_LABELS: Record<string, string> = {
  "saju.dayMaster": "일간",
  "saju.pillars": "사주 네 기둥",
  "saju.fiveElements": "오행 분포",
  "saju.strength": "일간 강약",
  "saju.usefulGod": "보완 축",
  "saju.unfavorableGod": "과다 주의 축",
  "saju.seasonalBalance": "조후(계절 균형)",
  "saju.tenGods": "십성 분포",
  "saju.tenGodsByPillar": "기둥별 십성",
  "saju.natalInteractions": "합충형파해",
  "saju.majorLuckActive": "현재 대운",
  "saju.majorLuckTimeline": "대운 구간",
  "saju.yearlyLuck": "세운",
  "ziwei.lifePalace": "명궁",
  "ziwei.keyPalaces": "주요 12궁",
  "ziwei.transformationPlacement": "사화 배치",
  "ziwei.sanFangSiZheng": "삼방사정",
  "ziwei.majorLuckActive": "현재 대한",
  "ziwei.majorLuckTimeline": "대한 구간",
  "ziwei.yearlyLuck": "유년운",
  "western.sun": "태양",
  "western.moon": "달",
  "western.mc": "천정점(MC)",
  "western.chartRuler": "차트 룰러",
  "western.corePlanets": "주요 행성",
  "western.tightAspects": "좁은 어스펙트",
  "western.elementBalance": "원소 균형",
  "western.modalityBalance": "모드 균형",
  "western.houseCusps": "하우스 커스프",
  "vedic.lagna": "라그나",
  "vedic.nakshatra": "나크샤트라",
  "vedic.dashaCurrent": "현재 다샤",
  "vedic.dashaNext": "다음 다샤",
  "vedic.rahuKetu": "라후-케투 축",
  "vedic.houseLords": "하우스 로드",
  "sukuyo.archetypeTitle": "본명숙 원형",
  "sukuyo.relationAxis": "27수 관계축",
  "sukuyo.shadows": "그림자",
  "synthesis.convergence": "관점이 겹치는 지점",
  "synthesis.divergence": "관점이 갈리는 지점",
  "synthesis.patternSummaries": "관점별 요약",
  "synthesis.lensAvailability": "관점 계산 상태",
};

function labelFor(path: string) {
  return EVIDENCE_LABELS[path] || path.split(".").slice(1).join(".") || path;
}

/**
 * "왜 이런 결론이 나왔나요?" 근거 패널.
 *
 * 커스텀 아코디언이 아니라 `<details>` 를 쓴다 — 30,000자 리포트에서 Ctrl+F 로 계산값을
 * 찾을 수 있는 것이 결정적이고(브라우저가 닫힌 details 를 자동으로 연다), 키보드·스크린리더
 * 동작도 브라우저가 준다.
 *
 * 여기 실리는 값은 전부 **서버가 계산 결과에서 직접 뽑은 것**이다. 이 패널은 사용자가
 * 신뢰성을 검증하는 자리라, LLM 이 인용한 값을 그대로 실으면 환각이 그대로 노출된다.
 */
export default function EvidenceDisclosure({
  evidence,
  open,
  onToggle,
}: {
  evidence: EvidenceItem[];
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  if (!evidence?.length) return null;

  const grouped = new Map<string, EvidenceItem[]>();
  for (const item of evidence) {
    const key = item.lens || "synthesis";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <details className="kdo-evidence" open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
      <summary className="kdo-evidence__summary">
        <NorthStarIcon className="kdo-evidence__icon" />
        <span>왜 이런 결론이 나왔나요?</span>
        <ChevronDown size={16} className="kdo-evidence__chevron" aria-hidden="true" />
      </summary>
      <div className="kdo-evidence__wrap">
        <div className="kdo-evidence__inner">
          <p className="kdo-evidence__note">이 장이 실제로 참고한 계산값입니다.</p>
          {[...grouped.entries()].map(([lens, items]) => (
            <section key={lens} className="kdo-evidence__group">
              <h4>{items[0]?.lensLabel || LENS_LABELS[lens] || lens}</h4>
              <dl>
                {items.map((item) => (
                  <div key={item.path} className="kdo-evidence__row">
                    <dt>
                      {labelFor(item.path)}
                      {item.provisional && <span className="kdo-evidence__badge">출생시간 미상 · 가능성</span>}
                    </dt>
                    <dd title={item.value}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}
