/* 꿀꿀운세 홈 「달빛 운명여행」 뮤직비디오 쇼케이스 (cdh-mv-moonlight-destiny-v20261015).
 * 영냥이 오프닝 송(app/yeongnyangi/_components/OpeningSong.tsx)의 재생 규칙을 정적 셸용 ES5 로 옮겼다.
 * - 첫 클릭 전에는 src 가 없어 영상 바이트를 하나도 받지 않는다. 소리 있는 재생이 허용되도록 play() 는 클릭 핸들러 안에서 바로 부른다.
 * - 영상은 R2(codedestinyassets) 내용해시 키라 immutable 이다. 바꿀 때는 새 키로 올리고 템플릿의 data-src-* 만 고친다.
 * - 가사는 무자막 영상 위에 WebVTT 자막 트랙으로 얹는다. 기본은 켬이고, 토글과 브라우저 자막 메뉴가 같은 상태를 본다.
 */
(function () {
  'use strict';
  var root = document.getElementById('cdhMoonlightMv');
  if (!root) return;
  var screen = root.querySelector('[data-cdh-mv-screen]');
  var video = root.querySelector('video');
  var cover = root.querySelector('[data-cdh-mv-play]');
  var status = root.querySelector('[data-cdh-mv-error]');
  var lyricsToggle = root.querySelector('[data-cdh-mv-lyrics]');
  var chapters = Array.prototype.slice.call(root.querySelectorAll('[data-cdh-mv-seek]'));
  if (!screen || !video || !cover) return;

  var state = 'idle';
  var quality = '';
  var playSource = 'cover';
  var playTracked = false;
  var pendingSeek = null;
  var lyricsOn = true;
  var viewObserver = null;

  function text(key, fallback) {
    try {
      return typeof window.cdTranslate === 'function' ? window.cdTranslate('home.mv.' + key, null, fallback) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function track(name, params) {
    if (typeof window.cdTrack === 'function') window.cdTrack(name, params);
  }

  // 표시 폭 × DPR(2배까지)이 1400px 을 넘고 데이터 절약·저속 회선이 아닐 때만 1080p(42MB), 나머지는 720p(21MB).
  function pickSource() {
    var connection = navigator.connection || {};
    var slow = Boolean(connection.saveData) || /2g|3g/.test(connection.effectiveType || '');
    var hd = !slow && screen.clientWidth * Math.min(window.devicePixelRatio || 1, 2) > 1400;
    quality = hd ? '1080p' : '720p';
    return video.getAttribute(hd ? 'data-src-1080' : 'data-src-720');
  }

  function setState(next) {
    state = next;
    screen.setAttribute('data-state', next);
    if (next === 'loading') cover.setAttribute('aria-busy', 'true');
    else cover.removeAttribute('aria-busy');
  }

  function fail() {
    setState('error');
    cover.hidden = false;
    if (status) status.textContent = text('error', '영상을 불러오지 못했어요. 다시 눌러 주세요.');
  }

  function start(source) {
    playSource = source;
    if (status) status.textContent = '';
    if (state === 'idle' || state === 'error') video.src = pickSource();
    setState('loading');
    watchViewport();
    var promise = video.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(function (error) {
        // 불러오는 중에 화면 밖으로 나가 멈춘 경우는 실패가 아니다. 다시 누르면 이어서 재생한다.
        if (error && error.name === 'AbortError' && !video.error) setState('idle');
        else fail();
      });
    }
  }

  // 화면 밖으로 완전히 나가면 멈춘다. 전체 화면 재생 중에는 건드리지 않는다.
  function watchViewport() {
    if (viewObserver || typeof window.IntersectionObserver !== 'function') return;
    viewObserver = new window.IntersectionObserver(function (entries) {
      var fullscreen = Boolean(document.fullscreenElement) || Boolean(video.webkitDisplayingFullscreen);
      if (!entries[0].isIntersecting && !video.paused && !fullscreen) video.pause();
    });
    viewObserver.observe(video);
  }

  function applyLyrics() {
    var tracks = video.textTracks;
    if (tracks && tracks[0]) tracks[0].mode = lyricsOn ? 'showing' : 'hidden';
    if (lyricsToggle) lyricsToggle.setAttribute('aria-pressed', lyricsOn ? 'true' : 'false');
  }

  function markChapter() {
    var now = video.currentTime + 0.25;
    var current = null;
    chapters.forEach(function (button) {
      if (parseFloat(button.getAttribute('data-cdh-mv-seek')) <= now) current = button;
    });
    chapters.forEach(function (button) {
      if (button === current) button.setAttribute('aria-current', 'time');
      else button.removeAttribute('aria-current');
    });
  }

  cover.addEventListener('click', function () {
    start('cover');
  });

  video.addEventListener('playing', function () {
    // 커버 버튼이 사라지므로, 포커스가 버튼에 있었다면 컨트롤이 붙은 영상으로 옮긴다.
    var refocus = document.activeElement === cover;
    setState('playing');
    video.controls = true;
    cover.hidden = true;
    if (refocus) video.focus();
    if (!playTracked) {
      playTracked = true;
      track('home_mv_play', { quality: quality, source: playSource });
    }
  });
  video.addEventListener('error', function () {
    if (state !== 'idle') fail();
  });
  video.addEventListener('loadedmetadata', function () {
    // 새로 불러올 때 브라우저가 트랙 모드를 기본값으로 되돌리므로 다시 적용한다.
    applyLyrics();
    if (pendingSeek !== null) {
      video.currentTime = pendingSeek;
      pendingSeek = null;
    }
  });
  video.addEventListener('timeupdate', markChapter);
  video.addEventListener('seeked', markChapter);
  if (video.textTracks && typeof video.textTracks.addEventListener === 'function') {
    // 브라우저 자체 자막 메뉴로 끄고 켜도 토글 표시가 따라가게 한다.
    video.textTracks.addEventListener('change', function () {
      var first = video.textTracks[0];
      if (!first || state === 'idle') return;
      lyricsOn = first.mode === 'showing';
      if (lyricsToggle) lyricsToggle.setAttribute('aria-pressed', lyricsOn ? 'true' : 'false');
    });
  }

  if (lyricsToggle) {
    lyricsToggle.addEventListener('click', function () {
      lyricsOn = !lyricsOn;
      applyLyrics();
    });
  }

  chapters.forEach(function (button) {
    button.addEventListener('click', function () {
      var at = parseFloat(button.getAttribute('data-cdh-mv-seek')) || 0;
      track('home_mv_chapter', { chapter: button.getAttribute('data-cdh-mv-chapter') || '' });
      if (state === 'idle' || state === 'error' || video.readyState < 1) {
        pendingSeek = at;
        if (state !== 'loading') start('chapter');
        return;
      }
      video.currentTime = at;
      if (video.paused) {
        var promise = video.play();
        if (promise && typeof promise.catch === 'function') promise.catch(function () {});
      }
    });
  });

  // 영상 화면이 절반 이상 보였을 때 한 번만 노출을 센다. 개인정보는 싣지 않는다.
  if (typeof window.IntersectionObserver === 'function') {
    var impression = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
        impression.disconnect();
        track('home_card_impression', { card: 'moonlight_mv', placement: 'home_mid' });
      });
    }, { threshold: [0.5] });
    impression.observe(screen);
  }
})();
