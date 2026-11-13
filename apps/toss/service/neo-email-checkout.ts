// The email consultation is a human-reviewed, web-only transaction. Its
// PortOne entry is excluded from every Toss package, including local previews.
export async function openNeoCheckout(): Promise<never> {
  throw Error('토스 이메일 상담은 판매 준비 중이에요.');
}
