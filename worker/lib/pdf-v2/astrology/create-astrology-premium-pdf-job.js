import { runAstrologyPdfService } from "./astrology-pdf-service.js";

export async function generateAstrologyPremiumPdfV2(params = {}) {
  return runAstrologyPdfService(params);
}
