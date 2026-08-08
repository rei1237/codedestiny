import { NextRequest, NextResponse } from "next/server";
import { requireRouteAuth } from "@/app/_lib/route-auth";
import { computeVedicChartSwiss } from "@/lib/vedicSwissChart.js";
import { callLLM } from "@/lib/llm-client";

export const runtime = "nodejs";
export const maxDuration = 60;

type VedicReadingBody = {
  name?: unknown;
  gender?: unknown;
  year?: unknown;
  month?: unknown;
  day?: unknown;
  birthDate?: unknown;
  hour?: unknown;
  minute?: unknown;
  birthTime?: unknown;
  birthTimeUnknown?: unknown;
  tzOffset?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
  topic?: unknown;
  question?: unknown;
};

function clean(value: unknown, maxLength = 0) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function parseNumber(value: unknown) {
  const text = clean(value, 40);
  if (!text) return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function parseInteger(value: unknown) {
  const number = parseNumber(value);
  return Number.isFinite(number) ? Math.trunc(number) : NaN;
}

function parseDateParts(body: VedicReadingBody) {
  const birthDate = clean(body.birthDate, 10);
  const match = birthDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const year = match ? Number(match[1]) : parseInteger(body.year);
  const month = match ? Number(match[2]) : parseInteger(body.month);
  const day = match ? Number(match[3]) : parseInteger(body.day);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseTimeParts(body: VedicReadingBody) {
  if (body.birthTimeUnknown === true) return { hour: 12, minute: 0 };

  const birthTime = clean(body.birthTime, 5);
  const match = birthTime.match(/^(\d{1,2}):(\d{2})$/);
  const hour = match ? Number(match[1]) : parseInteger(body.hour);
  const minute = match ? Number(match[2]) : parseInteger(body.minute);
  const finalHour = Number.isInteger(hour) ? hour : 12;
  const finalMinute = Number.isInteger(minute) ? minute : 0;

  if (finalHour < 0 || finalHour > 23 || finalMinute < 0 || finalMinute > 59) return null;
  return { hour: finalHour, minute: finalMinute };
}

function buildVedicSystemPrompt() {
  return `
당신은 조티시(Jyotish) 베다 점성술 전문 상담가입니다.
수십 년간 라시, 나크샤트라, 바바(Bhava), 다샤 체계를 연구한 현인의 목소리로 상담합니다.

================================================================
절대 원칙
================================================================

【계산 금지 원칙 — 가장 중요】
사용자 프롬프트에 이미 계산된 차트 데이터가 주어집니다.
당신은 절대로 직접 천문 계산을 시도하지 않습니다.
제공된 값(라시·나크샤트라·다샤)을 그대로 사용하여 해석만 수행합니다.
계산값이 이상하다고 판단되어도 임의로 수정하지 않습니다.

================================================================
출력 구조 (JSON — 이 형식만 반환)
================================================================

JSON 외 어떤 텍스트도, 마크다운 블록도 포함하지 않습니다.

{
  "scores": {
    "dharma": 숫자,
    "artha": 숫자,
    "kama": 숫자,
    "moksha": 숫자,
    "overall": 숫자
  },
  "sections": {
    "lagna": {
      "title": "拉格納 — 어센던트가 말하는 영혼의 입구",
      "body": "500~700자 산문. 어센던트 라시의 원소·성질·지배성을 기반으로 이 사람이 세상을 마주하는 방식, 타고난 기질의 외적 표현, 삶의 첫 번째 층위를 서술. 라시 이름은 한국어+산스크리트어 병기."
    },
    "sun_nakshatra": {
      "title": "蘇利耶 — 태양이 머문 별자리의 빛",
      "body": "500~700자 산문. 태양 나크샤트라의 지배 행성·상징·신격을 통합하여 이 사람의 자아 정체성, 아버지·권위와의 관계, 사회적 목적의식을 서술. 단순 나열 금지."
    },
    "moon_nakshatra": {
      "title": "旃陀羅 — 달이 머문 별자리의 감정",
      "body": "500~700자 산문. 달 나크샤트라의 지배 행성·상징·파다를 통합하여 감정 반응 패턴, 내면의 욕구, 어머니·안전감·기억과의 관계를 서술. '당신의 달은 ~에 있습니다'로 시작."
    },
    "dasha": {
      "title": "達薩 — 지금 이 행성의 계절",
      "body": "600~800자 산문. 현재 다샤 행성의 의미, 이 주기가 삶의 어느 영역을 활성화하는지, 앞으로 올 다샤의 예고를 통합 서술. '지금 당신은 ~의 계절을 살고 있습니다'로 시작. 구체적인 연도와 행성 이름 포함."
    },
    "karma": {
      "title": "業 — 라후·케투가 가리키는 이 생의 카르마",
      "body": "600~800자 산문. 라후(Rahu)의 라시·나크샤트라·하우스를 '이번 생에서 집착하며 확장·성장해야 할 영역'으로, 케투(Ketu)의 라시·나크샤트라·하우스를 '전생에서 이미 익숙해 내려놓아야 할 카르마'로 명확히 대비하여 통합 서술. 두 축이 어느 삶의 무대(하우스)에서 당기고 미는지 구체적으로 짚고, 나크샤트라 지배 행성 조합도 함께 고려. 베다 점성술의 다르마(Dharma)·목샤(Moksha) 관점에서 마무리."
    },
    "topic": {
      "title": "問 — 지금 질문에 대한 답",
      "body": "600~800자 산문. 상담 주제(직업/연애/재물 등)에 집중하여 차트 데이터와 현재 다샤를 연결한 구체적 해석. 막연한 조언이 아니라 '지금 이 시기에 이 사람에게 맞는 방향'을 서술."
    },
    "prescription": {
      "title": "方 — 별이 건네는 오늘의 처방",
      "body": "400~500자 산문. 전체 해석을 바탕으로 지금 이 사람에게 가장 필요한 방향 2~3가지를 산문으로 자연스럽게 연결. 마지막 문장은 이름을 불러 따뜻하게 마무리. 추가 질문 유도 문구 절대 금지."
    }
  }
}

================================================================
문체 원칙
================================================================
- 한국어 격식체(합니다)
- 산스크리트 용어 첫 등장 시 한국어+산스크리트 병기
- 각 섹션 body는 서로 다른 첫 문장 구조
- '~할 수 있습니다' 한 단락 2회 이상 금지
- 불릿·번호 나열 금지
- 마지막 질문 유도 절대 금지
- 전체 분량: 3,600~5,100자
`.trim();
}

function buildVedicUserPrompt(name: string, gender: string, chart: any, topic: string, question: string) {
  return `
다음은 ${name || "상담자"}(${gender || "미입력"})님의 베다 점성술 차트입니다.
아래 배치는 이미 산출된 기준이므로 다시 계산하거나 추정하지 말고, 이 별의 자리를 그대로 붙들고 해석하십시오.

=== 확정된 차트 기준 ===

【어센던트(Lagna)】
- 라시: ${chart.lagna.rashi.name} (${chart.lagna.rashi.en})
- 황경: ${chart.lagna.degree}°
- 원소: ${chart.lagna.rashi.element}  |  성질: ${chart.lagna.rashi.quality}

【태양(Surya)】
- 라시: ${chart.sun.rashi.name}  |  황경: ${chart.sun.degree}°
- 나크샤트라: ${chart.sun.nakshatra.name} ${chart.sun.nakshatra.pada}파다
- 나크샤트라 지배성: ${chart.sun.nakshatra.lord}
- 상징: ${chart.sun.nakshatra.symbol}
- 하우스: ${chart.sun.house}번째 바바(Bhava)

【달(Chandra)】
- 라시: ${chart.moon.rashi.name}  |  황경: ${chart.moon.degree}°
- 나크샤트라: ${chart.moon.nakshatra.name} ${chart.moon.nakshatra.pada}파다
- 나크샤트라 지배성: ${chart.moon.nakshatra.lord}
- 상징: ${chart.moon.nakshatra.symbol}
- 하우스: ${chart.moon.house}번째 바바(Bhava)

【라후(Rahu) — 이번 생의 확장 방향】
- 라시: ${chart.rahu.rashi.name}  |  황경: ${chart.rahu.degree}°
- 나크샤트라: ${chart.rahu.nakshatra.name} ${chart.rahu.nakshatra.pada}파다 (지배성 ${chart.rahu.nakshatra.lord})
- 하우스: ${chart.rahu.house}번째 바바(Bhava)

【케투(Ketu) — 전생에서 이어진 카르마】
- 라시: ${chart.ketu.rashi.name}  |  황경: ${chart.ketu.degree}°
- 나크샤트라: ${chart.ketu.nakshatra.name} ${chart.ketu.nakshatra.pada}파다 (지배성 ${chart.ketu.nakshatra.lord})
- 하우스: ${chart.ketu.house}번째 바바(Bhava)

【Vimshottari Dasha】
- 현재 주기 행성: ${chart.dasha.currentLord}
- 잔여: ${chart.dasha.remaining}년
- 다샤 순서:
${chart.dasha.sequence.map((d: any, i: number) => `  ${i === 0 ? "→" : " "} ${d.lord} (${d.startYear}~${d.endYear}, ${d.years}년)`).join("\n")}

【Ayanamsha】Lahiri ${chart.ayanamsha}°

=== 상담 주제 ===
${topic || "전체 흐름"}${question ? `\n\n추가 질문: ${question}` : ""}

위 별의 자리를 바탕으로 해석하십시오.
`.trim();
}

function parseReadingJson(value: string) {
  const text = clean(value, 60000)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(text);
}

export async function POST(req: NextRequest) {
  const auth = requireRouteAuth(req);
  if (!auth.ok) return auth.response;

  let body: VedicReadingBody;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const dateParts = parseDateParts(body);
  const timeParts = parseTimeParts(body);
  if (!dateParts || !timeParts) {
    return NextResponse.json({ error: "INVALID_BIRTH_INPUT" }, { status: 400 });
  }

  const lat = parseNumber(body.latitude ?? body.lat);
  const lng = parseNumber(body.longitude ?? body.lng);
  const tzOffset = parseNumber(body.tzOffset);
  const finalLat = Number.isFinite(lat) ? lat : 37.5665;
  const finalLng = Number.isFinite(lng) ? lng : 126.978;
  const finalTzOffset = Number.isFinite(tzOffset) ? tzOffset : 9;

  let chart;
  try {
    chart = await computeVedicChartSwiss(
      {
        ...dateParts,
        ...timeParts,
        tzOffset: finalTzOffset,
        latitude: finalLat,
        longitude: finalLng,
      },
      { origin: req.nextUrl.origin, requestUrl: req.url },
    );
  } catch (error) {
    const message = clean((error as Error)?.message || error, 120);
    console.error("[vedic-reading] calculation failed", { message });
    return NextResponse.json({ error: "CALC_FAILED", detail: message }, { status: 422 });
  }

  const name = clean(body.name, 80);
  const gender = clean(body.gender, 40);
  const topic = clean(body.topic, 120);
  const question = clean(body.question, 1200);
  const systemPrompt = buildVedicSystemPrompt();
  const userPrompt = buildVedicUserPrompt(name, gender, chart, topic, question);

  let reading;
  let llmMeta;
  try {
    const llm = await callLLM({
      systemPrompt,
      prompt: userPrompt,
      // 7개 섹션 합계 3,500~5,000자 JSON 요구(한국어 1자≈1~1.5토큰) — 구 상한 7000은
      // 상단 분량에서 잘려 JSON.parse 실패→502 LLM_FAILED가 났다.
      maxTokens: 10000,
      temperature: 0.72,
      taskType: "fortune",
      timeoutMs: 45000,
    });
    reading = parseReadingJson(llm.text);
    llmMeta = { provider: llm.provider, model: llm.model };
  } catch (error) {
    const message = clean((error as Error)?.message || error, 300);
    console.error("[vedic-reading] llm failed", { message });
    return NextResponse.json({ error: "LLM_FAILED", detail: message, chart }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    chart,
    reading,
    prompts: {
      system: systemPrompt,
      user: userPrompt,
    },
    llmMeta,
    calculationMeta: {
      latitude: finalLat,
      longitude: finalLng,
      tzOffset: finalTzOffset,
      defaultLocationApplied: !Number.isFinite(lat) || !Number.isFinite(lng),
      defaultTimezoneApplied: !Number.isFinite(tzOffset),
      llmMustNotRecalculate: true,
    },
  });
}
