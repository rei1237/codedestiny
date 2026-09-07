"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import {
  DIARY_COMPAT_TYPES,
  writeCompatType,
  writePartnerBirth,
  writePartnerName,
  type DiaryCompatType,
} from "../_lib/entry-writes";
import { readExtDay, readPartnerNote } from "../_lib/ext-snapshot";
import { writePartnerNote } from "../_lib/ext-writes";
import { formatKoreanDate } from "../_lib/kst-date";
import {
  buildPartnerChart,
  buildTogetherDays,
  pickSharedDay,
  readDiaryPartner,
  type DiaryTogetherDay,
} from "../_lib/partner";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import styles from "../_styles/diary.module.css";

/**
 * 함께 보기 시트. 상대 한 명을 오늘과 나란히 놓는다.
 *
 * 🔴 **궁합 점수·등급·리포트를 만들지 않는다.** 사주 궁합은 유료 기능이고(js/saju-engine.js:28089),
 * 그것을 무료로 다시 지으면 안 된다. 여기서 하는 일은 상대의 하루도 내 달력과 **같은 함수**로 내서
 * (`../_lib/partner.ts`) 두 줄로 깔고, 겹치는 날을 짚어 주는 것까지다.
 * 🔴 **금액을 적지 않는다** — 마지막 줄은 기존 궁합 화면으로 넘기기만 하고, 가격은 결제창이 정한다.
 * 🔴 상대는 한 명이고 저장 자리는 셸과 같은 v2 필드다(새 저장 키 0개). 메모만 셸에 대응 필드가
 * 없어 확장 하루치에 둔다(`../_lib/ext-snapshot.ts`).
 */

const DIARY_TOGETHER_TEXT = {
  ko: {
    title: "함께 보기",
    close: "닫기",
    lead: "가까운 사람의 결을 오늘과 나란히 놓고 봅니다.",
    name: "상대 이름",
    namePlaceholder: "이름",
    birth: "상대 생년월일",
    types: { love: "가깝게", friend: "친구", business: "일" },
    mine: "나",
    partnerFallback: "상대",
    sharedLabel: "둘 다 좋게 표시된 날",
    sharedNone: "앞으로 2주 안에는 두 사람이 함께 표시된 날이 없습니다.",
    sharedHint: "미뤄 둔 이야기를 꺼내거나 약속을 잡아 보기 좋은 조건입니다.",
    note: "메모",
    notePlaceholder: "오늘 이 사람에 대해 남길 말",
    needName: "이름과 생년월일을 적으면 두 사람의 2주가 나란히 깔립니다.",
    needMine: "내 생년월일을 등록하면 내 줄도 함께 표시됩니다.",
    compat: "사주 궁합 보기",
    compatHint: "결제 화면에서 이어집니다.",
    empty: "오늘의 기록을 불러오는 중입니다.",
  },
  en: {
    title: "Together",
    close: "Close",
    lead: "Put someone close to you next to today.",
    name: "Their name",
    namePlaceholder: "Name",
    birth: "Their birth date",
    types: { love: "Close", friend: "Friend", business: "Work" },
    mine: "Me",
    partnerFallback: "Them",
    sharedLabel: "Marked well for both",
    sharedNone: "No day in the next two weeks is marked for both of you.",
    sharedHint: "A good setting for a talk you have put off, or for making plans.",
    note: "Note",
    notePlaceholder: "What you want to keep about them today",
    needName: "Add a name and birth date to lay out two weeks side by side.",
    needMine: "Add your own birth date and your row appears too.",
    compat: "See the saju compatibility",
    compatHint: "Continues on the checkout screen.",
    empty: "Loading today's entry.",
  },
} as const;

const copy = DIARY_TOGETHER_TEXT.ko;

/** 결 5단계 색은 달력과 **같은 토큰**을 쓴다(`.t1`~`.t5` 가 `--dy-grain` 을 준다). */
function toneClass(step: string | undefined): string {
  const cell = styles[step as keyof typeof styles];
  return typeof cell === "string" ? `${styles.togetherCell} ${cell}` : `${styles.togetherCell} ${styles.togetherCellOff}`;
}

/** 한 주(7칸)를 머리·나·상대 세 줄로 깐다. 2주는 이 블록 둘이다. */
function TogetherWeek({
  days,
  partnerLabel,
}: {
  days: DiaryTogetherDay[];
  partnerLabel: string;
}) {
  return (
    <div className={styles.togetherStrip}>
      <span className={styles.togetherWho} aria-hidden="true" />
      {days.map((day) => (
        <span key={`head-${day.ymd}`} className={styles.togetherHead}>
          {day.dayOfMonth}
        </span>
      ))}
      <span className={styles.togetherWho}>{copy.mine}</span>
      {days.map((day) => (
        <span
          key={`mine-${day.ymd}`}
          className={`${toneClass(day.mine?.step)}${day.shared ? ` ${styles.togetherCellPick}` : ""}`}
          title={day.mine?.name || ""}
        />
      ))}
      <span className={styles.togetherWho}>{partnerLabel}</span>
      {days.map((day) => (
        <span
          key={`theirs-${day.ymd}`}
          className={`${toneClass(day.theirs?.step)}${day.shared ? ` ${styles.togetherCellPick}` : ""}`}
          title={day.theirs?.name || ""}
        />
      ))}
    </div>
  );
}

export default function DiaryTogetherSheet({ onClose }: { onClose: () => void }) {
  const { hydrated, ymd, entry, ext, store, chart } = useDiaryToday();
  const { updateEntry, updateExtDay } = useDiaryWriter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const partner = useMemo(() => readDiaryPartner(store), [store]);
  const partnerChart = useMemo(() => buildPartnerChart(partner, ymd), [partner, ymd]);
  const days = useMemo(
    () => (partnerChart ? buildTogetherDays(chart, partnerChart, ymd) : []),
    [chart, partnerChart, ymd],
  );
  const shared = pickSharedDay(days);

  const name = useDiaryDraft(String(entry?.partnerName || partner?.name || ""), (next) => {
    updateEntry(ymd, writePartnerName(next.trim()));
  });
  const note = useDiaryDraft(readPartnerNote(readExtDay(ext, ymd)), (next) => {
    updateExtDay(ymd, writePartnerNote(next));
  });

  const birthDate = partner?.birthDate || "";
  const compatType = String(entry?.compatType || partner?.compatType || "love");
  const partnerLabel = name.value.trim() || copy.partnerFallback;

  return (
    <aside className={styles.sheet} aria-label={copy.title}>
      <span className={styles.sheetHandle} aria-hidden="true" />
      <header className={styles.sheetHead}>
        <h2 className={styles.sheetTitle}>{copy.title}</h2>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label={copy.close}>
          ✕
        </button>
      </header>

      <p className={styles.emptySmall}>{copy.lead}</p>

      {!hydrated || !ymd ? <p className={styles.empty}>{copy.empty}</p> : null}

      {hydrated && ymd ? (
        <>
          <div className={styles.togetherFields}>
            <input
              type="text"
              className={styles.input}
              value={name.value}
              onChange={(event) => name.onChange(event.target.value)}
              onBlur={name.flush}
              placeholder={copy.namePlaceholder}
              aria-label={copy.name}
            />
            {/* 🔴 날짜는 초안(디바운스)에 태우지 않는다 — 타자 도중의 반쪽 날짜가 저장된다. */}
            <input
              type="date"
              className={styles.input}
              value={birthDate}
              onChange={(event) => updateEntry(ymd, writePartnerBirth(event.target.value))}
              aria-label={copy.birth}
            />
          </div>

          <div className={styles.chipRow}>
            {DIARY_COMPAT_TYPES.map((key: DiaryCompatType) => (
              <button
                key={key}
                type="button"
                className={compatType === key ? styles.rangeChipOn : styles.rangeChip}
                onClick={() => updateEntry(ymd, writeCompatType(key))}
                aria-pressed={compatType === key}
              >
                {copy.types[key]}
              </button>
            ))}
          </div>

          {days.length ? (
            <>
              <TogetherWeek days={days.slice(0, 7)} partnerLabel={partnerLabel} />
              <TogetherWeek days={days.slice(7)} partnerLabel={partnerLabel} />
              {!chart ? <p className={styles.emptySmall}>{copy.needMine}</p> : null}

              <div className={styles.togetherPick}>
                <p className={styles.fieldLabel}>
                  {copy.sharedLabel}
                  {shared ? <span className={styles.togetherPickDate}>{formatKoreanDate(shared.ymd)}</span> : null}
                </p>
                <p className={styles.fieldHint}>
                  {shared
                    ? `두 사람 모두 ${shared.mine?.name || ""}·${shared.theirs?.name || ""} 로 표시된 날입니다. ${copy.sharedHint}`
                    : copy.sharedNone}
                </p>
              </div>
            </>
          ) : (
            <p className={styles.empty}>{copy.needName}</p>
          )}

          <p className={styles.fieldLabel}>{`${partnerLabel} ${copy.note}`}</p>
          <textarea
            className={styles.textarea}
            value={note.value}
            onChange={(event) => note.onChange(event.target.value)}
            onBlur={note.flush}
            placeholder={copy.notePlaceholder}
            aria-label={copy.note}
            rows={3}
          />

          {/* 여기서 끝이다 — 그 이상은 기존 궁합 화면으로 넘긴다(금액은 결제창이 정한다). */}
          <Link className={styles.togetherPaid} href="/#compatCard">
            <span>{`${partnerLabel} ${copy.compat}`}</span>
            <span className={styles.togetherPaidHint}>{copy.compatHint}</span>
          </Link>
        </>
      ) : null}
    </aside>
  );
}
