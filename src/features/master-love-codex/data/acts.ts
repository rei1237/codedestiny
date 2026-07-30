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

/** 장 번호(1-indexed)가 속한 막 */
export function actForChapter(order: number): CodexAct {
  return CODEX_ACTS.find((act) => order >= act.from && order <= act.to) || CODEX_ACTS[CODEX_ACTS.length - 1];
}

/** 화면에 보이는 장 목록을 막 단위로 묶는다. 서버가 아직 다 안 준 장은 자연히 빠진다. */
export function groupByAct<T extends { order: number }>(chapters: T[]): { act: CodexAct; chapters: T[] }[] {
  return CODEX_ACTS
    .map((act) => ({
      act,
      chapters: chapters.filter((chapter) => chapter.order >= act.from && chapter.order <= act.to),
    }))
    .filter((group) => group.chapters.length > 0);
}

export const CODEX_ACT_ANCHOR_PREFIX = "codex-act-";
export const CODEX_CHAPTER_ANCHOR_PREFIX = "codex-chapter-";
