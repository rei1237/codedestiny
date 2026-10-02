// v7 timing matrix (design docs/design/yeongnyangi-v7-chapter-catalog.md §4, §6-4).
// prepare computes the matrix once and stores it in the snapshot; chapter generation only re-applies it.
// Deterministic, no LLM. Not wired into production yet; READING_V7_ENABLED stays false.
import {DomainContext,DomainId,Evidence,FortuneInput} from './shared/contracts';
import {extendAskLocalTiming} from './ask/wrappers';
import {assertEvidenceDate} from './ask/window';
import {resolveV7Ledger} from './reading-v7-ledger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type O=Record<string,any>;
export const V7_TIMING_VERSION='v7-timing-1';
export type V7TimingMatrix={version:typeof V7_TIMING_VERSION;domain:DomainId;today:string;facts:Evidence[]};
const MONTHS=12;
const pad2=(n:unknown)=>String(n).padStart(2,'0');
const monthKey=(x:O)=>`${x?.start?.year}-${pad2(x?.start?.month)}`;

/**
 * Only saju gains rows: the wrapper's months replace the engine's calendar-year months with the 12 months
 * starting at the pillar in force on `today` (KST solar terms). The wrapper's yearlyLuck is not taken — it would
 * shrink the engine's 10 years to the 4-year window and empty yearsAhead. Ziwei already carries 10 years; vedic
 * would gain pratyantar rows v7 forbids. Saju without a birth time keeps the time-free path (decision 7).
 */
export async function buildV7TimingMatrix(context:DomainContext,input:FortuneInput,today:string,instant?:Date):Promise<V7TimingMatrix>{
  assertEvidenceDate(today);
  const matrix:V7TimingMatrix={version:V7_TIMING_VERSION,domain:context.domain,today,facts:[]};
  if(context.domain!=='saju'||!input?.personA?.birthTime)return matrix;
  const extended=(await extendAskLocalTiming({saju:context},{saju:input},today)).saju;
  const fact=extended?.facts.find(f=>f.label==='monthlyLuck');
  if(!Array.isArray(fact?.value))return matrix;
  const byMonth=new Map<string,O>();
  for(const row of fact.value as O[])if(!byMonth.has(monthKey(row)))byMonth.set(monthKey(row),row);
  const rows=[...byMonth.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0);
  // On a 절입 day the new month starts at the term's hour and minute; without the order instant, by date.
  const kst=instant&&new Date(instant.getTime()+9*3600000),now=kst&&`${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}`;
  const started=(day:string,start:O)=>day<today||(day===today&&(!now||typeof start?.hour!=='number'||`${pad2(start.hour)}:${pad2(start.minute??0)}`<=now));
  const current=rows.reduce((at,[key,row],i)=>started(`${key}-${pad2(row.start?.day)}`,row.start)?i:at,0);
  matrix.facts.push({...fact,value:rows.slice(current,current+MONTHS).map(([,row])=>row)});
  return matrix;
}

/** Re-applies a stored matrix. Replaces whole labels like the wrapper; a matrix for another domain or version fails closed. */
export function withV7Timing(context:DomainContext,matrix:V7TimingMatrix|undefined):DomainContext{
  if(!matrix)return context;
  if(matrix.version!==V7_TIMING_VERSION)throw new Error(`reading-v7-timing: unknown matrix version ${matrix.version}`);
  if(matrix.domain!==context.domain)throw new Error(`reading-v7-timing: ${matrix.domain} matrix for ${context.domain} context`);
  const replaced=new Set(matrix.facts.map(f=>f.label));
  return {...context,facts:[...context.facts.filter(f=>!replaced.has(f.label)),...matrix.facts]};
}

const josa=(word:string,consonant:string,vowel:string)=>{const c=word.charCodeAt(word.length-1)-0xac00;return c>=0&&c<11172&&c%28?consonant:vowel;};
type Part=(v:O,beforeLichun:boolean)=>string|null;
// Lead facts per domain, read from the tier-filtered ledger so a premium fact never reaches a lower tier's summary.
const SUMMARY_PARTS:Record<string,[string,Part][]>={
  saju:[
    ['yearlyLuck.{Y0}',(v,beforeLichun)=>v.pillar?`${beforeLichun?'입춘 전 지금 세운':'올해 세운'} ${v.pillar}${v.stemTenGod?`(${v.stemTenGod}${josa(v.stemTenGod,'이','가')} 들어오는 해)`:''}`:null],
    ['majorLuck.current',v=>v.cycle?.pillar?`지금 대운 ${v.cycle.pillar}${v.cycle.stemTenGod?`(${v.cycle.stemTenGod})`:''}`:null],
  ],
  ziwei:[
    ['yearlyTimeline.{Y0}',v=>v.palaceName?`올해 유년 ${v.palaceName}${Array.isArray(v.mainStars)&&v.mainStars.length?`(${v.mainStars.join('·')})`:''}`:null],
    ['majorLuck.current',v=>v.palaceName?`지금 대한 ${v.palaceName}`:null],
  ],
  vedic:[
    ['vimshottariDasha.currentMahadasha',v=>v.lord?`지금 마하다샤 ${v.lord}${v.endDate?`(${v.endDate}까지)`:''}`:null],
    ['vimshottariDasha.currentAntardasha',v=>v.lord?`안타르다샤 ${v.lord}`:null],
  ],
};
const oneLine=(s:string)=>s.replace(/\s+/g,' ').trim();

/**
 * Gives every timingRef:'summary' chapter one deterministic line about the current period and the chapter
 * that owns it. Owner and 'none' chapters get nothing; timing facts themselves stay with their owners.
 */
export function v7TimingSummaries(resolved:ReturnType<typeof resolveV7Ledger>,asOf?:string){
  const {ledger,chapters}=resolved;
  // Saju's Y0 is the 세운 in force (입춘 boundary); before 입춘 it is still last calendar year's pillar.
  const beforeLichun=ledger.domain==='saju'&&Boolean(asOf)&&Number(asOf!.slice(0,4))>ledger.baseYear;
  const ownerOf=(id:string)=>chapters.find(c=>c.owns.includes(id));
  const parts:string[]=[];
  let owner:(typeof chapters)[number]|undefined;
  for(const [pattern,format] of SUMMARY_PARTS[ledger.domain]||[]){
    const id=`${ledger.domain}.${pattern.replace('{Y0}',String(ledger.baseYear))}`,fact=ledger.facts.get(id);
    const text=fact&&format(fact.value as O,beforeLichun);
    if(!text)continue;
    parts.push(text);
    owner??=ownerOf(id);
  }
  owner??=chapters.find(c=>c.timingRef==='owner');
  const line=oneLine(owner?(parts.length?`${parts.join(' · ')} — 자세한 흐름은 「${owner.title}」 장에서 다룬다.`:`시기의 흐름은 「${owner.title}」 장에서 다룬다.`):parts.join(' · '));
  return chapters.map(c=>c.timingRef==='summary'&&line?{...c,timingSummary:line}:c);
}
