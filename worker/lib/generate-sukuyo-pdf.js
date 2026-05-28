import { buildSukyoPdfSeed, generateSukyoPremiumReport } from "./sukyo-pdf.js";

export async function generateSukuyoPdf(env, input = {}) {
  const seed = input?.mode === "compatibility" && input?.compatibility
    ? buildSukyoPdfSeed(input)
    : buildSukyoPdfSeed(input);
  return await generateSukyoPremiumReport(env, seed);
}

export default generateSukuyoPdf;