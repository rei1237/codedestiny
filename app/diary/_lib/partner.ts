/**
 * 함께 보기의 파생 — 저장된 상대를 읽고, 앞으로 2주를 두 줄로 깐다.
 *
 * 🔴 **새 판정을 만들지 않는다.** 상대의 하루도 내 달력이 쓰는 것과 **같은 함수**로 낸다
 * (`buildDiaryNatalChart` + `classifyDiaryDays`). 두 사람 사이를 재는 식은 여기 한 줄도 없다 —
 * 사주 궁합은 유료 기능이고(js/saju-engine.js:28089), 그것을 무료로 다시 지으면 안 된다.
 * 여기서 무료로 남는 것은 셸 다이어리 모달이 이미 무료로 주던 범위(상대 저장 + 같이 볼 날 고르기)다.
 *
 * 🔴 상대는 한 명이다 — 셸이 쓰던 v2 필드를 그대로 읽는다(`./entry-writes.ts` 의 상대 뮤테이터).
 * 셸은 그날 엔트리에만 적어서(js/luck-sync-diary.js:4735) 자정이 지나면 오늘 엔트리에서는
 * 사라진다. 그래서 여기서는 **저장소 전체를 최근 날짜부터 훑어** 마지막으로 적어 둔 상대를 찾는다.
 */

import {
  buildDiaryNatalChart,
  classifyDiaryDays,
  type DiaryBirthInput,
  type DiaryDayFortune,
  type DiaryNatalChart,
} from "@/lib/diary/fortune-adapter";
import { diaryFlowCopy, type DiaryFlowCopy } from "./flow-copy";
import { shiftYmd } from "./kst-date";
import type { DiaryLegacyStore } from "./today-snapshot";

/** 스트립에 까는 날 수. 오늘 포함 2주다(목업 승인본). */
export const DIARY_TOGETHER_DAYS = 14;

export interface DiaryPartner {
  name: string;
  /** `YYYY-MM-DD`. 저장 형태가 그렇다(셸 `normalizeLsdBirthDate:79-91`). */
  birthDate: string;
  birth: DiaryBirthInput;
  compatType: string;
}

/** `YYYY-MM-DD` 와 `YYYYMMDD` 를 함께 받는다 — 셸이 남긴 값이 두 모양 다 있을 수 있다. */
function parsePartnerBirth(raw: string): { ymd: string; year: number; month: number; day: number } | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return { ymd: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`, year, month, day };
}

/** `HH:MM` 이면 시·분으로 쪼갠다. 아니면 `null` — 그때 어댑터가 12시로 본다. */
function parsePartnerTime(raw: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw || ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * 마지막으로 적어 둔 상대. 생일이 없으면 이름만 돌려주고(그때는 스트립을 그리지 않는다),
 * 이름도 생일도 없으면 `null` 이다.
 *
 * 🔴 **필드마다 따로 최신값을 줍는다.** 오늘 이름만 고쳐 적은 엔트리에서 훑기를 멈추면
 * 어제 저장해 둔 생일이 화면에서 사라진다 — 같은 상대인데 스트립이 통째로 빈다.
 */
export function readDiaryPartner(store: DiaryLegacyStore): DiaryPartner | null {
  const dates = Object.keys(store || {}).sort().reverse();
  let name = "";
  let parsedBirth: ReturnType<typeof parsePartnerBirth> = null;
  let birthTime: ReturnType<typeof parsePartnerTime> = null;
  let compatType = "";

  for (const date of dates) {
    const entry = store[date];
    if (!entry || typeof entry !== "object") continue;
    if (!name) name = String(entry.partnerName || "").trim();
    if (!parsedBirth) {
      parsedBirth = parsePartnerBirth(String(entry.partnerBirthDate || ""));
      /* 생일을 준 엔트리의 시각을 함께 집는다 — 다른 날의 시각을 섞으면 없는 사람이 된다. */
      if (parsedBirth) birthTime = parsePartnerTime(String(entry.partnerBirthTime || ""));
    }
    if (!compatType) compatType = String(entry.compatType || "").trim();
    if (name && parsedBirth && compatType) break;
  }

  if (!name && !parsedBirth) return null;
  return {
    name,
    birthDate: parsedBirth ? parsedBirth.ymd : "",
    birth: parsedBirth
      ? {
          year: parsedBirth.year,
          month: parsedBirth.month,
          day: parsedBirth.day,
          hour: birthTime?.hour ?? null,
          minute: birthTime?.minute ?? null,
        }
      : { year: 0, month: 0, day: 0 },
    compatType: compatType || "love",
  };
}

/** 상대의 원국. 생일이 없으면 `null` 이고, 그때 아래 스트립은 내 줄만 남는다. */
export function buildPartnerChart(partner: DiaryPartner | null, referenceYmd: string): DiaryNatalChart | null {
  if (!partner?.birthDate) return null;
  return buildDiaryNatalChart(partner.birth, referenceYmd);
}

export interface DiaryTogetherDay {
  ymd: string;
  /** 날짜 머리(일). 스트립 위에 숫자로만 올린다. */
  dayOfMonth: number;
  mine: DiaryFlowCopy | null;
  theirs: DiaryFlowCopy | null;
  /** 두 사람 모두 위 두 등급으로 표시된 날. */
  shared: boolean;
}

/** 「좋게 표시된」의 정의. 위 두 등급 하나다 — 이 판정은 여기 한 곳에만 둔다. */
const SHARED_TONES: readonly DiaryDayFortune["tone"][] = ["very-good", "good"];

/**
 * 오늘부터 2주를 두 줄로 깐다. 위가 나, 아래가 상대, 같은 날짜 축이다.
 * 🔴 차트는 각각 **한 번씩만** 만들어 넘긴다 — 날짜마다 다시 만들면 차트가 잡는 기준일이 갈린다
 * (`lib/diary/fortune-adapter.ts:91`).
 */
export function buildTogetherDays(
  myChart: DiaryNatalChart | null,
  partnerChart: DiaryNatalChart | null,
  startYmd: string,
  count: number = DIARY_TOGETHER_DAYS,
): DiaryTogetherDay[] {
  if (!startYmd) return [];
  const ymds = Array.from({ length: count }, (_, index) => shiftYmd(startYmd, index));
  const mine = new Map(classifyDiaryDays(myChart, ymds).map((day) => [day.ymd, day]));
  const theirs = new Map(classifyDiaryDays(partnerChart, ymds).map((day) => [day.ymd, day]));

  return ymds.map((ymd) => {
    const my = mine.get(ymd) || null;
    const their = theirs.get(ymd) || null;
    return {
      ymd,
      dayOfMonth: Number(ymd.slice(8, 10)),
      mine: diaryFlowCopy(my?.tone),
      theirs: diaryFlowCopy(their?.tone),
      shared: Boolean(
        my && their && SHARED_TONES.includes(my.tone) && SHARED_TONES.includes(their.tone),
      ),
    };
  });
}

/** 둘 다 좋게 표시된 날 가운데 **가장 이른** 하루. 없으면 `null`. */
export function pickSharedDay(days: DiaryTogetherDay[]): DiaryTogetherDay | null {
  return days.find((day) => day.shared) || null;
}
