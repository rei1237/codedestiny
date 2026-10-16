// 모든 푸터의 한 규격(2026-10-16 "푸터가 너무 복잡하다"): 한 줄 소개 → 정책 링크 다섯 개 → 사업자 정보 → 안내 한 줄.
// 사업자 값은 lib/site-policy-config.js 의 BUSINESS_IDENTITY 에서 읽는다(손으로 다시 적지 않는다).
// 정적 셸 index.html 의 푸터는 같은 문구를 인라인으로 쓴다. trans 는 public/i18n/*.json 의 키다(셸과 공유).
import { founder } from './founder';

export const FOOTER_BYLINE = founder.byline;

// 개인정보처리방침은 다른 링크와 구별되게 굵게 보인다(개인정보 보호법 표시 기준).
export const FOOTER_LINKS = [
  { href: '/terms/', text: '이용약관', trans: 'footer.links.terms' },
  { href: '/privacy/', text: '개인정보처리방침', trans: 'footer.links.privacy', strong: true },
  { href: '/refund-policy/', text: '환불정책', trans: 'footer.links.refund' },
  { href: '/contact/', text: '문의', trans: 'footer.links.contact' },
  { href: '/about/', text: '운영자 소개', trans: 'footer.links.operator' },
] as const;

// 사이트 공용 푸터(정적 셸·SiteFooterHub·LocaleFooterHub)의 작은 둘째 줄. 정적 셸과 루트 `/`(dist/index.html)
// 모두 scripts/verify-adsense-readiness.mjs 의 신뢰 링크 검사가 요구한다.
export const FOOTER_TRUST_LINKS = [
  { href: '/faq/', text: '자주 묻는 질문', trans: 'footer.links.faq' },
  { href: '/disclaimer/', text: '면책 고지', trans: 'footer.links.disclaimer' },
  { href: '/editorial-policy/', text: '편집 원칙', trans: 'footer.links.editorial' },
  { href: '/advertising-policy/', text: '광고 정책', trans: 'footer.links.advertising' },
] as const;

export const FOOTER_NOTICE = '분석은 명리학 이론에 근거한 해석이며, 의료·법률·투자 등 중요한 결정은 해당 분야 전문가와 함께 판단하시기 바랍니다.';
