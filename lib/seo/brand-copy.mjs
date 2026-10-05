// Korean entry pages share keyed copy with the static shell generator.
// Other locale entry pages retain their own translated metadata.
const translations = {
  ko: {
    name: '꿀꿀운세',
    ggulggulTitle: '꿀꿀운세 코드데스티니 | 연이·네오와 상담',
    ggulggulDescription: '관계의 흐름이 궁금할 때, 지금의 선택을 정리하고 싶을 때 꿀꿀운세에서 상담을 시작해보세요. 연이의 다정한 해석과 네오의 현실적인 조언 가운데 내 고민에 맞는 방식을 골라보세요.',
    yeongnyangiTitle: '영냥이 사주·타로 | 꿀꿀운세 코드데스티니',
    yeongnyangiDescription: '사주보는 고양이 영냥이에게 지금 가장 궁금한 고민을 들려주세요. 코드데스티니의 사주·타로 상담에서 관계와 일상의 흐름을 살피고, 나의 상황에 맞는 해석과 행동 조언을 만나보세요.',
    yeongnyangiHeading: '꿀꿀운세의 사주보는 고양이',
    yeongnyangiLead: '영냥이는 꿀꿀운세 코드데스티니의 운세 상담 서비스예요. 사주·별·카드로 지금의 고민과 해볼 선택을 함께 읽어요.',
    brandHeading: '꿀꿀운세 코드데스티니 서비스 안내',
    brandLead: '꿀꿀운세는 코드데스티니(Code Destiny)의 운세·상담 서비스입니다. 연이·네오와 상담하는 꿀꿀운세 홈, 사주보는 고양이 영냥이 중 원하는 입구를 선택하세요. 공개 운세 도구와 유료 상담은 각 페이지에서 구분해 안내합니다.',
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
