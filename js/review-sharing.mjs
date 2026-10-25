// Shared by the submission API and review composer. Never fetch submitted URLs.
export const REVIEW_SOCIAL_CHANNELS = Object.freeze([
  { id: 'naver_blog', label: '네이버 블로그', home: 'https://blog.naver.com/' },
  { id: 'threads', label: '스레드', home: 'https://www.threads.com/' },
  { id: 'instagram', label: '인스타그램', home: 'https://www.instagram.com/' },
  { id: 'daum_cafe', label: '다음 카페', home: 'https://cafe.daum.net/' },
  { id: 'naver_cafe', label: '네이버 카페', home: 'https://cafe.naver.com/' },
]);
const HOSTS = {
  naver_blog: ['blog.naver.com', 'm.blog.naver.com'],
  threads: ['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'],
  instagram: ['instagram.com', 'www.instagram.com'],
  daum_cafe: ['cafe.daum.net', 'm.cafe.daum.net'],
  naver_cafe: ['cafe.naver.com', 'm.cafe.naver.com'],
};
export const REVIEW_REWARD_DISCLOSURE = '이 후기는 꿀꿀 운세 후기 보상 이벤트 참여 글이며, 관리자 승인 후 월정석을 제공받을 수 있습니다.';

export function normalizeReviewSocialProof(platform, rawUrl) {
  if (!platform && !String(rawUrl || '').trim()) return { platform: '', url: '' };
  try {
    const url = new URL(String(rawUrl || '').trim());
    if (!HOSTS[platform]?.includes(url.hostname) || url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname === '/' || url.href.length > 2000) return null;
    url.hash = '';
    return { platform, url: url.href };
  } catch { return null; }
}

export function buildReviewShareText(body, productName = '') {
  return [REVIEW_REWARD_DISCLOSURE, productName ? `꿀꿀 운세 · ${productName} 이용 후기` : '꿀꿀 운세 이용 후기', String(body || '').trim(), 'https://code-destiny.com/'].filter(Boolean).join('\n\n');
}

export function reviewShareUrl(platform, text, title = '꿀꿀 운세 이용 후기') {
  const url = encodeURIComponent('https://code-destiny.com/');
  if (platform === 'naver_blog') return `https://blog.naver.com/openapi/share?url=${url}&title=${encodeURIComponent(title)}`;
  if (platform === 'naver_cafe') return `https://share.naver.com/web/shareView?url=${url}&title=${encodeURIComponent(title)}`;
  if (platform === 'threads') return `https://www.threads.com/intent/post?text=${encodeURIComponent(text)}`;
  return REVIEW_SOCIAL_CHANNELS.find((channel) => channel.id === platform)?.home || '';
}
