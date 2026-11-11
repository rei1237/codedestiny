# Non-LLM access audit, 2026-11-11

## Scope and decision

The user's final exception is explicit: section_summary (light saju), section_daewun and their existing 29,000 KRW saju_lifetime_bundle remain paid. Actual language/image generation and manually delivered expert consultations are not deterministic free readings.

Canonical policy: lib/payment/free-fortune-policy.mjs, 62 exact keys (54 previously verified plus eight below). Historical registry prices, payment receipts, refund/revocation checks and owned archives are not rewritten. Price/category/name alone never classifies a product as free.

## Enumerated surfaces

1. Every featureKey in lib/saju/saju-service-catalog.mjs.
2. Every js/core/service-registry.js entry whose methods contain saju, ziwei, vedic, sukuyo or astrology.
3. Every index.html button/link with those data-cd-methods, then the entire feature/price/CTA-key set to catch misplaced category labels.
4. Connected product subroutes: all three Compass calculation cards, FPTI deep report, flower and Olympus. Cross-checked worker/lib/light-fortune-catalog.js and docs/superpowers/specs/2026-11-04-light-fortune-audit.md against current executable paths; that older audit alone is not proof of current gating.

This is an enumeration of these target catalogues and their linked products, not a claim that every possible dynamic route in the repository was exhaustively explored. Tarot, runes, I Ching, meditation, physiognomy, dreams and MBTI-only products were not automatically added.

## Eight additional deterministic keys

| Exact key | Current calculation / old gate | Delivery boundary |
|---|---|---|
| destiny-compass-crossroads | Crossroads.tsx computeCrossroad; ensurePaidAccess | Local current input, no new paid archive |
| destiny-compass-life-voyage | LifeVoyage.tsx field.timeline and fixed copy | Local current input, no new paid archive |
| destiny-compass-future-sim | FutureSim.tsx field.timeline | Local current input, no new paid archive |
| destiny-bias-analyze | DestinyBiasClient.tsx computeCore/buildChemiReport; engine/chemiReportBridge.ts buildSajuProfile | Local calculation, keep historical resume independent |
| premium-fpti-report | worker/routes/fpti.js buildLocalReport/toDeepPayload | New authenticated POST /api/fpti/deep-report/free, owned ProfileCard and exact birthInput match, same real pure adapter; public/saved:false |
| daily-fortune-reading | TodayHubClient.tsx old gate; worker/routes/fortune-today.js buildTodayFortunes | Existing public calculation/cache unchanged, deeper AI links remain separate |
| flower-fc | index.html five-system flower tile retains old lock; worker/routes/destiny-flower.js already free/authenticated | Reconcile old CTA/new-sale policy with existing free server; no paid archive creation |
| olympus-fc | index.html wrongly classified only as etc; js/olympus-oracle.js Swiss placements; OlympusVIPLounge.jsx calcPlacements/DAILY_ORACLES | Astrology-based fixed text. Direct app already had no paywall; reconcile old main entry gate, preserve selected-input/auth lifecycle |

The first three have a separate actual AI product, destiny-compass-deep-report. Do not free it. Compass historical save/resume uses compat-result-archive and its original owner/evidence/refund rules.

## Remaining target catalogue entries

Actual paid model calls (paths below are executable provider calls, not a marketing AI label):

- neo-operation-room-consultation: worker/routes/neo-operation-room.js callGeminiText (~1069).
- fortune-tea-house-tarot-consultation: worker/routes/fortune-tea-house.js callGeminiText (~4421).
- master-love-codex and master-love-codex-compat: worker/routes/master-love-codex.js generateChapter/callGeminiText (~750).
- love-secret-ai-consultation: worker/routes/love-secret-ai.js callGeminiJsonWithRetry (~820).
- new-year-ai-consultation: worker/routes/new-year-ai.js callGeminiText (~2150).
- life-book-ai-consultation: worker/routes/life-book-ai.js callGeminiText (~1739).
- compat-saju-compatibility: worker/routes/saju-compat-basic.js callGeminiText (~44); not the static section_compat key.
- fortune-chat-consultation and linked yeongnyangi saju/astrology/sukuyo products: worker/yeongnyangi/providers/code-destiny.ts callGeminiText (~48).
- premium-sibyl-dominator: worker/lib/sibyl-report-store.js generateSibylCounsel (~41-43).
- saju-guardian-unlock: worker/routes/guardian-image.js NVIDIA Flux endpoint (~9), fetch (~116). Image generation remains paid.
- premium-naming-prompt: worker/routes/naming-prompt.js generateNamingWave (~1783), worker/lib/naming-report-delivery.js callGeminiText (~35). Separate free naming basis already exists.
- pet-saju-ai-consultation: worker/routes/pet-saju-ai.js runPaidNarrativeDelivery; worker/lib/paid-narrative-delivery.js callGeminiJsonWithRetry (~217).
- fusion-fortune-consultation: worker/lib/fusion-fortune.js callGeminiJsonWithRetry (~939).
- karma-destiny-ai-consultation: worker/routes/karma-destiny-ai.js callGeminiText (~1809).
- tarot-celestial-harmony: worker/lib/celestial-report-delivery.js callGeminiText (~76).
- nakshatra-ai-consultation: worker/routes/nakshatra-ai.js callGeminiText (~707).
- life-fortune-ai-consultation, sukuyo-compatibility-ai, ziwei-ai-consultation, ziwei-deep-pdf, astrology-ai-consultation, vedic-ai-consultation remain separate paid AI routes. Verified provider examples: sukuyo-compatibility-ai.js (~1527), ziwei-ai.js (~1706), astrology-ai.js (~1221), vedic-ai.js (~1450).

Not newly payable calculation:
- human-design-chart: HumanDesignClient.tsx explicitly keeps the chart free (~6-10); historical pricing key remains. Static guide now uses human_design_reading; actual human-design-report remains paid.
- neo-email-consultation: manually reviewed/edited/sent expert advice, worker/routes/neo-consultations.js (~31-38), not a pure calculation. Do not remove payment just because no model call occurs in its route.
- Saju fun presentation aliases rpt_tTestCard, rpt_hormone-vibe-section, rpt_aiPromptCard, rpt_lottoCard, rpt_sajuFourCutCard and rpt_dopamineCard are frontend static presentations, not permission to free actual AI prompt APIs. They are handled by dedicated approved static keys (saju_fun_shared, saju_daily_reading and the exact lottery key).

## FPTI contract and preservation

New request: POST /api/fpti/deep-report/free with profileId and birthInput {birthDate, birthTime, birthTimeUnknown, calendarType}. Exact values must match the authenticated account's saved profile. Time unknown uses empty birthTime; lunar_leap is distinct. No client result/code/reportSignature is trusted for calculation. The existing fpti-adapter uses Asia/Seoul; this change reuses that same adapter and does not change its historical timezone/calculation policy or accept caller timezone overrides.

Response: {ok:true,data:{source:'public',accessSource:'public',featureKey:'premium-fpti-report',profileId,saved:false,report}}. Profile lookup is read-only. No receipt, entitlement, charge or paid result archive is created. Old GET/POST /deep-report retain their exact access and archive behavior for historical purchases; free results must never be sent there to masquerade as paid saves.

Verification: targeted mock suites cover every canonical key's purchase/honey denial, Play intent/free metadata versus old receipt verification, Compass archive ownership, destiny-bias saved records, FPTI historical archive behavior, free owner/input constraints and a representative invocation of the real bundled deterministic FPTI adapter. Live payments, models and production DB were not invoked.
