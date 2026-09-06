/**
 * Day View 의 하루 문안 조립. 홈 흐름 카드의 `자세히 보기` 도 **이 함수 하나**를 쓴다 —
 * 같은 하루가 두 화면에서 다르게 읽히면 사용자가 자기 기록과 대조할 수 없다.
 *
 * 🔴 **금칙어**: 명리 용어를 화면에 올리지 않는다. 십성 이름은 이 파일까지 오지도 않는다 —
 * `lib/diary/fortune-adapter.ts` 가 계열 키(`peer`·`express`·`wealth`·`order`·`support`)로
 * 바꿔서 넘긴다.
 * 🔴 **결정론 금지**: "운이 좋다/나쁘다", "흉일", "~하면 성공한다" 계열을 쓰지 않는다.
 * 문장은 관찰 프레임으로만 쓴다 — 읽는 줄은 「…좋은 조건입니다」, 살피는 줄은
 * 「눈에 띄면 적어 두세요」로 끝난다. `__tests__/ui/diary-copy-policy.test.js` 가 25칸을
 * 전수로 발견해 이 두 형식과 금칙어를 단언한다(미분류가 있으면 실패한다).
 *
 * 등급(5) × 계열(5) = 25칸. 등급은 세기를 말하고(`./flow-copy` 의 「센·순한·고른·더딘·잠긴 결」),
 * 계열은 그 세기가 **어느 쪽 일에서** 눈에 띄는지를 말한다.
 */

import type { DiaryDayFortune, DiaryDayGroup } from "@/lib/diary/fortune-adapter";
import { diaryFlowCopy, type DiaryFlowCopy, type DiaryTone } from "./flow-copy";

export interface DiaryDayLines {
  /** 그 하루를 읽는 줄. */
  read: string;
  /** 눈에 띄면 적어 둘 줄. */
  watch: string;
}

export interface DiaryDayDetail {
  grade: DiaryFlowCopy;
  read: string;
  watch: string;
  /** 지표 강조 1줄. 지표를 못 내면 빈 문자열이다. */
  focus: string;
  suggest: string;
}

type GradeKey = Exclude<DiaryTone, "profile">;

/** 25칸. 🔴 비우지 않는다 — 빈 칸이 생기면 그날 문안이 등급 문장으로 되돌아간다. */
const DIARY_DAY_LINES: Record<GradeKey, Record<DiaryDayGroup, DiaryDayLines>> = {
  "very-good": {
    peer: {
      read: "내 리듬대로 하나를 끝까지 밀어붙이기 좋은 조건입니다.",
      watch: "속도가 붙는 만큼 남의 몫까지 끌어오기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
    express: {
      read: "미뤄 둔 제안이나 연락을 꺼내 보기 좋은 조건입니다.",
      watch: "말이 생각보다 앞서 나갈 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    wealth: {
      read: "돈·일정처럼 손에 잡히는 일을 매듭짓기 좋은 조건입니다.",
      watch: "일이 커지면서 지출도 같이 늘 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    order: {
      read: "맡은 자리에서 큰 건 하나를 마무리하기 좋은 조건입니다.",
      watch: "책임을 한꺼번에 떠안기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
    support: {
      read: "새로 배우거나 먼저 도움을 청하기 좋은 조건입니다.",
      watch: "알아보는 데만 시간을 다 쓸 수 있습니다. 눈에 띄면 적어 두세요.",
    },
  },
  good: {
    peer: {
      read: "혼자 하던 일을 한 걸음 진행해 보기 좋은 조건입니다.",
      watch: "내 방식만 고집하면 대화가 짧아집니다. 눈에 띄면 적어 두세요.",
    },
    express: {
      read: "사람과 이야기를 트기 좋은 조건입니다.",
      watch: "부탁을 한꺼번에 떠안기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
    wealth: {
      read: "미뤄 둔 정산이나 일정 정리에 손대기 좋은 조건입니다.",
      watch: "작은 지출이 여러 번 겹칠 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    order: {
      read: "약속과 마감을 다시 맞춰 두기 좋은 조건입니다.",
      watch: "맡은 범위가 슬며시 늘 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    support: {
      read: "묻고 배우며 실마리를 얻기 좋은 조건입니다.",
      watch: "남의 말에 결정을 미루기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
  },
  normal: {
    peer: {
      read: "내 속도를 되찾고 리듬을 고르기 좋은 조건입니다.",
      watch: "비교가 시작되면 하루가 길어집니다. 눈에 띄면 적어 두세요.",
    },
    express: {
      read: "벌여 놓은 이야기를 정리해 두기 좋은 조건입니다.",
      watch: "말이 길어지면 오후에 지칩니다. 눈에 띄면 적어 두세요.",
    },
    wealth: {
      read: "쓰고 있는 돈과 일정을 한 번 훑어보기 좋은 조건입니다.",
      watch: "미룬 계산이 뒤로 쌓일 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    order: {
      read: "맡은 일의 순서를 다시 세우기 좋은 조건입니다.",
      watch: "급한 것과 중요한 것이 섞이기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
    support: {
      read: "읽고 정리하며 다음 걸음을 고르기 좋은 조건입니다.",
      watch: "준비만 하다 하루가 갈 수 있습니다. 눈에 띄면 적어 두세요.",
    },
  },
  bad: {
    peer: {
      read: "새로 벌이기보다 하던 것을 하나씩 마무리하기 좋은 조건입니다.",
      watch: "혼자 떠안으면 속도가 더 떨어집니다. 눈에 띄면 적어 두세요.",
    },
    express: {
      read: "말을 줄이고 이미 꺼낸 이야기를 여미기 좋은 조건입니다.",
      watch: "설명이 길어질수록 오해가 늘 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    wealth: {
      read: "큰 결정은 하루 재워 두기 좋은 조건입니다.",
      watch: "조바심에 결제를 서두르기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
    order: {
      read: "기한과 경계를 다시 정리해 두기 좋은 조건입니다.",
      watch: "밖에서 오는 압박이 무겁게 느껴집니다. 눈에 띄면 적어 두세요.",
    },
    support: {
      read: "무리하지 말고 아는 사람에게 한 번 물어보기 좋은 조건입니다.",
      watch: "생각만 많아지고 손이 늦어집니다. 눈에 띄면 적어 두세요.",
    },
  },
  "very-bad": {
    peer: {
      read: "속도를 줄이고 몸 상태부터 살피기 좋은 조건입니다.",
      watch: "버티려다 다음 날까지 밀릴 수 있습니다. 눈에 띄면 적어 두세요.",
    },
    express: {
      read: "말수를 줄이고 듣는 쪽에 서 보기 좋은 조건입니다.",
      watch: "한마디가 평소보다 크게 남습니다. 눈에 띄면 적어 두세요.",
    },
    wealth: {
      read: "새 지출과 새 약속은 미뤄 두기 좋은 조건입니다.",
      watch: "숫자를 대충 넘기면 뒤에 다시 손이 갑니다. 눈에 띄면 적어 두세요.",
    },
    order: {
      read: "맡은 것을 오늘 할 수 있는 만큼으로 줄여 두기 좋은 조건입니다.",
      watch: "정면으로 부딪치면 회복이 오래 걸립니다. 눈에 띄면 적어 두세요.",
    },
    support: {
      read: "쉬면서 가볍게 읽고 넘기기 좋은 조건입니다.",
      watch: "혼자 결론을 내리면 뒤에 바뀌기 쉽습니다. 눈에 띄면 적어 두세요.",
    },
  },
};

/**
 * 지표 5종의 사람 말 이름. 내부 키(`wealth`·`love`·`fame`·`health`·`study`)는
 * `lib/diary/fortune-core.js:115` 의 `calcGodlifeScores` 가 내는 것 그대로다.
 */
const DIARY_FOCUS_LABEL = {
  wealth: "손에 잡히는 결과",
  love: "표현과 사이",
  fame: "맡은 자리",
  health: "몸 상태",
  study: "배우고 익히는 것",
} as const;

type FocusKey = keyof typeof DIARY_FOCUS_LABEL;

const FOCUS_ORDER: readonly FocusKey[] = ["wealth", "love", "fame", "health", "study"];

/** 다섯 지표 중 가장 높게 잡힌 하나. 동점이면 위 순서에서 앞선 것이 남는다. */
export function diaryFocusLine(scores: DiaryDayFortune["scores"]): string {
  if (!scores) return "";
  let best: FocusKey | null = null;
  for (const key of FOCUS_ORDER) {
    const value = Number(scores[key]);
    if (!Number.isFinite(value)) continue;
    if (best === null || value > Number(scores[best])) best = key;
  }
  if (!best) return "";
  return `다섯 갈래 가운데 「${DIARY_FOCUS_LABEL[best]}」 쪽이 가장 높게 표시됩니다.`;
}

/**
 * 하루 문안 한 벌. 등급을 못 내면(`tone: "profile"` 또는 판정 없음) `null` 이고,
 * 그때 화면은 문안 대신 생년월일 안내를 그린다.
 *
 * 계열을 못 내면 등급 문장(`./flow-copy`)으로 되돌아간다 — 25칸을 억지로 고르지 않는다.
 */
export function buildDiaryDayDetail(
  fortune: DiaryDayFortune | null | undefined,
  group: DiaryDayGroup | null | undefined,
): DiaryDayDetail | null {
  const grade = diaryFlowCopy(fortune?.tone);
  if (!grade || !fortune) return null;

  const lines = group ? DIARY_DAY_LINES[fortune.tone as GradeKey]?.[group] : null;
  return {
    grade,
    read: lines ? lines.read : grade.flow,
    watch: lines ? lines.watch : grade.care,
    focus: diaryFocusLine(fortune.scores),
    suggest: grade.suggest,
  };
}
