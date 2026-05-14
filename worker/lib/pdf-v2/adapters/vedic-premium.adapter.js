import { createPremiumPdfAdapter } from "./base.adapter.js";

export function createVedicPremiumAdapter(deps = {}) {
  return createPremiumPdfAdapter({
    pdfType: "vedicPremium",
    runEngine: deps.runEngine,
    normalize: deps.normalize,
  });
}
