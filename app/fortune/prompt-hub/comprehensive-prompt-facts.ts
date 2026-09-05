// 프롬프트 허브 종합 산출기 — 사용자가 고른 운세 체계만 골라 각 체계의 확정값 블록을 하나로 엮는다.
//
// 🔴 여기서 계산하지 않는다. 체계별 산출기(saju/ziwei/astro)를 그대로 부르고 순서만 정한다.
// 🔴 개별 산출기의 마무리 문장("…해석만 해 주세요")은 종합에서 제거한다 — 체계 수만큼 같은 문장이
//    반복되고, 조립기(buildStructuredFortunePrompt)가 이미 같은 취지의 가드 한 줄을 붙인다.
//    각 블록은 "헤더+데이터"와 "마무리 문장"이 빈 줄 하나로 갈려 있어 split("\n\n")[0] 이면 앞부분만 남는다.
// 🔴 산출되지 않는 체계(타로·꿈/상징·수비학)를 조용히 빼지 않는다. 빼면 LLM 이 뽑지 않은 카드를 지어낸다.
import { buildAstrologyPromptFacts, buildVedicPromptFacts, type AstroFactsInput } from "./astro-prompt-facts";
import { buildSajuPromptFacts } from "./saju-prompt-facts";
import { buildSukuyoPromptFacts } from "./sukuyo-prompt-facts";
import { buildZiweiPromptFacts } from "./ziwei-prompt-facts";

export type ComprehensiveFactsInput = AstroFactsInput & {
  gender?: string;
  systems?: string[];
};

/** 도구의 "활용할 운세 체계" 선택지 → 내부 키. 표에 없는 값은 무시한다. */
const SYSTEM_KEY: Record<string, string> = {
  "사주/명리학": "saju",
  자미두수: "ziwei",
  점성술: "astrology",
  베다점: "vedic",
  숙요점: "sukuyo",
  타로: "tarot",
  "꿈/상징": "dream",
  수비학: "numerology",
};

/** 출생 정보로 산출되지 않는 체계 — 고른 것만 이름을 적어 한 줄로 명시한다. */
const NON_COMPUTABLE_LABEL: Record<string, string> = {
  tarot: "타로",
  dream: "꿈/상징",
  numerology: "수비학",
};

/** 헤더+데이터만 남기고 개별 산출기의 마무리 문단을 뗀다. */
function headerAndData(block: string) {
  return String(block || "").split("\n\n")[0].trim();
}

export async function buildComprehensivePromptFacts(input: ComprehensiveFactsInput): Promise<string> {
  try {
    const selected = new Set(
      (Array.isArray(input.systems) ? input.systems : [])
        .map((label) => SYSTEM_KEY[String(label || "").trim()])
        .filter(Boolean),
    );
    if (!selected.size) return "";

    const birth = {
      birthDate: input.birthDate,
      calendarType: input.calendarType,
      leapMonth: input.leapMonth,
      birthTime: input.birthTime,
      birthTimeUnknown: input.birthTimeUnknown,
      birthPlace: input.birthPlace,
      birthTimezone: input.birthTimezone,
    };

    // 서버를 타는 두 체계는 함께 보낸다 — 순서대로 기다리면 왕복이 그대로 더해진다.
    const [astrologyBlock, vedicBlock] = await Promise.all([
      selected.has("astrology") ? buildAstrologyPromptFacts(birth, { scope: "summary" }) : "",
      selected.has("vedic") ? buildVedicPromptFacts(birth) : "",
    ]);

    const blocks: string[] = [];
    if (selected.has("saju")) blocks.push(headerAndData(buildSajuPromptFacts({ ...birth, gender: input.gender })));
    // 자미두수는 12궁을 통째로 싣는다 — 명궁 한 줄만 주면 LLM 이 나머지 궁을 지어낸다.
    // 블록이 14줄 남짓으로 길어지는 것은 의도된 값이다(종합 프롬프트 총량이 그만큼 는다).
    if (selected.has("ziwei")) {
      blocks.push(headerAndData(buildZiweiPromptFacts({ ...birth, gender: input.gender })));
    }
    if (astrologyBlock) blocks.push(headerAndData(astrologyBlock));
    if (vedicBlock) blocks.push(headerAndData(vedicBlock));
    if (selected.has("sukuyo")) {
      blocks.push(headerAndData(buildSukuyoPromptFacts({ birthDate: input.birthDate, calendarType: input.calendarType })));
    }

    // 사주·자미두수 엔진은 한국 표준시 벽시계만 받는다. 해외 표준시를 고른 사용자에게
    // 그 한계를 숨기면 LLM 이 어긋난 시주를 확정값처럼 읽는다.
    const birthTimezone = String(input.birthTimezone || "").trim() || "Asia/Seoul";
    if (birthTimezone !== "Asia/Seoul" && (selected.has("saju") || selected.has("ziwei"))) {
      blocks.push(
        `- 시간대 주의: 사주·자미두수 명식은 한국 표준시(Asia/Seoul) 벽시계로 산출했는데 출생지 표준시는 ${birthTimezone} 입니다.`
          + " 시주(시간 기둥)와 그에 딸린 해석은 어긋날 수 있으니 그 점을 밝히고, 시각에 민감한 판단은 단정하지 말아 주세요.",
      );
    }

    const nonComputable = Object.keys(NON_COMPUTABLE_LABEL)
      .filter((key) => selected.has(key))
      .map((key) => NON_COMPUTABLE_LABEL[key]);
    if (nonComputable.length) {
      blocks.push(
        `- ${nonComputable.join("·")}: 출생 정보로는 산출되지 않는 체계입니다. 사용자가 적어 준 카드·꿈·숫자만 쓰고, 뽑지 않은 카드나 보지 않은 꿈을 만들어 내지 마세요.`,
      );
    }

    const filled = blocks.filter(Boolean);
    if (!filled.length) return "";

    return [
      "[종합 산출 데이터]",
      "아래 체계별 값은 내부 결정론 엔진이 이미 산출한 확정값입니다. 다시 계산하거나 바꾸지 말고 그대로 근거로 삼고, 체계마다 어느 값에서 나온 해석인지 밝혀 주세요. 여기에 없는 값은 산출되지 않은 것이니 지어내지 마세요.",
      "",
      filled.join("\n\n"),
    ].join("\n");
  } catch {
    return "";
  }
}
