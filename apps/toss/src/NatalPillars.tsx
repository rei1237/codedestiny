import {calculateNatalSaju} from '@/lib/korean-calendar/natal.js';
import {branchIndexOf,formatPillar,stemIndexOf} from '@/lib/korean-calendar/labels.js';
import {elementOfStem,elementOfBranch,tenGodOfStem,type FiveElement} from '@/lib/five-element-colors';
import {birthPayload,type BirthInput} from './BirthFields';
import PillarAlmanac from './PillarAlmanac';
import '../../../js/core/saju/manse-shinsal.js';
const labels={year:'연주',month:'월주',day:'일주',hour:'시주'} as const;
export function readChart(birth:BirthInput){
  const {location}=birthPayload(birth);
  if(!birth.unknown&&!birth.time)throw new Error('INVALID_BIRTH_TIME');
  const {pillars,calculationMeta}=calculateNatalSaju({birthDate:birth.date,birthTime:birth.time,birthTimeUnknown:birth.unknown,
    calendarType:birth.calendar,birthPlace:{name:location.label,latitude:location.lat,longitude:location.lng,timezone:location.tz}});
  const elements:Record<FiveElement,number>={목:0,화:0,토:0,금:0,수:0};
  const dayStem=formatPillar(stemIndexOf(pillars.day[0]),branchIndexOf(pillars.day[1]),'hangul')[0];
  const rows=(Object.keys(labels) as (keyof typeof labels)[]).map(key=>{
    const hanja=pillars[key];
    if(!hanja)return {key,hanja:null,korean:null,relation:null};
    const korean=formatPillar(stemIndexOf(hanja[0]),branchIndexOf(hanja[1]),'hangul');
    const stem=elementOfStem(korean[0]),branch=elementOfBranch(korean[1]);
    if(!stem||!branch)throw new Error('INVALID_PILLAR');
    elements[stem]++;elements[branch]++;
    return {key,hanja,korean,relation:key==='day'?'일간':tenGodOfStem(dayStem,korean[0])};
  });
  const pillar=(value:string|null|undefined)=>({g:value?.[0]||'',j:value?.[1]||''});
  const civil=calculationMeta.civil;
  const layerBirth=birth.unknown?null:{birthDate:[civil.year,String(civil.month).padStart(2,'0'),String(civil.day).padStart(2,'0')].join('-'),
    birthTime:birth.time,timezone:location.tz,latitude:location.lat,longitude:location.lng};
  return {rows,elements,layerBirth,lotto:{termClock:calculationMeta.termClock,civilYear:calculationMeta.civil.year},dashboard:{y:pillar(pillars.year),m:pillar(pillars.month),d:pillar(pillars.day),h:pillar(pillars.hour)}};
}
type Stars={basis:string;twelve:{key:string;label:string;name:string}[];extras:{name:string;positions:string[]}[]};
declare global {interface Window {CdManseShinsal:{build:(pillars:ReturnType<typeof readChart>['dashboard'])=>Stars}}}
export function NatalPillars({chart,unknown}:{chart:ReturnType<typeof readChart>;unknown:boolean}){
 const stars=window.CdManseShinsal.build(chart.dashboard);
 return <><PillarAlmanac pillars={chart.rows.map(r=>({key:r.key,ganji:r.hanja,tenGod:r.relation}))} counts={chart.elements} basis="surface"
   unknownNote={unknown?'태어난 시각을 몰라 시주는 비워 두었어요. 절기가 바뀌는 날에는 정오 기준으로 본 연주와 월주가 실제와 다를 수 있어요.':undefined}/>
   <section><h2>명식의 신살</h2><p>{stars.basis}</p><dl>{stars.twelve.map(row=><div key={row.key}><dt>{row.label}</dt><dd>{row.name}</dd></div>)}</dl>
   {stars.extras.length>0&&<ul>{stars.extras.map(row=><li key={row.name}>{row.name} · {row.positions.join(', ')}</li>)}</ul>}</section></>;
}
