// Korean policy URLs keep their canonical addresses and existing aliases.
export const STATIC_POLICY_ROUTES = [
  { key: 'terms', source: 'terms-of-service', canonical: '/terms', aliases: ['/terms-of-service'], label: '이용약관' },
  { key: 'privacy', source: 'privacy-policy', canonical: '/privacy', aliases: ['/privacy-policy'], label: '개인정보처리방침' },
  { key: 'refund', source: 'refund-policy', canonical: '/refund-policy', aliases: [], label: '환불·취소' },
  { key: 'contact', source: 'contact-us', canonical: '/contact', aliases: ['/contact-us'], label: '고객센터' },
  { key: 'about', source: 'about', canonical: '/about', aliases: [], label: '서비스 소개' },
  { key: 'faq', source: 'faq', canonical: '/faq', aliases: [], label: 'FAQ' },
];

export const policyStaticPath = (route) => `/static/policies/${route.key}/index.html`;
export const isStaticPolicyPath = (pathname) => typeof pathname === 'string'
  && STATIC_POLICY_ROUTES.some((route) => [route.canonical, ...route.aliases].includes(pathname.replace(/\/$/, '')));
export const staticPolicyRewrites = () => STATIC_POLICY_ROUTES.flatMap((route) =>
  [route.canonical, ...route.aliases].map((source) => ({ source, destination: policyStaticPath(route) })));
