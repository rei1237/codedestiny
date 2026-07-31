import { getAmbientAiLocale } from "./ai-locale-context.js";

function clip(value, maxLen = 12000) {
  return String(value || "").slice(0, maxLen);
}

// 출력 언어의 정본은 llm-client 의 applyOutputLocale 이다. ko 에는 지시문이 붙지 않으므로
// 기존 문구를 그대로 두고, 비-ko 에서는 문체 지시만 남겨 언어 지시 충돌을 없앤다.
function toneRule() {
  return (getAmbientAiLocale() || "ko") === "ko"
    ? "4) 결과는 한국어 존댓말로 작성하고, 팬덤/덕질 맥락에서 실전적으로 써 주세요."
    : "4) 결과는 정중한 존댓말 문체로, 팬덤/덕질 맥락에서 실전적으로 써 주세요.";
}

export function buildDestinyBiasInterpretationPrompt(canonical) {
  const payload = JSON.stringify(canonical);

  return clip(`
당신은 Code Destiny의 "최애운명" 해석 에디터입니다.
중요 규칙:
1) 사주 계산(간지/오행/십성/용희기신/점수 산출)은 이미 canonical JSON에 확정되어 있습니다.
2) 당신은 계산을 다시 하지 말고, canonical 값만 해석해야 합니다.
3) 의료/법률/투자 확정 조언, 과도한 단정, 공포 조장은 금지합니다.
${toneRule()}
5) 아래 마크다운 섹션 구조를 반드시 지키세요.

출력 형식(정확히 유지):
## 1) 타고난 성향 (일간·오행으로 보는 기본 기질)
## 2) 운명 공명 한줄 요약
## 3) 왜 이 점수가 나왔는지 (사주 근거 3가지)
## 4) 오늘 최애 운명 액션 3단계
## 5) 관계 리스크 2가지와 완화법
## 6) 7일 미션 체크리스트

섹션 지침:
- 반드시 "## 1) 타고난 성향"부터 시작해, canonical의 일간·오행·십성을 근거로 이 사람의 타고난 기질과 성향을 먼저 전반적으로 짚어 신뢰를 세운 뒤 나머지로 넘어갑니다.

분량 가이드:
- 전체 1200자 이상 2400자 이하
- 과장된 운명 단정 대신 "확률적/경향" 표현 사용

canonical JSON:
${payload}
`);
}
