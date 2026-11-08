// The first release sells only these two advisers' existing Saju products.
// Stored orders keep the product and owner recorded at the time of purchase.
export const reviewProductIds = Object.freeze([
  'chat_saju', 'saju_mackerel', 'saju_salmon', 'saju_flounder', 'saju_tuna',
]);

export function isReviewSale(productId, serviceId = 'yeongnyangi') {
  return reviewProductIds.includes(productId)
    && serviceId === (productId === 'chat_saju' ? 'yeoni' : 'yeongnyangi');
}
