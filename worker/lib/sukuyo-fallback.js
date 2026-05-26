/**
 * Sukuyo Premium - Local Fallback Templates
 *
 * 12 chapters, each guaranteed 4000+ characters.
 * Supports personal / compat modes.
 */

import { getSukuyoChapterConfig } from "./sukuyo-chapter-config.js";

const MODE_LABELS = {
  personal: "개인",
  compat: "궁합",
};

const CHAPTER_TEMPLATE_META = {
  1: { focus: "영혼 원형", action: "정체성 정의와 자기 인식 루틴" },
  2: { focus: "감정 리듬", action: "달 주기 기반 감정 관리 루틴" },
  3: { focus: "페르소나", action: "대외 이미지와 언어 습관 조정" },
  4: { focus: "재정 중력", action: "수익/지출 패턴 재설계" },
  5: { focus: "협업 역학", action: "역할 분담과 갈등 완충 장치" },
  6: { focus: "관계 레이더", action: "거리감과 경계선 운영" },
  7: { focus: "위기 전환", action: "충돌 시나리오와 복구 프로토콜" },
  8: { focus: "환경 조율", action: "공간/수면/생활 리듬 최적화" },
  9: { focus: "정서 유대", action: "친밀감 회복과 소통 합의" },
  10: { focus: "운명 거리", action: "귀인/소모 관계 분류" },
  11: { focus: "월령 사이클", action: "초승-보름-하현 실행 플랜" },
  12: { focus: "마스터플랜", action: "90일/1년/3년 로드맵" },
};

function normalizeMode(mode) {
  return mode === "compat" ? "compat" : "personal";
}

function countChars(text) {
  return [...String(text || "")].length;
}

function toText(value, fallback = "미상") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function getProfileSummary(data = {}, mode = "personal") {
  if (mode === "compat") {
    const myMansion = toText(data?.myMansion || data?.personA?.mansion || data?.base?.mansion);
    const partnerMansion = toText(data?.partnerMansion || data?.personB?.mansion);
    const relation = toText(data?.relationType || data?.compatibility?.relationType);
    const distance = toText(data?.distanceLabel || data?.compatibility?.distanceLabel);

    return `
- 리포트 모드: 궁합
- 나의 숙요: ${myMansion}
- 상대 숙요: ${partnerMansion}
- 관계 유형: ${relation}
- 거리감: ${distance}
- 관계 목표: 감정 안정과 장기 지속성 동시 확보
`.trim();
  }

  return `
- 리포트 모드: 개인
- 본명숙: ${toText(data?.mansion || data?.base?.mansion)}
- 핵심 성향: ${toText(data?.traits?.core || data?.coreTrait)}
- 그림자 성향: ${toText(data?.traits?.hidden || data?.hiddenTrait)}
- 달 리듬: ${toText(data?.moonPhase || data?.lunar?.phase)}
- 성장 목표: 반복 패턴 이해 후 행동 루틴으로 전환
`.trim();
}

function buildCoreBody(chapterNum, data, mode) {
  const config = getSukuyoChapterConfig(chapterNum) || { title: `챕터 ${chapterNum}`, subtitle: "" };
  const meta = CHAPTER_TEMPLATE_META[chapterNum] || { focus: "핵심", action: "실행" };
  const modeLabel = MODE_LABELS[mode] || MODE_LABELS.personal;
  const profile = getProfileSummary(data, mode);

  const modeParagraph = mode === "compat"
    ? "궁합 모드에서는 두 사람의 상호작용이 본문의 중심입니다. 한 사람의 성향만 강조하면 실제 문제 해결력이 떨어집니다. 따라서 이 장에서는 감정의 속도 차이, 기대치 불일치, 갈등의 발화 조건을 분리해서 해석하고, 다시 만남의 언어와 조율의 언어를 구분해 설계합니다."
    : "개인 모드에서는 자신의 반복 패턴을 먼저 해석하는 것이 핵심입니다. 숙요 분석은 운명을 단정하는 도구가 아니라 반응 습관을 재구성하는 지도입니다. 따라서 이 장에서는 감정 반응, 선택 편향, 회피 습관을 구체적인 루틴으로 바꾸는 데 집중합니다.";

  return `# ${chapterNum}. ${config.title}

${config.subtitle}

## 데이터 컨텍스트
${profile}

## 핵심 해석: ${meta.focus}

이 챕터의 주제는 ${meta.focus}입니다. 숙요의 장점은 단순한 좋고 나쁨 판정보다 "왜 같은 장면이 반복되는가"를 구조적으로 설명한다는 점입니다. 사람은 감정이 흔들릴수록 원래의 습관으로 되돌아가고, 그 습관이 반복될수록 관계와 성과가 고정됩니다. 그래서 첫 단계는 자기 패턴을 식별하고 이름 붙이는 것입니다. 이름이 붙은 패턴은 관찰이 가능하고, 관찰된 패턴은 수정이 가능합니다.

${modeParagraph}

## 패턴 분해

첫째, 트리거를 구분합니다. 상황 자체가 문제가 아니라 상황을 해석하는 방식이 문제일 때가 많습니다. 같은 말도 어떤 날에는 공격으로 들리고 어떤 날에는 조언으로 들립니다. 이는 감정 에너지의 기준선이 달라졌기 때문입니다. 그래서 트리거 목록은 사건 중심이 아니라 해석 중심으로 기록해야 합니다.

둘째, 반응을 구분합니다. 무시, 과잉 설명, 감정 폭발, 침묵, 과도한 합리화 등 자신이 자주 사용하는 반응을 3개로 축소하십시오. 반응을 줄이면 수정의 난이도가 크게 떨어집니다.

셋째, 회복 루틴을 구분합니다. 갈등 이후 회복은 사과의 기술보다 리듬의 기술입니다. 몇 시간 냉각 후 어떤 채널로 대화할지, 어떤 문장으로 시작할지, 어떤 결론을 미루고 어떤 결론을 즉시 내릴지 미리 합의해야 합니다.

## 실행 설계: ${meta.action}

1. 하루 10분 관찰: 오늘의 트리거 1개, 자동 반응 1개, 대안 문장 1개를 기록합니다.
2. 주 2회 점검: 반복된 장면 1개를 골라 원인-반응-결과를 재작성합니다.
3. 주 1회 정리: 감정 소모가 큰 관계/일을 분류하고 경계 문장을 준비합니다.
4. 월말 피드백: 가장 개선된 습관 1개와 아직 어려운 습관 1개를 확정합니다.

## 확장 조언

이 장의 목표는 완벽한 통제가 아니라 재현 가능한 개선입니다. 숙요 리포트는 당신에게 미래를 단정하지 않습니다. 대신 현재의 선택을 바꾸는 언어를 제공합니다. 일상에서 작은 변화가 누적될 때 장기 궤도는 실제로 달라집니다. 특히 관계와 일, 돈의 문제는 분리되어 보이지만 감정 에너지라는 공통 연료를 공유합니다. 연료 관리가 좋아지면 세 영역이 동시에 개선됩니다.
`;
}

function buildExpansionBlock(chapterNum, mode, cycle) {
  const modeLabel = MODE_LABELS[mode] || MODE_LABELS.personal;
  const week = (cycle % 4) + 1;

  return `
## 보강 섹션 ${cycle + 1}

${modeLabel} 모드 보강 메모 ${cycle + 1}: 이번 주(${week}주차)에는 "감정 속도"와 "결정 속도"를 분리해서 기록하십시오. 감정은 빠르게 올라오지만 결정은 늦게 내려야 손실이 줄어듭니다. 대화가 필요한 장면에서는 사실-감정-요청 순서로 문장을 구성하고, 요청은 한 번에 한 가지로 제한하십시오. 지나치게 많은 요구는 상대의 방어 반응을 유도합니다.

또한 실천 항목은 작게 유지해야 합니다. 하루 루틴은 10분 단위로 끊고, 주간 루틴은 최대 3개만 유지하십시오. 많은 계획보다 반복 가능한 계획이 더 강력합니다. 실패한 날을 문제로 보지 말고 조정 신호로 해석하면 회복 속도가 빨라집니다. 이 원칙은 챕터 ${chapterNum}에서도 동일하게 적용됩니다.
`;
}

function ensureMinChars(text, minChars = 4000, chapterNum = 1, mode = "personal") {
  let output = String(text || "");
  let cycle = 0;
  while (countChars(output) < minChars) {
    output += "\n" + buildExpansionBlock(chapterNum, mode, cycle);
    cycle += 1;
    if (cycle > 24) break;
  }
  return output;
}

export function getSukuyoFallbackText(chapterNum, sukuyoData = {}, mode = "personal") {
  const normalizedMode = normalizeMode(mode);
  const base = buildCoreBody(chapterNum, sukuyoData, normalizedMode);
  return ensureMinChars(base, 4000, chapterNum, normalizedMode);
}
