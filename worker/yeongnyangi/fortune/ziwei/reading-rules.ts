/**
 * 자미두수 상담 해석 규칙 — 근거 원문·출처·적용 범위를 한곳에 둔다.
 *
 * 여기 있는 이유: 상담 프롬프트가 "명암을 함께 읽는다" 한 줄뿐이라 LLM 이 기억에 기대 고전을 지어낼 수 있었다.
 * 규칙마다 확인한 원문과 리비전을 남겨 "어느 책 어느 편의 어떤 문장"으로 추적한다.
 *
 * 🔴 quote 는 2026-10-01 위키문헌 raw wikitext 와 글자 대조한 원문만 싣는다(권1 rev 7913704, 권3 rev 2268626).
 *    원문을 못 찾은 규칙은 quote:null 이고 kind 가 'modern-extension' | 'service-policy' 다.
 *    차성안궁(借星安宮)은 권1·권3 에 '借' 자가 한 번도 없어 현대 확장으로 둔다.
 * 🔴 application: 원문이 명궁(命宮)이나 특정 별을 두고 한 말을 12궁·다른 별에 쓰면 'extended' 이고 scopeNote 에 이유를 적는다.
 * 🔴 quote 의 단정(빈천·걸인·하격·주권귀)은 LLM 에 보내지 않는다. LLM 에는 ZIWEI_READING_FRAME 과
 *    reading-facts.ts 가 궁 데이터로 만든 문장만 간다. 규칙 id 도 LLM 입력에 넣지 않는다.
 * 🔴 격국(格局)은 성립·파격 조건을 검증하기 전까지 넣지 않는다.
 */

export const ZIWEI_READING_RULES_VERSION = 'ziwei-reading-rules-v1';

export type ZiweiRuleKind = 'classical-direct' | 'modern-extension' | 'service-policy';
export type ZiweiRuleApplication = 'as-written' | 'extended' | 'policy';
export interface ZiweiReadingRule {
  id: string;
  title: string;
  source: { work: string; section: string; quote: string | null; url: string | null; revision: number | null; kind: ZiweiRuleKind };
  application: ZiweiRuleApplication;
  scopeNote: string;
  guidance: string;
}

const WIKI = 'https://zh.wikisource.org/w/index.php?title=%E7%B4%AB%E5%BE%AE%E6%96%97%E6%95%B8%E5%85%A8%E6%9B%B8/';
const V1 = { url: `${WIKI}%E5%8D%B7%E4%B8%80&oldid=7913704`, revision: 7913704 };
const V3 = { url: `${WIKI}%E5%8D%B7%E4%B8%89&oldid=2268626`, revision: 2268626 };
const WORK = '紫微斗數全書';
const classical = (section: string, quote: string, v: typeof V1) => ({ work: WORK, section, quote, ...v, kind: 'classical-direct' as const });
const policy = (kind: 'modern-extension' | 'service-policy', section: string) => ({ work: kind === 'service-policy' ? 'Code Destiny 상담 정책' : '현대 자미두수 관행', section, quote: null, url: null, revision: null, kind });

export const ZIWEI_READING_RULES: readonly ZiweiReadingRule[] = Object.freeze([
  {
    id: 'zw.strength.start', title: '강약을 먼저 보고 관계를 잇는다',
    source: classical('卷一 太微賦', '星臨廟旺，再觀生剋之機。命坐強宮，細察制化之理。', V1),
    application: 'as-written', scopeNote: '별의 묘왕을 확인한 뒤 생극·제화(다른 별과의 관계)를 본다는 순서 원칙.',
    guidance: '궁마다 주성의 강약을 먼저 확인하고, 그 힘이 같은 궁·사화·대궁·삼합의 별과 어떻게 맞물리는지 이어서 본다.',
  },
  {
    id: 'zw.order', title: '본궁 → 삼방 순서',
    source: classical('卷三 谈星要论', '第一看命宫吉凶庙旺化吉化忌生克。…三看迁移财帛官禄三方星辰刑冲克破。', V3),
    application: 'extended', scopeNote: '원문은 명궁과 그 삼방(천이·재백·관록)을 두고 한 말이다. 다른 궁에 같은 순서를 쓰는 것은 확장이다.',
    guidance: '본궁 별의 강약과 사화를 먼저, 대궁·삼합 궁의 별을 그다음에 본다.',
  },
  {
    id: 'zw.relations', title: '대궁과 삼합을 나눠 본다',
    source: classical('卷一 斗数骨髓赋', '分对宫之体用，定三合之源流。', V1),
    application: 'as-written', scopeNote: '대궁(체용)과 삼합(원류)을 구분하라는 일반 원칙.',
    guidance: '대궁은 본궁과 짝을 이루는 바깥 면, 삼합 궁은 본궁을 받치는 흐름으로 구분한다. 동궁·대궁·삼합·협궁을 한데 섞지 않는다.',
  },
  {
    id: 'zw.strength.plain', title: '묘왕만으로 길하다 하지 않는다',
    source: classical('卷三 论人命入格', '入庙不加吉，平等。', V3),
    application: 'extended', scopeNote: '원문은 명궁 입격 판정이다. 12궁의 주성에 같은 기준을 쓰는 것은 확장이다.',
    guidance: '묘왕이어도 길한 사화·보좌가 붙지 않으면 "성질이 또렷하다" 이상으로 길흉을 높이지 않는다.',
  },
  {
    id: 'zw.strength.malefic', title: '묘왕이어도 살성·화기가 비추면 마찰',
    source: classical('卷三 谈星要论', '及命宫星辰庙旺，三方有恶星守照破格。', V3),
    application: 'extended', scopeNote: '원문은 명궁 주성이다. 다른 궁에 쓰는 것과 본궁 화기를 포함하는 것은 확장이다.',
    guidance: '주성이 묘왕이어도 본궁·대궁·삼합에 살성이 있거나 본궁에 화기가 있으면, 강한 힘이 마찰·압박과 함께 드러나는 구조로 읽는다.',
  },
  {
    id: 'zw.xian.support', title: '함이어도 녹·길화가 지키면 보완',
    source: classical('卷三 谈星要论', '及命星陷背，加羊陀化忌，却得十干禄元来相守化吉，亦为中等之命。', V3),
    application: 'extended', scopeNote: '원문은 명궁 주성이다. 다른 궁에 쓰는 것은 확장이다. 등급(중등) 판정은 옮기지 않는다.',
    guidance: '주성이 함·불이어도 녹존·화록·화권·화과가 함께하면 보완할 조건이 있는 구조로 읽는다. 함을 실패로 단정하지 않는다.',
  },
  {
    id: 'zw.xian.pressure', title: '함에 살성·화기가 겹치면 부담',
    source: classical('卷三 论人命入格', '若居陷地又加杀化忌，为下格之命，不以入格而论也。', V3),
    application: 'extended', scopeNote: '원문은 명궁 입격 판정이다. 다른 궁에 쓰는 것은 확장이다. 상격·하격 판정은 옮기지 않는다.',
    guidance: '주성이 함·불인데 살성이나 화기가 겹치면 그 영역에서 부담이 커지기 쉬운 조건으로 설명하고, 완충 행동과 관찰 신호를 함께 준다.',
  },
  {
    id: 'zw.sihua.strength', title: '사화는 붙은 별의 강약과 함께',
    source: classical('卷一 諸星問答論 問紫微所主', '如廟旺化吉甚妙，陷又化凶甚凶。', V1),
    application: 'extended', scopeNote: '원문은 자미가 명궁을 지킬 때 삼대(三臺)를 보는 문맥이다. 모든 별의 생년사화에 쓰는 것은 확장이다.',
    guidance: '강한 별의 화록·화권·화과는 그 힘이 잘 쓰이기 쉽고, 약한 별의 화기는 부담이 더 드러나기 쉽다.',
  },
  {
    id: 'zw.sunmoon', title: '해·달이 빛을 잃은 자리',
    source: classical('卷一 太微賦', '日月最嫌反背', V1),
    application: 'as-written', scopeNote: '태양·태음 강약이 불·함일 때만 쓴다.',
    guidance: '태양·태음이 불·함이면 빛을 잃은 자리(반배)로, 그 성질이 드러나는 데 시간과 보완 조건이 더 필요하다고 설명한다.',
  },
  {
    id: 'zw.malefic.grade', title: '살성의 강약은 긴장의 모양',
    source: classical('卷一 諸星問答論 問擎羊星所主', '入庙性刚果决，机谋好勇，主权贵。', V1),
    application: 'extended', scopeNote: '원문은 경양이다. 타라·화성·영성에 같은 읽기를 쓰는 것은 확장이다. 주권귀(권귀) 판정은 옮기지 않는다.',
    guidance: '살성이 묘왕이면 긴장이 결단·추진력처럼 쓸 수 있는 형태로 드러나기 쉽다는 뜻이지 길성으로 바뀐다는 뜻이 아니다. 함이면 긴장이 거칠게 드러나기 쉽다.',
  },
  {
    id: 'zw.flank', title: '양옆 궁이 끼는 힘(협)',
    source: classical('卷一 斗数骨髓赋', '夹贵夹禄少人知，夹权夹科世所宜。夹日夹月谁能遇，夹昌夹曲主贵兮。夹空夹劫主贫贱，夹羊夹陀为乞丐。', V1),
    application: 'as-written', scopeNote: '짝을 이루는 두 별이 양옆 궁에 나뉘어 있을 때만 쓴다. 빈천·걸인 같은 단정은 옮기지 않는다.',
    guidance: '좌보·우필, 문창·문곡, 천괴·천월, 태양·태음이 양옆에 나뉘면 돕는 협, 경양·타라, 지공·지겁이면 조이는 협으로 짧게 언급한다.',
  },
  {
    id: 'zw.empty', title: '주성 없는 궁은 불운이 아니다',
    source: classical('卷三 谈星要论', '如无正曜吉星，三方有吉，上次之命。', V3),
    application: 'extended', scopeNote: '원문은 명궁이다. 다른 궁에 쓰는 것과 "불운 단정 금지"는 서비스 정책이다.',
    guidance: '주성이 없는 궁은 비어 있다는 이유로 불운이라 하지 않는다. 삼합 궁의 길성과 사화를 함께 본다.',
  },
  {
    id: 'zw.empty.borrow', title: '빈 궁은 대궁 주성을 참고로 빌린다',
    source: policy('modern-extension', '차성안궁(借星安宮) — 권1·권3 원문에서 확인하지 못함'),
    application: 'policy', scopeNote: '현대 관행. 빌린 별은 본궁 별이 아니다.',
    guidance: '주성이 없는 궁은 대궁 주성을 참고로만 빌려 본다. 그 별을 본궁에 있는 별처럼 말하지 않고, 강약은 대궁 원래 자리의 것을 그대로 쓴다.',
  },
  {
    id: 'zw.multi', title: '두 주성은 각각 읽는다',
    source: policy('service-policy', '권3 편명 「论诸星同垣各司所宜」(같은 궁의 별은 각기 맡는 바가 있다)를 참고한 정책'),
    application: 'policy', scopeNote: '주성이 둘인 궁.',
    guidance: '한 궁에 주성이 둘이면 강약을 각각 말한다. 두 강약을 평균 내 하나로 말하지 않는다.',
  },
  {
    id: 'zw.basis', title: '제공된 것만 쓴다',
    source: policy('service-policy', '근거 추적 정책'),
    application: 'policy', scopeNote: '항상.',
    guidance: '강약이 제공된 별만 강약을 말한다. 좌보·우필·천괴·천월·지공·지겁 등의 강약, 격국 이름, 제공되지 않은 사화·시기를 만들지 않는다. 생년·대한·유년 사화를 섞지 않는다.',
  },
] satisfies ZiweiReadingRule[]);

const RULES_BY_ID = new Map(ZIWEI_READING_RULES.map((r) => [r.id, r]));
export function ziweiReadingRule(id: string): ZiweiReadingRule {
  const rule = RULES_BY_ID.get(id);
  if (!rule) throw new Error(`unknown ziwei reading rule: ${id}`);
  return rule;
}

/**
 * 강약 등급 풀이 — 프롬프트에 한 번만 싣는다(궁마다 반복하면 입력이 불어난다).
 * 풀이 문장은 lib/ziwei-star-strength.js GRADES.label 과 같은 뜻이다.
 */
export const ZIWEI_GRADE_SCALE =
  '강약 등급(강한 순): 묘(廟) 성질이 가장 또렷하고 안정적 · 왕(旺) 힘 있게 드러남 · 득(得地) 자리를 얻어 무난 · 리(利) 쓸 만하나 한 단계 덜함 · 평(平) 중간, 동궁·사화·삼합의 영향을 크게 받음 · 불(不得地) 자리를 얻지 못해 약함 · 함(陷) 막히거나 비틀려 드러나기 쉬워 보완 조건을 함께 봄. 강약은 길흉이 아니라 성질이 드러나는 모양이다.';

/** 자미두수 상담 읽기 틀 — 무료(ziwei/index.ts)·장별(prompts/domain/rules.ts)·상담 품질(consultation-quality.ts) 프롬프트가 같이 쓴다. */
export const ZIWEI_READING_FRAME = [
  '읽는 순서(가중치 공식이 아니라 확인 순서): ①궁의 주제와 주성의 성질 ②주성마다 강약 ③같은 궁의 다른 별 ④보좌성·살성·지공지겁 ⑤그 층위의 사화 ⑥대궁·삼합·양옆 궁 ⑦제공된 시기 자료 ⑧질문에 대한 현실 해석과 조언.',
  ZIWEI_GRADE_SCALE,
  '묘·왕은 무조건 길함이 아니고 함은 실패가 아니다. 길성이 불리함을 지우지 않고 살성·화기가 장점을 없애지 않는다. 경양·타라·화성·영성이 묘왕이면 다루기 쉬운 긴장이지 길성이 아니다.',
  ...['zw.multi', 'zw.empty.borrow', 'zw.relations', 'zw.basis'].map((id) => ziweiReadingRule(id).guidance),
  '궁 자료의 strengths 에 있는 별만 강약을 말하고, readingNotes 는 그 궁에 실제로 걸린 조합이니 근거 설명에 풀어 쓴다(문장을 그대로 옮기지 않는다). 강약이 있는 궁을 해석할 때는 강약을 한 번 이상 말하고, 묘왕리함은 처음 나올 때 짧게 풀어 쓴다. "무곡이 있으니 재물운이 좋다"처럼 별 이름 하나로 결론 내지 않는다.',
].join(' ');
