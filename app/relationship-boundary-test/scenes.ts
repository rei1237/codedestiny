// 「그 사람의 바람끼는?」 전용 장면 에셋 레지스트리.
//
// 🔴 챕터 ↔ 그림은 **인덱스(0~4)** 로 묶는다. 제목 문자열을 키로 쓰면 LLM 이 제목을
//    한 글자만 바꿔도 에러 없이 그림만 사라진다. 배열 길이 5는 서버가 강제한다
//    (worker/routes/relationship-boundary-test.js 의 SECTION_SPECS).
//
// alt 는 장면 묘사로만 쓴다 — 옆의 h2 가 제목을 이미 읽어 주므로 되풀이하지 않고,
// 인물의 성별도 단정하지 않는다(대상자 성별은 입력마다 바뀌는데 그림은 고정이다).

export type Grade = "low" | "medium" | "high";

export type Scene = { src: string; width: number; height: number; alt: string };

const BASE = "/images/relationship-boundary-test";

/** 챕터 장면은 전부 3:4 원본이다. */
const PORTRAIT = { width: 1086, height: 1448 } as const;
/** 등급 히어로는 전부 16:9 원본이다. */
const LANDSCAPE = { width: 1672, height: 941 } as const;

const CHAPTER_SCENES: readonly Scene[] = Object.freeze([
  { src: `${BASE}/opening.webp`, ...PORTRAIT, alt: "비 오는 밤 현관, 커플 액자 옆 휴대폰으로 뻗는 손을 그린 웹툰 장면" },
  { src: `${BASE}/attention.webp`, ...PORTRAIT, alt: "밤 카페 테이블 위에서 알림이 뜬 휴대폰과 맞은편에 앉은 사람을 내려다본 웹툰 장면" },
  { src: `${BASE}/tension.webp`, ...PORTRAIT, alt: "비 내리는 야간 승강장에 홀로 선 사람과 흐릿하게 지나가는 열차를 그린 웹툰 장면" },
  { src: `${BASE}/trust.webp`, ...PORTRAIT, alt: "노을이 드는 주방 식탁에서 맞잡은 두 손과 편지 카드를 그린 웹툰 장면" },
  { src: `${BASE}/choice.webp`, ...PORTRAIT, alt: "해질녘 보행교 위, 한쪽은 네온 도심 다른 쪽은 노을로 갈라지는 길을 그린 웹툰 장면" },
]);

const GRADE_SCENES: Readonly<Record<Grade, Scene>> = Object.freeze({
  low: { src: `${BASE}/low.webp`, ...LANDSCAPE, alt: "마주 앉아 이야기를 나누는 두 사람을 그린 웹툰 장면" },
  medium: { src: `${BASE}/medium.webp`, ...LANDSCAPE, alt: "유리창 너머로 비치는 두 사람의 실루엣을 그린 웹툰 장면" },
  high: { src: `${BASE}/high.webp`, ...LANDSCAPE, alt: "루프탑 인파 속에서 뒤를 돌아보는 사람을 그린 웹툰 장면" },
});

/** 인덱스를 벗어나면 그림 없이 본문만 렌더한다(서버가 5개를 보장하지만 fail-closed). */
export function chapterScene(index: number): Scene | null {
  return CHAPTER_SCENES[index] ?? null;
}

export function gradeScene(grade: Grade): Scene {
  return GRADE_SCENES[grade] ?? GRADE_SCENES.medium;
}
