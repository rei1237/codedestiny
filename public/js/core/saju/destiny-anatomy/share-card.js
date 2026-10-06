/* 운명 구조도 공유 카드 — Canvas 2D 로 1080×1920 PNG 를 직접 그린다(CDN·html2canvas 없음).
 * 🔴 이름·생년월일·출생시간·지역·원국 글자는 싣지 않는다. content() 가 고른 문장만 그린다.
 * 🔴 색은 카드 안 --cd-* 토큰을 프로브 요소로 풀어 쓴다(새 하드코딩 색 금지). 연이·네오 테마를 그대로 따른다. */
(function (root) {
  'use strict';

  var W = 1080, H = 1920, PAD = 96;
  var FOOTER = 'code-destiny.com/saju/destiny-anatomy';

  /* 카드에 실을 문장만 고른다 — 순수 함수(테스트가 개인정보 미포함을 확인한다). */
  function content(model) {
    var t = model && model.text;
    if (!t || !t.ui || !Array.isArray(t.engines)) return null;
    var engines = t.engines.slice().sort(function (a, b) { return b.score - a.score; })
      .map(function (e) { return {name: e.name, score: Math.max(0, Math.min(100, Math.round(e.score)))}; });
    var hd = t.hd && t.hd.typeName ? [t.hd.typeName, t.hd.authorityName].filter(Boolean).join(' · ') : null;
    return {
      brand: t.ui.brand,
      title: t.ui.title,
      mindLine: t.mindLine || '',
      combo: t.comboTitle || '',
      engines: engines,
      keywords: ((model.share && model.share.keywords) || []).slice(0, 4).map(function (k) { return '#' + k; }),
      hd: hd,
      // 대운은 흐름·회로 이름만 싣는다(간지·연도는 출생 정보를 짐작하게 하므로 뺀다).
      luck: t.luck ? t.ui.luckEyebrow + ' — ' + t.luck.shareLine : null,
      footer: FOOTER
    };
  }

  function palette(scope) {
    var doc = root.document;
    var host = scope || doc.body;
    var probe = doc.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    host.appendChild(probe);
    function tok(name, prop) {
      probe.style[prop || 'color'] = 'var(' + name + ')';
      var v = root.getComputedStyle(probe)[prop || 'color'];
      probe.style[prop || 'color'] = '';
      return v;
    }
    var p = {
      bg: tok('--cd-bg', 'backgroundColor'),
      surface: tok('--cd-surface-2', 'backgroundColor'),
      ink: tok('--cd-text'),
      muted: tok('--cd-text-muted'),
      accent: tok('--cd-accent'),
      gold: tok('--cd-gold'),
      line: tok('--cd-border')
    };
    host.removeChild(probe);
    var font = root.getComputedStyle(doc.body).fontFamily || 'sans-serif';
    p.font = font;
    return p;
  }

  /* 글자 단위로 재며 공백에서 우선 끊는다(CJK·라틴 공통). */
  function wrap(ctx, text, maxW, maxLines) {
    var lines = [], line = '', lastSpace = -1;
    for (var i = 0; i < text.length; i++) {
      var next = line + text[i];
      if (text[i] === ' ') lastSpace = next.length - 1;
      if (ctx.measureText(next).width > maxW && line) {
        if (lastSpace > 0) { lines.push(line.slice(0, lastSpace)); line = line.slice(lastSpace + 1) + text[i]; }
        else { lines.push(line); line = text[i] === ' ' ? '' : text[i]; }
        lastSpace = -1;
      } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…');
    }
    return lines;
  }

  function text(ctx, str, x, y, size, color, weight, align) {
    ctx.font = (weight || 400) + ' ' + size + 'px ' + ctx.__font;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(str, x, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(canvas, model, opts) {
    var c = content(model);
    if (!c) return false;
    var p = (opts && opts.palette) || palette(opts && opts.scope);
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.__font = p.font;
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);
    // 머리 위 빛 — 금색 토큰을 투명도로만 낮춘다.
    var glow = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 560);
    glow.addColorStop(0, p.gold);
    glow.addColorStop(1, p.bg);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 1100);
    ctx.globalAlpha = 1;

    var y = PAD + 40;
    text(ctx, c.brand, PAD, y, 34, p.gold, 700);
    y += 120;
    ctx.font = '800 76px ' + p.font;
    wrap(ctx, c.title, W - PAD * 2, 2).forEach(function (l) { text(ctx, l, PAD, y, 76, p.ink, 800); y += 96; });
    y += 24;
    ctx.font = '600 50px ' + p.font;
    wrap(ctx, '“' + c.mindLine + '”', W - PAD * 2, 4).forEach(function (l) { text(ctx, l, PAD, y, 50, p.accent, 600); y += 70; });

    // 5대 엔진 막대
    y += 50;
    var boxY = y, boxH = 120 + c.engines.length * 104;
    ctx.fillStyle = p.surface;
    roundRect(ctx, PAD - 24, boxY, W - (PAD - 24) * 2, boxH, 36);
    ctx.fill();
    y += 80;
    if (c.combo) { text(ctx, c.combo, PAD + 16, y, 40, p.ink, 700); y += 30; }
    c.engines.forEach(function (e, i) {
      y += 74;
      text(ctx, e.name, PAD + 16, y, 36, i < 2 ? p.ink : p.muted, i < 2 ? 700 : 500);
      var bx = PAD + 330, bw = W - PAD - 16 - bx;
      ctx.fillStyle = p.line;
      roundRect(ctx, bx, y - 26, bw, 22, 11);
      ctx.fill();
      ctx.fillStyle = i < 2 ? p.gold : p.accent;
      roundRect(ctx, bx, y - 26, Math.max(22, bw * e.score / 100), 22, 11);
      ctx.fill();
    });
    y = boxY + boxH + 90;

    if (c.luck) {
      ctx.font = '600 38px ' + p.font;
      wrap(ctx, c.luck, W - PAD * 2, 2).forEach(function (l) { text(ctx, l, PAD, y, 38, p.gold, 600); y += 56; });
      y += 24;
    }
    if (c.hd) { text(ctx, c.hd, PAD, y, 40, p.ink, 600); y += 80; }
    if (c.keywords.length) {
      ctx.font = '600 40px ' + p.font;
      wrap(ctx, c.keywords.join('  '), W - PAD * 2, 2).forEach(function (l) { text(ctx, l, PAD, y, 40, p.gold, 600); y += 60; });
    }

    ctx.fillStyle = p.line;
    ctx.fillRect(PAD, H - 200, W - PAD * 2, 2);
    text(ctx, c.footer, W / 2, H - 120, 34, p.muted, 500, 'center');
    return true;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('toBlob failed')); }, 'image/png');
    });
  }

  function download(blob, name) {
    var doc = root.document;
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = name;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 4000);
  }

  /* mode: 'share' 는 파일 공유가 되면 공유, 아니면 저장. 'save' 는 저장. 사용자가 닫으면 false. */
  function share(model, opts) {
    opts = opts || {};
    var doc = root.document;
    var canvas = doc.createElement('canvas');
    if (!draw(canvas, model, {scope: doc.getElementById('destinyAnatomyCard')})) return Promise.reject(new Error('no content'));
    var name = 'destiny-anatomy.png';
    return toBlob(canvas).then(function (blob) {
      var nav = root.navigator;
      if (opts.mode === 'share' && nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && typeof root.File === 'function') {
        var file = new root.File([blob], name, {type: 'image/png'});
        if (nav.canShare({files: [file]})) {
          return nav.share({files: [file], title: model.text.ui.title, text: (model.share && model.share.headline) || '', url: opts.url})
            .then(function () { return true; }, function (err) {
              if (err && err.name === 'AbortError') return false;
              download(blob, name);
              return true;
            });
        }
      }
      download(blob, name);
      return true;
    });
  }

  var api = {W: W, H: H, content: content, draw: draw, share: share};
  root.DestinyAnatomyShareCard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
