import type {Product} from '@/worker/yeongnyangi/payments/catalog';

// Fish art communicates purchase depth; fusion art communicates the systems.
export function fusionIntroductionArt(product: Product) {
  return `/images/service-introductions/yeongnyangi-${product.id.replaceAll('_', '-')}-640.webp`;
}
