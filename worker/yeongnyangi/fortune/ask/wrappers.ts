import { domains } from '../index';
import { buildSubDasha, nakshatraInfo } from '../../../lib/vedic-derived-calculations.js';
import { buildNeoAstroSynastry } from '../../../lib/neo-synastry.js';
import { ashtakutaFromMoon } from '../../../lib/nakshatra-ashtakuta.js';
import { buildSajuLoveCompatibility, buildZiweiLoveCompatibility } from '../../../lib/master-love-codex-compat.js';
import { westernTransitAspects } from '../../../lib/guardian-fortune/expert-evidence.js';
import { FortuneError, type DomainContext, type DomainId, type Evidence, type FortuneInput } from '../shared/contracts';
import { evidenceWindow, assertEvidenceDate } from './window';

export const contextValues=(c: DomainContext): Record<string, any> =>
  Object.fromEntries(c.facts.map(f=>[f.label,f.value]));
const fact=(domain:DomainId,label:string,value:unknown):Evidence=>({id:`${domain}.${label}`,label,value});
function withFacts(context:DomainContext,extra:Evidence[]):DomainContext {
  const replacements=new Set(extra.map(f=>f.label));
  return {...context,facts:[...context.facts.filter(f=>!replacements.has(f.label)),...extra]};
}

/** Reuse engine period calculations. Never calculate a pillar, star, or dasha here. */
export async function extendAskLocalTiming(
  contexts: Partial<Record<DomainId,DomainContext>>,
  inputs: Partial<Record<DomainId,FortuneInput>>,
  today: string,
):Promise<Partial<Record<DomainId,DomainContext>>> {
  const window=evidenceWindow(today), result={...contexts};
  const first=Number(window.from.slice(0,4)),last=Number(window.to.slice(0,4));
  for(const id of ['saju','ziwei'] as const) {
    const context=contexts[id],input=inputs[id];
    if(!context||!input?.personA?.birthTime)continue;
    const yearly:unknown[]=[], monthly:unknown[]=[];
    // At most four civil years. No Swiss/network calls or unbounded month loop.
    for(let year=first;year<=last;year++) {
      const row=await domains[id].calculate({...input,personB:undefined,readingMode:'personal'},{asOf:`${year}-07-01`});
      const values=contextValues(row);
      const years=Array.isArray(values.yearlyLuck)?values.yearlyLuck:[values.yearlyLuck];
      yearly.push(...years.filter(v=>v?.year===year));
      if(id==='saju'&&Array.isArray(values.monthlyLuck))monthly.push(...values.monthlyLuck);
    }
    result[id]=withFacts(context,[
      fact(id,'yearlyLuck',yearly),
      ...(id==='saju'?[fact(id,'monthlyLuck',monthly)]:[fact(id,'yearlyTimeline',yearly)]),
    ]);
  }
  if(contexts.vedic && inputs.vedic?.personA?.birthTime)
    result.vedic=withFacts(contexts.vedic,[fact('vedic','dashaPeriods',vedicPeriods(contexts.vedic,window))]);
  return result;
}

/** Iterate existing period boundaries; buildSubDasha remains the sole calculator. */
export function vedicPeriods(context:DomainContext, window:{from:string;to:string}) {
  const values=contextValues(context);
  const periods=values.dasha?.periods||values.vimshottariDasha?.periods||[];
  const start=Date.parse(window.from+'T00:00:00Z'), end=Date.parse(window.to+'T23:59:59Z');
  const result:Record<string,unknown>[]=[];
  for(const p of periods) {
    const parent={lord:p.lord,start:p.start||p.startDate,end:p.end||p.endDate};
    let cursor=Math.max(start,Date.parse(parent.start));
    const until=Math.min(end,Date.parse(parent.end));
    if(!Number.isFinite(cursor)||!Number.isFinite(until)||cursor>=until)continue;
    result.push({...parent,level:'mahadasha'});
    // The source system has nine children per period. Bound traversal against malformed output.
    for(let n=0;n<9&&cursor<until;n++) {
      const antar=buildSubDasha(parent,new Date(cursor));
      if(!antar)break;
      result.push({...antar,level:'antardasha'});
      let childCursor=cursor;
      const childEnd=Math.min(until,Date.parse(antar.end));
      for(let j=0;j<9&&childCursor<childEnd;j++) {
        const child=buildSubDasha(antar,new Date(childCursor));
        if(!child)break;
        result.push({...child,level:'pratyantar'});
        const next=Date.parse(child.end);
        if(!Number.isFinite(next)||next<=childCursor)break;
        childCursor=next;
      }
      const next=Date.parse(antar.end);
      if(!Number.isFinite(next)||next<=cursor)break;
      cursor=next;
    }
  }
  return result;
}

/** Both contexts must already belong to validated profiles; this helper never loads users. */
export function projectAskCompatibility(self:DomainContext,partner:DomainContext):Evidence | null {
  if(self.domain!==partner.domain)throw new FortuneError('INVALID_CONTEXT',500);
  const a=contextValues(self),b=contextValues(partner);
  if(self.domain==='saju') {
    const shape=(v:Record<string,any>)=>({...v,yearPillar:v.pillars?.year,
      monthPillar:v.pillars?.month,dayPillar:v.pillars?.day,hourPillar:v.pillars?.hour});
    return fact('saju','compatibility',buildSajuLoveCompatibility({selfSaju:shape(a),partnerSaju:shape(b)}));
  }
  if(self.domain==='ziwei')
    return fact('ziwei','compatibility',buildZiweiLoveCompatibility({selfZiwei:a,partnerZiwei:b}));
  if(self.domain==='astrology') {
    const value=buildNeoAstroSynastry({resolved:{swissChart:a}},{resolved:{swissChart:b}});
    return value?fact('astrology','synastry',value):null;
  }
  if(self.domain==='vedic') {
    if(!Number.isFinite(a.moon?.longitude)||!Number.isFinite(b.moon?.longitude))return null;
    const value=ashtakutaFromMoon({
      nakIndexA:nakshatraInfo(a.moon.longitude).index,moonLonA:a.moon.longitude,genderA:undefined,
      nakIndexB:nakshatraInfo(b.moon.longitude).index,moonLonB:b.moon.longitude,genderB:undefined,
    });
    return value?fact('vedic','ashtakuta',value):null;
  }
  return null; // Sukuyo already owns directional relation calculation; tarot has no birth compatibility.
}

/** Accept only a verified Swiss transit sample; do not turn a sample into a whole-month interval. */
export function projectAskWesternTransit(natal:DomainContext, sample:Record<string,any>, date:string):Evidence {
  assertEvidenceDate(date);
  if(natal.domain!=='astrology'||sample.fallbackUsed!==false
    || !/swiss/i.test(String(sample.source||''))||!sample.planets)
    throw new FortuneError('PRECISION_UNAVAILABLE',503);
  return fact('astrology','transits',westernTransitAspects(contextValues(natal),sample,date));
}
