import {normalizeLocale,RUNTIME_LOCALES,type RuntimeLocale} from '../../../lib/i18n/locale-normalize.js';
import {buildOutputLanguageDirective,AI_LOCALE_LABEL} from '../../../lib/i18n/ai-locale.js';
import {FortuneError} from './shared/contracts';
import type {ChapterBody} from './book-contracts';

export const readingLocales = RUNTIME_LOCALES;
export type ReadingLocale = RuntimeLocale;
export const readingLanguageNames = AI_LOCALE_LABEL;

const toneProfiles:Record<ReadingLocale,string>={
  ko:'Warm, composed Korean honorific counseling; explain traditional terms immediately.',
  en:'Natural professional personalized astrology reading; relationship insight, timing, career and money guidance without sales hype or literal Korean phrasing.',
  ja:'自然な日本語の丁寧な相談体。宿曜・紫微斗数・相性は各体系を区別し、運命鑑定でも恐怖や断定を避ける。',
  'zh-CN':'自然、温和的简体中文咨询。命理、紫微斗数、姻缘、财运、流年、合盘按各自体系解释，不承诺结果。',
  'zh-TW':'自然、溫和的繁體中文諮詢。命理、紫微斗數、姻緣、財運、流年、合盤依各自體系解釋，不保證結果。',
  vi:'Natural respectful Vietnamese guidance for personal reflection and entertainment; no religious claims or guaranteed outcomes.',
  hi:'Natural respectful Hindi guidance for personal reflection and entertainment; do not present religious authority or guaranteed outcomes.',
  es:'Natural warm Spanish counseling for personal reflection; clear practical options, no exaggerated advertising.',
  fr:'Natural considerate French counseling for personal reflection; measured professional explanations, no exaggerated advertising.',
  de:'Natural respectful German counseling; precise transparent explanations and practical options without exaggerated promises.',
  nl:'Natural approachable Dutch counseling; clear reflective guidance without exaggerated promises.',
  ms:'Natural respectful Malay guidance for personal reflection and entertainment; avoid religious assertions and guaranteed outcomes.',
};
export interface ReadingOutputContext {userCountryOrRegion?:string|null;priceLocale?:string}
export function readingOutputContext(locale:ReadingLocale,context:ReadingOutputContext={}) {
  const region=typeof context.userCountryOrRegion==='string'&&/^[A-Z]{2}$/.test(context.userCountryOrRegion)?context.userCountryOrRegion:null;
  let priceLocale:string=locale;
  try { if(context.priceLocale)priceLocale=readingLocale(context.priceLocale); } catch {/* Optional display context; never changes the purchase language. */}
  return {outputLocale:locale,outputLanguageName:readingLanguageNames[locale],userCountryOrRegion:region,
    toneProfile:toneProfiles[locale],priceLocale,currency:'KRW'};
}

// Missing locale belongs to the original Korean purchase contract. An explicit
// unsupported value must not silently create a paid book in another language.
export function readingLocale(value?: unknown): ReadingLocale {
  if(value === undefined)return 'ko';
  if(typeof value !== 'string' || !/^[a-z]{2,3}(?:[-_][a-z]{2,4})?$/i.test(value))throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  if(!readingLocales.some(item=>value.toLowerCase().replace('_','-').split('-')[0]===item.toLowerCase().split('-')[0]))throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  const locale=normalizeLocale(value);
  if(!readingLocales.includes(locale as ReadingLocale))throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  return locale as ReadingLocale;
}
export function readingLanguageInstruction(locale: ReadingLocale,preserveSymbolicContract=false) {
  if(preserveSymbolicContract)return `${buildOutputLanguageDirective(locale)}\nAll reader-facing prose, including chapter title, block titles, summary, persona and answers, uses the purchase language. Korean instructions and calculated labels are reference data, not an output-language requirement. Preserve JSON keys, questionId, block id and sources verbatim. Translate technical terms into natural explanatory prose. Never infer dates, location or another person's thoughts. Keep the purchased section order and length requirements.`;
  return `${buildOutputLanguageDirective(locale)}\nAll reader-facing prose, including chapter title, block titles, summary, persona and answers, uses the purchase language specified by outputLocale and outputLanguageName. The selected result language takes priority over the question, site UI and source language. Korean instructions and calculated labels are reference data, not an output-language requirement. Preserve JSON keys, questionId, block id and sources verbatim. Names, birth dates, card names, zodiac names and essential chart terms may retain their original form when needed; explain them in the selected language. Never include Korean sentences when outputLocale is not ko. Follow toneProfile. Write an original consultation for this language's readers, not a translation of a Korean report. Distinguish Simplified and Traditional Chinese. Avoid local taboos, religious claims, fear-based sales and guarantees while retaining symbolic depth and professional warmth. userCountryOrRegion is optional browser-locale context, not verified residence or calculated evidence. priceLocale formats KRW display only; never infer exchange rates or change pricing. Never infer dates, location or another person's thoughts. Keep the purchased section order and length requirements.`;
}

// This detects gross language substitution, not translation quality. Quoted
// questions and calculated proper names can retain their original script.
export function validateReadingLanguage(body: ChapterBody, locale: ReadingLocale) {
  if(locale==='ko')return; // Keep legacy validation unchanged.
  const prose=[body.title,body.summary,body.persona,...(body.analysis||[]),body.example,body.advice,...(body.highlights||[]),...(body.topics||[]),...(body.blocks||[]).flatMap(b=>[b.title,...b.paragraphs]),...(body.questionAnswers||[]).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].join(' ');
  const letters=prose.match(/\p{L}/gu)||[];
  const hangul=(prose.match(/\p{Script=Hangul}/gu)||[]).length;
  const latin=(prose.match(/\p{Script=Latin}/gu)||[]).length;
  const kana=(prose.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu)||[]).length;
  const han=(prose.match(/\p{Script=Han}/gu)||[]).length;
  const devanagari=(prose.match(/\p{Script=Devanagari}/gu)||[]).length;
  const expected=locale==='ja'?kana/letters.length>=.08:locale==='zh-CN'||locale==='zh-TW'?han/letters.length>=.4:locale==='hi'?devanagari/letters.length>=.4:latin/letters.length>=.65;
  const koreanSentence=/[가-힣]{2,}(?:\s+[가-힣]{2,}){2,}|[가-힣]{2,}(?:습니다|세요|해요|이에요|예요)[.!?。]/u.test(prose);
  if(!body.title?.trim()||body.title.length>160||/<\/?[a-z][^>]*>/i.test(body.title)||!letters.length||koreanSentence||hangul/letters.length>.15||
    !expected)throw new FortuneError('CHAPTER_LANGUAGE_MISMATCH');
}
