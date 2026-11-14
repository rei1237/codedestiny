import './astro-reading.css';
import AstrologyChartWheel from '../../../components/fortune/AstrologyChartWheel';
import {normalizeChartData} from '../../../utils/astrology/chartFormat';
import type {RawWesternChart,RawPlanetLike,RawAspectLike} from '../../../types/astrology';
export type AstroChart={ok:boolean;planets:Array<RawPlanetLike&{name:string}>;angles:{ascendant:RawPlanetLike;midheaven:RawPlanetLike};houses:Array<{longitude:number}>;aspects:RawAspectLike[]};
export default function AstroChartView({result,timeKnown}:{result:AstroChart;timeKnown:boolean}){
 const chart:RawWesternChart={planets:Object.fromEntries(result.planets.map(p=>[p.name,{...p,...(!timeKnown?{house:undefined}:{})}])),aspects:result.aspects,...(timeKnown?{ascendant:result.angles.ascendant,midheaven:result.angles.midheaven,houseCusps:result.houses.map(h=>h.longitude)}:{})};
 const normalized=normalizeChartData(chart);
 return <section><h2>태어난 순간의 별자리</h2>{timeKnown?<div className="toss-astro-wheel" style={{background:'#161827',borderRadius:16,padding:8}}><AstrologyChartWheel chart={chart}/></div>:<p>태어난 시각을 몰라 정오의 행성을 기준으로 읽어요. 상승점과 하우스는 표시하지 않아요.</p>}
 <dl className="daily-basis">{normalized.planets.map(p=><div key={p.id}><dt>{p.label}</dt><dd>{p.sign.labelKo} {p.degreeInSign.toFixed(1)}°{timeKnown&&p.house?` · ${p.house}하우스`:''}{p.retrograde?' · 역행':''}</dd></div>)}</dl>
 <details><summary>행성 사이의 각도</summary><dl className="daily-basis">{normalized.aspects.map(a=><div key={a.id}><dt>{normalized.planets.find(p=>p.id===a.from)?.label||a.from} · {normalized.planets.find(p=>p.id===a.to)?.label||a.to}</dt><dd>{a.typeLabelKo}{a.orb!==null?` · 오브 ${a.orb.toFixed(1)}°`:''}</dd></div>)}</dl></details></section>;
}
