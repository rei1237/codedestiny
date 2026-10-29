import {TextField} from '@toss/tds-mobile';
import {cities} from './content';
export type BirthInput={date:string;time:string;unknown:boolean;calendar:string;gender:string;city:string};
export const emptyBirth=():BirthInput=>({date:'',time:'',unknown:false,calendar:'solar',gender:'',city:''});
export function birthPayload(birth:BirthInput){
  const city=cities.find(c=>c.label===birth.city);
  if(!city)throw new Error('BIRTH_CITY_REQUIRED');
  const [year,month,day]=birth.date.split('-').map(Number),[hour,minute]=birth.time.split(':').map(Number);
  return {gender:birth.gender,date:{year,month,day,hour:birth.unknown?null:hour,minute:birth.unknown?null:minute,timeUnknown:birth.unknown,calType:birth.calendar},location:city};
}
export function BirthFields({value,onChange,title}:{value:BirthInput;onChange:(value:BirthInput)=>void;title:string}){
  return <fieldset className="birth-fields"><legend>{title}</legend>
    <TextField variant="box" label="태어난 날짜" labelOption="sustain" type="date" required value={value.date} onChange={e=>onChange({...value,date:e.target.value})}/>
    <label>달력<select value={value.calendar} onChange={e=>onChange({...value,calendar:e.target.value})}><option value="solar">양력</option><option value="lunar">음력 평달</option><option value="lunar_leap">음력 윤달</option></select></label>
    <label className="check"><input type="checkbox" checked={value.unknown} onChange={e=>onChange({...value,unknown:e.target.checked})}/>태어난 시각을 몰라요</label>
    {!value.unknown&&<TextField variant="box" label="태어난 시각" labelOption="sustain" type="time" required value={value.time} onChange={e=>onChange({...value,time:e.target.value})}/>}
    <label>계산에 사용하는 성별<select required value={value.gender} onChange={e=>onChange({...value,gender:e.target.value})}><option value="">선택해 주세요</option><option value="M">남성</option><option value="F">여성</option></select></label>
    <label>출생 도시<select required value={value.city} onChange={e=>onChange({...value,city:e.target.value})}><option value="">도시를 선택해 주세요</option>{cities.map(c=><option key={c.label}>{c.label}</option>)}</select></label>
  </fieldset>;
}
