import { createPremiumPdfAdapter } from "./base.adapter.js";

export function createAstrologyPremiumAdapter(deps = {}) {
  return createPremiumPdfAdapter({
    pdfType: "westernAstrologyPremium",
    runEngine: deps.runEngine,
    normalize: deps.normalize,
  });
}
