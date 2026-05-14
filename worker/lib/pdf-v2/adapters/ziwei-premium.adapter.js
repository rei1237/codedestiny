import { createPremiumPdfAdapter } from "./base.adapter.js";

export function createZiweiPremiumAdapter(deps = {}) {
  return createPremiumPdfAdapter({
    pdfType: "ziweiPremium",
    runEngine: deps.runEngine,
    normalize: deps.normalize,
  });
}
