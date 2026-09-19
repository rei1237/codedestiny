/**
 * 마스터 인연의 서 — 5막 구성.
 *
 * 서버가 주는 20장을 4장씩 다섯 막으로 묶는다. 막은 읽기 리듬을 끊어 주는 단위이자
 * 상단 진행 레일(I~V)의 단위다.
 *
 * 로마숫자는 유니코드 Ⅰ(U+2160)이 아니라 **ASCII I** 를 쓴다 — U+2160은 로드된
 * 웹폰트 어디에도 없어 OS 폰트로 떨어지고, ASCII 는 Cinzel 이 커버한다.
 */
import type { DestinyIconName } from "@/app/components/icons/DestinyIcon";

export interface CodexAct {
  /** 1~5 */
  order: number;
  /** ASCII 로마숫자 — Cinzel 렌더 */
  numeral: string;
  title: string;
  /** 막간 화면 한 문장 */
  line: string;
  icon: DestinyIconName;
  /** 이 막이 포함하는 장 번호(1-indexed, 양끝 포함) */
  from: number;
  to: number;
}

export const CODEX_ACTS: readonly CodexAct[] = [
  {
    order: 1,
    numeral: "I",
    title: "타고난 결",
    line: "사랑을 시작하기 전에, 당신이 어떤 사람인지부터 읽습니다.",
    icon: "moon",
    from: 1,
    to: 4,
  },
  {
    order: 2,
    numeral: "II",
    title: "마음의 구조",
    line: "마음이 열리는 자리와 닫히는 자리를 나눠 봅니다.",
    icon: "heart",
    from: 5,
    to: 8,
  },
  {
    order: 3,
    numeral: "III",
    title: "관계의 온도",
    line: "가까워지고 멀어지는 리듬에는 당신만의 곡선이 있습니다.",
    icon: "sparkle",
    from: 9,
    to: 12,
  },
  {
    order: 4,
    numeral: "IV",
    title: "깊어지는 자리",
    line: "오래 남는 관계는 여기서 갈립니다.",
    icon: "crystal",
    from: 13,
    to: 16,
  },
  {
    order: 5,
    numeral: "V",
    title: "해독과 봉인",
    line: "두 체계가 같은 말을 하는 지점에서, 이 책을 닫습니다.",
    icon: "seal",
    from: 17,
    to: 20,
  },
] as const;

/**
 * 궁합판 5막. 장 경계(from/to)와 아이콘은 개인판과 같게 두어 리더·진행 레일·PDF 를
 * 그대로 재사용한다 — 바뀌는 것은 막 제목과 한 문장뿐이다.
 */
export const CODEX_COMPAT_ACTS: readonly CodexAct[] = [
  {
    order: 1,
    numeral: "I",
    title: "두 사람의 결",
    line: "관계를 보기 전에, 두 사람이 각각 어떤 사람인지부터 읽습니다.",
    icon: "moon",
    from: 1,
    to: 4,
  },
  {
    order: 2,
    numeral: "II",
    title: "사주가 보는 궁합",
    line: "두 명식이 서로를 살리는 자리와 누르는 자리를 나눠 봅니다.",
    icon: "heart",
    from: 5,
    to: 8,
  },
  {
    order: 3,
    numeral: "III",
    title: "명반이 보는 궁합",
    line: "두 장의 별자리가 겹치는 곳에서 관계의 온도가 정해집니다.",
    icon: "sparkle",
    from: 9,
    to: 12,
  },
  {
    order: 4,
    numeral: "IV",
    title: "관계의 현실",
    line: "오래 가는 관계는 다툼이 아니라 다툰 뒤에서 갈립니다.",
    icon: "crystal",
    from: 13,
    to: 16,
  },
  {
    order: 5,
    numeral: "V",
    title: "종합과 봉인",
    line: "두 체계가 같은 말을 하는 지점에서, 이 책을 닫습니다.",
    icon: "seal",
    from: 17,
    to: 20,
  },
] as const;

export type CodexActMode = "solo" | "compat";

export function actsForMode(mode: CodexActMode = "solo"): readonly CodexAct[] {
  return mode === "compat" ? CODEX_COMPAT_ACTS : CODEX_ACTS;
}

/** 장 번호(1-indexed)가 속한 막 */
export function actForChapter(order: number, mode: CodexActMode = "solo"): CodexAct {
  const acts = actsForMode(mode);
  return acts.find((act) => order >= act.from && order <= act.to) || acts[acts.length - 1];
}

/**
 * 화면에 보이는 장 목록을 막 단위로 묶는다.
 *
 * 기본값은 빈 막을 버린다(진입 화면의 미리보기처럼 받은 것만 보여 주는 자리). 리더는
 * `keepEmpty` 로 **다섯 막 전부**를 받는다 — 생성 진행 상태가 구매 잠금처럼 보이면 안 된다.
 */
export function groupByAct<T extends { order: number }>(
  chapters: T[],
  mode: CodexActMode = "solo",
  options: { keepEmpty?: boolean } = {},
): { act: CodexAct; chapters: T[] }[] {
  return actsForMode(mode)
    .map((act) => ({
      act,
      chapters: chapters.filter((chapter) => chapter.order >= act.from && chapter.order <= act.to),
    }))
    .filter((group) => options.keepEmpty || group.chapters.length > 0);
}

/** 서버 `outline[].state` 와 같은 어휘. ready 만 본문이 있다. */
export type CodexChapterState = "ready" | "pending" | "writing" | "retrying" | "blocked";

/** 서버가 내려주는 목차 한 줄 (worker/routes/master-love-codex.js publicSession). */
export interface CodexOutlineEntry {
  id?: string;
  order: number;
  title?: string;
  symbol?: string;
  state?: string;
}

export interface CodexOutlineRow<T> {
  id: string;
  order: number;
  title: string;
  symbol?: string;
  state: CodexChapterState;
  /** state === "ready" 일 때만 본문이 있다 */
  chapter: T | null;
}

const PENDING_STATES = new Set(["pending", "writing", "retrying", "blocked"]);

/**
 * 서버 목차와 실제로 받은 장을 합쳐 **기대 장 수만큼의 행**을 만든다.
 *
 * 🔴 받은 장 수로 전체 구성을 역산하지 않는다. 목차가 아예 없는 응답(낡은 캐시·구버전)
 *    에서도 `total` 만큼 자리를 만들어, 1장만 온 책이 "1장짜리 완성본"으로 보이지 않게 한다.
 * 🔴 서버가 ready 라고 해도 본문이 실제로 없으면 열지 않는다(fail-closed) — 목차만 있고
 *    본문이 비어 있는 상태가 예전 장애의 모습이었다.
 */
export function mergeCodexOutline<T extends { id?: string; order: number; title?: string; symbol?: string }>(
  outline: CodexOutlineEntry[] | null | undefined,
  chapters: T[],
  total: number,
): CodexOutlineRow<T>[] {
  const byOrder = new Map<number, T>();
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    const order = Number(chapter?.order || 0);
    if (order > 0 && !byOrder.has(order)) byOrder.set(order, chapter);
  }
  const entries = new Map<number, CodexOutlineEntry>();
  for (const entry of Array.isArray(outline) ? outline : []) {
    const order = Number(entry?.order || 0);
    if (order > 0 && !entries.has(order)) entries.set(order, entry);
  }
  const highest = Math.max(Number(total) || 0, ...entries.keys(), ...byOrder.keys(), 0);
  const rows: CodexOutlineRow<T>[] = [];
  for (let order = 1; order <= highest; order += 1) {
    const entry = entries.get(order);
    const chapter = byOrder.get(order) || null;
    const declared = String(entry?.state || "");
    rows.push({
      id: String(chapter?.id || entry?.id || order),
      order,
      title: String(chapter?.title || entry?.title || ""),
      symbol: chapter?.symbol || entry?.symbol,
      state: chapter ? "ready" : PENDING_STATES.has(declared) ? (declared as CodexChapterState) : "pending",
      chapter,
    });
  }
  return rows;
}

export const CODEX_ACT_ANCHOR_PREFIX = "codex-act-";
export const CODEX_CHAPTER_ANCHOR_PREFIX = "codex-chapter-";
