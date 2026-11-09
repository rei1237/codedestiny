import EntryWebtoon from "../_entry/EntryWebtoon";

export const metadata = {
  title: "달빛 예화 진입 웹툰 | 꿀꿀 운세",
  description: "달빛 예화 웹툰을 읽고 내 고민에 맞는 운세로 이어가세요.",
  alternates: { canonical: "/entry-webtoon/" },
};
export default function EntryWebtoonPage() {
  return <main><EntryWebtoon /></main>;
}
