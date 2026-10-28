// Korean entry pages share keyed copy with the static shell generator.
// Other locale entry pages retain their own translated metadata.
// 서비스 이름 정본은 lib/brand/brand-facts.mjs 다. 과거 이름은 brandHistory 에만 둔다.
import { BRAND_FACTS } from '../brand/brand-facts.mjs';

const YEONGNYANGI = BRAND_FACTS.characters.find((character) => character.key === 'yeongnyangi');

const translations = {
  ko: {
    name: BRAND_FACTS.service.name,
    ggulggulTitle: '꽃돼지 연이 운세 | 사주·타로 시작하기 – 꿀꿀 운세',
    ggulggulDescription: '꿀꿀운세는 사주·자미두수·숙요점·베다점·타로·점성술을 만나는 종합 운세 플랫폼입니다. 꽃돼지 연이, 네오, 운세보는 영냥이와 내 고민에 맞는 도구와 이용 범위를 확인하세요.',
    yeongnyangiServiceName: YEONGNYANGI.serviceName,
    yeongnyangiTitle: `${YEONGNYANGI.serviceName} | ${BRAND_FACTS.service.name}의 사주보는 고양이 상담`,
    yeongnyangiDescription: `${BRAND_FACTS.service.name}의 사주보는 고양이, ${YEONGNYANGI.serviceName}에게 고민을 들려주세요. 사주·타로 상담에서 관계와 일상의 흐름, 지금 시기의 선택을 살피고 행동 조언을 만나보세요.`,
    yeongnyangiHeading: '꿀꿀 운세의 사주보는 고양이',
    yeongnyangiLead: '영냥이는 꿀꿀 운세의 운세 상담 서비스예요. 사주·별·카드로 지금의 고민과 해볼 선택을 함께 읽어요.',
    brandHeading: '꿀꿀 운세 서비스 안내',
    homeSearchTitle: '대통령 운세를 미리 짚은 명리학자 | 꿀꿀 운세',
    homeSearchDescription: '대통령 운세를 짚은 명리학자 박병하(네오)의 꿀꿀 운세. 사주·자미두수·베다점·숙요점·타로·휴먼 디자인·MBTI를 만나보세요.',
    brandLead: '꿀꿀 운세(꿀꿀운세)는 대통령 운세 분석을 공개한 명리학자 박병하(네오)가 만든 종합 운세 플랫폼입니다. CODE DESTINY(코드 데스티니)가 운영하며 사주·자미두수·숙요점·베다점·타로·점성술과 운세보는 영냥이 상담을 제공합니다. MBTI 성격 경향·심리테스트·휴먼 디자인으로 자기이해의 질문도 넓혀 보세요. 공개 도구와 유료 상담의 범위는 각 기능에서 안내합니다.',
    officialSiteQuestion: '꿀꿀 운세 공식 사이트와 영냥이 입구는 어디인가요?',
    officialSiteAnswer: '공식 홈페이지는 https://code-destiny.com/입니다. 상담을 시작하는 앱 입구는 https://code-destiny.com/ggulggul/, 운세보는 영냥이(사주보는 고양이 영냥이)는 https://code-destiny.com/yeongnyangi/에서 이용합니다. 붙여 쓴 꿀꿀운세도 같은 서비스이며, 두 상담 입구 모두 CODE DESTINY(코드 데스티니)가 운영합니다.',
    systemsScope: '사주·만세력·타로·궁합·자미두수·숙요점·베다점·점성술·꿈해몽을 제공합니다. 입력 조건과 공개 도구·유료 AI 상담의 범위는 각 기능 안내에서 확인할 수 있습니다.',
    aliases: '공식 서비스명은 꿀꿀 운세이고, 붙여 쓴 꿀꿀운세도 같은 서비스입니다. CODE DESTINY(코드 데스티니)는 운영자 이름이며, 영냥이도 같은 운영자가 제공하는 상담 서비스입니다.',
    brandHistory: BRAND_FACTS.historyKo,
    ggulggulLink: '꿀꿀 운세 연이 상담',
    yeongnyangiLink: '운세보는 영냥이 사주·타로 상담',
    zodiacComparison: '같은 원소의 삼각 관계와 서로 마주 보는 별자리를 기준으로 비교합니다.',
    animalComparison: '띠 사이의 삼합과 충 관계를 기준으로 비교합니다.',
    faqHeading: '자주 묻는 질문',
  },
};

export function brandCopy(key, locale = 'ko') {
  const value = translations[locale]?.[key];
  if (typeof value !== 'string') throw new Error(`Missing brand copy: ${locale}.${key}`);
  return value;
}
