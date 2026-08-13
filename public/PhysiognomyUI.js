// ============================================
// Face Analysis UI Controller (Vanilla JS)
// 초상권 안내 문구 추가 & 동물 뱃지 미출력 오류 수정
// 초정밀 안면 / 귀 관상 분석 프롬프트 고도화 적용
// ============================================

let faceMesh = null;
let camera = null;
let videoElement = null;
let canvasElement = null;
let canvasCtx = null;
let isAnalyzing = false;
let analysisComplete = false;
let landmarksData = null;
let currentMode = 'camera';
let _phyFrameCount = 0; // 프레임 스로틀용
let _phyUploadToken = 0;
let _phyAnalysisAbortController = null;
let _phyLongWaitTimer = null;
let _phyVeryLongWaitTimer = null;
let _phyAnalysisSourceEl = null;
let _phyScrollSuppressUntil = 0;
let _phyActiveSectionIndex = 0;
let _phyMediaPipeReadyPromise = null;
let _phyActiveLandmarkToken = 0;
let _phyEnsemblePending = null; // 앙상블 패스 1건이 결과를 기다리는 resolve

const PHY_FILE_HARD_LIMIT_BYTES = 20 * 1024 * 1024;
const PHY_IMAGE_MAX_EDGE = 1280;
const PHY_IMAGE_MAX_PIXELS = 1280 * 1280;
const PHY_IMAGE_JPEG_QUALITY = 0.86;
const PHY_MEDIAPIPE_VERSION = {
  controlUtils: '0.6.1629159505',
  drawingUtils: '0.3.1620248257',
  faceMesh: '0.4.1633559619'
};
const PHY_MEDIAPIPE_CDN_BASES = [
  'https://cdn.jsdelivr.net/npm',
  'https://unpkg.com'
];
let _phyFaceMeshAssetBase = `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${PHY_MEDIAPIPE_VERSION.faceMesh}`;
const PHY_LOADING_STEPS = [
  '이미지의 윤곽을 정리하는 중입니다.',
  '이목구비의 균형을 읽고 있습니다.',
  '얼굴형과 분위기 데이터를 분석 중입니다.',
  '관상적 특징을 해석으로 변환하고 있습니다.',
  'Code:Destiny 스타일로 결과를 정리하고 있습니다.'
];

// ── 랜드마크 앙상블 ──
// 검출 1회는 랜드마크마다 지터를 갖고, 그 지터가 faceRatio 같은 비율에 그대로 전파된다.
// 서로 다른 입력(얼굴 크롭 · 미세 회전 · 대비 정규화)에서 얻은 좌표를 인덱스별 중앙값으로 합쳐
// 그 분산을 깎는 것이 목적이다.
// 🔴 해상도를 올리는 장치가 아니다 — FaceMesh 는 어차피 얼굴을 192×192 로 리샘플한다.
//    이득은 "검출 ROI 를 여러 방식으로 흔들어 보고 중앙값을 취한다"는 분산 감소 쪽이다.
//    (그래서 평균이 아니라 중앙값이다. 한 패스가 얼굴을 놓쳐도 결과가 끌려가지 않는다)
const PHY_ENSEMBLE_PASS_TIMEOUT_MS = 8000;
const PHY_ENSEMBLE_CROP_EDGE = 1280;
const PHY_ENSEMBLE_TILT_DEG = 4;
// 분석 화면 최소 표시 시간. 연산이 먼저 끝나면 남은 시간만큼 마지막 단계에서 기다렸다가 렌더한다.
// (결과 카드 삽입 자체는 지연시키지 않는다 — 그건 예전에 '팝콘' 사고를 냈고 verify 가 막는다)
const PHY_MIN_ANALYSIS_MS = 3200;

// ── 궁합 분석 상태 변수 ──
let compatMode = false;        // 궁합 모드 활성화 여부
let firstAnalysisResult = null; // 첫 번째 사람 분석 결과 저장
let secondAnalysisResult = null; // 두 번째 사람 분석 결과 저장
let ogwanMoleUnlocked = false;   // 오관·점 프리미엄(회당 5,000원) 잠금 해제 여부 — 새 분석마다 리셋

if(document.getElementById('phy-styles')) document.getElementById('phy-styles').remove();
if(document.getElementById('physiognomy-app')) document.getElementById('physiognomy-app').remove();

const styleLink = document.createElement('style');
styleLink.id = 'phy-styles';
styleLink.textContent = `
  #physiognomy-app {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(160deg, #090d18 0%, #111827 44%, #2e1739 100%);
    z-index: 9999;
    display: none;
    flex-direction: column;
    color: #fff;
    font-family: var(--font-body, 'Pretendard', sans-serif);
    overscroll-behavior: contain;
  }
  /* background가 알파 없는 불투명 그라디언트라 backdrop-filter는 결과가 덮여
     보이지 않으면서 모바일 GPU 비용만 냈다. 시각 변화 없이 제거. */
  #physiognomy-app.phy-reduced-effects {
    background: rgba(8, 11, 18, 0.97);
  }
  .phy-header {
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(15,23,42,0.96), rgba(49,46,129,0.82));
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 14px 34px rgba(0,0,0,0.28);
  }
  .phy-title {
    font-size: 1.18rem;
    font-weight: 800;
    color: #f8fafc;
    text-shadow: 0 2px 14px rgba(168,85,247,0.32);
  }
  .phy-close-btn {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.8rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 5px;
  }
  .phy-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 20px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
  .input-switch-container {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    background: rgba(15,23,42,0.78);
    padding: 6px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 28px rgba(0,0,0,0.2);
  }
  .switch-btn {
    background: transparent;
    color: #aaa;
    border: none;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: bold;
    transition: all 0.3s;
  }
  .switch-btn.active {
    background: linear-gradient(135deg, #14b8a6 0%, #7c3aed 100%);
    color: #fff;
    box-shadow: 0 8px 18px rgba(124,58,237,0.28);
  }
  .video-container {
    position: relative;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid rgba(45,212,191,0.9);
    margin-bottom: 15px;
    box-shadow: 0 18px 48px rgba(0,0,0,0.38), 0 0 34px rgba(124,58,237,0.22), inset 0 0 20px rgba(0,0,0,0.5);
    background: #000;
  }
  #physiognomy-app.phy-reduced-effects .video-container {
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.3), inset 0 0 14px rgba(0,0,0,0.4);
  }
  .video-container video, .video-container img {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) scaleX(-1);
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
  }
  .video-container canvas {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) scaleX(-1);
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
    z-index: 10;
  }
  .scan-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 15%;
    background: linear-gradient(to bottom, rgba(16, 185, 129, 0) 0%, rgba(16, 185, 129, 0.6) 50%, rgba(16, 185, 129, 0) 100%);
    box-shadow: 0 0 15px #10b981;
    z-index: 20;
    animation: scan 1.5s infinite ease-in-out;
    display: none;
  }
  #physiognomy-app.phy-reduced-effects .scan-overlay {
    animation-duration: 2.2s;
    box-shadow: none;
  }
  @keyframes scan {
    0% { top: -15%; }
    50% { top: 100%; }
    100% { top: -15%; }
  }
  
  .privacy-notice {
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 16px;
    padding: 15px;
    width: 100%;
    max-width: 320px;
    margin-bottom: 20px;
    text-align: center;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #cbd5e1;
    box-shadow: 0 12px 28px rgba(0,0,0,0.22);
  }

  .status-text {
    font-size: 1rem;
    margin-bottom: 20px;
    text-align: center;
    color: #a7f3d0;
    font-weight: 600;
    background: rgba(15, 23, 42, 0.74);
    padding: 10px 20px;
    border-radius: 999px;
    border: 1px solid rgba(45,212,191,0.26);
  }
  .action-btn {
    background: linear-gradient(135deg, #14b8a6 0%, #2563eb 100%);
    color: white;
    border: none;
    padding: 15px 35px;
    border-radius: 18px;
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 12px 26px rgba(37,99,235,0.28);
    transition: all 0.2s;
    touch-action: manipulation;
  }
  .action-btn[disabled] {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .action-btn:active {
    transform: translateY(3px);
    box-shadow: 0 4px 12px rgba(37,99,235,0.26);
  }
  .result-card {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    color: #1e293b;
    padding: 30px 20px;
    border-radius: 18px;
    width: 100%;
    max-width: 460px;
    display: none;
    margin-top: 10px;
    animation: slideUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    border: 1px solid rgba(226,232,240,0.92);
    box-shadow: 0 22px 58px rgba(2,6,23,0.34);
  }

  .preview-skeleton {
    position: absolute;
    inset: 0;
    display: none;
    z-index: 30;
    background: radial-gradient(circle at 30% 30%, rgba(16,185,129,0.22), rgba(17,24,39,0.86));
    overflow: hidden;
  }
  .preview-skeleton::before {
    content: '';
    position: absolute;
    inset: -30% -100%;
    background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.22) 45%, transparent 70%);
    animation: phyShimmer 1.1s linear infinite;
  }
  @keyframes phyShimmer {
    from { transform: translateX(-35%); }
    to { transform: translateX(35%); }
  }

  .analysis-stage-card {
    width: 100%;
    max-width: 360px;
    margin-bottom: 14px;
    padding: 14px 14px 12px;
    border-radius: 14px;
    border: 1px solid rgba(148,163,184,0.35);
    background: linear-gradient(155deg, rgba(15,23,42,0.9), rgba(30,41,59,0.84));
    box-shadow: 0 8px 20px rgba(2,6,23,0.36);
    display: none;
  }
  .analysis-stage-label {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #a5b4fc;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .analysis-stage-message {
    font-size: 0.95rem;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.5;
  }
  .analysis-stage-progress {
    margin-top: 10px;
    height: 6px;
    border-radius: 999px;
    background: rgba(148,163,184,0.24);
    overflow: hidden;
  }
  /* 레이아웃 스래싱을 피하려고 width 가 아니라 scaleX 로 채운다. */
  .analysis-stage-progress-bar {
    display: block;
    height: 100%;
    width: 100%;
    transform: scaleX(0);
    transform-origin: left center;
    border-radius: 999px;
    background: linear-gradient(90deg, #a5b4fc, #34d399);
    transition: transform 0.45s cubic-bezier(.22,1,.36,1);
  }
  @media (prefers-reduced-motion: reduce) {
    .analysis-stage-progress-bar { transition: none; }
  }
  .analysis-stage-sub {
    margin-top: 8px;
    font-size: 0.8rem;
    color: #94a3b8;
    line-height: 1.45;
    min-height: 18px;
  }
  .analysis-stage-actions {
    margin-top: 10px;
    display: flex;
    gap: 8px;
  }
  .analysis-stage-btn {
    border: 1px solid rgba(148,163,184,0.35);
    background: rgba(30,41,59,0.7);
    color: #e2e8f0;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.76rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }

  .phy-result-meta {
    margin-bottom: 12px;
    padding: 14px;
    border-radius: 14px;
    background: linear-gradient(132deg, #0f172a 0%, #1e293b 52%, #334155 100%);
    border: 1px solid rgba(148,163,184,0.42);
    color: #e2e8f0;
    box-shadow: 0 10px 28px rgba(15,23,42,0.22);
  }
  .phy-result-kicker {
    margin: 0;
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    color: #cbd5e1;
    font-weight: 800;
  }
  .phy-result-title {
    margin: 6px 0 0;
    font-size: 1.06rem;
    color: #f8fafc;
    font-weight: 900;
    line-height: 1.35;
  }
  .phy-result-summary {
    margin: 7px 0 0;
    font-size: 0.82rem;
    color: #cbd5e1;
    line-height: 1.55;
  }
  .phy-category-nav {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .phy-category-chip {
    border: 1px solid rgba(148,163,184,0.42);
    background: rgba(255,255,255,0.05);
    color: #e2e8f0;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 0.73rem;
    font-weight: 700;
    cursor: pointer;
    transition: all .2s ease;
  }
  .phy-category-chip.is-active {
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    color: #fff;
    border-color: #f59e0b;
    box-shadow: 0 6px 14px rgba(249,115,22,0.28);
  }
  .phy-section-card {
    margin-bottom: 12px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity .24s ease, transform .24s ease;
  }
  .phy-section-card.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .phy-section-details {
    border: 1px solid var(--cd-border, #dbe4ef);
    border-radius: 14px;
    background: var(--cd-surface, linear-gradient(180deg, #ffffff 0%, #f8fbff 100%));
    overflow: hidden;
    box-shadow: var(--cd-shadow, 0 9px 20px rgba(148,163,184,0.16));
  }
  .phy-section-details[open] {
    border-color: var(--cd-border, #cbd5e1);
    box-shadow: var(--cd-shadow, 0 12px 28px rgba(148,163,184,0.2));
  }
  .phy-section-summary {
    list-style: none;
    cursor: pointer;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.93rem;
    font-weight: 800;
    color: var(--cd-text, #0f172a);
    background: var(--cd-surface-2, linear-gradient(180deg, #ffffff 0%, #f8fafc 100%));
  }
  .phy-section-summary::-webkit-details-marker { display: none; }
  .phy-section-title-wrap {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .phy-section-index {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 900;
    color: #fff;
    background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
    flex-shrink: 0;
  }
  .phy-section-title {
    font-size: 0.9rem;
    color: var(--cd-text, #0f172a);
    font-weight: 800;
  }
  .phy-section-hint {
    font-size: 0.72rem;
    color: var(--cd-text-muted, #64748b);
    font-weight: 700;
    white-space: nowrap;
  }
  .phy-section-body {
    padding: 3px 14px 14px;
    font-size: 0.88rem;
    color: var(--cd-text, #334155);
    line-height: 1.65;
  }
  .phy-section-body p {
    margin: 8px 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .scan-overlay,
    .animal-badge,
    .preview-skeleton::before,
    .phy-section-card {
      animation: none !important;
      transition: none !important;
    }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  .animal-badge {
    width: 130px;
    height: 130px;
    background: linear-gradient(135deg, #ffe5e5 0%, #fde0c3 100%);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 5rem;
    margin: 0 auto 20px auto;
    box-shadow: 0 10px 25px rgba(255, 160, 122, 0.5), inset 0 0 15px rgba(255,255,255,0.8);
    border: 5px solid #fff;
    animation: popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    position: relative;
  }
  .animal-badge::after {
    content: '';
    position: absolute;
    top: -5px;
    right: -5px;
    font-size: 1.8rem;
    animation: sparkle 1.5s infinite alternate;
  }
  @keyframes popIn {
    0% { transform: scale(0) rotate(-15deg); opacity: 0; }
    80% { transform: scale(1.1) rotate(5deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes sparkle {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.2); opacity: 1; }
  }
  .phy-premium-lock {
    position: relative;
    border-radius: 10px;
    overflow: hidden;
  }
  .phy-premium-blur {
    filter: blur(6px);
    pointer-events: none;
    user-select: none;
    max-height: 220px;
    overflow: hidden;
    opacity: 0.7;
  }
  .phy-premium-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-align: center;
    padding: 18px 14px;
    background: linear-gradient(180deg, rgba(240,253,244,0.55) 0%, rgba(236,253,245,0.92) 60%);
  }
  .phy-premium-lock-icon { font-size: 1.7rem; }
  .phy-premium-lock-title { font-weight: 800; font-size: 1.02rem; color: #065f46; }
  .phy-premium-lock-desc { font-size: 0.85rem; color: #047857; line-height: 1.5; max-width: 320px; }
  .phy-premium-cta {
    margin-top: 4px;
    padding: 10px 18px;
    border: none;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.92rem;
    color: #ffffff;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .phy-premium-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.35); }
  .phy-premium-lock-note { font-size: 0.72rem; color: #64748b; margin-top: 2px; }
`;
document.head.appendChild(styleLink);

const appHtml = `
  <div id="physiognomy-app">
    <div class="phy-header">
      <div class="phy-title"> 초정밀 안면/귀 관상 AI</div>
      <button class="phy-close-btn" onclick="closePhysiognomyApp()" style="font-size: 24px;">&times;</button>
    </div>
    <div class="phy-content">
      <div class="input-switch-container">
        <button class="switch-btn active" id="btnModeCamera" onclick="switchMode('camera')"> 라이브 카메라</button>
        <button class="switch-btn" id="btnModeFile" onclick="switchMode('file')"> 사진 업로드</button>
      </div>

      <div class="video-container" id="videoContainer">
        <video id="phyVideo" autoplay playsinline></video>
        <img id="phyImage" style="display:none;" />
        <canvas id="phyCanvas" width="320" height="320"></canvas>
        <div class="scan-overlay" id="scanOverlay"></div>
        <div class="preview-skeleton" id="previewSkeleton"></div>
      </div>
      
      <div id="fileUploadContainer" style="display:none; margin-bottom:15px; width:100%; max-width:320px;">
        <input type="file" id="phyFileInput" accept="image/*" style="display:none" onchange="handleFileUpload(event)">
        <button class="action-btn" style="width:100%; padding:12px; font-size:1.1rem; background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);" onclick="document.getElementById('phyFileInput').click()">사진 갤러리에서 선택</button>
      </div>

      <div class="privacy-notice">
        <div style="margin-bottom:6px; font-weight:800; font-size:0.95rem; color:#f8fafc; display:flex; align-items:center; justify-content:center; gap:5px;">
          <span style="font-size:1.05rem;"></span> 개인정보 및 초상권 안심 보호
        </div>
        본 AI 관상 분석은 사용자의 기기 자체 환경(Client-Side)에서만 안전하게 처리됩니다.<br>
        <span style="color:#a7f3d0; font-weight:600;">촬영되거나 업로드된 사진은 어떠한 외부 서버로도 전송되지 않으므로</span> 안심하세요.
      </div>
      
      <div class="status-text" id="phyStatus">카메라 연동 중...</div>

      <div class="analysis-stage-card" id="analysisStageCard">
        <div class="analysis-stage-label">ANALYSIS RITUAL</div>
        <div class="analysis-stage-message" id="analysisStageMessage" aria-live="polite">얼굴형과 분위기 데이터를 분석 중입니다.</div>
        <div class="analysis-stage-progress" id="analysisStageProgress" role="progressbar" aria-label="분석 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="analysis-stage-progress-bar" id="analysisStageProgressBar"></span></div>
        <div class="analysis-stage-sub" id="analysisStageSub"></div>
        <div class="analysis-stage-actions">
          <button class="analysis-stage-btn" type="button" onclick="cancelPhysiognomyAnalysis()">취소</button>
          <button class="analysis-stage-btn" id="analysisRetryBtn" type="button" style="display:none;" onclick="retryPhysiognomyAnalysis()">재시도</button>
        </div>
      </div>
      
      <button class="action-btn" id="captureBtn" onclick="startCapture()" style="display:none;">
         초정밀 스캔 시작하기
      </button>

      <div class="result-card" id="phyResult">
        <!-- 메인 이모지 뱃지 -->
        <div class="animal-badge" id="resEmoji"></div>

        <div class="phy-result-meta">
          <p class="phy-result-kicker">AI PHYSIOGNOMY DOSSIER</p>
          <p class="phy-result-title" id="phyResultTitle"></p>
          <p class="phy-result-summary" id="phyResultSummary"></p>
          <div class="phy-category-nav" id="phyCategoryNav"></div>
        </div>
        
        <!-- 고도화된 Expert Report 컨테이너 -->
        <div id="expertReportContainer"></div>



        <button class="action-btn" style="width: 100%; margin-top: 15px; background: #FEE500; color: #3B1E08; border: none; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" onclick="sharePhysiognomyKakao()">💬 카카오톡으로 관상 결과 공유하기</button>
        <button class="action-btn" id="pastLifeBridgeBtn" style="width: 100%; margin-top: 10px; display:none; background: linear-gradient(135deg, #13102a 0%, #2e2560 100%); color:#f4eeff; border:1px solid rgba(196,181,253,0.46); box-shadow:0 0 30px -8px rgba(156,135,212,0.45); padding:14px 14px 11px; font-size:1.02rem; flex-direction:column; align-items:center; gap:5px;" onclick="openPastLifeFaceFromPhysiognomy()"><span>🌘 이 얼굴의 전생 관상 보기</span><span style="font-size:0.78rem; font-weight:700; background:rgba(232,213,163,0.92); color:#0a0818; border-radius:20px; padding:3px 12px;">무료 · 사진 다시 안 올려도 됩니다</span></button>
        <button class="action-btn" id="compatStartBtn" style="width: 100%; margin-top: 10px; display:none; background: linear-gradient(135deg, #f472b6 0%, #e11d48 100%); color: #fff; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4); padding:14px 14px 10px; font-size:1.05rem; flex-direction:column; align-items:center; gap:5px;" onclick="startCompatMode()"><span>💕 상대방과 관상 궁합 보기</span><span style="font-size:0.78rem; font-weight:700; background:rgba(255,255,255,0.22); border-radius:20px; padding:3px 12px; letter-spacing:0.02em;">🐷 5,000원 결제</span></button>
        <button class="action-btn" style="width: 100%; margin-top: 10px; background: #e2e8f0; color: #475569; box-shadow: none; padding:12px;" onclick="resetPhysiognomyApp()"> 다른 사진으로 분석하기</button>
        <button class="action-btn" style="width: 100%; margin-top: 10px; background: #fff; color: #475569; border: 1px solid #cbd5e1; box-shadow: none; padding:12px;" onclick="closePhysiognomyApp()"> 메인 화면으로 돌아가기</button>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', appHtml);

/* 안드로이드 앱에는 CAMERA 권한이 없다(AndroidManifest 는 INTERNET 하나뿐). WebView 의
   getUserMedia 는 그 권한을 런타임 요청하므로 앱에서는 '라이브 카메라'가 반드시 실패한다 —
   기본 모드가 카메라라서 관상에 들어오자마자 오류 문구를 보게 된다.
   앱에서는 탭 자체를 감추고 사진 업로드를 기본으로 둔다. 웹은 그대로다. */
function isPhysiognomyAppRuntime() {
  /* 🔴 판별 정본은 js/core/app-context.js 하나다(docs/app-audit/APP_UIUX_SPEC.md §2). */
  try {
    const ctx = window.__cdAppContext;
    if (ctx && typeof ctx.isApp === 'function') return ctx.isApp();
  } catch (e) {}
  /* 정본 미로딩 폴백 — 정본과 같은 신호만 본다. `!!window.Capacitor` 로 넓히지 말 것(과대판정). */
  try {
    if (window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app') return true;
    if (document.documentElement
      && document.documentElement.getAttribute('data-runtime-target') === 'mobile-app') return true;
    const cap = window.Capacitor;
    return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  } catch (e) {
    return false;
  }
}

if (isPhysiognomyAppRuntime()) {
  currentMode = 'file';
  const cameraTab = document.getElementById('btnModeCamera');
  const fileTab = document.getElementById('btnModeFile');
  const fileUploadContainer = document.getElementById('fileUploadContainer');
  const videoEl = document.getElementById('phyVideo');
  const imageEl = document.getElementById('phyImage');
  if (cameraTab) {
    cameraTab.style.display = 'none';
    cameraTab.classList.remove('active');
  }
  if (fileTab) fileTab.classList.add('active');
  // switchMode('file') 의 표시 상태와 같게 맞춘다 — videoContainer 를 통째로 숨기면
  // 업로드한 사진 미리보기(#phyImage)와 스캔 오버레이까지 사라진다.
  if (fileUploadContainer) fileUploadContainer.style.display = 'block';
  if (videoEl) videoEl.style.display = 'none';
  if (imageEl) imageEl.style.display = 'block';
}

function getEl(id) {
  return document.getElementById(id);
}

function updateStatus(text, asHtml) {
  const statusEl = getEl('phyStatus');
  if (!statusEl) return;
  if (asHtml) statusEl.innerHTML = text;
  else statusEl.innerText = text;
}

function waitForUiFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

function withTimeout(promise, timeoutMs, timeoutCode) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutCode || 'TIMEOUT'));
    }, Math.max(1, Number(timeoutMs) || 1));

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureFaceMeshReady(timeoutMs) {
  const limitMs = Math.max(1000, Number(timeoutMs) || 12000);
  const deadline = Date.now() + limitMs;

  if (_phyMediaPipeReadyPromise) {
    try {
      await withTimeout(_phyMediaPipeReadyPromise, limitMs, 'MEDIAPIPE_READY_TIMEOUT');
    } catch (err) {
      console.error('FaceMesh 초기화 실패:', err);
      resetFaceMeshRuntime();
    }
    return !!faceMesh;
  }

  while (!faceMesh && Date.now() < deadline) await sleepMs(90);
  if (faceMesh) return true;

  if (!_phyMediaPipeReadyPromise) {
    _phyMediaPipeReadyPromise = (async () => {
      await loadMediaPipeScripts();
      await startMediaPipe();
    })();
    _phyMediaPipeReadyPromise.finally(() => {
      _phyMediaPipeReadyPromise = null;
    });
  }

  try {
    await withTimeout(_phyMediaPipeReadyPromise, limitMs, 'MEDIAPIPE_READY_TIMEOUT');
  } catch (err) {
    console.error('FaceMesh 초기화 실패:', err);
    resetFaceMeshRuntime();
  }
  return !!faceMesh;
}

function showPreviewSkeleton(show) {
  const el = getEl('previewSkeleton');
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
}

function showAnalysisStage(show) {
  const card = getEl('analysisStageCard');
  if (!card) return;
  card.style.display = show ? 'block' : 'none';
}

function setAnalysisStageMessage(message) {
  const msgEl = getEl('analysisStageMessage');
  if (msgEl) msgEl.innerText = message;
}

function setAnalysisStageSub(message) {
  const subEl = getEl('analysisStageSub');
  if (subEl) subEl.innerText = message || '';
}

// 진행률(0~1)에 문구와 막대를 함께 묶는다.
// 예전에는 1700ms 타이머로 문구만 돌았고 실제 단계와 무관했다 — 분석이 즉시 끝나
// 사용자는 1단계만 보고 결과를 받았다. 지금은 문구가 곧 실제 진행 상황이다.
function setAnalysisProgress(ratio) {
  const clamped = Math.max(0, Math.min(1, Number(ratio) || 0));
  const bar = getEl('analysisStageProgressBar');
  if (bar) bar.style.transform = 'scaleX(' + clamped.toFixed(4) + ')';
  const track = getEl('analysisStageProgress');
  if (track) track.setAttribute('aria-valuenow', String(Math.round(clamped * 100)));
  const step = Math.min(PHY_LOADING_STEPS.length - 1, Math.floor(clamped * PHY_LOADING_STEPS.length));
  setAnalysisStageMessage(PHY_LOADING_STEPS[step]);
}

function startAnalysisStepFlow() {
  stopAnalysisStepFlow();
  showAnalysisStage(true);
  const retryBtn = getEl('analysisRetryBtn');
  if (retryBtn) retryBtn.style.display = 'none';

  setAnalysisProgress(0);
  setAnalysisStageSub('잠시만 기다려 주세요. 분석 중에도 화면은 계속 반응합니다.');

  _phyLongWaitTimer = setTimeout(() => {
    setAnalysisStageSub('조금 더 정밀하게 분석 중입니다. 곧 결과를 보여드릴게요.');
  }, 30000);

  _phyVeryLongWaitTimer = setTimeout(() => {
    setAnalysisStageSub('분석이 길어지고 있습니다. 잠시 후 재시도를 권장합니다.');
    const btn = getEl('analysisRetryBtn');
    if (btn) btn.style.display = 'inline-flex';
  }, 60000);
}

function stopAnalysisStepFlow() {
  if (_phyLongWaitTimer) {
    clearTimeout(_phyLongWaitTimer);
    _phyLongWaitTimer = null;
  }
  if (_phyVeryLongWaitTimer) {
    clearTimeout(_phyVeryLongWaitTimer);
    _phyVeryLongWaitTimer = null;
  }
  setAnalysisStageSub('');
  showAnalysisStage(false);
}

function setReducedEffects(enabled) {
  const appEl = getEl('physiognomy-app');
  if (!appEl) return;
  if (enabled) appEl.classList.add('phy-reduced-effects');
  else appEl.classList.remove('phy-reduced-effects');
}

function clearPreparedImageResources() {
  _phyAnalysisSourceEl = null;
}

function resetFaceMeshRuntime() {
  try {
    if (faceMesh && typeof faceMesh.close === 'function') {
      faceMesh.close();
    }
  } catch (err) {
    console.warn('FaceMesh 정리 실패(무시):', err);
  }
  faceMesh = null;
  landmarksData = null;
  _phyMediaPipeReadyPromise = null;
}

function isFaceMeshRuntimeError(error) {
  const message = String((error && error.message) || error || '');
  return /MEDIAPIPE|FACEMESH|LANDMARK_TIMEOUT|Failed to load|Module|wasm|WebAssembly/i.test(message);
}

function abortRunningAnalysis(opts) {
  const options = opts || {};
  const shouldResetStatus = options.keepStatus !== true;

  if (_phyAnalysisAbortController) {
    _phyAnalysisAbortController.abort();
    _phyAnalysisAbortController = null;
  }

  isAnalyzing = false;
  _phyActiveLandmarkToken = 0;
  setReducedEffects(false);
  stopAnalysisStepFlow();

  const scanOverlay = getEl('scanOverlay');
  if (scanOverlay) scanOverlay.style.display = 'none';

  if (shouldResetStatus && options.message) {
    updateStatus(options.message);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e && e.target && e.target.result ? e.target.result : ''));
    reader.onerror = () => reject(new Error('IMAGE_READ_FAILED'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
    image.src = dataUrl;
  });
}

function canvasToDataUrl(canvas, mimeType, quality) {
  try {
    return canvas.toDataURL(mimeType || 'image/jpeg', quality);
  } catch (err) {
    console.warn('이미지 최적화 실패(원본 사용):', err);
    return '';
  }
}

async function prepareImageForLandmark(file) {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const width = Number(image.naturalWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.height || 0);

  if (!width || !height) {
    throw new Error('IMAGE_DIMENSION_FAILED');
  }

  const maxEdgeRatio = Math.min(1, PHY_IMAGE_MAX_EDGE / Math.max(width, height));
  const maxPixelRatio = Math.min(1, Math.sqrt(PHY_IMAGE_MAX_PIXELS / Math.max(1, width * height)));
  const scale = Math.min(maxEdgeRatio, maxPixelRatio);

  if (scale >= 0.995 && file.size <= 4 * 1024 * 1024) {
    return {
      dataUrl: sourceDataUrl,
      width,
      height,
      optimized: false
    };
  }

  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    return {
      dataUrl: sourceDataUrl,
      width,
      height,
      optimized: false
    };
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  const optimizedDataUrl = canvasToDataUrl(canvas, 'image/jpeg', PHY_IMAGE_JPEG_QUALITY);
  return {
    dataUrl: optimizedDataUrl || sourceDataUrl,
    width: targetWidth,
    height: targetHeight,
    optimized: Boolean(optimizedDataUrl)
  };
}

// ── 랜드마크 앙상블 ──────────────────────────────────────────────────────────
// 한 장의 사진을 서로 다른 방식으로 다시 보여 주고, 인덱스별 중앙값으로 좌표를 합친다.
// 각 변형본은 랜드마크를 자기 캔버스 기준 정규화 좌표로 돌려주므로, 원본 이미지 기준으로
// 되돌리는 map 함수를 canvas 와 한 쌍으로 들고 다닌다.

function phyFaceBox(landmarks, imgW, imgH, padRatio) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < landmarks.length; i += 1) {
    const p = landmarks[i];
    if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (!(w > 0) || !(h > 0)) return null;

  const x0 = Math.max(0, Math.floor((minX - w * padRatio) * imgW));
  const y0 = Math.max(0, Math.floor((minY - h * padRatio) * imgH));
  const x1 = Math.min(imgW, Math.ceil((maxX + w * padRatio) * imgW));
  const y1 = Math.min(imgH, Math.ceil((maxY + h * padRatio) * imgH));
  if (x1 - x0 < 64 || y1 - y0 < 64) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// 얼굴만 잘라서 다시 보여 준다 — 검출기가 잡는 ROI 가 달라지므로 원본 패스와 오차가 독립적이다.
function phyCropVariant(source, box, imgW, imgH, filter) {
  const scale = Math.min(PHY_ENSEMBLE_CROP_EDGE / Math.max(box.w, box.h), 4);
  const cw = Math.max(1, Math.round(box.w * scale));
  const ch = Math.max(1, Math.round(box.h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  if (filter) ctx.filter = filter;
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, cw, ch);
  // z 는 x 와 같은 스케일(이미지 폭 기준 정규화)이라, 크롭 폭 기준으로 온 값을 원본 폭 기준으로 되돌린다.
  const zScale = box.w / imgW;
  return {
    canvas: canvas,
    map: function (p) {
      return {
        x: (box.x + p.x * box.w) / imgW,
        y: (box.y + p.y * box.h) / imgH,
        z: (Number(p.z) || 0) * zScale
      };
    }
  };
}

// 이미지 평면에서 살짝 돌려 본다 — 검출기의 회전 의존 편향을 좌우로 갈라 중앙값에서 상쇄시킨다.
function phyTiltVariant(source, deg, imgW, imgH) {
  const rad = (deg * Math.PI) / 180;
  const canvas = document.createElement('canvas');
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return null;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, imgW, imgH);
  ctx.translate(imgW / 2, imgH / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -imgW / 2, -imgH / 2, imgW, imgH);

  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);
  return {
    canvas: canvas,
    map: function (p) {
      const px = p.x * imgW - imgW / 2;
      const py = p.y * imgH - imgH / 2;
      return {
        x: (imgW / 2 + px * cos - py * sin) / imgW,
        y: (imgH / 2 + px * sin + py * cos) / imgH,
        z: Number(p.z) || 0
      };
    }
  };
}

function phySendForLandmarks(source, timeoutMs) {
  const received = new Promise((resolve) => {
    _phyEnsemblePending = resolve;
  });
  return Promise.resolve()
    .then(function () { return faceMesh.send({ image: source }); })
    .then(function () { return withTimeout(received, timeoutMs, 'ENSEMBLE_PASS_TIMEOUT'); })
    .then(
      function (value) { _phyEnsemblePending = null; return value; },
      function (error) { _phyEnsemblePending = null; throw error; }
    );
}

function phyMedianLandmarks(sets) {
  const usable = sets.filter(function (s) { return Array.isArray(s) && s.length > 0; });
  if (usable.length < 2) return usable[0] || null;

  let count = usable[0].length;
  for (let i = 1; i < usable.length; i += 1) count = Math.min(count, usable[i].length);

  const middle = (values) => {
    values.sort(function (a, b) { return a - b; });
    const mid = values.length >> 1;
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  };

  const merged = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const xs = [];
    const ys = [];
    const zs = [];
    for (let s = 0; s < usable.length; s += 1) {
      const p = usable[s][i];
      if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
      xs.push(p.x);
      ys.push(p.y);
      zs.push(Number(p.z) || 0);
    }
    merged[i] = xs.length ? { x: middle(xs), y: middle(ys), z: middle(zs) } : usable[0][i];
  }
  return merged;
}

// 업로드 시 이미 얻은 1패스(base)에 변형본 패스를 더해 중앙값으로 합친다.
// 변형본이 하나도 성공하지 못하면 base 를 그대로 쓴다 — 정밀도를 못 올릴 뿐 결과는 나온다.
async function refineLandmarksEnsemble(baseLandmarks, source, signal, onPassDone) {
  const imgW = Math.round(Number((source && (source.naturalWidth || source.videoWidth || source.width)) || 0));
  const imgH = Math.round(Number((source && (source.naturalHeight || source.videoHeight || source.height)) || 0));
  const sets = [baseLandmarks];

  if (!faceMesh || !source || !imgW || !imgH || !Array.isArray(baseLandmarks) || !baseLandmarks.length) {
    if (typeof onPassDone === 'function') onPassDone(0, 0);
    return { landmarks: baseLandmarks, passes: 1 };
  }

  const box = phyFaceBox(baseLandmarks, imgW, imgH, 0.25);
  const variants = [];
  if (box) variants.push(phyCropVariant(source, box, imgW, imgH, null));
  variants.push(phyTiltVariant(source, -PHY_ENSEMBLE_TILT_DEG, imgW, imgH));
  variants.push(phyTiltVariant(source, PHY_ENSEMBLE_TILT_DEG, imgW, imgH));
  if (box) variants.push(phyCropVariant(source, box, imgW, imgH, 'contrast(1.15)'));

  for (let i = 0; i < variants.length; i += 1) {
    if (signal && signal.aborted) break;
    const variant = variants[i];
    if (variant) {
      try {
        const landmarks = await phySendForLandmarks(variant.canvas, PHY_ENSEMBLE_PASS_TIMEOUT_MS);
        if (landmarks && landmarks.length) sets.push(landmarks.map(variant.map));
      } catch (err) {
        console.warn('앙상블 패스 실패(무시):', (err && err.message) || err);
      }
    }
    if (typeof onPassDone === 'function') onPassDone(i + 1, variants.length);
  }

  return { landmarks: phyMedianLandmarks(sets) || baseLandmarks, passes: sets.length };
}

function extractDescriptionSection(descriptionHtml, sectionLabel) {
  if (!descriptionHtml) return '';
  const marker = `<strong>[${sectionLabel}]</strong><br>`;
  const start = descriptionHtml.indexOf(marker);
  if (start < 0) return '';
  const rest = descriptionHtml.slice(start + marker.length);
  const end = rest.indexOf('<br><br><strong>');
  const chunk = end >= 0 ? rest.slice(0, end) : rest;
  return chunk.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildFaceShapeText(features) {
  const ratio = Number(features && features.faceRatio);
  if (!Number.isFinite(ratio)) return '얼굴형 데이터가 제한되어 윤곽 정보를 보수적으로 해석했습니다.';
  if (ratio >= 0.87) return '둥근 윤곽이 강조된 편으로 포용력 있고 친근한 인상이 강합니다.';
  if (ratio >= 0.8) return '균형형 윤곽으로 상황 적응과 대인 밸런스가 안정적인 얼굴형입니다.';
  if (ratio >= 0.72) return '갸름한 윤곽이 살아 있어 집중력과 선명한 자기표현 인상이 도드라집니다.';
  return '긴 윤곽이 두드러져 이성적이고 관찰적인 분위기가 강조됩니다.';
}

function buildFeatureSnapshot(features) {
  if (!features) return '눈·코·입·이마·턱의 세부 수치를 안정 범위로 해석했습니다.';
  const eyeSlant = Number(features.eyeSlant || 0);
  const noseRatio = Number(features.noseWidthRatio || 0);
  const mouthRatio = Number(features.mouthRatio || 0);
  const jawRatio = Number(features.jawSquareness || features.faceRatio || 0);

  const eyeText = eyeSlant <= -2
    ? '눈매는 상승 기운이 강해 카리스마와 추진 인상이 큽니다.'
    : eyeSlant >= 2
    ? '눈매는 완만하게 내려가 신뢰감과 온화한 인상이 살아납니다.'
    : '눈매는 중립 구간으로 안정적이고 균형 잡힌 시선을 만듭니다.';

  const noseText = noseRatio >= 1
    ? '코 중심축이 비교적 넓어 결단력과 실전형 에너지가 강합니다.'
    : '코 중심축이 비교적 슬림해 섬세함과 디테일 감각이 강조됩니다.';

  const mouthText = mouthRatio >= 1.45
    ? '입매 표현력이 큰 편이라 전달력과 주도적 대화 성향이 드러납니다.'
    : '입매가 안정 구간이라 신중하고 절제된 소통 스타일이 강합니다.';

  const jawText = jawRatio >= 0.86
    ? '턱선은 포용형으로 장기전에서 버티는 힘이 강한 편입니다.'
    : '턱선은 선명형으로 목표 지향성과 속도감 있는 판단이 돋보입니다.';

  return `${eyeText} ${noseText} ${mouthText} ${jawText}`;
}

function createResultSections(result) {
  const description = String(result && result.description || '');
  const personalityText = extractDescriptionSection(description, '성격 및 특징') || '표정 흐름과 이목구비 균형에서 부드러운 신뢰감과 선명한 존재감이 함께 포착되었습니다.';
  const loveText = extractDescriptionSection(description, '연애 및 결혼') || '관계에서는 속도보다 깊이를 중시하는 경향이 강하며, 안정감 있는 상호작용에서 매력이 극대화됩니다.';
  const careerText = extractDescriptionSection(description, '진로 및 직업') || '강점이 살아나는 역할에 집중할수록 성과의 질과 속도가 함께 상승하는 패턴이 확인됩니다.';
  const wealthText = extractDescriptionSection(description, '재물운') || '수입보다 지출의 리듬을 먼저 정교하게 관리할 때 재물 흐름이 안정적으로 축적됩니다.';
  const faceShapeText = buildFaceShapeText(result && result.extractedFeatures);
  const featureSnapshotText = buildFeatureSnapshot(result && result.extractedFeatures);
  const top3 = Array.isArray(result && result.top3) ? result.top3 : [];
  const top3Text = top3.length
    ? top3.map((item, index) => `${index + 1}순위 ${item.animal && item.animal.name ? item.animal.name : '-'} ${item.pct || 0}%`).join(' · ')
    : '동물상 순위 데이터는 기본 프로파일을 중심으로 안정적으로 해석되었습니다.';
  const scoreBreakdown = result && result.scoreBreakdown ? result.scoreBreakdown : {};
  const qualityScore = Number(result && result.qualityScore || 0);
  const scoreValue = value => isFinite(Number(value)) ? Math.round(Number(value)) : '-';
  const qualityText = qualityScore
    ? (qualityScore < 62 ? `사진 품질 ${qualityScore}점으로, 정면과 빛이 더 안정되면 판정 결이 한층 선명해집니다.` : `사진 품질 ${qualityScore}점으로, 얼굴의 중심선과 이목구비 흐름이 안정적으로 읽혔습니다.`)
    : '사진의 빛과 각도를 기준으로 관상의 흐름을 안정적으로 살폈습니다.';

  return [
    {
      title: '전체 인상',
      body: `<p><b>${result.emoji || '🐾'} ${result.primaryAnimal || '관상 결과'}</b>의 에너지가 이번 분석에서 가장 선명하게 감지되었습니다.</p><p>${personalityText}</p>`
    },
    {
      title: '얼굴형 분석',
      body: `<p>${faceShapeText}</p><p>핵심 관찰 포인트: ${top3Text}</p>`
    },
    {
      title: '판정 근거',
      body: `<p>이번 판정은 얼굴 구조 ${scoreValue(scoreBreakdown.geometry)}, 표정 기운 ${scoreValue(scoreBreakdown.expression)}, 관상 보정 ${scoreValue(scoreBreakdown.profileBonus)}의 흐름을 함께 살폈습니다.</p><p>${qualityText}</p>`
    },
    {
      title: '오관(五官) 특징',
      body: `<p>${featureSnapshotText}</p>`
    },
    {
      title: '매력과 강점',
      body: `<p><b>✨ 매력 포인트:</b> ${result.primaryAnimal || '이 동물상'}의 핵심 매력은 첫 인상에서 남는 분위기와 관계 몰입의 깊이입니다.</p><p>중요한 자리에서는 표정과 말의 템포를 한 박자 늦추면 신뢰감이 훨씬 선명하게 전달됩니다.</p><p><b>관계에서는</b> 상대 반응의 속도를 읽고 대화 강도를 미세 조정할 때 가장 좋은 결과가 나옵니다.</p>`
    },
    {
      title: '성장 영역',
      body: `<p>감정이 올라오는 순간에는 결론보다 확인 질문을 먼저 두는 방식이 오해를 크게 줄여줍니다.</p><p>이번 결과를 고정 성격으로 단정하기보다, 이번 주에 적용할 행동 2가지를 정해 실행해 보세요.</p>`
    },
    {
      title: '직업과 재물',
      body: `<p><b>진로 성향:</b> ${careerText}</p><p><b>재물운:</b> ${wealthText}</p>`
    },
    {
      title: '연애 궁합',
      body: `<p>${loveText}</p>`
    }
  ];
}

function toPlainText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeSectionTitle(rawTitle, index) {
  const clean = toPlainText(rawTitle).replace(/^[^\u3131-\uD79DA-Za-z0-9]+/, '');
  if (!clean) return `카테고리 ${index + 1}`;
  if (clean.length <= 36) return clean;
  return `${clean.slice(0, 36)}...`;
}

function findSectionBlockFromHeading(node, root) {
  let current = node;
  while (current && current !== root) {
    const styleText = String(current.getAttribute && current.getAttribute('style') || '');
    if (/margin-bottom\s*:\s*(10|12|14|15|18)px/i.test(styleText) && /padding\s*:/i.test(styleText)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function createExpertReportSections(result) {
  const reportHtml = String(result && result.expertReportHtml || '').trim();
  if (!reportHtml) return [];

  const host = document.createElement('div');
  host.innerHTML = reportHtml;

  const headingKeywords = [
    '관상 총평',
    '상세 성격 분석',
    '오관(五官)',
    '영혼의 그림자',
    '점(痣)',
    '삶의 지혜',
    '동물상 매칭',
    '참고사항',
    '안심하세요'
  ];

  const headingNodes = Array.from(host.querySelectorAll('div, strong, h1, h2, h3, h4')).filter((node) => {
    const text = toPlainText(node.textContent);
    return headingKeywords.some((keyword) => text.includes(keyword));
  });

  const sections = [];
  const seen = new Set();

  headingNodes.forEach((headingNode) => {
    // 섹션 박스(margin-bottom + padding)를 못 찾으면 건너뛴다.
    // 최상위 wrapper div도 자식 텍스트 때문에 헤딩 키워드에 매칭되는데,
    // parentElement 폴백을 쓰면 host(전체)를 섹션으로 잡아 전체 내용이 통째로
    // 중복 렌더되므로 폴백을 제거한다.
    const sectionNode = findSectionBlockFromHeading(headingNode, host);
    if (!sectionNode || seen.has(sectionNode)) return;

    seen.add(sectionNode);
    sections.push({
      title: normalizeSectionTitle(headingNode.textContent, sections.length),
      body: sectionNode.innerHTML
    });
  });

  if (sections.length >= 3) return sections;

  const genericBlocks = Array.from(host.querySelectorAll('div[style*="margin-bottom"]')).filter((node) => {
    return toPlainText(node.textContent).length > 28;
  });

  genericBlocks.forEach((node) => {
    if (seen.has(node)) return;
    seen.add(node);
    const headingNode = node.querySelector('div, strong, h1, h2, h3, h4');
    sections.push({
      title: normalizeSectionTitle(headingNode && headingNode.textContent ? headingNode.textContent : '', sections.length),
      body: node.innerHTML
    });
  });

  return sections.slice(0, 12);
}

function clearResultMeta() {
  const titleEl = getEl('phyResultTitle');
  const summaryEl = getEl('phyResultSummary');
  const categoryNavEl = getEl('phyCategoryNav');
  if (titleEl) titleEl.innerText = '';
  if (summaryEl) summaryEl.innerText = '';
  if (categoryNavEl) {
    categoryNavEl.innerHTML = '';
    categoryNavEl.style.display = 'none';
  }
  _phyActiveSectionIndex = 0;
}

function setResultMeta(result, sections) {
  const titleEl = getEl('phyResultTitle');
  const summaryEl = getEl('phyResultSummary');
  const top3 = Array.isArray(result && result.top3) ? result.top3 : [];

  const titleText = `${result && result.emoji ? `${result.emoji} ` : ''}${result && result.primaryAnimal ? `${result.primaryAnimal} 관상 리포트` : '관상 리포트'}`;
  const top3Text = top3.length
    ? top3.slice(0, 3).map((item, index) => `${index + 1}위 ${item && item.animal && item.animal.name ? item.animal.name : '-'}`).join(' · ')
    : '카테고리별 세부 해석을 펼쳐서 확인할 수 있습니다.';
  const confidenceText = result && result.confidence ? `${result.confidence}% 신뢰도` : '';
  const qualityScore = Number(result && result.qualityScore || 0);
  const qualityText = qualityScore ? `사진 품질 ${qualityScore}점` : '';
  const retryText = qualityScore && qualityScore < 62 ? '정면 사진 재시도 권장' : '';
  const summaryText = [`${sections.length}개 카테고리 분석`, top3Text, confidenceText, qualityText, retryText].filter(Boolean).join(' · ');

  if (titleEl) titleEl.innerText = titleText;
  if (summaryEl) summaryEl.innerText = summaryText;
}

function setActiveSectionChip(index) {
  const categoryNavEl = getEl('phyCategoryNav');
  if (!categoryNavEl) return;
  _phyActiveSectionIndex = index;

  Array.from(categoryNavEl.querySelectorAll('.phy-category-chip')).forEach((chipEl, chipIndex) => {
    if (chipIndex === index) chipEl.classList.add('is-active');
    else chipEl.classList.remove('is-active');
  });
}

function renderCategoryNav(sections) {
  const categoryNavEl = getEl('phyCategoryNav');
  if (!categoryNavEl) return;
  categoryNavEl.innerHTML = '';

  if (!sections || !sections.length) {
    categoryNavEl.style.display = 'none';
    return;
  }

  categoryNavEl.style.display = 'flex';
  sections.forEach((section, index) => {
    const chipButton = document.createElement('button');
    chipButton.type = 'button';
    chipButton.className = 'phy-category-chip';
    chipButton.innerText = section.title;
    chipButton.addEventListener('click', () => {
      const detailsEl = getEl(`phySectionDetails-${index}`);
      if (!detailsEl) return;
      detailsEl.open = true;
      detailsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setActiveSectionChip(index);
    });
    categoryNavEl.appendChild(chipButton);
  });

  setActiveSectionChip(0);
}

// 오관·점(痣) 섹션은 프리미엄(회당 5,000원). 미해금 시 본문을 블러+CTA로 대체한다.
function isPremiumOgwanMoleSection(title) {
  const t = String(title || '');
  return t.includes('오관') || t.includes('점(痣)') || t.includes('피부와 점');
}

function buildLockedSectionHtml(section) {
  return `
    <div class="phy-premium-lock">
      <div class="phy-premium-blur" aria-hidden="true">${section.body}</div>
      <div class="phy-premium-overlay">
        <div class="phy-premium-lock-icon">🔒</div>
        <div class="phy-premium-lock-title">정밀 분석 잠금</div>
        <div class="phy-premium-lock-desc">오관(五官) 5부위 정밀 확률·경합 분석과 피부·점(痣) 해석 전체를 열람합니다.</div>
        <button type="button" class="phy-premium-cta" aria-label="오관·점 정밀 분석을 5,000원에 열람">🔓 5,000원에 정밀 분석 보기</button>
        <div class="phy-premium-lock-note">기본 관상 리포트와는 별개인 프리미엄 심화 분석입니다.</div>
      </div>
    </div>`;
}

function triggerOgwanMoleUnlock() {
  if (typeof window._cdCoinGatePerUse !== 'function') {
    window.alert('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
    return;
  }
  window._cdCoinGatePerUse(50, '오관·점 정밀 분석', function () {
    ogwanMoleUnlocked = true;
    if (firstAnalysisResult) renderResult(firstAnalysisResult);
  }, null, { featureKey: 'physiognomy-ogwan-mole-deep', serviceKey: 'physiognomy' });
}

function renderSectionCards(container, sections) {
  if (!container) return;
  container.innerHTML = '';
  renderCategoryNav(sections);

  // 카드를 setTimeout으로 하나씩 붙이면 #phyResult가 빈 채로 먼저 노출되고(팝콘),
  // 레이아웃이 계속 자라 스크롤 목표까지 흔들린다. 리포트 HTML은 이미
  // createExpertReportSections에서 전량 파싱되므로 쪼갤 이유가 없다.
  // DocumentFragment로 모아 한 번에 붙여 결과 화면이 완성된 채로 한 프레임에 나타나게 한다.
  const fragment = document.createDocumentFragment();

  sections.forEach((section, index) => {
    const card = document.createElement('section');
    card.className = 'phy-section-card is-visible';

    const locked = isPremiumOgwanMoleSection(section.title) && !ogwanMoleUnlocked;

    const details = document.createElement('details');
    details.className = 'phy-section-details';
    details.id = `phySectionDetails-${index}`;
    if (index < 3 || locked) details.open = true; // 잠긴 프리미엄 섹션은 열어 CTA를 노출
    details.addEventListener('toggle', () => {
      if (details.open) setActiveSectionChip(index);
    });

    const hint = locked ? '🔒 프리미엄' : (index < 3 ? '핵심' : '자세히 보기');
    const summary = document.createElement('summary');
    summary.className = 'phy-section-summary';
    summary.innerHTML = `<span class="phy-section-title-wrap"><span class="phy-section-index">${index + 1}</span><span class="phy-section-title">${section.title}</span></span><span class="phy-section-hint">${hint}</span>`;

    const body = document.createElement('div');
    body.className = 'phy-section-body';
    if (locked) {
      body.innerHTML = buildLockedSectionHtml(section);
      const cta = body.querySelector('.phy-premium-cta');
      if (cta) cta.addEventListener('click', triggerOgwanMoleUnlock);
    } else {
      body.innerHTML = section.body;
    }

    details.appendChild(summary);
    details.appendChild(body);
    card.appendChild(details);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

window.cancelPhysiognomyAnalysis = function cancelPhysiognomyAnalysis() {
  abortRunningAnalysis({ message: '분석을 취소했습니다. 새 이미지를 선택해 다시 시도해 주세요.' });
  const captureBtn = getEl('captureBtn');
  if (captureBtn && landmarksData) {
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;
  }
};

window.retryPhysiognomyAnalysis = function retryPhysiognomyAnalysis() {
  if (isAnalyzing) return;
  showAnalysisStage(false);
  if (landmarksData) {
    window.startCapture();
    return;
  }
  updateStatus('이미지를 다시 선택한 뒤 재시도해 주세요.');
};

const phyContentEl = document.querySelector('#physiognomy-app .phy-content');
if (phyContentEl && !phyContentEl.dataset.scrollGuardBound) {
  phyContentEl.dataset.scrollGuardBound = '1';
  phyContentEl.addEventListener('scroll', () => {
    _phyScrollSuppressUntil = Date.now() + 180;
  }, { passive: true });
}

window.sharePhysiognomyKakao = function() {
  const resultEmoji = document.getElementById('resEmoji').innerText || '';
  const resultContent = document.getElementById('expertReportContainer').innerText || '';
  
  if (!resultEmoji && !resultContent) {
    alert("공유할 분석 결과가 없습니다.");
    return;
  }
  
  // 간단하게 요약된 형태의 텍스트로 가공
  let text = "[AI 동물 관상 분석 결과]\n\n";
  text += resultEmoji + "\n\n";
  text += resultContent.substring(0, 300) + (resultContent.length > 300 ? "...\n\n" : "\n\n");
  text += "👉 내 관상도 보러가기: " + window.location.href;
  
  var encoded = encodeURIComponent(text);
  
  // Web Share API가 지원되는 모바일 환경 우선 시도
  if (navigator.share && /mobile/i.test(navigator.userAgent)) {
    navigator.share({
      title: 'AI 관상 분석 결과',
      text: text,
      url: window.location.href
    }).catch(function(e){  });
    return;
  }
  
  var kakaoUrl = 'kakaotalk://send?text=' + encoded;
  var a = document.createElement('a');
  a.href = kakaoUrl;
  a.click();
  
  // 만약 카카오톡 실행이 안되면 예비용 복사 안내
  setTimeout(function() {
      // 카카오톡 스킴이 응답하지 않을 경우 대비 백폴
  }, 500);
};

function loadScriptFromCandidates(candidates, attrs) {
  return new Promise((resolve, reject) => {
    const sources = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
    let index = 0;

    const tryNext = () => {
      const src = sources[index++];
      if (!src) {
        reject(new Error('MEDIAPIPE_SCRIPT_LOAD_FAILED'));
        return;
      }

      const existing = Array.from(document.querySelectorAll('script[src]')).find((script) => {
        const currentSrc = script.getAttribute('src') || '';
        return currentSrc === src || script.src === src;
      });
      if (existing && existing.dataset.loaded === '1') {
        resolve(existing.src || src);
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      Object.keys(attrs || {}).forEach((key) => {
        script.dataset[key] = attrs[key];
      });
      script.onload = () => {
        script.dataset.loaded = '1';
        resolve(script.src || src);
      };
      script.onerror = () => {
        script.remove();
        tryNext();
      };
      document.head.appendChild(script);
    };

    tryNext();
  });
}

function mediaPipeCandidates(pkg, version, file) {
  return PHY_MEDIAPIPE_CDN_BASES.map((base) => `${base}/@mediapipe/${pkg}@${version}/${file}`);
}

async function loadMediaPipeScripts() {
  if (window.FaceMesh) return;
  await loadScriptFromCandidates(
    mediaPipeCandidates('control_utils', PHY_MEDIAPIPE_VERSION.controlUtils, 'control_utils.js'),
    { phyMediaPipe: 'control-utils' }
  );
  await loadScriptFromCandidates(
    mediaPipeCandidates('drawing_utils', PHY_MEDIAPIPE_VERSION.drawingUtils, 'drawing_utils.js'),
    { phyMediaPipe: 'drawing-utils' }
  );
  const faceMeshScriptSrc = await loadScriptFromCandidates(
    mediaPipeCandidates('face_mesh', PHY_MEDIAPIPE_VERSION.faceMesh, 'face_mesh.js'),
    { phyMediaPipe: 'face-mesh' }
  );
  _phyFaceMeshAssetBase = String(faceMeshScriptSrc || '').replace(/\/face_mesh\.js(?:\?.*)?$/, '') || _phyFaceMeshAssetBase;
}

function onResults(results) {
  // 앙상블 패스는 미리보기 캔버스·상태문구를 건드리지 않고 랜드마크만 넘긴다.
  if (_phyEnsemblePending) {
    const deliver = _phyEnsemblePending;
    _phyEnsemblePending = null;
    deliver((results && results.multiFaceLandmarks && results.multiFaceLandmarks[0]) || null);
    return;
  }
  if(!canvasCtx) return;
  if (currentMode === 'file' && _phyActiveLandmarkToken && _phyActiveLandmarkToken !== _phyUploadToken) return;
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (currentMode === 'file' && document.getElementById('phyImage').src) {
     canvasCtx.drawImage(document.getElementById('phyImage'), 0, 0, canvasElement.width, canvasElement.height);
  }

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    if (!isAnalyzing && !analysisComplete) {
      if (compatMode && firstAnalysisResult) {
        document.getElementById('phyStatus').innerText = "상대방 얼굴이 인식되었습니다! 버튼을 눌러주세요.";
        document.getElementById('captureBtn').innerText = "💕 궁합 분석 시작하기";
      } else {
        document.getElementById('phyStatus').innerText = "이목구비가 인식되었습니다! 버튼을 눌러주세요.";
        document.getElementById('captureBtn').innerText = " 초정밀 스캔 시작하기";
      }
      document.getElementById('captureBtn').style.display = "block";
    }
    landmarksData = results.multiFaceLandmarks[0];
    
    if (!analysisComplete && typeof drawConnectors !== 'undefined') {
        // FACEMESH_TESSELATION은 1300+선 매 프레임 드로우 → 제거(래그 주원인)
        drawConnectors(canvasCtx, landmarksData, FACEMESH_RIGHT_EYE, {color: '#34d399', lineWidth: 2});
        drawConnectors(canvasCtx, landmarksData, FACEMESH_LEFT_EYE, {color: '#34d399', lineWidth: 2});
        drawConnectors(canvasCtx, landmarksData, FACEMESH_LIPS, {color: '#4ade80', lineWidth: 2});
    }
  } else {
    if (!isAnalyzing && !analysisComplete) {
      document.getElementById('phyStatus').innerText = "얼굴 전체가 정면에 보이도록 맞춰주세요.";
      document.getElementById('captureBtn').style.display = "none";
      landmarksData = null;
    }
  }
  canvasCtx.restore();
}

function createCustomCamera(videoEl, onFrame, width, height) {
  let stream = null;
  let animFrameId = null;
  let running = false;

  async function loop() {
    if (!running) return;
    if (videoEl.readyState >= 2) {
      try { await onFrame(); } catch (_e) {}
    }
    if (running) animFrameId = requestAnimationFrame(loop);
  }

  return {
    async start() {
      if (running) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('phyStatus').innerHTML =
          '📷 이 브라우저는 카메라를 지원하지 않습니다.<br><small style="color:#94a3b8;">위의 <b>사진 업로드</b>를 이용해 주세요.</small>';
        setTimeout(() => { if (currentMode === 'camera' && typeof switchMode === 'function') switchMode('file'); }, 2000);
        return;
      }
      try {
        const constraints = { video: { facingMode: 'user', width: { ideal: width }, height: { ideal: height } } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = stream;
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('muted', '');
        await videoEl.play().catch(() => {});
        running = true;
        animFrameId = requestAnimationFrame(loop);
      } catch (err) {
        running = false;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          document.getElementById('phyStatus').innerHTML =
            '📷 카메라 권한이 거부되었습니다.<br><small style="color:#94a3b8;">브라우저 주소창의 잠금 아이콘에서 카메라를 허용하거나<br><b>사진 업로드</b>를 이용해 주세요.</small>';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          document.getElementById('phyStatus').innerHTML =
            '📷 카메라를 찾을 수 없습니다.<br><small style="color:#94a3b8;"><b>사진 업로드</b>를 이용해 주세요.</small>';
        } else {
          document.getElementById('phyStatus').innerText = '카메라 연결에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.';
        }
        setTimeout(() => { if (currentMode === 'camera' && typeof switchMode === 'function') switchMode('file'); }, 2500);
      }
    },
    stop() {
      running = false;
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      if (videoEl.srcObject) { videoEl.srcObject = null; }
    }
  };
}

async function startMediaPipe() {
  if (!window.FaceMesh) throw new Error('MEDIAPIPE_FACEMESH_MISSING');

  const nextFaceMesh = new FaceMesh({ locateFile: (file) => `${_phyFaceMeshAssetBase}/${file}` });
  try {
    nextFaceMesh.setOptions({
      maxNumFaces: 1, refineLandmarks: true,
      minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });
    nextFaceMesh.onResults(onResults);
    faceMesh = nextFaceMesh;
  } catch (err) {
    faceMesh = null;
    throw err;
  }

  if(currentMode === 'camera') {
    camera = createCustomCamera(
      videoElement,
      // isAnalyzing 중에는 라이브 프레임을 보내지 않는다 — 앙상블 패스가 기다리는 onResults 를 가로챈다.
      async () => { if(currentMode === 'camera' && !analysisComplete && !isAnalyzing) { if (++_phyFrameCount % 2 === 0) await faceMesh.send({image: videoElement}); } },
      320, 320
    );
    await camera.start();
  }
}

window.openPhysiognomyApp = async function() {
  videoElement = document.getElementById('phyVideo');
  canvasElement = document.getElementById('phyCanvas');
  canvasCtx = canvasElement.getContext('2d');
  document.getElementById('physiognomy-app').style.display = "flex";
  abortRunningAnalysis({ keepStatus: true });
  updateStatus('AI 데이터 기반 관상 모델 로딩 중...');
  resetPhysiognomyApp();
  try {
    if (!faceMesh) {
      if (!_phyMediaPipeReadyPromise) {
        _phyMediaPipeReadyPromise = (async () => {
          await loadMediaPipeScripts();
          await startMediaPipe();
        })();
        _phyMediaPipeReadyPromise.finally(() => {
          _phyMediaPipeReadyPromise = null;
        });
      }
      await _phyMediaPipeReadyPromise;
    } else if (currentMode === 'camera' && camera) {
      await camera.start();
    }

    if (window.faceAnalysisEngine) {
      await window.faceAnalysisEngine.loadDatabase();
      // face-api.js 표정 분석 모델 비동기 로드 (실패해도 기본 분석은 동작)
      window.faceAnalysisEngine.loadFaceApiModels().catch(() => {});
    }
  } catch (e) {
    console.error('관상 엔진 로딩 실패:', e);
    if (isFaceMeshRuntimeError(e)) resetFaceMeshRuntime();
    updateStatus('관상 엔진 로딩이 지연되고 있습니다. 사진 업로드로 다시 시도해 주세요.');
  }
}

window.closePhysiognomyApp = function() {
  abortRunningAnalysis({ keepStatus: true });
  _phyUploadToken += 1;
  clearPreparedImageResources();
  showPreviewSkeleton(false);
  document.getElementById('physiognomy-app').style.display = "none";
  if (camera) camera.stop();
}

window.resetPhysiognomyApp = function(preserveCompat) {
  abortRunningAnalysis({ keepStatus: true });
  _phyUploadToken += 1;
  isAnalyzing = false;
  analysisComplete = false;
  landmarksData = null;
  ogwanMoleUnlocked = false; // 새 분석은 오관·점 정밀 분석을 다시 결제해야 함(회당 결제)
  if (!preserveCompat) {
    compatMode = false;
    firstAnalysisResult = null;
    secondAnalysisResult = null;
  }
  document.getElementById('phyResult').style.display = "none";
  document.getElementById('scanOverlay').style.display = "none";
  document.getElementById('captureBtn').style.display = "none";
  document.getElementById('captureBtn').disabled = false;
  document.getElementById('pastLifeBridgeBtn').style.display = "none";
  document.getElementById('compatStartBtn').style.display = "none";
  document.getElementById('expertReportContainer').innerHTML = "";
  clearResultMeta();
  showAnalysisStage(false);
  showPreviewSkeleton(false);
  clearPreparedImageResources();
    
  // 궁합 모드일 때는 이미지 초기화 생략 (두 번째 사진 업로드에 영향)
  if (!preserveCompat) {
    const imgEl = document.getElementById('phyImage');
    if (imgEl) {
      imgEl.src = "";
      imgEl.onload = null;
    }
  }

  if(canvasCtx) canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);
  if (preserveCompat) {
    // 궁합 모드 유지 시 안내 텍스트
    updateStatus('상대방의 사진을 업로드해주세요.');
  } else if(currentMode === 'camera') {
    updateStatus('카메라 정면에서 화면 중앙에 얼굴을 맞춰주세요.');
  } else {
    updateStatus('관상을 분석할 사진을 선택해주세요.');
  }
}

window.switchMode = async function(mode) {
  currentMode = mode;
  document.getElementById('btnModeCamera').classList.remove('active');
  document.getElementById('btnModeFile').classList.remove('active');
  const isInCompatMode = compatMode && firstAnalysisResult;
  if (mode === 'camera') {
    document.getElementById('btnModeCamera').classList.add('active');
    document.getElementById('fileUploadContainer').style.display = 'none';      
    document.getElementById('phyVideo').style.display = 'block';
    document.getElementById('phyImage').style.display = 'none';
    resetPhysiognomyApp(isInCompatMode);
    if(camera) camera.start();
  } else {
    document.getElementById('btnModeFile').classList.add('active');
    document.getElementById('fileUploadContainer').style.display = 'block';     
    document.getElementById('phyVideo').style.display = 'none';
    document.getElementById('phyImage').style.display = 'block';
    resetPhysiognomyApp(isInCompatMode);
    if(camera) camera.stop();
  }
}

window.handleFileUpload = async function(event) {
  const file = event && event.target && event.target.files ? event.target.files[0] : null;
  if (!file) return;
  if (!/^image\//i.test(file.type || '')) {
    updateStatus('지원하지 않는 파일 형식입니다. 이미지 파일을 선택해 주세요.');
    return;
  }
  if (file.size > PHY_FILE_HARD_LIMIT_BYTES) {
    updateStatus('20MB 초과 이미지는 지원하지 않습니다. 다른 이미지를 선택해 주세요.');
    return;
  }

  const fileInput = document.getElementById('phyFileInput');
  if (fileInput) fileInput.value = '';

  const isInCompatMode = compatMode && firstAnalysisResult;
  resetPhysiognomyApp(isInCompatMode);
  const uploadToken = _phyUploadToken;
  _phyActiveLandmarkToken = uploadToken;
  showPreviewSkeleton(true);

  updateStatus(isInCompatMode ? '상대방 이미지를 불러오는 중입니다...' : '이미지를 불러오는 중입니다...');

  try {
    await waitForUiFrame();
    const preparedImage = await prepareImageForLandmark(file);
    if (uploadToken !== _phyUploadToken) return;

    const imgEl = document.getElementById('phyImage');
    if (!imgEl) return;

    imgEl.onload = async () => {
      if (uploadToken !== _phyUploadToken) return;
      showPreviewSkeleton(false);

      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(imgEl, 0, 0, canvasElement.width, canvasElement.height);
      }

      updateStatus(preparedImage.optimized ? '이미지를 가볍게 정리한 뒤 관상 포인트를 추출 중입니다...' : '귀와 이목구비의 468개 랜드마크를 추출 중입니다...');

      if (!faceMesh) {
        updateStatus('관상 엔진을 준비하는 중입니다. 잠시만 기다려 주세요...');
        const ready = await ensureFaceMeshReady(18000);
        if (!ready) {
          showPreviewSkeleton(false);
          resetFaceMeshRuntime();
          updateStatus('관상 엔진 로딩이 지연되고 있습니다. 다시 업로드하면 새로 연결합니다.');
          return;
        }
        updateStatus(preparedImage.optimized ? '이미지를 가볍게 정리한 뒤 관상 포인트를 추출 중입니다...' : '귀와 이목구비의 468개 랜드마크를 추출 중입니다...');
      }

      try {
        if (typeof faceMesh.reset === 'function') {
          faceMesh.reset();
        }

        _phyAnalysisSourceEl = imgEl;
        _phyActiveLandmarkToken = uploadToken;

        await waitForUiFrame();
        if (uploadToken !== _phyUploadToken) return;
        await withTimeout(faceMesh.send({ image: imgEl }), 22000, 'LANDMARK_TIMEOUT');
      } catch (err) {
        console.error('이미지 랜드마크 추출 실패:', err);
        landmarksData = null;
        _phyAnalysisSourceEl = null;
        if (isFaceMeshRuntimeError(err)) resetFaceMeshRuntime();
        if (err && err.message === 'LANDMARK_TIMEOUT') {
          updateStatus('랜드마크 추출 시간이 초과되었습니다. 이미지를 다시 선택하면 엔진을 새로 연결합니다.');
        } else if (err && /MEDIAPIPE_SCRIPT_LOAD_FAILED|MEDIAPIPE_FACEMESH_MISSING/i.test(err.message || '')) {
          updateStatus('관상 엔진 연결에 실패했습니다. 잠시 후 다시 업로드해 주세요.');
        } else {
          updateStatus('이미지 분석 중 오류가 발생했습니다. 정면 사진으로 다시 선택해 주세요.');
        }
      }
    };

    imgEl.onerror = () => {
      showPreviewSkeleton(false);
      updateStatus('이미지를 불러오지 못했습니다. 다른 파일로 다시 시도해 주세요.');
    };

    imgEl.src = preparedImage.dataUrl;
  } catch (err) {
    console.error('이미지 로드 실패:', err);
    showPreviewSkeleton(false);
    if (err && err.message === 'IMAGE_READ_FAILED') {
      updateStatus('이미지를 읽는 중 오류가 발생했습니다. 다른 파일로 다시 시도해 주세요.');
    } else if (err && err.message === 'IMAGE_DECODE_FAILED') {
      updateStatus('이미지 크기를 읽지 못했습니다. 다른 형식의 사진으로 다시 시도해 주세요.');
    } else if (err && err.message === 'IMAGE_DIMENSION_FAILED') {
      updateStatus('이미지 해상도 정보를 확인하지 못했습니다. 다른 사진을 선택해 주세요.');
    } else {
      updateStatus('이미지를 처리하지 못했습니다. 다른 파일로 다시 시도해 주세요.');
    }
  }
}

window.startCapture = async function() {
  if (Date.now() < _phyScrollSuppressUntil) return;
  if (isAnalyzing) return;
  if (!landmarksData) {
    alert('얼굴이 제대로 인식되지 않았습니다. 밝은 곳에서 다시 시도해주세요.');
    return;
  }
  // 앙상블 결과로 갈아끼우므로 let 이다.
  let analysisLandmarks = landmarksData;

  isAnalyzing = true;
  analysisComplete = false;

  const captureBtn = document.getElementById('captureBtn');
  if (captureBtn) {
    captureBtn.style.display = 'none';
    captureBtn.disabled = true;
  }
  const scanOverlay = document.getElementById('scanOverlay');
  if (scanOverlay) scanOverlay.style.display = 'block';

  setReducedEffects(true);
  startAnalysisStepFlow();
  updateStatus('상/중/하정 밸런스 및 이상(귀) 수치 정밀 분석 중...');

  const controller = new AbortController();
  _phyAnalysisAbortController = controller;
  const analysisStartedAt = Date.now();

  try {
    await waitForUiFrame();
    await waitForUiFrame();
    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');
    if (!window.faceAnalysisEngine) throw new Error('분석 엔진 부재');
    setAnalysisProgress(0.06);

    let expressionData = null;
    try {
      const mediaSource = (typeof currentMode !== 'undefined' && currentMode === 'file')
        ? (_phyAnalysisSourceEl || document.getElementById('phyImage'))
        : document.getElementById('phyVideo');
      if (mediaSource && window.faceAnalysisEngine.faceApiModelsLoaded) {
        // 표정은 선택 항목(exprScore 최대 220 × 0.08)이라 GPU 컨텍스트 손실 등으로 리드백이
        // 영원히 걸리면 결과 전체를 볼모로 잡지 말고 표정 없이 진행한다.
        expressionData = await withTimeout(
          window.faceAnalysisEngine.detectExpressions(mediaSource),
          5000,
          'EXPRESSION_TIMEOUT'
        );
      }
    } catch (exErr) {
      console.warn('표정 감지 실패(무시):', exErr);
    }
    setAnalysisProgress(0.16);

    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');

    // ── 랜드마크 앙상블 ──
    // 업로드 때 받은 1패스만 쓰면 그때의 검출 지터가 비율에 그대로 남는다.
    // 여기서 변형본을 더 돌려 인덱스별 중앙값으로 좌표를 다시 잡는다.
    const ensembleSource = (typeof currentMode !== 'undefined' && currentMode === 'file')
      ? (_phyAnalysisSourceEl || document.getElementById('phyImage'))
      : document.getElementById('phyVideo');
    const ensemble = await refineLandmarksEnsemble(
      analysisLandmarks,
      ensembleSource,
      controller.signal,
      (done, total) => {
        if (total > 0) setAnalysisProgress(0.16 + 0.64 * (done / total));
      }
    );
    analysisLandmarks = ensemble.landmarks;
    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');
    setAnalysisProgress(0.82);
    // 종횡비 보정용: 랜드마크 소스 이미지의 W/H를 전달해 정규화 좌표 왜곡(세로형 셀카가 갸름 얼굴을 넓게 측정)을 교정
    const _phyAspectSrc = (typeof currentMode !== 'undefined' && currentMode === 'file')
      ? (_phyAnalysisSourceEl || document.getElementById('phyImage'))
      : document.getElementById('phyVideo');
    const _phyImgW = _phyAspectSrc ? (_phyAspectSrc.naturalWidth || _phyAspectSrc.videoWidth || _phyAspectSrc.width || 0) : 0;
    const _phyImgH = _phyAspectSrc ? (_phyAspectSrc.naturalHeight || _phyAspectSrc.videoHeight || _phyAspectSrc.height || 0) : 0;
    const imageAspect = (_phyImgW > 0 && _phyImgH > 0) ? (_phyImgW / _phyImgH) : 1;
    // 점(痣) 분석은 실제 화소를 읽는다. analyze() 의 인자는 검증이 문자열로 고정하고 있어
    // 늘릴 수 없으므로 여기서 따로 넘긴다. 못 넘기면 엔진이 '판독 불가'로 답한다(점을 지어내지 않는다).
    if (typeof window.faceAnalysisEngine.setMoleSource === 'function') {
      window.faceAnalysisEngine.setMoleSource(_phyAspectSrc);
    }
    const result = await withTimeout(
      window.faceAnalysisEngine.analyze(analysisLandmarks, expressionData, imageAspect),
      45000,
      'ANALYSIS_TIMEOUT'
    );
    if (typeof window.faceAnalysisEngine.clearMoleSource === 'function') {
      window.faceAnalysisEngine.clearMoleSource();
    }
    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');
    setAnalysisProgress(0.96);

    // 앙상블이 목표보다 일찍 끝나면 남은 시간만큼 분석 화면을 유지한다.
    // 결과 렌더 자체는 지연시키지 않는다(카드 stagger 재도입 금지 계약).
    const elapsedMs = Date.now() - analysisStartedAt;
    if (elapsedMs < PHY_MIN_ANALYSIS_MS) await sleepMs(PHY_MIN_ANALYSIS_MS - elapsedMs);
    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');
    setAnalysisProgress(1);

    analysisComplete = true;
    stopAnalysisStepFlow();

    if (compatMode && firstAnalysisResult) {
      secondAnalysisResult = result;
      updateStatus(`<div style="text-align:center;">
        <div style="font-size:1.1rem; font-weight:800; color:#f472b6;">💕 궁합 분석 완료!</div>
        <div style="font-size:0.85rem; color:#a7f3d0; margin-top:4px;">${firstAnalysisResult.emoji} ${firstAnalysisResult.primaryAnimal} × ${secondAnalysisResult.emoji} ${secondAnalysisResult.primaryAnimal}</div>
      </div>`, true);

      try {
        const compatResult = window.faceAnalysisEngine.calculateCompatibility(firstAnalysisResult, secondAnalysisResult);
        if (compatResult && compatResult.compatHtml) {
          renderCompatResult(compatResult);
        } else {
          throw new Error('궁합 결과 생성 실패');
        }
      } catch (compatErr) {
        console.error('궁합 분석 오류:', compatErr);
        const titleEl = getEl('phyResultTitle');
        const summaryEl = getEl('phyResultSummary');
        const categoryNavEl = getEl('phyCategoryNav');
        if (titleEl) titleEl.innerText = '💕 관상 궁합 리포트';
        if (summaryEl) summaryEl.innerText = '궁합 상세 분석 중 오류가 발생해 요약 결과를 표시합니다.';
        if (categoryNavEl) {
          categoryNavEl.innerHTML = '';
          categoryNavEl.style.display = 'none';
        }
        document.getElementById('expertReportContainer').innerHTML = `
          <div style="padding:20px; text-align:center; color:#e11d48;">
            <div style="font-size:2rem; margin-bottom:10px;">💕</div>
            <div style="font-weight:800; font-size:1.1rem; margin-bottom:8px;">${firstAnalysisResult.emoji} ${firstAnalysisResult.primaryAnimal} × ${secondAnalysisResult.emoji} ${secondAnalysisResult.primaryAnimal}</div>
            <div style="font-size:0.9rem; color:#64748b;">궁합 상세 분석 중 오류가 발생했습니다.<br>다시 시도해주세요.</div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-top:8px;">오류: ${compatErr.message || compatErr}</div>
          </div>`;
        document.getElementById('phyResult').style.display = 'block';
        compatMode = false;
      }
    } else {
      firstAnalysisResult = result;
      updateStatus('초정밀 관상 분석이 100% 완료되었습니다!');
      renderResult(result);
    }
  } catch (error) {
    if (error && error.message === 'ANALYSIS_ABORTED') return;
    console.error('관상 분석 실패:', error);
    stopAnalysisStepFlow();
    showAnalysisStage(true);
    if (error && error.message === 'ANALYSIS_TIMEOUT') {
      setAnalysisStageMessage('분석 시간이 길어져 자동으로 중단되었습니다.');
      setAnalysisStageSub('네트워크 또는 기기 상태를 확인한 뒤 재시도해 주세요.');
      updateStatus('분석 시간이 초과되어 자동 중단되었습니다. 다시 시도해 주세요.');
    } else {
      setAnalysisStageMessage('분석 중 문제가 발생했습니다.');
      setAnalysisStageSub('이미지를 다시 선택하거나 새로고침 후 재시도해 주세요.');
      updateStatus('분석 실패: ' + (error && error.message ? error.message : error));
    }
    const retryBtn = getEl('analysisRetryBtn');
    if (retryBtn) retryBtn.style.display = 'inline-flex';

    if (captureBtn) {
      captureBtn.style.display = landmarksData ? 'block' : 'none';
      captureBtn.disabled = false;
    }
  } finally {
    if (_phyAnalysisAbortController === controller) {
      _phyAnalysisAbortController = null;
    }
    const overlay = document.getElementById('scanOverlay');
    if (overlay) overlay.style.display = 'none';
    setReducedEffects(false);
    isAnalyzing = false;
  }
}

function renderResult(result) {
  let emojiNode = document.getElementById('resEmoji');
  emojiNode.innerText = result.emoji || '';

  const reportContainer = document.getElementById('expertReportContainer');
  if (reportContainer) {
    const expertSections = createExpertReportSections(result);
    const sections = expertSections.length ? expertSections : createResultSections(result);
    if (sections.length) {
      setResultMeta(result, sections);
      renderSectionCards(reportContainer, sections);
    } else {
      clearResultMeta();
      reportContainer.innerHTML = "<div style='padding:20px;'>분석 결과를 불러올 수 없습니다.</div>";
    }
  }

  document.getElementById('phyResult').style.display = 'block';

  if (!compatMode) {
    const bridgeBtn = document.getElementById('pastLifeBridgeBtn');
    if (bridgeBtn) bridgeBtn.style.display = 'flex';
    document.getElementById('compatStartBtn').style.display = 'block';
  }

  // 해금 재렌더는 사용자가 방금 결제한 오관·점 섹션을 보고 있으므로 맨 위로 튕기지 않는다.
  if (!ogwanMoleUnlocked) requestAnimationFrame(scrollResultToTop);
}

/**
 * 전생 관상은 독립 기능(PastLifeFaceUI.js)으로 분리됐다. 여기서는 이미 끝난 분석 결과를
 * 그대로 넘겨 사용자가 사진을 다시 올리지 않게만 한다. 스크립트가 아직 없으면 지연 로드한다.
 */
window.openPastLifeFaceFromPhysiognomy = async function openPastLifeFaceFromPhysiognomy() {
  if (!firstAnalysisResult) {
    alert('먼저 관상 분석을 완료해주세요.');
    return;
  }
  const btn = document.getElementById('pastLifeBridgeBtn');
  if (btn) btn.disabled = true;
  try {
    if (typeof window.openPastLifeFaceApp !== 'function') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'PastLifeFaceUI.js?v=h43a6f73e793d';
        script.onload = resolve;
        script.onerror = () => reject(new Error('PAST_LIFE_SCRIPT_LOAD_FAILED'));
        document.head.appendChild(script);
      });
    }
    if (typeof window.openPastLifeFaceApp !== 'function') throw new Error('PAST_LIFE_ENTRY_MISSING');
    window.openPastLifeFaceApp({ seed: firstAnalysisResult });
  } catch (error) {
    console.error('전생 관상 진입 실패:', error);
    alert('전생 관상을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    if (btn) btn.disabled = false;
  }
};

  function scrollResultToTop() {
    const resultEl = document.getElementById('phyResult');
    if (!resultEl) return;

    const contentEl = document.querySelector('#physiognomy-app .phy-content');
    if (contentEl) {
      const targetTop = Math.max(resultEl.offsetTop - 12, 0);
      contentEl.scrollTo({ top: targetTop, behavior: 'smooth' });
      return;
    }

    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── 궁합 모드 관련 함수 ──
  window.startCompatMode = function() {
    // 첫 번째 분석 결과 저장
    if (!firstAnalysisResult) {
      alert('먼저 관상 분석을 완료해주세요.');
      return;
    }

    // ── 관상 궁합 5,000원 게이트 (공통 게이트 경유) ──
    (function () {
      if (typeof window._cdCoinGatePerUse !== 'function') {
        window.alert('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }

      const compatRequestId = 'physiognomy-compatibility:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
      window._cdCoinGatePerUse(50, '관상 궁합 분석', function () {
        // 결제 확인 성공 → 궁합 모드 시작
        compatMode = true;
        _phyUploadToken += 1;

        // UI 리셋하되 궁합 상태는 유지
        isAnalyzing = false;
        analysisComplete = false;
        landmarksData = null;
        document.getElementById('phyResult').style.display = 'none';
        document.getElementById('scanOverlay').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'none';
        document.getElementById('pastLifeBridgeBtn').style.display = 'none';
        document.getElementById('expertReportContainer').innerHTML = '';
        clearResultMeta();
        showAnalysisStage(false);
        showPreviewSkeleton(false);
        clearPreparedImageResources();

        const imgEl = document.getElementById('phyImage');
        if(imgEl) {
          imgEl.src = '';
          imgEl.onload = null;
        }
        if(canvasCtx) canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // 궁합 안내 상태 텍스트
        document.getElementById('phyStatus').innerHTML = `<div style="text-align:center;">
          <div style="font-size:1.1rem; font-weight:800; color:#f472b6; margin-bottom:6px;">💕 궁합 분석 모드</div>
          <div style="font-size:0.9rem; color:#a7f3d0;">상대방의 사진을 촬영하거나 업로드해주세요</div>
          <div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;">첫 번째: ${firstAnalysisResult.emoji} ${firstAnalysisResult.primaryAnimal}</div>
        </div>`;

        // 파일 모드면 업로드 UI 다시 표시
        if (currentMode === 'file') {
          document.getElementById('fileUploadContainer').style.display = 'block';
        } else {
          // 카메라 모드면 카메라 재시작
          if(camera) camera.start();
        }
      }, null, {
        featureKey: 'physiognomy-compatibility',
        serviceKey: 'physiognomy',
        action: 'startPhysiognomyCompatibility',
        requestId: compatRequestId
      });
    })();
  }

  // 궁합 결과 렌더링
  function renderCompatResult(compatResult) {
    stopAnalysisStepFlow();
    let emojiNode = document.getElementById('resEmoji');
    emojiNode.innerText = '💕';

    const titleEl = getEl('phyResultTitle');
    const summaryEl = getEl('phyResultSummary');
    const categoryNavEl = getEl('phyCategoryNav');
    if (titleEl) titleEl.innerText = '💕 관상 궁합 리포트';
    if (summaryEl) summaryEl.innerText = '두 사람의 관상 에너지를 교차 분석한 결과입니다.';
    if (categoryNavEl) {
      categoryNavEl.innerHTML = '';
      categoryNavEl.style.display = 'none';
    }

    document.getElementById('expertReportContainer').innerHTML = compatResult.compatHtml;
    document.getElementById('pastLifeBridgeBtn').style.display = 'none';
    document.getElementById('compatStartBtn').style.display = 'none';
    document.getElementById('phyResult').style.display = 'block';

    setTimeout(scrollResultToTop, 100);
  }
