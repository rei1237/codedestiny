(function(){
  var _splashDone = false;
  /* prefers-reduced-motion: 접근성 배려 + 저사양 기기 보호 */
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -- 별빛 캔버스 (reduced-motion 비활성) -- */
  var cvs = document.getElementById('splashCanvas');
  var rafId, _frame = 0;
  if (cvs && !prefersReduced) {
    var ctx = cvs.getContext('2d');
    cvs.width = window.innerWidth; cvs.height = window.innerHeight;

    /* 색상 팔레트 (RGB 문자열 사전 생성 — 매 프레임 문자열 연산 없음) */
    var palette = ['200,215,255','225,235,255','255,245,210','220,200,255','255,255,255'];

    /* 별 56개 — 코어/글로우/스파클 3단 구성 */
    var stars = Array.from({length: 56}, function() {
      var c = palette[Math.floor(Math.random() * palette.length)];
      return {
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height,
        r: Math.random() * 1.45 + 0.25,
        a: Math.random() * Math.PI * 2,
        spd: Math.random() * 0.013 + 0.003,
        phase: Math.random() * Math.PI * 2,
        phaseSpd: Math.random() * 0.018 + 0.004,
        base: Math.random() * 0.35 + 0.18,
        rng:  Math.random() * 0.34 + 0.12,
        glow: Math.random() * 2.2 + 1.2,
        spike: Math.random() < 0.22,
        drift: Math.random() * 0.25 + 0.05,
        col:  c
      };
    });

    function drawStars() {
      _frame++;
      /* 2프레임에 1번 실제 렌더 → 효과적 30fps, CPU 절반 */
      if (_frame & 1) { rafId = requestAnimationFrame(drawStars); return; }

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.a += s.spd;
        s.phase += s.phaseSpd;
        var alpha = s.base + Math.sin(s.a) * s.rng + Math.sin(s.phase) * 0.16;
        if (alpha < 0.04) alpha = 0.04;
        if (alpha > 0.95) alpha = 0.95;

        /* 미세 드리프트로 정적인 느낌 완화 */
        var dx = Math.sin((s.a + i) * 0.5) * s.drift;
        var dy = Math.cos((s.phase + i) * 0.45) * s.drift;

        /* 외곽 글로우 */
        ctx.globalAlpha = alpha * 0.28;
        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.r + s.glow, 0, 6.2832);
        ctx.fillStyle = 'rgb(' + s.col + ')';
        ctx.fill();

        /* 코어 */
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.r, 0, 6.2832);
        ctx.fillStyle = 'rgb(' + s.col + ')';
        ctx.fill();

        /* 일부 별에만 십자 스파클 추가 */
        if (s.spike && alpha > 0.55) {
          var spikeLen = s.r * 2.6;
          ctx.globalAlpha = alpha * 0.45;
          ctx.strokeStyle = 'rgb(' + s.col + ')';
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(s.x + dx - spikeLen, s.y + dy);
          ctx.lineTo(s.x + dx + spikeLen, s.y + dy);
          ctx.moveTo(s.x + dx, s.y + dy - spikeLen);
          ctx.lineTo(s.x + dx, s.y + dy + spikeLen);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(drawStars);
    }
    drawStars();
  } else if (cvs) {
    /* 모바일 / reduced-motion: 캔버스 비활성화 */
    cvs.style.display = 'none';
  }

  /* -- 안내 문구 순환 -- */
  var msgs = [
    '하늘의 별자리를 조용히 정렬하는 중...',
    '오행의 흐름을 부드럽게 맞추는 중...',
    '당신의 운명 좌표를 분석하는 중...',
    '타로 카드가 전할 이야기를 준비하는 중...',
    '오늘의 행운과 조언을 정리하는 중...',
    '잠시만요, 결과 화면을 곧 열어드릴게요...'
  ];
  var mi = 0;
  var msgEl = document.getElementById('splashMsg');
  var msgTimer = setInterval(function() {
    if (!msgEl) return;
    mi = (mi + 1) % msgs.length;
    msgEl.style.opacity = '0';
    msgEl.style.transition = 'opacity 0.35s';
    setTimeout(function() {
      if (msgEl) {
        msgEl.textContent = msgs[mi];
        msgEl.style.opacity = '1';
      }
    }, 350);
  }, 1800);

  /* -- 로딩 바 진행 -- */
  var bar = document.getElementById('splashBar');
  var barVal = 0;
  var barTimer = setInterval(function() {
    barVal = Math.min(barVal + Math.random() * 18 + 5, 90);
    if (bar) bar.style.width = barVal + '%';
    if (barVal >= 90) clearInterval(barTimer);
  }, 350);

  /* -- 초기 로딩 완료 -> 스플래시 숨김 -- */
  function hideSplash() {
    if (_splashDone) return;
    _splashDone = true;
    clearInterval(msgTimer);
    clearInterval(barTimer);
    if (bar) bar.style.width = '100%';
    var splash = document.getElementById('codeSplash');
    if (splash) {
      splash.style.display = 'none';
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }
    if (rafId) cancelAnimationFrame(rafId);
  }

  /* 즉시 숨김: 로딩 연출 대기 제거 */
  hideSplash();
  window.addEventListener('pageshow', function() {
    hideSplash();
  }, { once: true });
})();
