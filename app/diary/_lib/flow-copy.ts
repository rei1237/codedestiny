/**
 * 오늘의 흐름 카드 문안 — 등급(`tone`) 하나로만 고른다.
 *
 * 🔴 **금칙어**: 일진·십성·용신·기신·신강·신약·오행·비견·겁재·식신·상관·편재·정재·편관·
 * 정관·편인·정인·종격. 전부 내부 필드로만 쓰고 화면에 올리지 않는다.
 * 🔴 **결정론 금지**: "운이 좋다/나쁘다", "흉일", "~하면 성공한다" 계열을 쓰지 않는다.
 * 이 앱에서 운기는 결과를 정하는 것이 아니라 **사용자가 자기 기록과 대조하는 관찰 도구**다 —
 * 그래서 문장은 "…로 표시됩니다 / 눈에 띄면 적어 두세요" 형태로만 쓴다.
 *
 * 5등급 어휘는 「센 · 순한 · 고른 · 더딘 · 잠긴 결」이다(목업 승인본). 좋다/나쁘다가 아니라
 * **세기**를 말한다. 🔴 셸 모달의 등급 라벨(`js/luck-sync-diary.js:38-43`)은 승계하지 않는다 —
 * 그쪽은 최하위 두 등급에 "강함/아주강함"이 붙어 있다(후속 과제).
 *
 * 🔴 화면에 나가는 흐름·주의 문장은 이제 `./day-copy.ts` 의 5×5 표가 고른다 — 이 파일은
 * **등급 이름·색 계단(`step`)·추천**의 정본이고, 계열을 못 낼 때의 폴백 문장을 함께 들고 있다.
 */

import type { DiaryDayFortune } from "@/lib/diary/fortune-adapter";

export type DiaryTone = DiaryDayFortune["tone"];

export interface DiaryFlowCopy {
  /** 등급 이름. 「…결」 */
  name: string;
  /** 색 계단 t5(가장 센) ~ t1(가장 잠긴). CSS 클래스 키다. */
  step: "t5" | "t4" | "t3" | "t2" | "t1";
  flow: string;
  care: string;
  suggest: string;
}

const DIARY_FLOW_TEXT = {
  ko: {
    "very-good": {
      name: "센 결",
      step: "t5",
      flow: "밀어 두었던 일을 한 번에 끝내 보기 좋은 결로 표시됩니다.",
      care: "속도가 붙는 만큼 말이 앞서기 쉽습니다. 눈에 띄면 적어 두세요.",
      suggest: "미뤄 둔 제안 하나 · 방해 없는 30분 한 번",
    },
    good: {
      name: "순한 결",
      step: "t4",
      flow: "사람과 이야기를 트기 좋은 결로 표시됩니다.",
      care: "부탁을 한꺼번에 떠안기 쉽습니다. 눈에 띄면 적어 두세요.",
      suggest: "미뤄 둔 연락 하나 · 짧은 산책 15분",
    },
    normal: {
      name: "고른 결",
      step: "t3",
      flow: "벌여 놓은 일을 정리하기 좋은 결로 표시됩니다.",
      care: "사람 사이 말이 길어지면 오후에 지칩니다. 눈에 띄면 적어 두세요.",
      suggest: "미뤄 둔 연락 하나 · 책상 정리 15분",
    },
    bad: {
      name: "더딘 결",
      step: "t2",
      flow: "새로 벌이기보다 하나씩 마무리하기 좋은 결로 표시됩니다.",
      care: "일정이 밀리면 조바심이 먼저 옵니다. 눈에 띄면 적어 두세요.",
      suggest: "가장 작은 일 하나 · 쉬는 시간 10분",
    },
    "very-bad": {
      name: "잠긴 결",
      step: "t1",
      flow: "속도를 줄이고 몸 상태를 살피기 좋은 결로 표시됩니다.",
      care: "무리해서 결정을 내리면 뒤에 다시 손이 갑니다. 눈에 띄면 적어 두세요.",
      suggest: "미룰 수 있는 일 하나 미루기 · 평소보다 일찍 자기",
    },
  },
  en: {
    "very-good": {
      name: "Strong grain",
      step: "t5",
      flow: "Marked as a good day to finish what you had been putting off.",
      care: "With the pace picking up, words can run ahead. Note it if you notice it.",
      suggest: "One held-back proposal - one uninterrupted 30 minutes",
    },
    good: {
      name: "Mild grain",
      step: "t4",
      flow: "Marked as a good day to open a conversation.",
      care: "It is easy to take on too many favors at once. Note it if you notice it.",
      suggest: "One overdue message - a 15 minute walk",
    },
    normal: {
      name: "Even grain",
      step: "t3",
      flow: "Marked as a good day to tidy up what you have already started.",
      care: "Long conversations can wear you down by the afternoon. Note it if you notice it.",
      suggest: "One overdue message - 15 minutes of desk tidying",
    },
    bad: {
      name: "Slow grain",
      step: "t2",
      flow: "Marked as a good day to close things out rather than start new ones.",
      care: "When the schedule slips, impatience arrives first. Note it if you notice it.",
      suggest: "The smallest task - a 10 minute break",
    },
    "very-bad": {
      name: "Quiet grain",
      step: "t1",
      flow: "Marked as a good day to slow down and check how your body feels.",
      care: "Decisions forced today tend to be reworked later. Note it if you notice it.",
      suggest: "Postpone one thing you can - go to bed earlier",
    },
  },
} as const;

/** 원국이 없어 등급을 못 내는 경우(`tone: "profile"`)는 문안이 아니라 안내문을 쓴다. */
export function diaryFlowCopy(tone: DiaryTone | null | undefined): DiaryFlowCopy | null {
  if (!tone || tone === "profile") return null;
  return DIARY_FLOW_TEXT.ko[tone] as DiaryFlowCopy;
}
