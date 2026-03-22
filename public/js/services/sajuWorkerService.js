/**
 * Saju Worker Integration Layer
 * 메인 스레드에서 Web Worker와의 통신을 관리하는 서비스 계층
 * 사용: sajuWorkerService.calculateSaju({ birthDate, birthTime, gender })
 */

(function() {
  if (typeof window === 'undefined') return;

  const workerService = {
    worker: null,
    callbacks: {},
    requestId: 0,
    isReady: false,

    /**
     * 워커 초기화
     */
    init() {
      if (this.worker) return;

      try {
        // Web Worker 생성
        const workerPath = new URL('../workers/saju.worker.js', import.meta.url);
        this.worker = new Worker(workerPath, { type: 'module' });

        // 워커에서 온 메시지 처리
        this.worker.onmessage = (event) => {
          const { type, id, result, success } = event.data;
          
          // 해당 요청의 콜백 실행
          if (this.callbacks[id]) {
            const { resolve, reject, timeout } = this.callbacks[id];
            clearTimeout(timeout);
            
            if (success && !result.error) {
              resolve(result);
            } else {
              reject(new Error(result.error || '워커 처리 오류'));
            }
            
            delete this.callbacks[id];
          }
        };

        // 워커 에러 처리
        this.worker.onerror = (error) => {
          console.error('[Saju Worker] 오류:', error);
          // 모든 대기 중인 콜백에 에러 전파
          Object.keys(this.callbacks).forEach((id) => {
            const { reject, timeout } = this.callbacks[id];
            clearTimeout(timeout);
            reject(error);
            delete this.callbacks[id];
          });
        };

        this.isReady = true;
      } catch (e) {
        console.warn('[Saju Worker] 초기화 실패:', e);
        this.isReady = false;
      }
    },

    /**
     * 워커에 작업 요청 (Promise 기반)
     */
    async call(type, data, timeout = 15000) {
      return new Promise((resolve, reject) => {
        if (!this.worker) {
          this.init();
        }

        if (!this.worker) {
          reject(new Error('Web Worker를 초기화할 수 없습니다'));
          return;
        }

        const id = ++this.requestId;
        const timeoutHandle = setTimeout(() => {
          delete this.callbacks[id];
          reject(new Error(`작업 타임아웃 (${timeout}ms): ${type}`));
        }, timeout);

        this.callbacks[id] = { resolve, reject, timeout: timeoutHandle };

        // 워커에 메시지 전송
        this.worker.postMessage({
          type,
          data,
          id
        });
      });
    },

    /**
     * 사주 계산
     */
    calculateSaju(birthData) {
      return this.call('calculateSaju', birthData);
    },

    /**
     * 대운 계산
     */
    calculateDaewoon(birthData) {
      return this.call('calculateDaewoon', birthData);
    },

    /**
     * 음력 → 양력 변환
     */
    convertLunarToSolar(lunarData) {
      return this.call('convertLunarToSolar', lunarData);
    },

    /**
     * 양력 → 음력 변환
     */
    convertSolarToLunar(solarData) {
      return this.call('convertSolarToLunar', solarData);
    },

    /**
     * 워커 종료
     */
    terminate() {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
        this.isReady = false;
      }
    }
  };

  // 글로벌 접근
  window.sajuWorkerService = workerService;

  // 자동 초기화 (Optional: 필요시 첫 로드 시 초기화)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      workerService.init();
    });
  } else {
    workerService.init();
  }
})();
