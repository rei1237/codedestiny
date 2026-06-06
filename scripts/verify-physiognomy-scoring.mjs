import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const analysis = readFileSync(resolve(root, 'AnalysisEngine.js'), 'utf8');
const ui = readFileSync(resolve(root, 'PhysiognomyUI.js'), 'utf8');

assert.match(analysis, /eyeDistance:\s*eyeDistRatio/, 'eyeDistance alias must map to eyeDistRatio');
assert.doesNotMatch(analysis, /features\.eyeDistance/, 'scoring must read eyeDistRatio directly');
assert.match(analysis, /qualityScore/, 'analysis result must include qualityScore');
assert.match(analysis, /scoreBreakdown/, 'analysis result must include scoreBreakdown');
assert.doesNotMatch(analysis, /pctArr\[0\]\s*\*\s*1\.25/, 'confidence must not use inflated softmax multiplier');
assert.match(ui, /사진 품질/, 'result UI must expose photo quality guidance');
assert.match(ui, /판정 근거/, 'result UI must expose readable scoring evidence');

console.log('[verify-physiognomy-scoring] ok');
