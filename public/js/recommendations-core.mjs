// Shared by Worker, React and legacy shells. No personal result objects or I/O.
export const PARTNER_ACCOUNT = 'AF7837486';
// Deliberate release lock: account/media approval is a separate, reviewed release.
export const RECOMMENDATIONS_RELEASED = false;
export const CATEGORIES = ['books', 'daily-life', 'pets', 'fandom'];
export const PRODUCT_KINDS = { books: ['book', 'journal', 'stationery'], 'daily-life': ['food', 'decaf-tea', 'bottle', 'lunchbox', 'timer', 'bookstand', 'rest-accessory'], pets: ['scratcher', 'toy', 'hideaway', 'brush', 'bowl', 'leash', 'harness', 'toilet-supply', 'pet-book'], fandom: ['album', 'binder', 'sleeve', 'collecting-accessory'] };
export const INTERESTS = ['reading', 'journaling', 'planning', 'meal-prep', 'hydration', 'rest', 'conversation', 'study', 'budgeting', 'play', 'grooming', 'walking', 'collecting', 'music'];
export const DEFAULT_SETTINGS = Object.freeze({ enabled: false, approved: false, mediaRegistered: false, disabledServices: [] });
export const VALID_DAYS = 30;
const DAY = 86400000;
const systems = ['saju', 'ziwei', 'sukuyo', 'vedic', 'astrology', 'tarot'];
export const SERVICE_MAP = {
  recommendations: { categories: CATEGORIES, topics: [] },
  'fortune-chat': { categories: ['books', 'daily-life'], topics: [] },
  'fortune-tea-house': { categories: ['books', 'daily-life'], topics: [] },
  'neo-operation-room-consultation': { categories: ['books', 'daily-life'], topics: ['planning'] },
  'fusion-fortune-consultation': { categories: ['books', 'daily-life'], topics: [] },
  'ziwei-ai-consultation': { categories: ['books'], topics: ['ziwei'] },
  'sukuyo-compatibility-ai': { categories: ['books'], topics: ['sukuyo', 'relationship'] },
  'vedic-ai-consultation': { categories: ['books'], topics: ['vedic'] },
  'astrology-ai-consultation': { categories: ['books'], topics: ['astrology'] },
  'love-secret-ai': { categories: ['books', 'daily-life'], topics: ['relationship'] },
  'master-love-codex': { categories: ['books', 'daily-life'], topics: ['relationship'] },
  'life-book-ai': { categories: ['books', 'daily-life'], topics: ['planning'] },
  'human-design-chart': { categories: ['books', 'daily-life'], topics: ['human-design'] },
  'human-design-report': { categories: ['books', 'daily-life'], topics: ['human-design'] },
  'pet-saju-ai-consultation': { categories: ['pets'], topics: [] },
  'pet-compatibility-ai': { categories: ['pets'], topics: [] },
  'destiny-bias': { categories: ['fandom'], topics: [] },
  rpt_healthReportCard: { categories: ['daily-life'], topics: [], explicitInterest: true },
  'legacy-saju': { categories: ['books', 'daily-life'], topics: ['saju'] },
  'legacy-tarot': { categories: ['books', 'daily-life'], topics: ['tarot'] },
};
export function serviceRule(service) {
  if (Object.hasOwn(SERVICE_MAP, service)) return SERVICE_MAP[service];
  if (/^fortune-tea-house-(tarot|tarot-five|saju|saju-compatibility|sukuyo-compatibility)-consultation$/.test(service)) {
    return { categories: ['books', 'daily-life'], topics: [service.includes('sukuyo') ? 'sukuyo' : service.includes('saju') ? 'saju' : 'tarot'] };
  }
  if (/^(saju|ziwei|sukuyo|vedic|astrology|tarot)_(mackerel|salmon|flounder|tuna)$/.test(service)) return { categories: ['books', 'daily-life'], topics: [service.split('_')[0]] };
  if (/^fusion_(saju_ziwei|sukuyo_vedic|astrology_tarot|all)$/.test(service)) return { categories: ['books', 'daily-life'], topics: [] };
  return null;
}
export const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{1,79}$/.test(value);
export function validateAffiliateUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(raw) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|25|5c)/i.test(raw)) return false;
  try {
    const u = new URL(raw);
    // Narrow manual-link form only. Other official formats require documented review.
    return /^https:\/\/link\.coupang\.com\//.test(raw) && u.protocol === 'https:' && u.hostname === 'link.coupang.com' && !u.port && !u.username && !u.password && !u.hash && /^\/a\/[A-Za-z0-9]+$/.test(u.pathname);
  } catch { return false; }
}
export function validImageUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\s\\\u0000-\u001f]/.test(raw)) return false;
  if (/^\/(assets|images)\/[A-Za-z0-9/_-]+\.(webp|png|jpg|jpeg)$/.test(raw) && !raw.includes('..')) return true;
  try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.search && !u.hash && /^(thumbnail[0-9]*\.coupangcdn\.com|image[0-9]*\.coupangcdn\.com)$/.test(u.hostname); } catch { return false; }
}
const text = (v, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const list = (v, allowed) => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && allowed(x)))].slice(0, 30) : [];
const date = v => v && Number.isFinite(new Date(v).getTime()) ? new Date(v).toISOString() : null;
export function cleanProduct(body) {
  if (!validId(body?.id) || !CATEGORIES.includes(body.category)) throw new Error('상품 ID와 분류를 확인해 주세요.');
  const p = {
    id: body.id, category: body.category, kind: PRODUCT_KINDS[body.category].includes(body.kind) ? body.kind : '', title: text(body.title, 180), reason: text(body.reason, 240),
    serviceTags: list(body.serviceTags, x => !!serviceRule(x)),
    topicTags: list(body.topicTags, x => [...systems, 'human-design', 'relationship', 'planning'].includes(x)),
    interests: list(body.interests, x => INTERESTS.includes(x)),
    species: list(body.species, x => ['cat', 'dog'].includes(x)), groupId: text(body.groupId, 80),
    affiliateUrl: text(body.affiliateUrl, 2048), linkSource: ['portal', 'quick-link', 'official-api'].includes(body.linkSource) ? body.linkSource : 'portal',
    linkType: body.linkType === 'search' ? 'search' : 'product',
    imageUrl: text(body.imageUrl, 2048), imageSource: text(body.imageSource, 1000), evidence: text(body.evidence, 1000),
    attributes: list(body.attributes, x => x.length <= 180).slice(0, 5),
    stock: ['available', 'sold-out', 'ended'].includes(body.stock) ? body.stock : 'unknown',
    price: body.price === null || body.price === '' || body.price === undefined ? null : Number(body.price),
    priceVerifiedAt: date(body.priceVerifiedAt), featured: body.featured === true,
    order: Number.isSafeInteger(body.order) && body.order >= 0 && body.order <= 999 ? body.order : 100,
    status: 'draft', verifiedAt: null, expiresAt: null, accountVerified: false,
  };
  if (!p.title || (p.price !== null && (!Number.isFinite(p.price) || p.price <= 0 || p.price > 100000000))) throw new Error('상품명과 확인된 가격을 입력해 주세요.');
  if (p.groupId && !validId(p.groupId)) throw new Error('그룹 ID를 확인해 주세요.');
  // Never normalize an issued URL: malformed input remains a draft, exact bytes retained.
  if (typeof body.affiliateUrl === 'string') p.affiliateUrl = body.affiliateUrl;
  return p;
}
export function reviewErrors(p) {
  const errors = [];
  if (!PRODUCT_KINDS[p.category]?.includes(p.kind)) errors.push('초기 운영에 허용된 상품 종류를 선택해 주세요.');
  if (p.kind === 'album' && !p.groupId) errors.push('앨범은 확인한 그룹 ID가 필요합니다.');
  if (!validateAffiliateUrl(p.affiliateUrl)) errors.push('지원하는 공식 단축 링크 형식이 아닙니다.');
  if (!validImageUrl(p.imageUrl) || !p.imageSource) errors.push('허용된 이미지 주소와 사용 근거가 필요합니다.');
  if (!p.evidence || !p.reason || !p.interests?.length) errors.push('상품 확인 근거·추천 이유·관심사가 필요합니다.');
  if (p.category === 'pets' && !p.species?.length) errors.push('반려동물 종을 지정해 주세요.');
  if (p.category === 'books' && !p.topicTags?.length) errors.push('책의 주제를 지정해 주세요.');
  if (['sold-out', 'ended'].includes(p.stock)) errors.push('품절·판매 종료 상품은 활성화할 수 없습니다.');
  return errors;
}
export function reviewProduct(p, checks, now = Date.now()) {
  const errors = reviewErrors(p);
  if (checks?.account !== true || checks?.facts !== true || checks?.image !== true || checks?.allowedCategory !== true) errors.push('계정 귀속·상품 사실·이미지 사용·금지 품목 제외를 확인해 주세요.');
  if (errors.length) throw new Error(errors.join(' '));
  return { ...p, status: 'active', accountVerified: true, verifiedAt: new Date(now).toISOString(), expiresAt: new Date(now + VALID_DAYS * DAY).toISOString() };
}
export function normalizeContext(input = {}) {
  const service = !input.service ? 'recommendations' : typeof input.service === 'string' && serviceRule(input.service) ? input.service : 'unsupported';
  return {
    service, category: CATEGORIES.includes(input.category) ? input.category : '',
    interests: list(input.interests, x => INTERESTS.includes(x)),
    species: ['cat', 'dog'].includes(input.species) ? input.species : '',
    groupId: validId(input.groupId) ? input.groupId : '',
    maxPrice: Number.isFinite(Number(input.maxPrice)) && Number(input.maxPrice) > 0 ? Math.min(Number(input.maxPrice), 100000000) : null,
    exclude: list(input.exclude, validId),
  };
}
export function currentPrice(p, now = Date.now()) {
  const at = new Date(p.priceVerifiedAt || 0).getTime();
  return Number.isFinite(p.price) && p.price > 0 && at <= now && now - at <= DAY ? p.price : null;
}
export function publicProduct(p, now = Date.now()) {
  return { id: p.id, category: p.category, title: p.title, reason: p.reason, attributes: p.attributes || [], affiliateUrl: p.affiliateUrl, linkType: p.linkType, imageUrl: p.imageUrl, price: currentPrice(p, now), priceVerifiedAt: currentPrice(p, now) === null ? null : p.priceVerifiedAt, genericCollection: p.category === 'fandom' && !p.groupId };
}
export function selectProducts(products, input = {}, now = Date.now()) {
  const c = normalizeContext(input), rule = serviceRule(c.service);
  if (!rule) return [];
  if (rule.explicitInterest) {
    c.interests = c.interests.filter(x => ['meal-prep', 'hydration', 'rest'].includes(x));
    if (!c.interests.length) return [];
  }
  const matches = products.filter(p => {
    const expires = new Date(p.expiresAt || 0).getTime(), verified = new Date(p.verifiedAt || 0).getTime();
    if (p.status !== 'active' || !p.accountVerified || reviewErrors(p).length || !Number.isFinite(expires) || !Number.isFinite(verified) || expires <= now || verified <= 0 || verified > now || now - verified > VALID_DAYS * DAY) return false;
    if (!rule.categories.includes(p.category) || (c.category && c.category !== p.category) || c.exclude.includes(p.id)) return false;
    if (p.serviceTags?.length && !p.serviceTags.includes(c.service) && c.service !== 'recommendations') return false;
    if (p.category === 'pets' && (!c.species || !p.species.includes(c.species))) return false;
    if (p.category === 'fandom' && p.groupId && p.groupId !== c.groupId) return false;
    if (p.category === 'books' && rule.topics.length && !p.topicTags.some(t => rule.topics.includes(t))) return false;
    if (c.interests.length && !p.interests.some(t => c.interests.includes(t))) return false;
    if (c.maxPrice !== null && (currentPrice(p, now) === null || currentPrice(p, now) > c.maxPrice)) return false;
    return true;
  });
  const score = p => (p.serviceTags?.includes(c.service) ? 20 : 0) + p.interests.filter(x => c.interests.includes(x)).length * 10 + Math.min(p.attributes?.length || 0, 5);
  matches.sort((a, b) => score(b) - score(a) || Number(b.featured) - Number(a.featured) || a.order - b.order || a.id.localeCompare(b.id));
  // Start with category diversity without promoting an irrelevant product.
  const first = [], rest = [], seen = new Set();
  for (const p of matches) { if (!seen.has(p.category)) { first.push(p); seen.add(p.category); } else rest.push(p); }
  return [...first, ...rest].map(p => publicProduct(p, now));
}
export function isEnabled(settings, service, released = RECOMMENDATIONS_RELEASED) {
  return released && !!serviceRule(service) && settings?.enabled === true && settings?.approved === true && settings?.mediaRegistered === true && !settings.disabledServices?.includes(service);
}
export const EVENT_NAMES = ['impression', 'click', 'more', 'filter', 'dismiss'];
export function cleanEvent(body) {
  if (!body || Object.keys(body).some(k => !['event', 'service', 'placement', 'productId', 'consent'].includes(k)) || !EVENT_NAMES.includes(body.event) || !serviceRule(body.service) || !['result', 'browse'].includes(body.placement) || body.consent !== true) return null;
  if (body.productId && !validId(body.productId)) return null;
  if (body.event === 'click' && !body.productId) return null;
  return { event: body.event, service: body.service, placement: body.placement, productId: body.productId || 'block' };
}
