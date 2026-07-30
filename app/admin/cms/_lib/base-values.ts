// 네임스페이스별 "지금 코드/서비스에 들어 있는 값" 로더.
//
// 관리자가 빈 칸에서 시작하지 않게, 편집 화면에 현재 값을 미리 채워 준다.
// 코드 기본값은 지우지 않으므로(폴백 우선) 여기 값이 곧 되돌리기 기준점이기도 하다.
//
// 🔴 전부 동적 import 다. 라이트 노벨 본문(episodes.generated.json)만 2MB 라서 정적으로 붙이면
//    관리자 첫 화면이 그만큼 무거워진다. 해당 그룹을 열 때만 청크를 받는다.
import { adminFetch } from "./admin-api";

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
    const copy = await import("@/app/_content/seo-copy");
    return [
      {
        key: "about",
        label: "서비스 소개",
        hint: "/about",
        fields: { heading: copy.ABOUT_PAGE_COPY.heading, intro: copy.ABOUT_PAGE_COPY.intro, body: "" },
      },
      {
        key: "home-guide",
        label: "홈 운세 입문 섹션",
        hint: "/",
        fields: { heading: copy.HOME_FAQ_SECTION_COPY.heading, intro: copy.HOME_FAQ_SECTION_COPY.intro, body: "" },
      },
      {
        key: "saju-basic-method",
        label: "사주 해석 로직 설명",
        fields: {
          heading: copy.SAJU_BASIC_METHOD_COPY.heading,
          intro: copy.SAJU_BASIC_METHOD_COPY.paragraphs[0] || "",
          body: copy.SAJU_BASIC_METHOD_COPY.paragraphs.map((p: string) => `<p>${p}</p>`).join("\n"),
        },
      },
      {
        key: "ziwei-premium-method",
        label: "자미두수 심화 해석 방식",
        fields: {
          heading: copy.ZIWEI_PREMIUM_METHOD_COPY.heading,
          intro: copy.ZIWEI_PREMIUM_METHOD_COPY.paragraphs[0] || "",
          body: copy.ZIWEI_PREMIUM_METHOD_COPY.paragraphs.map((p: string) => `<p>${p}</p>`).join("\n"),
        },
      },
      { key: "methodology", label: "콘텐츠 방법론", hint: "/methodology", fields: { heading: "", intro: "", body: "" } },
    ];
  },

  faq: async () => {
    const copy = await import("@/app/_content/seo-copy");
    return [
      {
        key: "home",
        label: "홈 FAQ",
        hint: `${copy.HOME_FAQ_ITEMS.length}문항`,
        fields: {
          intro: copy.HOME_FAQ_SECTION_COPY.intro,
          items: copy.HOME_FAQ_ITEMS.map((item: { question: string; answer: string }) => ({ question: item.question, answer: item.answer })),
        },
      },
      {
        key: "faq-page",
        label: "FAQ 페이지",
        hint: `${copy.FAQ_PAGE_ITEMS.length}문항 · /faq`,
        fields: {
          intro: copy.FAQ_PAGE_COPY.introKo,
          items: copy.FAQ_PAGE_ITEMS.map((item: { q: string; a: string }) => ({ question: item.q, answer: item.a })),
        },
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
        fields: { text: teaHouse.teaHouseLandingCopy.prologue.join("\n") },
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
