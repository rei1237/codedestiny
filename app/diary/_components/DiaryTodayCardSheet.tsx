"use client";

import { useEffect, useState } from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import {
  DIARY_CARD_THEMES,
  toggleCardDecoration,
  writeCardCaption,
  writeCardNickname,
  writeCardTheme,
  type DiaryCardTheme,
} from "../_lib/entry-writes";
import { buildDiaryDayDetail } from "../_lib/day-copy";
import { readExtDay } from "../_lib/ext-snapshot";
import { formatKoreanDate } from "../_lib/kst-date";
import { saveDiaryShareCard } from "../_lib/share-card";
import { readAchievement } from "../_lib/today-snapshot";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import { dayGroupOf } from "@/lib/diary/fortune-adapter";
import styles from "../_styles/diary.module.css";

/**
 * 오늘 카드 시트. 오늘 하루를 이미지 한 장으로 내보낸다.
 *
 * 🔴 카드에 얹는 문장은 Day View 와 **같은 것**이다(`../_lib/day-copy.ts`) — 화면과 카드가
 * 다른 문장을 말하면 사용자가 자기 기록과 대조할 수 없다.
 * 🔴 **일기 본문은 카드에 넣지 않는다**(목업 승인본). 밖으로 나가는 이미지에 들어가는 것은
 * 날짜 · 결 한 줄 · 오늘 해낸 수 · 사용자가 직접 적은 캡션뿐이다.
 * 🔴 꾸밈 다섯 칸은 셸 모달과 같은 v2 필드다(`../_lib/entry-writes.ts`) — 셸에서 고른 배경이
 * 여기서도 그대로 보인다.
 * 🔴 캔버스는 저장을 누른 순간에만 만든다(`../_lib/share-card.ts`).
 */

const DIARY_CARD_TEXT = {
  ko: {
    title: "오늘 카드",
    close: "닫기",
    lead: "오늘 하루를 한 장으로 남깁니다.",
    themeLabel: "배경",
    themes: { vivid: "선명", soft: "파스텔", night: "밤" },
    nickname: "카드에 남길 이름",
    nicknamePlaceholder: "비워 두면 넣지 않습니다",
    caption: "카드에 남길 한 줄",
    captionPlaceholder: "비워 두면 기본 문구가 들어갑니다",
    sticker: "스티커",
    badge: "배지",
    save: "이미지로 저장",
    spec: "1080 × 1920 · 기기에 저장됩니다",
    saved: "이미지를 저장했습니다.",
    failed: "이미지를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    achievement: "오늘 해낸 것",
    noProfile: "생년월일을 등록하면 오늘의 결이 카드에 들어갑니다.",
    empty: "오늘의 기록을 불러오는 중입니다.",
  },
  en: {
    title: "Card of the day",
    close: "Close",
    lead: "Keep today as a single image.",
    themeLabel: "Background",
    themes: { vivid: "Vivid", soft: "Soft", night: "Night" },
    nickname: "Name on the card",
    nicknamePlaceholder: "Left blank, it is not printed",
    caption: "One line on the card",
    captionPlaceholder: "Left blank, a default line is used",
    sticker: "Sticker",
    badge: "Badge",
    save: "Save as image",
    spec: "1080 x 1920 - saved to your device",
    saved: "Image saved.",
    failed: "Could not build the image. Please try again.",
    achievement: "Done today",
    noProfile: "Add your birth date and today's grain will appear on the card.",
    empty: "Loading today's entry.",
  },
} as const;

const copy = DIARY_CARD_TEXT.ko;

/** 미리보기 바탕. 🔴 내보낸 이미지와 같은 3벌이라 앱 테마를 따라가지 않는다(CSS 주석 참조). */
const PREVIEW_CLASS: Record<DiaryCardTheme, string> = {
  vivid: styles.cardVivid,
  soft: styles.cardSoft,
  night: styles.cardNight,
};

export default function DiaryTodayCardSheet({ onClose }: { onClose: () => void }) {
  const { hydrated, ymd, entry, ext, chart, fortune } = useDiaryToday();
  const { updateEntry } = useDiaryWriter();
  const [saved, setSaved] = useState<"saved" | "failed" | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const nickname = useDiaryDraft(entry?.shareNickname || "", (next) => {
    updateEntry(ymd, writeCardNickname(next));
  });
  const caption = useDiaryDraft(entry?.shareCaption || "", (next) => {
    updateEntry(ymd, writeCardCaption(next));
  });

  const detail = buildDiaryDayDetail(fortune, dayGroupOf(chart, ymd));
  const theme = (DIARY_CARD_THEMES as readonly string[]).includes(entry?.shareTheme || "")
    ? (entry?.shareTheme as DiaryCardTheme)
    : "vivid";
  /* 셸 `:1715-1716` 과 같은 켜짐 판정 — 값이 없는 엔트리는 켜진 것으로 본다. */
  const useSticker = entry?.shareUseSticker !== false;
  const useBadge = entry?.shareUseBadge !== false;

  const progress = readAchievement(entry, readExtDay(ext, ymd));
  const achievement = progress.total > 0 ? `${copy.achievement} ${progress.done}/${progress.total}` : "";

  const onSave = () => {
    if (!detail) return;
    nickname.flush();
    caption.flush();
    const ok = saveDiaryShareCard({
      ymd,
      theme,
      headline: detail.grade.name,
      line: detail.read,
      achievement,
      nickname: nickname.value.trim(),
      caption: caption.value.trim(),
      stickers: useSticker && Array.isArray(entry?.stickers) ? entry.stickers : [],
      badges: useBadge && Array.isArray(entry?.badges) ? entry.badges : [],
    });
    setSaved(ok ? "saved" : "failed");
  };

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
          {detail ? (
            <div className={`${styles.cardPreview} ${PREVIEW_CLASS[theme]}`}>
              <span className={styles.cardPreviewDate}>{formatKoreanDate(ymd)}</span>
              <strong className={styles.cardPreviewHead}>{detail.grade.name}</strong>
              <span className={styles.cardPreviewLine}>{detail.read}</span>
              <span className={styles.cardPreviewFoot}>
                {[achievement, caption.value.trim(), nickname.value.trim()].filter(Boolean).join(" · ")}
              </span>
            </div>
          ) : (
            <p className={styles.empty}>{copy.noProfile}</p>
          )}

          <p className={styles.fieldLabel}>{copy.themeLabel}</p>
          <div className={styles.chipRow}>
            {DIARY_CARD_THEMES.map((key) => (
              <button
                key={key}
                type="button"
                className={theme === key ? styles.rangeChipOn : styles.rangeChip}
                onClick={() => updateEntry(ymd, writeCardTheme(key))}
                aria-pressed={theme === key}
              >
                {copy.themes[key]}
              </button>
            ))}
          </div>

          <p className={styles.fieldLabel}>{copy.nickname}</p>
          <input
            type="text"
            className={styles.input}
            value={nickname.value}
            onChange={(event) => nickname.onChange(event.target.value)}
            onBlur={nickname.flush}
            placeholder={copy.nicknamePlaceholder}
            aria-label={copy.nickname}
          />

          <p className={styles.fieldLabel}>{copy.caption}</p>
          <input
            type="text"
            className={styles.input}
            value={caption.value}
            onChange={(event) => caption.onChange(event.target.value)}
            onBlur={caption.flush}
            placeholder={copy.captionPlaceholder}
            aria-label={copy.caption}
          />

          {/* 스티커·배지는 셸에서 모은 것이다 — 앱에는 고르는 자리가 없고, 얹을지만 정한다. */}
          <div className={styles.chipRow}>
            <button
              type="button"
              className={useSticker ? styles.rangeChipOn : styles.rangeChip}
              onClick={() => updateEntry(ymd, toggleCardDecoration("sticker"))}
              aria-pressed={useSticker}
            >
              {copy.sticker}
            </button>
            <button
              type="button"
              className={useBadge ? styles.rangeChipOn : styles.rangeChip}
              onClick={() => updateEntry(ymd, toggleCardDecoration("badge"))}
              aria-pressed={useBadge}
            >
              {copy.badge}
            </button>
          </div>

          <div className={styles.chipRow}>
            <button type="button" className={styles.cardSave} disabled={!detail} onClick={onSave}>
              {copy.save}
            </button>
          </div>
          <p className={styles.emptySmall}>{copy.spec}</p>
          {saved ? (
            <p className={styles.emptySmall} role="status">
              {saved === "saved" ? copy.saved : copy.failed}
            </p>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
