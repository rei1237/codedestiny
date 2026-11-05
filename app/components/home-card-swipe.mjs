/** 수직 스크롤과 작은 움직임은 무시하고 인접 장면만 선택한다. */
export function nextCardPageIndex(index, count, dx, dy) {
  if (count < 1 || Math.abs(dx) < 55 || Math.abs(dx) <= Math.abs(dy) * 1.3) return index;
  return Math.max(0, Math.min(count - 1, index + (dx < 0 ? 1 : -1)));
}
