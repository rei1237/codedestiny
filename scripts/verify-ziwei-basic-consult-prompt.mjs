import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildZiweiAIPromptWithDomain } from '../worker/lib/ziwei-ai-prompt.js';
import { ZIWEI_PROMPT_TEMPLATES } from '../worker/lib/ziwei-ai-prompt-templates.mjs';

// Pure prompt construction: no provider, payment, database or network.
const names = ['명궁','형제궁','부부궁','자녀궁','재백궁','질액궁','천이궁','교우궁','관록궁','전택궁','복덕궁','부모궁'];
const chartResult = { mingGong:'명궁', shenGong:'관록궁', palaceStarData:names.map(palace => ({palace, stars:[{name:'자미',strength:'평',borrowed:false}],auxStars:[],badStars:[]})) };
const client = readFileSync(new URL('../js/saju-engine.js', import.meta.url), 'utf8');
const topics = client.match(/var zwConsultTopics = \[([\s\S]*?)\n  \];/)[1];
const clientDomains = [...topics.matchAll(/\['([a-z_]+)',/g)].map(match => match[1]);
assert.deepEqual(clientDomains.slice().sort(), Object.keys(ZIWEI_PROMPT_TEMPLATES).sort());
const digests = new Set();
for (const domain of clientDomains) {
  const result = buildZiweiAIPromptWithDomain({ question:'제 일상에서 조율할 점을 알려주세요.', chartResult, domain });
  const template = ZIWEI_PROMPT_TEMPLATES[domain];
  assert.equal(result.domain, domain);
  assert.ok(result.generatedPrompt.includes(`주궁: ${template.primaryPalaces.main}`));
  assert.ok(result.generatedPrompt.includes('개수를 채우려고 별을 만들지 않는다'));
  assert.ok(result.generatedPrompt.includes('선택한 상담 주제가 우선'));
  digests.add(result.promptDigest || result.digest || result.generatedPrompt);
}
assert.equal(digests.size, 14);
assert.throws(() => buildZiweiAIPromptWithDomain({question:'상담 내용을 알려주세요.',chartResult,domain:'invalid'}), /UNKNOWN_ZIWEI_DOMAIN/);
console.log('[verify:ziwei-basic-consult-prompt] PASS: 14 UI domains, explicit-domain evidence, missing-data guards, distinct prompts');
