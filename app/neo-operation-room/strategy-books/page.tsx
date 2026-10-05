import type { Metadata } from 'next';
import NeoStrategyBooksPage from '@/src/features/neo-war-room/NeoStrategyBooksPage';

export const metadata: Metadata = { title: '나의 전략서 | 네오 팩폭 전략실', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() { return <NeoStrategyBooksPage />; }
