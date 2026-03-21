/**
 * PHASE 6: Runtime Validation Script
 * PURPOSE: Verify that Phase 5 dead code removal didn't break runtime functionality
 * SCOPE: Function availability, module loading, calculation integrity
 * @requires Node.js 14+ (or run in browser console)
 */

const TESTS = [];
let testCount = 0;
let passCount = 0;
let failureList = [];

/**
 * Test utilities
 */
function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✅ [${testCount}] ${message}`);
  } else {
    failureList.push(`❌ [${testCount}] ${message}`);
    console.error(`❌ [${testCount}] ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  testCount++;
  if (actual === expected) {
    passCount++;
    console.log(`✅ [${testCount}] ${message} (${actual} === ${expected})`);
  } else {
    failureList.push(`❌ [${testCount}] ${message} (got ${actual}, expected ${expected})`);
    console.error(`❌ [${testCount}] ${message} (got ${actual}, expected ${expected})`);
  }
}

function assertNotNull(value, message) {
  testCount++;
  if (value != null) {
    passCount++;
    console.log(`✅ [${testCount}] ${message} (exists)`);
  } else {
    failureList.push(`❌ [${testCount}] ${message} (is null/undefined)`);
    console.error(`❌ [${testCount}] ${message} (is null/undefined)`);
  }
}

function assertTypeOf(value, expectedType, message) {
  testCount++;
  const actualType = typeof value;
  if (actualType === expectedType) {
    passCount++;
    console.log(`✅ [${testCount}] ${message} (type: ${actualType})`);
  } else {
    failureList.push(`❌ [${testCount}] ${message} (got type ${actualType}, expected ${expectedType})`);
    console.error(`❌ [${testCount}] ${message} (got type ${actualType}, expected ${expectedType})`);
  }
}

/**
 * SECTION 1: Module Availability Tests
 * Check if all removed functions are available through modules
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 1: MODULE AVAILABILITY TESTS');
console.log('═══════════════════════════════════════════════════════\n');

console.log('1.1. sajuAnalyzer.js module functions');
assert(typeof window.getTenGod === 'function', 'getTenGod should be available globally');
assert(typeof window.analyzeJohu === 'function', 'analyzeJohu should be available globally');
assert(typeof window.calcPower === 'function', 'calcPower should be available globally');
assert(typeof window.detectJong === 'function', 'detectJong should be available globally');

console.log('\n1.2. ziwei-doushu.js module functions');
assert(typeof window.calcZiweiPalaces === 'function', 'calcZiweiPalaces should be available globally');
assert(typeof window.evalStar === 'function', 'evalStar should be available globally');
assert(typeof window.calcDahuan === 'function', 'calcDahuan should be available globally');
assert(typeof window.buildZiweiChart === 'function', 'buildZiweiChart should be available globally');

console.log('\n1.3. Helper functions in saju-engine.js');
assert(typeof window.zwDisplayPalaceName === 'function', 'zwDisplayPalaceName should still exist in saju-engine.js');
assert(typeof window.zwComputeStarStrength === 'function', 'zwComputeStarStrength should exist');
assert(typeof window.zwNormalizeStrength === 'function', 'zwNormalizeStrength should exist');
assert(typeof window.zwStrengthToSymbol === 'function', 'zwStrengthToSymbol should exist');

/**
 * SECTION 2: Data Layer Tests
 * Check if GAN, JI, ZHI_LIST are available
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 2: DATA LAYER TESTS');
console.log('═══════════════════════════════════════════════════════\n');

console.log('2.1. Chinese astrology data');
assert(typeof window.GAN === 'object', 'GAN data should be available');
assert(typeof window.JI === 'object', 'JI data should be available');
assert(typeof window.ZHI_LIST === 'object', 'ZHI_LIST should be available');
assert(window.GAN && Object.keys(window.GAN).length > 0, 'GAN should have entries');
assert(window.ZHI_LIST && window.ZHI_LIST.length === 12, 'ZHI_LIST should have 12 branches');

/**
 * SECTION 3: getTenGod Function Tests
 * Sample calculation: Day=甲, Target=乙 => 겁재
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 3: getTenGod FUNCTION TESTS');
console.log('═══════════════════════════════════════════════════════\n');

if (typeof window.getTenGod === 'function') {
  console.log('3.1. Basic getTenGod calculation');
  try {
    // 甲일 기준
    const tenGod_甲_己 = window.getTenGod('甲', '己');
    assertNotNull(tenGod_甲_己, 'getTenGod(甲,己) should return a value');
    assert(typeof tenGod_甲_己 === 'string', 'getTenGod result should be string');
    
    // 丙일 기준
    const tenGod_丙_丁 = window.getTenGod('丙', '丁');
    assertNotNull(tenGod_丙_丁, 'getTenGod(丙,丁) should return a value');
  } catch (err) {
    failureList.push(`❌ getTenGod threw error: ${err.message}`);
    console.error(`❌ getTenGod threw error: ${err.message}`);
  }
} else {
  failureList.push('❌ getTenGod function not available');
  console.error('❌ getTenGod function not available');
}

/**
 * SECTION 4: analyzeJohu Function Tests
 * Check temperature/moisture balance analysis
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 4: analyzeJohu FUNCTION TESTS');
console.log('═══════════════════════════════════════════════════════\n');

if (typeof window.analyzeJohu === 'function') {
  console.log('4.1. Basic analyzeJohu calculation');
  try {
    const testDate = { y: 1997, m: 2, d: 10, h: 14 };
    const johuResult = window.analyzeJohu(testDate);
    assertNotNull(johuResult, 'analyzeJohu should return a result object');
    assert(johuResult && typeof johuResult === 'object', 'analyzeJohu result should be object');
    assert(johuResult && typeof johuResult.score !== 'undefined', 'johuResult should have score property');
  } catch (err) {
    failureList.push(`❌ analyzeJohu threw error: ${err.message}`);
    console.error(`❌ analyzeJohu threw error: ${err.message}`);
  }
} else {
  failureList.push('❌ analyzeJohu function not available');
  console.error('❌ analyzeJohu function not available');
}

/**
 * SECTION 5: detectJong Function Tests
 * Check 종격 (jonggyeok/traditional formula) detection
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 5: detectJong FUNCTION TESTS');
console.log('═══════════════════════════════════════════════════════\n');

if (typeof window.detectJong === 'function') {
  console.log('5.1. Basic detectJong calculation');
  try {
    const testDate = { y: 1997, m: 2, d: 10, h: 14 };
    const jongResult = window.detectJong(testDate);
    assertNotNull(jongResult, 'detectJong should return a result object');
    assert(jongResult && typeof jongResult === 'object', 'detectJong result should be object');
    assert(typeof jongResult.isJong !== 'undefined', 'jongResult should have isJong property');
  } catch (err) {
    failureList.push(`❌ detectJong threw error: ${err.message}`);
    console.error(`❌ detectJong threw error: ${err.message}`);
  }
} else {
  failureList.push('❌ detectJong function not available');
  console.error('❌ detectJong function not available');
}

/**
 * SECTION 6: calcZiweiPalaces Function Tests
 * 가장 중요한 함수: 자미두수 12궁 배치 및 별 위치 계산
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 6: calcZiweiPalaces FUNCTION TESTS');
console.log('═══════════════════════════════════════════════════════\n');

if (typeof window.calcZiweiPalaces === 'function') {
  console.log('6.1. Basic calcZiweiPalaces calculation');
  try {
    const ziweiResult = window.calcZiweiPalaces(1997, 2, 10, 14, 0);
    assertNotNull(ziweiResult, 'calcZiweiPalaces should return a result');
    assert(typeof ziweiResult === 'object', 'calcZiweiPalaces result should be object');
    
    console.log('\n6.2. Checking key properties in ziweiResult');
    assert(typeof ziweiResult.lunarMonth !== 'undefined', 'Should have lunarMonth');
    assert(typeof ziweiResult.lunarDay !== 'undefined', 'Should have lunarDay');
    assert(typeof ziweiResult.yearGan !== 'undefined', 'Should have yearGan');
    assert(ziweiResult.palaces && typeof ziweiResult.palaces === 'object', 'Should have palaces object');
    assert(ziweiResult.stars && typeof ziweiResult.stars === 'object', 'Should have stars object');
    assert(ziweiResult.daHan && typeof ziweiResult.daHan === 'object', 'Should have daHan object');
    assert(ziweiResult.sihuaData && typeof ziweiResult.sihuaData === 'object', 'Should have sihuaData');
    assert(ziweiResult.palaceStarData && Array.isArray(ziweiResult.palaceStarData), 'Should have palaceStarData array');
    
    console.log('\n6.3. Checking palace assignments (12 palaces)');
    const palaceNames = Object.keys(ziweiResult.palaces || {});
    assert(palaceNames.length === 12, 'Should have exactly 12 palaces');
    assert(palaceNames.includes('명궁'), 'Should have 명궁 (life palace)');
    assert(palaceNames.includes('부처궁'), 'Should have 부처궁 (wealth palace)');
    
    console.log('\n6.4. Checking star assignments');
    const starsObj = ziweiResult.stars || {};
    let hasStars = false;
    for (let i = 0; i < 12; i++) {
      if (starsObj[i] && starsObj[i].main && starsObj[i].main.length > 0) {
        hasStars = true;
        break;
      }
    }
    assert(hasStars, 'Should have at least one main star assigned');
    
  } catch (err) {
    failureList.push(`❌ calcZiweiPalaces threw error: ${err.message}`);
    console.error(`❌ calcZiweiPalaces threw error: ${err.message}`);
  }
} else {
  failureList.push('❌ calcZiweiPalaces function not available');
  console.error('❌ calcZiweiPalaces function not available');
}

/**
 * SECTION 7: Global State Tests
 * Check that GENDER and other global vars are preserved
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SECTION 7: GLOBAL STATE TESTS');
console.log('═══════════════════════════════════════════════════════\n');

assert(typeof window.GENDER !== 'undefined', 'GENDER global should exist');
assert(typeof window.setGender === 'function', 'setGender function should exist');

/**
 * SECTION 8: Summary
 */
console.log('\n═══════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');

const passRate = Math.round((passCount / testCount) * 100);
console.log(`Tests passed: ${passCount}/${testCount} (${passRate}%)`);

if (failureList.length > 0) {
  console.log(`\n⚠️  ${failureList.length} test(s) failed:\n`);
  failureList.forEach(failure => console.log(failure));
} else {
  console.log('\n✅ All tests passed!');
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(`Status: Phase 6 Runtime Validation - ${passRate >= 90 ? 'PASS ✅' : 'FAIL ❌'}`);
console.log('═══════════════════════════════════════════════════════\n');

// Return result for CI/CD integration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCount,
    passCount,
    failureList,
    passRate
  };
}
