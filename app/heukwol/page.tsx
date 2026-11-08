import type { Metadata } from 'next';
import HeukwolClient from './HeukwolClient';
import { pageOpenGraph } from '@/lib/seo/page-open-graph';
const PAGE_URL='https://code-destiny.com/heukwol/';
export const metadata:Metadata={title:'흑월의 경고 — 월별 주의 흐름과 대응 상담',description:'사주와 자미두수로 타고난 성향과 선택 연도의 월별 주의 흐름을 살피고, 연이와 네오의 해석·대응 조언을 약 5만 자 리포트와 PDF로 받아보세요.',alternates:{canonical:PAGE_URL},openGraph:pageOpenGraph(PAGE_URL)};
export default function HeukwolPage(){return <HeukwolClient/>;}
