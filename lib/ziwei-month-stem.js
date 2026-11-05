/** 오호둔 음력 월간. 윤달은 본달의 천간을 따른다. */
export function lunarMonthStemIndex(lunarYear, lunarMonth) {
  const yearStem = (((lunarYear - 4) % 10) + 10) % 10;
  return (((yearStem % 5) * 2 + 2) + lunarMonth - 1) % 10;
}
