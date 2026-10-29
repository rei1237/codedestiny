import {TossError} from './policy.js';
export function validatePreparation(input,{birthRequired=true}={}) {
  if(!input||!/^\w{8}-\w{4}-4\w{3}-[89ab]\w{3}-\w{12}$/i.test(input.attemptId||''))throw new TossError('ATTEMPT_INVALID');
  const question=typeof input.question==='string'?input.question.trim():'';
  if(question.length<5||question.length>600)throw new TossError('QUESTION_INVALID');
  return {question,attemptId:input.attemptId,...(birthRequired?{birth:validateBirth(input.birth),...(input.partnerBirth?{partnerBirth:validateBirth(input.partnerBirth)}:{})}:{})};
}
export function validateBirth(b) {
  const d=b?.date,l=b?.location;
  if(!d||!l||!['M','F','OTHER'].includes(b.gender)||!['solar','lunar','lunar_leap'].includes(d.calType)
    ||![d.year,d.month,d.day].every(Number.isInteger)||d.year<1900||d.year>new Date().getFullYear()
    ||d.month<1||d.month>12||d.day<1||d.day>31||typeof d.timeUnknown!=='boolean'
    ||(!d.timeUnknown&&(!Number.isInteger(d.hour)||d.hour<0||d.hour>23||!Number.isInteger(d.minute)||d.minute<0||d.minute>59))
    ||typeof l.label!=='string'||!l.label.trim()||l.label.length>80||!Number.isFinite(l.lat)||Math.abs(l.lat)>90
    ||!Number.isFinite(l.lng)||Math.abs(l.lng)>180||typeof l.tz!=='string')throw new TossError('BIRTH_INVALID');
  try{new Intl.DateTimeFormat('en',{timeZone:l.tz}).format();}catch{throw new TossError('TIMEZONE_INVALID');}
  // Calendar/leap-day validity and all chart calculations remain in the existing domain engine.
  return {gender:b.gender,
    date:{year:d.year,month:d.month,day:d.day,calType:d.calType,timeUnknown:d.timeUnknown,
      hour:d.timeUnknown?null:d.hour,minute:d.timeUnknown?null:d.minute},location:{label:l.label.trim(),lat:l.lat,lng:l.lng,tz:l.tz}};
}
