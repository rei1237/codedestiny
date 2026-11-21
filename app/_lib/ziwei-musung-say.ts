// 심화 자미두수 — 무성(마스터) 화자 레이어. 결정적 템플릿이 말한다(LLM 아님, 과금 없음).
// 기본 자미두수 셸(js/saju-engine.js 의 buildZwYearlyFlowDeepHtml·zwMusungSay)과 같은 원칙을 TS 로 옮겼다.
// - 말풍선 첫 문장은 합니다체 판결(80자 이하, "니다."로 끝), 나머지는 해요체. 반말·애칭·원작 사연·공포·확정 예언 금지.
// - 3개년은 "카드 3장 복붙"이 아니라 한 편의 흐름: 개관(여러 해에 걸친 별·궁은 한 번만) → 해별 차이 → 연결 대사 → 마무리.
// - 올림포스 상징(제우스·헤르메스 등)은 무성이 빌려 말하는 서사다. 신 회전: 직전 신·세 해 안 두 번째 반복을 피한다.
import {
  FLOW_DECADE_LINE, FLOW_GOD_META, FLOW_MATRIX, FLOW_OLYMPUS_BY_PALACE, FLOW_OLYMPUS_BY_STAR, FLOW_ROLE, FLOW_SIHUA_SEAL,
  FLOW_TONE_ACTION, FLOW_TONE_VERDICT,
} from './ziwei-flow-data';
import { FLOW_TYPES, yearFlowTheory, type FlowTone, type FlowType, type YearFlowTheory } from './ziwei-year-flow';
import type { ZiweiDeepChart } from './ziwei-types';

export type MusungMood = 'composed' | 'gentle' | 'smile' | 'thinking' | 'verdict' | 'sorry';
export interface MusungLine { mood: MusungMood; verdict: string; detail: string }

export const TONE_NAME: Record<FlowTone, string> = { expand: '열림', guard: '정리', mixed: '겸비', calm: '평온' };
const TONE_MOOD: Record<FlowTone, MusungMood> = { expand: 'smile', guard: 'verdict', mixed: 'thinking', calm: 'composed' };

/** 받침 유무로 조사를 고른다. 으로/로 는 ㄹ 받침도 "로". */
export function josa(word: string, withBatchim: string, without: string): string {
  const w = String(word || '');
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return w + without;
  const jong = code % 28;
  if (jong === 0 || (withBatchim === '으로' && jong === 8)) return w + without;
  return w + withBatchim;
}

export function relLabel(year: number, nowYear: number): string {
  const d = year - nowYear;
  return d === 0 ? '올해' : d === 1 ? '내년' : d === 2 ? '내후년' : `${year}년`;
}

// ─── 올림포스 ──────────────────────────────────────────────
export interface OlympusPick { god: string; seal: string; oracle: string; why: string; icon: string }
interface OlympusCand { god: string; seal: string; oracle: string; why: string }
type GodMetaTable = Record<string, { icon: string; realm: string; virtue: string }>;
const GOD_META = FLOW_GOD_META as unknown as GodMetaTable;
const BY_STAR = FLOW_OLYMPUS_BY_STAR as unknown as Record<string, { god: string; seal: string; oracle: string }>;
const BY_PALACE = FLOW_OLYMPUS_BY_PALACE as unknown as Record<string, string>;
const SEAL = FLOW_SIHUA_SEAL as unknown as Record<string, { god: string; seal: string; oracle: string }>;

function starCand(star: string): OlympusCand | null {
  const e = BY_STAR[star];
  return e ? { god: e.god, seal: e.seal, oracle: e.oracle, why: star } : null;
}
function palaceCand(palace: string): OlympusCand | null {
  const god = BY_PALACE[palace];
  if (!god) return null;
  const meta = GOD_META[god] || { icon: '✦', realm: '별의 인장', virtue: '' };
  return { god, seal: meta.realm || '별의 인장', oracle: meta.virtue ? `「${meta.virtue}」이 이 자리의 열쇠예요.` : '', why: palace };
}
function sealCand(type: FlowType): OlympusCand | null {
  const s = SEAL[type];
  return s ? { god: s.god, seal: s.seal, oracle: s.oracle, why: type } : null;
}

export interface OlympusState { used: Record<string, number>; prev: string }
export function newOlympusState(): OlympusState { return { used: {}, prev: '' }; }

/** 후보(우선순위 순) 중 하나를 고른다 — 직전과 같은 신·이미 두 번 나온 신·같은 신탁 문장을 피한다. */
export function pickOlympus(cands: Array<OlympusCand | null>, st: OlympusState): OlympusPick | null {
  const list = cands.filter((c): c is OlympusCand => !!c);
  const lineKey = (c: OlympusCand) => `L:${c.god}|${c.seal}|${c.oracle}`;
  let pick: OlympusCand | undefined;
  pick = list.find(c => c.god !== st.prev && (st.used[c.god] || 0) < 2 && !st.used[lineKey(c)]);
  if (!pick) pick = list.find(c => c.god !== st.prev && !st.used[lineKey(c)]);
  if (!pick) pick = list.find(c => !st.used[lineKey(c)]);
  if (!pick && list[0]) pick = { god: list[0].god, seal: list[0].seal, oracle: '', why: list[0].why };
  if (!pick) return null;
  st.used[pick.god] = (st.used[pick.god] || 0) + 1;
  st.used[lineKey(pick)] = 1;
  st.prev = pick.god;
  return { ...pick, icon: (GOD_META[pick.god] || { icon: '✦' }).icon };
}

function yearOlympusCands(t: YearFlowTheory): Array<OlympusCand | null> {
  const m = t.marks;
  const rok = starCand(m['화록'].star);
  const kwon = starCand(m['화권'].star);
  const gi = starCand(m['화기'].star);
  const kwa = starCand(m['화과'].star);
  const ming = palaceCand(t.mingPalace);
  if (t.tone === 'expand') return [sealCand('화록'), sealCand('화권'), rok, kwon, ming];
  if (t.tone === 'guard') return [sealCand('화기'), gi, ming, sealCand('화과')];
  if (t.tone === 'mixed') return [sealCand('화기'), sealCand('화록'), rok, gi, ming];
  return [ming, kwa, sealCand('화과'), kwon];
}

// ─── 3개년 리딩 ───────────────────────────────────────────
export interface YearMarkRow { type: FlowType; star: string; palace: string; inTriad: boolean; sentence: string; chong: string }
export interface YearCard {
  year: number; rel: string; title: string; tone: FlowTone; toneName: string;
  say: MusungLine; marks: YearMarkRow[]; stack: string[]; olympus: OlympusPick | null; action: string;
}
export interface YearFlowReading { startYear: number; opening: MusungLine; cards: YearCard[]; bridges: MusungLine[]; closing: MusungLine }

function pick3<T>(arr: readonly T[], i: number): T { return arr[((i % arr.length) + arr.length) % arr.length]; }
const palaceRole = (p: string) => (FLOW_ROLE as Record<string, string>)[p] || p;

const DECADE_AGAIN: Record<string, readonly string[]> = {
  same: ['이 해도 대한궁과 같은 무대예요. 앞서 정한 기준을 그대로 이어 가세요.', '대한궁과 같은 무대가 한 해 더 이어져요. 마무리 점검을 이 해의 숙제로 삼으세요.'],
  opposite: ['이 해도 대한궁의 맞은편이에요. 대한의 목표를 점검하는 일을 이어 가세요.', '맞은편의 흔들림이 한 해 더 이어져요. 방향을 고칠지 지킬지 이 해에 정하세요.'],
  triad: ['이 해도 대한궁과 삼합이에요. 붙인 속도를 유지해도 좋아요.', '삼합의 도움이 한 해 더 이어져요. 쌓은 것을 굳히는 데 쓰세요.'],
};

function decadeLine(t: YearFlowTheory, i: number, seen: Record<string, number>): string {
  if (!t.decade || !t.decadeRel) return '';
  const again = DECADE_AGAIN[t.decadeRel];
  if (again) {
    const k = `decade|${t.decadeRel}`;
    const n = seen[k] || 0;
    seen[k] = n + 1;
    if (n > 0) return pick3(again, n - 1);
  }
  const table = FLOW_DECADE_LINE as unknown as Record<string, string | readonly string[]>;
  const v = table[t.decadeRel];
  return Array.isArray(v) ? pick3(v as readonly string[], i) : String(v || '');
}

function hitList(hits: Array<{ year: number; type: string }>, withB: string, without: string): string {
  const parts = hits.map(h => `${h.year}년 ${h.type}`);
  const last = parts[parts.length - 1];
  return [...parts.slice(0, -1), josa(last, withB, without)].join(', ');
}
const distinctYears = (hits: Array<{ year: number }>) => new Set(hits.map(h => h.year)).size;

/** 여러 해에 걸쳐 돌아오는 별·궁 — 개관에서 한 번만 말하고 카드에서는 되풀이하지 않는다. */
function threads(ts: YearFlowTheory[]): string[] {
  const byStar: Record<string, Array<{ year: number; type: string }>> = {};
  const byPalace: Record<string, Array<{ year: number; type: string }>> = {};
  for (const t of ts) for (const ty of FLOW_TYPES) {
    const m = t.marks[ty];
    if (!m.star) continue;
    (byStar[m.star] ||= []).push({ year: t.year, type: ty });
    if (m.idx >= 0) (byPalace[m.palace] ||= []).push({ year: t.year, type: ty });
  }
  const lines: string[] = [];
  for (const [star, hits] of Object.entries(byStar)) if (distinctYears(hits) >= 2) lines.push(`${josa(star, '은', '는')} ${hitList(hits, '으로', '로')} 얼굴을 바꿔 돌아와요.`);
  for (const [pal, hits] of Object.entries(byPalace)) if (distinctYears(hits) >= 2) lines.push(`${pal}에는 ${hitList(hits, '이', '가')} 차례로 지나가요.`);
  return lines.slice(0, 3);
}

const AGAIN_TAIL = (palace: string, type: string): string[] => [
  `그때 세운 ${palace} 쪽 방향을 ${type}의 결에 맞춰 이어 가면 됩니다.`,
  `같은 ${type} 숙제가 ${palace}에 한 번 더 오니 앞서 정한 기준을 다시 꺼내 보세요.`,
  `이미 한 번 풀어 본 ${palace} 자리라 이번엔 ${type}를 더 작은 단위로 점검하면 충분해요.`,
];

function markRows(t: YearFlowTheory, seen: Record<string, number>): YearMarkRow[] {
  const rows: YearMarkRow[] = [];
  for (const ty of FLOW_TYPES) {
    const m = t.marks[ty];
    if (!m.star) continue;
    if (m.idx < 0) {
      rows.push({ type: ty, star: m.star, palace: '', inTriad: false, chong: '', sentence: `${josa(m.star, '은', '는')} 내 명반에 자리가 없어 이 신호는 약하게만 와요.` });
      continue;
    }
    const key = `${m.palace}|${ty}`;
    let sentence = (FLOW_MATRIX as unknown as Record<string, Record<string, string>>)[m.palace]?.[ty] || '';
    let again = false;
    if (seen[key]) {
      again = true;
      sentence = `${seen[key]}년에 짚은 ${m.palace} ${ty}가 한 번 더 와요. ${pick3(AGAIN_TAIL(m.palace, ty), t.year)}`;
      seen[key] = t.year;
    } else seen[key] = t.year;
    rows.push({ type: ty, star: m.star, palace: m.palace, inTriad: m.inTriad, sentence, chong: ty === '화기' && m.chongPalace && !again ? `맞은편 ${m.chongPalace}도 함께 흔들려요(충).` : '' });
  }
  return rows;
}

function stackLines(t: YearFlowTheory, seen: Record<string, number>): string[] {
  const out: string[] = [];
  seen['sa|화록'] = seen['sa|화록'] || 0; seen['sa|화기'] = seen['sa|화기'] || 0;
  for (const s of t.stack) {
    const sk = `stack|${s.type}|${s.with}`;
    if (seen[sk]) {
      out.push(`${seen[sk]}년에 짚은 ${s.type === '화록' ? '쌍록' : '쌍기'}(${s.with})가 이 해에도 겹쳐요. ${pick3(s.type === '화록' ? ['그때 챙긴 영역에 이번에도 먼저 시간을 배정하세요.', '복이 쌓이는 자리이니 이번엔 얻은 것을 구조 안에 담아 두세요.'] : ['그때 정한 확인 습관을 이번 해에도 이어 가세요.', '약점이 두 번째로 드러나는 해라 확인 절차를 한 단계 더 붙이세요.'], seen['sa|'+s.type]++)}`);
      seen[sk] = t.year;
      continue;
    }
    seen[sk] = t.year;
    if (s.type === '화록') out.push(s.with === '본명' ? '본명 화록이 앉은 궁에 유년 화록이 한 번 더 겹쳐요(쌍록). 복이 한곳에 쌓이니 그 영역은 확실히 챙기세요.' : '대한 화록이 앉은 궁에 유년 화록이 겹쳐요(쌍록). 10년의 기회가 이 해에 구체적인 제안으로 나타나요.');
    else out.push(s.with === '본명' ? '본명 화기가 앉은 궁에 유년 화기가 또 겹쳐요(쌍기). 타고난 약점이 이 해에 도드라지니 그 영역은 기록과 확인으로 막으세요.' : '대한 화기가 앉은 궁에 유년 화기가 겹쳐요(쌍기). 10년의 숙제가 이 해에 현실의 일로 오니 미루지 마세요.');
  }
  if (t.crossed) out.push('화록과 화기가 같은 궁에 함께 앉았어요(록기 동궁). 받는 만큼 얽히기 쉬우니 얻는 일에는 조건을 글로 남기세요.');
  return out;
}

function bridge(ts: YearFlowTheory[], i: number, nowYear: number): MusungLine {
  const a = ts[i]; const b = ts[i + 1];
  const relA = relLabel(a.year, nowYear); const relB = relLabel(b.year, nowYear);
  const verdict = a.tone === b.tone
    ? `${josa(relB, '도', '도')} ${TONE_NAME[b.tone]}의 결이 이어집니다.`
    : `${josa(relB, '은', '는')} ${TONE_NAME[a.tone]}에서 ${josa(TONE_NAME[b.tone], '으로', '로')} 결이 바뀝니다.`;
  let detail = `무대가 ${a.mingPalace}에서 ${josa(b.mingPalace, '으로', '로')} 옮겨 가요.`;
  const gi = a.marks['화기']; const rok = a.marks['화록'];
  if (gi.idx >= 0) detail += ` ${relA} ${gi.palace}의 숙제는 해를 넘기기 전에 닫아 두세요.`;
  else if (rok.idx >= 0) detail += ` ${relA} ${rok.palace}에서 얻은 것은 ${relB}로 가져가세요.`;
  return { mood: TONE_MOOD[b.tone], verdict, detail };
}

function closing(ts: YearFlowTheory[], nowYear: number): MusungLine {
  let best = 0; let worst = 0;
  ts.forEach((t, i) => { if (t.score > ts[best].score) best = i; if (t.score < ts[worst].score) worst = i; });
  if (best === worst) return { mood: 'gentle', verdict: '세 해의 온도 차가 크지 않습니다.', detail: '그럴수록 해마다 한 가지 목표를 정해 이어 가는 쪽이 이겨요. 위 카드의 "이 해의 한 줄"을 달력에 옮겨 적어 두세요.' };
  const b = ts[best]; const w = ts[worst];
  const luck = b.marks['화록'].idx >= 0 ? b.marks['화록'].palace : b.mingPalace;
  const guard = w.marks['화기'].idx >= 0 ? w.marks['화기'].palace : w.mingPalace;
  const bRel = relLabel(b.year, nowYear); const wRel = relLabel(w.year, nowYear);
  return {
    mood: 'gentle',
    verdict: `${bRel}에 가장 힘이 실리고 ${wRel}에 가장 조심할 일이 몰립니다.`,
    detail: `${bRel}에는 ${palaceRole(luck)} 쪽에 시간을 먼저 배정하고, ${wRel}에는 ${palaceRole(guard)} 쪽 약속을 글로 남겨 두세요.`,
  };
}

export function buildZiweiYearFlowReading(chart: ZiweiDeepChart, startYear: number): YearFlowReading {
  const ts = [0, 1, 2].map(k => yearFlowTheory(chart, startYear + k));
  const seen: Record<string, number> = {};
  const st = newOlympusState();
  const toneSeq = ts.map(t => TONE_NAME[t.tone]);
  const sameAll = ts[0].tone === ts[1].tone && ts[1].tone === ts[2].tone;
  const th = threads(ts);
  const opening: MusungLine = {
    mood: 'composed',
    verdict: sameAll ? `3년 내내 ${toneSeq[0]}의 결이 이어집니다.` : `앞으로 3년은 ${toneSeq[0]} → ${toneSeq[1]} → ${josa(toneSeq[2], '으로', '로')} 흘러갑니다.`,
    detail: th.length
      ? `세 해를 한 번에 놓고 보면 겹치는 자리가 있어요. ${th.join(' ')} 이 겹침은 여기서 한 번만 말하고, 아래 카드에서는 그 해에만 해당하는 차이를 짚을게요.`
      : '세 해가 서로 다른 별과 자리를 부르니 해마다 새 과제가 와요. 아래 카드에서 해마다 달라지는 점을 하나씩 짚을게요.',
  };
  const cards: YearCard[] = ts.map((t, i) => {
    const rel = relLabel(t.year, startYear);
    const stage = `${rel}의 무대는 내 명반의 ${t.mingPalace}(${palaceRole(t.mingPalace)})이에요.`;
    const dl = decadeLine(t, i, seen);
    const say: MusungLine = { mood: TONE_MOOD[t.tone], verdict: `${josa(rel, '은', '는')} ${pick3(FLOW_TONE_VERDICT[t.tone], i)}`, detail: dl ? `${stage} ${dl}` : stage };
    return {
      year: t.year, rel, title: `${t.year}년 ${t.ganKo}${t.zhiKo}년(${t.ganji})`, tone: t.tone, toneName: TONE_NAME[t.tone],
      say, marks: markRows(t, seen), stack: stackLines(t, seen), olympus: pickOlympus(yearOlympusCands(t), st),
      action: pick3(FLOW_TONE_ACTION[t.tone], i),
    };
  });
  return { startYear, opening, cards, bridges: [bridge(ts, 0, startYear), bridge(ts, 1, startYear)], closing: closing(ts, startYear) };
}

// ─── 섹션별 한 줄(히어로·바탕·질문·오늘) ───────────────────
export interface SectionTopicInfo { id: string; keywords: string[]; palaceName?: string }
const TOPIC_NOUN: Record<string, string> = { life: '삶', career: '일', wealth: '돈', love: '연애', relationships: '사람 관계', family: '가족', health: '건강', timing: '시기' };
const TOPIC_CLOSE: Record<string, MusungLine> = {
  life: { mood: 'gentle', verdict: '삶의 큰 결은 명궁에서 시작합니다.', detail: '타고난 방식을 고치려 하지 말고, 그 방식이 잘 쓰이는 자리부터 찾아보세요.' },
  career: { mood: 'thinking', verdict: '일은 능력보다 자리가 먼저 갈립니다.', detail: '지금 자리가 맞는지 보려면 힘이 나는 순간과 닳는 순간을 하루만 적어 보세요.' },
  wealth: { mood: 'verdict', verdict: '돈은 버는 방식과 새는 구멍을 함께 봐야 합니다.', detail: '수입을 늘리기 전에 매달 빠지는 고정 지출 하나부터 점검해 보세요.' },
  love: { mood: 'gentle', verdict: '인연의 속도는 사람마다 다릅니다.', detail: '상대의 속도를 재기 전에 내가 편안한 거리를 먼저 말로 정리해 보세요.' },
  relationships: { mood: 'thinking', verdict: '사람 사이의 피로는 역할에서 생깁니다.', detail: '참고 맞추는 관계가 있다면 내가 맡은 역할의 크기부터 확인해 보세요.' },
  family: { mood: 'gentle', verdict: '가족은 가까운 만큼 말이 거칠어집니다.', detail: '고마운 일 하나를 먼저 말하고 나서 부탁을 꺼내면 대화가 달라져요.' },
  health: { mood: 'composed', verdict: '몸은 마음보다 먼저 신호를 보냅니다.', detail: '잠과 식사의 리듬부터 맞추고, 반복되는 불편은 기록해 두세요. 진단은 병원의 몫이에요.' },
  timing: { mood: 'verdict', verdict: '시기는 맞히는 것이 아니라 준비하는 것입니다.', detail: '때가 오기 전에 정리할 일 하나와 시작할 일 하나를 달력에 적어 두세요.' },
};
export function musungQuestionSay(info: SectionTopicInfo): MusungLine {
  const base = TOPIC_CLOSE[info.id] || TOPIC_CLOSE.life;
  const basis = info.palaceName ? ` ${info.palaceName}을 중심으로 읽었으니 근거가 궁금하면 아래 근거를 펼쳐 보세요.` : '';
  return { ...base, detail: base.detail + basis };
}
export function musungHeroSay(info: SectionTopicInfo): MusungLine {
  const words = info.keywords.slice(0, 3);
  const kw = words.length ? `${words.join('·')}이 이 질문의 열쇠예요. ` : '';
  return { mood: 'composed', verdict: `${TOPIC_NOUN[info.id] || '이'}에 대한 답부터 말씀드리겠습니다.`, detail: `${kw}먼저 한 줄로 결론을 드리고, 아래에서 근거와 처방을 차례로 풀어 볼게요.` };
}
export const MUSUNG_FOUNDATION_SAY: MusungLine = {
  mood: 'gentle', verdict: '명반의 바탕부터 차분히 짚겠습니다.',
  detail: '명궁과 신궁, 오행국이 정하는 기본 결이에요. 좋고 나쁨을 가르려는 게 아니라 어디에 힘을 쓰면 덜 닳는지 보려는 거예요.',
};
export const MUSUNG_TODAY_SAY: MusungLine = {
  mood: 'smile', verdict: '오늘은 숙제를 하나만 가져가시면 됩니다.',
  detail: '읽은 것을 전부 기억하려 하지 말고, 아래 한 가지만 오늘 안에 해 보세요. 작게 해도 흐름은 바뀌어요.',
};
export const MUSUNG_FLOW_INTRO = '해마다 바뀌는 천간 사화(화록·화권·화과·화기)를 내 명반 위에 겹치고, 대한·본명 사화와의 관계까지 무성이 풀어 줍니다.';
