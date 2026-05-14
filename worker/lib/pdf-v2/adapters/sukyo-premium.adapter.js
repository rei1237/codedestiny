import { createPremiumPdfAdapter } from "./base.adapter.js";

export function createSukyoPremiumAdapter(deps = {}) {
  return createPremiumPdfAdapter({
    pdfType: "sookyoPremium",
    runEngine: deps.runEngine,
    normalize: deps.normalize,
  });
}
