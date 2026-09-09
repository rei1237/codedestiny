import { readFileSync } from 'node:fs';
import { HD_REPORT_SECTION_TITLES } from '../../../lib/human-design/report-sections.js';

// Layout fixtures, not fortune content or language-quality evidence.
export const LOCALE_PROSE = {
  ko: '결정을 서두르지 않고 자신의 반응을 관찰하면 반복되는 패턴을 이해하는 데 도움이 됩니다.',
  en: 'Taking time to observe your responses can help you understand recurring patterns before making a decision.',
  ja: '決断を急がず、自分の反応を観察すると、繰り返すパターンへの理解が深まります。',
  'zh-CN': '不急于做决定，先观察自己的反应，有助于理解反复出现的模式。',
  'zh-TW': '不急於做決定，先觀察自己的反應，有助於理解反覆出現的模式。',
  vi: 'Dành thời gian quan sát phản ứng của bản thân giúp bạn hiểu những khuôn mẫu lặp lại trước khi quyết định.',
  hi: 'निर्णय लेने से पहले अपनी प्रतिक्रियाओं को समय देकर देखना दोहराए जाने वाले ढर्रों को समझने में मदद कर सकता है।',
  es: 'Observar tus reacciones con calma puede ayudarte a comprender los patrones que se repiten antes de decidir.',
  fr: 'Prendre le temps d’observer vos réactions peut vous aider à comprendre les schémas récurrents avant de décider.',
  de: 'Wenn du deine Reaktionen in Ruhe beobachtest, kannst du wiederkehrende Muster vor einer Entscheidung besser verstehen.',
  nl: 'Door rustig je reacties te observeren, kun je terugkerende patronen beter begrijpen voordat je een beslissing neemt.',
  ms: 'Meluangkan masa untuk memerhatikan reaksi sendiri membantu anda memahami corak yang berulang sebelum membuat keputusan.',
};

export function reportLocaleFixture(locale) {
  const base = JSON.parse(readFileSync(new URL('./report-sample.en.json', import.meta.url), 'utf8'));
  const sentence = LOCALE_PROSE[locale];
  if (!sentence) throw new Error(`Missing fixture prose: ${locale}`);
  function localizedSection(section) {
    const body = Array.from({ length: Math.ceil(section.body.length / sentence.length) }, (_, i) => `${i + 1}. ${sentence}`).join('\n\n');
    return { ...section, title: HD_REPORT_SECTION_TITLES[section.key]?.[locale] || sentence, body,
      keyPoints: section.keyPoints?.map(() => sentence),
      subsections: section.subsections?.map(sub => ({ ...sub, title: sentence, body: sentence.repeat(Math.max(1, Math.ceil((sub.body || '').length / sentence.length))) })),
    };
  }
  return { ...base, locale, reportId: `human-design-report:fixture:${locale}`, sections: base.sections.map(localizedSection) };
}
