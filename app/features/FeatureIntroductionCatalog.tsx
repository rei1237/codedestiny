"use client";

import { useMemo, useState } from "react";

type CatalogItem = {
  slug: string;
  title: string;
  description?: string;
  category?: string;
  image?: string;
};

const CATEGORY_ORDER = [
  "사주·심층 상담",
  "관계·궁합",
  "타로·신탁",
  "별자리·동양 점성",
  "오늘·시기",
  "상징·마음",
  "휴식·콘텐츠",
];

export default function FeatureIntroductionCatalog({ items }: { items: CatalogItem[] }) {
  const [category, setCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const categories = CATEGORY_ORDER.filter(value => items.some(item => item.category === value));
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ko");
    return items.filter(item => {
      const categoryMatches = category === "전체" || item.category === category;
      const textMatches = !needle || `${item.title} ${item.description || ""}`.toLocaleLowerCase("ko").includes(needle);
      return categoryMatches && textMatches;
    });
  }, [category, items, query]);

  return <>
    <div className="featureCatalogTools">
      <label htmlFor="feature-catalog-search">기능 이름이나 고민으로 찾기</label>
      <input
        id="feature-catalog-search"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="예: 재회, 사주, 오늘의 운세"
        autoComplete="off"
      />
      <div className="featureCatalogFilters" role="group" aria-label="기능 분야">
        {["전체", ...categories].map(value => <button
          key={value}
          type="button"
          aria-pressed={category === value}
          onClick={() => setCategory(value)}
        >{value}</button>)}
      </div>
    </div>
    <p className="featureCatalogCount" role="status">{filtered.length}개 소개</p>
    {filtered.length ? <ul className="featureCatalogList">
      {filtered.map(item => <li key={item.slug}>
        <a href={`/features/${item.slug}/`}>
          <div className="featureCatalogCopy">
            <span>{item.category || "기능 소개"}</span>
            <h2>{item.title}</h2>
            {item.description ? <p>{item.description}</p> : null}
            <strong>내용과 이용 방법 보기</strong>
          </div>
          {item.image ? <img src={item.image} width="160" height="100" alt="" loading="lazy" decoding="async" /> : null}
        </a>
      </li>)}
    </ul> : <div className="featureCatalogEmpty">
      <h2>찾는 소개가 없어요.</h2>
      <p>검색어를 줄이거나 다른 분야를 선택해 주세요.</p>
      <button type="button" onClick={() => { setQuery(""); setCategory("전체"); }}>전체 기능 보기</button>
    </div>}
  </>;
}
