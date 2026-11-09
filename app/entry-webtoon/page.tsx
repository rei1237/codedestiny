import EntryWebtoon from "../_entry/EntryWebtoon";

const title = "달빛 예화 진입 웹툰 | 꿀꿀 운세";
const description = "영냥이와 꽃돼지 연이가 안내하는 달빛 예화 웹툰을 읽어 보세요. 공개된 운세 분석 기록을 살펴보고 연애·일·재물 중 내 고민을 골라 무료 만세력으로 이어갈 수 있어요.";
export const metadata = {
  title, description,
  openGraph: { title, description, url: "/entry-webtoon/", images: ["/images/entry-webtoon/imagine-desk-720.webp"] },
  alternates: { canonical: "/entry-webtoon/" },
};
export default function EntryWebtoonPage() {
  return <main><EntryWebtoon /></main>;
}
