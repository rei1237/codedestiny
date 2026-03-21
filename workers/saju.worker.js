/**
 * Saju (사주) Calculation Web Worker
 * 메인 스레드 블로킹 없이 배경에서 사주/만세력 계산 수행
 * 워커 메시지: { birthDate, birthTime, gender }
 * 반환: { pillars, ganji, lunar, bazi, error? }
 */

// ═══════════════════════════════════════
// STEP 1: 라이브러리 로딩
// ═══════════════════════════════════════
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/lunar-javascript@latest/lunar.js',
  'https://unpkg.com/lunar-javascript@latest/lunar.js',
  'https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js',
  'https://unpkg.com/lunar-javascript/lunar.js'
];

let libReady = false;
let libLoading = false;

function loadLibrarySequence() {
  if (libReady) return Promise.resolve();
  if (libLoading) return new Promise((resolve) => setTimeout(() => resolve(loadLibrarySequence()), 200));
  
  libLoading = true;
  let tried = 0;
  
  return new Promise((resolve, reject) => {
    function tryLoad() {
      if (tried >= CDN_URLS.length) {
        libLoading = false;
        return reject(new Error('모든 lunar-javascript CDN 로딩 실패'));
      }
      
      const url = CDN_URLS[tried++];
      importScripts(url);
      
      // 로드 성공 확인
      if (typeof Solar !== 'undefined' && typeof Lunar !== 'undefined') {
        libReady = true;
        libLoading = false;
        resolve();
      } else {
        tryLoad();
      }
    }
    
    try {
      tryLoad();
    } catch (e) {
      if (tried < CDN_URLS.length) {
        tryLoad();
      } else {
        libLoading = false;
        reject(e);
      }
    }
  });
}

// ═══════════════════════════════════════
// STEP 2: 핵심 계산 함수들
// ═══════════════════════════════════════

/**
 * 사주 계산 (음/양력 변환 → 팔자 추출)
 */
function calculateSaju(input) {
  try {
    if (!libReady) {
      return { error: '라이브러리가 아직 로드되지 않았습니다' };
    }

    const { birthDate, birthTime = '12:00', gender = 'F' } = input;
    
    if (!birthDate) {
      return { error: '생년월일이 필요합니다' };
    }

    // 날짜 파싱
    const dateParts = birthDate.split('-').map(Number);
    if (dateParts.length < 3) {
      return { error: '생년월일 형식이 잘못되었습니다 (YYYY-MM-DD)' };
    }

    const [year, month, day] = dateParts;
    
    // 시간 파싱
    const timeParts = birthTime.split(':').map(Number);
    const hour = timeParts[0] || 12;
    const minute = timeParts[1] || 0;
    const second = timeParts[2] || 0;

    // 사주 계산: 내천(lunar-javascript 기반)
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, second);
    if (!solar) {
      return { error: '유효하지 않은 날짜입니다' };
    }

    const lunar = solar.getLunar();
    if (!lunar) {
      return { error: '음력 변환 실패' };
    }

    // 팔자(BaZi)
    const baZi = lunar.getEightChar();
    if (!baZi) {
      return { error: '팔자 추출 실패' };
    }

    // 천간지지 추출
    const year_gz = baZi.getYear();
    const month_gz = baZi.getMonth();
    const day_gz = baZi.getDay();
    const hour_gz = baZi.getHour();

    // 결과 구성
    return {
      birthDate,
      birthTime,
      gender,
      lunar: {
        year: lunar.getYear(),
        month: Math.abs(lunar.getMonth()),
        day: lunar.getDay(),
        isLeap: lunar.getMonth() < 0
      },
      ganji: {
        year: year_gz,
        month: month_gz,
        day: day_gz,
        hour: hour_gz
      },
      bazi: {
        secha: year_gz,
        weolgeon: month_gz,
        iljin: day_gz,
        sigan: hour_gz
      },
      pillars: [
        { name: '년주(年柱)', value: year_gz },
        { name: '월주(月柱)', value: month_gz },
        { name: '일주(日柱)', value: day_gz },
        { name: '시주(時柱)', value: hour_gz }
      ],
      computed: true,
      timestamp: Date.now()
    };
  } catch (err) {
    console.error('[Saju Worker] 계산 오류:', err);
    return {
      error: err.message || '사주 계산 중 오류 발생',
      timestamp: Date.now()
    };
  }
}

/**
 * 대운(Daewoon) 계산 보조
 */
function calculateDaewoon(input) {
  try {
    const { birthDate, gender } = input;
    
    if (!birthDate) {
      return { error: '생년월일이 필요합니다' };
    }

    const dateParts = birthDate.split('-').map(Number);
    const [birthYear, birthMonth, birthDay] = dateParts;

    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;
    
    // 간단한 대운 정보 (실제로는 더 복잡한 계산 필요)
    const daewoonData = [];
    for (let i = 0; i < 8; i++) {
      const startAge = i * 10;
      const endAge = (i + 1) * 10 - 1;
      
      // 운세 강도 (0-100) - 실제 법칙을 따라 계산 필요
      const score = Math.floor(Math.random() * 60 + 20);
      
      daewoonData.push({
        age: `${startAge}-${endAge}`,
        label: `${birthYear + startAge}년(${startAge}세)`,
        score: score
      });
    }

    return {
      daewoonData,
      currentAge,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      error: err.message || '대운 계산 중 오류 발생',
      timestamp: Date.now()
    };
  }
}

/**
 * 음/양력 변환
 */
function convertLunarToSolar(input) {
  try {
    if (!libReady) {
      return { error: '라이브러리가 아직 로드되지 않았습니다' };
    }

    const { year, month, day, isLeap = false } = input;
    
    const m = isLeap ? -Math.abs(month) : Math.abs(month);
    const lunar = Lunar.fromYmd(year, m, day);
    
    if (!lunar) {
      return { error: '유효하지 않은 음력 날짜입니다' };
    }

    const solar = lunar.getSolar();
    
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      dateStr: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      error: err.message || '음/양력 변환 실패',
      timestamp: Date.now()
    };
  }
}

/**
 * 양/음력 변환
 */
function convertSolarToLunar(input) {
  try {
    if (!libReady) {
      return { error: '라이브러리가 아직 로드되지 않았습니다' };
    }

    const { year, month, day, hour = 12, minute = 0, second = 0 } = input;
    
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, second);
    
    if (!solar) {
      return { error: '유효하지 않은 양력 날짜입니다' };
    }

    const lunar = solar.getLunar();
    
    return {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      isLeap: lunar.getMonth() < 0,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      error: err.message || '양/음력 변환 실패',
      timestamp: Date.now()
    };
  }
}

// ═══════════════════════════════════════
// STEP 3: 워커 메시지 핸들러
// ═══════════════════════════════════════

self.onmessage = async function(event) {
  const { type = 'calculateSaju', data, id } = event.data;
  
  try {
    // 라이브러리 준비
    if (!libReady && !libLoading) {
      await loadLibrarySequence();
    }
    
    let result;
    
    switch (type) {
      case 'calculateSaju':
        result = calculateSaju(data);
        break;
      
      case 'calculateDaewoon':
        result = calculateDaewoon(data);
        break;
      
      case 'convertLunarToSolar':
        result = convertLunarToSolar(data);
        break;
      
      case 'convertSolarToLunar':
        result = convertSolarToLunar(data);
        break;
      
      default:
        result = { error: `알 수 없는 작업: ${type}` };
    }
    
    // 결과 반환
    self.postMessage({
      type,
      id,
      result,
      success: !result.error
    });
    
  } catch (error) {
    self.postMessage({
      type,
      id,
      result: { error: error.message },
      success: false
    });
  }
};

// ═══════════════════════════════════════
// STEP 4: 워커 초기화
// ═══════════════════════════════════════

// 워커 로드 시 라이브러리 자동 로딩 시작
loadLibrarySequence().catch((err) => {
  console.warn('[Saju Worker] 초기 라이브러리 로드 실패:', err);
  // 첫 메시지 수신 시 다시 시도
});
