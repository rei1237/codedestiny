import EntryWebtoon from "../_entry/EntryWebtoon";
import { SERVICE_GUIDE_LABEL } from '@/lib/brand/service-guide-webtoon.mjs';

const title = `${SERVICE_GUIDE_LABEL} | 꿀꿀 운세`;
const description = "사주·오늘의 운세·타로부터 대표 상담과 전문가 상담까지, 연이와 네오의 이야기로 알아보세요. 각 서비스의 해석 방식과 이용 순서를 읽고 내 고민에 맞는 상담을 고를 수 있어요.";
export const metadata = {
  title, description,
  openGraph: { title, description, url: "/entry-webtoon/", images: ["/images/entry-webtoon/imagine-desk-720.webp"] },
  alternates: { canonical: "/entry-webtoon/" },
};
export default function EntryWebtoonPage() {
  return <main><EntryWebtoon /></main>;
}
