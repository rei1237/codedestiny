/**
 * Saju Totem UI Utilities
 * 캔버스 렌더/저장/공유를 담당합니다.
 */
(function () {
  'use strict';

  function downloadImage(url, filename) {
    fetch(url)
      .then(function (r) {
        return r.blob();
      })
      .then(function (blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename || 'my-totem.png';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(function () {
        window.open(url, '_blank', 'noopener,noreferrer');
      });
  }

  function shareNative(totemData) {
    var a = totemData.primary;
    if (navigator.share) {
      navigator
        .share({
          title: '사주 동물 아트: ' + a.name,
          text: a.traits + '한 ' + a.name + '! 사주 동물 아트를 Code Destiny에서 확인해보세요.',
          url: 'https://code-destiny.com'
        })
        .catch(function () {});
      return;
    }

    var el = document.createElement('input');
    el.value = 'https://code-destiny.com';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('링크가 복사되었습니다! code-destiny.com');
  }

  function shareKakao(totemData, imgUrl) {
    var Kakao = window.Kakao;
    var a = totemData.primary;
    if (!Kakao || !Kakao.isInitialized || !Kakao.isInitialized()) {
      shareNative(totemData);
      return;
    }
    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '사주 동물 아트: ' + a.name,
        description: a.traits + ' ' + a.name + ' 타입의 사주 동물 아트를 확인해보세요!',
        imageUrl: imgUrl,
        link: { mobileWebUrl: 'https://code-destiny.com', webUrl: 'https://code-destiny.com' }
      },
      buttons: [
        {
          title: '나도 사주 동물 아트 보기',
          link: { mobileWebUrl: 'https://code-destiny.com', webUrl: 'https://code-destiny.com' }
        }
      ]
    });
  }

  function drawCanvasBackdrop(ctx, size, element) {
    var palettes = {
      wood: ['#d9f99d', '#86efac', '#bbf7d0'],
      fire: ['#fed7aa', '#fca5a5', '#fdba74'],
      earth: ['#fde68a', '#fcd34d', '#fef3c7'],
      metal: ['#e2e8f0', '#cbd5e1', '#bfdbfe'],
      water: ['#bfdbfe', '#93c5fd', '#c4b5fd']
    };
    var p = palettes[element] || palettes.wood;
    var bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, p[0]);
    bg.addColorStop(0.55, p[1]);
    bg.addColorStop(1, p[2]);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    var glow = ctx.createRadialGradient(size * 0.5, size * 0.36, size * 0.06, size * 0.5, size * 0.36, size * 0.42);
    glow.addColorStop(0, 'rgba(255,255,255,0.85)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    var i;
    for (i = 0; i < 24; i += 1) {
      var x = Math.random() * size;
      var y = Math.random() * size * 0.75;
      var r = Math.random() * (size * 0.009) + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function isFlatRenderedCanvas(ctx, size) {
    try {
      var data = ctx.getImageData(0, 0, size, size).data;
      var minL = 255;
      var maxL = 0;
      var alphaPixels = 0;
      var step = Math.max(16, Math.floor((size * size) / 1800)) * 4;
      var i;
      for (i = 0; i < data.length; i += step) {
        var a = data[i + 3];
        if (a > 20) {
          alphaPixels += 1;
          var lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
          if (lum < minL) minL = lum;
          if (lum > maxL) maxL = lum;
        }
      }
      if (alphaPixels < 40) return true;
      return maxL - minL < 16;
    } catch (e) {
      return false;
    }
  }

  function drawGuardianOnCanvas(imageUrl, element, onFail) {
    var canvas = document.getElementById('sajuTotemCanvas');
    if (!canvas) return;
    if (!imageUrl) {
      if (typeof onFail === 'function') onFail();
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var cssSize = Math.max(320, canvas.clientWidth || 560);
    var dpr = Math.max(1.25, Math.min(2, window.devicePixelRatio || 1.5));
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cssSize, cssSize);
    drawCanvasBackdrop(ctx, cssSize, element || 'wood');

    var img = new Image();
    if (/^https?:\/\//.test(imageUrl)) img.crossOrigin = 'anonymous';
    img.onload = function () {
      var iw = img.naturalWidth || cssSize;
      var ih = img.naturalHeight || cssSize;
      var scale = Math.max(cssSize / iw, cssSize / ih);
      var dw = iw * scale;
      var dh = ih * scale;
      var dx = (cssSize - dw) / 2;
      var dy = (cssSize - dh) / 2;

      ctx.clearRect(0, 0, cssSize, cssSize);
      drawCanvasBackdrop(ctx, cssSize, element || 'wood');
      ctx.drawImage(img, dx, dy, dw, dh);
      if (isFlatRenderedCanvas(ctx, cssSize) && typeof onFail === 'function') {
        onFail();
      }
    };
    img.onerror = function () {
      if (typeof onFail === 'function') onFail();
    };
    img.src = imageUrl;
  }

  window.SajuTotemUI = {
    downloadImage: downloadImage,
    shareKakao: shareKakao,
    drawGuardianOnCanvas: drawGuardianOnCanvas
  };
})();