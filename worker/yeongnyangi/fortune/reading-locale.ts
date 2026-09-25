import {normalizeLocale} from '../../../lib/i18n/locale-normalize.js';
import {buildOutputLanguageDirective} from '../../../lib/i18n/ai-locale.js';
import {FortuneError} from './shared/contracts';
import type {ChapterBody} from './book-contracts';

export const readingLocales = ['ko','en','ja'] as const;
export type ReadingLocale = typeof readingLocales[number];
export const readingLanguageNames = {ko:'한국어',en:'English',ja:'日本語'} as const;

// Missing locale belongs to the original Korean purchase contract. An explicit
// unsupported value must not silently create a paid book in another language.
export function readingLocale(value?: unknown): ReadingLocale {
  if(value === undefined)return 'ko';
  if(typeof value !== 'string' || !/^(ko|en|ja)(?:-[a-z]{2})?$/i.test(value))throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  return normalizeLocale(value) as ReadingLocale;
}
export function readingLanguageInstruction(locale: ReadingLocale) {
  return `${buildOutputLanguageDirective(locale)}\nAll reader-facing prose, including chapter title, block titles, summary, persona and answers, uses the purchase language. Korean instructions and calculated labels are reference data, not an output-language requirement. Preserve JSON keys, questionId, block id and sources verbatim. Translate technical terms into natural explanatory prose. Never infer dates, location or another person's thoughts. Keep the purchased section order and length requirements.`;
}

// This detects gross language substitution, not translation quality. Quoted
// questions and calculated proper names can retain their original script.
export function validateReadingLanguage(body: ChapterBody, locale: ReadingLocale) {
  if(locale==='ko')return; // Keep legacy validation unchanged.
  const prose=[body.title,body.summary,body.persona,...(body.blocks||[]).flatMap(b=>[b.title,...b.paragraphs]),...(body.questionAnswers||[]).flatMap(a=>[a.answer,a.reason,a.timing,a.action])].join(' ');
  const letters=prose.match(/\p{L}/gu)||[];
  const hangul=(prose.match(/\p{Script=Hangul}/gu)||[]).length;
  const latin=(prose.match(/\p{Script=Latin}/gu)||[]).length;
  const kana=(prose.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu)||[]).length;
  if(!body.title?.trim()||body.title.length>160||/<\/?[a-z][^>]*>/i.test(body.title)||!letters.length||hangul/letters.length>.15||
    (locale==='en'?latin/letters.length<.65:kana/letters.length<.08))throw new FortuneError('CHAPTER_LANGUAGE_MISMATCH');
}
