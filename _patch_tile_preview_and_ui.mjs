// _patch_tile_preview_and_ui.mjs
// 1. "사주 · 점성술 통합" → "사주로 피어나는 나의 꽃" 변경
// 2. tarot-tile__coin-badge CSS 개선 (깨진 UI 수정)
// 3. 기능별 클릭 시 특징/장점 프리뷰 패널 추가
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const TARGET_FILES = [
  'public/index.html',
  'public/static/index.html',
  'index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/zh-cn/index.html',
];

// ─────────────────────────────────────────────────────
// PATCH 1: Coin Badge CSS 개선
// ─────────────────────────────────────────────────────
const OLD_COIN_CSS = `.tarot-tile__coin-badge{position:absolute;top:10px;left:10px;z-index:3;display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:.72rem;font-weight:800;line-height:1;background:rgba(15,23,42,.88);color:#f8fafc;border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:none}
.tarot-tile__coin-badge--free{background:rgba(6,95,70,.9);border-color:rgba(110,231,183,.52);color:#ecfdf5}`;

const NEW_COIN_CSS = `.tarot-tile__coin-badge{position:absolute;top:8px;left:8px;z-index:3;display:inline-flex;align-items:center;gap:3px;padding:4px 10px 4px 9px;border-radius:999px;font-size:.68rem;font-weight:800;line-height:1;letter-spacing:.02em;white-space:nowrap;background:linear-gradient(135deg,rgba(12,5,28,.94),rgba(22,10,44,.92));color:#ecdeff;border:1px solid rgba(190,140,255,.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 2px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.07);pointer-events:none}
.tarot-tile__coin-badge--free{background:linear-gradient(135deg,rgba(4,44,26,.94),rgba(8,62,36,.92));border-color:rgba(100,220,168,.38);color:#a7f3d0}`;

// ─────────────────────────────────────────────────────
// PATCH 2: 운명의 꽃 카드 텍스트 변경
// ─────────────────────────────────────────────────────
const OLD_FLOWER_DESC = `<span class="tarot-tile__desc">사주 · 점성술 통합</span>`;
const NEW_FLOWER_DESC = `<span class="tarot-tile__desc">사주로 피어나는 나의 꽃</span>`;

// ─────────────────────────────────────────────────────
// PATCH 3: 코인 뱃지 텍스트 정리 (🔓 해금 → 🪙)
// ─────────────────────────────────────────────────────
const BADGE_TEXT_REPLACEMENTS = [
  ['🔓 해금 50코인', '🪙 50코인'],
  ['🔓 해금 400코인', '🪙 400코인'],
];

// ─────────────────────────────────────────────────────
// PATCH 4: Feature Preview CSS (추가)
// ─────────────────────────────────────────────────────
const PREVIEW_CSS_BLOCK = `<style id="tile-preview-styles">
/* === Feature Preview Panel === */
.tile-pvw-overlay{position:fixed;inset:0;z-index:99990;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;opacity:0;transition:opacity .28s ease}
.tile-pvw-overlay.pvw-open{pointer-events:all;opacity:1}
.tile-pvw-bd{position:absolute;inset:0;background:rgba(5,2,16,.75);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.tile-pvw-sheet{position:relative;width:min(500px,100%);background:linear-gradient(175deg,#130a2a 0%,#1d0b38 55%,#0e0420 100%);border:1px solid rgba(180,120,255,.2);border-bottom:none;border-radius:26px 26px 0 0;padding:16px 22px 42px;box-shadow:0 -12px 54px rgba(0,0,0,.6),0 0 0 1px rgba(200,150,255,.05);transform:translateY(110%);transition:transform .38s cubic-bezier(.34,1.32,.64,1)}
.tile-pvw-overlay.pvw-open .tile-pvw-sheet{transform:translateY(0)}
.tile-pvw-handle{width:44px;height:4px;border-radius:99px;background:rgba(255,255,255,.2);margin:0 auto 16px}
.tile-pvw-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:rgba(255,255,255,.65);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;transition:background .18s}
.tile-pvw-close:hover{background:rgba(255,255,255,.14)}
.tile-pvw-meta{display:flex;align-items:center;gap:7px;margin-bottom:11px;flex-wrap:wrap}
.tile-pvw-cat{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:.66rem;font-weight:800;letter-spacing:.04em;background:rgba(160,100,255,.18);border:1px solid rgba(180,120,255,.28);color:#d8b4fe}
.tile-pvw-cost{display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:999px;font-size:.66rem;font-weight:800;letter-spacing:.03em;background:rgba(255,210,60,.1);border:1px solid rgba(255,215,80,.28);color:#fde68a}
.tile-pvw-cost--free{background:rgba(28,155,96,.14);border-color:rgba(100,220,158,.28);color:#6ee7b7}
.tile-pvw-title{font-size:1.28rem;font-weight:900;color:#f0e8ff;margin:0 0 6px;line-height:1.25;padding-right:40px}
.tile-pvw-tagline{font-size:.87rem;color:rgba(200,168,255,.72);margin:0 0 18px;line-height:1.5}
.tile-pvw-feats{list-style:none;padding:0;margin:0 0 22px;display:flex;flex-direction:column;gap:7px}
.tile-pvw-feats li{display:flex;align-items:center;gap:9px;font-size:.82rem;color:#ddd0f8;background:rgba(130,70,255,.07);border:1px solid rgba(150,90,255,.11);border-radius:10px;padding:8px 13px;line-height:1.35}
.tile-pvw-feats li::before{content:'✦';color:#9d6cf5;font-size:.7rem;flex-shrink:0}
.tile-pvw-cta-btn{width:100%;padding:15px 20px;border-radius:14px;border:none;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:.97rem;font-weight:900;cursor:pointer;letter-spacing:.01em;box-shadow:0 6px 24px rgba(124,58,237,.45),inset 0 1px 0 rgba(255,255,255,.16);transition:transform .18s,filter .18s,box-shadow .18s}
.tile-pvw-cta-btn:hover{transform:translateY(-2px) scale(1.02);filter:brightness(1.1);box-shadow:0 10px 32px rgba(168,85,247,.55)}
.tile-pvw-cta-btn:active{transform:scale(.97)}
</style>
</head>`;

// ─────────────────────────────────────────────────────
// PATCH 5: Feature Preview HTML + JS (추가)
// ─────────────────────────────────────────────────────
const PREVIEW_SCRIPT = `<!-- Feature Preview Panel -->
<div id="tilePvwOverlay" class="tile-pvw-overlay" role="dialog" aria-modal="true" aria-labelledby="tilePvwTitle">
  <div class="tile-pvw-bd" id="tilePvwBd"></div>
  <div class="tile-pvw-sheet" id="tilePvwSheet">
    <div class="tile-pvw-handle" aria-hidden="true"></div>
    <button class="tile-pvw-close" id="tilePvwClose" aria-label="닫기">✕</button>
    <div class="tile-pvw-meta">
      <span class="tile-pvw-cat" id="tilePvwCat"></span>
      <span class="tile-pvw-cost" id="tilePvwCost"></span>
    </div>
    <h2 class="tile-pvw-title" id="tilePvwTitle"></h2>
    <p class="tile-pvw-tagline" id="tilePvwTagline"></p>
    <ul class="tile-pvw-feats" id="tilePvwFeats"></ul>
    <button class="tile-pvw-cta-btn" id="tilePvwCtaBtn">지금 시작하기 →</button>
  </div>
</div>
<script>
/* === Tile Feature Preview v1.0 === */
(function(){
  'use strict';
  var D={
    openDestinyFlowerStudio:{cat:'사주 · 운명의 꽃',title:'🌸 사주로 보는 꽃',tagline:'태어난 날의 팔자(八字)를 세상에 단 하나뿐인 꽃으로 피워냅니다',feats:['사주 명리학 8글자 완전 분석','나만의 운명 꽃 아트 비주얼 생성','사주·점성술·자미두수 통합 시각화','감성적 개인 운명 리포트 제공'],cost:'🪙 50코인',ct:'paid'},
    openAstrologyFlowerStudio:{cat:'점성술 · 꽃 아틀리에',title:'✨ 점성술 꽃',tagline:'태양·달·상승궁 에너지를 성운 꽃으로 피워냅니다',feats:['태양·달·상승궁 삼각 에너지 분석','서양 점성술 기반 꽃 아트 생성','12행성 배치 패턴 해석','감성 성운 비주얼 리포트'],cost:'🪙 50코인',ct:'paid'},
    openJamidusuFlowerStudio:{cat:'자미두수 · 동양 점성',title:'🌺 자미두수 꽃',tagline:'제왕의 별자리를 꽃으로 시각화한 동양 최고 명리 예술',feats:['자미두수 명궁·주성 정밀 분석','주성·보성 별 밝기 해석','귀인성·재성 꽃 매핑 시각화','전통 동양 운명 비주얼 리포트'],cost:'🪙 50코인',ct:'paid'},
    openSukuyoFlowerStudio:{cat:'숙요 · 달빛 꽃',title:'🌙 숙요 꽃',tagline:'27수(宿) 달의 위상으로 피어나는 생명의 꽃',feats:['인도-불교 27수 별자리 분석','태어날 때 달빛 에너지 해석','숙요 전통 운세 꽃 시각화','달의 위상 리듬 리포트'],cost:'🪙 50코인',ct:'paid'},
    openDreamModal:{cat:'드림 타로 · 해몽',title:'🌙 드림 타로',tagline:'꿈의 상징을 타로와 연결해 숨겨진 运命을 해독합니다',feats:['AI 기반 꿈 심층 해석','타로 카드 연결 심볼 분석','꿈 속 인물·장소·감정 의미 해독','운명 예언 리포트 제공'],cost:'✨ 무료',ct:'free'},
    openPsychoDreamModal:{cat:'정신분석 · 해몽',title:'🕯️ 정신분석 해몽',tagline:'프로이트 & 영국 심리학으로 꿈의 무의식을 파헤칩니다',feats:['프로이트 정신분석 해석 적용','현대 영국 임상심리학 관점 교차','꿈 무의식 패턴 심층 분석','전문 심리 보고서 형식 리포트'],cost:'✨ 무료',ct:'free'},
    openPhysiognomyApp:{cat:'AI · 동물 관상',title:'🎭 AI 동물 관상',tagline:'셀카 한 장으로 당신의 얼굴에 숨겨진 운명을 읽어냅니다',feats:['AI 얼굴형 관상 정밀 분석','동물 토템 매핑 시각화','성격·운세·매력 지수 분석','셀카 업로드만으로 즉시 결과'],cost:'✨ 무료',ct:'free'},
    openMbtiModal:{cat:'MBTI · 궁합',title:'🦁 MBTI 동물 궁합',tagline:'16가지 MBTI를 동물 토템으로 재해석한 연애 궁합 리딩',feats:['MBTI 16유형 동물 토템 매핑','커플 궁합 점수 & 시너지 분석','연애 스타일 & 갈등 포인트 해석','무료 즉시 결과 제공'],cost:'✨ 무료',ct:'free'},
    openAnimalTotemModal:{cat:'토템 · 수호 동물',title:'🧸 애니멀 토템',tagline:'수호 동물이 당신에게 전하는 비밀 메시지를 리딩합니다',feats:['샤머닉 전통 수호 동물 카드 리딩','오늘의 인도 & 경고 메시지','동물 상징 에너지 심층 해석','고화질 토템 카드 비주얼'],cost:'🪙 30코인',ct:'paid'},
    openSajuAnimalPage:{cat:'사주 · 수호 동물 아트',title:'🐲 사주 가디언 아트',tagline:'생년월일로 찾는 나만의 수호 동물 & AI 가디언 이미지',feats:['사주 8글자 기반 수호 동물 매핑','12지신 + 천간 기반 캐릭터 생성','나만의 AI 가디언 아트 제공','무료 대형 결과 이미지 다운로드'],cost:'✨ 무료',ct:'free'},
    openNevilleMeditationPage:{cat:'네빌 명상 · 실습',title:'🧘 네빌 명상 실습',tagline:'상상이 현실이 되는 네빌 고다드식 집중 명상 루틴',feats:['네빌 고다드 이론 기반 명상 가이드','단계별 집중 호흡 & 자기 암시','원하는 현실 시각화 루틴','30분 완전 가이드 세션'],cost:'🪙 30코인',ct:'paid'},
    openYogaGuru:{cat:'인도 요가 · 명상',title:'🪷 Divya Yoga',tagline:'당신의 에너지 타입에 맞춘 인도 감성 요가 & 명상 루틴',feats:['사주 기반 에너지 타입 분석','맞춤 아사나 & 호흡법 제공','차크라 활성화 명상 루틴','인도 전통 감성 가이드 세션'],cost:'🪙 30코인',ct:'paid'},
    openTarotLoveModal:{cat:'타로 · 관계 리딩',title:'💕 우리는 무슨 사이?',tagline:'지금 이 관계의 진짜 감정을 6장의 타로가 말합니다',feats:['6카드 관계 심층 스프레드','상대방 감정 & 나의 감정 분석','관계 진전 가능성 & 장벽 해석','커플·짝사랑·이별 모든 상황 적용'],cost:'🪙 50코인',ct:'paid'},
    openTarotHealingModal:{cat:'타로 · 힐링',title:'☀ 따뜻한 태양 회복 타로',tagline:'상처받은 마음을 따뜻한 태양 에너지로 회복시켜 드립니다',feats:['4카드 회복 스프레드 리딩','감정 상처 & 치유 에너지 분석','앞으로 나아갈 방향 & 조언','따뜻한 응원 메시지 포함'],cost:'✨ 무료',ct:'free'},
    openTarotSelfEsteemModal:{cat:'타로 · 자존감 퀘스트',title:'✨ 자존감 레벨업',tagline:'RPG 퀘스트 형식으로 자존감을 5단계로 레벨업합니다',feats:['5카드 RPG 퀘스트 스프레드','자존감 레벨 & 성장 포인트 분석','내면 강점 & 약점 해석','미션 형식의 실천 가이드 제공'],cost:'✨ 무료',ct:'free'},
    openTarotReunionModal:{cat:'타로 · 재회운',title:'🌊 재회운 타로',tagline:'별을 헤는 밤바다, 그 사람이 돌아올 확률을 읽어냅니다',feats:['5카드 등대 스프레드 리딩','재회 가능성 & 타이밍 분석','상대방 현재 감정 상태 해석','재회를 위한 실전 어드바이스'],cost:'🪙 50코인',ct:'paid'},
    openTarotYearFortuneModal:{cat:'십이지신 · 연간 운세',title:'십이지신 천운(天運)',tagline:'12지신의 기운으로 12개월 재물·연애·인간관계 가이드',feats:['12개월 월별 상세 운세 분석','재물·연애·건강·인간관계 항목','십이지신 수호 기운 해석','행운의 달 & 주의 달 표시'],cost:'🪙 15코인',ct:'paid'},
    openTarotModal:{cat:'명리학 타로',title:'🔮 명리학 타로',tagline:'78장 유니버설 덱으로 명리학과 타로를 교차 해석합니다',feats:['78장 유니버설 타로 덱 활용','명리학 프레임 교차 해석','질문 맞춤 카드 스프레드','AI 심층 리딩 리포트'],cost:'🪙 15코인',ct:'paid'},
    openHwatuModal:{cat:'화투점 · 한국 전통',title:'🎴 타짜들의 화투점',tagline:'12달 화투패의 숨겨진 운명 암호를 타짜가 읽어드립니다',feats:['한국 전통 화투패 12달 운세','월별 꽃패 상징 심층 해석','재물·사랑·시험 운세 분석','타짜 스타일 생생한 리딩'],cost:'✨ 무료',ct:'free'},
    openKemetModal:{cat:'이집트 신탁 · 케멧',title:'𓂀 이집트 신탁',tagline:'고대 케멧의 신들이 오늘 당신에게 신탁을 내립니다',feats:['고대 이집트 케멧 오라클 카드','신 & 상징 교차 해석','오늘의 질문 삶 적용 가이드','신비로운 이집트 아트 비주얼'],cost:'🪙 30코인',ct:'paid'},
    openJuyukModal:{cat:'주역 64괘 · 거북점',title:'☯️ 주역 거북점',tagline:'3000년 동양 지혜의 결정체, 64괘로 운명을 점칩니다',feats:['주역 64괘 정통 해석','거북이 등 문양 점술 의식','오늘의 질문 괘 매핑','한문 & 현대 해석 동시 제공'],cost:'🪙 30코인',ct:'paid'},
    openSukuyoModal:{cat:'숙요점 · 불교 천문',title:'💫 숙요점(宿曜占)',tagline:'불교 밀교 27수 별자리로 운명의 별을 찾아드립니다',feats:['불교 밀교 전통 27수 점성','나의 수호 별자리 & 길흉 분석','숙요 달력 기반 길일 계산','VIP 전용 프리미엄 리포트'],cost:'🪙 400코인',ct:'paid'},
    openRuneOracle:{cat:'스톤헨지 · 룬 오라클',title:'ᚠ 스톤헨지 룬 오라클',tagline:'고대 켈트 룬 문자에 새겨진 운명의 메시지를 읽어냅니다',feats:['고대 퓨사크 24룬 오라클 리딩','스톤헨지 의식 기반 뽑기','룬 상징 심층 & 역방향 해석','켈트 전통 비주얼 리딩'],cost:'🪙 50코인',ct:'paid'},
    openGeomancyOracle:{cat:'지오맨시 · 흙점',title:'⟁ 지오맨시 흙점',tagline:'대지에 던진 16행 점의 패턴으로 땅의 신탁을 읽습니다',feats:['중동-아프리카 전통 흙점 의식','16행 기하학 패턴 신탁 해석','오늘의 질문 대지 메시지 제공','감성적 사막 아트 비주얼'],cost:'🪙 50코인',ct:'paid'},
    openRoyalTeaOracle:{cat:'영국 홍차점 · 타세오그래피',title:'🫖 영국 홍차점',tagline:'왕실의 찻잎 문양에서 오늘의 운명 이야기가 펼쳐집니다',feats:['영국 전통 타세오그래피 의식','찻잎 형태 상징 심층 해독','왕실 스타일 운세 리포트','빅토리아 시대 감성 비주얼'],cost:'🪙 30코인',ct:'paid'},
    '/oracle/sikojen-povailu':{cat:'핀란드 주석점',title:'🐷 핀란드 돼지 주석점',tagline:'녹인 주석이 만드는 형태로 새해 운명을 점치는 핀란드 전통',feats:['핀란드 정통 주석점 의식 시뮬레이션','주석 형태 상징 20가지 해석','돼지 마스코트 연이와 함께하는 리딩','행운·사랑·재물 운세 무료 제공'],cost:'✨ 무료',ct:'free'},
    '/destiny-poker.html':{cat:'데스티니 포커',title:'🃏 데스티니 포커',tagline:'신들과 벌이는 운명의 카드 대결! 승리하면 행운이 찾아옵니다',feats:['5장 포커 기반 운명 대결 게임','올림푸스 신 캐릭터 4명 배틀','승률로 보는 오늘의 운세 지수','완전 무료 엔터테인먼트 점술'],cost:'✨ 무료',ct:'free'}
  };

  var _ov,_sheet,_titleEl,_taglineEl,_featsEl,_catEl,_costEl,_ctaBtn;
  var _pendingTile=null,_pendingHref=null;

  function _init(){
    _ov=document.getElementById('tilePvwOverlay');
    if(!_ov)return;
    _sheet=document.getElementById('tilePvwSheet');
    _titleEl=document.getElementById('tilePvwTitle');
    _taglineEl=document.getElementById('tilePvwTagline');
    _featsEl=document.getElementById('tilePvwFeats');
    _catEl=document.getElementById('tilePvwCat');
    _costEl=document.getElementById('tilePvwCost');
    _ctaBtn=document.getElementById('tilePvwCtaBtn');
    document.getElementById('tilePvwBd').addEventListener('click',_close);
    document.getElementById('tilePvwClose').addEventListener('click',_close);
    _ctaBtn.addEventListener('click',_onCta);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&_ov.classList.contains('pvw-open'))_close();});
    var sy=0;
    _sheet.addEventListener('touchstart',function(e){sy=e.touches[0].clientY;},{passive:true});
    _sheet.addEventListener('touchmove',function(e){if(e.touches[0].clientY-sy>90)_close();},{passive:true});
  }

  function _open(tile,href,d){
    if(!_ov)return;
    _pendingTile=tile;
    _pendingHref=href||null;
    _catEl.textContent=d.cat||'';
    _titleEl.textContent=d.title||'';
    _taglineEl.textContent=d.tagline||'';
    _costEl.textContent=d.cost||'';
    _costEl.className='tile-pvw-cost'+(d.ct==='free'?' tile-pvw-cost--free':'');
    _featsEl.innerHTML='';
    (d.feats||[]).forEach(function(f){var li=document.createElement('li');li.textContent=f;_featsEl.appendChild(li);});
    _ov.removeAttribute('style');
    requestAnimationFrame(function(){_ov.classList.add('pvw-open');});
  }

  function _close(){
    if(_ov)_ov.classList.remove('pvw-open');
    _pendingTile=null;_pendingHref=null;
  }

  function _onCta(){
    var tile=_pendingTile,href=_pendingHref;
    _close();
    if(!tile)return;
    if(href&&tile.tagName==='A'){window.location.href=href;return;}
    tile.setAttribute('data-pvw-bypass','1');
    tile.click();
    setTimeout(function(){tile.removeAttribute('data-pvw-bypass');},100);
  }

  document.addEventListener('click',function(e){
    var tile=e.target.closest('.tarot-tile');
    if(!tile||tile.getAttribute('data-pvw-bypass'))return;
    var action=tile.getAttribute('data-action');
    var href=tile.tagName==='A'?tile.getAttribute('href'):null;
    var key=action||href;
    if(!key||!D[key])return;
    e.stopImmediatePropagation();
    e.preventDefault();
    if(!_ov)_init();
    _open(tile,href,D[key]);
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_init);
  }else{
    _init();
  }
})();
</script>
</body>`;

// ─────────────────────────────────────────────────────
// Apply patches to all target files
// ─────────────────────────────────────────────────────
let patched = 0, skipped = 0;

for (const rel of TARGET_FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) {
    console.log(`[SKIP] not found: ${rel}`);
    skipped++;
    continue;
  }

  let src = fs.readFileSync(fp, 'utf8');
  let modified = false;

  // Patch 1: Coin Badge CSS
  if (src.includes(OLD_COIN_CSS)) {
    src = src.replace(OLD_COIN_CSS, NEW_COIN_CSS);
    modified = true;
    console.log(`  [P1-OK] coin badge CSS: ${rel}`);
  } else if (!src.includes('.tarot-tile__coin-badge{position:absolute;top:8px')) {
    console.log(`  [P1-SKIP] coin CSS not found or already patched: ${rel}`);
  }

  // Patch 2: Flower card desc text
  if (src.includes(OLD_FLOWER_DESC)) {
    src = src.replace(OLD_FLOWER_DESC, NEW_FLOWER_DESC);
    modified = true;
    console.log(`  [P2-OK] flower desc: ${rel}`);
  }

  // Patch 3: Badge text replacements
  for (const [oldTxt, newTxt] of BADGE_TEXT_REPLACEMENTS) {
    if (src.includes(oldTxt)) {
      src = src.split(oldTxt).join(newTxt);
      modified = true;
      console.log(`  [P3-OK] badge text "${oldTxt}" → "${newTxt}": ${rel}`);
    }
  }

  // Patch 4: Add Preview CSS before </head>
  if (!src.includes('id="tile-preview-styles"')) {
    src = src.replace('</head>', PREVIEW_CSS_BLOCK);
    modified = true;
    console.log(`  [P4-OK] preview CSS added: ${rel}`);
  }

  // Patch 5: Add Preview HTML+JS before </body>
  if (!src.includes('id="tilePvwOverlay"')) {
    src = src.replace('</body>', PREVIEW_SCRIPT);
    modified = true;
    console.log(`  [P5-OK] preview panel added: ${rel}`);
  }

  if (modified) {
    fs.writeFileSync(fp, src, 'utf8');
    console.log(`[DONE] ${rel}\n`);
    patched++;
  } else {
    console.log(`[NO-CHANGE] ${rel}\n`);
    skipped++;
  }
}

console.log(`\n===========================`);
console.log(`Patched: ${patched} | Skipped: ${skipped}`);
