self.onmessage = function (event) {
  var data = (event && event.data) || {};
  var cores = Number(data.cores || 0);
  var deviceMemory = Number(data.deviceMemory || 0);
  var effectiveType = String(data.effectiveType || '').toLowerCase();
  var saveData = !!data.saveData;

  var slowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g';
  var lowCore = cores > 0 && cores <= 4;
  var lowMemory = deviceMemory > 0 && deviceMemory <= 4;

  var lowEnd = saveData || slowNetwork || lowCore || lowMemory;

  var profile = {
    lowEnd: lowEnd,
    deferMs: lowEnd ? 3200 : 900,
    idleTimeout: lowEnd ? 4800 : 2200,
    maxParallel: lowEnd ? 1 : 2
  };

  self.postMessage(profile);
};
