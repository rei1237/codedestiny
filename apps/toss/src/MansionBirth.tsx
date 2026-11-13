import {PLACE_PRESETS} from '../../../lib/fortune/nakshatra-places.mjs';
import {ianaOffsetHours} from '../../../lib/fortune/nakshatra-timezone.mjs';
export type Person={date:string;time:string;unknown:boolean;city:string;gender:string;location?:{label:string;latitude:string;longitude:string;timezone:string}};
export const emptyPerson=():Person=>({date:'',time:'',unknown:false,city:'',gender:''});
export function PersonFields({title,value,onChange,disabled=false}:{title:string;value:Person;onChange:(p:Person)=>void;disabled?:boolean}){
  const set=(patch:Partial<Person>)=>onChange({...value,...patch});
  return <fieldset className="birth-fields" disabled={disabled}><legend>{title}</legend>
    <label>양력 생년월일<input type="date" required min="1900-01-01" max="2100-12-31" value={value.date} onChange={e=>set({date:e.target.value})}/></label>
    <label className="check"><input type="checkbox" checked={value.unknown} onChange={e=>set({unknown:e.target.checked})}/>태어난 시각을 몰라요</label>
    {!value.unknown&&<label>태어난 시각<input type="time" required value={value.time} onChange={e=>set({time:e.target.value})}/></label>}
    <label>태어난 도시와 국가<select required value={value.city} onChange={e=>set({city:e.target.value,location:undefined})}><option value="">선택해 주세요</option>{value.location&&!PLACE_PRESETS.some(p=>p.label===value.location?.label)&&<option>{value.location.label}</option>}{PLACE_PRESETS.map(p=><option key={p.label}>{p.label}</option>)}</select></label>
    <label>성별<select value={value.gender} onChange={e=>set({gender:e.target.value})}><option value="">선택하지 않음</option><option value="male">남성</option><option value="female">여성</option></select></label>
  </fieldset>;
}
export function birth(person:Person){
  const place=person.location?.label===person.city?person.location:PLACE_PRESETS.find(p=>p.label===person.city);
  if(!place)throw Error('INVALID_PLACE');
  const [year,month,day]=person.date.split('-').map(Number);
  const [hour,minute]=(person.unknown?'12:00':person.time).split(':').map(Number);
  return {year,month,day,hour,minute,timeUnknown:person.unknown,gender:person.gender,
    lat:Number(place.latitude),lon:Number(place.longitude),timezone:ianaOffsetHours(year,month,day,hour,minute,place.timezone,0)};
}
