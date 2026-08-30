// 검증기들이 공유하는 텍스트 중복도 도구.
// verify-editor-notes.mjs 에 있던 것을 verify-famous-saju-editorial.mjs 도 쓰게 되어 여기로 뺐다.
// 두 검증기가 같은 임계(8-gram Jaccard)를 각자 복사해 갖고 있으면 한쪽만 고쳐져 기준이 갈린다.

export const DEFAULT_SHINGLE_SIZE = 8;

/** 공백으로 나눈 단어 n-gram 집합. */
export function shingles(text, size = DEFAULT_SHINGLE_SIZE) {
  const words = String(text || "").split(" ");
  const set = new Set();
  for (let i = 0; i + size <= words.length; i += 1) {
    set.add(words.slice(i, i + size).join(" "));
  }
  return set;
}

export function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / (a.size + b.size - shared);
}
