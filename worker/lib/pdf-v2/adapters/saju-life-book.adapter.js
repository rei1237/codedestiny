import { createPremiumPdfAdapter } from "./base.adapter.js";

export function createSajuLifeBookAdapter(deps = {}) {
  return createPremiumPdfAdapter({
    pdfType: "lifeBook",
    runEngine: deps.runEngine,
    normalize: deps.normalize,
  });
}
