import { generateAstroPdf as generateAstroPdfCore } from "./astro/generateAstroPdf.js";

export async function generateAstroPdf(params = {}) {
  return await generateAstroPdfCore(params);
}
