(function initSwissEphLazyLoader() {
  if (typeof window === 'undefined') return;
  if (window.__loadSwissEphModule) return;

  var swissEphPromise = null;

  function loadSwissEphModule() {
    if (swissEphPromise) return swissEphPromise;

    swissEphPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.type = 'module';
      script.src = '/js/swisseph-loader.js';
      script.onload = function () { resolve(true); };
      script.onerror = function (err) { reject(err || new Error('Failed to load /js/swisseph-loader.js')); };
      document.head.appendChild(script);
    }).catch(function (err) {
      console.warn('[SwissEph] lazy module load failed.', err);
      return false;
    });

    return swissEphPromise;
  }

  window.__loadSwissEphModule = loadSwissEphModule;

  function warmupSwissEph() {
    loadSwissEphModule();
  }

  var triggerSelector = '#birthYear, #birthMonth, #birthDay, #birthHour, #birthMinute, #birthCountry, #btnF, #btnM, #btnNewSaju';

  document.addEventListener('focusin', function (ev) {
    var target = ev && ev.target;
    if (target && typeof target.closest === 'function' && target.closest(triggerSelector)) {
      warmupSwissEph();
    }
  }, { passive: true });

  document.addEventListener('pointerdown', function (ev) {
    var target = ev && ev.target;
    if (target && typeof target.closest === 'function' && target.closest(triggerSelector)) {
      warmupSwissEph();
    }
  }, { passive: true });

  document.addEventListener('keydown', function (ev) {
    if (ev && ev.key === 'Enter') {
      warmupSwissEph();
    }
  }, { passive: true });
})();
