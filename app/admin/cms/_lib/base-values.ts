// 네임스페이스별 "지금 코드/서비스에 들어 있는 값" 로더.
//
// 관리자가 빈 칸에서 시작하지 않게, 편집 화면에 현재 값을 미리 채워 준다.
// 코드 기본값은 지우지 않으므로(폴백 우선) 여기 값이 곧 되돌리기 기준점이기도 하다.
//
// 🔴 전부 동적 import 다. 라이트 노벨 본문(episodes.generated.json)만 2MB 라서 정적으로 붙이면
//    관리자 첫 화면이 그만큼 무거워진다. 해당 그룹을 열 때만 청크를 받는다.
import { adminFetch } from "../../_lib/admin-api";

export interface CmsBaseEntry {
  key: string;
  label: string;
  hint?: string;
  fields: Record<string, unknown>;
}

type Loader = () => Promise<CmsBaseEntry[]>;

function toLines(values: readonly string[]): string[] {
  return values.map((value) => String(value));
}

function toPairLines<T>(values: readonly T[], left: (item: T) => string, right: (item: T) => string): string[] {
  return values.map((item) => `${left(item)}|${right(item)}`);
}


/* 운세 해설 표(record kind)의 기본값 공급.
   편집기는 `{ record: { 키: { 필드: 문장 } } }` 한 덩어리를 다루므로, 코드 표를 그 모양으로 감싼다.
   값이 문장 한 줄인 평면 표는 { text } 로 승격해 중첩 표와 같은 편집기를 쓰게 한다. */
function asRecordEntry(key: string, label: string, hint: string, table: Record<string, unknown>): CmsBaseEntry {
  const record: Record<string, Record<string, string>> = {};

  for (const [recordKey, row] of Object.entries(table || {})) {
    if (typeof row === "string") {
      record[recordKey] = { text: row };
      continue;
    }
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;

    const cleaned: Record<string, string> = {};
    for (const [field, value] of Object.entries(row as Record<string, unknown>)) {
      if (typeof value === "string") cleaned[field] = value;
    }
    if (Object.keys(cleaned).length) record[recordKey] = cleaned;
  }

  return { key, label, hint: hint || `${Object.keys(record).length}항목`, fields: { record } };
}

const loaders: Record<string, Loader> = {
  "prompt.system": async () => {
    const data = await adminFetch<{ defaults?: Record<string, { label?: string; service?: string; fields?: Record<string, unknown> }> }>(
      "/api/admin/cms/defaults?ns=prompt.system",
    );
    return Object.entries(data?.defaults || {}).map(([key, value]) => ({
      key,
      label: String(value?.label || key),
      hint: String(value?.service || ""),
      fields: value?.fields || {},
    }));
  },

  "prompt.domain": async () => {
    const data = await adminFetch<{ defaults?: Record<string, { label?: string; service?: string; fields?: Record<string, unknown> }> }>(
      "/api/admin/cms/defaults?ns=prompt.domain",
    );
    return Object.entries(data?.defaults || {}).map(([key, value]) => ({
      key,
      label: String(value?.label || key),
      hint: String(value?.service || ""),
      fields: value?.fields || {},
    }));
  },

  "light-novel": async () => {
    const { STORY_EPISODES } = await import("@/lib/stories/vn");
    return STORY_EPISODES.map((episode) => ({
      key: episode.slug,
      label: `${episode.no} · ${episode.title}`,
      hint: `${episode.beats.length}비트`,
      fields: {
        title: episode.title,
        tag: episode.tag,
        // beats 는 인덱스→텍스트 맵. 인덱스는 리더 기준이며 편집으로 바뀌지 않는다.
        beats: Object.fromEntries(episode.beats.map((beat, index) => [String(index), beat.t])),
        beatSpeakers: Object.fromEntries(episode.beats.map((beat, index) => [String(index), beat.s])),
      },
    }));
  },

  "famous-saju": async () => {
    const [{ publishedCelebritySajuSeeds }, { buildCelebrityReading }] = await Promise.all([
      import("@/lib/famous-saju/celebrity-data"),
      import("@/lib/famous-saju/celebrity-saju-service"),
    ]);

    return publishedCelebritySajuSeeds.map((seed) => {
      const article = buildCelebrityReading(seed);
      return {
        key: seed.slug,
        label: seed.nameKo,
        hint: `${seed.category} · /famous-saju/${seed.slug}`,
        fields: {
          shortDescription: seed.shortDescription || "",
          heroCopy: article.heroCopy || "",
          summary: article.summary || "",
          conclusion: article.conclusion || "",
          seoTitle: article.seoTitle || "",
          seoDescription: article.seoDescription || "",
        },
      };
    });
  },

  "saju-reading": async () => {
    const engine = await import("@/app/saju/animal-destiny/engine/localSajuCalculator");
    return [
      asRecordEntry("ten-god", "십성 해설", "10성 × 5필드", engine.__cmsSajuReadingDefaults.tenGod),
      asRecordEntry("gyeokguk", "격국 해설", "6격 × 4필드", engine.__cmsSajuReadingDefaults.gyeokguk),
      asRecordEntry("shinsal", "신살 해설", "13신살 × 3필드", engine.__cmsSajuReadingDefaults.shinsal),
    ];
  },

  "saju-animal": async () => {
    const [twelve, results] = await Promise.all([
      import("@/components/fortune/animal-twelve/animalTwelveData"),
      import("@/app/saju/animal-destiny/lib/twelveGrowthAnimalResults"),
    ]);
    return [
      asRecordEntry("stage", "동물 캐릭터 카드", "12단계", twelve.__cmsAnimalTwelveBase as Record<string, unknown>),
      asRecordEntry("stage-result", "결과 리포트", "12단계", results.__cmsStageSeeds as Record<string, unknown>),
    ];
  },

  "saju-guardian": async () => {
    const guardian = await import("@/app/saju-guardian/SajuGuardianClient");
    return [
      asRecordEntry("element", "오행 수호신", "5오행 × 6필드", guardian.__cmsGuardianDefaults.element),
      asRecordEntry("month-branch", "월지 풀이", "12지", guardian.__cmsGuardianDefaults.monthBranch),
      asRecordEntry("hour-branch", "시지 풀이", "12지", guardian.__cmsGuardianDefaults.hourBranch),
    ];
  },

  "sukuyo-calendar": async () => {
    const { SUKUYO_CALENDAR_MANSIONS } = await import("@/lib/sukuyo-calendar");
    const table: Record<string, unknown> = {};
    SUKUYO_CALENDAR_MANSIONS.forEach((mansion, index) => {
      table[String(index)] = {
        core: mansion.core,
        usagePoint: mansion.usagePoint,
        caution: mansion.caution,
        love: mansion.love,
        workMoney: mansion.workMoney,
        advice: mansion.advice,
      };
    });
    return [asRecordEntry("mansion", "27수 일진 풀이", "27수 × 6필드", table)];
  },

  "sukuyo-mansion": async () => {
    // 바닐라 셸 안의 표라 직접 import 할 수 없다. 빌드 스크립트가 뽑아 둔 파생 JSON 을 읽는다
    // (scripts/build-shell-cms-defaults.mjs — 원본은 js/saju-engine-tarot-sukuyo-quantum.js).
    const { tables } = (await import("@/lib/cms/shell-defaults.generated.json")).default;
    return [asRecordEntry("mansion", "27수 본명숙 해설", "27수 × 14필드", tables["sukuyo-mansion"]?.mansion || {})];
  },

  "ziwei-basic": async () => {
    const { tables } = (await import("@/lib/cms/shell-defaults.generated.json")).default;
    const group = tables["ziwei-basic"] || {};
    return [
      asRecordEntry("star", "14주성 해설", "14성", group.star || {}),
      asRecordEntry("palace-def", "12궁 정의", "12궁", group["palace-def"] || {}),
      asRecordEntry("palace-brief", "12궁 비유 서술", "12궁", group["palace-brief"] || {}),
    ];
  },

  "ziwei-deep": async () => {
    const mod = await import("@/app/components/AdvancedZiweiSectionV2");
    return [
      asRecordEntry("palace", "12궁 정의", "12궁", mod.__cmsZiweiDeepDefaults.palace),
      asRecordEntry("star", "주성 의미", "25성", mod.__cmsZiweiDeepDefaults.star),
    ];
  },

  "vedic-nakshatra": async () => {
    const prose = await import("@/constants/nakshatra-expert-prose");
    return [
      asRecordEntry("eastern", "숙요 대가 해설", "27수", prose.__cmsNakshatraDefaults.eastern),
      asRecordEntry("indian", "베다 대가 해설", "27수", prose.__cmsNakshatraDefaults.indian),
      asRecordEntry("fusion", "융합 심화 리딩", "27수 × 3필드", prose.__cmsNakshatraDefaults.fusion),
    ];
  },

  "vedic-reading": async () => {
    const gen = await import("@/worker/lib/vedic-premium-generator.js");
    return [
      asRecordEntry("sign", "12사인 해석", "12사인 × 3필드", gen.VEDIC_SIGN_INTERPRETATION as Record<string, unknown>),
      asRecordEntry("nakshatra", "나크샤트라 해석", "28항목 × 3필드", gen.VEDIC_NAKSHATRA_INTERPRETATION as Record<string, unknown>),
      asRecordEntry("dasha", "다샤 해석", "9행성 × 4필드", gen.VEDIC_DASHA_INTERPRETATION as Record<string, unknown>),
    ];
  },

  "phrase-pool": async () => {
    const pools = await import("@/lib/lock-screen-content");
    return [
      { key: "affirmations", label: "긍정확언", hint: "확언|분야", fields: { items: toPairLines(pools.AFFIRMATIONS_DEFAULT, (i) => i.text, (i) => i.cat) } },
      { key: "quotes", label: "명언", hint: "문장|저자", fields: { items: toPairLines(pools.QUOTES_DEFAULT, (i) => i.text, (i) => i.author) } },
      { key: "hopes", label: "소망 문구", fields: { items: toLines(pools.HOPES_DEFAULT) } },
      { key: "yeoni-greetings", label: "연이 인사말", fields: { items: toLines(pools.YEONI_GREETINGS_DEFAULT) } },
      { key: "flowers", label: "오늘의 꽃", hint: "꽃이름|꽃말", fields: { items: toPairLines(pools.FLOWERS_DEFAULT, (i) => i.name, (i) => i.meaning) } },
      { key: "knowledge", label: "운세 지식", hint: "문장|체계", fields: { items: toPairLines(pools.KNOWLEDGE_DEFAULT, (i) => i.text, (i) => i.system) } },
      { key: "headers", label: "잠금화면 헤더", fields: { items: toLines(pools.HEADERS_DEFAULT) } },
      { key: "core-energies", label: "핵심 기운", fields: { items: toLines(pools.CORE_ENERGIES_DEFAULT) } },
    ];
  },

  "page-copy": async () => {
    const { ABOUT_PAGE_TEXT_TRANSLATIONS } = await import("@/app/_content/about-copy");
    return [asRecordEntry("about", "서비스 소개", "/about", ABOUT_PAGE_TEXT_TRANSLATIONS.ko)];
  },

  faq: async () => {
    const { FAQS_DEFAULT } = await import("@/app/_content/faq-copy");
    return [
      {
        key: "faq-page",
        label: "FAQ 페이지",
        hint: `${FAQS_DEFAULT.length}문항 · /faq`,
        fields: { intro: "", items: FAQS_DEFAULT },
      },
    ];
  },

  "feature-copy": async () => {
    const [teaHouse, neo] = await Promise.all([
      import("@/src/features/fortune-tea-house/data/story"),
      import("@/src/features/neo-war-room/data/dialogues"),
    ]);

    const entries: CmsBaseEntry[] = [
      { key: "fortune-tea-house:landing.eyebrow", label: "운명 찻집 · 상단 라벨", fields: { text: teaHouse.teaHouseLandingCopy.eyebrow } },
      { key: "fortune-tea-house:landing.title", label: "운명 찻집 · 제목", fields: { text: teaHouse.teaHouseLandingCopy.title } },
      { key: "fortune-tea-house:landing.lead", label: "운명 찻집 · 리드 문장", fields: { text: teaHouse.teaHouseLandingCopy.lead } },
      {
        key: "fortune-tea-house:landing.prologue",
        label: "운명 찻집 · 프롤로그",
        hint: `${teaHouse.teaHouseLandingCopy.prologue.length}문단 (한 줄에 한 문단)`,
        // 문단 목록이라 lines 필드로 공급한다. text 로 주면 registry 선언과 어긋나
        // 워커 normalizeFields 가 값을 버려 오버라이드가 저장되지 않는다.
        fields: { lines: [...teaHouse.teaHouseLandingCopy.prologue] },
      },
      { key: "fortune-tea-house:landing.cta", label: "운명 찻집 · 진입 버튼", fields: { text: teaHouse.teaHouseLandingCopy.cta } },
      { key: "fortune-tea-house:cta.title", label: "운명 찻집 · 하단 CTA 제목", fields: { text: teaHouse.teaHouseCtaCopy.title } },
      { key: "fortune-tea-house:cta.text", label: "운명 찻집 · 하단 CTA 문구", fields: { text: teaHouse.teaHouseCtaCopy.text } },
      { key: "fortune-tea-house:cta.cta", label: "운명 찻집 · 하단 CTA 버튼", fields: { text: teaHouse.teaHouseCtaCopy.cta } },
      { key: "fortune-tea-house:cta.reset", label: "운명 찻집 · 되돌리기 버튼", fields: { text: teaHouse.teaHouseCtaCopy.reset } },
      { key: "fortune-tea-house:cta.notice", label: "운명 찻집 · 대기 안내", fields: { text: teaHouse.teaHouseCtaCopy.notice } },
    ];

    // 팩폭 운명 전략실 — 모든 대사가 dialogue(key, ...) 를 지나므로 키 단위로 전부 편집 가능하다.
    const seen = new Set<string>();
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) {
          const line = item as { key?: string; text?: string; category?: string };
          if (!line?.key || typeof line.text !== "string" || seen.has(line.key)) continue;
          seen.add(line.key);
          entries.push({
            key: `neo-war-room:${line.key}`,
            label: `전략실 · ${line.key}`,
            hint: String(line.category || ""),
            fields: { text: line.text },
          });
        }
        return;
      }
      if (value && typeof value === "object") {
        for (const nested of Object.values(value)) collect(nested);
      }
    };
    collect(neo.neoOperationDialogues);

    return entries;
  },
};

/** listSource: "user" 인 네임스페이스는 코드에 기준값이 없다 — 운영자가 항목을 만든다. */
export async function loadBaseEntries(ns: string): Promise<CmsBaseEntry[]> {
  const loader = loaders[ns];
  if (!loader) return [];

  try {
    return await loader();
  } catch (error) {
    console.warn(`[cms] ${ns} 기본값을 불러오지 못했습니다.`, error);
    return [];
  }
}

export function hasBaseEntries(ns: string): boolean {
  return Boolean(loaders[ns]);
}
