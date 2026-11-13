// 2026-11-13 사용자 요청: 무료 홍보 칩(사주 결과 안 카드 9개)마다 설명 상세 페이지를 둔다. 표시 전용 레지스트리다.
// 🔴 무료 여부·가격·결제를 여기서 정하지 않는다. 무료 범위의 정본은 lib/payment/free-fortune-policy.mjs,
//    홍보 기한은 lib/marketing/free-promo.mjs 의 FREE_PROMO.endsAt 하나다(배지 날짜는 거기서 계산한다).
// 🔴 재미 카드 7개 문구는 복사하지 않고 feature-marketing-copy.generated.json(셸 정본에서 생성)을 그대로 읽는다.
//    원천 JSON 은 고치지 않는다. 홍보 기간과 어긋나는 문장만 excludePhrases 로 이 화면에서 걸러 낸다.
//    명식·절기 두 개는 원천 문구가 없어 엔진 동작(js/saju-engine.js renderManse·_CD_NATAL_STUBS,
//    js/core/saju/manse-shinsal.js, worker/lib/saju-section/paid-natal-reading.src.js)에서 확인한 사실만 적었다.
// cardName 은 사주 결과 화면에서 사용자가 보는 카드 이름이다(js/core/saju/reportDashboard.js rd.label.*, index.html 섹션 제목).
// heroGlyphs 는 그림이 없는 동안 쓰는 글자 히어로(장식, [글자, 읽는 법]).
// indexable 은 서버 렌더 본문 분량을 재고 나서 6c-2 에서 정한다. 지금은 모두 색인(true)이다.
import featureMarketingCopy from './feature-marketing-copy.generated.json' with { type: 'json' };
import { FREE_PROMO, FREE_PROMO_SAJU_ACTION } from './free-promo.mjs';

export const FREE_FEATURE_DETAIL_CTA_HREF = `/ggulggul/?action=${FREE_PROMO_SAJU_ACTION}`;

const IMAGE_SIZE = Object.freeze({ width: 1672, height: 941 });
function functionAsset(fileName, alt) {
  return Object.freeze({ src: `/fuctionassets/${fileName}.webp`, alt, ...IMAGE_SIZE });
}

const NATAL_COPY = Object.freeze({
  headline: '네 기둥 여덟 글자와 기둥마다 붙는 12신살을 한 화면에서 확인해 보세요.',
  subheadline: '시주·일주·월주·년주를 나란히 놓고, 글자마다 십성과 음양·오행을, 기둥마다 12신살을 함께 보여 주는 명식표예요.',
  previewText: '명식표는 길흉을 판정하지 않아요. 어떤 글자가 어느 자리에 있는지, 그 자리에 어떤 신살 이름이 붙는지를 그대로 보여 줘요. 명식 아래에는 일주·십성·조후·억부 풀이가 이어져요.',
  feats: [
    '시주·일주·월주·년주 네 기둥의 천간과 지지를 한 표에 보여 줘요',
    '글자마다 십성 배지를 달고, 일간은 "일간"으로 따로 표시해요',
    '글자마다 음양과 오행을 함께 적어요',
    '기둥마다 12신살(겁살·재살·천살·지살·년살·월살·망신살·장성살·반안살·역마살·육해살·화개살) 한 줄을 붙여요',
    '도화살·홍염살·천을귀인·문창귀인·괴강살·백호살·양인살·공망·원진살 같은 별신살 13가지는 원국에 있을 때만 이름과 자리를 칩으로 보여 줘요',
    '글자를 누르면 그 글자의 설명이 열려요',
    '명식 아래에서 일주·십성·조후(한난조습)·억부 풀이를 이어서 읽을 수 있어요',
  ],
  analysisSteps: [
    { label: '명식 세우기', detail: '생년월일시로 시주·일주·월주·년주 네 기둥을 세워요.' },
    { label: '십성과 오행 표시', detail: '일간을 기준으로 나머지 글자의 십성을 정하고 음양·오행을 붙여요.' },
    { label: '신살 자리 찾기', detail: '태어난 해의 지지(연지)를 기준으로 기둥마다 12신살을 붙이고, 원국에 있는 별신살의 이름과 자리를 찾아요.' },
    { label: '원국 풀이', detail: '일주·십성·조후·억부 풀이로 명식이 성향과 생활에서 드러나는 결을 이어서 읽어요.' },
  ],
  answersQuestions: [
    '내 사주 여덟 글자는 무엇인가요?',
    '기둥마다 어떤 12신살이 붙어 있나요?',
    '내 원국에 있는 별신살은 무엇이고 어느 자리에 있나요?',
  ],
  recommendedFor: [
    '내 명식을 한 화면에서 정리해 보고 싶은 분',
    '12신살과 별신살이 어느 기둥에 붙는지 궁금한 분',
    '사주 공부를 시작하며 글자마다 십성·오행을 확인하고 싶은 분',
  ],
  faq: [
    { q: '신살이 많으면 안 좋은 건가요?', a: '명식표는 신살의 이름과 자리만 보여 주고 길흉을 판정하지 않아요. 같은 신살도 원국 전체의 균형과 함께 읽어야 해요.' },
    { q: '별신살이 하나도 나오지 않았어요.', a: '원국에서 직접 확인되는 별신살이 없다는 뜻이에요. 없는 것 또한 부족함이나 불운을 뜻하지 않아요.' },
    { q: '12신살은 무엇을 기준으로 붙이나요?', a: '태어난 해의 지지(연지)를 기준으로 네 기둥의 지지에 하나씩 붙여요.' },
  ],
  trustNotes: ['신살은 이름과 자리만 보여 주고 길흉을 판정하지 않아요.'],
});

const SEASON_RHYTHM_COPY = Object.freeze({
  headline: '태어난 달의 절기가 만든 계절 리듬과 마음을 여는 속도를 확인해 보세요.',
  subheadline: '24절기는 사주의 월주를 여는 기준이에요. 어느 계절 기운 속에 태어났는지, 그 절기 구간의 어디쯤에서 태어났는지 보여 줘요.',
  previewText: '절기 리듬은 달력 지식이 아니라 사주의 월주와 계절 기운을 읽는 풀이예요. 태어난 달의 지지로 계절을 정하고, 그 계절이 성향과 생활 리듬에 드러나는 결을 정리해요.',
  feats: [
    '태어난 달의 지지로 계절을 정해요. 인·묘월은 봄 목왕절, 사·오월은 여름 화왕절, 신·유월은 가을 금왕절, 해·자월은 겨울 수왕절, 진·미·술·축월은 계절이 바뀌는 토왕 환절기예요',
    '계절로 마음을 여는 속도를 읽어요. 봄·여름은 빠른 편, 가을·겨울은 느린 편, 환절기는 속도를 조율하는 편으로 봐요',
    '출생 시각을 알면 절입 구간 안에서 초입·중반·마무리 가운데 어디쯤 태어났는지 진행 막대로 보여 줘요',
    '타고난 성향·사람을 받아들이는 방식·연애할 때·일과 돈·컨디션 다섯 영역 카드로 정리해요',
    '월주·월령·절입·조후·보완 기운·주의 리듬 근거 칩으로 풀이가 어디서 나왔는지 보여 줘요',
    '24절기표에서 내가 태어난 달의 절입을 강조해 보여 줘요',
  ],
  analysisSteps: [
    { label: '월주 찾기', detail: '생년월일시로 명식을 세우고 태어난 달의 월주를 찾아요.' },
    { label: '계절과 월령', detail: '월지로 계절과 그때 왕성한 오행(월령)을 정해요.' },
    { label: '절입 안 위치', detail: '출생 시각이 있으면 절입 구간 안에서 초입·중반·마무리 가운데 어디인지 표시해요.' },
    { label: '영역 풀이', detail: '다섯 영역 카드와 근거 칩, 24절기표로 정리해요.' },
  ],
  answersQuestions: [
    '나는 어느 계절 기운 속에 태어났나요?',
    '사람에게 마음을 여는 속도는 빠른 편인가요, 느린 편인가요?',
    '내가 태어난 절기 구간의 어디쯤에서 태어났나요?',
  ],
  recommendedFor: [
    '생일이 절기 경계 근처라 월주가 헷갈렸던 분',
    '내 생활 리듬과 컨디션의 결을 계절로 이해하고 싶은 분',
    '사주의 월령이 무엇인지 처음 알아보는 분',
  ],
  faq: [
    { q: '사주의 달은 언제 바뀌나요?', a: '달력의 1일이 아니라 절기가 들어오는 절입 시각에 바뀌어요. 그래서 같은 달에 태어나도 절입 전후로 월주가 달라질 수 있어요.' },
    { q: '절기 경계 근처에 태어났어요.', a: '절입 시각과 하루 안쪽으로 가깝게 태어났다면 결과에 주의 문구를 함께 보여 줘요. 출생 시각을 정확히 넣을수록 분명해져요.' },
    { q: '출생 시각을 모르면요?', a: '진행 막대와 절입 구간 안 위치 없이, 월령·계절 풀이와 24절기표를 보여 줘요.' },
  ],
  trustNotes: ['계절 리듬은 성향을 이해하기 위한 참고 풀이예요.'],
});

/**
 * 순서는 무료 홍보 배너(FREE_PROMO_GROUPS)의 칩 순서와 같다. id 는 그 칩 id 다.
 * path 는 끝 슬래시 없이 적는다(buildSeoMetadata·canonical 이 붙인다). href 는 링크용이다.
 */
export const FREE_FEATURE_DETAILS = Object.freeze([
  {
    id: 'fourCut', slug: 'four-cut', name: '사주 네컷', cardName: '사주네컷 : 운명 필터', copyKey: 'rpt_sajuFourCutCard',
    h1: '사주 네컷 — 오늘의 일주로 만드는 인생네컷',
    title: '사주 네컷 — 오늘의 일주로 만드는 인생네컷 | 꿀꿀 운세',
    description: '오늘의 일주 기운을 네 컷 문장으로 만들어요. 네 가지 버전을 골라 스티커로 꾸미고 이미지로 저장하거나 공유할 수 있어요.',
    keywords: ['사주 네컷', '인생네컷 사주', '사주 공유 카드', '오늘의 일주'],
    image: functionAsset('사주 네컷', "사주 결과 화면의 '사주네컷 : 운명 필터' 카드 대표 그림"),
  },
  {
    id: 'dopamine', slug: 'dopamine', name: '도파민·집중력', cardName: '나는 도파민 중독일까?', copyKey: 'rpt_dopamineCard',
    h1: '사주 도파민 리포트 — 내가 반응하는 자극과 몰입',
    title: '사주 도파민 리포트 — 자극 성향과 몰입 분야 | 꿀꿀 운세',
    description: '사주 흐름으로 자극 추구 성향을 점수와 등급으로 보고, 8축 자극 레이더와 몰입 분야, 집중이 잘 되는 환경을 정리해요.',
    keywords: ['사주 도파민', '도파민 테스트 사주', '자극 추구 성향', '몰입 분야'],
    image: functionAsset('도파민 중독', "사주 결과 화면의 '나는 도파민 중독일까?' 카드 대표 그림"),
  },
  {
    id: 'hormone', slug: 'teto-egen', name: '테토·에겐 바이브', cardName: '테토 vs 에겐', copyKey: 'rpt_hormone-vibe-section',
    h1: '사주 테토·에겐 테스트 — 십성으로 보는 매력 결',
    title: '사주 테토·에겐 테스트 — 십성으로 보는 매력 유형 | 꿀꿀 운세',
    description: '일간을 뺀 일곱 자리의 십성을 다섯 그룹으로 묶어 테토 점수와 에겐 점수를 내고, 그렇게 판정한 이유를 함께 보여 줘요.',
    keywords: ['테토 에겐 사주', '테토 에겐 테스트', '사주 매력 유형', '십성 분포'],
    image: functionAsset('테토VS에겐', "사주 결과 화면의 '테토 vs 에겐' 카드 대표 그림"),
  },
  {
    id: 'tTest', slug: 't-test', name: '극T 테스트', cardName: '극T 테스트', copyKey: 'rpt_tTestCard',
    // 원천 문구의 '별도 잠금 해제'·'라이트 사주 풀이' 문장은 무료 홍보 기간 안내와 어긋나 이 화면에서만 뺀다.
    excludePhrases: ['잠금 해제', '라이트 사주 풀이'],
    h1: '사주 극T 테스트 — 내 논리 온도 재기',
    title: '사주 극T 테스트 — 사주로 재는 논리 온도 | 꿀꿀 운세',
    description: '사주 원국의 금 오행·관성·식상·조후를 재서 T 점수 0~100과 티어, 타입명을 내고 장점과 오류 패턴을 나눠 보여 줘요.',
    keywords: ['극T 테스트', '사주 T 테스트', '논리 온도', 'T 점수'],
    image: functionAsset('극T테스트', "사주 결과 화면의 '극T 테스트' 카드 대표 그림"),
  },
  {
    id: 'lotto', slug: 'lotto-ritual', name: '사주 로또 리추얼', cardName: '퀀텀 로또 리포트', copyKey: 'rpt_lottoCard',
    h1: '사주 로또 리추얼 — 오늘의 상징 번호',
    title: '사주 로또 리추얼 — 오늘의 일진으로 뽑는 상징 번호 | 꿀꿀 운세',
    description: '사주 팔자와 오늘의 일진·대운을 시드로 다섯 게임의 상징 번호를 뽑아요. 당첨을 예측하지 않는 재미용 의식이에요.',
    keywords: ['사주 로또', '사주 행운 번호', '오늘의 행운 번호', '오행 숫자'],
    image: functionAsset('사주 로또', "사주 결과 화면의 '퀀텀 로또 리포트' 카드 대표 그림"),
  },
  {
    id: 'aiPrompt', slug: 'ai-prompt-card', name: 'AI 프롬프트 카드', cardName: '사주 AI 프롬프트', copyKey: 'rpt_aiPromptCard',
    h1: '사주 AI 프롬프트 카드 — 내 사주를 이미지 문구로',
    title: '사주 AI 프롬프트 카드 — 이미지 생성 문구 13가지 | 꿀꿀 운세',
    description: '내 사주의 오행과 십성 결로 물상·동물 아바타·이상형 얼굴 같은 이미지 생성 문구 13가지를 만들고 버튼 한 번으로 복사해요.',
    keywords: ['사주 AI 프롬프트', '사주 이미지 프롬프트', '사주 아바타', 'AI 이미지 문구'],
    image: functionAsset('사주 프롬프트', "사주 결과 화면의 '사주 AI 프롬프트' 카드 대표 그림"),
  },
  {
    id: 'skillTree', slug: 'skill-tree', name: '인생 스킬 트리', cardName: '인생 스킬 트리', copyKey: 'rpt_skillTreeCard',
    h1: '인생 스킬 트리 — 사주로 보는 RPG 능력치',
    title: '인생 스킬 트리 — 사주 RPG 능력치와 성장 경로 | 꿀꿀 운세',
    description: '오행을 창의력·카리스마·안정성·결단력·직관력 다섯 스탯으로 바꿔 캐릭터 클래스와 주력·보유·잠긴 스킬을 보여 줘요.',
    keywords: ['인생 스킬 트리', '사주 RPG', '사주 능력치', '오행 스탯'],
    image: functionAsset('RPG 인생 스킬트리', "사주 결과 화면의 '인생 스킬 트리' 카드 대표 그림"),
  },
  {
    id: 'natal', slug: 'natal-chart', name: '명식·12신살', cardName: '사주 명식', copy: NATAL_COPY,
    h1: '사주 명식과 12신살 — 네 기둥 여덟 글자 읽기',
    title: '사주 명식과 12신살 — 네 기둥과 신살 자리 | 꿀꿀 운세',
    description: '네 기둥 여덟 글자에 십성·음양·오행을 달고, 기둥마다 12신살과 원국에 있는 별신살의 이름과 자리를 보여 줘요.',
    keywords: ['사주 명식', '12신살', '별신살', '사주 신살 보기'],
    image: null, // 단계 11a 에서 그림을 정한다. 그때까지 글자 히어로를 쓴다.
    heroGlyphs: [["時", "시주"], ["日", "일주"], ["月", "월주"], ["年", "년주"]],
  },
  {
    id: 'seasonRhythm', slug: 'season-rhythm', name: '절기 리듬', cardName: '내 절기 리듬', copy: SEASON_RHYTHM_COPY,
    h1: '내 절기 리듬 — 태어난 절기로 읽는 월령',
    title: '내 절기 리듬 — 태어난 절기로 읽는 월령과 계절 | 꿀꿀 운세',
    description: '태어난 달의 지지로 계절과 월령을 정하고, 절입 구간 안 위치와 마음을 여는 속도, 다섯 영역의 생활 리듬을 정리해요.',
    keywords: ['사주 절기', '절기 리듬', '월령', '24절기 사주'],
    image: null, // 단계 11a 에서 그림을 정한다. 그때까지 글자 히어로를 쓴다.
    heroGlyphs: [["春", "봄"], ["夏", "여름"], ["秋", "가을"], ["冬", "겨울"]],
  },
].map((detail) => Object.freeze({
  ...detail,
  path: `/saju/${detail.slug}`,
  href: `/saju/${detail.slug}/`,
  indexable: true,
})));

export function getFreeFeatureDetail(slug) {
  const detail = FREE_FEATURE_DETAILS.find((item) => item.slug === slug);
  if (!detail) throw new Error(`free-feature-details: 알 수 없는 상세 페이지입니다 (${slug})`);
  return detail;
}

/** 히어로 배지 문구. FREE_PROMO.endsAt 의 날짜 부분(KST 표기 그대로)만 읽는다. */
export function freeFeatureFreeUntilLabel(endsAt = FREE_PROMO.endsAt) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(endsAt || ''));
  if (!match) throw new Error(`free-feature-details: FREE_PROMO.endsAt 형식이 다릅니다 (${endsAt})`);
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일까지 무료`;
}

const asList = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);

/**
 * 화면에 쓸 문구를 모은다. 원천이 없으면 빌드에서 바로 실패한다(fail-closed).
 * FAQ 는 { question, answer } 로 바꿔 화면과 FAQPage JSON-LD 가 같은 배열을 쓰게 한다.
 */
export function resolveFreeFeatureCopy(detail) {
  const source = detail.copyKey ? featureMarketingCopy.items?.[detail.copyKey]?.copy : detail.copy;
  if (!source || typeof source.headline !== 'string') {
    throw new Error(`free-feature-details: ${detail.slug} 문구 원천을 찾지 못했습니다 (${detail.copyKey || 'copy'})`);
  }
  const drop = Array.isArray(detail.excludePhrases) ? detail.excludePhrases : [];
  const keep = (text) => !drop.some((phrase) => String(text).includes(phrase));
  const steps = (Array.isArray(source.analysisSteps) ? source.analysisSteps : [])
    .filter((step) => step && step.label && step.detail && keep(step.label) && keep(step.detail));
  const faq = (Array.isArray(source.faq) ? source.faq : [])
    .filter((item) => item && item.q && item.a && keep(item.q) && keep(item.a))
    .map((item) => ({ question: item.q, answer: item.a }));
  faq.push({
    question: '어디에서 열 수 있나요?',
    answer: `꿀꿀 운세에서 생년월일시를 넣어 사주 결과를 연 뒤, 결과 화면의 '${detail.cardName}' 카드에서 열 수 있어요.`,
  });
  const trustNotes = [...new Set([...asList(source.trustNotes), ...asList(featureMarketingCopy.trustNotes?.free)])].filter(keep);
  return {
    headline: source.headline,
    subheadline: typeof source.subheadline === 'string' && keep(source.subheadline) ? source.subheadline : '',
    previewText: typeof source.previewText === 'string' && keep(source.previewText) ? source.previewText : '',
    feats: asList(source.feats).filter(keep),
    analysisSteps: steps.map((step) => ({ label: step.label, detail: step.detail })),
    answersQuestions: asList(source.answersQuestions).filter(keep),
    recommendedFor: asList(source.recommendedFor).filter(keep),
    painPoints: asList(source.painPoints).filter(keep),
    faq,
    trustNotes,
  };
}
