import { lunarToSolar } from '../../../../lib/korean-calendar/index.js';
import { topicIds } from '../topics';
import {
  BirthProfile,
  DomainId,
  FortuneError,
  FortuneInput,
} from "./contracts";
function profile(value: unknown, domain: DomainId): BirthProfile {
  if (!value || typeof value !== "object")
    throw new FortuneError("PROFILE_REQUIRED");
  const p = {...value} as Record<string, unknown>;
  if (p.calendarType !== undefined && !['solar','lunar'].includes(String(p.calendarType)))
    throw new FortuneError("INVALID_CALENDAR");
  let originalCalendar: BirthProfile['originalCalendar'];
  if(p.calendarType==='lunar') {
    if(typeof p.birthDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate))throw new FortuneError('INVALID_BIRTH_DATE');
    const [y,m,d]=p.birthDate.split('-').map(Number);
    const solar=lunarToSolar(y,m,d,p.leapMonth===true);
    if(!solar)throw new FortuneError('INVALID_LUNAR_DATE');
    originalCalendar={date:p.birthDate,type:'lunar',leapMonth:p.leapMonth===true};
    p.birthDate=`${solar.year}-${String(solar.month).padStart(2,'0')}-${String(solar.day).padStart(2,'0')}`;
  }
  if (
    typeof p.birthDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)
  )
    throw new FortuneError("INVALID_BIRTH_DATE");
  const d = new Date(`${p.birthDate}T00:00:00Z`);
  if (
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== p.birthDate ||
    d.getUTCFullYear() < 1901 ||
    d > new Date()
  )
    throw new FortuneError("INVALID_BIRTH_DATE");
  const time = p.birthTime;
  if (
    time !== undefined &&
    time !== "" &&
    (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  )
    throw new FortuneError("INVALID_BIRTH_TIME");
  if (!time && domain !== "saju") throw new FortuneError("BIRTH_TIME_REQUIRED");
  if (p.gender !== undefined && p.gender !== "male" && p.gender !== "female")
    throw new FortuneError("INVALID_GENDER");
  if ((domain === "saju" || domain === "ziwei") && !p.gender)
    throw new FortuneError("GENDER_REQUIRED");
  let birthPlace: BirthProfile["birthPlace"];
  if (["vedic", "astrology", "sukuyo"].includes(domain) || p.birthPlace) {
    const loc = p.birthPlace as Record<string, unknown> | undefined;
    if (
      !loc ||
      typeof loc.latitude !== "number" ||
      !Number.isFinite(loc.latitude) ||
      Math.abs(loc.latitude) > 90 ||
      typeof loc.longitude !== "number" ||
      !Number.isFinite(loc.longitude) ||
      Math.abs(loc.longitude) > 180 ||
      typeof loc.timezone !== "string"
    )
      throw new FortuneError("BIRTH_PLACE_REQUIRED");
    try {
      new Intl.DateTimeFormat("en", { timeZone: loc.timezone });
    } catch {
      throw new FortuneError("INVALID_TIMEZONE");
    }
    birthPlace = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      timezone: loc.timezone,
      ...(typeof loc.name==='string'?{name:loc.name.slice(0,240)}:{}),
    };
  }
  return {
    birthDate: p.birthDate,
    birthTime: time ? (time as string) : undefined,
    gender: p.gender as BirthProfile["gender"],
    calendarType: "solar",
    ...(originalCalendar?{originalCalendar}:{}),
    ...(p.residence?{residence:validatePlace(p.residence)}:{}),
    ...(birthPlace ? { birthPlace } : {}),
  };
}
export function validatePlace(value:unknown): NonNullable<BirthProfile['birthPlace']> {
 const p=value as Record<string,unknown>;
 if(!p||typeof p.latitude!=='number'||typeof p.longitude!=='number'||!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180||typeof p.timezone!=='string')throw new FortuneError('BIRTH_PLACE_REQUIRED');
 try{new Intl.DateTimeFormat('en',{timeZone:p.timezone});}catch{throw new FortuneError('INVALID_TIMEZONE');}
 return {latitude:p.latitude,longitude:p.longitude,timezone:p.timezone,...(typeof p.name==='string'?{name:p.name.slice(0,240)}:{})};
}
export function validateInput(value: unknown, domain: DomainId): FortuneInput {
  if (!value || typeof value !== "object")
    throw new FortuneError("INVALID_INPUT");
  const v = value as Record<string, unknown>;
  const question = v.question === undefined ? "" : v.question;
  if (typeof question !== "string" || question.length > 1000)
    throw new FortuneError("INVALID_QUESTION");
  const topicId=typeof v.topicId==='string'?v.topicId:'general';
  if(!topicIds.includes(topicId))throw new FortuneError('INVALID_TOPIC');
  if(domain==='tarot')return {question:question.trim(),topicId,spreadId:topicId==='relationship'||topicId==='love'?'relationship_six_card':'three_card_cause_process_outcome'};
  return {
    topicId,
    personA: profile(v.personA, domain),
    ...((domain === 'sukuyo'||domain === 'saju'&&v.readingMode==='compatibility') ? { readingMode: v.readingMode === 'personal' ? 'personal' as const : 'compatibility' as const } : {}),
    ...((domain === "sukuyo"||domain === "saju") && (domain==='sukuyo'?v.readingMode !== 'personal':v.readingMode==='compatibility') ? { personB: profile(v.personB, domain) } : {}),
    question: question.trim(),
  };
}
