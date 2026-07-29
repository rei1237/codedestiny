"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import FeatureSymbol from "@/app/components/icons/FeatureSymbol";
import type { FortuneEntry, FortuneSection } from "@/app/_lib/allFortunesCatalog";
import {
  FORTUNE_USAGE_EVENT,
  readFavoriteFortuneIds,
  readRecentFortuneIds,
  recordFortuneUse,
  toggleFavoriteFortune,
} from "@/app/_lib/fortune-usage-store";

interface Props {
  sections: FortuneSection[];
}

function matches(entry: FortuneEntry, needle: string): boolean {
  if (!needle) return true;
  const haystack = `${entry.title} ${entry.desc} ${entry.sectionTitle}`.toLowerCase();
  return haystack.includes(needle);
}

export default function AllFortunesClient({ sections }: Props) {
  const [query, setQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      setRecentIds(readRecentFortuneIds());
      setFavoriteIds(readFavoriteFortuneIds());
    };
    sync();
    window.addEventListener(FORTUNE_USAGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FORTUNE_USAGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const entryById = useMemo(() => {
    const map = new Map<string, FortuneEntry>();
    for (const section of sections) {
      for (const entry of section.items) map.set(entry.id, entry);
    }
    return map;
  }, [sections]);

  const needle = query.trim().toLowerCase();

  const filteredSections = useMemo(
    () =>
      sections
        .map((section) => ({ ...section, items: section.items.filter((entry) => matches(entry, needle)) }))
        .filter((section) => section.items.length > 0),
    [sections, needle],
  );

  const pinnedGroups = useMemo(() => {
    if (needle) return [];
    const pick = (ids: string[]) => ids.map((id) => entryById.get(id)).filter((e): e is FortuneEntry => Boolean(e));
    return [
      { id: "favorites", title: "즐겨찾기", items: pick(favoriteIds) },
      { id: "recent", title: "최근 이용", items: pick(recentIds) },
    ].filter((group) => group.items.length > 0);
  }, [needle, favoriteIds, recentIds, entryById]);

  const handleFavorite = useCallback((entryId: string) => {
    toggleFavoriteFortune(entryId);
    setFavoriteIds(readFavoriteFortuneIds());
  }, []);

  const totalCount = useMemo(
    () => filteredSections.reduce((sum, section) => sum + section.items.length, 0),
    [filteredSections],
  );

  const renderCard = (entry: FortuneEntry, keyPrefix: string) => {
    const isFavorite = favoriteIds.includes(entry.id);
    return (
      <li key={`${keyPrefix}-${entry.id}`} className="relative">
        <Link
          href={entry.href}
          onClick={() => recordFortuneUse(entry.id)}
          className="group flex h-full min-h-[92px] flex-col gap-1.5 rounded-2xl border border-violet-300/25 bg-[linear-gradient(160deg,rgba(39,26,67,0.72),rgba(25,34,64,0.72))] p-4 pr-11 no-underline transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-[0_10px_24px_rgba(34,211,238,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-violet-50">
            <FeatureSymbol route={entry.href} size={16} className="text-violet-100" variant="soft" />
            {entry.title}
          </span>
          <span className="text-xs leading-relaxed text-violet-100/75">{entry.desc}</span>
        </Link>
        <button
          type="button"
          onClick={() => handleFavorite(entry.id)}
          aria-pressed={isFavorite}
          aria-label={`${entry.title} 즐겨찾기 ${isFavorite ? "해제" : "추가"}`}
          className="absolute right-1.5 top-1.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-violet-200/70 transition hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          <Star className="h-[18px] w-[18px]" fill={isFavorite ? "currentColor" : "none"} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </li>
    );
  };

  return (
    <div className="mt-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-violet-200/70"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="운세 이름으로 검색"
          aria-label="운세 검색"
          className="h-12 w-full rounded-full border border-violet-300/30 bg-violet-950/40 pl-11 pr-4 text-sm text-violet-50 placeholder:text-violet-200/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        />
      </div>

      <p className="mt-3 text-xs text-violet-200/70" role="status">
        {needle ? `“${query.trim()}” 검색 결과 ${totalCount}개` : `전체 ${totalCount}개 운세`}
      </p>

      {needle && totalCount === 0 ? (
        <p className="mt-8 rounded-2xl border border-violet-300/20 bg-violet-950/30 p-6 text-center text-sm text-violet-100/80">
          검색 결과가 없습니다. 다른 이름으로 찾아보세요.
        </p>
      ) : null}

      <div className="mt-6 space-y-8">
        {pinnedGroups.map((group) => (
          <section key={group.id} aria-labelledby={`fortune-group-${group.id}`}>
            <h2 id={`fortune-group-${group.id}`} className="mb-3 text-base font-bold text-amber-100">
              {group.title}
            </h2>
            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((entry) => renderCard(entry, group.id))}
            </ul>
          </section>
        ))}

        {filteredSections.map((section) => (
          <section key={section.id} aria-labelledby={`fortune-section-${section.id}`}>
            <h2 id={`fortune-section-${section.id}`} className="mb-3 text-base font-bold text-violet-100">
              {section.title}
            </h2>
            <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((entry) => renderCard(entry, section.id))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
