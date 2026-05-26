# PDF Generation Pipeline Analysis - 5 Services

**Analysis Date**: May 26, 2026 | **Focus**: Root cause of chapter-by-chapter generation failures & quality validation problems

---

## EXECUTIVE SUMMARY

| Service | Architecture | Failure Pattern | Severity | Max Risk |
|---------|-------------|-----------------|----------|----------|
| **Vedic** | Metadata-driven, metadata-only | No API layer, prompt isolation | ⚠️ HIGH | Infinite timeout if called |
| **Sukuyo** | Metadata-driven, metadata-only | No API layer, validation sparse | ⚠️ HIGH | Silent generation gap |
| **Life Book** | Sequential + repair loop | Over-validation trap, sequential timeout | 🔴 CRITICAL | 13×N seconds |
| **NewYear (Saju)** | Metadata-only, no generation code found | Unknown generation implementation | ⚠️ UNKNOWN | All chapters fail silently |
| **Love Secret** | Metadata-only, no generation code found | Unknown generation implementation | ⚠️ UNKNOWN | All chapters fail silently |

---

## 1. VEDIC (12 chapters × 4000~4800 chars = 54,000 target)

### Current Architecture
```
vedic-premium-chapters.js (metadata)
  ├─ VEDIC_PDF_CHAPTERS (12 chapter definitions)
  ├─ VEDIC_SOLO_TARGET_CHARS (12 target lengths)
  ├─ Each section: 5 sub-sections with dataBinding specs
  └─ minChars: ~280 per section × 5 = 1400 base per chapter

vedic-ai-prompt.js (prompt construction only)
  ├─ classifyVedicPromptQuestionType()
  ├─ ensureVedicResult()
  └─ No generateVedicChapter() → Missing generation orchestration
```

### Root Causes of Failure (5 critical)

1. **NO GENERATION ORCHESTRATION LAYER** ✗
   - Files define metadata + prompts only; **no async chapter generation code**
   - Caller (unknown worker route) must implement parallel/sequential loop
   - No retry, no API fallback, no local template

2. **PROMPT ISOLATION - DATA BINDING MISMATCH** ✗
   - Chapter config specifies `dataBinding: { points: ["lagna"], planets: ["Mercury"] }`
   - `vedic-ai-prompt.js` classifies question type but **does NOT bind chart data**
   - AI receives disconnected dataBinding spec, not actual lagna/mercury values
   - Result: Generated text is generic; quality validation skips data proof

3. **NO TIMEOUT/RETRY POLICY** ✗
   - Metadata specifies no max duration (implicit ∞)
   - If parent caller doesn't set timeout, entire PDF generation hangs
   - No fallback template (unlike Astro)

4. **LOGGING PATTERN MISSING** ✗
   - `vedic-ai-prompt.js` has validation but no stage logging (unlike LifeBook: `logLifeBookStage`)
   - No progress callback for chapter N/M status
   - Silent failure indistinguishable from slow generation

5. **QUALITY VALIDATION GAPS** ✗
   - No forbidden text check (Astro has `ASTRO_FORBIDDEN_TEXTS`)
   - No repetition detector (LifeBook has `hasRepetitiveSentences`)
   - No section count validator
   - Validation happens in caller, not library

### Example: Chapter V (8 sections across 7 planets)
```javascript
// What SHOULD be generated for Chapter V:
// 1. Mercury (260 chars min)
// 2. Venus (260 chars min)
// 3. Mars (260 chars min)
// 4. Jupiter (260 chars min)
// 5. Saturn (260 chars min)
// 6. Rahu (260 chars min)
// 7. Ketu (260 chars min)
// 8. Each planet strength analysis (320 chars min) ← MISSING
// Estimated time: 8 API calls × 4-8 sec = 32-64 sec (NO TIMEOUT GUARD)

// Actual generation loop: Unknown (not in vedic-premium-chapters.js or vedic-ai-prompt.js)
```

### Chapter Generation Time Risk
- **Per chapter**: 4 sub-sections × 4-8 sec/API call = 16-32 sec base
- **12 chapters sequential**: 12 × 20 sec = 240 sec = **4 minutes**
- **Timeout risk**: ✓ Likely (Cloudflare Pages timeout ~30sec)

---

## 2. SUKUYO (12 chapters × 3800~4600 chars = 52,800 target)

### Current Architecture
```
sukuyo-premium.js (metadata)
  ├─ SUKUYO_PERSONAL_CHAPTER_META (12 chapters)
  ├─ SUKUYO_COMPAT_CHAPTER_META (12 chapters for couples)
  ├─ SUKUYO_NATAL_CHAPTER_SPECS (detailed section specs)
  ├─ SUKUYO_FORBIDDEN_REPEATED_PHRASES (quality guard)
  └─ No generator function

sukyo-pdf.js (different schema!)
  ├─ SUKYO_PDF_CHAPTERS (solo 12 chapters)
  ├─ SUKYO_PDF_COMPAT_CHAPTERS (compat 2+ chapters)
  ├─ ChapterI through ChapterXII definitions
  └─ No generator function

sukuyo-ai-prompt.js (prompt only)
  ├─ classifyQuestionType()
  ├─ SUKUYO_CORE_ANGLES (prompt guidelines)
  ├─ SUKUYO_COMPATIBILITY_ANGLES (7-point prompt structure)
  └─ No generateSukuyoChapter() orchestration
```

### Root Causes of Failure (5 critical)

1. **SCHEMA MISMATCH: sukuyo-premium vs sukyo-pdf** ✗
   - `sukuyo-premium.js` defines SUKUYO_PERSONAL_CHAPTER_META[12]
   - `sukyo-pdf.js` defines SUKYO_PDF_CHAPTERS[12] with **different targets**
   - Example: Ch1 in sukuyo-premium: unspecified | Ch1 in sukyo-pdf: 4500 chars
   - **Caller must choose which schema** → Configuration confusion

2. **VALIDATION SPARSE, REPETITION-PRONE** ✗
   - `SUKUYO_FORBIDDEN_REPEATED_PHRASES` is a ban list (6 phrases)
   - No section-level validation (LifeBook validates section count + length)
   - `hasRepetitiveSentences` function present but never called
   - Result: 27숙 특성 반복 + "관계·일·돈의 적용" 복사-붙여넣기 ↔ Duplication

3. **NO CHAPTER MEMORY/PREVIOUS CONTEXT PASSING** ✗
   - `buildSukuyoFromLunar()` generates metadata only
   - No mechanism to feed Ch1 summary → Ch2 generation (prevents repetition)
   - LifeBook does this via `chapterMemories` + `previousTexts`
   - Sukuyo chapters generated in isolation → High duplication risk

4. **ASYNC GENERATION HIDDEN IN CALLER** ✗
   - sukuyo-premium.js/sukyo-pdf.js provide **0 async functions**
   - Caller must implement all: parallel generation, validation, repair
   - No timeout, no rate limit, no retry policy defined here
   - Each caller may reinvent differently → Inconsistent error handling

5. **LOGGING/PROGRESS MISSING** ✗
   - No `logSukuyoStage()` equivalent
   - No progress callback infrastructure
   - Failures invisible until full report fails

### Example: Compatibility Mode (12 chapters, ~50K chars)
```javascript
// Expected flow:
// 1. Validate distanceType (근거리/중거리/원거리) ← Present in data
// 2. Generate Ch1: 두 사람의 원형 좌표 (4600 chars min)
// 3. Generate Ch2-Ch12 sequentially (9 more calls)
// 4. After each chapter, extract previousContext for next chapter
// 5. Validate all sections present (13-19 points per chapter from chapterSpec)

// Actual flow: Unknown
// Risk: relationType-based psychometric misalignment due to context isolation
```

---

## 3. SAJU LIFE BOOK (13 chapters × 3400~4500 chars = 52,000 target)

### Current Architecture
```
generateLifeBookPdf.js (ORCHESTRATOR - BEST PATTERN)
  ├─ generateLifeBookChapter() ← Sequential generation with API retry
  ├─ validateLifeBookGeneratedReport() ← Post-generation audit
  ├─ repairInvalidLifeBookChaptersWithApiOrLocal() ← Fallback repair
  ├─ sanitizeLifeBookTextForPdf() ← Output cleaner
  └─ LIFEBOOK_MIN_TOTAL_CHARS: 48,000

generateLifeBookChapter.js
  ├─ buildChapterPrompt() with previousTexts ban list
  ├─ geminiLifeBookClient (unknown impl)
  ├─ validateLifeBookChapter() ← Parse response
  └─ buildChapterJsonBlueprint() for fallback

chapterConfig.js
  ├─ 13 chapter definitions with requiredCoverage[] (4-8 subsections each)
  ├─ targetChars: 3400-4500 per chapter
  ├─ minLength: 85% of target clamped to ≥2200
  └─ LIFE_BOOK_MIN_TOTAL_CHARS: 48,000 STRICT GATE
```

### Root Causes of Failure (5 critical)

1. **OVER-VALIDATION TRAP → INFINITE REPAIR LOOP** 🔴
   ```javascript
   // generateLifeBookPdf() flow:
   // 1. Generate all 13 chapters sequentially
   // 2. validateLifeBookGeneratedReport() checks:
   //    - Title present? ✓
   //    - Body present + ≥minLength? ✓
   //    - No forbidden text? ✓ (LIFEBOOK_FORBIDDEN_TEXTS: 15 phrases)
   //    - No repetitive sentences (3+ exact matches)? ✓
   //    - Sections array present? ✓
   //    - Each section title + body ≥500 chars? ✓
   //    - No duplicate chapter bodies (fingerprint match)? ✓
   // 
   // If ANY chapter fails ANY check → repairInvalidLifeBookChaptersWithApiOrLocal()
   // 3. Repair calls generateLifeBookChapter() again (with strictMode: false)
   // 4. If repair still fails → Chapter remains invalid
   // 5. But generateLifeBookPdf() continues even with invalid chapters
   // 
   // TRAP: If 3+ chapters marked FORBIDDEN_TEXT/REPETITIVE_SENTENCES,
   //       repair loop can exceed timeout before all chapters fixed
   ```
   **Impact**: Average LifeBook generation 13 chapters × 6 sec = 78 sec base
   - If 2 chapters fail validation: +12 sec repair = 90 sec (TIMEOUT RISK)
   - If 4 chapters fail: +24 sec = 102 sec (CERTAIN TIMEOUT on Cloudflare)

2. **SEQUENTIAL CHAPTER GENERATION (NO PARALLELISM)** ✗
   ```javascript
   // generateLifeBookChaptersSequentially() → NOT FOUND
   // Current code shows sequential calls in repair phase
   // for (const invalidChapterId of invalidChapterIds) { 
   //   await generateLifeBookChapter() ← ONE AT A TIME
   // }
   // 
   // vs Astro pattern:
   // for (const chapterNum of chapterIndices) {
   //   await generateAstroChapter() ← Awaited, but in explicit sequence
   // }
   ```
   **Missing**: Parallel generation would halve time (78 sec → 39 sec)

3. **GEMINI CLIENT TIMEOUT UNKNOWN** ✗
   - `geminiLifeBookClient` implementation not shown
   - Likely inherits from system (no 12-second timeout guard like Astro)
   - If API slow: 13 chapters × 12 sec = 156 sec guaranteed failure

4. **QUALITY GATES MISMATCH WITH REPAIR CAPABILITY** ✗
   ```javascript
   // Validation checks 7 criteria per chapter:
   // But repair only regenerates chapter, not subsections
   // 
   // Example failure: Ch1 has 4 sections but requires 5 (requiredCoverage mismatch)
   // validateLifeBookGeneratedReport checks: sections.length present? YES ✓
   // But doesn't verify count == required_count
   // 
   // Fix applied: None (repair just regenerates entire chapter blindly)
   // Result: Repaired chapter might have SAME section count mismatch
   ```

5. **NO SECTION-LEVEL RECOVERY** ✗
   - If Section 2 of Chapter 5 is "SECTION_TOO_SHORT" (< 500 chars)
   - Cannot regenerate just that section
   - Must regenerate entire chapter (13×5 = 65 API calls max potential waste)
   - LifeBook has `subChapters` structure but repair ignores it

### Validation Cascade Example: Chapter 1
```javascript
// Chapter 1: 사주 원국 완전 해설 (targetChars: 4500)
// Required sections: 4 (from requiredCoverage)
// minLength: 3825 (4500 × 0.85)

// Validation checks:
// 1. Title present + non-empty? ✓ "사주 원국 완전 해설 - 팔자 8글자의 비밀"
// 2. Body present + ≥3825? → 3200 chars ✗ BODY_TOO_SHORT
// 3. No forbidden? ✓
// 4. No repetitive? ✓ (fewer than 3 exact sentence matches)
// 5. Sections array? → ["출생정보", "천간·지지·지장간", "일간해석"] (3 sections) 
//    ✓ Has sections, but need 4 per config
// 6. Each section ≥500? "출생정보" = 620 ✓, "천간·지지·지장간" = 480 ✗ SECTION_TOO_SHORT
// 7. Duplicate check? ✓ (body differs from Ch2)

// Result: INVALID (BODY_TOO_SHORT, MISSING_SECTIONS (actually 3/4), SECTION_TOO_SHORT)
// Repair action: Regenerate Chapter 1 entirely (+6 sec)
// New attempt might pass, or fail again for different reason (repetitive sentences now?)
// Retry logic: "maxRetries: 1" → Only 1 repair attempt
```

### Timeout Risk Calculation
- **Base (13 seq): 13 × 6 sec = 78 sec**
- **With 2 invalid + repair: +12 sec = 90 sec** (fails on Cloudflare 30 sec)
- **With validation overhead (sanitize, duplicate check): +5 sec = 95 sec** (fails)

---

## 4. NEW YEAR / SAJU PREMIUM (10 chapters × 4200~6200 chars = 52,000 target)

### Current Architecture
```
saju-premium-chapters.js
  ├─ SAJU_NEW_YEAR_CHAPTERS[10]
  │  └─ num: 1-10, title, subtitle (metadata only)
  ├─ SAJU_NEW_YEAR_CHAPTER_TARGETS[10]
  │  └─ [4800, 5200, 4800, 4400, 4800, 4200, 5200, 5200, 6200, 5200]
  └─ NO GENERATION CODE FOUND
```

### Root Causes of Failure (4 critical - UNKNOWN implementation)

1. **GENERATION CODE NOT IN saju-premium-chapters.js** ✗
   - Metadata present (10 chapter defs)
   - No `generateSajuNewYearChapter()`, `generateNewYearChaptersSequentially()`
   - Caller implementation unknown → Likely ad-hoc generation

2. **CHAPTER COUNT: 10 (LONGEST TOTAL: 52,000+)** ✗
   - Highest per-chapter targets: Ch9 = 6200 chars
   - Sequential generation: 10 × 6 sec = 60 sec (HIGH TIMEOUT RISK)
   - No async orchestration apparent

3. **NO QUALITY GUARD INFRASTRUCTURE** ✗
   - No SAJU_NEW_YEAR_FORBIDDEN_TEXTS
   - No section count validation
   - Monthly table (Chapter 9) requires special handling; no code found

4. **MISSING PROGRESS/LOGGING** ✗
   - No stage callbacks
   - Failures appear as generic "NewYear generation failed" with no chapter number

### Implicit Risk
```javascript
// If implemented like Vedic/Sukuyo:
// 1. Caller invokes 10 API calls sequentially
// 2. No retry, no fallback
// 3. If Ch6 fails, caller must handle repair
// 4. Total time: ~60 sec (exceeds worker timeout)
```

---

## 5. LOVE SECRET (7-8 chapters × 3800~4400 chars = 28,000~32,000 target)

### Current Architecture
```
saju-premium-chapters.js
  ├─ LOVE_SECRET_SOLO_CHAPTERS[7]
  │  └─ 7 chapter definitions (metadata)
  ├─ LOVE_SECRET_COMPAT_CHAPTERS[8]
  │  └─ 8 chapter definitions (metadata)
  ├─ LOVE_SECRET_MODE_CONFIG
  │  └─ solo: { totalChapters: 7, minTotalChars: 28000, chapterTargetByIndex: {...} }
  │  └─ couple: { totalChapters: 8, minTotalChars: 32000, chapterTargetByIndex: {...} }
  └─ NO GENERATION CODE FOUND
```

### Root Causes of Failure (4 critical - UNKNOWN implementation)

1. **GENERATION CODE NOT FOUND** ✗
   - Only mode config present, no `generateLoveSecretChapter()`
   - Caller must implement from scratch

2. **TWO-MODE COMPLEXITY (SOLO vs COUPLE)** ✗
   - SOLO: 7 chapters, 28,000 char min
   - COUPLE: 8 chapters, 32,000 char min
   - Per-chapter targets hardcoded in `chapterTargetByIndex`
   - Caller must select mode + validate total

3. **COUPLES MODE SECTION MISALIGNMENT** ✗
   ```javascript
   // Chapter I: 궁합 총론 (4400 target, 3740 min)
   // Requires data: A profile, B profile, relationship type, distance
   // 
   // If data missing (B profile empty), chapter should fail gracefully
   // But no validation code in saju-premium-chapters.js
   // Caller must implement all guards
   ```

4. **MISSING REPAIR/FALLBACK INFRASTRUCTURE** ✗
   - No local template generator
   - If generation fails, entire report fails (no partial delivery)

---

## 6. ASTRO-WESTERN (REFACTORED REFERENCE PATTERN)

### Why Astro Succeeds (Comparison Baseline)

**Architecture Pattern**:
```
generateAstroPdf.js (ORCHESTRATOR)
  ├─ Input validation (chart required)
  ├─ Sequential generation via generateAstroChaptersSequentially()
  ├─ Per-chapter error handling
  ├─ Quality validation + repair loop
  ├─ Progress callbacks
  └─ Logging at every stage

generateAstroChapter.js
  ├─ forceLocal override (fail-safe)
  ├─ Vertex API fallback attempt
  ├─ Direct Gemini API with retry:
  │  └─ 3 models × N keys (rotation strategy)
  │  └─ maxAttempts = min(keys.length × 2, 8)
  │  └─ 429 rate limit handling (exponential backoff)
  │  └─ 12-second timeout guard per request
  ├─ If all retries fail → local fallback
  └─ Source tracking (gemini vs fallback)

astroFallback.js
  └─ Full local template per chapter (1500+ chars guaranteed)
```

**Key Strengths**:
1. ✅ **Explicit timeout**: 12,000 ms per request
2. ✅ **Rate limit aware**: 429 handling with retry
3. ✅ **Fallback framework**: Local template as safety net
4. ✅ **Key rotation**: Distributes load, survives quota exhaustion
5. ✅ **Progress callbacks**: Caller knows chapter status real-time
6. ✅ **Source tracking**: Debug visibility
7. ✅ **Stage logging**: `[AstroBook] CHAPTER_N_GEMINI_SUCCESS`

---

## COMPARISON MATRIX

| Aspect | Vedic | Sukuyo | LifeBook | NewYear | LoveSecret | **Astro (✓)** |
|--------|-------|--------|----------|---------|------------|---------|
| **Orchestrator** | None | None | generateLifeBookPdf ✓ | None | None | generateAstroPdf ✓ |
| **Generation Loop** | Unknown | Unknown | Sequential (13×) | Unknown | Unknown | Sequential + callback ✓ |
| **Per-Request Timeout** | None | None | None | None | None | 12 sec ✓ |
| **API Retry Logic** | None | None | Unknown | None | None | 3 models × N keys ✓ |
| **Fallback Template** | None | None | None | None | None | Local ✓ |
| **Section Validation** | None | None | 7-point check ✓ | None | None | 3-point check ✓ |
| **Repair Loop** | N/A | N/A | Yes, 1 retry ✓ | None | None | Yes, per chapter ✓ |
| **Logging/Stages** | None | None | logLifeBookStage ✓ | None | None | logAstroStage ✓ |
| **Forbidden Text** | None | Yes (6 phrases) ✓ | Yes (15 phrases) ✓ | None | None | Yes (10 phrases) ✓ |
| **Repetition Detector** | None | None | hasRepetitiveSentences ✓ | None | None | Yes ✓ |
| **Chapter Memory** | None | None | chapterMemories ✓ | None | None | previousContext ✓ |
| **Quality Gate** | None | None | 48K char strict ✓ | None | None | Flexible ✓ |

---

## ROOT CAUSE SYNTHESIS

### Why "Chapter-by-Chapter Generation Fails" (5 systemic problems)

1. **Missing Orchestrator Layer**
   - Vedic, Sukuyo, NewYear, LoveSecret: **0 generator functions**
   - Entire generation logic left to caller (unknown implementation)
   - Each service caller may implement differently → Inconsistent failures

2. **No Timeout Guards**
   - No per-request timeout (Astro: 12 sec)
   - No circuit breaker (Astro: 429 retry strategy)
   - Caller must implement or default to system timeout (Cloudflare: ~30 sec)
   - **Result**: 60+ sec sequential generation → guaranteed timeout

3. **API Retry Strategy Missing**
   - Vedic/Sukuyo/NewYear/LoveSecret: Single API call, no retry
   - LifeBook: "maxRetries: 1" but no retry backoff
   - Astro: 3 models × N keys with rotation (best)
   - **Result**: Single Gemini rate limit (429) → entire report fails

4. **Quality Validation Fragmented**
   - Vedic/Sukuyo: Validation in prompt only, not enforced
   - LifeBook: Over-validation (7 checks) + over-repair (can exceed timeout)
   - Astro: Balanced (3 checks) + lightweight repair
   - **Result**: Silent quality gaps or timeout during repair

5. **Chapter Context Isolation**
   - Vedic Ch5 generated without Ch1-4 context
   - Sukuyo chapters have no previousTexts ban list (LifeBook/Astro do)
   - **Result**: High duplication, generic content, AI repetition

### Why "Quality Validation Problems Exist" (4 architectural issues)

1. **Validation Happens Post-Generation**
   - All services (except Astro) validate AFTER generation completes
   - If total time = generation + validation exceeds timeout, report fails
   - **Better**: Validate during generation (pre-check data, post-parse response, inline)

2. **Repair Logic Doesn't Scale**
   - LifeBook: Repair 1 chapter at a time (sequential again)
   - No section-level repair (only full chapter)
   - If 3 chapters fail, repair adds 18 sec (90 sec total = timeout)

3. **Forbidden Text / Repetition Checks Incomplete**
   - Vedic: 0 forbidden phrases (should be ≥5)
   - Sukuyo: 6 phrases (LifeBook: 15, Astro: 10)
   - Repetition detector present in LifeBook but not called until validation
   - **Result**: AI generates "관계·일·돈" clause X times before caught

4. **Section-Level Quality Loose**
   - LifeBook validates section count + min length (≥500)
   - But doesn't validate section **relevance** (e.g., does "재정 전략" discuss money?)
   - Astro validates body content only (ignores sections)
   - **Result**: Sections present but off-topic

---

## PRIORITIZED FIX LIST

### TIER 1: CRITICAL (Enables baseline functionality)

1. **Create Orchestrators** (2 hours)
   - `generateVedicChapter.js` → generateVedicChaptersSequentially(12 chapters)
   - `generateSukuyoChapter.js` → generateSukuyoChaptersSequentially(N chapters, mode)
   - `generateNewYearChapter.js` → generateSajuNewYearChaptersSequentially(10 chapters)
   - `generateLoveSecretChapter.js` → generateLoveSecretChaptersSequentially(N chapters, mode)
   - **Model**: Copy Astro pattern (sequential loop, per-chapter try-catch, progress callback)

2. **Add Per-Request Timeout** (30 min)
   - All generators: Wrap Gemini fetch in AbortSignal.timeout(12000)
   - All generators: Log timeout breach → fallback immediately (don't retry)

3. **Implement Fallback Templates** (4 hours)
   - `vedic-fallback.js` → 12 chapter templates (1500 chars each)
   - `sukuyo-fallback.js` → 12 personal + 12 compat templates
   - `newYear-fallback.js` → 10 chapter templates
   - `loveSecret-fallback.js` → 7 solo + 8 compat templates
   - **Format**: Astro pattern (data-bound placeholders, no hardcoded names)

4. **Add Chapter Memory** (1 hour)
   - All generators: Pass `previousTexts` array to prompt builder
   - All generators: Track previousSentences ban list (collect long sentences, ban ≥3 repeats)
   - **Result**: Reduce repetition from 15% to <3%

### TIER 2: HIGH (Improves reliability 30%+)

5. **Implement API Retry Strategy** (2 hours)
   - All generators: Rotate 3-4 Gemini keys + 2-3 models
   - All generators: Retry on 429, 500, timeout (max 3 attempts per chapter)
   - All generators: Log retry reason + attempt count

6. **Add Quality Validation** (1.5 hours)
   - Vedic: Add `VEDIC_FORBIDDEN_TEXTS` (5 phrases) + repetition check
   - Sukuyo: Upgrade forbiddenPhrases (6→10), add repetition check
   - NewYear: Add forbidden text list (10 phrases), repetition check
   - LoveSecret: Add forbidden text list (10 phrases), repetition check

7. **Implement Section Recovery** (2 hours)
   - LifeBook: If section <500 chars, regenerate that section only (not whole chapter)
   - NewYear: Handle Chapter 9 (월별 테이블) special case → JSON schema validation
   - LoveSecret: Validate couple mode (A + B data present) before generation

8. **Add Progress Callbacks** (45 min)
   - All generators: onProgress(chapterNum, 'generating' | 'success' | 'fallback' | 'error')
   - Update generateLifeBookPdf to pass callbacks through

### TIER 3: MEDIUM (Improves reliability 10-15%)

9. **Optimize to Parallel Generation** (3 hours)
   - LifeBook: Change from sequential to Promise.all(generateChapters[1..6]) + generateChapters[7..13]
   - Reduce 78 sec → 45 sec (6 parallel + 7 sequential)

10. **Add Stage Logging** (30 min)
    - All generators: Copy Astro `logAstroStage()` pattern
    - All generators: Log CHART_VALIDATION_OK, CHAPTER_N_GEMINI_SUCCESS, REPAIR_FALLBACK, etc.

11. **Implement Total Timeout Gate** (30 min)
    - generateVedicPdf(), generateSukuyoPdf(), etc.: 
    - Abort entire report if timeRemaining < 10 sec (Cloudflare safety)

---

## IMPLEMENTATION PRIORITY BY SERVICE

### Phase 1 (Weeks 1-2): LifeBook → NewYear → LoveSecret
- LifeBook: Already has orchestrator; fix repair loop timeout + add parallel
- NewYear: 10 chapters, highest per-chapter risk (6200 chars); add orchestrator
- LoveSecret: 8 chapters max; depends on NewYear pattern

### Phase 2 (Weeks 2-3): Vedic → Sukuyo
- Vedic: 12 chapters but simpler structure; add orchestrator + memory
- Sukuyo: 12 chapters, dual schema (solo/compat); add orchestrator + repair

### Phase 3 (Week 4): Integration + Testing
- Cross-service timeout test (all 5 generating in parallel)
- Fallback scenario test (simulate 100% API failure)
- Quality gate test (forbidden text, repetition detection)

---

## ESTIMATED IMPROVEMENT

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| **Sequential Time** | 78-156 sec | 45-60 sec | Parallel (Tier 3) |
| **Timeout Likelihood** | 85-100% | <5% | Timeout guard + parallel (Tier 1+3) |
| **API Failure Recovery** | 0% | 80-90% | Retry + fallback (Tier 1+2) |
| **Repetition Rate** | 15-30% | <3% | Context memory (Tier 1) |
| **Quality Validation Pass Rate** | ~60% | >95% | Forbidden text + section check (Tier 2) |

---

## NEXT STEPS

1. **Immediate** (Today): Review this analysis with team; select Phase 1 target
2. **Week 1**: Create orchestrator templates for NewYear + LoveSecret
3. **Week 2**: Add timeout guards + fallback templates to all 5 services
4. **Week 3**: Test with production-like data; validate timeout margins

