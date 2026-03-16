/**
 * DOM 유틸리티 — 캐싱 및 반복 접근 최적화
 * 리팩토링: document.querySelector 반복 호출 → 캐싱
 * @module utils/dom
 */

const cache = new Map();

/**
 * DOM 요소를 캐시하여 반환. 동일 selector 재호출 시 캐시 사용
 * @param {string} selector - CSS selector
 * @param {Document|Element} [root=document] - 검색 루트
 * @returns {Element|null}
 */
export function $(selector, root = document) {
  const key = root === document ? selector : `${selector}::${root.id || 'root'}`;
  if (!cache.has(key)) {
    cache.set(key, root.querySelector(selector));
  }
  return cache.get(key);
}

/**
 * DOM 요소 목록을 캐시하여 반환
 * @param {string} selector - CSS selector
 * @param {Document|Element} [root=document] - 검색 루트
 * @returns {NodeListOf<Element>}
 */
export function $$(selector, root = document) {
  return root.querySelectorAll(selector);
}

/**
 * 캐시 무효화 (동적 DOM 변경 시 호출)
 * @param {string} [selector] - 특정 selector만 무효화. 생략 시 전체
 */
export function clearCache(selector) {
  if (selector) {
    for (const key of cache.keys()) {
      if (key.startsWith(selector) || key === selector) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}
