/* 운명 구조도 공유 카드 v2 — Canvas 2D 로 1080×1920 PNG 를 직접 그린다(CDN·html2canvas 없음).
 * 화면 표지와 같은 그림을 싣는다: 옆얼굴 뇌구조(칸 = 십성 비중)·칸 속마음·연이 메달·금선 달과 별·범례.
 * 🔴 이름·생년월일·출생시간·지역·원국 글자는 싣지 않는다. content() 가 고른 문장만 그린다.
 * 🔴 색은 카드의 --da-* 토큰과 화면에 그려진 뇌 요소의 계산된 색을 읽어 쓴다(새 하드코딩 색 금지).
 *    그래서 달빛 밤 창·꽃돼지 크림·네오 테마를 화면 그대로 따른다. */
(function (root) {
  'use strict';

  var W = 1080, H = 1920, PAD = 88;
  var FOOTER = 'code-destiny.com/saju/destiny-anatomy';
  var AXES = ['selfDrive', 'expression', 'reality', 'structure', 'reflection'];
  var MARK_SRC = '/images/yeoni/welcome/yeoni-mark-v1-192.webp';
  // 장식(데이터 아님) — 표지 뇌구조의 초승달·별과 같은 모양.
  var MOON = 'M44 22a20 20 0 1 0 22 30a16 16 0 1 1-22-30Z';
  var STAR = 'M0 -10L2.2 -2.2L10 0L2.2 2.2L0 10L-2.2 2.2L-10 0L-2.2 -2.2Z';
  var STARS = [[150, 330, 1.1], [930, 120, .8], [968, 700, 1], [112, 860, .8], [970, 1100, .9], [100, 1000, 1]];

  /* 카드에 실을 문장만 고른다 — 순수 함수(테스트가 개인정보 미포함을 확인한다). */
  function content(model) {
    var t = model && model.text;
    if (!t || !t.ui || !Array.isArray(t.engines)) return null;
    var engines = t.engines.slice().sort(function (a, b) { return b.score - a.score; })
      .map(function (e) { return {name: e.name, score: Math.max(0, Math.min(100, Math.round(e.score)))}; });
    var hd = t.hd && t.hd.typeName ? [t.hd.typeName, t.hd.authorityName].filter(Boolean).join(' · ') : null;
    var m = t.meme;
    // 뇌구조는 칸 배치(고정 그림 좌표)·축 이름·짤 문구·% 만 — 모두 정적 문구와 비율이다.
    var meme = m && Array.isArray(m.cells) && m.cells.length ? {
      viewBox: m.viewBox, head: m.head, ear: m.ear, eye: m.eye, cheek: m.cheek, box: m.box, inner: m.inner || m.box,
      luckMark: m.luckMark || '', comboLabel: m.comboLabel || '',
      cells: m.cells.map(function (c) {
        return {axis: c.axis, line: c.line, pct: c.pct, x: c.x, y: c.y, w: c.w, h: c.h, top: !!c.top, hot: !!c.hot, luck: c.luck || null};
      }),
      legend: (m.legend || []).map(function (c) { return {axis: c.axis, god: c.god, name: c.name, line: c.line, pct: c.pct}; })
    } : null;
    return {
      question: t.recovery.shareQuestion,
      brand: t.ui.brand,
      title: t.ui.title,
      mindLine: t.mindLine || '',
      combo: t.comboTitle || '',
      engines: engines,
      keywords: ((model.share && model.share.keywords) || []).slice(0, 4).map(function (k) { return '#' + k; }),
      hd: hd,
      // 대운은 흐름·회로 이름만 싣는다(간지·연도는 출생 정보를 짐작하게 하므로 뺀다).
      luck: t.luck ? t.ui.luckEyebrow + ' — ' + t.luck.shareLine : null,
      meme: meme,
      footer: FOOTER
    };
  }

  /* 카드 토큰 + 화면 뇌구조의 실제 칠을 읽는다. 뇌가 아직 없으면 토큰으로 대신한다. */
  function palette(scope) {
    var doc = root.document;
    var host = scope || doc.body;
    var cs = function (el) { return root.getComputedStyle(el); };
    var probe = doc.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    host.appendChild(probe);
    function tok(name) {
      probe.style.color = 'var(' + name + ')';
      var v = cs(probe).color;
      probe.style.color = '';
      return v;
    }
    var p = {bg: tok('--da-bg'), deep: tok('--da-bg-deep'), lift: tok('--da-bg-lift'), ink: tok('--da-ink'), muted: tok('--da-muted'),
      gold: tok('--da-gold'), art: tok('--da-art')};
    probe.style.fontFamily = 'var(--da-serif)';
    p.serif = cs(probe).fontFamily || 'serif';
    probe.style.fontFamily = '';
    p.font = cs(host).fontFamily || 'sans-serif';
    var paint = function (sel, prop, fb) {
      var el = host.querySelector(sel);
      var v = el && cs(el)[prop];
      return v && v !== 'none' && v.indexOf('url(') < 0 ? v : fb;
    };
    p.head = paint('.da-meme__head', 'fill', p.lift);
    p.brain = paint('.da-meme__brain', 'fill', p.deep);
    p.cheek = paint('.da-meme__cheek', 'fill', p.lift);
    p.art = paint('.da-meme__head', 'stroke', p.art);
    p.moon = paint('.da-meme__moon', 'fill', p.gold);
    p.star = paint('.da-meme__star', 'fill', p.gold);
    p.line = paint('.da-meme__line', 'color', p.ink);
    var lineEl = host.querySelector('.da-meme__line');
    p.display = lineEl ? cs(lineEl).fontFamily || p.font : p.font;
    p.displayWeight = lineEl ? cs(lineEl).fontWeight || '400' : '700';
    p.cell = {};
    AXES.forEach(function (a) {
      probe.className = 'da-ax-' + a;
      probe.style.color = 'var(--da-ax)';
      var fb = cs(probe).color;
      probe.style.color = '';
      probe.className = '';
      p.cell[a] = paint('rect.da-meme__fill.da-ax-' + a, 'fill', fb);
    });
    host.removeChild(probe);
    return p;
  }

  /* 띄어쓰기가 있으면 어절 단위로만 끊는다(어절이 칸보다 넓으면 null — 더 작은 글자로 다시 잰다).
     띄어쓰기 없는 문장(ja·zh)은 글자 단위로 끊는다. maxLines 를 넘으면 null(fit) 또는 말줄임(일반 문단). */
  function wrap(ctx, text, maxW, maxLines, strict) {
    var spaced = /\s/.test(text.trim());
    var units = spaced ? text.trim().split(/\s+/) : Array.from(text);
    var sep = spaced ? ' ' : '';
    var lines = [], line = '';
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (ctx.measureText(u).width > maxW) {
        if (strict) return null;
        // 일반 문단: 너무 긴 어절은 글자로 쪼갠다.
        Array.from(u).forEach(function (ch) {
          if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
        });
        continue;
      }
      var next = line ? line + sep + u : u;
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = u; } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      if (strict) return null;
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, '…');
    }
    return lines;
  }

  function setFont(ctx, weight, size, family) { ctx.font = weight + ' ' + size + 'px ' + family; }

  function text(ctx, str, x, y, size, color, weight, align, family) {
    setFont(ctx, weight || 400, size, family || ctx.__font);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(str, x, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function star(ctx, x, y, s, color, alpha) {
    if (typeof root.Path2D !== 'function') return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fill(new root.Path2D(STAR));
    ctx.restore();
  }

  /* 칸 하나의 글자 — 큰 글자부터 줄여 가며 문장+% 가 들어가는 크기를 찾는다. 안 들어가면 %만, 그것도 안 되면 비운다. */
  function drawCell(ctx, p, m, c, X, Y, Wc, Hc) {
    var stk = (c.top ? '✦' : '') + (c.hot ? '✧' : '') + (c.luck && m.luckMark ? m.luckMark : '');
    var pct = c.pct + '%';
    var fam = p.display, wt = p.displayWeight;
    var fit = null;
    [46, 40, 34, 29].some(function (size) {
      setFont(ctx, wt, size, fam);
      var lines = wrap(ctx, c.line, Wc - 30, 3, true);
      if (!lines) return false;
      var pctSize = Math.round(size * .9);
      var hgt = lines.length * size * 1.2 + pctSize * 1.3;
      if (hgt > Hc - 26) return false;
      fit = {size: size, lines: lines, pctSize: pctSize, hgt: hgt};
      return true;
    });
    ctx.save();
    ctx.shadowColor = p.brain;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = 'center';
    var cx = X + Wc / 2;
    var pctLine = function (size, y) {
      var label = (stk ? stk + ' ' : '') + pct;
      setFont(ctx, 800, size, ctx.__font);
      while (size > 16 && ctx.measureText(label).width + size * .8 > Wc - 8) { size--; setFont(ctx, 800, size, ctx.__font); }
      if (c.hot) {
        var tw = ctx.measureText(label).width + size * .8;
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = p.ink;
        roundRect(ctx, cx - tw / 2, y - size * .92, tw, size * 1.22, size * .61);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = p.bg;
      } else ctx.fillStyle = p.line;
      ctx.fillText(label, cx, y);
    };
    if (fit) {
      var y = Y + (Hc - fit.hgt) / 2 + fit.size;
      setFont(ctx, wt, fit.size, fam);
      ctx.fillStyle = p.line;
      fit.lines.forEach(function (l) { ctx.fillText(l, cx, y); y += fit.size * 1.2; });
      pctLine(fit.pctSize, y + fit.pctSize * .15);
    } else if (Wc >= 64 && Hc >= 44) {
      var s = Wc >= 120 && Hc >= 64 ? 38 : 28;
      setFont(ctx, 800, s, ctx.__font);
      if (ctx.measureText(pct).width > Wc - 16) s = 24;
      pctLine(s, Y + Hc / 2 + s * .36);
    }
    ctx.restore();
  }

  /* 옆얼굴 뇌구조 — 화면 SVG 와 같은 좌표(viewBox)를 s 배로 키워 그린다. 반환값은 그림 아래쪽 y. */
  function drawBrain(ctx, p, m, x0, y0, s) {
    var P = root.Path2D;
    var b = m.box, n = m.inner, g = 1.5;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = p.art;
    ctx.lineWidth = .7;
    ctx.globalAlpha = .42;
    ctx.stroke(new P('M20 282V154a160 142 0 0 1 320 0v128M26 278V155a154 135 0 0 1 308 0v123'));
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.moon;
    ctx.fill(new P(MOON));
    ctx.fillStyle = p.head;
    ctx.strokeStyle = p.art;
    ctx.lineWidth = 1.15;
    var head = new P(m.head);
    ctx.fill(head);
    ctx.stroke(head);
    ctx.stroke(new P(m.ear));
    ctx.stroke(new P(m.eye));
    ctx.fillStyle = p.cheek;
    ctx.beginPath();
    ctx.arc(m.cheek.cx, m.cheek.cy, m.cheek.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.brain;
    roundRect(ctx, b.x, b.y, b.w, b.h, b.r);
    ctx.fill();
    ctx.save();
    roundRect(ctx, n.x, n.y, n.w, n.h, n.r);
    ctx.clip();
    m.cells.forEach(function (c) {
      var w = Math.max(0, c.w - 2 * g), h = Math.max(0, c.h - 2 * g);
      var r = Math.min(10, w / 3, h / 3);
      ctx.fillStyle = p.cell[c.axis] || p.lift;
      roundRect(ctx, c.x + g, c.y + g, w, h, r);
      ctx.fill();
      // 유리 광택 — 칸 색에서 잉크 쪽으로 아주 옅게.
      var sheen = ctx.createLinearGradient(c.x, c.y, c.x + w, c.y + h);
      sheen.addColorStop(0, p.ink);
      sheen.addColorStop(.55, p.cell[c.axis] || p.lift);
      ctx.globalAlpha = .13;
      ctx.fillStyle = sheen;
      roundRect(ctx, c.x + g, c.y + g, w, h, r);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    ctx.strokeStyle = p.art;
    roundRect(ctx, b.x, b.y, b.w, b.h, b.r);
    ctx.stroke();
    ctx.restore();
    m.cells.forEach(function (c) {
      drawCell(ctx, p, m, c, x0 + (c.x + g) * s, y0 + (c.y + g) * s, (c.w - 2 * g) * s, (c.h - 2 * g) * s);
    });
  }

  /* 연이 메달 — 금 이중 고리 안의 연이 얼굴. 그림을 못 읽었으면 초승달로 대신한다. */
  function drawMedal(ctx, p, mark, cx, cy, r) {
    ctx.save();
    ctx.fillStyle = p.lift;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (mark) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(mark, cx - r + 6, cy - r + 6, (r - 6) * 2, (r - 6) * 2);
      ctx.restore();
    } else if (typeof root.Path2D === 'function') {
      ctx.save();
      ctx.translate(cx - r * .86, cy - r * .9);
      ctx.scale(r / 42, r / 42);
      ctx.fillStyle = p.moon;
      ctx.fill(new root.Path2D(MOON));
      ctx.restore();
    }
    ctx.strokeStyle = p.art;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = .6;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /* 범례 — 칸 색 견본·십성·이름·%. 뇌 칸이 작아 문장이 숨은 축도 여기서 읽힌다. */
  function drawLegend(ctx, p, rows, y) {
    var x = PAD, w = W - PAD * 2, rowH = 78, top = y;
    var h = rows.length * rowH + 28;
    ctx.save();
    ctx.globalAlpha = .55;
    ctx.fillStyle = p.lift;
    roundRect(ctx, x, top, w, h, 30);
    ctx.fill();
    ctx.globalAlpha = .7;
    ctx.strokeStyle = p.art;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    y = top + 14;
    rows.forEach(function (r, i) {
      var mid = y + 23;
      if (i) {
        ctx.save();
        ctx.globalAlpha = .28;
        ctx.fillStyle = p.art;
        ctx.fillRect(x + 28, y, w - 56, 1.5);
        ctx.restore();
      }
      ctx.fillStyle = (r.axis && p.cell[r.axis]) || p.gold;
      ctx.beginPath();
      ctx.arc(x + 50, mid, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = p.art;
      ctx.lineWidth = 2;
      ctx.stroke();
      var tx = x + 84;
      if (r.god) {
        text(ctx, r.god, tx, mid + 11, 30, p.gold, 700);
        tx += ctx.measureText(r.god).width + 16;
      }
      setFont(ctx, 600, 32, ctx.__font);
      var name = r.name;
      var room = x + w - 150 - tx;
      while (name.length > 1 && ctx.measureText(name).width > room) name = name.slice(0, -2) + '…';
      text(ctx, name, tx, mid + 11, 32, p.ink, 600);
      text(ctx, r.pct + '%', x + w - 32, mid + 12, 34, p.ink, 800, 'right');
      if (r.line) {
        var lineSize = 25;
        setFont(ctx, 500, lineSize, ctx.__font);
        while (lineSize > 18 && ctx.measureText(r.line).width > w - 120) { lineSize--; setFont(ctx, 500, lineSize, ctx.__font); }
        text(ctx, r.line, x + 84, y + 65, lineSize, p.muted, 500);
      }
      y += rowH;
    });
    return top + h;
  }

  function draw(canvas, model, opts) {
    var c = content(model);
    if (!c) return false;
    opts = opts || {};
    var p = opts.palette || palette(opts.scope);
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.__font = p.font;
    ctx.textBaseline = 'alphabetic';

    // 바탕 — 표지와 같은 밤 창(테마 토큰 그대로) + 오른쪽 위 달무리.
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, p.lift);
    bg.addColorStop(.42, p.bg);
    bg.addColorStop(1, p.deep);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(W - 200, 230, 30, W - 200, 230, 420);
    glow.addColorStop(0, p.gold);
    glow.addColorStop(1, p.bg);
    ctx.globalAlpha = .16;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 760);
    ctx.globalAlpha = 1;
    STARS.forEach(function (s) { star(ctx, s[0], s[1], s[2], p.star, .75); });
    // 예화 액자 — 금 이중 테.
    ctx.save();
    ctx.strokeStyle = p.art;
    ctx.globalAlpha = .75;
    ctx.lineWidth = 3;
    roundRect(ctx, 36, 36, W - 72, H - 72, 52);
    ctx.stroke();
    ctx.globalAlpha = .4;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 52, 52, W - 104, H - 104, 40);
    ctx.stroke();
    ctx.restore();

    // 머리글 — 연이 메달 + 브랜드 + 제목(세리프).
    var medalR = 66, mx = PAD + medalR, my = 104 + medalR;
    drawMedal(ctx, p, opts.mark || null, mx, my, medalR);
    var tx = mx + medalR + 40, tw = W - PAD - tx;
    text(ctx, c.brand, tx, 150, 32, p.gold, 700);
    setFont(ctx, 700, 62, p.serif);
    var y = 226;
    wrap(ctx, c.title, tw, 2).forEach(function (l) { text(ctx, l, tx, y, 62, p.ink, 700, 'left', p.serif); y += 74; });
    y = Math.max(y, my + medalR + 30);

    // 뇌구조 — 화면 표지와 같은 그림.
    if (c.meme && typeof root.Path2D === 'function') {
      var vb = String(c.meme.viewBox).split(' ').map(Number);
      var s = Math.min((W - 2 * 64) / vb[2], 500 / vb[3]);
      var x0 = (W - vb[2] * s) / 2;
      drawBrain(ctx, p, c.meme, x0, y, s);
      y += vb[3] * s + 30;
    }

    // 조합 별명 + 속마음 한 줄.
    if (c.combo) {
      if (c.meme && c.meme.comboLabel) { text(ctx, c.meme.comboLabel, W / 2, y + 30, 28, p.gold, 700, 'center'); y += 44; }
      setFont(ctx, 700, 54, p.serif);
      wrap(ctx, c.combo, W - PAD * 2, 2).forEach(function (l) { text(ctx, l, W / 2, y + 52, 54, p.ink, 700, 'center', p.serif); y += 66; });
      y += 12;
    }
    if (c.mindLine) {
      setFont(ctx, 600, 36, p.font);
      wrap(ctx, '“' + c.mindLine + '”', W - PAD * 2 - 40, 2).forEach(function (l) { text(ctx, l, W / 2, y + 40, 36, p.ink, 600, 'center'); y += 48; });
      y += 24;
    }

    // 범례(뇌 칸 순위) — 뇌가 없으면 엔진 점수로 대신한다.
    var limit = H - 390;
    var rows = c.meme && c.meme.legend.length ? c.meme.legend : c.engines.map(function (e) { return {name: e.name, pct: e.score}; });
    y = drawLegend(ctx, p, rows, y) + 24;

    y = Math.max(y, H - 375);
    limit = H - 265;
    if (c.luck && y + 50 <= limit) {
      setFont(ctx, 600, 34, p.font);
      wrap(ctx, c.luck, W - PAD * 2, 2).forEach(function (l) { if (y + 40 <= limit) { text(ctx, l, W / 2, y + 34, 34, p.gold, 600, 'center'); y += 50; } });
      y += 10;
    }
    setFont(ctx, 600, 32, p.font);
    wrap(ctx, c.question, W - PAD * 2, 2).forEach(function (line, i) { text(ctx, line, W / 2, H - 235 + i * 40, 32, p.ink, 600, 'center'); });

    // 바닥글.
    ctx.save();
    ctx.globalAlpha = .6;
    ctx.fillStyle = p.art;
    ctx.fillRect(PAD + 60, H - 178, W - PAD * 2 - 120, 2);
    ctx.restore();
    star(ctx, PAD + 34, H - 177, .9, p.star, .9);
    star(ctx, W - PAD - 34, H - 177, .9, p.star, .9);
    text(ctx, c.footer, W / 2, H - 112, 32, p.muted, 500, 'center');
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

  /* 연이 메달 그림 — 화면 편지 도장이 쓰는 같은 그림. 같은 출처만 쓴다(교차 출처는 캔버스를 오염시킨다). */
  function loadMark(scope) {
    return new Promise(function (resolve) {
      if (typeof root.Image !== 'function') { resolve(null); return; }
      var seal = scope && scope.querySelector('.da-letter__seal img');
      var src = (seal && (seal.currentSrc || seal.src)) || MARK_SRC;
      try { if (new root.URL(src, root.location.href).origin !== root.location.origin) { resolve(null); return; } } catch (e) { resolve(null); return; }
      var img = new root.Image(), done = false;
      var fin = function (v) { if (!done) { done = true; resolve(v); } };
      img.onload = function () { fin(img.naturalWidth ? img : null); };
      img.onerror = function () { fin(null); };
      root.setTimeout(function () { fin(null); }, 1200);
      img.src = src;
    });
  }

  /* mode: 'share' 는 파일 공유가 되면 공유, 아니면 저장. 'save' 는 저장. 사용자가 닫으면 false. */
  function share(model, opts) {
    opts = opts || {};
    var doc = root.document;
    var scope = doc.getElementById('destinyAnatomyCard');
    var canvas = doc.createElement('canvas');
    var fonts = doc.fonts && doc.fonts.ready ? doc.fonts.ready.then(null, function () {}) : Promise.resolve();
    var name = 'destiny-anatomy.png';
    return Promise.all([fonts, loadMark(scope)]).then(function (r) {
      var pal = palette(scope);
      if (!draw(canvas, model, {palette: pal, mark: r[1]})) throw new Error('no content');
      return toBlob(canvas).then(null, function () {
        // 메달 그림이 캔버스를 오염시켰으면 메달 없이 다시 그린다.
        draw(canvas, model, {palette: pal, mark: null});
        return toBlob(canvas);
      });
    }).then(function (blob) {
      var nav = root.navigator;
      if (opts.mode === 'share' && nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && typeof root.File === 'function') {
        var file = new root.File([blob], name, {type: 'image/png'});
        if (nav.canShare({files: [file]})) {
          return nav.share({files: [file], title: model.text.ui.title, text: (model.share && model.share.headline) || '', url: opts.url})
            .then(function () { return {status: 'shared'}; }, function (err) {
              if (err && err.name === 'AbortError') return {status: 'cancelled'};
              download(blob, name);
              return {status: 'saved'};
            });
        }
      }
      download(blob, name);
      return {status: 'saved'};
    });
  }

  var api = {W: W, H: H, content: content, draw: draw, share: share, loadMark: loadMark, palette: palette};
  root.DestinyAnatomyShareCard = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
