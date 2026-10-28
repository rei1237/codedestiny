/** @jest-environment node */
import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from '@jest/globals';
let save, read, route, deep, vision, docs, fault, proof, revoked, userId, ai, visionReply, textCall, visionPrompt, sides, clientSide, textPrompt, visionParts, runWithAiLocale;
const owner = '64b7f2a1c3d4e5f601234567';
const query = value => ({ sort() { return this; }, lean: async () => structuredClone(value) });
const match = (row, filter) => Object.entries(filter).every(([key, value]) => row[key] === value);
const payment = jest.fn(async () => ({ proven: proof, source: 'payment' }));
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js'), models = await import('../../worker/lib/models.js'), auth = await import('../../worker/lib/auth.js'), gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {} }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ ...auth, requireAuth: async () => ({ userId }) }));
  jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js', () => withSettle({ verifyPerUsePayment: payment }));
  jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js', () => ({ isPaidResultRevoked: async () => revoked }));
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ ...gemini, callGeminiText: async (_env, prompt, options) => { textCall = options; textPrompt = prompt; return ai; } }));
  jest.unstable_mockModule('../../worker/lib/structured-consultation.js', () => ({ callGeminiJsonWithRetry: async (_env, prompt, options) => { visionPrompt = prompt; visionParts = options?.geminiParts; return typeof visionReply === 'function' ? visionReply(prompt) : visionReply; } }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({ ...models, ServiceExecutionTransaction: {
    findOne: filter => { if (fault === 'confirm') { fault = ''; return query(null); } return query(docs.find(row => match(row, filter)) || null); },
    findOneAndUpdate: (filter, update) => {
      if (fault === 'throw') throw Error('storage');
      if (fault === 'null') return query(null);
      let row = docs.find(row => match(row, filter));
      if (!row) { row = structuredClone(update.$setOnInsert); docs.push(row); }
      return query(row);
    },
  } }));
  ({ savePalmAnalysis: save, readPaidPalmAnalysis: read } = await import('../../worker/lib/palm-result-delivery.js'));
  ({ buildPalmDeepConsult: deep, analyzeHandWithGeminiVision: vision, compareHandSides: sides, clientHandSide: clientSide } = await import('../../worker/lib/palm-vision.js'));
  ({ handlePalmRoutes: route } = await import('../../worker/routes/palm.js'));
  ({ runWithAiLocale } = await import('../../worker/lib/ai-locale-context.js'));
});
beforeEach(() => { docs = []; fault = ''; proof = true; revoked = false; userId = owner; ai = { ok: true, text: '계산한 선의 방향을 바탕으로 생활 속 선택을 살펴봅니다. '.repeat(70), provider: 'gemini' }; visionReply = { ok: true, text: JSON.stringify({ palmDetected: true, imageQuality: { brightness: 'good', sharpness: 'good', palmCoverage: 0.95 }, majorLines: { lifeLine: { detected: true, summary: '선 확인' } } }), provider: 'gemini' }; payment.mockClear(); });
const result = { interpretation: { consultText: '원래 손금 본문 마지막 문장입니다.' }, mode: 'full' };
test('save and reopen original paid analysis, even after response loss', async () => {
  await save({}, owner, 'palm-original', result);
  expect(await save({}, owner, 'palm-original', { interpretation: 'changed' })).toMatchObject(result);
  expect(await read({}, owner, 'palm-original')).toMatchObject({ ...result, saved: true });
  expect(payment.mock.calls[0][1]).toMatchObject({ requestId: 'palm-original', requireExisting: true });
  expect(docs).toHaveLength(1);
});
test.each(['throw', 'null', 'confirm'])('storage %s blocks payment readiness', async failure => {
  fault = failure; await expect(save({}, owner, 'palm-original', result)).rejects.toMatchObject({ status: 503 });
  expect(payment).not.toHaveBeenCalled();
  fault = ''; expect(await save({}, owner, 'palm-original', result)).toMatchObject({ analysisSaved: true });
});
test('unpaid, revoked and foreign accounts cannot reopen', async () => {
  await save({}, owner, 'palm-original', result);
  proof = false; await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 403 });
  proof = true; revoked = true; await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 403 });
  await expect(read({}, 'other', 'palm-original')).rejects.toMatchObject({ status: 404 });
  proof = null; revoked = false; await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 503 });
});
test('actual GET route returns the owned snapshot without generating', async () => {
  await save({}, owner, 'palm-original', result);
  const response = await route(new Request('https://mock.test/api/palm/result?requestId=palm-original'), {});
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ saved: true });
  userId = 'other'; expect((await route(new Request('https://mock.test/api/palm/result?requestId=palm-original'), {})).status).toBe(404);
});
test('full deep interpretation passes existing 1200 character contract', async () => { expect(await deep({}, {})).toMatchObject({ text: ai.text.trim() }); });
test.each(['short', 'mock'])('deep %s output cannot become a paid-ready result', async kind => {
  if (kind === 'short') ai.text = '짧습니다.';
  if (kind === 'truncated') ai.truncated = true;
  if (kind === 'mock') ai.isMock = true;
  if (kind === 'unfinished') ai.text += '그러나';
  expect(await deep({}, {})).toBeNull();
});
test('vision mock is rejected and failed photo analysis does not offer payment', async () => {
  visionReply.isMock = true;
  ai = { ok: false, error: 'MOCK_PROVIDER_FAILURE' };
  expect(await vision({}, 'data:image/png;base64,AAAAAAAA', 'left')).toBeNull();
  const response = await route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general' }) }), {});
  // Model failure is a retryable outage, not a photo without a palm.
  expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: 'PALM_VISION_UNAVAILABLE', retryable: true });
  expect(docs).toHaveLength(0); expect(payment).not.toHaveBeenCalled();
});
test('explicit palmDetected=false still answers PALM_NOT_DETECTED', async () => {
  visionReply.text = JSON.stringify({ palmDetected: false, notPalmReason: '손바닥이 아닌 사진입니다.' });
  const response = await route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general' }) }), {});
  expect(response.status).toBe(422); expect(await response.json()).toMatchObject({ code: 'PALM_NOT_DETECTED', reason: '손바닥이 아닌 사진입니다.' });
});
test('actual analysis saves before payment and missing deep text stops readiness', async () => {
  const request = () => new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general' }) });
  ai.text = ''; expect((await route(request(), {})).status).toBe(503); expect(docs).toHaveLength(0);
  ai.text = '사진에서 확인된 선을 토대로 선택을 살펴봅니다. '.repeat(90);
  const response = await route(request(), {}); expect(response.status).toBe(200);
  // Pre-payment response is a receipt only; the paid body leaves through GET /result after payment.
  const receipt = await response.json();
  expect(receipt).toEqual({ requestId: 'palm-original', analysisSaved: true, mode: expect.any(String), validation: { hasPalm: true } });
  expect(docs[0].metadata.palmResult.interpretation.consultText).toContain('사진에서 확인된 선');
  expect(JSON.stringify(docs)).not.toContain('data:image'); expect(payment).not.toHaveBeenCalled();
});
test('analysis without a requestId is refused before the vision call', async () => {
  visionReply = null;
  const response = await route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general' }) }), {});
  expect(response.status).toBe(422); expect(await response.json()).toMatchObject({ code: 'REQUEST_ID_REQUIRED' });
  expect(docs).toHaveLength(0);
});

test.each(['truncated','unfinished'])('deep %s keeps complete prose without requesting a repair',async kind=>{
 const original=ai.text.trim();if(kind==='truncated')ai.truncated=true;else ai.text+=' 아직 끝나지 않은';
 expect(await deep({},{})).toMatchObject({text:original,rawText:ai.text});
});
test('deep consult appends the Yeoni persona after the unchanged 18-section format', async () => {
  await deep({}, {});
  const system = textCall.systemPrompt;
  expect(system.indexOf('[상담자 페르소나 — 연이]')).toBeGreaterThan(system.indexOf('■ 오늘의 한마디'));
  expect(system.match(/^■ /gmu)).toHaveLength(18);
  expect(system).not.toMatch(/d+년 경력|애매한 표현 대신/u);
});
test.each([[' (근거: 생명선)', ''], ['\n\n이어서 볼 흐름은 다음과 같습니다:', ''], ['」', '」']])('deep consult ending %j is delivered up to its last complete sentence', async (tail, kept) => {
  const original = ai.text.trim(); ai.text = original + tail;
  expect(await deep({}, {})).toMatchObject({ text: original + kept });
});
test('raw prose is persisted privately and excluded from the paid response',async()=>{
 await save({},owner,'palm-original',result,'provider raw');expect(docs[0].metadata.palmRaw).toBe('provider raw');expect(await read({},owner,'palm-original')).not.toHaveProperty('palmRaw');
});
test('vision fields the model omitted are not compared as measured medium values', async () => {
  // Both hands detected, but depth/length/strength/coverage are all missing from the model reply.
  visionReply.text = JSON.stringify({ palmDetected: true, imageQuality: { brightness: 'good', sharpness: 'good' }, majorLines: { lifeLine: { detected: true }, heartLine: { detected: true }, fateLine: { detected: true } } });
  const image = 'data:image/png;base64,' + 'A'.repeat(80);
  const response = await route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: image, rightPalmImage: image, dominantHand: 'right', analysisPurpose: 'general' }) }), {});
  expect(response.status).toBe(200);
  const body = docs[0].metadata.palmResult;
  expect(body.leftHandReading.majorLines.lifeLine.defaultedFields).toContain('depth');
  expect(body.recognitionData.bySide.left.imageQuality.palmCoverage).toBeNull();
  expect(body.bothHandsComparison.enabled).toBe(true);
  expect(body.bothHandsComparison.differenceSummary).not.toMatch(/유사/);
});
test('scores copied from the old prompt example are not kept as measurements', async () => {
  const reply = (scores, palmCoverage) => JSON.stringify({ palmDetected: true, scores, imageQuality: { brightness: 'good', sharpness: 'good', palmCoverage }, majorLines: { lifeLine: { detected: true, summary: '선 확인' } } });
  visionReply.text = reply({ love: 75, career: 80, wealth: 70, vitality: 85, creativity: 78, communication: 72 }, 0.85);
  const copied = await vision({}, 'data:image/png;base64,AAAAAAAA', 'left');
  expect(Object.values(copied.handReading.scores)).toEqual(Array(6).fill(null));
  expect(copied.imageQuality.palmCoverage).toBeNull();
  expect(copied.imageQuality.defaultedFields).toContain('palmCoverage');
  visionReply.text = reply({ love: 64, career: 81, wealth: 50, vitality: 88, creativity: 57, communication: '0-100' }, 0.85);
  const measured = await vision({}, 'data:image/png;base64,AAAAAAAA', 'left');
  expect(measured.handReading.scores).toEqual({ love: 64, career: 81, wealth: 50, vitality: 88, creativity: 57, communication: null });
  expect(measured.imageQuality.palmCoverage).toBe(0.85);
});
test('a photo that looks like the other hand keeps the uploaded slot and is flagged', async () => {
  visionReply.text = JSON.stringify({ palmDetected: true, handSide: 'right', imageQuality: { brightness: 'good', sharpness: 'good', palmCoverage: 0.95 }, majorLines: { lifeLine: { detected: true, summary: '선 확인' } } });
  // MediaPipe "Left" on an unmirrored upload is the right hand, so both signals say right.
  const response = await route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), leftHandedness: { label: 'Left', score: 0.97 }, dominantHand: 'right', analysisPurpose: 'general' }) }), {});
  expect(response.status).toBe(200);
  expect(visionPrompt).not.toContain('바닥입니다');
  const saved = docs[0].metadata.palmResult;
  expect(saved.recognitionData.bySide.left.imageQuality).toMatchObject({ handSide: 'left', observedHandSide: 'right' });
  expect(saved.recognitionData.bySide.left.handSideCheck).toEqual({ declared: 'left', vision: 'right', client: 'right', status: 'mismatch' });
  expect(saved.warnings).toContain('왼손 칸에 올린 사진이 오른손처럼 보였어요. 해석은 올려 주신 대로 왼손 기준이에요. 손을 바꿔 올렸다면 칸을 확인해 주세요.');
});
test('hand-side signals only flag a mismatch the vision reading supports', () => {
  expect(sides('left', 'left', 'unknown').status).toBe('match');
  expect(sides('left', 'right', 'left').status).toBe('uncertain');
  expect(sides('left', 'unknown', 'right').status).toBe('uncertain');
  expect(sides('left', 'unknown', 'unknown').status).toBe('unverified');
  expect([clientSide({ label: 'Right', score: 0.9 }), clientSide({ label: 'Left', score: 0.6 }), clientSide(null)]).toEqual(['left', 'unknown', 'unknown']);
});
const analyze = (extra = {}) => route(new Request('https://mock.test/api/palm/analyze', { method: 'POST', body: JSON.stringify({ requestId: 'palm-original', leftPalmImage: 'data:image/png;base64,' + 'A'.repeat(80), dominantHand: 'right', analysisPurpose: 'general', ...extra }) }), {});
test.each([
  ['a string "false"', { palmDetected: 'false', imageQuality: { palmCoverage: 0.9 }, majorLines: { lifeLine: { detected: true } } }, ''],
  ['an omitted verdict with one line', { imageQuality: { palmCoverage: 0.9 }, majorLines: { lifeLine: { detected: true } } }, '주요 선을 찾지 못했어요'],
  ['a palm verdict without any major line', { palmDetected: true, imageQuality: { palmCoverage: 0.95 }, minorLines: { marriageLine: { detected: true } } }, '주요 선을 찾지 못했어요'],
])('a non-palm vision reply with %s does not become a reading', async (_name, reply, reason) => {
  visionReply.text = JSON.stringify(reply);
  const response = await analyze();
  expect(response.status).toBe(422);
  const body = await response.json();
  expect(body.code).toBe('PALM_NOT_DETECTED'); expect(body.reason).toContain(reason);
  expect(docs).toHaveLength(0);
});
test('an omitted verdict still reads a palm when two major lines are visible', async () => {
  visionReply.text = JSON.stringify({ imageQuality: { palmCoverage: 0.9 }, majorLines: { lifeLine: { detected: true }, heartLine: { detected: true } } });
  expect((await vision({}, 'data:image/png;base64,AAAAAAAA', 'left')).palmDetected).toBe(true);
});
test('a non-palm photo in one slot is refused instead of filled by the landmark engine', async () => {
  const palm = visionReply.text;
  visionReply = prompt => ({ ok: true, provider: 'gemini', text: prompt.includes('오른손 칸') ? JSON.stringify({ palmDetected: false, notPalmReason: '고양이 사진입니다.' }) : palm });
  const response = await analyze({ rightPalmImage: 'data:image/png;base64,' + 'B'.repeat(80) });
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ code: 'PALM_NOT_DETECTED', reason: '오른손 칸 사진에서는 손바닥을 찾지 못했어요. 고양이 사진입니다.' });
  expect(docs).toHaveLength(0);
  expect(visionParts[1].text).toBe(visionPrompt);
});
test('a non-Korean locale gets its own refusal copy and an output-language note in the vision turn', async () => {
  const palm = visionReply.text;
  visionReply = prompt => ({ ok: true, provider: 'gemini', text: prompt.includes('오른손 칸') ? JSON.stringify({ palmDetected: false, notPalmReason: 'It is a cat.' }) : palm });
  const response = await runWithAiLocale('en', () => analyze({ rightPalmImage: 'data:image/png;base64,' + 'B'.repeat(80) }));
  expect(await response.json()).toMatchObject({ code: 'PALM_NOT_DETECTED', reason: 'We could not find a palm in the right hand photo. It is a cat.' });
  expect(visionParts[1].text).toContain('Write the ENTIRE response in English only.');
  visionReply = { ok: true, provider: 'gemini', text: JSON.stringify({ palmDetected: true, imageQuality: { palmCoverage: 0.2 }, majorLines: { lifeLine: { detected: true } } }) };
  expect(await (await runWithAiLocale('ja', () => analyze())).json()).toMatchObject({ code: 'IMAGE_QUALITY_LOW', error: '線を読み取れるほど写真が鮮明ではありません。' });
});
test('a line the model saw on a mostly hidden palm does not pass the quality gate', async () => {
  visionReply.text = JSON.stringify({ palmDetected: true, imageQuality: { brightness: 'good', sharpness: 'good', palmCoverage: 0.2 }, majorLines: { lifeLine: { detected: true } } });
  const response = await analyze();
  expect(response.status).toBe(423); expect((await response.json()).code).toBe('IMAGE_QUALITY_LOW');
  expect(docs).toHaveLength(0);
});
test('line text the model left out stays empty and reaches the deep consult as uncertainty', async () => {
  visionReply.text = JSON.stringify({ palmDetected: true, imageQuality: { brightness: 'good', sharpness: 'good', palmCoverage: 0.95 }, majorLines: { lifeLine: { detected: true, summary: '선 확인', advice: '천천히 가세요.' }, heartLine: { detected: true } }, minorLines: { marriageLine: { detected: true, strength: 'weak' } } });
  expect((await analyze()).status).toBe(200);
  const reading = docs[0].metadata.palmResult.leftHandReading;
  expect(reading.minorLines.marriageLine).toMatchObject({ summary: '', defaultedFields: ['summary'] });
  expect(reading.majorLines.heartLine).toMatchObject({ summary: '', advice: '' });
  expect(reading.majorLines.heartLine.defaultedFields).toEqual(expect.arrayContaining(['summary', 'advice']));
  expect(reading.majorLines.lifeLine.defaultedFields).not.toContain('summary');
  expect(JSON.stringify(reading)).not.toMatch(/분석했습니다|판독했습니다/u);
  expect(textPrompt).toMatch(/"uncertainLines": \{\s*"left": \[\s*"heartLine",\s*"marriageLine"\s*\]/u);
  expect(textPrompt).toContain('그 선의 의미를 지어내지 말고');
});
test('heading lines separated by a blank line stay attached to their section', async () => {
  const body = '사진에서 확인된 선을 토대로 생활 속 선택을 차분히 살펴봅니다. '.repeat(4).trim();
  ai.text = `■ 한 문장 요약\n\n${body}\n\n■ 타고난 성향\n\n${body}`;
  const consult = await deep({}, {});
  expect(consult.text).toBe(`■ 한 문장 요약\n${body}\n\n■ 타고난 성향\n${body}`);
});
test('pass read before the background usage record confirms the pass under the same requestId', async () => {
  await save({}, owner, 'palm-original', result);
  payment.mockImplementation(async (_env, input) => ({ proven: input.requireExisting ? false : true, source: 'pass' }));
  try {
    await expect(read({}, owner, 'palm-original')).rejects.toMatchObject({ status: 403 });
    const response = await route(new Request('https://mock.test/api/palm/result?requestId=palm-original&accessMethod=pass'), {});
    expect(response.status).toBe(200);
    expect(payment.mock.calls.at(-1)[1]).toMatchObject({ requestId: 'palm-original' });
    expect(payment.mock.calls.at(-1)[1].requireExisting).toBeUndefined();
    // Reading "the latest reading" without a requestId never spends a pass.
    payment.mockClear();
    await expect(read({}, owner, '', 'pass')).rejects.toMatchObject({ status: 403 });
    expect(payment).toHaveBeenCalledTimes(1);
  } finally {
    payment.mockImplementation(async () => ({ proven: proof, source: 'payment' }));
  }
});
