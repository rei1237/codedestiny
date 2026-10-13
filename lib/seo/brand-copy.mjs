// Korean entry pages share keyed copy with the static shell generator.
// Other locale entry pages retain their own translated metadata.
const translations = {
  ko: {
    name: '꿀꿀 운세',
    ggulggulTitle: '꿀꿀 운세 — 사주·궁합·타로',
    ggulggulDescription: '꿀꿀 운세에서 사주풀이와 궁합, 타로, 자미두수, 숙요점을 만나보세요. 고양이 영냥이와 꽃돼지 연이가 내 성향과 지금의 고민을 살펴보는 길을 안내합니다.',
    yeongnyangiTitle: '영냥이 사주 상담 — 내 고민과 시기를 함께 보는 운세',
    yeongnyangiDescription: '꿀꿀 운세의 사주보는 고양이 영냥이에게 고민을 들려주세요. 사주·타로 상담에서 관계와 일상의 흐름, 지금 시기의 선택을 함께 살피고 행동 조언을 만나보세요.',
    yeongnyangiHeading: '꿀꿀 운세의 사주보는 고양이',
    yeongnyangiLead: '영냥이는 꿀꿀 운세의 운세 상담 서비스예요. 사주·별·카드로 지금의 고민과 해볼 선택을 함께 읽어요.',
    brandHeading: '꿀꿀 운세 서비스 안내',
    brandLead: '꿀꿀 운세는 코드데스티니(CODE DESTINY)가 제공하는 사주·운세 상담 서비스입니다. 공식 웹사이트 code-destiny.com에서 사주와 타로, 오늘의 운세를 살펴보고 연이·네오·영냥이와 고민을 정리할 수 있습니다. 공개 운세 도구와 유료 상담의 범위는 각 기능에서 안내합니다.',
    officialSiteQuestion: '꿀꿀 운세 공식 사이트와 영냥이 입구는 어디인가요?',
    officialSiteAnswer: '공식 웹사이트는 https://code-destiny.com/입니다. 꿀꿀 운세 홈은 https://code-destiny.com/ggulggul/, 사주보는 고양이 영냥이는 https://code-destiny.com/yeongnyangi/에서 이용합니다. 꿀꿀 운세와 꿀꿀운세는 띄어쓰기만 다른 같은 브랜드이며, 두 상담 입구 모두 코드데스티니가 제공합니다.',
    systemsScope: '사주·만세력·타로·궁합·자미두수·숙요점·베다점·점성술·꿈해몽을 제공합니다. 입력 조건과 공개 도구·유료 AI 상담의 범위는 각 기능 안내에서 확인할 수 있습니다.',
    aliases: '꿀꿀 운세와 꿀꿀운세는 띄어쓰기만 다른 같은 서비스입니다. 한때 사용한 꿀꿀 사주·꿀꿀사주와 꿀꿀만세력도 이 서비스를 가리킵니다. 코드데스티니(CODE DESTINY)는 운영 플랫폼 이름이며, 영냥이도 같은 플랫폼에서 제공하는 상담 서비스입니다.',
    ggulggulLink: '꿀꿀 운세 연이 상담',
    yeongnyangiLink: '꿀꿀 운세 영냥이 사주·타로',
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
