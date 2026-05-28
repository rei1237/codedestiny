import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    title: "🌌 사주 원국 완전 해설 — 팔자 8글자의 비밀",
    categories: ["연주: 가문, 초기 환경, 사회적 배경", "월주: 성장 환경, 직업성, 사회적 뿌리", "일주: 나 자신, 성격, 본질, 배우자궁", "시주: 미래 가능성, 자녀, 말년, 숨겨진 재능", "천간과 지지의 상호작용", "원국 전체의 핵심 인상"],
  },
  {
    id: "02",
    title: "🏛️ 나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    categories: ["일간의 본질과 삶의 태도", "월지 중심의 현실 적응 방식", "계절과 조후가 만드는 기질", "강점으로 쓰이는 성향", "약점으로 드러나는 패턴", "내가 편안해지는 환경"],
  },
  {
    id: "03",
    title: "⚔️ 숨겨진 무기 — 용신·희신과 나만의 필살기",
    categories: ["용신의 의미와 활용법", "희신의 보조 전략", "기신/구신이 만드는 주의점", "운이 풀릴 때의 조건", "삶에서 반복적으로 써야 할 무기", "피해야 할 선택 패턴"],
  },
  {
    id: "04",
    title: "🌀 대운 정밀 분석 — 인생의 큰 파도",
    categories: ["대운 시작 흐름", "현재 대운의 핵심 주제", "다음 대운의 변화 방향", "상승기와 조정기", "대운에서 조심해야 할 선택", "장기 인생 전략"],
  },
  {
    id: "05",
    title: "👑 격국과 사회적 소명 — 나의 성공 방정식",
    categories: ["격국 또는 중심 구조 분석", "사회에서 인정받는 방식", "직업적 역할과 소명", "성취가 나는 분야", "명예와 평판 관리", "성공을 방해하는 습관"],
  },
  {
    id: "06",
    title: "🤝 관계의 전략 — 인연의 법칙과 파트너십",
    categories: ["인간관계 기본 패턴", "귀인과 악연의 구분", "협업에서 강해지는 방식", "갈등이 생기는 지점", "거리두기가 필요한 관계", "오래 가는 인연의 조건"],
  },
  {
    id: "07",
    title: "💑 연애·결혼 완전 분석 — 사랑의 구조와 배우자 인연",
    categories: ["연애 성향", "끌리는 상대의 특징", "배우자궁 해석", "결혼운의 흐름", "관계에서 반복되는 문제", "사랑을 오래 유지하는 전략"],
  },
  {
    id: "08",
    title: "💰 재물과 현실 감각 — 돈이 모이는 구조",
    categories: ["재성 구조와 돈의 감각", "수입이 생기는 방식", "지출이 새는 패턴", "투자/사업/저축 성향", "재물운이 살아나는 시기", "돈을 지키는 현실 전략"],
  },
  {
    id: "09",
    title: "🧭 직업·사업·커리어 — 내가 빛나는 무대",
    categories: ["직업 적성", "조직형/프리랜서형/사업형 판단", "성과가 나는 업무 방식", "리더십과 실무 능력", "커리어 전환 타이밍", "장기 브랜드 전략"],
  },
  {
    id: "10",
    title: "🪷 건강·멘탈·생활 리듬 — 오래 가는 운의 관리법",
    categories: ["오행 불균형과 건강 주의점", "스트레스가 쌓이는 방식", "멘탈 회복 루틴", "수면/식습관/생활 리듬 조언", "번아웃 방지 전략", "몸과 마음의 균형법"],
  },
  {
    id: "11",
    title: "🔥 위기와 전환점 — 인생의 시험을 넘는 법",
    categories: ["원국상 취약 지점", "운에서 흔들리는 시기", "반복되는 실패 패턴", "인간관계/돈/일의 위기 신호", "위기를 기회로 바꾸는 방법", "반드시 피해야 할 선택"],
  },
  {
    id: "12",
    title: "🧿 숨은 복과 귀인 — 나를 살리는 보이지 않는 힘",
    categories: ["원국 속 귀인과 도움의 흐름", "내가 도움을 받는 방식", "예상치 못한 기회가 열리는 조건", "사람·장소·시기에서 나타나는 행운 신호", "복을 막는 태도와 복을 여는 태도", "인생의 막힌 흐름을 다시 여는 방법"],
  },
  {
    id: "13",
    title: "🌠 최종 운명 로드맵 — 앞으로의 실행 전략",
    categories: ["현재 인생의 핵심 과제", "1년 실행 전략", "3년 성장 전략", "10년 방향성", "관계·돈·일의 우선순위", "마지막 상담 메시지"],
  },
];

const FORBIDDEN_TEXT = [
  "fallback",
  "placeholder",
  "debug",
  "internal payload",
  "json dump",
  "테스트 문구",
];

const LIFEBOOK_SERVICE_KEY = "saju-lifebook";
const LIFEBOOK_FEATURE_KEY_PUBLIC = "saju_lifebook_pdf";
const LIFEBOOK_FEATURE_KEY_BILLING = "saju_life_book_pdf";

function clean(value) {
  return String(value || "").trim();
}

function resolveLifeBookFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return LIFEBOOK_FEATURE_KEY_PUBLIC;
  if (key === LIFEBOOK_FEATURE_KEY_BILLING) return LIFEBOOK_FEATURE_KEY_PUBLIC;
  return key;
}

function toBillingFeatureKey(featureKey) {
  const key = clean(featureKey);
  if (!key) return LIFEBOOK_FEATURE_KEY_BILLING;
  if (key === LIFEBOOK_FEATURE_KEY_PUBLIC) return LIFEBOOK_FEATURE_KEY_BILLING;
  return key;
}

function stripForbiddenTokens(value) {
  return clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/Chapter\s*1/gi, "")
    .replace(/자동 복구/gi, "")
    .replace(/fallback/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeInput(body = {}) {
  const name = clean(body.name) || "사용자";
  const gender = clean(body.gender) || "unknown";
  const birthDateText = clean(body.birthDate);
  const birthDateParts = birthDateText.includes("-")
    ? birthDateText.split("-").map((part) => toInt(part, NaN))
    : [];
  const year = Number.isFinite(toInt(body.year, NaN)) ? toInt(body.year, NaN) : birthDateParts[0];
  const month = Number.isFinite(toInt(body.month, NaN)) ? toInt(body.month, NaN) : birthDateParts[1];
  const day = Number.isFinite(toInt(body.day, NaN)) ? toInt(body.day, NaN) : birthDateParts[2];
  const timeKnown = body.birthTimeKnown !== false && clean(body.timeUnknown).toLowerCase() !== "true";
  const hour = timeKnown ? toInt(body.hour, NaN) : null;
  const minute = timeKnown ? toInt(body.minute, NaN) : null;
  const birthplace = clean(body.birthplace) || "대한민국";

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, message: "생년월일은 필수입니다." };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다." };
  }
  if (timeKnown && (hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    return { ok: false, message: "출생 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    profile: {
      name,
      gender,
      year,
      month,
      day,
      hour,
      minute,
      timeKnown,
      birthplace,
      birthIso: timeKnown ? `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}` : `${year}-${pad2(month)}-${pad2(day)} 시간 미상`,
    },
  };
}

function pickByIndex(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function deriveLocalSignals(profile) {
  const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const elements = ["목", "화", "토", "금", "수"];

  const seed = (
    profile.year * 37
    + profile.month * 19
    + profile.day * 13
    + (Number.isFinite(profile.hour) ? profile.hour * 7 : 12 * 7)
    + (Number.isFinite(profile.minute) ? profile.minute : 0)
  );

  const dayMaster = pickByIndex(stems, seed);
  const yearBranch = pickByIndex(branches, profile.year + profile.month);
  const monthBranch = pickByIndex(branches, profile.month + profile.day);
  const useful = pickByIndex(elements, seed + 2);
  const support = pickByIndex(elements, seed + 4);
  const caution = pickByIndex(elements, seed + 1);

  return {
    dayMaster,
    yearBranch,
    monthBranch,
    useful,
    support,
    caution,
    timeKnown: Boolean(profile.timeKnown),
    timeLabel: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "시간 미상",
    rhythm: `${pickByIndex(branches, seed)}-${pickByIndex(branches, seed + 3)}-${pickByIndex(branches, seed + 6)}`,
  };
}

function buildCategoryText(profile, signals, chapterTitle, categoryTitle, categoryIndex) {
  const opening = `${profile.name}님의 흐름에서 ${categoryTitle}은(는) 단일 조언이 아니라 ${chapterTitle} 전체를 움직이는 축으로 읽혀야 합니다.`;
  const body = [
    `${signals.dayMaster} 일간의 선택 방식은 ${signals.monthBranch} 월지의 현실 감각과 만나면서, ${signals.useful} 기운을 잘 쓰는 쪽으로 삶의 방향을 정리할 때 가장 안정적으로 힘을 냅니다.`,
    `${categoryTitle}은(는) ${categoryIndex + 1}번째 관점으로 볼수록 선명해집니다. 감정의 즉흥성보다 일정, 관계 경계, 실행 단위를 먼저 고정하면 같은 운도 더 좋은 결과로 바뀝니다.`,
    `${signals.support} 기운은 확장과 연결을, ${signals.caution} 기운은 과속과 누수를 뜻합니다. 그러므로 중요한 선택 앞에서는 사실 확인, 우선순위 재배치, 7일 단위 검토를 함께 적용하는 편이 좋습니다.`,
  ].join("\n\n");

  return `${opening}\n\n${body}`;
}

function buildChapterLocalText(profile, signals, chapterTitle, categories) {
  return categories.map((categoryTitle, index) => {
    const text = buildCategoryText(profile, signals, chapterTitle, categoryTitle, index);
    return {
      id: `${String(index + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: stripForbiddenTokens(text),
      llmText: "",
      finalText: stripForbiddenTokens(text),
    };
  });
}

function buildLifeBookChapters(profile, signals) {
  return CHAPTER_BLUEPRINTS.map((chapter) => {
    const categories = buildChapterLocalText(profile, signals, chapter.title, chapter.categories);
    return {
      id: chapter.id,
      title: chapter.title,
      categories,
      text: buildChapterBody(chapter.title, categories),
      source: "local",
    };
  });
}

function buildChapterBody(chapterTitle, categories) {
  return categories.map((category) => {
    const text = stripForbiddenTokens(category.finalText || category.localSummary || "");
    return `### ${stripForbiddenTokens(category.title)}\n\n${text}`.trim();
  }).join("\n\n");
}

function createLifeBookFallbackText(profile, signals, chapterTitle, categoryTitle, originText = "") {
  const body = buildCategoryText(profile, signals, chapterTitle, categoryTitle, 0);
  return stripForbiddenTokens([originText, body].filter(Boolean).join("\n\n"));
}

function validateChapterText(text) {
  const source = stripForbiddenTokens(text);
  if (!source) return { ok: false, reason: "empty" };
  if (source.length < 600) return { ok: false, reason: "too_short" };

  const lowered = source.toLowerCase();
  for (const forbidden of FORBIDDEN_TEXT) {
    if (lowered.includes(forbidden)) return { ok: false, reason: `forbidden:${forbidden}` };
  }

  return { ok: true, reason: "ok" };
}

function reinforceChapterText(profile, signals, chapterTitle, categoryTitle, originText) {
  const appendix = [
    `${profile.name}님의 ${chapterTitle}는 ${signals.dayMaster} 일간의 장점을 살릴 때 가장 설득력이 커집니다.`,
    `핵심은 ${categoryTitle}를 단발성 문장이 아니라 시간 블록, 관계 경계, 실행 단위로 바꾸는 것입니다.`,
    `${signals.useful}/${signals.support} 기운이 강한 날에는 확장 행동을, ${signals.caution} 기운이 강한 날에는 정리와 검토를 우선하세요.`,
  ].join("\n\n");
  return stripForbiddenTokens(`${originText}\n\n${appendix}`);
}

function parseJsonMaybe(text) {
  const raw = stripForbiddenTokens(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function mergeLifeBookLlmResult(chapter, llmResult) {
  const next = {
    ...chapter,
    categories: (chapter.categories || []).map((category) => ({ ...category })),
  };

  const sourceChapter = llmResult?.chapter && typeof llmResult.chapter === "object" ? llmResult.chapter : llmResult;
  const incomingCategories = Array.isArray(sourceChapter?.categories) ? sourceChapter.categories : [];

  if (!incomingCategories.length) {
    return next;
  }

  next.categories = next.categories.map((category, index) => {
    const incoming = incomingCategories.find((item) => String(item?.id || item?.title || "") === String(category.id || category.title || "")) || incomingCategories[index];
    const finalText = stripForbiddenTokens(incoming?.finalText || incoming?.text || incoming?.llmText || category.finalText || category.localSummary);
    return {
      ...category,
      llmText: stripForbiddenTokens(incoming?.llmText || incoming?.text || ""),
      finalText: finalText || category.finalText,
    };
  });

  next.text = buildChapterBody(next.title, next.categories);
  return next;
}

function buildLifeBookPayload(profile, signals, chapters, metadata = {}) {
  return {
    serviceKey: LIFEBOOK_SERVICE_KEY,
    featureKey: resolveLifeBookFeatureKey(metadata.featureKey),
    mode: "personal",
    userInput: {
      name: profile.name,
      gender: profile.gender,
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: profile.timeKnown ? `${pad2(profile.hour)}:${pad2(profile.minute)}` : "",
      calendarType: clean(metadata.calendarType) === "lunar" ? "lunar" : "solar",
      birthPlace: profile.birthplace,
    },
    sajuResult: {
      pillars: {
        year: signals.yearBranch,
        month: signals.monthBranch,
        day: signals.dayMaster,
        hour: signals.timeKnown ? signals.timeLabel : "시간 미상",
      },
      dayMaster: signals.dayMaster,
      monthBranch: signals.monthBranch,
      usefulGod: signals.useful,
      favorableGod: signals.support,
      unfavorableElement: signals.caution,
      seasonBalance: signals.rhythm,
      structure: "로컬 사주 기초 구조",
    },
    chapters,
  };
}

function ensureCompleteLifeBookChapters(profile, signals, chapters = []) {
  const chapterMap = new Map((Array.isArray(chapters) ? chapters : []).map((item) => [String(item?.id || ""), item]));

  return CHAPTER_BLUEPRINTS.map((blueprint) => {
    const chapter = chapterMap.get(String(blueprint.id));
    const fallbackCategories = buildChapterLocalText(profile, signals, blueprint.title, blueprint.categories);
    const categoryMap = new Map((Array.isArray(chapter?.categories) ? chapter.categories : []).map((item) => [String(item?.title || item?.id || ""), item]));

    const categories = fallbackCategories.map((fallbackCategory, index) => {
      const existing = categoryMap.get(String(fallbackCategory.title)) || categoryMap.get(String(fallbackCategory.id));
      const nextText = stripForbiddenTokens(existing?.finalText || existing?.llmText || existing?.localSummary || fallbackCategory.localSummary);
      return {
        id: fallbackCategory.id,
        title: fallbackCategory.title,
        localSummary: fallbackCategory.localSummary,
        llmText: stripForbiddenTokens(existing?.llmText || ""),
        finalText: nextText || createLifeBookFallbackText(profile, signals, blueprint.title, fallbackCategory.title, fallbackCategory.localSummary),
        order: index + 1,
      };
    });

    return {
      id: blueprint.id,
      title: blueprint.title,
      categories,
      text: buildChapterBody(blueprint.title, categories),
      source: chapter?.source || "local",
    };
  });
}

function validateLifeBookChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_count");
  }

  (chapters || []).forEach((chapter, index) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length < 4) {
      errors.push(`chapter_${index + 1}_category_count`);
    }
    categories.forEach((category, categoryIndex) => {
      if (!stripForbiddenTokens(category?.title)) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      }
      if (!stripForbiddenTokens(category?.finalText)) {
        errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

function renderLifeBookPdf({ profile, signals, chapters, generatedAt }) {
  const toc = (chapters || []).map((chapter) => `<li><strong>${stripForbiddenTokens(chapter.title)}</strong></li>`).join("\n");
  const chapterHtml = (chapters || []).map((chapter, index) => {
    const categoryHtml = (chapter.categories || []).map((category) => `
      <section class="lb-category">
        <h4>${stripForbiddenTokens(category.title)}</h4>
        <p>${stripForbiddenTokens(category.finalText)}</p>
      </section>
    `).join("\n");
    return `
      <article class="lb-chapter">
        <div class="lb-chapter__eyebrow">CHAPTER ${String(index + 1).padStart(2, "0")}</div>
        <h2>${stripForbiddenTokens(chapter.title)}</h2>
        ${categoryHtml}
      </article>
    `;
  }).join("\n");

  const safeName = stripForbiddenTokens(profile.name || "사용자");
  const safeBirth = stripForbiddenTokens(profile.birthIso || "");
  const safeSignals = stripForbiddenTokens(`${signals.dayMaster} · ${signals.monthBranch} · ${signals.yearBranch}`);

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>사주 인생의 책</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fffaf2 0%,#f4ead9 100%);color:#261b11;line-height:1.8}
      .page{max-width:980px;margin:0 auto;padding:28px 20px 60px}
      .cover{position:relative;overflow:hidden;padding:30px;border-radius:24px;background:linear-gradient(145deg,#24160e 0%,#6c4324 58%,#8d5a32 100%);color:#fff5ea;box-shadow:0 22px 48px rgba(71,45,19,.22)}
      .cover::after{content:"";position:absolute;right:-40px;top:-20px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.12)}
      .cover h1{margin:10px 0 6px;font-size:40px;line-height:1.15}
      .cover p{margin:4px 0;color:#f5dfc5}
      .cover img{display:block;width:min(260px,100%);border-radius:18px;margin-top:18px;box-shadow:0 12px 28px rgba(0,0,0,.18)}
      .meta,.toc,.chapter{margin-top:20px;padding:18px;border:1px solid #e4d3bb;border-radius:18px;background:rgba(255,251,246,.92);box-shadow:0 12px 26px rgba(66,48,26,.06)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border-radius:14px;background:#f8f0e4;border:1px solid #ead8bf}
      .meta-item b{display:block;margin-bottom:4px;color:#5a3a23}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:8px 0 14px;font-size:26px;color:#4c2f1a}
      .lb-chapter__eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8b5e3c}
      .lb-category{padding:12px 14px;margin:10px 0;border-radius:14px;background:#fbf5ec;border:1px solid #eadcc7}
      .lb-category h4{margin:0 0 8px;font-size:18px;color:#6b4428}
      .lb-category p{margin:0;white-space:pre-wrap}
      .footer{margin-top:20px;padding:16px 18px;color:#614632;font-size:13px;text-align:center}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.cover,.meta,.toc,.chapter{box-shadow:none}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>사주 인생의 책</h1>
        <p>팔자 8글자로 읽는 나만의 운명 해설서</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
        <p>${safeSignals}</p>
        <img src="/fuctionassets/lifebook.webp" alt="사주 인생의 책 표지 이미지" />
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR"))}</div>
          <div class="meta-item"><b>시간 정보</b>${signals.timeKnown ? stripForbiddenTokens(signals.timeLabel) : "시간 미상 기준"}</div>
          <div class="meta-item"><b>기본 구조</b>13챕터 프리미엄 사주 리포트</div>
        </div>
      </section>

      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>

      ${chapterHtml}

      <section class="footer">이 문서는 로컬 사주 계산과 프리미엄 상담문 보강을 바탕으로 작성된 Code:Destiny 리포트입니다.</section>
    </main>
  </body>
  </html>`;
}

async function maybeEnhanceChapterWithLlm(env, profile, signals, chapter) {
  const prompt = [
    "너는 30년 경력의 최고 명리학자이자 프리미엄 운세 리포트 작가다.",
    "입력된 로컬 사주 계산 결과와 챕터 뼈대를 바탕으로 상담문을 작성한다.",
    "사주 계산을 새로 하지 않는다.",
    "챕터 제목과 세부 카테고리 제목을 절대 변경하지 않는다.",
    "13챕터 순서를 유지한다.",
    "누락된 챕터나 카테고리가 있으면 안 된다.",
    "반복 문장, 자동 복구 문구, 개발자용 로그, JSON 설명, 내부 계산값 설명을 쓰지 않는다.",
    "사용자가 자신의 삶에 바로 적용할 수 있는 구체적인 조언을 제공한다.",
    "공포 마케팅, 저주, 단정적 예언, 의학/법률/투자 확정 조언을 금지한다.",
    "문체는 고급스럽고 따뜻하며, 실제 명리학 고수가 작성한 프리미엄 상담문처럼 작성한다.",
    "",
    `이름: ${profile.name}`,
    `출생: ${profile.birthIso}`,
    `핵심: 일간 ${signals.dayMaster}, 월지 ${signals.monthBranch}, 연지 ${signals.yearBranch}, 용신 ${signals.useful}, 주의 ${signals.caution}`,
    `챕터: ${chapter.title}`,
    "",
    JSON.stringify({
      chapter: {
        id: chapter.id,
        title: chapter.title,
        categories: (chapter.categories || []).map((category) => ({
          id: category.id,
          title: category.title,
          localSummary: category.localSummary,
        })),
      },
    }, null, 2),
  ].join("\n");

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.75,
    maxOutputTokens: 2200,
    timeoutMs: 9000,
    totalTimeoutMs: 12000,
  });

  if (!ai.ok) {
    return { text: chapter.text, categories: chapter.categories, source: "local" };
  }

  const candidate = parseJsonMaybe(ai.text);
  if (!candidate) {
    const repair = await callGeminiText(env, `${prompt}\n\n위 출력은 JSON 파싱에 실패했다. 동일 구조의 JSON만 다시 출력하라.`, {
      modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL", "GEMINI_MODEL"],
      temperature: 0.65,
      maxOutputTokens: 2400,
      timeoutMs: 9000,
      totalTimeoutMs: 12000,
    });

    const repaired = repair.ok ? parseJsonMaybe(repair.text) : null;
    if (!repaired) {
      return { text: chapter.text, categories: chapter.categories, source: "local" };
    }
    const merged = mergeLifeBookLlmResult(chapter, repaired);
    return { text: buildChapterBody(merged.title, merged.categories), categories: merged.categories, source: "llm" };
  }

  const merged = mergeLifeBookLlmResult(chapter, candidate);
  const mergedText = buildChapterBody(merged.title, merged.categories);
  const check = validateChapterText(mergedText);
  if (!check.ok) {
    return { text: chapter.text, categories: chapter.categories, source: "local" };
  }

  return { text: mergedText, categories: merged.categories, source: "llm" };
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  return {
    title: `${stripForbiddenTokens(profile.name)} 사주 인생의 책`,
    filename: `saju-lifebook-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    html: String(metadata.pdfHtml || ""),
    chapters: chapters.map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
      categories: chapter.categories,
      text: chapter.text,
      source: chapter.source || "local",
    })),
  };
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: LIFEBOOK_SERVICE_KEY,
        message: "로그인 후 인생의 책 PDF를 생성할 수 있습니다.",
        code: "UNAUTHORIZED",
      }, { status: 401 });
    }
    throw error;
  }
  const body = await readJson(request);

  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const profile = normalized.profile;
  const featureKey = resolveLifeBookFeatureKey(body?.featureKey);
  const billingFeatureKey = toBillingFeatureKey(featureKey);
  const access = await requirePremiumReportAccess(env, auth.userId, "lifeBook", {
    ...body,
    featureKey: billingFeatureKey,
    reportType: "lifeBook",
    _accessRoute: "/api/premium/saju-lifebook",
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    const message = status === 401
      ? "로그인 후 인생의 책 PDF를 생성할 수 있습니다."
      : status === 402
        ? "프리미엄 PDF 생성 권한이 필요합니다."
        : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    return json({
      ok: false,
      serviceKey: LIFEBOOK_SERVICE_KEY,
      message,
      code: access?.code || "PAYMENT_REQUIRED",
    }, { status });
  }

  const signals = deriveLocalSignals(profile);
  const localChapters = buildLifeBookChapters(profile, signals);

  const finalChapters = [];
  for (let i = 0; i < localChapters.length; i += 1) {
    const localChapter = localChapters[i];
    const llmResult = await maybeEnhanceChapterWithLlm(env, profile, signals, localChapter);

    let chapterText = stripForbiddenTokens(llmResult.text || localChapter.text);
    const validation = validateChapterText(chapterText);
    if (!validation.ok) {
      chapterText = reinforceChapterText(profile, signals, localChapter.title, localChapter.categories[0]?.title || localChapter.title, localChapter.text);
    }

    const mergedCategories = (llmResult.categories || localChapter.categories).map((category, categoryIndex) => {
      const chapterTitle = localChapter.title;
      const categoryTitle = stripForbiddenTokens(category.title || `세부 항목 ${categoryIndex + 1}`);
      const finalText = stripForbiddenTokens(category.finalText || category.localSummary || "");
      const safeText = finalText || createLifeBookFallbackText(profile, signals, chapterTitle, categoryTitle, category.localSummary || "");
      return {
        ...category,
        title: categoryTitle,
        finalText: safeText,
        llmText: stripForbiddenTokens(category.llmText || ""),
        localSummary: stripForbiddenTokens(category.localSummary || ""),
        order: categoryIndex + 1,
      };
    });

    finalChapters.push({
      id: localChapter.id,
      title: localChapter.title,
      categories: mergedCategories,
      text: chapterText,
      source: llmResult.source,
    });
  }

  const completedChapters = ensureCompleteLifeBookChapters(profile, signals, finalChapters);
  const chapterValidation = validateLifeBookChapters(completedChapters);
  if (!chapterValidation.ok) {
    const repaired = ensureCompleteLifeBookChapters(profile, signals, completedChapters);
    repaired.forEach((chapter) => {
      chapter.text = buildChapterBody(chapter.title, chapter.categories);
    });
    completedChapters.splice(0, completedChapters.length, ...repaired);
  }

  const lifebookPayload = buildLifeBookPayload(profile, signals, completedChapters, {
    featureKey,
    calendarType: body?.calendarType,
  });

  const pdfReady = buildPdfReadyPayload(profile, completedChapters, {
    featureKey,
    reportType: "lifeBook",
    accessType: String(access.accessType || "unknown"),
    pdfHtml: renderLifeBookPdf({ profile, signals, chapters: completedChapters, generatedAt: new Date().toISOString() }),
  });

  return json({
    ok: true,
    serviceKey: LIFEBOOK_SERVICE_KEY,
    data: {
      reportId: `saju-lifebook-${Date.now()}`,
      featureKey,
      reportType: "lifeBook",
      profile,
      chapters: completedChapters,
      lifebookPayload,
      pdfReady,
    },
  });
}

export async function handleSajuLifebookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/premium/saju-lifebook");

    if (method === "POST" && (path === "" || path === "/" || path === "/prepare")) {
      return await handlePrepare(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-lifebook",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
