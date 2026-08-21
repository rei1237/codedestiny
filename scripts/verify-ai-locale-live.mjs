#!/usr/bin/env node
/**
 * 프로덕션 AI 응답 언어 **실측** 게이트.
 *
 * verify-ai-locale-pipeline.mjs 는 소스 정적 검사라 "언어 지시가 붙을 준비가 됐다"까지만 말한다.
 * 실제로 그 언어로 나오는지는 LLM 을 태워 본문 문자를 세어 보는 수밖에 없다. 이 스크립트가 그것이다.
 *
 * 대상: POST /api/destiny-compass/narrate — 레포에서 **유일한 무인증 LLM 라우트**이고
 *       AI 본문(pigCommentary)을 응답에 그대로 실어 준다.
 *
 * 🔴 ok:true 를 성공으로 읽으면 안 된다. 서버 isFaithful 은 비-ko 에서 길이 검사만 하고
 *    통과시키므로, 한국어가 돌아와도 ok:true 다. 반드시 본문 스크립트를 직접 판정해야 한다.
 *
 * 🔴 실제 LLM 비용이 든다. CI 에 넣지 않는다 — 배포 전후 수동 게이트.
 *
 * 실행:
 *   node scripts/verify-ai-locale-live.mjs --base-url https://code-destiny.com
 *   node scripts/verify-ai-locale-live.mjs --locales en,ja --verbose
 */

const args = process.argv.slice(2);

function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const baseUrl = String(arg("base-url", "https://code-destiny.com")).replace(/\/$/, "");
const locales = String(arg("locales", "ko,en,ja,zh-CN")).split(",").map((s) => s.trim()).filter(Boolean);
const verbose = args.includes("--verbose");
const timeoutMs = Number(arg("timeout", "90000"));

// 스크립트별 코드포인트 범위. ja/zh 는 둘 다 한자를 쓰므로 **가나 유무**로 가른다.
const SCRIPTS = {
  hangul: /[가-힣]/g,
  kana: /[぀-ヿ]/g,
  han: /[一-鿿]/g,
  latin: /[A-Za-z]/g,
};

function scriptCounts(text) {
  const counts = {};
  for (const [name, pattern] of Object.entries(SCRIPTS)) {
    counts[name] = (text.match(pattern) || []).length;
  }
  return counts;
}

/**
 * 로케일별 합격 조건.
 * 한자는 ko/ja/zh 어디서든 고유명사로 섞일 수 있으므로 "존재"만으로 판정하지 않는다.
 */
const EXPECTATIONS = {
  ko: (c) => (c.hangul >= 8 ? null : `한글 ${c.hangul}자 — 한국어 본문이 아니다`),
  en: (c) => {
    if (c.hangul > 0) return `한글이 ${c.hangul}자 섞였다`;
    if (c.kana > 0) return `가나가 ${c.kana}자 섞였다`;
    if (c.latin < 40) return `라틴 문자 ${c.latin}자 — 영어 본문으로 보기 어렵다`;
    return null;
  },
  ja: (c) => {
    if (c.hangul > 0) return `한글이 ${c.hangul}자 섞였다`;
    if (c.kana < 8) return `가나 ${c.kana}자 — 일본어 본문이 아니다(중국어일 가능성)`;
    return null;
  },
  "zh-CN": (c) => {
    if (c.hangul > 0) return `한글이 ${c.hangul}자 섞였다`;
    if (c.kana > 0) return `가나가 ${c.kana}자 섞였다(일본어일 가능성)`;
    if (c.han < 15) return `한자 ${c.han}자 — 중국어 본문이 아니다`;
    return null;
  },
};
EXPECTATIONS["zh-TW"] = EXPECTATIONS["zh-CN"];

/**
 * 🔴 입력도 로케일에 맞춘다.
 *
 * 프롬프트는 "기본 해설의 영역 이름을 그대로 유지하라"를 강제한다. 그래서 한국어 라벨
 * ("재물")을 넣고 일본어 응답을 받으면, 모델이 두 지시를 **정확히 다 지킨 결과로** 일본어
 * 문장 안에 한글 2자가 남는다. 실측에서 실제로 그렇게 나왔다. 그걸 실패로 세면 파이프가
 * 아니라 테스트 입력을 재는 셈이다. 여기서는 파이프만 재기 위해 입력을 로케일에 맞춘다.
 *
 * (참고: destiny-compass 화면 라벨은 이제 copy.ts 의 로케일별 directionLabel 을 통해
 *  ja/zh 등 각 언어로 표시된다 — 이 스크립트가 재는 AI 응답 로케일과는 별개 경로다.)
 *
 * 🔴 캐시 우회. destiny-compass 는 deterministic:true + TTL 7일이라, 같은 입력을 다시 보내면
 *    LLM 을 안 태우고 캐시를 돌려준다. 그러면 "지금 이 배포가 그 언어로 답하는가"를 못 본다.
 *    매 실행 고유 토큰을 본문에 섞어 캐시 키를 갈라낸다.
 */
const PAYLOAD_BY_LOCALE = {
  ko: {
    question: "지금 이직을 고민하고 있어요",
    primaryLabel: "재물",
    baseText: "'재물' 쪽 길이 은은하게 빛나고 있어요. 서두르지 말고, 마음이 가는 한 가지부터 시작해요.",
  },
  en: {
    question: "I am thinking about changing jobs.",
    primaryLabel: "wealth",
    baseText: "The path of 'wealth' is glowing softly. Do not rush; start with the one thing your heart is drawn to.",
  },
  ja: {
    question: "今、転職を考えています。",
    primaryLabel: "財運",
    baseText: "『財運』の道が淡く輝いています。焦らず、心が向かう一つのことから始めてみましょう。",
  },
  "zh-CN": {
    question: "我正在考虑换工作。",
    primaryLabel: "财运",
    baseText: "「财运」的道路正柔和地发光。不要着急，从心之所向的那一件事开始吧。",
  },
  "zh-TW": {
    question: "我正在考慮換工作。",
    primaryLabel: "財運",
    baseText: "「財運」的道路正柔和地發光。不要著急，從心之所向的那一件事開始吧。",
  },
};

function buildPayload(locale, nonce) {
  const base = PAYLOAD_BY_LOCALE[locale] || PAYLOAD_BY_LOCALE.ko;
  return {
    narration: {
      question: `${base.question} (${nonce})`,
      primaryLabel: base.primaryLabel,
      evidence: [],
    },
    baseText: `${base.baseText} (ref ${nonce})`,
  };
}

async function probe(locale, nonce) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/api/destiny-compass/narrate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-code-destiny-locale": locale },
      body: JSON.stringify(buildPayload(locale, nonce)),
      signal: controller.signal,
    });
    const body = await response.json();
    return { status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];

for (const locale of locales) {
  const nonce = `${Date.now().toString(36)}-${locale}`;
  let outcome;
  try {
    outcome = await probe(locale, nonce);
  } catch (error) {
    results.push({ locale, ok: false, reason: `요청 실패: ${String(error?.message || error).slice(0, 160)}` });
    continue;
  }

  const { status, body } = outcome;
  const text = typeof body?.pigCommentary === "string" ? body.pigCommentary.trim() : "";

  if (!body?.ok || !text) {
    // 라우트가 원인을 감추므로(5가지가 같은 코드) 워커 로그를 함께 보라고 안내한다.
    results.push({
      locale,
      ok: false,
      reason: `본문 없음 (HTTP ${status}, error=${body?.error || "?"}) — wrangler tail 로 [compass narrate] 로그 확인 필요`,
    });
    continue;
  }

  const counts = scriptCounts(text);
  const expect = EXPECTATIONS[locale];
  const failure = expect ? expect(counts) : `판정 규칙이 없는 로케일: ${locale}`;
  results.push({ locale, ok: !failure, reason: failure, counts, provider: body.provider || "", text });
}

let failed = 0;
for (const r of results) {
  const mark = r.ok ? "OK  " : "FAIL";
  const counts = r.counts
    ? ` 한글=${r.counts.hangul} 가나=${r.counts.kana} 한자=${r.counts.han} 라틴=${r.counts.latin}`
    : "";
  console.log(`[ai-locale-live] ${mark} ${r.locale.padEnd(6)}${counts}${r.provider ? ` provider=${r.provider}` : ""}`);
  if (!r.ok) {
    failed += 1;
    console.log(`[ai-locale-live]      → ${r.reason}`);
  }
  if (verbose && r.text) console.log(`[ai-locale-live]      "${r.text.slice(0, 160)}"`);
}

if (failed) {
  console.error(`\n[ai-locale-live] FAILED ${failed}/${results.length}`);
  process.exit(1);
}
console.log(`\n[ai-locale-live] ok — ${results.length}개 로케일 전부 해당 언어로 응답`);
