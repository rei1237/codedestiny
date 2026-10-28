import ArchiveMethodology from "./ArchiveMethodology";
import PublicRecordLink from '../../components/PublicRecordLink';
import Image from "next/image";
import FamousArchive from "./FamousArchive";
import { getFamousArchive } from "../../../lib/famous-saju/archive";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { INSIGHT_DISCOVERY_COPY } from "../discovery-copy.mjs";

const INSIGHTS_FAMOUS_SAJU_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    metadataTitle: INSIGHT_DISCOVERY_COPY.ko.famousTitle,
    metadataDescription: INSIGHT_DISCOVERY_COPY.ko.famousDescription,
    keywords: ["유명인 사주", "연예인 사주", "이순신 사주", "아이유 사주", "BTS RM 사주", "운세 인사이트"],
    hubLink: "운세 인사이트 허브",
    kicker: "Famous Saju Insights",
    title: "유명인 사주 분석",
    intro: "출생 시간이 확인된 경우 시주까지, 그렇지 않은 경우 연주·월주·일주 중심으로 유명인의 명식 흐름을 조심스럽게 정리했습니다.",
    searchLabel: "유명인 사주 검색",
    searchPlaceholder: "이름, 분야, 태그 검색",
    articleCountSuffix: "개 글",
  },
  en: {
    metadataTitle: "Famous Saju Analysis | Fortune Insights Hub",
    metadataDescription: "An archive of story-style Saju insights for public figures, based on public birth data and Code Destiny chart standards.",
    keywords: ["famous Saju", "celebrity Saju", "Yi Sun-sin Saju", "IU Saju", "BTS RM Saju", "fortune insights"],
    hubLink: "Fortune Insights Hub",
    kicker: "Famous Saju Insights",
    title: "Famous Saju Analysis",
    intro: "When birth time is confirmed, we include the hour pillar; otherwise, each public figure is read carefully through the year, month, and day pillars.",
    searchLabel: "Search famous Saju",
    searchPlaceholder: "Search name, field, or tag",
    articleCountSuffix: " articles",
  },
  ja: {
    metadataTitle: "有名人の四柱推命分析 | 運勢インサイトハブ",
    metadataDescription: "公開生年月日とCode Destinyの命式基準をもとに、有名人の日干、五行、三柱の流れを物語型の四柱推命インサイトとして整理したアーカイブです。",
    keywords: ["有名人 四柱推命", "芸能人 四柱推命", "李舜臣 四柱推命", "IU 四柱推命", "BTS RM 四柱推命", "運勢インサイト"],
    hubLink: "運勢インサイトハブ",
    kicker: "Famous Saju Insights",
    title: "有名人の四柱推命分析",
    intro: "出生時刻が確認できる場合は時柱まで、そうでない場合は年柱・月柱・日柱を中心に、有名人の命式の流れを慎重に整理しました。",
    searchLabel: "有名人の四柱推命を検索",
    searchPlaceholder: "名前、分野、タグを検索",
    articleCountSuffix: "件の記事",
  },
} as const;

const famousSajuInsightCopy = INSIGHTS_FAMOUS_SAJU_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = generatePageMetadata({
  path: "/insights/famous-saju",
  title: famousSajuInsightCopy.metadataTitle,
  description: famousSajuInsightCopy.metadataDescription,
  keywords: famousSajuInsightCopy.keywords,
});

export default function FamousSajuInsightIndexPage() {
  const people = getFamousArchive();
  return <main className="moon-library"><div className="moon-container">
    <header className="moon-hero"><div><a href="/ggulggul/">꿀꿀운세</a><h1>연예인·인물 사주</h1><p>스타의 재능부터 위인의 삶까지</p></div><Image src="/images/feature-details/famous-saju-hero-v2.webp" width={640} height={420} alt="" priority /></header>
    <FamousArchive people={people} /><ArchiveMethodology />
    <details className="moon-method"><summary>출생 자료와 해석 기준</summary><p>공개 출생일과 기존 계산 엔진을 사용합니다. 출처·역법·시간대가 불확실한 인물은 일주별 확정 목록에서 제외합니다. 같은 일주도 월지·계절·다른 기둥과 삶의 환경에 따라 다르게 읽습니다.</p><a href="/methodology/">계산·편집 방법론 읽기</a><PublicRecordLink /></details>
    <section className="moon-method"><h2>검수 원고 읽기</h2><p>기존 원고와 상세 URL을 그대로 보존합니다.</p><div className="moon-chips">{people.filter(p=>p.reviewed).map(p=><a key={p.slug} href={'/insights/famous-saju/'+p.slug+'/'}>{p.name} 사주</a>)}</div></section>
    <section className="moon-method"><h2>새로 공개한 인물 사주 · {people.filter(p=>p.publicationApproved).length}편</h2><p>유튜버의 대화, 배우의 배역, 가수의 무대와 선수의 경기. 공개 이력을 서로 다른 질문으로 읽습니다.</p><div className="moon-chips">{people.filter(p=>p.publicationApproved).map(p=><a key={p.slug} href={`/insights/famous-saju/${p.slug}/`}>{p.name} 사주</a>)}</div></section>
    <details className="moon-method"><summary>분야별 전체 인물 찾아보기 · {people.length}명</summary>
      <p>본명·활동명·채널명으로 검색하거나 아래 이름에서 상세 자료를 읽어 보세요. 검수 전 자료는 편집 초안으로 구분합니다.</p>
      {[...new Set(people.flatMap(p=>p.fields))].sort().map(field=><section key={field}><h2>{field}</h2><ul className="moon-chips">{people.filter(p=>p.fields.includes(field)).map(p=><li key={p.slug}><a href={`/insights/famous-saju/${p.slug}/`}>{p.name}</a></li>)}</ul></section>)}
    </details>
  </div></main>;
}
