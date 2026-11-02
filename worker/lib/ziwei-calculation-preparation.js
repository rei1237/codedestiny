import { createHash } from "node:crypto";
import { prepareZiweiExecutionChart, readZiweiExecutionSnapshot, DEFAULT_ZIWEI_EXECUTION_OPTIONS } from "./ziwei-execution-adapter.js";

export const ZIWEI_PREPARATION_PROTOCOL = "ziwei-prepared-v1";
const FEATURE = "ziwei-ai-consultation";
const VERSION = "kasi-jpl-expanded-20261101";
const GEO_KEYS = ["birthPlace", "timezone", "longitude", "latitude", "timezoneOffset", "timezoneOffsetMinutes", "utcOffsetMinutes", "standardMeridian"];
const stable = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});
const hash = value => createHash("sha256").update(stable(value)).digest("hex");
const selectionDigest = record => hash([record.inputHash, record.bindingHash, record.targetYear, record.authorityVersion, record.chartSnapshot]);
// Existing consultation schemas omit empty object properties. Compare that storage
// representation only; the complete preparation snapshot remains authoritative.
function storedSnapshotShape(value) {
  if (Array.isArray(value)) return value.map(storedSnapshotShape);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, storedSnapshotShape(item)])
    .filter(([, item]) => !item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).length));
}
const geo = value => Object.fromEntries(GEO_KEYS.filter(key => value?.[key] != null).map(key => [key, value[key]]));
function failure(code) { const error = new Error(code); error.code = code; return error; }
async function storedRead(model, id) {
  try { return await model.findById(id).lean(); }
  catch { throw failure("CALCULATION_PREPARATION_UNAVAILABLE"); }
}

/** Server-owned, insert-only selection. No payment, LLM, network or result writes. */
export async function resolveZiweiPreparation({ model, userId, requestId, inputHash, input, rawBody = {}, existing = null, action, year, calendarAuthorityV2 = DEFAULT_ZIWEI_EXECUTION_OPTIONS.calendarAuthorityV2 }) {
  if (!["prepare", "basis", "generate"].includes(action) || typeof calendarAuthorityV2 !== "boolean") throw failure("CALCULATION_PREPARATION_INVALID");
  // Existing results belong to their original execution, not the current rollout.
  const saved = readZiweiExecutionSnapshot(existing);
  if (existing && !existing.llmMeta?.calculationPreparationId) {
    if (existing.llmMeta?.resumeBody?.calculationProtocol === ZIWEI_PREPARATION_PROTOCOL) throw failure("CALCULATION_PREPARATION_UNAVAILABLE");
    if (saved) return { chart: saved, preparationId: null };
    try { return { chart: prepareZiweiExecutionChart(input, { existing, year }), preparationId: null }; }
    catch { throw failure("CALCULATION_PREPARATION_INVALID"); }
  }
  if (existing?.llmMeta?.calculationPreparationId && !saved) throw failure("CALCULATION_PREPARATION_UNAVAILABLE");
  const protocol = rawBody.calculationProtocol;
  if (protocol != null && protocol !== ZIWEI_PREPARATION_PROTOCOL) throw failure("CALCULATION_PREPARATION_INVALID");
  const required = protocol === ZIWEI_PREPARATION_PROTOCOL || Boolean(existing?.llmMeta?.calculationPreparationId) || calendarAuthorityV2;
  if (!userId || !requestId || requestId.length < 12 || requestId.length > 180 || !inputHash) throw failure("CALCULATION_PREPARATION_INVALID");
  const id = hash([FEATURE, userId, requestId]);
  const bindingHash = hash([inputHash, geo(rawBody), geo(rawBody.birthInfo)]);
  const accept = record => {
    if (!record || record.userId !== userId || record.featureKey !== FEATURE || record.requestId !== requestId
      || record._id !== id) throw failure("CALCULATION_PREPARATION_UNAVAILABLE");
    if (record.inputHash !== inputHash || record.bindingHash !== bindingHash) throw failure("CALCULATION_PREPARATION_CONFLICT");
    if (!["legacy", VERSION].includes(record.authorityVersion) || !Number.isInteger(record.targetYear)
      || !record.chartSnapshot || !Array.isArray(record.chartSnapshot.palaces)
      || selectionDigest(record) !== record.selectionDigest
      || (record.authorityVersion === VERSION && record.chartSnapshot.lunar?.source !== VERSION)) throw failure("CALCULATION_PREPARATION_UNAVAILABLE");
    if (saved && (existing.llmMeta.calculationPreparationId !== id || hash(storedSnapshotShape(saved)) !== hash(storedSnapshotShape(record.chartSnapshot)))) throw failure("CALCULATION_PREPARATION_UNAVAILABLE");
    return { chart: structuredClone(record.chartSnapshot), preparationId: id };
  };
  const stored = await storedRead(model, id);
  if (stored) return accept(stored);
  // No retry-time creation: lost preparation must not become a different calculation.
  if (required && (action !== "prepare" || existing)) throw failure("CALCULATION_PREPARATION_REQUIRED");
  if (!required) {
    try { return { chart: prepareZiweiExecutionChart(input, { existing, year }), preparationId: null }; }
    catch { throw failure("CALCULATION_PREPARATION_INVALID"); }
  }
  if (!Number.isInteger(year)) throw failure("CALCULATION_PREPARATION_INVALID");
  let chart;
  try {
    // The billing/input hash stays unchanged. ON eligibility sees raw geography before normalization can discard it.
    const calculationInput = calendarAuthorityV2 ? {
      ...input, ...geo(rawBody),
      birthInfo: { ...input.birthInfo, ...geo(rawBody.birthInfo) },
    } : input;
    chart = prepareZiweiExecutionChart(calculationInput, { year, calendarAuthorityV2 });
  } catch { throw failure("CALCULATION_PREPARATION_INVALID"); }
  const record = {
    _id: id, userId, featureKey: FEATURE, requestId, inputHash, bindingHash,
    targetYear: year, authorityVersion: calendarAuthorityV2 ? VERSION : "legacy",
    chartSnapshot: chart, createdAt: new Date(),
  };
  record.selectionDigest = selectionDigest(record);
  try { await model.create(record); }
  catch (error) {
    if (error?.code !== 11000) throw failure("CALCULATION_PREPARATION_UNAVAILABLE");
    return accept(await storedRead(model, id));
  }
  // Read back the durable winner, including after another isolate wins the insert.
  return accept(await storedRead(model, id));
}
