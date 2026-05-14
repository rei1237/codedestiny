import { buildPromptTemplatesForReportType } from "./template-factory.js";

export function getSajuLoveSecretPromptTemplates(mode = "") {
  return buildPromptTemplatesForReportType("loveSecret", mode);
}
