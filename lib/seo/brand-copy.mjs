// Korean entry pages share keyed copy with the static shell generator.
// Other locale entry pages retain their own translated metadata.
const translations = {
  ko: {
    name: '꿀꿀운세',
    ggulggulTitle: '꿀꿀운세 코드데스티니 | 연이·네오와 상담',
    ggulggulDescription: '관계와 선택이 고민될 때 꿀꿀운세에서 상담을 시작해보세요. 연이의 다정한 해석과 네오의 현실적인 조언으로 다음 행동을 정리해요.',
    yeongnyangiTitle: '영냥이 사주·타로 | 꿀꿀운세 코드데스티니',
    yeongnyangiDescription: '꿀꿀운세의 사주보는 고양이 영냥이에게 고민을 들려주세요. 코드데스티니의 사주·타로 상담에서 관계와 일상의 흐름을 살피고, 나에게 맞는 행동 조언을 만나보세요.',
    yeongnyangiHeading: '꿀꿀운세의 사주보는 고양이',
    yeongnyangiLead: '영냥이는 꿀꿀운세 코드데스티니의 운세 상담 서비스예요. 사주·별·카드로 지금의 고민과 해볼 선택을 함께 읽어요.',
    brandHeading: '꿀꿀운세 코드데스티니 서비스 안내',
    brandLead: '꿀꿀 운세(꿀꿀운세)는 코드데스티니(Code Destiny)의 운세·상담 서비스이며, 공식 웹사이트는 code-destiny.com입니다. 연이·네오와 상담하는 꿀꿀 운세 홈과 사주보는 고양이 영냥이를 이 사이트에서 만날 수 있습니다. 공개 운세 도구와 유료 상담은 각 페이지에서 구분해 안내합니다.',
    officialSiteQuestion: '꿀꿀 운세 공식 사이트와 영냥이 입구는 어디인가요?',
    officialSiteAnswer: '공식 웹사이트는 https://code-destiny.com/입니다. 꿀꿀 운세 홈은 https://code-destiny.com/ggulggul/, 사주보는 고양이 영냥이는 https://code-destiny.com/yeongnyangi/에서 이용합니다. 꿀꿀 운세와 꿀꿀운세는 띄어쓰기만 다른 같은 브랜드이며, 두 상담 입구 모두 코드데스티니가 제공합니다.',
    systemsScope: '사주·만세력·타로·궁합·자미두수·숙요점·베다점·점성술·꿈해몽을 제공합니다. 입력 조건과 공개 도구·유료 AI 상담의 범위는 각 기능 안내에서 확인할 수 있습니다.',
    aliases: '꿀꿀운세와 꿀꿀 운세는 같은 서비스입니다. 꿀꿀만세력·꽃돼지 운세는 이 서비스의 다른 이름이며, 코드데스티니(Code Destiny)는 플랫폼 이름입니다. 사주보는 고양이 영냥이도 같은 플랫폼에서 제공하는 상담 서비스입니다.',
    ggulggulLink: '꿀꿀운세 연이·네오 상담',
    yeongnyangiLink: '꿀꿀운세 영냥이 사주·타로',
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
