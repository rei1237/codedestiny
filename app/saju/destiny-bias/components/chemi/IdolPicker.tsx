"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRESET_PARTNERS,
  listGroupMembers,
  listRosterGroups,
  resolvePartner,
  searchPartners,
  type ChemiPartnerRecord,
  type ChemiPartnerRef,
  type RosterGroupSummary,
} from "@/lib/idol-chemi";
import { siteSeo } from "@/lib/seo/siteSeo";
import { ASSETS } from "./chemiAssets";
import { sameRef } from "./chemiStorage";
import styles from "../../destiny-bias.module.css";

type Tab = "kpop" | "etc";

type Props = {
  recent: ChemiPartnerRef[];
  selected: ChemiPartnerRef | null;
  isLoggedIn: boolean;
  onSelect: (partner: ChemiPartnerRecord) => void;
  onBack: () => void;
};

const PRESET_CATEGORY_ORDER = ["걸그룹", "보이그룹", "가수·솔로", "배우", "애니 캐릭터", "정치인"];

function initialOf(name: string) {
  return String(name || "?").trim().slice(0, 1);
}

function MemberGrid({ items, selected, onSelect, label }: {
  items: readonly ChemiPartnerRecord[];
  selected: ChemiPartnerRef | null;
  onSelect: (partner: ChemiPartnerRecord) => void;
  label: string;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setFocusIndex(0);
  }, [items]);

  const move = (direction: 1 | -1) => {
    if (!items.length) return;
    const next = (focusIndex + direction + items.length) % items.length;
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  if (!items.length) {
    return (
      <div className={styles.emptyState}>
        <img src={ASSETS.miniEmpty} alt="" width={96} height={96} aria-hidden />
        <p>검색 결과가 없어요. 활동명 또는 그룹명으로 다시 찾아보세요.</p>
      </div>
    );
  }

  return (
    <div role="listbox" aria-label={label} className={styles.memberGrid}>
      {items.map((partner, index) => {
        const active = sameRef(selected, partner);
        return (
          <button
            key={`${partner.kind}:${partner.id}`}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="option"
            aria-selected={active}
            tabIndex={index === focusIndex ? 0 : -1}
            className={`${styles.memberTile} ${active ? styles.memberTileActive : ""}`}
            onClick={() => onSelect(partner)}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
          >
            <span className={styles.memberFrame} aria-hidden>
              <img src={ASSETS.frameMember} alt="" width={54} height={81} decoding="async" loading="lazy" />
              <span className={styles.memberInitial}>{initialOf(partner.displayName)}</span>
            </span>
            <span className={styles.memberName}>{partner.displayName}</span>
            <span className={styles.memberGroup}>{partner.groupLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function IdolPicker({ recent, selected, isLoggedIn, onSelect, onBack }: Props) {
  const groups = useMemo(() => listRosterGroups(), []);
  const [tab, setTab] = useState<Tab>("kpop");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [presetCategory, setPresetCategory] = useState<string>(PRESET_CATEGORY_ORDER[0]);

  const trimmedQuery = query.trim();
  const searchResults = useMemo(() => (trimmedQuery.length >= 1 ? searchPartners(trimmedQuery, 24) : []), [trimmedQuery]);
  const groupMembers = useMemo(() => (groupId ? listGroupMembers(groupId) : []), [groupId]);
  const presetItems = useMemo(
    () => PRESET_PARTNERS.filter((p) => p.category === presetCategory),
    [presetCategory],
  );
  const presetCategories = useMemo(() => {
    const present = new Set(PRESET_PARTNERS.map((p) => p.category));
    return PRESET_CATEGORY_ORDER.filter((c) => present.has(c));
  }, []);
  const recentRecords = useMemo(
    () => recent.map((ref) => resolvePartner(ref)).filter((r): r is ChemiPartnerRecord => Boolean(r)),
    [recent],
  );
  const activeGroup: RosterGroupSummary | undefined = groups.find((g) => g.id === groupId);

  const requestHref = isLoggedIn
    ? "/feedback/?topic=destiny-bias-roster"
    : `mailto:${siteSeo.contact.email}?subject=${encodeURIComponent("[최애운명] 아이돌 추가 요청")}&body=${encodeURIComponent("추가를 원하는 그룹/멤버 활동명:\n공식 프로필 링크(있다면):\n")}`;

  return (
    <section className={styles.picker} aria-labelledby="dbk-picker-title">
      <div className={styles.stepHeader}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← 처음으로
        </button>
        <p className={styles.stepLabel}>STEP 1 / 3</p>
      </div>
      <h2 id="dbk-picker-title" className={styles.stepTitle}>내 최애는 누구?</h2>

      <label className={styles.searchBox}>
        <span className="sr-only">활동명 또는 그룹명 검색</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="활동명·그룹명 검색 (예: 정국, 아이브)"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {trimmedQuery ? (
        <MemberGrid items={searchResults} selected={selected} onSelect={onSelect} label="검색 결과" />
      ) : (
        <>
          {recentRecords.length > 0 ? (
            <div className={styles.recentRow} aria-label="최근 선택">
              <span className={styles.recentLabel}>최근</span>
              {recentRecords.map((p) => (
                <button key={`${p.kind}:${p.id}`} type="button" className={styles.chip} onClick={() => onSelect(p)}>
                  {p.displayName}
                  <small>{p.groupLabel}</small>
                </button>
              ))}
            </div>
          ) : null}

          <div role="tablist" aria-label="최애 분류" className={styles.tabs}>
            <button type="button" role="tab" aria-selected={tab === "kpop"} className={styles.tab} onClick={() => setTab("kpop")}>
              K-POP
            </button>
            <button type="button" role="tab" aria-selected={tab === "etc"} className={styles.tab} onClick={() => setTab("etc")}>
              기타
            </button>
          </div>

          {tab === "kpop" ? (
            groupId && activeGroup ? (
              <div>
                <div className={styles.groupBar}>
                  <button type="button" className={styles.backLink} onClick={() => setGroupId(null)}>
                    ← 그룹 목록
                  </button>
                  <h3 className={styles.groupName}>
                    {activeGroup.nameKo} <small>{activeGroup.nameEn} · {activeGroup.debutYear} 데뷔</small>
                  </h3>
                </div>
                <MemberGrid items={groupMembers} selected={selected} onSelect={onSelect} label={`${activeGroup.nameKo} 멤버`} />
              </div>
            ) : (
              <ul className={styles.groupGrid} aria-label="K-POP 그룹">
                {groups.map((g) => (
                  <li key={g.id}>
                    <button type="button" className={styles.groupTile} onClick={() => setGroupId(g.id)}>
                      <span className={styles.groupTileName}>{g.nameKo}</span>
                      <span className={styles.groupTileMeta}>
                        {g.nameEn} · {g.memberCount}명
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div>
              <div className={styles.categoryRow} role="tablist" aria-label="기타 분류">
                {presetCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={presetCategory === c}
                    className={styles.chip}
                    onClick={() => setPresetCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className={styles.helpText}>기존 프리셋 인물이에요. K-POP 로스터와 달리 출처 검증 레저가 없어 참고용으로만 봐 주세요.</p>
              <MemberGrid items={presetItems} selected={selected} onSelect={onSelect} label={`${presetCategory} 목록`} />
            </div>
          )}
        </>
      )}

      <p className={styles.requestRow}>
        찾는 최애가 없나요?{" "}
        <a href={requestHref} className={styles.inlineLink} rel="noreferrer">
          지원하지 않는 아이돌 요청하기
        </a>
      </p>
    </section>
  );
}
