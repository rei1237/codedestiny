import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '핀란드 주석점 | 꿀꿀 만세력',
  description: '마법의 주석으로 미래를 알아보는 핀란드 전통 점술. 부의 운, 연애운, 행운을 만나보세요.',
  keywords: '주석점, 핀란드 점술, 운세, 타로, 점, 미래',
  openGraph: {
    title: '핀란드 주석점 - 신비로운 운명의 이야기',
    description: '마법의 주석으로 미래를 알아보는 핀란드 전통 점술',
    url: 'https://code-destiny.com/oracle/sikojen-povailu',
    siteName: '꿀꿀 만세력',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://code-destiny.com/oracle/sikojen-povailu',
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
