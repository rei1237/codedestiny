import { parseToml } from "../verify-worker-config-parity.mjs";

/** Count the prospective upload, including retained remote secrets and CLI vars. */
export function assertWorkerBindingBudget(configText, secrets, extraVars = ["COMMIT_SHA"]) {
  if (!Array.isArray(secrets) || secrets.some((entry) => typeof entry?.name !== "string" || !entry.name)) {
    throw new Error("Worker secret inventory is unavailable or malformed; binding budget cannot be verified.");
  }
  const { root } = parseToml(configText);
  const names = new Set([...Object.keys(root.vars || {}), ...extraVars, ...secrets.map((entry) => entry.name)]);
  const remaining = 128 - names.size;
  if (remaining < 2) throw new Error(`Worker text binding budget: ${names.size}/128, ${remaining} slots remaining; keep at least 2 spare slots before upload.`);
  return { total: names.size, remaining };
}
