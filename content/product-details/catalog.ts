import catalog from './catalog.json';
// Only individually authored, reviewed products enter this display catalogue.
export const craftedProductIds:Partial<Record<string,string>>=catalog.products;
export const craftedVariantProductIds:Partial<Record<string,Record<string,string>>>=catalog.variants;
