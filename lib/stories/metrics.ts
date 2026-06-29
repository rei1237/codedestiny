export function formatStoryCount(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`;
  return value.toLocaleString("ko-KR");
}

export function estimateReadingMinutes(length: number) {
  return Math.max(1, Math.ceil(length / 420));
}
