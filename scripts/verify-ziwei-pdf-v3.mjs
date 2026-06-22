import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ZIWEI_CHAPTER_EVIDENCE_FOCUS,
  ZIWEI_PDF_CONFIG,
  ZIWEI_PREMIUM_CHAPTERS_V2,
  buildZiweiChapterQualityReport,
  generateZiweiPremiumReport,
  validateZiweiPdfCompletionPayload,
  validateZiweiPremiumChapterHtml,
} from "../worker/lib/ziwei-premium-pdf-v2.js";

const root = process.cwd();
const enginePath = join(root, "worker/lib/ziwei-premium-pdf-v2.js");
const routePath = join(root, "worker/routes/ziwei-book.js");
const billingPath = join(root, "worker/routes/billing.js");
const frontendPath = join(root, "js/ziwei-book.js");
const publicFrontendPath = join(root, "public/js/ziwei-book.js");
const geminiPath = join(root, "worker/lib/gemini.js");

const files = {
  engine: readFileSync(enginePath, "utf8"),
  route: readFileSync(routePath, "utf8"),
  billing: readFileSync(billingPath, "utf8"),
  frontend: readFileSync(frontendPath, "utf8"),
  publicFrontend: readFileSync(publicFrontendPath, "utf8"),
  gemini: readFileSync(geminiPath, "utf8"),
};

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function count(source, pattern) {
  return (source.match(pattern) || []).length;
}

function includes(source, text) {
  return source.includes(text);
}

function checkSyntax(filePath) {
  try {
    execFileSync(process.execPath, ["--check", filePath], { stdio: "pipe" });
  } catch (error) {
    failures.push(`syntax:${filePath}:${String(error?.stderr || error?.message || error).slice(0, 300)}`);
  }
}

[
  enginePath,
  routePath,
  billingPath,
  frontendPath,
  geminiPath,
].forEach(checkSyntax);

assert(count(files.engine, /id:\s*"ch\d{2}"/g) === 15, "engine.chapter_count_must_be_15");
assert(count(files.engine, /ch\d{2}:\s*\[/g) >= 30, "engine.chapter_guidance_and_evidence_focus_count_must_cover_15_chapters_each");
assert(includes(files.engine, "export const ZIWEI_CHAPTER_EVIDENCE_FOCUS = Object.freeze({"), "engine.chapter_evidence_focus_exists");
assert(includes(files.engine, "function buildSectionEvidenceHints"), "engine.section_evidence_hints_exists");
assert(includes(files.engine, "function sectionEvidenceTerms"), "engine.section_evidence_terms_exists");
assert(includes(files.engine, "const ZIWEI_CHAPTER_REQUIRED_TERMS = Object.freeze({"), "engine.chapter_required_terms_exists");
assert(includes(files.engine, "function missingRequiredChapterTerms"), "engine.required_terms_validator_exists");
assert(includes(files.engine, "function actualChartEvidenceTerms"), "engine.actual_chart_evidence_terms_exists");
assert(includes(files.engine, "function hasPracticalScene"), "engine.practical_scene_validator_exists");
assert(includes(files.engine, "const ZIWEI_CHAPTER_PRACTICAL_FOCUS = Object.freeze({"), "engine.chapter_practical_focus_exists");
assert(includes(files.engine, "function missingChapterPracticalFocus"), "engine.chapter_practical_focus_validator_exists");
assert(includes(files.engine, '"직장"'), "engine.practical_scene_accepts_workplace_language");
assert(includes(files.engine, '"수입"'), "engine.practical_scene_accepts_income_language");
assert(includes(files.engine, '"배우자"'), "engine.practical_scene_accepts_partner_language");
assert(includes(files.engine, '"컨디션"'), "engine.practical_scene_accepts_condition_language");
assert(includes(files.engine, "chapter.evidence-focus"), "engine.chapter_evidence_focus_validator_exists");
assert(includes(files.engine, "chapter.required-terms"), "engine.chapter_required_terms_validator_exists");
assert(includes(files.engine, "chapter.actual-chart-evidence"), "engine.actual_chart_evidence_validator_exists");
assert(includes(files.engine, "section.actual-chart-evidence.coverage"), "engine.actual_chart_evidence_section_coverage_exists");
assert(includes(files.engine, "section.practical-scene"), "engine.section_practical_scene_validator_exists");
assert(includes(files.engine, "chapter.practical-focus"), "engine.chapter_practical_focus_issue_exists");
assert(includes(files.engine, "final.chapter-required-terms"), "engine.final_html_required_terms_validator_exists");
assert(includes(files.engine, "section.evidence-focus"), "engine.section_evidence_focus_validator_exists");
assert(!includes(files.engine, "return sanitizeZiweiLlmHtml(html.replace(DANGEROUS_HTML_RE"), "engine.must_not_silently_rewrite_forbidden_terms");
assert(!includes(files.engine, "별·궁"), "engine.must_not_use_generic_star_palace_pair");
assert(!includes(files.engine, "주의 깊게 볼 별"), "engine.must_not_use_generic_caution_star_label");
assert(!includes(files.engine, "궁과 별의 배치"), "engine.must_not_use_generic_star_arrangement");
assert(!includes(files.engine, "궁과 별의 균형"), "engine.must_not_use_generic_star_balance");
assert(!includes(files.engine, "보조 별"), "engine.must_not_use_generic_auxiliary_star_term");
assert(!includes(files.engine, "별의 조합"), "engine.must_not_use_generic_star_combination");
assert(!includes(files.engine, "강한 별"), "engine.must_not_use_generic_strong_star_term");
assert(includes(files.engine, "주성·보좌성·살성·궁·사화·대한·유년"), "engine.uses_precise_ziwei_source_terms");
assert(includes(files.engine, "주의 깊게 볼 성曜"), "engine.uses_precise_caution_star_label");
assert(includes(files.engine, 'const ZIWEI_PDF_PROMPT_VERSION = "ziwei-premium-prompt-v5";'), "engine.prompt_version_v5");
assert(includes(files.engine, 'const ZIWEI_PDF_QUALITY_VERSION = "category-depth-v4";'), "engine.quality_version_category_depth_v4");
assert(includes(files.engine, 'generationMode: "llm-html-v3"'), "engine.generation_mode_llm_html_v3");
assert(includes(files.engine, 'templateVersion: "ziwei-premium-html-v3.0.0"'), "engine.template_version_v3");
assert(includes(files.engine, '"반드시 파산"'), "engine.blocks_fear_based_financial_determinism");
assert(includes(files.engine, '"피할 수 없습니다"'), "engine.blocks_fear_based_fatalism");
assert(includes(files.engine, '"수명이"'), "engine.blocks_medical_lifespan_determinism");
assert(!/title:\s*"Ch\.\d+/.test(files.engine), "engine.chapter_titles_use_korean_ordinal");
assert(includes(files.engine, "function displayChapterTitle"), "engine.toc_title_display_helper_exists");
assert(includes(files.engine, "function displayReportName"), "engine.report_name_display_helper_exists");
assert(includes(files.engine, "\"패밀리 테스트\""), "engine.blocks_family_test_copy");
assert(includes(files.engine, "inputWarnings"), "engine.exposes_input_warnings");
assert(includes(files.engine, "palace_count_incomplete"), "engine.detects_incomplete_palaces");
assert(includes(files.engine, "four_transformations_missing"), "engine.detects_missing_transformations");
assert(includes(files.engine, "function stableStringify"), "engine.stable_cache_hash");
assert(includes(files.engine, 'source: "llm"'), "engine.cache_source_llm");
assert(includes(files.engine, "cached.localFallbackUsed !== true"), "engine.reject_local_fallback_cache");
assert(includes(files.engine, "&& clean(cached.provider)"), "engine.rejects_providerless_cache");
assert(includes(files.engine, "localFallbackUsed: false"), "engine.persist_local_fallback_false");
assert(includes(files.engine, 'errorCode: "cache_write_failed"'), "engine.cache_write_failure_is_nonfatal");
assert(includes(files.engine, "if (status === 429) return false;"), "engine.does_not_double_retry_provider_429");
assert(includes(files.engine, "function hasDangerousHtml"), "engine.dangerous_html_detector_exists");
assert(includes(files.engine, "function hasExecutableHtml"), "engine.final_html_executable_detector_exists");
assert(includes(files.engine, "function hasDisallowedChapterTag"), "engine.disallowed_chapter_tag_detector_exists");
assert(includes(files.engine, "html.disallowed-tag"), "engine.rejects_disallowed_chapter_tags");
assert(includes(files.engine, "function hasSectionHeadingEcho"), "engine.section_heading_echo_detector_exists");
assert(includes(files.engine, "section.heading-echo"), "engine.rejects_section_heading_echo");
assert(includes(files.engine, "const MIN_SECTION_BODY_LENGTH = 300;"), "engine.min_section_length_300");
assert(includes(files.engine, "const MIN_SECTION_PARAGRAPH_COUNT = 3;"), "engine.min_section_paragraph_count_3");
assert(includes(files.engine, "const MIN_CHAPTER_LENGTH_RATIO = 0.85;"), "engine.min_chapter_length_ratio");
assert(includes(files.engine, "function hasAsciiReportToken"), "engine.ascii_token_detector_exists");
assert(includes(files.engine, 'item === "workers-ai" || item === "gemini"'), "engine.restricts_ziwei_providers");
assert(includes(files.engine, "Math.min(3, Math.max(0, Number(env?.ZIWEI_PREMIUM_LLM_REPAIR_LIMIT ?? 2)))"), "engine.caps_repair_limit");
assert(includes(files.engine, "function resolveProviderModelName"), "engine.provider_model_resolver_exists");
assert(includes(files.engine, 'buildCacheKey(facts, chapterSpec, `${provider}:${modelName}`)'), "engine.cache_key_includes_provider_and_model");
assert(includes(files.engine, "palaces: facts.chart.palaces.map"), "engine.cache_key_includes_palace_star_details");
assert(includes(files.engine, "decadeLuck: facts.chart.decadeLuck"), "engine.cache_key_includes_decade_luck");
assert(includes(files.engine, "annualLuck: facts.chart.annualLuck"), "engine.cache_key_includes_annual_luck");
assert(includes(files.engine, "inputWarnings: facts.inputWarnings"), "engine.cache_key_includes_input_warnings");
assert(includes(files.engine, "clean(cached.provider) === cacheProvider"), "engine.cache_reuse_requires_same_provider");
assert(includes(files.gemini, "const GEMINI_QUOTA_RETRY_DELAYS_MS = Object.freeze([1000, 2000, 4000]);"), "gemini.quota_backoff_sequence_1_2_4_seconds");
assert(includes(files.gemini, "return base + Math.floor(Math.random() * 250);"), "gemini.quota_backoff_has_jitter");
assert(includes(files.gemini, "1 + GEMINI_QUOTA_RETRY_DELAYS_MS.length"), "gemini.quota_retry_attempt_count_is_limited");
assert(includes(files.gemini, "429 quota errors are retried only three times with 1s, 2s, 4s backoff plus jitter."), "gemini.quota_retry_comment_exists");
assert(!includes(files.engine, "html.replace(DANGEROUS_HTML_RE, \"\")"), "engine.must_not_strip_dangerous_html_before_validation");
assert(includes(files.engine, "const cachedHtml = cleanBlock(cached.html);"), "engine.validates_cached_html_without_structure_rewrite");
assert(includes(files.engine, "previousHtml = cleanBlock(result.rawText);"), "engine.validates_provider_html_without_structure_rewrite");
assert(!includes(files.engine, "normalizeZiweiChapterHtmlStructure"), "engine.removes_structure_rewriter");
assert(!includes(files.engine, "normalizeHeadingForMatch"), "engine.removes_heading_fuzzy_matcher");
assert(includes(files.engine, "validateZiweiFinalReportHtml(pdfReady.html || \"\", chapters)"), "engine.completion_runs_final_html_validation");
assert(includes(files.engine, "final.chapter-evidence"), "engine.final_html_validates_chapter_evidence");
assert(includes(files.engine, "final.section-evidence"), "engine.final_html_validates_section_evidence");
assert(includes(files.engine, "final.section-paragraphs"), "engine.final_html_validates_section_paragraphs");
assert(includes(files.engine, "chapter.source"), "engine.validates_chapter_source");
assert(includes(files.engine, "chapter.provider"), "engine.validates_chapter_provider");
assert(includes(files.engine, "hasTooManySimilarParagraphs(allParagraphs)"), "engine.blocks_similar_paragraphs");
assert(includes(files.engine, "paragraphSimilarity(list[i], list[j]) >= 0.82"), "engine.similar_paragraph_threshold_082");
assert(includes(files.engine, "similarPairs >= 3"), "engine.similar_paragraph_pair_limit_3");
assert(includes(files.engine, '"도움이 됩니다"'), "engine.forbids_generic_helpful_phrase");
assert(includes(files.engine, '"새로운 기회"'), "engine.forbids_generic_opportunity_phrase");
assert(includes(files.engine, '"행동하세요"'), "engine.forbids_generic_command_phrase");
assert(includes(files.engine, 'countOccurrences(stripTags(source), "새로운") > 6'), "engine.blocks_overused_new_phrase");
assert(!includes(files.engine, "function sanitizeZiweiLlmHtml"), "engine.removes_silent_sanitizer");
assert(includes(files.engine, "12궁의 주성 흐름"), "engine.cover_uses_ziwei_star_term");
assert(includes(files.engine, "마음과 선택의 결을 비추는 참고"), "engine.notice_uses_consultation_tone");
assert(includes(files.engine, "clean(llmAssembly.source) !== ZIWEI_PDF_CONFIG.generationMode"), "engine.validates_llm_assembly_source");
assert(includes(files.engine, "!clean(llmAssembly.provider)"), "engine.validates_llm_assembly_provider");
assert(includes(files.engine, "llmAssembly.fallbackUsed !== false"), "engine.requires_fallback_unused_flag");
assert(includes(files.engine, "llmAssembly.localFallbackUsed !== false"), "engine_requires_local_fallback_unused_flag");
assert(includes(files.engine, "이 장에서 우선 사용할 명반 근거"), "engine.prompt_includes_evidence_focus");
assert(includes(files.engine, "section별 우선 근거"), "engine.prompt_includes_section_evidence_hints");

[
  "generateLocalZiweiPdf",
  "generateLocalZiweiChapter",
  "buildZiweiLocalChapter",
  "buildZiweiSkeleton",
  "safeLocalGenerate",
  "renderRawJsonReport",
  "appendGenericAdviceSections",
].forEach((token) => {
  assert(!includes(files.engine, token), `engine.must_not_reference_${token}`);
});

assert(includes(files.route, "generateZiweiPremiumReport"), "route.calls_v3_generator");
assert(count(files.route, /validateZiweiPdfCompletionPayload\(/g) === 1, "route.must_not_call_legacy_completion_validator");
assert(includes(files.route, "validateZiweiLlmPdfCompletionPayload({ pdfReady, chapters: completedChapters, requireDownloadUrl: true })"), "route.validates_completed_payload");
assert(includes(files.route, "const downloadValidation = validateZiweiLlmPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl: true });"), "route.validates_download_payload");
assert(includes(files.route, "const completionValidation = validateZiweiLlmPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl: true });"), "route.validates_recovered_archive_with_download_url");
assert(includes(files.route, "const resultValidation = validateZiweiLlmPdfCompletionPayload({"), "route.validates_db_result_before_completed_response");
assert(includes(files.route, 'code: "ZIWEI_RESULT_VALIDATION_FAILED"'), "route.rejects_invalid_db_result");
assert(includes(files.route, "function getValidatedZiweiReportCache"), "route.validated_report_cache_helper_exists");
assert(count(files.route, /REPORT_CACHE\.get/g) === 1, "route.only_reads_report_cache_inside_validator");
assert(count(files.route, /REPORT_CACHE\.has/g) === 1, "route.only_checks_report_cache_inside_validator");
assert(includes(files.route, 'llmAssemblyOnly: true'), "route.marks_llm_assembly_only");
assert(includes(files.route, 'fallbackAllowed: false'), "route.disallows_fallback");
assert(includes(files.route, 'fallbackUsed: false'), "route.records_fallback_unused");
assert(includes(files.route, 'localFallbackUsed: false'), "route.records_local_fallback_unused");
assert(includes(files.route, '자미두수 PDF 생성 서버가 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.'), "route.server_failure_message_is_user_safe");
assert(!includes(files.route, '? "Internal server error"'), "route.must_not_expose_internal_server_error_message");
assert(!includes(files.route, ': "Internal server error"'), "route.must_not_return_internal_server_error_message");

assert(includes(files.billing, "function validateZiweiArchiveForDownload"), "billing.archive_guard_exists");
assert(includes(files.billing, "function resolveZiweiArchiveLlmAssembly"), "billing.resolves_llm_assembly_from_archive_metadata");
assert(includes(files.billing, "const ZIWEI_ARCHIVE_CHAPTER_COUNT = 15;"), "billing.archive_chapter_count_15");
assert(includes(files.billing, "const ZIWEI_ARCHIVE_SECTIONS_PER_CHAPTER = 5;"), "billing.archive_sections_per_chapter_5");
assert(includes(files.billing, 'const ZIWEI_ARCHIVE_REQUIRED_CHAPTER_SOURCE = "llm-html-v3";'), "billing.requires_v3_chapter_source");
assert(includes(files.billing, 'const ZIWEI_ARCHIVE_REQUIRED_TEMPLATE_VERSION = "ziwei-premium-html-v3.0.0";'), "billing.requires_v3_template_version");
assert(includes(files.billing, "ZIWEI_ARCHIVE_BLOCKED_CHAPTER_SOURCES.includes(source)"), "billing.blocks_local_chapter_source");
assert(includes(files.billing, "cleanText(llmAssembly.source, 80) !== ZIWEI_ARCHIVE_REQUIRED_CHAPTER_SOURCE"), "billing.validates_llm_source");
assert(includes(files.billing, "cleanText(llmAssembly.templateVersion, 120) !== ZIWEI_ARCHIVE_REQUIRED_TEMPLATE_VERSION"), "billing.validates_template_version");
assert(includes(files.billing, "function countZiweiArchiveMatches"), "billing.archive_html_count_helper_exists");
assert(includes(files.billing, "htmlArticleCount !== ZIWEI_ARCHIVE_CHAPTER_COUNT"), "billing.validates_archive_html_article_count");
assert(includes(files.billing, "htmlSectionCount < ZIWEI_ARCHIVE_CHAPTER_COUNT * ZIWEI_ARCHIVE_SECTIONS_PER_CHAPTER"), "billing.validates_archive_html_section_floor");
assert(includes(files.billing, "chapter.sections.length < ZIWEI_ARCHIVE_SECTIONS_PER_CHAPTER"), "billing.validates_archive_chapter_section_floor");
assert(includes(files.billing, 'failure(409, "ZIWEI_PDF_COMPLETION_INVALID"'), "billing.blocks_invalid_archive");
assert(includes(files.billing, "canDownload: Boolean(downloadUrl || pdfUrl) && ziweiArchiveValidation.ok"), "billing.download_requires_archive_validation");
assert(includes(files.billing, "validateZiweiArchiveForDownload({ doc, metadata, archive, htmlContent })"), "billing.detail_passes_metadata_to_archive_validation");

assert(includes(files.frontend, "function hasZiweiV3LlmAssembly"), "frontend.has_v3_llm_readiness_helper");
assert(includes(files.frontend, "completed: ok && successCandidate && (hasPdfHtml || hasStoredUrl) && chapters.length >= TOTAL_CHAPTERS && llmReady"), "frontend.completed_requires_v3_llm_ready");
assert(!includes(files.frontend, "|| ready.htmlUrl"), "frontend.must_not_treat_html_url_as_pdf_ready_url");
assert(includes(files.frontend, "manuscriptSource === 'llm-html-v3'"), "frontend.requires_v3_manuscript_source");
assert(includes(files.frontend, "text(llmAssembly.templateVersion) === 'ziwei-premium-html-v3.0.0'"), "frontend.requires_v3_template_version");
assert(includes(files.frontend, "function renderZiweiLlmChapterHtml"), "frontend.renders_v3_chapter_html");
assert(includes(files.frontend, "var v3Ready = hasZiweiV3LlmAssembly(data);"), "frontend.switches_to_v3_html_rendering");
assert(!includes(files.frontend, "manuscriptSource !== 'llm-html-v2'"), "frontend.must_not_require_v2_source");
assert(includes(files.publicFrontend, "function hasZiweiV3LlmAssembly"), "public_frontend.has_v3_llm_readiness_helper");
assert(includes(files.publicFrontend, "completed: ok && successCandidate && (hasPdfHtml || hasStoredUrl) && chapters.length >= TOTAL_CHAPTERS && llmReady"), "public_frontend.completed_requires_v3_llm_ready");
assert(!includes(files.publicFrontend, "|| ready.htmlUrl"), "public_frontend.must_not_treat_html_url_as_pdf_ready_url");
assert(includes(files.publicFrontend, "manuscriptSource === 'llm-html-v3'"), "public_frontend.requires_v3_manuscript_source");
assert(includes(files.publicFrontend, "text(llmAssembly.templateVersion) === 'ziwei-premium-html-v3.0.0'"), "public_frontend.requires_v3_template_version");
assert(includes(files.publicFrontend, "function renderZiweiLlmChapterHtml"), "public_frontend.renders_v3_chapter_html");
assert(includes(files.publicFrontend, "var v3Ready = hasZiweiV3LlmAssembly(data);"), "public_frontend.switches_to_v3_html_rendering");
assert(!includes(files.publicFrontend, "manuscriptSource !== 'llm-html-v2'"), "public_frontend.must_not_require_v2_source");

function sampleParagraph(chapter, sectionTitle, chapterIndex, sectionIndex, paragraphIndex) {
  const focusTerms = [
    "명궁의 중심축",
    "신궁의 후천 흐름",
    "12궁의 배치",
    "주성의 성향",
    "보좌성의 도움",
    "살성의 긴장",
    "선천 사화의 방향",
    "대한의 큰 물결",
    "유년의 세밀한 변화",
  ];
  const practicalScenes = [
    "일의 속도를 정할 때",
    "돈의 흐름을 점검할 때",
    "관계의 거리를 조율할 때",
    "집과 기반을 정리할 때",
    "몸과 마음의 피로를 살필 때",
    "협업의 경계를 세울 때",
    "가족 안의 역할을 나눌 때",
    "이동과 전환을 준비할 때",
    "장기 계획을 다시 잡을 때",
  ];
  const textureWords = [
    "균형", "절제", "응축", "확장", "응답", "정리", "분별", "회복", "전환", "인내",
    "집중", "호흡", "온도", "기반", "조율", "결실", "관찰", "선택", "품격", "침착",
    "소명", "질서", "책임", "예감", "숙련", "경계", "성찰", "리듬", "흐름", "완급",
    "여백", "기세", "돌봄", "판단", "실속", "정성", "관계", "자리", "시기", "방향",
    "마음", "습관", "기회", "준비", "명료", "사려", "단서", "근기", "계절", "안목",
    "초점", "깊이", "명예", "재물", "직분", "동선", "휴식", "협력", "기준", "성숙",
  ];
  const term = focusTerms[(chapterIndex + sectionIndex + paragraphIndex) % focusTerms.length];
  const scene = practicalScenes[(chapterIndex * 2 + sectionIndex + paragraphIndex) % practicalScenes.length];
  const offset = (chapterIndex * 11) + (sectionIndex * 7) + (paragraphIndex * 3);
  const texture = Array.from({ length: 14 }, (_item, index) => textureWords[(offset + index * 5) % textureWords.length]).join(", ");
  const chapterLabel = `제${chapterIndex + 1}장`;
  const chapterFocus = ZIWEI_CHAPTER_EVIDENCE_FOCUS[chapter.id] || [];
  const primaryEvidence = chapterFocus[sectionIndex % chapterFocus.length] || term;
  const secondaryEvidence = chapterFocus[(sectionIndex + 2) % chapterFocus.length] || term;
  const evidenceText = [primaryEvidence, secondaryEvidence].filter((item, itemIndex, list) => item && list.indexOf(item) === itemIndex).join(", ");
  const variants = [
    `${chapterLabel}에서는 ${evidenceText}와 ${term}이 먼저 떠오릅니다. ${scene} 이 흐름은 명반에 드러난 궁과 성曜의 균형을 차분히 살피라는 뜻으로 읽히며, ${texture}의 순서가 함께 살아납니다. 그러므로 이 대목은 실제 선택의 속도와 마음가짐을 바로잡는 상담의 축이 됩니다.`,
    `흐름을 살필 때는 ${evidenceText}을 고정된 결론보다 움직이는 징후로 보아야 합니다. ${scene} 이 단서는 주성의 기세와 12궁의 자리, 사화의 방향을 함께 비추며 ${texture}을 기준으로 판단을 정돈하게 합니다. 이 흐름을 알면 중요한 장면에서 무리하지 않고 필요한 말을 남길 수 있습니다.`,
    `${term}은 ${chapterLabel} 안에서 ${evidenceText}와 함께 섬세한 판독 지점으로 작동합니다. ${scene} 명궁과 신궁의 차이를 함께 보면 ${texture}이 서로 다른 비중으로 떠오르고, 그 차이가 현재의 선택 방식에 영향을 줍니다. 그래서 이 부분은 불안을 키우기보다 생활 속 조절력을 세우는 문장으로 읽어야 합니다.`,
    `핵심은 ${evidenceText}과 ${term}을 현실의 움직임으로 옮겨 보는 데 있습니다. ${scene} 보좌성의 도움과 살성의 긴장이 함께 드러나면 ${texture}의 순서를 잃지 않는 것이 중요합니다. 이 관점은 운을 기다리는 태도보다 운을 다루는 품격을 길러 줍니다.`,
  ];
  const uniqueWords = [
    "정중함", "관찰력", "호흡", "분별", "균형감", "절제", "실행력", "복기", "여백", "책임",
    "정리", "탄력", "안목", "신중함", "결속", "회복력", "관계성", "기준점", "전환력", "숙성",
    "명료함", "인내", "리듬", "응답", "방향성", "현실감", "집중력", "선택권", "통찰", "품위",
    "경계선", "기민함", "심도", "내면성", "기초", "차분함", "상승", "정착", "변별", "흐름",
  ];
  const uniqueOffset = (chapterIndex * 13) + (sectionIndex * 17) + (paragraphIndex * 19);
  const uniqueTail = Array.from({ length: 18 }, (_item, index) => uniqueWords[(uniqueOffset + index * 7) % uniqueWords.length]).join(", ");
  return `${variants[(chapterIndex + sectionIndex + paragraphIndex) % variants.length]} 제${chapterIndex + 1}장 ${sectionIndex + 1}절 ${paragraphIndex + 1}번째 결은 ${uniqueTail}으로 분리해 읽습니다.`;
}

function buildSampleChapters({ source = ZIWEI_PDF_CONFIG.generationMode, provider = "workers-ai" } = {}) {
  return ZIWEI_PREMIUM_CHAPTERS_V2.map((chapter, chapterIndex) => {
    const sections = chapter.sections.map((title, sectionIndex) => {
      const paragraphs = [
        sampleParagraph(chapter, title, chapterIndex, sectionIndex, 0),
        sampleParagraph(chapter, title, chapterIndex, sectionIndex, 1),
        sampleParagraph(chapter, title, chapterIndex, sectionIndex, 2),
      ];
      return {
        title,
        heading: title,
        body: paragraphs.join("\n\n"),
        paragraphs,
      };
    });
    return {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      source,
      provider,
      cached: false,
      sections,
      html: [
        `<article data-chapter-id="${chapter.id}">`,
        `<h1>${chapter.title}</h1>`,
        ...sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
        "</article>",
      ].join(""),
    };
  });
}

function buildSampleHtml(chapters) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>자미두수 프리미엄</title></head><body>${chapters.map((chapter) => chapter.html).join("")}</body></html>`;
}

const validChapters = buildSampleChapters();
const validHtml = buildSampleHtml(validChapters);
const validPdfReady = {
  html: validHtml,
  pdfUrl: "/api/premium/pdf-archive/verify-ziwei?format=pdf",
  htmlUrl: "/api/premium/pdf-archive/verify-ziwei?format=html",
  renderFormat: "pdf-archive",
  llmAssembly: {
    enabled: true,
    source: ZIWEI_PDF_CONFIG.generationMode,
    provider: "workers-ai",
    externalGeneration: true,
    externalCallsAllowed: true,
    fallbackUsed: false,
    localFallbackUsed: false,
    templateVersion: ZIWEI_PDF_CONFIG.templateVersion,
    chapterCount: 15,
  },
};
const validCompletion = validateZiweiPdfCompletionPayload({ pdfReady: validPdfReady, chapters: validChapters, requireDownloadUrl: true });
const validQuality = buildZiweiChapterQualityReport(validChapters);
assert(validCompletion.ok, `validator.valid_sample:${validCompletion.issues?.join(",") || "unknown"}`);
assert(validQuality.ok, `quality.valid_sample:${validQuality.issues?.join(",") || "unknown"}`);

const htmlOnlyDownload = validateZiweiPdfCompletionPayload({
  pdfReady: {
    ...validPdfReady,
    pdfUrl: "",
    downloadUrl: "",
    htmlUrl: "/api/premium/pdf-archive/verify-ziwei?format=html",
  },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!htmlOnlyDownload.ok, "validator.rejects_html_only_download_url");

const missingLocalFallbackFlag = validateZiweiPdfCompletionPayload({
  pdfReady: {
    ...validPdfReady,
    llmAssembly: {
      ...validPdfReady.llmAssembly,
      localFallbackUsed: undefined,
    },
  },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!missingLocalFallbackFlag.ok, "validator.requires_explicit_local_fallback_false");

const localChapters = buildSampleChapters({ source: "localdraft", provider: "" });
const localCompletion = validateZiweiPdfCompletionPayload({ pdfReady: validPdfReady, chapters: localChapters, requireDownloadUrl: true });
assert(!localCompletion.ok, "validator.rejects_local_source_sample");

const forbiddenCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: `${validHtml}<p>debug</p>` },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!forbiddenCompletion.ok, "validator.rejects_forbidden_html_sample");

const schemaLeakCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: `${validHtml}<p>schema chapterPlan sourceOfTruth raw calculation</p>` },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!schemaLeakCompletion.ok, "validator.rejects_schema_prompt_metadata_leak");

const badTermHtml = validHtml.replace("</article>", "<p>별자리 satisfaction 실전 조언</p></article>");
const badTermCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: badTermHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!badTermCompletion.ok, "validator.rejects_ziwei_forbidden_terms_without_silent_rewrite");

const genericFillerHtml = validHtml.replace("</article>", "<p>새로운 기회를 잘 포착하면 그에 따라 행동하세요. 이 선택은 도움이 됩니다.</p></article>");
const genericFillerCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: genericFillerHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!genericFillerCompletion.ok, "validator.rejects_generic_filler_advice_phrases");

const fearPhraseHtml = validHtml.replace("</article>", "<p>반드시 파산합니다. 피할 수 없습니다. 수명이 짧아집니다.</p></article>");
const fearPhraseCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: fearPhraseHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!fearPhraseCompletion.ok, "validator.rejects_fear_based_deterministic_phrases");

const asciiChapters = JSON.parse(JSON.stringify(validChapters));
asciiChapters[0].sections[0].paragraphs[0] += " English token";
asciiChapters[0].sections[0].body = asciiChapters[0].sections[0].paragraphs.join("\n\n");
asciiChapters[0].html = [
  `<article data-chapter-id="${asciiChapters[0].id}">`,
  `<h1>${asciiChapters[0].title}</h1>`,
  ...asciiChapters[0].sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const asciiCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(asciiChapters) },
  chapters: asciiChapters,
  requireDownloadUrl: true,
});
assert(!asciiCompletion.ok, "validator.rejects_ascii_tokens_in_section_body");

const weakEvidenceChapters = JSON.parse(JSON.stringify(validChapters));
const weakEvidenceChapter = weakEvidenceChapters[5];
weakEvidenceChapter.sections = weakEvidenceChapter.sections.map((section) => {
  const paragraphs = [
    "명궁과 신궁의 균형은 본인의 선택 방식이 어디에서 안정되고 어디에서 흔들리는지를 차분하게 비춥니다. 일의 속도를 정할 때 12궁의 자리와 주성의 기세를 함께 살피면 무리한 확장보다 현재 감당할 수 있는 리듬을 먼저 고르게 됩니다.",
    "선천 사화가 움직이는 방향은 마음의 힘이 한곳으로 몰릴 때 어떤 태도가 필요한지를 알려 줍니다. 그래서 이 대목은 큰 결론을 서두르기보다 생활 속 기준을 정돈하고, 반복되는 선택 앞에서 차분히 호흡을 되찾는 쪽으로 읽어야 합니다.",
  ];
  return {
    ...section,
    body: paragraphs.join("\n\n"),
    paragraphs,
  };
});
weakEvidenceChapter.html = [
  `<article data-chapter-id="${weakEvidenceChapter.id}">`,
  `<h1>${weakEvidenceChapter.title}</h1>`,
  ...weakEvidenceChapter.sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const weakEvidenceCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(weakEvidenceChapters) },
  chapters: weakEvidenceChapters,
  requireDownloadUrl: true,
});
assert(!weakEvidenceCompletion.ok, "validator.rejects_chapter_without_required_evidence_focus");

const missingRequiredTermsChapters = JSON.parse(JSON.stringify(validChapters));
const missingRequiredTermsChapter = missingRequiredTermsChapters[2];
missingRequiredTermsChapter.sections = missingRequiredTermsChapter.sections.map((section) => {
  const paragraphs = section.paragraphs.map((paragraph) => paragraph
    .replaceAll("화록", "사화")
    .replaceAll("화권", "사화")
    .replaceAll("화과", "사화")
    .replaceAll("화기", "사화"));
  return {
    ...section,
    body: paragraphs.join("\n\n"),
    paragraphs,
  };
});
missingRequiredTermsChapter.html = [
  `<article data-chapter-id="${missingRequiredTermsChapter.id}">`,
  `<h1>${missingRequiredTermsChapter.title}</h1>`,
  ...missingRequiredTermsChapter.sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const missingRequiredTermsCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(missingRequiredTermsChapters) },
  chapters: missingRequiredTermsChapters,
  requireDownloadUrl: true,
});
assert(!missingRequiredTermsCompletion.ok, "validator.rejects_chapter_without_required_ziwei_terms");

const abstractSceneChapters = JSON.parse(JSON.stringify(validChapters));
abstractSceneChapters[0].sections[0].paragraphs = [
  "자미의 기세와 명궁, 신궁, 12궁 전체, 강한 주성, 선천 사화의 흐름은 상징의 층위를 조용히 열어 줍니다. 이 문장은 기운의 결을 넓게 바라보게 하지만 구체적인 장면을 일부러 지우고 추상적인 균형만 남깁니다.",
  "명궁과 신궁의 차이는 주성의 기세와 사화의 방향 안에서 섬세하게 흔들립니다. 이 대목은 상징의 결을 이해하는 데 머무르며 구체적인 현실 축을 제시하지 않는 나쁜 예시입니다.",
];
abstractSceneChapters[0].sections[0].body = abstractSceneChapters[0].sections[0].paragraphs.join("\n\n");
abstractSceneChapters[0].html = [
  `<article data-chapter-id="${abstractSceneChapters[0].id}">`,
  `<h1>${abstractSceneChapters[0].title}</h1>`,
  ...abstractSceneChapters[0].sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const abstractSceneCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(abstractSceneChapters) },
  chapters: abstractSceneChapters,
  requireDownloadUrl: true,
});
assert(!abstractSceneCompletion.ok, "validator.rejects_section_without_practical_scene");

const sparseActualEvidenceChapter = JSON.parse(JSON.stringify(validChapters[0]));
sparseActualEvidenceChapter.sections = sparseActualEvidenceChapter.sections.map((section, index) => {
  const marker = index === 0 ? " 봉각의 실제 배치가 드러납니다." : "";
  const paragraphs = section.paragraphs.map((paragraph, paragraphIndex) => `${paragraph}${paragraphIndex === 0 ? marker : ""}`);
  return {
    ...section,
    body: paragraphs.join("\n\n"),
    paragraphs,
  };
});
sparseActualEvidenceChapter.html = [
  `<article data-chapter-id="${sparseActualEvidenceChapter.id}">`,
  `<h1>${sparseActualEvidenceChapter.title}</h1>`,
  ...sparseActualEvidenceChapter.sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const sparseActualEvidenceValidation = validateZiweiPremiumChapterHtml(
  sparseActualEvidenceChapter.html,
  ZIWEI_PREMIUM_CHAPTERS_V2[0],
  { chart: { strongStars: "봉각, 천마" } }
);
assert(!sparseActualEvidenceValidation.ok, "validator.rejects_actual_chart_evidence_in_only_one_section");

const headingEchoChapters = JSON.parse(JSON.stringify(validChapters));
headingEchoChapters[0].sections[0].paragraphs[0] = `${headingEchoChapters[0].sections[0].title}에서는 명궁과 12궁 전체의 균형이 먼저 떠오릅니다. 실제 생활에서는 선택의 속도를 정할 때 이 기운이 드러나고, 무리한 결론보다 궁과 주성의 균형을 보는 태도가 필요합니다.`;
headingEchoChapters[0].sections[0].body = headingEchoChapters[0].sections[0].paragraphs.join("\n\n");
headingEchoChapters[0].html = [
  `<article data-chapter-id="${headingEchoChapters[0].id}">`,
  `<h1>${headingEchoChapters[0].title}</h1>`,
  ...headingEchoChapters[0].sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const headingEchoCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(headingEchoChapters) },
  chapters: headingEchoChapters,
  requireDownloadUrl: true,
});
assert(!headingEchoCompletion.ok, "validator.rejects_section_heading_echo");

const shortSectionChapters = JSON.parse(JSON.stringify(validChapters));
shortSectionChapters[0].sections[0].paragraphs = [
  "명궁과 12궁 전체가 드러내는 흐름은 아직 짧게만 보입니다.",
  "주성과 사화의 결을 더 자세히 풀어야 합니다.",
];
shortSectionChapters[0].sections[0].body = shortSectionChapters[0].sections[0].paragraphs.join("\n\n");
shortSectionChapters[0].html = [
  `<article data-chapter-id="${shortSectionChapters[0].id}">`,
  `<h1>${shortSectionChapters[0].title}</h1>`,
  ...shortSectionChapters[0].sections.map((section) => `<section><h2>${section.title}</h2>${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`),
  "</article>",
].join("");
const shortSectionCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(shortSectionChapters) },
  chapters: shortSectionChapters,
  requireDownloadUrl: true,
});
assert(!shortSectionCompletion.ok, "validator.rejects_short_sections");

const unsafeHtml = validHtml.replace("</article>", "<script>console.log('bad')</script></article>");
const unsafeCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: unsafeHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!unsafeCompletion.ok, "validator.rejects_unsafe_html_without_silent_strip");

const disallowedTagHtml = validHtml.replace("</article>", "<p><strong>명궁</strong> 표현</p></article>");
const disallowedTagCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: disallowedTagHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!disallowedTagCompletion.ok, "validator.rejects_disallowed_chapter_tags");

const missingHeadingHtml = validHtml.replace(/<section><h2>[^<]+<\/h2>[\s\S]*?<\/section>/, "");
const missingHeadingCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: missingHeadingHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!missingHeadingCompletion.ok, "validator.rejects_final_html_missing_section_heading");

const reversedArticleHtml = validHtml.replace(
  /(<article\b[\s\S]*?<\/article>)([\s\S]*?)(<article\b[\s\S]*?<\/article>)/,
  "$3$2$1"
);
const reversedArticleCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: reversedArticleHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!reversedArticleCompletion.ok, "validator.rejects_final_html_wrong_chapter_order");

const duplicatedArticleChapters = JSON.parse(JSON.stringify(validChapters));
duplicatedArticleChapters[0].html = `${duplicatedArticleChapters[0].html}${duplicatedArticleChapters[0].html}`;
const duplicatedArticleCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: buildSampleHtml(duplicatedArticleChapters) },
  chapters: duplicatedArticleChapters,
  requireDownloadUrl: true,
});
assert(!duplicatedArticleCompletion.ok, "validator.rejects_chapter_fragment_with_multiple_articles");

const fencedHtml = validHtml.replace(
  /<article\b[\s\S]*?<\/article>/,
  (match) => `\`\`\`html\n${match}\n\`\`\``
);
const fencedCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: fencedHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!fencedCompletion.ok, "validator.rejects_markdown_code_fence");

const markdownHeadingHtml = validHtml.replace(
  /<article\b[\s\S]*?<\/article>/,
  (match) => `### 자미두수 해석\n${match}`
);
const markdownHeadingCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: { ...validPdfReady, html: markdownHeadingHtml },
  chapters: validChapters,
  requireDownloadUrl: true,
});
assert(!markdownHeadingCompletion.ok, "validator.rejects_markdown_heading_outside_article");

function buildFakeProviderHtml(prompt) {
  const chapterId = prompt.match(/data-chapter-id="([^"]+)"/)?.[1] || "ch01";
  const chapter = ZIWEI_PREMIUM_CHAPTERS_V2.find((item) => item.id === chapterId) || ZIWEI_PREMIUM_CHAPTERS_V2[0];
  const chapterIndex = Math.max(0, Number(chapter.order || 1) - 1);
  const actualStar = prompt.match(/강하게 보이는 주성:\s*([^\n,]+)/)?.[1]?.trim() || "자미";
  const sections = chapter.sections.map((title, sectionIndex) => {
    const paragraphs = [
      sampleParagraph(chapter, title, chapterIndex, sectionIndex, 0),
      sampleParagraph(chapter, title, chapterIndex, sectionIndex, 1),
      sampleParagraph(chapter, title, chapterIndex, sectionIndex, 2),
    ].map((paragraph, paragraphIndex) => (
      paragraphIndex === 0 ? `${actualStar}의 기세와 ${paragraph}` : paragraph
    ));
    return `<section><h2>${title}</h2>${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}</section>`;
  }).join("");
  return `<article data-chapter-id="${chapter.id}"><h1>${chapter.title}</h1>${sections}</article>`;
}

const fakeWorkerEnv = {
  WORKERS_AI_MODEL: "@cf/test/ziwei-v3",
  AI: {
    run: async (_model, request) => ({
      response: buildFakeProviderHtml(String(request?.messages?.at(-1)?.content || "")),
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }),
  },
};

const originalConsoleInfo = console.info;
console.info = () => {};
let generated;
try {
  generated = await generateZiweiPremiumReport(fakeWorkerEnv, {
    reportId: "verify-ziwei-v3",
    profile: { name: "패밀리 테스트", gender: "female" },
    seed: {
      requestId: "verify-ziwei-v3",
      localZiweiChartJson: {
        birthInput: { name: "검증", gender: "female", timezone: "Asia/Seoul" },
        chart: {
          palaces: {
            명궁: { earthlyBranch: "자", 주성: "자미, 천부", 보좌성: "좌보", 살성: "경양" },
            신궁: { ji: "축", primaryStars: "천상", supportStars: "우필", shaStars: "타라" },
          },
          sihua: { 화록: "자미", 화권: { starName: "천부", palaceName: "명궁" } },
        },
        interpretationSeeds: {},
      },
    },
  });
} finally {
  console.info = originalConsoleInfo;
}

const generatedCompletion = validateZiweiPdfCompletionPayload({
  pdfReady: generated.pdfReady,
  chapters: generated.chapters,
  requireDownloadUrl: false,
});
assert(generated.chapters?.length === 15, "generator.fake_worker_generates_15_chapters");
assert(generatedCompletion.ok, `generator.fake_worker_completion:${generatedCompletion.issues?.join(",") || "unknown"}`);
assert(count(generated.pdfReady?.html || "", /<article\b/g) === 15, "generator.final_html_contains_15_articles");
assert(count(generated.pdfReady?.html || "", /<section>/g) === 75, "generator.final_html_contains_75_sections");
assert(generated.pdfReady?.html?.includes("12궁의 주성 흐름"), "generator.cover_uses_ziwei_star_flow");
assert(!generated.pdfReady?.html?.includes("별 흐름"), "generator.cover_removes_generic_star_flow");
assert(!generated.pdfReady?.html?.includes("Ch."), "generator.html_removes_english_chapter_prefix");
assert(!generated.pdfReady?.html?.includes("패밀리 테스트"), "generator.html_hides_family_test_name");
assert(!generated.pdfReady?.title?.includes("패밀리 테스트"), "generator.title_hides_family_test_name");
assert(Array.isArray(generated.inputWarnings), "generator.exposes_input_warnings");
assert(generated.inputWarnings.includes("palace_count_incomplete"), "generator.detects_incomplete_palace_fixture");
assert(!generated.inputWarnings.includes("main_stars_missing"), "generator.normalizes_string_star_aliases");
assert(!generated.inputWarnings.includes("four_transformations_missing"), "generator.normalizes_sihua_aliases");
assert(generated.chart?.palaces?.some((palace) => palace.name === "명궁" && palace.mainStars.includes("자미")), "generator.normalizes_palace_object_map");
assert(generated.chart?.transformations?.some((item) => item.includes("자미") && item.includes("화록")), "generator.normalizes_sihua_object_map");
assert(generated.pdfReady?.inputWarnings?.includes("palace_count_incomplete"), "generator.pdf_ready_carries_input_warnings");
assert(generated.pdfReady?.html?.includes("마음과 선택의 결을 비추는 참고"), "generator.notice_uses_consultation_tone");

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: {
    engine: "worker/lib/ziwei-premium-pdf-v2.js",
    route: "worker/routes/ziwei-book.js",
    billing: "worker/routes/billing.js",
    frontend: "js/ziwei-book.js",
    publicFrontend: "public/js/ziwei-book.js",
    chapterCount: 15,
    guidanceCount: 15,
    evidenceFocusCount: 15,
    promptVersion: "ziwei-premium-prompt-v5",
    qualityVersion: "category-depth-v4",
  },
}, null, 2));
