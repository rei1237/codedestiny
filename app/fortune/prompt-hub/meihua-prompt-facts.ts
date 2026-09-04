import { calculateBasicMeihua, type GuaInfo } from "./meihua-calc";

// 프롬프트 허브 매화역수 도구 전용 — 사용자가 적은 '사건이나 징후가 발생한 시각'을 정본 매화역수
// 계산기(meihua-calc.ts)의 시간기괘법에 넘겨 본괘·호괘·변괘·체용 관계를 산출하고, 프롬프트에
// 주입할 한국어 [산출 데이터] 블록을 만든다. 괘 배치 규칙은 여기서 만들지 않는다.
//
// 🔴 '숫자 또는 계기' 입력은 입괘에 쓰지 않는다 — 이 계산기의 정본 입괘법은 시간기괘법(연월일시분)
//    하나뿐이라, 숫자를 섞으면 이 레포에 없는 수기괘법을 새로 지어내는 셈이 된다. 숫자·징후는
//    허브가 [입력 단서]에 이미 그대로 싣고 있으므로 해석 재료로만 남긴다.
// 🔴 buildMeihuaPrompt() 를 쓰지 않는 이유: 그 함수는 역할 문장까지 담은 **완성 프롬프트**라서
//    허브 골격과 겹친다. 여기서는 산출값만 낸다.

export type MeihuaFactsInput = {
  eventDateTime: string;
  question?: string;
  numberOrSign?: string;
};

function parseEventDateTime(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour24 = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour24 > 23 || minute > 59) return null;
  return { year, month, day, hour24, minute };
}

function guaLabel(gua: GuaInfo) {
  return `${gua.name} · ${gua.element}`;
}

function guaLabelWithSymbols(gua: GuaInfo) {
  return `${guaLabel(gua)} · 상징 ${gua.symbols}`;
}

/**
 * 매화역수 프롬프트에 붙일 산출 데이터 블록. 사건 시각이 없거나 형식이 어긋나면 빈 문자열을
 * 돌려주어 호출부가 조용히 골격 프롬프트로 떨어지게 한다(숙요점 빌더와 같은 계약).
 */
export function buildMeihuaPromptFacts(input: MeihuaFactsInput): string {
  try {
    const parts = parseEventDateTime(input.eventDateTime);
    if (!parts) return "";

    const result = calculateBasicMeihua({
      // modeLabel·인적 정보는 계산에 쓰이지 않고 결과에 그대로 실리기만 한다(이 블록에선 출력 안 함).
      modeLabel: "",
      name: "",
      gender: "",
      birthDate: "",
      birthTime: "",
      calendarType: "",
      question: String(input.question || "").trim(),
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour24: parts.hour24,
      minute: parts.minute,
      baseDateTime: String(input.eventDateTime).trim(),
    });

    const lines: string[] = ["[매화역수 산출 데이터]"];
    lines.push(`- 입괘 기준 시각: ${result.baseDateTime}`);
    lines.push("- 입괘 방식: 시간기괘법 (연월일로 상괘, 시를 더해 하괘, 분까지 더해 동효)");
    lines.push(`- 상괘: ${guaLabelWithSymbols(result.upperGua)}`);
    lines.push(`- 하괘: ${guaLabelWithSymbols(result.lowerGua)}`);
    lines.push(`- 본괘: ${result.mainHexagramName}`);
    lines.push(`- 호괘: ${result.mutualHexagramName}`);
    lines.push(`- 동효: ${result.changingLine}효 → 변괘 ${result.changedHexagramName}`);
    lines.push(`- 체괘: ${guaLabel(result.bodyGua)} / 용괘: ${guaLabel(result.useGua)}`);
    lines.push(`- 체용 관계: ${result.bodyUseRelation}`);
    // coreSummary 는 위 줄들의 재진술인데다 "${괘이름}으로" 처럼 한자로 끝나는 괘 이름에 조사를
    // 고정해 붙여(水天需으로) 어긋나는 문장이 섞인다 — 이 블록에는 싣지 않는다.
    if (input.numberOrSign) {
      lines.push(`- 숫자·계기(입력, 입괘에는 쓰지 않음): ${String(input.numberOrSign).trim()}`);
    }
    lines.push("- 산출 기준: 사건 시각 기반 시간기괘법 (내부 매화역수 엔진 확정값)");
    lines.push("");
    lines.push(
      "위 값은 이미 정확히 산출된 확정 데이터입니다. 괘와 동효를 다시 뽑지 말고 그대로 근거로 삼아, 본괘에서 변괘로 이어지는 변화의 결을 풀어 주세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}
