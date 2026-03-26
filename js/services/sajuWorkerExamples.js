/**
 * 사주 계산 Web Worker 사용 예제
 * 메인 스레드에서 워커를 통해 비동기 사주 계산 수행
 */

// ═══════════════════════════════════════
// EXAMPLE 1: 기본 사용 (Promise 기반)
// ═══════════════════════════════════════

async function computeSajuWithWorker(birthDate, birthTime, gender) {
  try {
    console.time('Saju Calculation with Worker');
    
    // 워커에 사주 계산 요청 (메인 스레드 블로킹 없음)
    const result = await window.sajuWorkerService.calculateSaju({
      birthDate,      // "1997-02-10"
      birthTime,      // "14:30"
      gender          // "M" 또는 "F"
    });

    console.timeEnd('Saju Calculation with Worker');
    console.log('사주 계산 완료:', result);

    return result;
  } catch (err) {
    console.error('사주 계산 실패:', err);
    return null;
  }
}

// ═══════════════════════════════════════
// EXAMPLE 2: React/TSX 컴포넌트 통합
// ═══════════════════════════════════════

/**
 * React Hook 예제: 사주 계산 (Web Worker 사용)
 */
function useSajuWorker() {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  const calculate = React.useCallback(async (birthData) => {
    setLoading(true);
    setError(null);

    try {
      const sajuResult = await window.sajuWorkerService.calculateSaju(birthData);
      
      if (sajuResult && !sajuResult.error) {
        setResult(sajuResult);
        return sajuResult;
      } else {
        throw new Error(sajuResult?.error || '사주 계산 실패');
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { calculate, result, loading, error };
}

/**
 * React 컴포넌트 예제
 */
function SajuReportComponent({ birthData }) {
  const { calculate, result, loading, error } = useSajuWorker();

  React.useEffect(() => {
    if (birthData?.birthDate) {
      calculate(birthData);
    }
  }, [birthData?.birthDate]);

  if (loading) {
    return <div>📊 사주 계산 중... (메인 스레드 무응답 없음)</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>⚠️ 오류: {error}</div>;
  }

  if (!result) {
    return <div>사주를 입력하여 계산해주세요</div>;
  }

  return (
    <div style={{ padding: '20px', background: '#1a1a2e', color: '#fff', borderRadius: '8px' }}>
      <h3>📿 사주 계산 결과</h3>
      
      <div style={{ marginTop: '12px', fontSize: '14px', lineHeight: '1.8' }}>
        <p><b>생년월일:</b> {result.birthDate}</p>
        <p><b>생시:</b> {result.birthTime}</p>
        <p><b>성별:</b> {result.gender === 'M' ? '남' : '여'}</p>
        
        <p style={{ marginTop: '16px', color: '#ffd700' }}><b>음력:</b> {result.lunar.year}년 {result.lunar.month}월 {result.lunar.day}일{result.lunar.isLeap ? ' (윤달)' : ''}</p>
        
        <p style={{ marginTop: '12px' }}><b>천간지지:</b></p>
        <ul style={{ marginLeft: '20px', margin: '8px 0' }}>
          <li>년주: {result.ganji.year}</li>
          <li>월주: {result.ganji.month}</li>
          <li>일주: {result.ganji.day}</li>
          <li>시주: {result.ganji.hour}</li>
        </ul>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
        계산시간: {result.timestamp}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// EXAMPLE 3: 배치 처리 (여러 명 동시 계산)
// ═══════════════════════════════════════

async function calculateMultipleSaju(birthDataArray) {
  console.time('Batch Saju Calculation');
  
  try {
    // 모든 사주를 병렬로 계산 (각각 독립적인 워커 작업)
    const promises = birthDataArray.map((data) =>
      window.sajuWorkerService.calculateSaju(data)
    );

    const results = await Promise.all(promises);
    
    console.timeEnd('Batch Saju Calculation');
    console.log(`✅ ${results.length}명 사주 계산 완료 (메인 스레드 블로킹 없음)`);
    
    return results;
  } catch (err) {
    console.error('배치 계산 실패:', err);
    return [];
  }
}

// 사용 예:
const batchData = [
  { birthDate: '1997-02-10', birthTime: '14:30', gender: 'M' },
  { birthDate: '1998-05-15', birthTime: '09:00', gender: 'F' },
  { birthDate: '2000-01-01', birthTime: '12:00', gender: 'M' }
];
// calculateMultipleSaju(batchData);

// ═══════════════════════════════════════
// EXAMPLE 4: 음/양력 변환 (워커 부하 분산)
// ═══════════════════════════════════════

async function convertLunarDate(year, month, day, isLeap = false) {
  try {
    const result = await window.sajuWorkerService.convertLunarToSolar({
      year,
      month,
      day,
      isLeap
    });
    
    console.log(`음력 ${year}-${month}-${day}` + (isLeap ? ' (윤달)' : '') + ` → 양력 ${result.dateStr}`);
    return result;
  } catch (err) {
    console.error('변환 실패:', err);
    return null;
  }
}

// 사용:
// convertLunarDate(1997, 1, 3); // 음력 1997-01-03 → 양력?

// ═══════════════════════════════════════
// EXAMPLE 5: 대운 계산 (Long-running Task)
// ═══════════════════════════════════════

async function calculateDaewoonLifeChart(birthDate, gender) {
  try {
    console.time('Daewoon Calculation');
    
    const result = await window.sajuWorkerService.calculateDaewoon({
      birthDate,
      gender
    });

    console.timeEnd('Daewoon Calculation');
    console.log('📈 대운 데이터:', result.daewoonData);
    
    return result;
  } catch (err) {
    console.error('대운 계산 실패:', err);
    return null;
  }
}

// ═══════════════════════════════════════
// EXAMPLE 6: HTML 폼에서 사용
// ═══════════════════════════════════════

/*
<form id="sajuForm">
  <input id="birthDate" type="date" />
  <input id="birthTime" type="time" value="12:00" />
  <select id="gender">
    <option value="M">남</option>
    <option value="F">여</option>
  </select>
  <button type="submit">계산 (Web Worker 사용)</button>
</form>
<div id="result"></div>

<script>
document.getElementById('sajuForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const birthDate = document.getElementById('birthDate').value;
  const birthTime = document.getElementById('birthTime').value;
  const gender = document.getElementById('gender').value;
  
  const result = await window.sajuWorkerService.calculateSaju({
    birthDate,
    birthTime,
    gender
  });
  
  document.getElementById('result').innerHTML = JSON.stringify(result, null, 2);
});
</script>
*/

// ═══════════════════════════════════════
// EXAMPLE 7: 성능 비교 (With/Without Worker)
// ═══════════════════════════════════════

async function performanceBenchmark() {
  const testData = {
    birthDate: '1997-02-10',
    birthTime: '14:30',
    gender: 'M'
  };

  // Worker 사용
  console.time('⚡ With Worker (Non-blocking)');
  const workerResult = await window.sajuWorkerService.calculateSaju(testData);
  console.timeEnd('⚡ With Worker (Non-blocking)');

  console.log('✅ Worker 사용 결과:', workerResult);
  
  // 참고: 메인 스레드는 Worker 계산 중에도 반응형 유지
  console.log('📌 메인 스레드 상태: 계속 사용 가능 (UI 반응성 유지)');
}

// 글로벌 접근
window.sajuWorkerExamples = {
  computeSajuWithWorker,
  useSajuWorker,
  calculateMultipleSaju,
  convertLunarDate,
  calculateDaewoonLifeChart,
  performanceBenchmark
};
