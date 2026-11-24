import type {ReactNode} from 'react';

// lang=ko 에서 크롬은 가운뎃점(·) 뒤를 줄바꿈 지점으로 본다 — word-break:keep-all 로도 막히지 않는다.
// '일·돈·관계에서'·'자미두수·점성술' 같은 묶음 낱말을 줄바꿈 없는 덩어리로 묶는다.
// 긴 묶음은 MAX_CHUNK 글자 안쪽 덩어리로 나눠, 320px 카드(약 170px)에서도 넘치지 않고 덩어리 사이 가운뎃점 뒤에서만 접힌다.
const DOT_RUN = /[^\s·]+(?:·[^\s·]+)+/g;
const MAX_CHUNK = 10;

function chunkRun(run: string): string[] {
  const segments = run.split('·').map((part, i, all) => (i < all.length - 1 ? `${part}·` : part));
  const chunks: string[] = [];
  for (const segment of segments) {
    const last = chunks.length - 1;
    if (last >= 0 && chunks[last].length + segment.length <= MAX_CHUNK) chunks[last] += segment;
    else chunks.push(segment);
  }
  return chunks;
}

export function keepDotRuns(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(DOT_RUN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    let offset = start;
    for (const chunk of chunkRun(match[0])) {
      // 안쪽 가운뎃점이 없는 덩어리(끝 점만 있거나 낱말 하나)는 묶을 필요가 없다.
      parts.push(chunk.slice(0, -1).includes('·') ? <span key={offset} style={{whiteSpace: 'nowrap'}}>{chunk}</span> : chunk);
      offset += chunk.length;
    }
    last = start + match[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
