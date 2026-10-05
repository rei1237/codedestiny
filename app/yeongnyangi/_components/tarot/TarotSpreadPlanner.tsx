'use client';
import {useMemo} from 'react';
import {recommendTarotSpread,tarotQuestionPresets,questionFeatures} from '@/lib/tarot/yeongnyangi-spread-recommend.mjs';
import {yeongnyangiSpreads,getYeongnyangiSpread,tierAllowsSpread} from '@/lib/tarot/yeongnyangi-spread-catalog.mjs';
import {tarotRelationStatuses,tarotPeriods,type TarotSpreadInputs} from '@/worker/yeongnyangi/fortune/tarot/spread-v3';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import {tarotSpreadCopyFor} from '../../_lib/tarot-spread-copy';
import {localizedSpread} from '../../_lib/tarot-catalog-locales';
import {tarotInputLabel} from '../../_lib/tarot-input-locales';
import {localizedTier} from '../../_lib/consultation-locale-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import TarotSpreadLayout from './TarotSpreadLayout';
import styles from './tarot-spread.module.css';

// manual=false follows the recommendation for the current question and tier; a direct pick sticks until a new preset.
export type TarotPlan={presetId:string;spreadId:string;manual:boolean;options:{a:string;b:string};period:''|keyof typeof tarotPeriods;relationStatus:''|keyof typeof tarotRelationStatuses};
export const emptyTarotPlan:TarotPlan={presetId:'',spreadId:'',manual:false,options:{a:'',b:''},period:'',relationStatus:''};
type Spread=NonNullable<ReturnType<typeof getYeongnyangiSpread>>;
const DEFAULT_SPREAD='yn_knot_three';

export const fishName=(fishId:string)=>products.find(p=>p.domain==='tarot'&&p.readingKind==='single'&&p.fishId===fishId)?.fishName||fishId;
const needs=(spread:Spread,input:'options'|'period'|'relationStatus')=>(spread.requiredInputs as readonly string[]).includes(input);

export function tarotRecommendation(plan:TarotPlan,question:string,tier:string){
 const options=plan.options.a.trim()&&plan.options.b.trim()?plan.options:undefined;
 return question.trim()||plan.presetId?recommendTarotSpread({presetId:plan.presetId||undefined,question,options,period:plan.period||undefined,tier}):null;
}
/** The spread the order will be prepared with: a direct pick, else the recommendation that fits the tier. */
export function plannedSpread(plan:TarotPlan,question:string,tier:string):Spread{
 const id=plan.manual?plan.spreadId:tarotRecommendation(plan,question,tier)?.bestInTier||DEFAULT_SPREAD;
 return getYeongnyangiSpread(id)||getYeongnyangiSpread(DEFAULT_SPREAD)!;
}
/** Only the inputs this spread uses and the question did not already answer go to prepare. */
export function plannedInputs(plan:TarotPlan,spread:Spread):TarotSpreadInputs{
 const a=plan.options.a.trim(),b=plan.options.b.trim();
 return {...(needs(spread,'options')&&a&&b?{options:{a,b}}:{}),...(needs(spread,'period')&&plan.period?{period:plan.period}:{}),
  ...(needs(spread,'relationStatus')&&plan.relationStatus?{relationStatus:plan.relationStatus}:{})};
}

/** A pre-login draft comes back from storage as untrusted JSON; keep only known ids and bounded text. */
export function restoreTarotPlan(value:unknown):TarotPlan{
 if(!value||typeof value!=='object')return emptyTarotPlan;
 const raw=value as Record<string,unknown>,options=(raw.options&&typeof raw.options==='object'?raw.options:{}) as Record<string,unknown>;
 const text=(v:unknown)=>typeof v==='string'?v.slice(0,40):'';
 const presetId=typeof raw.presetId==='string'&&tarotQuestionPresets.some(p=>p.id===raw.presetId)?raw.presetId:'';
 const spreadId=typeof raw.spreadId==='string'&&getYeongnyangiSpread(raw.spreadId)?raw.spreadId:'';
 const period=typeof raw.period==='string'&&Object.prototype.hasOwnProperty.call(tarotPeriods,raw.period)?raw.period as TarotPlan['period']:'';
 const relationStatus=typeof raw.relationStatus==='string'&&Object.prototype.hasOwnProperty.call(tarotRelationStatuses,raw.relationStatus)?raw.relationStatus as TarotPlan['relationStatus']:'';
 return {presetId,spreadId,manual:raw.manual===true&&Boolean(spreadId),options:{a:text(options.a),b:text(options.b)},period,relationStatus};
}

export default function TarotSpreadPlanner({locale='ko',question,onQuestion,plan,onPlan,tier,onTier,disabled,notice}:{locale?:ReadingLocale;question:string;onQuestion:(value:string)=>void;plan:TarotPlan;onPlan:(plan:TarotPlan)=>void;tier:string;onTier:(fishId:string,cards:number)=>void;disabled?:boolean;notice?:string}){
 const copy=tarotSpreadCopyFor(locale);
 const presets=tarotQuestionPresets.map(p=>({...p,question:tarotInputLabel(p.id,locale,p.question)}));
 const rec=useMemo(()=>tarotRecommendation(plan,question,tier),[plan,question,tier]);
 const spread=localizedSpread(plannedSpread(plan,question,tier),locale);
 const askedPeriod=useMemo(()=>Boolean(questionFeatures({question}).period),[question]);
 const choose=(next:Spread)=>{
  onPlan({...plan,spreadId:next.id,manual:true});
  if(!tierAllowsSpread(tier,next)&&next.minTier)onTier(next.minTier,next.cardCount);
 };
 const spreadButton=(source:Spread,tag?:string)=>{const item=localizedSpread(source,locale);return <button type="button" key={item.id} className={styles.choice} aria-pressed={spread.id===item.id} disabled={disabled} onClick={()=>choose(item)}>
  {tag&&<i>{tag}</i>}<strong>{item.title}</strong><span>{item.summary}</span>
  <small>{copy.cards(item.cardCount)}{!tierAllowsSpread(tier,item)&&item.minTier?` · ${copy.tierNeeded(localizedTier(item.minTier,locale))}`:''}</small>
 </button>;};
 const suggested=rec?[rec.primary,...rec.alternatives].map(id=>getYeongnyangiSpread(id)).filter((item):item is Spread=>Boolean(item)):[];
 return <section className={styles.planner} aria-labelledby="tarot-question-heading" lang={locale}>
  <div>
   <h2 id="tarot-question-heading">{copy.questionHeading}</h2>
   <p>{copy.questionIntro}</p>
  </div>
  <div className={styles.chips} role="group" aria-label={copy.presetsLabel}>{presets.map(preset=><button type="button" key={preset.id} aria-pressed={plan.presetId===preset.id} disabled={disabled} onClick={()=>{onQuestion(preset.question);onPlan({...plan,presetId:preset.id,spreadId:'',manual:false});}}>{preset.question}</button>)}</div>
  <label htmlFor="consultation-question">{copy.questionLabel}
   <textarea id="consultation-question" rows={3} maxLength={1000} value={question} disabled={disabled} placeholder={copy.questionPlaceholder}
    onChange={event=>{const value=event.target.value;onQuestion(value);const preset=presets.find(p=>p.id===plan.presetId);if(preset&&preset.question!==value)onPlan({...plan,presetId:''});}}/>
  </label>
  <p className={styles.hint}>{copy.questionPrivacy}</p>

  <div>
   <h3>{copy.recommendHeading}</h3>
   {rec?<div className={styles.reason}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={56} height={56} alt=""/><p>{locale==='ko'?rec.reason:localizedSpread(getYeongnyangiSpread(rec.primary)!,locale).summary}{rec.tierNote?` ${locale==='ko'?rec.tierNote:copy.tierNeeded(localizedTier(getYeongnyangiSpread(rec.primary)!.minTier!,locale))}`:''}</p></div>:<p className={styles.hint}>{copy.recommendEmpty}</p>}
  </div>
  {suggested.length>0&&<div className={styles.choices} role="group" aria-label={copy.recommendHeading}>{suggested.map((item,i)=>spreadButton(item,i===0?copy.primary:copy.alternative))}</div>}
  <details className={styles.direct}>
   <summary>{copy.chooseDirect}</summary>
   <h4>{copy.groupOriginal}</h4>
   <div className={styles.choices}>{yeongnyangiSpreads.filter(item=>item.source.kind!=='traditional').map(item=>spreadButton(item))}</div>
   <h4>{copy.groupTraditional}</h4>
   <div className={styles.choices}>{yeongnyangiSpreads.filter(item=>item.source.kind==='traditional').map(item=>spreadButton(item))}</div>
  </details>
  {notice&&<p className={styles.notice} role="status">{notice}</p>}

  {(needs(spread,'options')||needs(spread,'period')&&!askedPeriod||needs(spread,'relationStatus'))&&<fieldset className={styles.planner} disabled={disabled}>
   <legend><h3>{copy.inputsHeading}</h3></legend>
   <p className={styles.hint}>{copy.inputsOptional}</p>
   {needs(spread,'options')&&<div className={styles.pair}>
    <label>{copy.optionA}<input type="text" maxLength={40} value={plan.options.a} placeholder={copy.optionPlaceholderA} onChange={e=>onPlan({...plan,options:{...plan.options,a:e.target.value}})}/></label>
    <label>{copy.optionB}<input type="text" maxLength={40} value={plan.options.b} placeholder={copy.optionPlaceholderB} onChange={e=>onPlan({...plan,options:{...plan.options,b:e.target.value}})}/></label>
   </div>}
   {needs(spread,'period')&&!askedPeriod&&<div><p>{copy.periodLabel}</p><div className={styles.chips} role="group" aria-label={copy.periodLabel}>{(Object.keys(tarotPeriods) as (keyof typeof tarotPeriods)[]).map(id=><button type="button" key={id} aria-pressed={plan.period===id} onClick={()=>onPlan({...plan,period:plan.period===id?'':id})}>{tarotInputLabel(id,locale,tarotPeriods[id],true)}</button>)}</div></div>}
   {needs(spread,'relationStatus')&&<div><p>{copy.relationLabel}</p><div className={styles.chips} role="group" aria-label={copy.relationLabel}>
    <button type="button" aria-pressed={!plan.relationStatus} onClick={()=>onPlan({...plan,relationStatus:''})}>{copy.relationNone}</button>
    {(Object.keys(tarotRelationStatuses) as (keyof typeof tarotRelationStatuses)[]).map(id=><button type="button" key={id} aria-pressed={plan.relationStatus===id} onClick={()=>onPlan({...plan,relationStatus:id})}>{tarotInputLabel(id,locale,tarotRelationStatuses[id])}</button>)}
   </div></div>}
  </fieldset>}

  <div>
   <h3>{copy.previewHeading}</h3>
   <p><strong>{spread.title}</strong> · {copy.cards(spread.cardCount)}</p>
   <p>{spread.summary}</p>
   <TarotSpreadLayout spread={spread} locale={locale}/>
  </div>
 </section>;
}
