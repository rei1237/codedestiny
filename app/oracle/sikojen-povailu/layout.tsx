import { Metadata } from 'next';

const SIKOJEN_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: '핀란드 주석점 | 꿀꿀 만세력',
    description: '마법의 주석으로 미래를 알아보는 핀란드 전통 점술. 부의 운, 연애운, 행운을 만나보세요.',
    keywords: '주석점, 핀란드 점술, 운세, 타로, 점, 미래',
    ogTitle: '핀란드 주석점 - 신비로운 운명의 이야기',
    ogDescription: '마법의 주석으로 미래를 알아보는 핀란드 전통 점술',
    siteName: '꿀꿀 운세',
  },
  en: {
    title: 'Finnish Tin Oracle | Code Destiny',
    description: 'A traditional Finnish divination ritual that reads the future through magical tin. Meet the flow of wealth, love, and luck.',
    keywords: 'tin oracle, Finnish divination, fortune, tarot, oracle, future',
    ogTitle: 'Finnish Tin Oracle - A Mystical Destiny Story',
    ogDescription: 'Traditional Finnish divination that reads the future through magical tin',
    siteName: 'Code Destiny',
  },
  ja: {
    title: 'フィンランド錫占い | Code Destiny',
    description: '魔法の錫で未来を読み解くフィンランド伝統の占い。金運、恋愛運、幸運の流れを受け取ってください。',
    keywords: '錫占い, フィンランド占い, 運勢, タロット, 占い, 未来',
    ogTitle: 'フィンランド錫占い - 神秘的な運命の物語',
    ogDescription: '魔法の錫で未来を読み解くフィンランド伝統の占い',
    siteName: 'Code Destiny',
  },
};

const sikojenLayoutCopy = SIKOJEN_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: sikojenLayoutCopy.title,
  description: sikojenLayoutCopy.description,
  keywords: sikojenLayoutCopy.keywords,
  openGraph: {
    title: sikojenLayoutCopy.ogTitle,
    description: sikojenLayoutCopy.ogDescription,
    url: 'https://code-destiny.com/oracle/sikojen-povailu',
    siteName: sikojenLayoutCopy.siteName,
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
