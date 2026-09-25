import { normalizeLocale } from '../../../../lib/i18n/locale-normalize.js';
import { explanationFacts } from '../shared/privacy';
import { FortuneError, type DomainId } from '../shared/contracts';
import { ASK_EVIDENCE_VERSION, type AskCategory, type AskFact, type AskTiming, type EvidenceNote,
  type EvidencePacket, type EvidenceResolution, type EvidenceSystem, type PacketInput } from './contracts';
import { tagsForEvidence } from './categories';
import { evidenceWindow, periodOverlaps } from './window';

const fields: Record<DomainId, readonly string[]> = {
  saju: ['pillars','dayMaster','pillarDetails','fiveElements','tenGods','tenGodsByPillar','seasonalBalance',
    'natalInteractions','strengthHeuristic','usefulGod','jong','shinsal','yearlyLuck','monthlyLuck','partnerChart','relationshipComparison','compatibility'],
  ziwei: ['lifePalace','bodyPalace','palaces','fourTransformations','yearlyLuck','yearlyTimeline','sanFangSiZheng','bureau','compatibility'],
  astrology: ['planets','ascendant','midheaven','northNode','southNode','houseCusps','aspects','transits','synastry'],
  vedic: ['lagna','moon','sun','planets','houses','grahas','bhavas','moonNakshatra','rahuKetu','divisionalCharts',
    'yogas','vimshottariDasha','dashaPeriods','transits','ashtakuta'],
  sukuyo: ['personA','personB','forwardDistance','reverseDistance','distanceLabel','relation'],
  tarot: ['spreadId','cards'],
};
const cross: Record<string, [EvidenceSystem, string]> = {
  todaySaju: ['saju','todaySaju'], todaySukuyo: ['sukuyo','todaySukuyo'],
  todayVedic: ['vedic','todayVedic'], todayNumerology: ['numerology','todayNumerology'],
  sajuYearlyLuck: ['saju','yearlyLuck'], sajuMonthlyLuck: ['saju','monthlyLuck'],
};
const schools:Record<DomainId,string>={
  saju:'code-destiny-screen / KST',ziwei:'Korean lunar calendar / KST',
  astrology:'tropical / Placidus',vedic:'sidereal / Lahiri / whole-sign',
  sukuyo:'astronomical 27 mansions',tarot:'Rider-Waite-Smith',
};
const professional = /usefulGod|yongshin|heeShin|kijishin|jong|dasha|divisional|yogas|fourTransformations|sanFangSiZheng/i;
const excluded = /majorLuck|daewoon|daeun|daehan|대운|대한|prompt|summaryForPrompt|axisScores|chartSummary|calculationMeta|image|url|^pct$|^verdict$|^doshas$|^lunar$|birthTimeContext/i;
const unknownSaju = new Set(['dayMaster','pillars','pillarDetails','fiveElements','tenGods','tenGodsByPillar','seasonalBalance']);
const unknownFields = /^(hour|h|hourPillar|시주)$/i;
const record = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};

function clean(value: unknown, premium: boolean, timeKnown: boolean): unknown {
  if (Array.isArray(value)) return value.map(v => clean(v, premium, timeKnown)).filter(v => v !== undefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    !excluded.test(key) && (premium || !professional.test(key)) && (timeKnown || !unknownFields.test(key)))
    .map(([key,v]) => [key,clean(v,premium,timeKnown)]));
}
function canonicalValue(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonicalValue);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0)
    .map(([key,item])=>[key,canonicalValue(item)]));
}
const hasValue = (value: unknown) => value !== undefined && value !== null
  && (typeof value !== 'object' || Object.keys(value).length > 0);

function pieces(label: string, value: unknown): [string, unknown][] {
  if (Array.isArray(value)) return value.map((item, i) => {
    const row = record(item);
    const key = row.positionKey ?? row.position ?? row.name ?? row.year ?? row.house ?? i;
    return [String(key), item];
  });
  if (['pillars','pillarDetails','tenGodsByPillar','planets','divisionalCharts','rahuKetu'].includes(label))
    return Object.entries(record(value));
  return [['',value]];
}

type Range = {from: string; to: string; resolution: EvidenceResolution};
function timingRange(label: string, value: unknown, today: string): Range | undefined {
  const v = record(value);
  if (/^today/.test(label)) return {from:today,to:today,resolution:'day'};
  if (/yearly/.test(label) && Number.isInteger(v.year))
    return {from:String(v.year),to:String(v.year),resolution:'year'};
  // A solar-term start is a point, not an invented civil-month forecast interval.
  if (label === 'monthlyLuck') {
    const at = record(v.start);
    if ([at.year,at.month,at.day,at.hour,at.minute].every(Number.isInteger)) {
      const p = (n: number) => String(n).padStart(2,'0');
      const point = `${at.year}-${p(at.month)}-${p(at.day)}T${p(at.hour)}:${p(at.minute)}:00+09:00`;
      return {from:point,to:point,resolution:'instant'};
    }
  }
  if (label === 'transits' && typeof v.calculatedAt === 'string')
    return {from:v.calculatedAt,to:v.calculatedAt,resolution:'instant'};
  if (label === 'transits' && typeof v.date === 'string')
    return {from:v.date,to:v.date,resolution:'day'};
  if (label === 'dashaPeriods' || label === 'vimshottariDasha') {
    const from = v.startDate || v.start, to = v.endDate || v.end;
    if (typeof from === 'string' && typeof to === 'string') return {from,to,resolution:'period'};
  }
}
function timedPieces(label: string, value: unknown): [string, unknown][] {
  if (label === 'vimshottariDasha') {
    const v=record(value);
    return ['currentMahadasha','currentAntardasha'].flatMap(key=>v[key]?[[key,v[key]] as [string,unknown]]:[]);
  }
  return pieces(label,value);
}

/** Pure projection: no ephemeris, random draw, clock, database, or LLM calls. */
export function buildEvidencePacket(input: PacketInput): EvidencePacket {
  const window=evidenceWindow(input.today), premium=['tuna','assorted','omakase'].includes(input.tier);
  const notes: EvidenceNote[]=[];
  const note=(code: EvidenceNote['code'], system?: EvidenceSystem) => {
    if(!notes.some(n=>n.code===code&&n.system===system)) notes.push({code,...(system?{system}:{})});
  };
  if(!input.birthTimeKnown) note('BIRTH_TIME_UNKNOWN');
  if(input.partnerTimeKnown===false) note('PARTNER_TIME_UNKNOWN');
  const atoms: (Omit<AskFact,'id'> | Omit<AskTiming,'id'>)[]=[];
  const engines=Object.keys(input.contexts).sort() as DomainId[];
  for(const domain of engines) {
    const ctx=input.contexts[domain]!;
    if(ctx.domain!==domain || !fields[domain] || new Set(ctx.facts.map(f=>f.id)).size!==ctx.facts.length)
      throw new FortuneError('INVALID_CONTEXT',500);
    if(ctx.limitations.length) note('ENGINE_LIMITATIONS',domain);
    for(const fact of ctx.facts) {
      const mapped=cross[fact.label], [system,label]=mapped || [domain,fact.label];
      if(mapped&&input.birthProfileAvailable===false)continue;
      if(!mapped&&!fields[domain].includes(label)) continue;
      if(label==='vimshottariDasha'&&ctx.facts.some(f=>f.label==='dashaPeriods'))continue;
      if(label==='yearlyTimeline'&&ctx.facts.some(f=>f.label==='yearlyLuck'&&Array.isArray(f.value)))continue;
      if(!premium&&professional.test(label)) continue;
      const relationship=/partner|relationship|compatibility|synastry|ashtakuta|^personB$|^relation$|Distance|distanceLabel/i.test(label);
      const subject=label==='personB'||label==='partnerChart'?'partner':relationship?'relationship':'self';
      // The primary Vedic chart's strict-Swiss flag does not establish transit precision.
      if(system==='vedic'&&label==='transits'&&record(fact.value).precisionVerified!==true) {
        note('UNVERIFIED_TRANSIT_OMITTED',system); continue;
      }
      if((relationship&&input.partnerTimeKnown===false)
        || (!input.birthTimeKnown && system!=='tarot' && system!=='numerology'
          && !(system==='saju'&&unknownSaju.has(label)))) {
        note('TIME_DEPENDENT_OMITTED',system); continue;
      }
      // A partner chart supplied without a validated partner profile is not evidence.
      if(relationship&&input.partnerTimeKnown===undefined) {note('PARTNER_NOT_PROVIDED',system);continue;}
      for(const [path,raw] of timedPieces(label,fact.value)) {
        const range=timingRange(label,raw,input.today);
        const isTiming=/^today|yearly|monthlyLuck|transits|[Dd]asha/.test(label);
        if(isTiming && (!range || !periodOverlaps(range.from,range.to,window))) continue;
        let value=explanationFacts(clean(raw,premium,input.birthTimeKnown));
        if(system==='ziwei'&&/yearly/.test(label)) {
          // The current engine copies natal palace transformations into yearlyLuck.
          // Do not present them as newly calculated annual stem transformations.
          const {transformations:_natalTransformations,...annual}=record(value);
          value=annual;
        }
        if(!input.birthTimeKnown&&system==='saju'&&unknownFields.test(path)) continue;
        if(label==='palaces') {
          // Exclude embedded decade cycles, even when the root majorLuck was not selected.
          value=clean(value,premium,input.birthTimeKnown);
        }
        if(!hasValue(value)) continue;
        atoms.push({
          group:range?'timing':relationship?'relationship':system==='tarot'?'cards':'structure',
          label:label+(path?'.'+path:''),value,tags:tagsForEvidence(label),subject,
          timeDependent:system==='saju'
            ? (['pillars','pillarDetails','tenGodsByPillar'].includes(label)?unknownFields.test(path)
              : ['dayMaster','seasonalBalance'].includes(label)?false
                : unknownSaju.has(label)?input.birthTimeKnown:true)
            : system!=='tarot'&&system!=='numerology',
          access:professional.test(label)?'professional':'standard',
          source:{system,contextDomain:domain,factId:fact.id,path,
            engineVersion:mapped?'code-destiny-daily-cross-v1':ctx.engineVersion},
          ...range,
        } as Omit<AskFact,'id'> | Omit<AskTiming,'id'>);
      }
    }
  }
  // Cross facts may repeat in fusion contexts. Keep one canonical copy per value/source.
  const unique=new Map<string, typeof atoms[number]>();
  const key=(a:typeof atoms[number])=>JSON.stringify([a.source.system,a.subject,a.label,
    'from' in a?a.from:'','to' in a?a.to:'',canonicalValue(a.value)]);
  for(const atom of atoms) if(!unique.has(key(atom))) unique.set(key(atom),atom);
  const sorted=[...unique.values()].sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0);
  let f=0,t=0;
  const facts: AskFact[]=[], timing: AskTiming[]=[];
  for(const atom of sorted) {
    if('from' in atom) timing.push({...atom,id:'T'+String(++t).padStart(3,'0')} as AskTiming);
    else facts.push({...atom,id:'F'+String(++f).padStart(3,'0')});
  }
  // The window is an allowed query range, never a claim of complete temporal coverage.
  for(const system of engines) note('TIMING_COVERAGE_PARTIAL',system);
  return {packet_version:ASK_EVIDENCE_VERSION,today:input.today,locale:normalizeLocale(input.locale),
    engines,schools:Object.fromEntries(engines.map(id=>[id,schools[id]])),tier:input.tier,window,reliability:{birth_time_known:input.birthTimeKnown,
      time_dependent_fields_valid:input.birthTimeKnown,notes},facts,timing,
    partner:input.partnerTimeKnown===undefined?null:{birth_time_known:input.partnerTimeKnown}};
}

/** Slice only after assigning IDs. Keep the full packet in the owned snapshot. */
export function sliceEvidencePacket(packet: EvidencePacket, category: AskCategory): EvidencePacket {
  if(category==='other') return {...packet,facts:[...packet.facts],timing:[...packet.timing]};
  return {...packet,facts:packet.facts.filter(f=>f.tags.includes(category)),
    timing:packet.timing.filter(f=>f.tags.includes(category))};
}
