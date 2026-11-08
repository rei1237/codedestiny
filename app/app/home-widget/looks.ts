export function lookName(id: string, locale: string) {
  const looks: Record<string, [string, string]> = {
    "yeoni-hanbok": ["연꽃 한복", "Lotus hanbok"],
    "yeoni-moon": ["달의 예복", "Moon gown"],
    "yeoni-tea": ["찻집 비단옷", "Teahouse silk"],
    "yeoni-pig-moon": ["달빛 연꽃을 든 꽃돼지", "Moonlit lotus piglet"],
  };
  return looks[id]?.[locale === "ko" ? 0 : 1] ?? id;
}
