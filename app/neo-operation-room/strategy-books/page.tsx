import type { Metadata } from 'next';
import NeoStrategyBooksPage from '@/src/features/neo-war-room/NeoStrategyBooksPage';

export const metadata: Metadata = {
  title: '나의 전략서 | 네오 팩폭 전략실',
  description: '완료한 네오 상담의 판단과 행동 조언을 모은 나의 전략서입니다. 발급한 본인만 열람할 수 있으며 검색에는 공개되지 않습니다.',
  alternates: { canonical: 'https://code-destiny.com/neo-operation-room/strategy-books/' },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
};
export default function Page() { return <NeoStrategyBooksPage />; }
