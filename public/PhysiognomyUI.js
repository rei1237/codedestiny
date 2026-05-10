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
let _phyLoadingTicker = null;
let _phyLongWaitTimer = null;
let _phyVeryLongWaitTimer = null;
let _phyCurrentPreviewUrl = '';
let _phyCurrentAnalysisUrl = '';
let _phyPendingAnalysisBlob = null;
let _phyAnalysisSourceEl = null;
let _phyScrollSuppressUntil = 0;
let _phySectionRenderTimers = [];

const PHY_IMAGE_RECOMPRESS_BYTES = 5 * 1024 * 1024;
const PHY_IMAGE_SOFT_LIMIT_BYTES = 10 * 1024 * 1024;
const PHY_IMAGE_HARD_LIMIT_BYTES = 20 * 1024 * 1024;
const PHY_PREVIEW_MAX_SIDE = 720;
const PHY_ANALYSIS_MAX_SIDE = 1024;
const PHY_PREVIEW_QUALITY = 0.8;
const PHY_ANALYSIS_QUALITY = 0.82;
const PHY_LOADING_STEPS = [
  '이미지의 윤곽을 정리하는 중입니다.',
  '이목구비의 균형을 읽고 있습니다.',
  '얼굴형과 분위기 데이터를 분석 중입니다.',
  '관상적 특징을 해석으로 변환하고 있습니다.',
  'Code:Destiny 스타일로 결과를 정리하고 있습니다.'
];

// ── 궁합 분석 상태 변수 ──
let compatMode = false;        // 궁합 모드 활성화 여부
let firstAnalysisResult = null; // 첫 번째 사람 분석 결과 저장
let secondAnalysisResult = null; // 두 번째 사람 분석 결과 저장

if(document.getElementById('phy-styles')) document.getElementById('phy-styles').remove();
if(document.getElementById('physiognomy-app')) document.getElementById('physiognomy-app').remove();

const styleLink = document.createElement('style');
styleLink.id = 'phy-styles';
styleLink.textContent = `
  #physiognomy-app {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(17, 17, 17, 0.95);
    z-index: 9999;
    display: none;
    flex-direction: column;
    color: #fff;
    font-family: 'Pretendard', sans-serif;
    backdrop-filter: blur(5px);
    overscroll-behavior: contain;
  }
  #physiognomy-app.phy-reduced-effects {
    backdrop-filter: none;
    background: rgba(8, 11, 18, 0.97);
  }
  .phy-header {
    padding: 15px 20px;
    background: rgba(34, 34, 34, 0.9);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #444;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  }
  .phy-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: #10b981;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
    background: #333;
    padding: 6px;
    border-radius: 30px;
    box-shadow: inset 0 2px 5px rgba(0,0,0,0.2);
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
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
  }
  .video-container {
    position: relative;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    overflow: hidden;
    border: 5px solid #10b981;
    margin-bottom: 15px;
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), inset 0 0 20px rgba(0,0,0,0.5);
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
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 12px;
    padding: 15px;
    width: 100%;
    max-width: 320px;
    margin-bottom: 20px;
    text-align: center;
    font-size: 0.85rem;
    line-height: 1.5;
    color: #cbd5e1;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }

  .status-text {
    font-size: 1.1rem;
    margin-bottom: 20px;
    text-align: center;
    color: #a7f3d0;
    font-weight: 600;
    background: rgba(6, 78, 59, 0.4);
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  .action-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    padding: 15px 35px;
    border-radius: 30px;
    font-size: 1.15rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
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
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
  }
  .result-card {
    background: #ffffff;
    color: #333;
    padding: 30px 20px;
    border-radius: 20px;
    width: 100%;
    max-width: 460px;
    display: none;
    margin-top: 10px;
    animation: slideUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
    box-shadow: 0 15px 35px rgba(0,0,0,0.3);
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

  .phy-section-card {
    margin-bottom: 10px;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity .24s ease, transform .24s ease;
  }
  .phy-section-card.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
  .phy-section-details {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    overflow: hidden;
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
    color: #1e293b;
    background: #fff;
  }
  .phy-section-summary::-webkit-details-marker { display: none; }
  .phy-section-hint {
    font-size: 0.72rem;
    color: #64748b;
    font-weight: 700;
    white-space: nowrap;
  }
  .phy-section-body {
    padding: 0 14px 12px;
    font-size: 0.88rem;
    color: #334155;
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
        <div class="analysis-stage-message" id="analysisStageMessage">얼굴형과 분위기 데이터를 분석 중입니다.</div>
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
        
        <!-- 고도화된 Expert Report 컨테이너 -->
        <div id="expertReportContainer"></div>



        <button class="action-btn" style="width: 100%; margin-top: 15px; background: #FEE500; color: #3B1E08; border: none; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" onclick="sharePhysiognomyKakao()">💬 카카오톡으로 관상 결과 공유하기</button>
        <button class="action-btn" id="compatStartBtn" style="width: 100%; margin-top: 10px; display:none; background: linear-gradient(135deg, #f472b6 0%, #e11d48 100%); color: #fff; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4); padding:14px 14px 10px; font-size:1.05rem; flex-direction:column; align-items:center; gap:5px;" onclick="startCompatMode()"><span>💕 상대방과 관상 궁합 보기</span><span style="font-size:0.78rem; font-weight:700; background:rgba(255,255,255,0.22); border-radius:20px; padding:3px 12px; letter-spacing:0.02em;">🐷 50 코인 차감</span></button>
        <button class="action-btn" style="width: 100%; margin-top: 10px; background: #e2e8f0; color: #475569; box-shadow: none; padding:12px;" onclick="resetPhysiognomyApp()"> 다른 사진으로 분석하기</button>
        <button class="action-btn" style="width: 100%; margin-top: 10px; background: #fff; color: #475569; border: 1px solid #cbd5e1; box-shadow: none; padding:12px;" onclick="closePhysiognomyApp()"> 메인 화면으로 돌아가기</button>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', appHtml);

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

function clearSectionRenderTimers() {
  _phySectionRenderTimers.forEach((timerId) => clearTimeout(timerId));
  _phySectionRenderTimers = [];
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

function startAnalysisStepFlow() {
  stopAnalysisStepFlow();
  showAnalysisStage(true);
  const retryBtn = getEl('analysisRetryBtn');
  if (retryBtn) retryBtn.style.display = 'none';

  let stepIndex = 0;
  setAnalysisStageMessage(PHY_LOADING_STEPS[stepIndex]);
  setAnalysisStageSub('잠시만 기다려 주세요. 분석 중에도 화면은 계속 반응합니다.');

  _phyLoadingTicker = setInterval(() => {
    stepIndex = (stepIndex + 1) % PHY_LOADING_STEPS.length;
    setAnalysisStageMessage(PHY_LOADING_STEPS[stepIndex]);
  }, 1700);

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
  if (_phyLoadingTicker) {
    clearInterval(_phyLoadingTicker);
    _phyLoadingTicker = null;
  }
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

function revokeObjectUrlSafe(url) {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (_err) {
    // noop
  }
}

function clearPreparedImageResources() {
  revokeObjectUrlSafe(_phyCurrentPreviewUrl);
  revokeObjectUrlSafe(_phyCurrentAnalysisUrl);
  _phyCurrentPreviewUrl = '';
  _phyCurrentAnalysisUrl = '';
  _phyPendingAnalysisBlob = null;
  _phyAnalysisSourceEl = null;
}

function abortRunningAnalysis(opts) {
  const options = opts || {};
  const shouldResetStatus = options.keepStatus !== true;

  if (_phyAnalysisAbortController) {
    _phyAnalysisAbortController.abort();
    _phyAnalysisAbortController = null;
  }

  isAnalyzing = false;
  setReducedEffects(false);
  stopAnalysisStepFlow();

  const scanOverlay = getEl('scanOverlay');
  if (scanOverlay) scanOverlay.style.display = 'none';

  if (shouldResetStatus && options.message) {
    updateStatus(options.message);
  }
}

function canvasToBlobAsync(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new Error('CANVAS_BLOB_UNSUPPORTED'));
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('IMAGE_BLOB_EMPTY'));
        return;
      }
      resolve(blob);
    }, mimeType || 'image/jpeg', quality);
  });
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
    img.src = url;
  });
}

async function downscaleImageToBlob(img, maxSide, quality) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxSide ? (maxSide / longest) : 1;
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('CANVAS_CONTEXT_UNAVAILABLE');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  return canvasToBlobAsync(canvas, 'image/jpeg', quality);
}

async function prepareImageVariants(file) {
  if (!file || !/^image\//i.test(file.type || '')) {
    throw new Error('지원하지 않는 파일 형식입니다.');
  }
  if (file.size > PHY_IMAGE_HARD_LIMIT_BYTES) {
    throw new Error('20MB 초과 이미지는 지원하지 않습니다. 다른 이미지를 선택해 주세요.');
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const sourceImage = await loadImageFromUrl(sourceUrl);
    const analysisQuality = file.size > PHY_IMAGE_RECOMPRESS_BYTES ? 0.78 : PHY_ANALYSIS_QUALITY;

    const previewBlob = await downscaleImageToBlob(sourceImage, PHY_PREVIEW_MAX_SIDE, PHY_PREVIEW_QUALITY);
    const analysisBlob = await downscaleImageToBlob(sourceImage, PHY_ANALYSIS_MAX_SIDE, analysisQuality);

    return {
      previewUrl: URL.createObjectURL(previewBlob),
      analysisUrl: URL.createObjectURL(analysisBlob),
      analysisBlob,
      sourceWidth: sourceImage.naturalWidth || sourceImage.width,
      sourceHeight: sourceImage.naturalHeight || sourceImage.height
    };
  } finally {
    revokeObjectUrlSafe(sourceUrl);
  }
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
      title: '눈/코/입/이마/턱 특징',
      body: `<p>${featureSnapshotText}</p>`
    },
    {
      title: '성향 해석',
      body: `<p>${personalityText}</p><p>강점이 발휘되는 장면에서는 판단 속도와 표현 밀도가 함께 올라가는 경향이 있습니다.</p>`
    },
    {
      title: '매력 포인트',
      body: `<p>${result.primaryAnimal || '이 동물상'}의 핵심 매력은 첫 인상에서 남는 분위기와 관계 몰입의 깊이입니다.</p><p>중요한 자리에서는 표정과 말의 템포를 한 박자 늦추면 신뢰감이 훨씬 선명하게 전달됩니다.</p>`
    },
    {
      title: '인간관계 스타일',
      body: `<p>관계에서는 상대 반응의 속도를 읽고 대화 강도를 미세 조정할 때 가장 좋은 결과가 나옵니다.</p><p>감정이 올라오는 순간에는 결론보다 확인 질문을 먼저 두는 방식이 오해를 크게 줄여줍니다.</p>`
    },
    {
      title: '직업/재물 경향',
      body: `<p>${careerText}</p><p>${wealthText}</p>`
    },
    {
      title: '연애/궁합 분위기',
      body: `<p>${loveText}</p>`
    },
    {
      title: '종합 조언',
      body: `<p>이번 결과를 고정 성격으로 단정하기보다, 이번 주에 적용할 행동 2가지를 정해 실행해 보세요.</p><p>표정 습관과 소통 템포를 미세 조정하면 관상 해석이 실제 성과와 관계 개선으로 연결됩니다.</p>`
    }
  ];
}

function renderSectionCards(container, sections) {
  if (!container) return;
  clearSectionRenderTimers();
  container.innerHTML = '';

  sections.forEach((section, index) => {
    const timerId = setTimeout(() => {
      const card = document.createElement('section');
      card.className = 'phy-section-card';

      const details = document.createElement('details');
      details.className = 'phy-section-details';
      if (index < 3) details.open = true;

      const summary = document.createElement('summary');
      summary.className = 'phy-section-summary';
      summary.innerHTML = `<span>${index + 1}. ${section.title}</span><span class="phy-section-hint">${index < 3 ? '핵심' : '자세히 보기'}</span>`;

      const body = document.createElement('div');
      body.className = 'phy-section-body';
      body.innerHTML = section.body;

      details.appendChild(summary);
      details.appendChild(body);
      card.appendChild(details);
      container.appendChild(card);

      requestAnimationFrame(() => {
        card.classList.add('is-visible');
      });
    }, index * 70);
    _phySectionRenderTimers.push(timerId);
  });
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

function loadMediaPipeScripts() {
  return new Promise((resolve, reject) => {
    if (window.FaceMesh) { resolve(); return; }
    let loadedCount = 0;
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
    ];
    scripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src; script.crossOrigin = 'anonymous';
      script.onload = () => { if(++loadedCount === scripts.length) resolve(); };
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  });
}

function onResults(results) {
  if(!canvasCtx) return;
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
  faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  faceMesh.setOptions({
    maxNumFaces: 1, refineLandmarks: true,
    minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
  });
  faceMesh.onResults(onResults);

  if(currentMode === 'camera') {
    camera = createCustomCamera(
      videoElement,
      async () => { if(currentMode === 'camera' && !analysisComplete) { if (++_phyFrameCount % 2 === 0) await faceMesh.send({image: videoElement}); } },
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
  clearSectionRenderTimers();
  updateStatus('AI 데이터 기반 관상 모델 로딩 중...');
  resetPhysiognomyApp();
  try {
    await loadMediaPipeScripts();
    await startMediaPipe();
    if (window.faceAnalysisEngine) {
      await window.faceAnalysisEngine.loadDatabase();
      // face-api.js 표정 분석 모델 비동기 로드 (실패해도 기본 분석은 동작)
      window.faceAnalysisEngine.loadFaceApiModels().catch(() => {});
    }
  } catch (e) {
    updateStatus('로딩 중 오류 발생. 새로고침 후 다시 시도해주세요.');
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
  clearSectionRenderTimers();
  isAnalyzing = false;
  analysisComplete = false;
  landmarksData = null;
  if (!preserveCompat) {
    compatMode = false;
    firstAnalysisResult = null;
    secondAnalysisResult = null;
  }
  document.getElementById('phyResult').style.display = "none";
  document.getElementById('scanOverlay').style.display = "none";
  document.getElementById('captureBtn').style.display = "none";
  document.getElementById('captureBtn').disabled = false;
  document.getElementById('compatStartBtn').style.display = "none";
  document.getElementById('expertReportContainer').innerHTML = "";
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

  const fileInput = document.getElementById('phyFileInput');
  if (fileInput) fileInput.value = '';

  const uploadToken = ++_phyUploadToken;
  const isInCompatMode = compatMode && firstAnalysisResult;
  resetPhysiognomyApp(isInCompatMode);
  showPreviewSkeleton(true);

  if (file.size > PHY_IMAGE_SOFT_LIMIT_BYTES) {
    updateStatus('10MB 이상 이미지입니다. 자동 압축 후 분석 준비를 진행합니다.');
  } else if (isInCompatMode) {
    updateStatus('상대방 이미지 최적화 중... (기기 내 보안 처리)');
  } else {
    updateStatus('이미지 최적화 중... (기기 내 보안 처리)');
  }

  try {
    await waitForUiFrame();
    const prepared = await prepareImageVariants(file);
    if (uploadToken !== _phyUploadToken) return;

    clearPreparedImageResources();
    _phyCurrentPreviewUrl = prepared.previewUrl;
    _phyCurrentAnalysisUrl = prepared.analysisUrl;
    _phyPendingAnalysisBlob = prepared.analysisBlob;

    const imgEl = document.getElementById('phyImage');
    if (!imgEl) return;

    imgEl.onload = async () => {
      if (uploadToken !== _phyUploadToken) return;
      showPreviewSkeleton(false);

      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(imgEl, 0, 0, canvasElement.width, canvasElement.height);
      }

      updateStatus('귀와 이목구비의 468개 랜드마크를 추출 중입니다...');

      if (!faceMesh) return;
      try {
        if (typeof faceMesh.reset === 'function') {
          faceMesh.reset();
        }

        const analysisImg = await loadImageFromUrl(_phyCurrentAnalysisUrl || _phyCurrentPreviewUrl);
        _phyAnalysisSourceEl = analysisImg;

        await waitForUiFrame();
        if (uploadToken !== _phyUploadToken) return;
        await faceMesh.send({ image: analysisImg });
      } catch (err) {
        console.error('이미지 랜드마크 추출 실패:', err);
        updateStatus('이미지 분석 중 오류가 발생했습니다. 다른 이미지를 선택해 주세요.');
      }
    };

    imgEl.src = _phyCurrentPreviewUrl;
  } catch (err) {
    console.error('이미지 전처리 실패:', err);
    showPreviewSkeleton(false);
    updateStatus(err && err.message ? err.message : '이미지를 처리하지 못했습니다. 다른 파일로 다시 시도해 주세요.');
  }
}

window.startCapture = async function() {
  if (Date.now() < _phyScrollSuppressUntil) return;
  if (isAnalyzing) return;
  if (!landmarksData) {
    alert('얼굴이 제대로 인식되지 않았습니다. 밝은 곳에서 다시 시도해주세요.');
    return;
  }

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

  try {
    await waitForUiFrame();
    await waitForUiFrame();
    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');
    if (!window.faceAnalysisEngine) throw new Error('분석 엔진 부재');

    let expressionData = null;
    try {
      const mediaSource = (typeof currentMode !== 'undefined' && currentMode === 'file')
        ? (_phyAnalysisSourceEl || document.getElementById('phyImage'))
        : document.getElementById('phyVideo');
      if (mediaSource && window.faceAnalysisEngine.faceApiModelsLoaded) {
        expressionData = await window.faceAnalysisEngine.detectExpressions(mediaSource);
      }
    } catch (exErr) {
      console.warn('표정 감지 실패(무시):', exErr);
    }

    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');
    const result = await window.faceAnalysisEngine.analyze(landmarksData, expressionData);
    if (controller.signal.aborted) throw new Error('ANALYSIS_ABORTED');

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
    setAnalysisStageMessage('분석 중 문제가 발생했습니다.');
    setAnalysisStageSub('이미지를 다시 선택하거나 새로고침 후 재시도해 주세요.');
    const retryBtn = getEl('analysisRetryBtn');
    if (retryBtn) retryBtn.style.display = 'inline-flex';
    updateStatus('분석 실패: ' + (error && error.message ? error.message : error));

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
    if (result && result.expertReportHtml) {
      const sections = createResultSections(result);
      renderSectionCards(reportContainer, sections);
    } else {
      reportContainer.innerHTML = "<div style='padding:20px;'>분석 결과를 불러올 수 없습니다.</div>";
    }
  }

  document.getElementById('phyResult').style.display = 'block';

  if (!compatMode) {
    document.getElementById('compatStartBtn').style.display = 'block';
  }

  setTimeout(scrollResultToTop, 120);
}

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

    // ── 관상 궁합 50코인 게이트 (공통 게이트 경유) ──
    (function () {
      if (typeof window._cdCoinGatePerUse !== 'function') {
        window.alert('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
        return;
      }

      window._cdCoinGatePerUse(50, '관상 궁합 이용', function () {
        // 코인 차감 성공 → 궁합 모드 시작
        compatMode = true;
        _phyUploadToken += 1;

        // UI 리셋하되 궁합 상태는 유지
        isAnalyzing = false;
        analysisComplete = false;
        landmarksData = null;
        document.getElementById('phyResult').style.display = 'none';
        document.getElementById('scanOverlay').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'none';
        document.getElementById('expertReportContainer').innerHTML = '';
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
      });
    })();
  }

  // 궁합 결과 렌더링
  function renderCompatResult(compatResult) {
    stopAnalysisStepFlow();
    clearSectionRenderTimers();
    let emojiNode = document.getElementById('resEmoji');
    emojiNode.innerText = '💕';

    document.getElementById('expertReportContainer').innerHTML = compatResult.compatHtml;
    document.getElementById('compatStartBtn').style.display = 'none';
    document.getElementById('phyResult').style.display = 'block';

    setTimeout(scrollResultToTop, 100);
  }
