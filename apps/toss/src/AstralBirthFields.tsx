import {BirthFields,birthPayload,type BirthInput} from './BirthFields';
import {cities} from './content';
export {emptyBirth} from './BirthFields';
export type AstralBirthInput=BirthInput&{place?:{label:string;latitude:string;longitude:string;timezone:string}};
export function astralBirthPayload(value:AstralBirthInput){
 if(!value.place)return birthPayload(value);
 const place=value.place,lat=Number(place.latitude),lng=Number(place.longitude);
 if(!place.label.trim()||!place.latitude.trim()||!place.longitude.trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('BIRTH_PLACE_INVALID');
 try{new Intl.DateTimeFormat('en',{timeZone:place.timezone}).format();}catch{throw Error('BIRTH_TIMEZONE_INVALID');}
 return {...birthPayload({...value,city:'서울'}),location:{label:place.label.trim().slice(0,120),lat,lng,tz:place.timezone.trim()}};
}
export function AstralBirthFields({value,onChange,...props}:{value:AstralBirthInput;onChange:(value:AstralBirthInput)=>void;title:string;disabled?:boolean;showGender?:boolean;requireGender?:boolean}){
 const update=(key:keyof NonNullable<AstralBirthInput['place']>,text:string)=>onChange({...value,place:{...value.place!,[key]:text}});
 return <><BirthFields {...props} value={value} onChange={next=>onChange({...value,...next})} showCity={false}/><fieldset disabled={props.disabled}><legend>출생 장소</legend><label>장소 입력 방식<select value={value.place?'coordinates':'city'} onChange={event=>onChange({...value,place:event.target.value==='coordinates'?{label:'',latitude:'',longitude:'',timezone:''}:undefined})}><option value="city">국내 도시 선택</option><option value="coordinates">국내·해외 좌표 직접 입력</option></select></label>
 {value.place?<><label>출생 도시 이름<input required maxLength={120} value={value.place.label} onChange={event=>update('label',event.target.value)}/></label><label>위도<input required type="number" inputMode="decimal" min={-90} max={90} step="any" value={value.place.latitude} onChange={event=>update('latitude',event.target.value)}/></label><label>경도<input required type="number" inputMode="decimal" min={-180} max={180} step="any" value={value.place.longitude} onChange={event=>update('longitude',event.target.value)}/></label><label>출생지 시간대<input required value={value.place.timezone} placeholder="예: America/New_York" onChange={event=>update('timezone',event.target.value)}/></label><p>지역 시간대 이름을 입력해 주세요. 예: Asia/Kolkata, Europe/Paris. 해당 출생일의 서머타임도 함께 계산해요.</p></>:<label>출생 도시<select required value={value.city} onChange={event=>onChange({...value,city:event.target.value})}><option value="">도시를 선택해 주세요</option>{cities.map(city=><option key={city.label}>{city.label}</option>)}</select></label>}
 </fieldset></>;
}
