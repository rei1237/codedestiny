/** User-approved static reading editions. App UI and generated consultations retain all 12 languages. */
export const ENGLISH_READING_LOCALES = ['vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];

export function applyDetailedReadingEdition(dictionary, english, locale) {
  if (!ENGLISH_READING_LOCALES.includes(locale)) return dictionary;
  if (!english.featureMarketing || !Object.keys(english.featureMarketing).length) {
    throw new Error('The complete English detailed-reading dictionary is required.');
  }
  return { ...dictionary, featureMarketing: structuredClone(english.featureMarketing) };
}
