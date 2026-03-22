/* 리포트 대시보드 UI — 원본 saju-engine-continuation.js 에서 분리 (로직 동일)
 * 로드 순서: js/saju-engine.js → js/saju-engine-tarot-sukuyo-quantum.js → (본 파일) → js/saju-engine-continuation.js */

/* ══════════════════════════════════════════════
   리포트 대시보드 — 10개 분석 기능 카드 UI
   ══════════════════════════════════════════════ */
var REPORT_CARDS = [
  { id:'meryok',     label:'나의 매력 클래스',      desc:'신살 스탯 · 도화 · 역마 지수를 확인해보세요.',          note:'요즘 왜 유독 시선이 꽂히는지, 내 매력 포인트를 한 번에 읽어드립니다.', cta:'✨ 매력 분석 자세히 보기',     accent:'#f472b6', glow:'rgba(244,114,182,.55)', target:'specialCharmCard'    },
  { id:'quntum',     label:'퀀텀 명리 천기',        desc:'합화 우선 분석으로 나만의 천기 지도를 제공합니다.',      note:'지금 밀어붙일 타이밍인지, 숨을 고를 타이밍인지 천기적으로 짚어드립니다.', cta:'⚡ 천기 리포트 보기',          accent:'#38bdf8', glow:'rgba(56,189,248,.55)',  target:'quantumCard'         },
  { id:'sajuhealth', label:'명리 헬스 리포트',      desc:'오행 균형과 건강 약점 신호를 점검해보세요.',             note:'놓치기 쉬운 몸의 신호를 사주 관점으로 풀어, 수호 우선순위를 정리해드립니다.', cta:'💚 건강 리포트 확인하기',      accent:'#4ade80', glow:'rgba(74,222,128,.55)',  target:'healthReportCard'    },
  { id:'sajuprompt', label:'사주 프롬프트',         desc:'AI 아바타/초상화 제작용 프롬프트를 받아보세요.',         note:'내 사주 분위기를 AI 이미지로 구현할 문장까지 바로 가져갈 수 있습니다.', cta:'🤖 사주 프롬프트 보기',        accent:'#c084fc', glow:'rgba(192,132,252,.55)', target:'aiPromptCard'    },
  { id:'sajurpg',    label:'인생 스킬 트리',        desc:'운명 RPG 스타일로 내 능력치 레벨을 확인합니다.',         note:'내 강점 스탯과 취약 스탯을 RPG처럼 시각화해 성장 루트를 제시합니다.', cta:'🎮 스킬 트리 펼쳐보기',        accent:'#fbbf24', glow:'rgba(251,191,36,.55)',  target:'skillTreeCard'       },
  { id:'tbal',       label:'극T 테스트',            desc:'The Frozen Logic, 내 논리 온도를 분석합니다.',          note:'감정보다 이성이 먼저 반응하는 순간, 당신의 판단 패턴을 콕 집어드립니다.', cta:'🧊 극T 테스트 결과 보기',      accent:'#67e8f9', glow:'rgba(103,232,249,.55)', target:'tTestCard'           },
  { id:'tetoegen',   label:'테토 vs 에겐',          desc:'사주 기반으로 나의 매력 에너지 결을 분석합니다.',       note:'강하게 끌어당기는 타입인지, 부드럽게 스며드는 타입인지 매력 결을 보여드립니다.', cta:'❤️ 테토/에겐 분석 보기',      accent:'#fb923c', glow:'rgba(251,146,60,.55)',  target:'hormone-vibe-section'},
  { id:'trip',       label:'에너지 원정 리포트',     desc:'나의 에너지 방향과 이상적 여정지를 안내합니다.',         note:'지금 나와 맞는 방향을 찾고 싶다면, 장소/활동 추천까지 한 번에 확인하세요.', cta:'🗺️ 에너지 좌표 확인하기',      accent:'#2dd4bf', glow:'rgba(45,212,191,.55)',  target:'energyCoordCard'     },
  { id:'vilun',      label:'빌런 블랙리스트',        desc:'내 인생을 흔드는 위험 유형을 분석합니다.',               note:'유난히 소모되는 관계의 패턴을 파악하고, 피해야 할 시그널을 정리해드립니다.', cta:'⚠️ 빌런 리포트 열기',          accent:'#f87171', glow:'rgba(248,113,113,.55)', target:'villainCard'         },
  { id:'lotto',      label:'퀀텀 로또 리포트',       desc:'수리 에너지 공명 기반 추천 번호를 제공합니다.',          note:'오늘 운의 파동과 맞는 번호 흐름을 기반으로 흥미로운 조합을 제안합니다.', cta:'🎱 로또 리포트 보기',          accent:'#fde047', glow:'rgba(253,224,71,.55)',  target:'lottoCard'           }
];

function handleReportThumbError(imgEl) {
  if (!imgEl) return;
  if (imgEl.dataset && imgEl.dataset.assetFallbackTried !== '1') {
    var src = imgEl.getAttribute('src') || '';
    if (src.indexOf('/fuctionassets/') === 0) {
      imgEl.dataset.assetFallbackTried = '1';
      imgEl.src = src.replace('/fuctionassets/', 'fuctionassets/');
      return;
    }
    if (src.indexOf('fuctionassets/') === 0) {
      imgEl.dataset.assetFallbackTried = '1';
      imgEl.src = '/' + src;
      return;
    }
  }
  var wrap = imgEl.closest ? imgEl.closest('.rpt-v2-img-wrap') : imgEl.parentNode;
  if (wrap) wrap.style.display = 'none';

  var row = wrap && wrap.parentNode;
  if (!row || !row.classList || !row.classList.contains('rpt-v2-img-row')) return;

  var visibleCount = 0;
  for (var i = 0; i < row.children.length; i++) {
    if (row.children[i].style.display !== 'none') visibleCount += 1;
  }
  if (visibleCount === 0) row.style.display = 'none';
}

window.handleReportThumbError = handleReportThumbError;

function renderReportDashboard() {
  var container = document.getElementById('reportDashboard');
  var dashCard  = document.getElementById('reportDashboardCard');
  if (!container || !dashCard) return;
  dashCard.style.display = '';

  /* ── 타겟 기준 중복 제거 블록 목록 생성 ── */
  var seenTargets = {};
  var blocks = [];
  REPORT_CARDS.forEach(function(c) {
    if (!seenTargets[c.target]) {
      seenTargets[c.target] = {
        images: [],
        target: c.target,
        title: c.label,
        preview: c.desc,
        note: c.note,
        cta: c.cta,
        accent: c.accent,
        glow: c.glow
      };
      blocks.push(seenTargets[c.target]);
    }
    seenTargets[c.target].images.push({ id: c.id, label: c.label, accent: c.accent });
  });

  /* ── 그리드 HTML 생성 ── */
  var gridHtml = '<div class="rpt-v2-grid">';
  blocks.forEach(function(b) {
    var sectionId = 'rpt-v2-section-' + b.target;
    var titleId = 'rpt-v2-title-' + b.target;
    gridHtml += '<section class="rpt-v2-block fortune-section" id="' + sectionId + '" aria-labelledby="' + titleId + '" style="border-color:' + b.accent + '44;">';

    /* 이미지 영역 — 이미지 짤림 없이 전체 표시 */
    gridHtml += '<div class="rpt-v2-img-row">';
    b.images.forEach(function(img) {
      var thumbSrc = '/fuctionassets/' + img.id + '.webp';
      gridHtml += '<div class="rpt-v2-img-wrap">';
      gridHtml += '<img class="rpt-v2-img" src="' + thumbSrc + '" alt="' + img.label + '" loading="lazy" '
        + 'decoding="async" onerror="handleReportThumbError(this)">';
      gridHtml += '</div>';
    });
    gridHtml += '</div>';

    /* 카드 헤더 + CTA */
    gridHtml += '<div class="rpt-v2-head">';
    gridHtml += '<h3 id="' + titleId + '" class="sec-title rpt-v2-title">' + b.title + '</h3>';
    gridHtml += '<p class="rpt-v2-preview">' + b.preview + '</p>';
    gridHtml += '<p class="rpt-v2-note">' + (b.note || '지금 내 흐름과 맞는 인사이트를 펼쳐 확인해보세요.') + '</p>';
    gridHtml += '<button class="rpt-v2-toggle-btn" type="button" onclick="toggleReportFeatureCard(this)" aria-expanded="false" data-label="' + b.cta + '">';
    gridHtml += '<span class="rpt-v2-toggle-label">' + b.cta + '</span>';
    gridHtml += '<span class="rpt-v2-toggle-arrow" aria-hidden="true">▼</span>';
    gridHtml += '</button>';
    gridHtml += '</div>';

    /* 토글 상세 영역 */
    gridHtml += '<div class="rpt-v2-detail" aria-hidden="true"><div class="rpt-v2-detail-inner">';

    /* 기능 콘텐츠 슬롯 */
    gridHtml += '<div class="rpt-v2-body" id="rpt-v2-body-' + b.target + '"></div>';
    gridHtml += '</div></div>';
    gridHtml += '</section>';
  });
  gridHtml += '</div>';
  container.innerHTML = gridHtml;

  /* ── 기존 섹션을 슬롯 안으로 이동 ── */
  blocks.forEach(function(b) {
    var slot = document.getElementById('rpt-v2-body-' + b.target);
    var targetEl = document.getElementById(b.target);
    if (slot && targetEl) {
      /* 내부 콘텐츠 div가 비어 있으면 대시보드 블록 자체를 숨김 */
      var innerSection = targetEl.querySelector('div[id]');
      if (innerSection && innerSection.innerHTML.trim().length < 30) {
        var dashBlock = document.getElementById('rpt-v2-section-' + b.target);
        if (dashBlock) dashBlock.style.display = 'none';
        return;
      }
      /* 숨겨진 섹션도 대시보드 안에서 표시 */
      if (targetEl.style.display === 'none') {
        targetEl.style.display = '';
      }
      slot.appendChild(targetEl);
    }
  });
}

function syncReportBlockHeight(block) {
  if (!block || !block.classList || !block.classList.contains('open')) return;
  var detail = block.querySelector('.rpt-v2-detail');
  var inner = block.querySelector('.rpt-v2-detail-inner');
  if (!detail || !inner) return;
  detail.style.setProperty('--rpt-open-height', (inner.scrollHeight + 6) + 'px');
}

var _rptHeightWatchers = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

function _bindReportHeightWatcher(block) {
  if (!_rptHeightWatchers || !block) return;
  if (_rptHeightWatchers.has(block)) return;

  var inner = block.querySelector('.rpt-v2-detail-inner');
  if (!inner) return;

  var rafId = 0;
  var schedule = function() {
    if (!block.classList || !block.classList.contains('open')) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
      syncReportBlockHeight(block);
    });
  };

  var ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule);
    ro.observe(inner);
  }

  var mo = null;
  if (typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(schedule);
    mo.observe(inner, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }

  _rptHeightWatchers.set(block, { ro: ro, mo: mo });
}

function _unbindReportHeightWatcher(block) {
  if (!_rptHeightWatchers || !block) return;
  var watcher = _rptHeightWatchers.get(block);
  if (!watcher) return;
  if (watcher.ro) watcher.ro.disconnect();
  if (watcher.mo) watcher.mo.disconnect();
  _rptHeightWatchers.delete(block);
}

function syncReportHeightFromNode(node) {
  if (!node || !node.closest) return;
  var block = node.closest('.rpt-v2-block');
  syncReportBlockHeight(block);
}

function toggleReportFeatureCard(btn) {
  var block = btn.closest('.rpt-v2-block');
  if (!block) return;
  var open = block.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  var detail = block.querySelector('.rpt-v2-detail');
  if (detail) {
    detail.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      _bindReportHeightWatcher(block);
      syncReportBlockHeight(block);
    } else {
      _unbindReportHeightWatcher(block);
      detail.style.setProperty('--rpt-open-height', '0px');
    }
  }
  var label = btn.querySelector('.rpt-v2-toggle-label');
  var arrow = btn.querySelector('.rpt-v2-toggle-arrow');
  if (label) label.textContent = open ? '닫기' : (btn.dataset.label || '자세히 보기');
  if (arrow) arrow.textContent = open ? '▲' : '▼';

  if (open) {
    requestAnimationFrame(function(){ syncReportBlockHeight(block); });
    setTimeout(function(){ syncReportBlockHeight(block); }, 220);
  }
}

(function(){
  var resizeTicking = false;
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function() {
      resizeTicking = false;
      document.querySelectorAll('.rpt-v2-block.open').forEach(function(block) {
        syncReportBlockHeight(block);
      });
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
})();
