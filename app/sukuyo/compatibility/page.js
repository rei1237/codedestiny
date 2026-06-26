import SeoLandingTemplate from "../../components/SeoLandingTemplate";
import { buildSeoMetadata } from "../../../lib/seo";
import { SEO_LANDING_PAGES } from "../../../lib/seo-landing-pages";

const base = SEO_LANDING_PAGES.sukuyo;

const SUKUYO_COMPATIBILITY_PAGE_COPY = {
  ko: {
    title: "숙요점 궁합 보기 · 영친·업태·안괴 관계 해석 | Code Destiny",
    h1: "숙요점 궁합으로 보는 두 사람의 관계 패턴",
    description:
      "숙요점 궁합, 숙요 궁합, 영친관계, 업태관계, 안괴관계 키워드를 중심으로 관계 패턴을 해석하는 전용 랜딩입니다.",
    keywords: ["숙요점 궁합", "숙요 궁합", "영친관계", "업태관계", "안괴관계"],
  },
  en: {
    title: "Sukuyo Compatibility Reading - Eishin, Gyotai, and Ankai Relationships | Code Destiny",
    h1: "Relationship patterns through Sukuyo compatibility",
    description:
      "A dedicated landing page for interpreting relationship patterns through Sukuyo compatibility, including Eishin, Gyotai, and Ankai relationship keywords.",
    keywords: ["Sukuyo compatibility", "Sukuyo relationship", "Eishin relationship", "Gyotai relationship", "Ankai relationship"],
  },
  ja: {
    title: "宿曜占星術の相性診断 · 栄親・業胎・安壊関係の解釈 | Code Destiny",
    h1: "宿曜相性で見る二人の関係パターン",
    description:
      "宿曜相性、栄親関係、業胎関係、安壊関係のキーワードを中心に、二人の関係パターンを読み解く専用ランディングです。",
    keywords: ["宿曜相性", "宿曜占星術", "栄親関係", "業胎関係", "安壊関係"],
  },
  zh: {
    title: "宿曜合盘解读 · 荣亲、业胎、安坏关系 | Code Destiny",
    h1: "用宿曜合盘看见两人的关系模式",
    description:
      "围绕宿曜合盘、荣亲关系、业胎关系、安坏关系等关键词解读关系模式的专用页面。",
    keywords: ["宿曜合盘", "宿曜关系", "荣亲关系", "业胎关系", "安坏关系"],
  },
};

const pageCopy = SUKUYO_COMPATIBILITY_PAGE_COPY.ko;

const page = {
  ...base,
  path: "/sukuyo/compatibility",
  ...pageCopy,
};

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

export default function SukuyoCompatibilityLandingPage() {
  return <SeoLandingTemplate page={page} />;
}
