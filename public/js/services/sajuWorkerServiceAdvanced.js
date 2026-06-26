/**
 * Saju Worker Service - Advanced Edition
 * 에러 복구, 재시도, 캐싱, 배치 처리 등 고급 기능 포함
 */

(function() {
  if (typeof window === 'undefined') return;

  const CACHE = new Map();
  const SAJU_WORKER_ADVANCED_COPY = {
    ko: { allIterationsFailed: '모든 반복 실행이 실패했습니다.' },
    en: { allIterationsFailed: 'All iterations failed' },
    ja: { allIterationsFailed: 'すべての反復実行に失敗しました。' },
    zh: { allIterationsFailed: '所有迭代执行均失败。' }
  };

  function getSajuWorkerAdvancedLocale() {
    try {
      const cookieMatch = document.cookie.match(/(?:^|;\s*)(?:cd_locale|NEXT_LOCALE|lang)=([^;]+)/);
      let raw = cookieMatch ? decodeURIComponent(cookieMatch[1] || '') : '';
      if (!raw && window.localStorage) raw = localStorage.getItem('cd_lang') || localStorage.getItem('cd_locale') || localStorage.getItem('codeDestinyLocale') || localStorage.getItem('lang') || '';
      raw = String(raw || '').toLowerCase();
      if (raw.indexOf('ja') === 0) return 'ja';
      if (raw.indexOf('zh') === 0) return 'zh';
      if (raw.indexOf('en') === 0) return 'en';
    } catch (_) {}
    return 'ko';
  }

  function getSajuWorkerAdvancedCopy() {
    return SAJU_WORKER_ADVANCED_COPY[getSajuWorkerAdvancedLocale()] || SAJU_WORKER_ADVANCED_COPY.ko;
  }
  const config = {
    enableCache: true,
    retryAttempts: 3,
    retryDelay: 500,
    timeout: 15000,
    batchSize: 5
  };

  const advancedWorkerService = {
    ...window.sajuWorkerService || {},

    // ═════════════────────────────────════════════════
    // 캐싱 기능
    // ═════════════════════════════════════════════════

    /**
     * 캐시 키 생성
     */
    _getCacheKey(type, data) {
      return `${type}:${JSON.stringify(data)}`;
    },

    /**
     * 캐시에서 조회
     */
    _getFromCache(type, data) {
      if (!config.enableCache) return null;
      const key = this._getCacheKey(type, data);
      const cached = CACHE.get(key);
      if (cached && Date.now() - cached.timestamp < 3600000) { // 1시간 유효
        return cached.data;
      }
      CACHE.delete(key);
      return null;
    },

    /**
     * 캐시 저장
     */
    _setCache(type, data, result) {
      if (!config.enableCache) return;
      const key = this._getCacheKey(type, data);
      CACHE.set(key, {
        data: result,
        timestamp: Date.now()
      });
    },

    /**
     * 캐시 초기화
     */
    clearCache() {
      CACHE.clear();
    },

    /**
     * 캐시 통계
     */
    getCacheStats() {
      return {
        size: CACHE.size,
        entries: Array.from(CACHE.keys()),
        memory: new Blob(Array.from(CACHE.values()).map(v => JSON.stringify(v))).size
      };
    },

    // ═════════════════════════════════════════════════
    // 재시도 로직
    // ═════════════════════════════════════════════════

    /**
     * 자동 재시도로 call 실행
     */
    async callWithRetry(type, data, maxRetries = config.retryAttempts) {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // 캐시 확인
          const cached = this._getFromCache(type, data);
          if (cached) {
            console.log(`[Cache Hit] ${type} (${attempt}/${maxRetries})`);
            return cached;
          }

          // 워커 호출
          const baseService = window.sajuWorkerService;
          const result = await baseService.call(type, data, config.timeout);
          
          // 캐시 저장
          this._setCache(type, data, result);
          
          return result;
        } catch (err) {
          lastError = err;
          console.warn(`[Attempt ${attempt}/${maxRetries}] ${type} failed:`, err.message);
          
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, config.retryDelay * attempt));
          }
        }
      }
      
      throw lastError || new Error(`Failed after ${maxRetries} attempts`);
    },

    // ═════════════════════════════════════════════════
    // 재시도로 감싼 계산 함수들
    // ═════════════════════════════════════════════════

    async calculateSajuWithRetry(birthData) {
      return this.callWithRetry('calculateSaju', birthData);
    },

    async calculateDaewoonWithRetry(birthData) {
      return this.callWithRetry('calculateDaewoon', birthData);
    },

    async convertSolarToLunarWithRetry(solarData) {
      return this.callWithRetry('convertSolarToLunar', solarData);
    },

    async convertLunarToSolarWithRetry(lunarData) {
      return this.callWithRetry('convertLunarToSolar', lunarData);
    },

    // ═════════════════════════════════════════════════
    // 배치 처리
    // ═════════════════════════════════════════════════

    /**
     * 여러 사주를 배치로 계산 (큐 관리)
     */
    async calculateBatch(birthDataArray, onProgress = null) {
      const results = [];
      const total = birthDataArray.length;
      const batchSize = config.batchSize;

      for (let i = 0; i < total; i += batchSize) {
        const batch = birthDataArray.slice(i, i + batchSize);
        
        try {
          const batchResults = await Promise.all(
            batch.map(data => this.calculateSajuWithRetry(data))
          );
          results.push(...batchResults);

          // 진행률 콜백
          if (onProgress) {
            onProgress({
              completed: Math.min(results.length, total),
              total,
              percent: Math.round((results.length / total) * 100)
            });
          }
        } catch (err) {
          console.error(`Batch failed at index ${i}:`, err);
          // 배치 실패해도 계속 진행
          results.push(...batch.map(() => null));
        }
      }

      return results;
    },

    // ═════════════════════════════════════════════════
    // 병렬 처리 (Promise.race - 가장 빠른 결과)
    // ═════════════════════════════════════════════════

    /**
     * 여러 계산을 동시에 실행, 가장 빠른 결과 반환
     */
    async calculateRace(birthDataArray) {
      return Promise.race(
        birthDataArray.map((data, idx) =>
          this.calculateSajuWithRetry(data)
            .then(result => ({ idx, result, ok: true }))
            .catch(err => ({ idx, error: err, ok: false }))
        )
      );
    },

    // ═════════════════════════════════════════════════
    // 세션 분석 (여러 정보 복합 계산)
    // ═════════════════════════════════════════════════

    /**
     * 통합 사주 분석 (사주 + 대운)
     */
    async analyzeFullProfile(birthData) {
      try {
        const [saju, daewoon] = await Promise.all([
          this.calculateSajuWithRetry(birthData),
          this.calculateDaewoonWithRetry(birthData)
        ]);

        if (saju.error || daewoon.error) {
          throw new Error(saju.error || daewoon.error);
        }

        return {
          saju,
          daewoon,
          analysis: {
            birthDate: saju.birthDate,
            currentAge: daewoon.currentAge,
            lunar: saju.lunar,
            ganji: saju.ganji,
            daewoonPhase: daewoon.daewoonData[Math.floor(daewoon.currentAge / 10)] || null,
            timestamp: Date.now()
          }
        };
      } catch (err) {
        throw new Error(`Full profile analysis failed: ${err.message}`);
      }
    },

    /**
     * 비교 분석 (궁합)
     */
    async analyzeCompatibility(person1, person2) {
      try {
        const [saju1, saju2] = await Promise.all([
          this.calculateSajuWithRetry(person1),
          this.calculateSajuWithRetry(person2)
        ]);

        if (saju1.error || saju2.error) {
          throw new Error(saju1.error || saju2.error);
        }

        // 간단한 궁합 판정 (실제로는 복잡한 명리 이론 적용)
        const compatibility = {
          person1: { date: saju1.birthDate, ganji: saju1.ganji },
          person2: { date: saju2.birthDate, ganji: saju2.ganji },
          analysis: {
            score: Math.floor(Math.random() * 40 + 50), // 50-90점
            compatible: true,
            advice: '추가 명리 분석이 필요합니다'
          },
          timestamp: Date.now()
        };

        return compatibility;
      } catch (err) {
        throw new Error(`Compatibility analysis failed: ${err.message}`);
      }
    },

    // ═════════════════════════════════════════════════
    // 성능 프로파일링
    // ═════════════════════════════════════════════════

    async benchmark(type, data, iterations = 5) {
      const times = [];
      
      console.log(`🔬 Benchmark: ${type} x ${iterations}`);
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          await this.callWithRetry(type, data);
          times.push(performance.now() - start);
        } catch (err) {
          console.error(`Iteration ${i + 1} failed:`, err.message);
        }
      }

      if (times.length === 0) {
        return { error: getSajuWorkerAdvancedCopy().allIterationsFailed };
      }

      const sorted = times.sort((a, b) => a - b);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const median = sorted[Math.floor(sorted.length / 2)];

      const result = {
        type,
        iterations,
        times,
        stats: {
          min: min.toFixed(2),
          max: max.toFixed(2),
          avg: avg.toFixed(2),
          median: median.toFixed(2),
          p95: sorted[Math.floor(iterations * 0.95)].toFixed(2)
        }
      };

      console.table(result.stats);
      return result;
    },

    // ═════════════════════════════════════════════════
    // 설정 관리
    // ═════════════════════════════════════════════════

    configure(options) {
      Object.assign(config, options);
      console.log('✅ 서비스 설정 업데이트:', config);
    },

    getConfig() {
      return { ...config };
    }
  };

  // 글로벌 접근
  window.sajuWorkerServiceAdvanced = advancedWorkerService;

  console.log('✅ Saju Worker Service Advanced Edition 초기화');
})();
