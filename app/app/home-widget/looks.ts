export function lookName(id: string, locale: string) {
  const looks: Record<string, [string, string]> = {
    "pig-gold-seed": ["재물 · 복주머니의 새싹", "Wealth · Golden seedling"],
    "pig-camellias": ["연애 · 나란히 핀 동백", "Love · Twin camellias"],
    "pig-reunion-knot": ["재회 · 다시 잇는 매듭", "Reunion · The coral knot"],
    "pig-moon-tea": ["찻잔에 뜬 달", "Moon in a teacup"],
    "cat-star-chart": ["별을 읽는 영냥이", "Reading the star chart"],
    "yeoni-hanbok": ["연꽃 한복", "Lotus hanbok"],
    "yeoni-moon": ["달의 예복", "Moon gown"],
    "yeoni-tea": ["찻집 비단옷", "Teahouse silk"],
    "yeoni-pig-moon": ["달빛 연꽃을 든 꽃돼지", "Moonlit lotus piglet"],
  };
  return looks[id]?.[locale === "ko" ? 0 : 1] ?? id;
}
