import { createPremiumPdfAdapter } from "./base.adapter.js";

export function createSajuLoveSecretAdapter(deps = {}) {
  return createPremiumPdfAdapter({
    pdfType: "loveSecret",
    runEngine: deps.runEngine,
    normalize: deps.normalize,
  });
}
