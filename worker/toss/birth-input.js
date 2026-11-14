import {validateBirth} from './preparation.js';
const pad=n=>String(n).padStart(2,'0');

export function flowerBirthInput(raw){
  const b=validateBirth(raw),d=b.date;
  return {personA:{birthDate:`${d.year}-${pad(d.month)}-${pad(d.day)}`,
    ...(!d.timeUnknown?{birthTime:`${pad(d.hour)}:${pad(d.minute)}`} : {}),
    ...(b.gender==='M'?{gender:'male'}:b.gender==='F'?{gender:'female'}:{}),
    calendarType:d.calType==='solar'?'solar':'lunar',leapMonth:d.calType==='lunar_leap',
    birthPlace:{name:b.location.label,latitude:b.location.lat,longitude:b.location.lng,timezone:b.location.tz}},
    readingMode:'personal',question:''};
}
