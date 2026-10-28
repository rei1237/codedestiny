// Saved-result projection only; never return private content or infer from questions.
import { adviceTopics, cleanTopics, chapterAdviceTopics, reportAdviceTopics, neoAdviceTopics, fusionAdviceTopics } from '../../js/recommendations-context.mjs';
const services = Object.freeze({
  astrology: 'astrology-ai-consultation', vedic: 'vedic-ai-consultation',
  'chat-consultation': 'fortune-chat', neo: 'neo-operation-room-consultation',
  fusion: 'fusion-fortune-consultation', codex: 'master-love-codex',
  'life-book': 'life-book-ai', 'human-design': 'human-design-report',
});
export function savedRecommendation(record, content) {
  if (!record || !['completed', 'saved'].includes(record.status) || !Object.hasOwn(services, record.source)) return null;
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null;
  let tags = [];
  switch (record.source) {
    case 'astrology': case 'vedic':
      tags = cleanTopics((Array.isArray(content.messages) ? content.messages : []).filter(m => m?.role === 'assistant').slice(-24).flatMap(m => reportAdviceTopics(m.content)));
      break;
    case 'chat-consultation': case 'codex':
      tags = chapterAdviceTopics(content.chapters);
      break;
    case 'life-book': {
      let report = content.reportJson;
      if (!report) {
        const text = (Array.isArray(content.messages) ? content.messages : []).find(m => m?.role === 'assistant')?.content;
        if (typeof text === 'string') {
          try { report = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); } catch { /* Unstructured old reports have no verified chapter advice. */ }
        }
      }
      tags = chapterAdviceTopics(report?.chapters);
      break;
    }
    case 'neo': tags = neoAdviceTopics(content.initialBriefing, content.refinedOrder); break;
    case 'fusion': tags = fusionAdviceTopics(content.result); break;
    case 'human-design': tags = adviceTopics((Array.isArray(content.sections) ? content.sections : []).filter(s => s?.key === 'practicalGuide').flatMap(s => Array.isArray(s.keyPoints) ? s.keyPoints : [])); break;
  }
  if (!tags.length) return null;
  return { service: services[record.source], practiceTags: tags, brand: record.character === 'neo' ? 'neo' : 'ggulggul' };
}
