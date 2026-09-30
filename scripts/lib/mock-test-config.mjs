// Canonical targets shared by the test runner and smoke coverage proof.
export const NODE_TEST_PATTERNS = Object.freeze([
  '__tests__/ui/*.test.js', '__tests__/release/*.test.js',
  '__tests__/fortune/maya-calendar.test.js', '__tests__/fortune/kst-business-date.test.js',
  '.claude/hooks/*.test.mjs', '__tests__/ui/*.test.mjs',
]);
export const JEST_BASE_ARGS = Object.freeze([
  '--runInBand', '--testEnvironment', 'node', '--cacheDirectory=build-cache/jest',
]);
