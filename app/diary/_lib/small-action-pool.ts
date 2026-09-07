/**
 * 오늘의 작은 행동 풀. 셸 `js/luck-sync-diary.js:117` 의 행운 아이템 5×6 을 자리 삼되
 * **문안은 전부 다시 썼다** — 셸 원문은 반말에 오행 표기(목 기운·불꽃 ON)라 이 앱의 어조와
 * 금칙어(`app/diary/_lib/day-copy.ts`: 명리 용어·결정론 금지)에 그대로는 못 들어온다.
 *
 * 🔴 **키를 오행에서 계열로 옮겼다** — 이 앱에는 오행이 화면까지 오지 않고, 계열은 어댑터가
 * 이미 정한 것이라 새 판정을 만들지 않는다(`dayGroupOf`). 원국이 없으면 계열이 `null` 이므로
 * 그때는 다섯 묶음 전체에서 고른다.
 * 🔴 이모지는 셸 원문 것을 유지한다 — 같은 물건을 가리키는 표시가 두 표면에서 갈리지 않게.
 */

import type { DiaryDayGroup } from "@/lib/diary/fortune-adapter";

export interface DiarySmallAction {
  emoji: string;
  name: string;
  tip: string;
}

const SMALL_ACTIONS: Record<DiaryDayGroup, readonly DiarySmallAction[]> = {
  peer: [
    { emoji: "🌱", name: "미니 화분", tip: "책상에 초록 하나를 두면 눈이 쉴 자리가 생깁니다." },
    { emoji: "📗", name: "초록 노트", tip: "오늘 할 일을 노트 한 장에 옮겨 적어 봅니다." },
    { emoji: "🧶", name: "가방 비우기", tip: "가방을 비우고 오늘 쓸 것만 챙겨 나섭니다." },
    { emoji: "🌿", name: "허브티 한 잔", tip: "따뜻한 차 한 잔으로 오전의 속도를 한 번 늦춥니다." },
    { emoji: "🎋", name: "오래 쓸 물건", tip: "손에 자주 닿는 물건 하나를 오래 쓸 것으로 바꿔 둡니다." },
    { emoji: "🚶", name: "혼자 걷기", tip: "십 분만 혼자 걸으며 오늘 하고 싶은 것을 떠올려 봅니다." },
  ],
  express: [
    { emoji: "☕", name: "좋아하는 음료", tip: "좋아하는 음료를 한 잔 사서 자리에 두고 시작합니다." },
    { emoji: "💄", name: "붉은 포인트", tip: "붉은색 소품 하나를 걸치고 기분을 한 칸 올려 봅니다." },
    { emoji: "🌶️", name: "매콤한 한 끼", tip: "먹고 싶던 매콤한 메뉴를 오늘 한 끼로 골라 봅니다." },
    { emoji: "🕯️", name: "초 하나 켜기", tip: "초를 켜고 십 분만 하고 싶던 이야기를 적어 봅니다." },
    { emoji: "🎧", name: "음악 한 장", tip: "좋아하는 앨범 하나를 처음부터 끝까지 들어 봅니다." },
    { emoji: "📮", name: "안부 한 줄", tip: "떠오른 사람에게 짧은 안부 한 줄을 보내 봅니다." },
  ],
  wealth: [
    { emoji: "🤎", name: "차분한 옷", tip: "차분한 색 옷을 골라 오늘의 결정을 단순하게 만듭니다." },
    { emoji: "🧺", name: "책상 정리", tip: "책상 위 물건을 한 바구니에 모아 십 분만 정리합니다." },
    { emoji: "🏺", name: "물 담아 두기", tip: "오래 쓰는 컵에 물을 담아 자리 옆에 둡니다." },
    { emoji: "🍠", name: "간식 챙기기", tip: "출출해질 시간에 먹을 간식을 미리 하나 챙겨 둡니다." },
    { emoji: "💳", name: "지출 한 줄", tip: "오늘 쓴 돈을 한 줄로 적어 두고 넘어갑니다." },
    { emoji: "📚", name: "서랍 한 칸", tip: "서랍 한 칸만 비우고 나머지는 다음으로 미룹니다." },
  ],
  order: [
    { emoji: "⌚", name: "시각 정하기", tip: "가장 먼저 끝낼 일 하나에 마칠 시각을 정해 둡니다." },
    { emoji: "💻", name: "세 줄 목록", tip: "할 일을 세 줄로 줄여 적고 그 위만 봅니다." },
    { emoji: "📱", name: "앱 정리", tip: "안 쓰는 앱 다섯 개를 지워 화면을 덜 시끄럽게 만듭니다." },
    { emoji: "✂️", name: "하나 내보내기", tip: "쓰지 않는 물건 하나를 골라 오늘 밖으로 내보냅니다." },
    { emoji: "💍", name: "작은 금속 소품", tip: "작은 금속 소품 하나로 옷차림에 선을 하나 더합니다." },
    { emoji: "🔑", name: "자리 정하기", tip: "자주 잃어버리는 물건의 자리를 오늘 하나 정해 둡니다." },
  ],
  support: [
    { emoji: "💧", name: "물 가까이 두기", tip: "손 닿는 곳에 물을 두고 한 시간에 한 모금씩 마십니다." },
    { emoji: "🌊", name: "파도 소리", tip: "파도 소리를 틀어 두고 오 분만 눈을 감아 봅니다." },
    { emoji: "🧘", name: "오 분 앉기", tip: "숨 세는 것만 하는 오 분을 오늘 어딘가에 끼워 넣습니다." },
    { emoji: "📖", name: "몇 쪽 읽기", tip: "읽다 만 책을 열어 오늘은 몇 쪽만 읽습니다." },
    { emoji: "🍵", name: "차 한 잔", tip: "저녁에 따뜻한 차를 한 잔 내려 하루를 닫습니다." },
    { emoji: "🛏️", name: "이른 마무리", tip: "잠들기 삼십 분 전에 화면을 덮고 불을 한 단계 낮춥니다." },
  ],
};

/** 계열이 정해진 날은 그 묶음, 원국이 없으면 다섯 묶음 전체가 후보다. */
export function smallActionsFor(group: DiaryDayGroup | null): readonly DiarySmallAction[] {
  if (group) return SMALL_ACTIONS[group];
  return Object.values(SMALL_ACTIONS).flat();
}

/** 직전과 같은 자리를 피해 하나 고른다(마음 훈련 풀과 같은 규칙). */
export function pickSmallAction(
  pool: readonly DiarySmallAction[],
  lastIndex: number,
): { action: DiarySmallAction; index: number } {
  let index = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && index === lastIndex) {
    index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  return { action: pool[index], index };
}
