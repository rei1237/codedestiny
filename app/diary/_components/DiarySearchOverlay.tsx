"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { useDiaryToday } from "./DiaryStoreProvider";
import {
  buildDiaryRecordRows,
  searchDiaryRecords,
  DIARY_SEARCH_MAX,
  DIARY_SEARCH_MIN,
  type DiarySearchField,
  type DiarySearchScope,
} from "../_lib/records";
import { formatKoreanDate } from "../_lib/kst-date";
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";
import styles from "../_styles/diary.module.css";

/**
 * 기록 검색. 전체화면 오버레이다.
 *
 * 🔴 **검색어를 어디에도 남기지 않는다** — 라우트 세그먼트도 `?q=` 쿼리도 쓰지 않는다.
 * 개인 일기의 검색어가 URL·히스토리·공유 링크에 남으면 그 자체가 기록의 유출이다.
 * 그래서 상태는 컴포넌트 안에만 있고, 히스토리에는 **값 없는 자리 하나**만 밀어 넣는다.
 *
 * 🔴 히스토리 자리를 미는 이유는 안드로이드 뒤로가기다 — 그것이 없으면 뒤로가기가 오버레이가
 * 아니라 `/diary` 자체를 떠난다. 닫기·Esc 도 같은 자리를 `history.back()` 으로 되감아
 * 닫는 길이 하나가 되게 한다(각자 닫으면 자리가 남아 뒤로가기가 한 번 헛돈다).
 *
 * 🔴 스크롤 락은 `app/_lib/body-scroll-lock.ts` 하나를 부른다 — 여기서 body 를 직접 만지면
 * 잠금 계층이 이중이 된다(원칙 6). Day View 시트가 락을 걸지 **않는** 것과는 다른 판단이다:
 * 그쪽은 뒤 화면을 함께 보는 peek 이고, 이쪽은 화면을 통째로 덮는다.
 */

const DIARY_SEARCH_TEXT = {
  ko: {
    label: "기록 검색",
    close: "닫기",
    placeholder: "기록에서 찾기",
    hint: "두 글자 이상 입력하면 찾기 시작합니다.",
    none: "찾은 기록이 없습니다.",
    count: "찾은 기록",
    unit: "건",
    capped: "결과가 많습니다. 검색어를 조금 더 좁혀 보세요.",
    scopeLabel: "찾는 범위",
    scopes: { all: "전체", note: "한 줄·메모", plan: "할 일·일정", tag: "태그" },
    fields: { line: "한 줄", memo: "메모", todo: "할 일", schedule: "일정", tag: "태그" },
  },
  en: {
    label: "Search entries",
    close: "Close",
    placeholder: "Search your entries",
    hint: "Type two or more characters to start.",
    none: "No entries found.",
    count: "Found",
    unit: "",
    capped: "Many results. Try narrowing the search.",
    scopeLabel: "Search scope",
    scopes: { all: "All", note: "Line & memo", plan: "To do & schedule", tag: "Tags" },
    fields: { line: "Line", memo: "Memo", todo: "To do", schedule: "Schedule", tag: "Tag" },
  },
} as const;

const copy = DIARY_SEARCH_TEXT.ko;

const SCOPES: DiarySearchScope[] = ["all", "note", "plan", "tag"];

export default function DiarySearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { store, ext } = useDiaryToday();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<DiarySearchScope>("all");

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  /* 결과를 눌러 나가는 경우: 히스토리 자리를 먼저 되감고 그다음에 이동한다. 순서를 바꾸면
     오버레이를 닫는 뒤로가기가 방금 연 날짜를 다시 덮는다. */
  const pendingHref = useRef<string | null>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    window.history.pushState({ cdDiarySearch: true }, "");
    const onPop = () => {
      closeRef.current();
      const href = pendingHref.current;
      pendingHref.current = null;
      if (href) router.push(href);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") window.history.back();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  const rows = useMemo(() => buildDiaryRecordRows(store, ext), [store, ext]);
  const hits = useMemo(() => searchDiaryRecords(rows, query, scope), [rows, query, scope]);
  const ready = query.trim().length >= DIARY_SEARCH_MIN;

  const openDay = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    pendingHref.current = href;
    window.history.back();
  };

  return (
    <div className={styles.searchOverlay} role="dialog" aria-modal="true" aria-label={copy.label}>
      <div className={styles.searchBar}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => window.history.back()}
          aria-label={copy.close}
        >
          ←
        </button>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.label}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- 검색은 열자마자 쓰려고 여는 화면이다
          autoFocus
        />
      </div>

      <div className={styles.searchBody}>
        <div className={styles.searchScope} role="group" aria-label={copy.scopeLabel}>
          {SCOPES.map((item) => (
            <button
              key={item}
              type="button"
              className={scope === item ? styles.tagChipOn : styles.tagChip}
              aria-pressed={scope === item}
              onClick={() => setScope(item)}
            >
              {copy.scopes[item]}
            </button>
          ))}
        </div>

        <p className={styles.searchCount} role="status">
          {!ready
            ? copy.hint
            : hits.length === 0
              ? copy.none
              : `${copy.count} ${hits.length}${copy.unit}${hits.length >= DIARY_SEARCH_MAX ? ` · ${copy.capped}` : ""}`}
        </p>

        {hits.map((hit, index) => {
          const href = `/diary/calendar/?d=${hit.ymd}`;
          return (
            <a
              key={`${hit.ymd}-${hit.field}-${index}`}
              href={href}
              className={styles.hit}
              onClick={(event) => openDay(event, href)}
            >
              <span className={styles.hitHead}>
                <span className={styles.hitDate}>{formatKoreanDate(hit.ymd)}</span>
                <span className={styles.hitField}>{copy.fields[hit.field as DiarySearchField]}</span>
              </span>
              <span className={styles.hitSnippet}>
                {hit.before}
                <mark>{hit.match}</mark>
                {hit.after}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
