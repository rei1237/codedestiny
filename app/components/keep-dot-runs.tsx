import type {ReactNode} from 'react';

// lang=ko 에서 크롬은 가운뎃점(·) 뒤를 줄바꿈 지점으로 본다 — word-break:keep-all 로도 막히지 않는다.
// '일·돈·관계에서'·'자미두수·점성술' 같은 묶음 낱말이 줄 끝에서 갈라지지 않게 한 덩어리로 묶는다.
const DOT_RUN = /[^\s·]+(?:·[^\s·]+)+/g;

export function keepDotRuns(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(DOT_RUN)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(<span key={start} style={{whiteSpace: 'nowrap'}}>{match[0]}</span>);
    last = start + match[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
