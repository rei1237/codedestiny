import { NOVEL_LOCALES } from '../../lib/stories/vn/locales.mjs';
import { isCompleteNovelTranslation } from './novel-translation-contract.mjs';

export function localizeNovelRuntime(runtime, translation) {
  if (!NOVEL_LOCALES.includes(translation?.locale) || translation.locale === 'ko' ||
      translation.sourceHash !== runtime.sourceHash || translation.schemaVersion !== 1 ||
      translation.episodes?.length !== runtime.episodes.length) throw new Error('Novel translation is stale or incomplete');
  const text = (value) => {
    if (!isCompleteNovelTranslation(value)) throw new Error('Untranslated novel text');
    return value;
  };
  const episodes = runtime.episodes.map((episode, index) => {
    const translated = translation.episodes[index];
    if (translated.id !== episode.id || translated.no !== episode.no || translated.beats?.length !== episode.beats.length) throw new Error('Novel episode identity mismatch');
    return {
      ...episode, title: text(translated.title), tag: text(translated.tag),
      ...(episode.ending ? { ending: { ...episode.ending, label: text(translated.ending?.label) } } : {}),
      beats: episode.beats.map((beat, beatIndex) => {
        const target = translated.beats[beatIndex];
        if (target.id !== beat.id) throw new Error('Novel bookmark identity mismatch');
        return {
          ...beat, t: text(target.t),
          ...(beat.nm ? { nm: text(target.nm) } : {}),
          ...(beat.skill?.name ? { skill: { ...beat.skill, name: text(target.skill?.name), ...(beat.skill.unit ? {unit: text(target.skill?.unit)} : {}) } } : {}),
          ...(beat.choice ? { choice: { ...beat.choice, options: beat.choice.options.map(option => ({
            ...option, label: text(target.choice?.options?.find(item => item.id === option.id)?.label),
          })) } } : {}),
        };
      }),
    };
  });
  return { ...runtime, locale: translation.locale, episodes };
}
