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
        <canvas id="phyCanvas" width="480" height="480"></canvas>
        <div class="scan-overlay" id="scanOverlay"></div>
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
      
      <button class="action-btn" id="captureBtn" onclick="startCapture()" style="display:none;">
         초정밀 스캔 시작하기
      </button>

      <div class="result-card" id="phyResult">
        <!-- 메인 이모지 뱃지 -->
        <div class="animal-badge" id="resEmoji"></div>
        
        <!-- 고도화된 Expert Report 컨테이너 -->
        <div id="expertReportContainer"></div>



        <button class="action-btn" style="width: 100%; margin-top: 15px; background: #FEE500; color: #3B1E08; border: none; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" onclick="sharePhysiognomyKakao()">💬 카카오톡으로 관상 결과 공유하기</button>
        <button class="action-btn" id="compatStartBtn" style="width: 100%; margin-top: 10px; display:none; background: linear-gradient(135deg, #f472b6 0%, #e11d48 100%); color: #fff; box-shadow: 0 4px 15px rgba(225, 29, 72, 0.4); padding:14px; font-size:1.05rem;" onclick="startCompatMode()">💕 상대방과 관상 궁합 보기</button>
        <button class="action-btn" style="width: 100%; margin-top: 10px; background: #e2e8f0; color: #475569; box-shadow: none; padding:12px;" onclick="resetPhysiognomyApp()"> 다른 사진으로 분석하기</button>
        <button class="action-btn" style="width: 100%; margin-top: 10px; background: #fff; color: #475569; border: 1px solid #cbd5e1; box-shadow: none; padding:12px;" onclick="closePhysiognomyApp()"> 메인 화면으로 돌아가기</button>
      </div>
    </div>
  </div>
`;
document.body.insertAdjacentHTML('beforeend', appHtml);

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
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
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
        drawConnectors(canvasCtx, landmarksData, FACEMESH_TESSELATION, {color: '#10b98144', lineWidth: 1});
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

async function startMediaPipe() {
  faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
  faceMesh.setOptions({
    maxNumFaces: 1, refineLandmarks: true,
    minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
  });
  faceMesh.onResults(onResults);

  if(currentMode === 'camera') {
    camera = new Camera(videoElement, {
      onFrame: async () => { if(currentMode === 'camera' && !analysisComplete) { await faceMesh.send({image: videoElement}); } },
      width: 480, height: 480
    });
    camera.start();
  }
}

window.openPhysiognomyApp = async function() {
  videoElement = document.getElementById('phyVideo');
  canvasElement = document.getElementById('phyCanvas');
  canvasCtx = canvasElement.getContext('2d');
  document.getElementById('physiognomy-app').style.display = "flex";
  document.getElementById('phyStatus').innerText = "AI 데이터 기반 관상 모델 로딩 중...";
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
    document.getElementById('phyStatus').innerText = "로딩 중 오류 발생. 새로고침 후 다시 시도해주세요.";
  }
}

window.closePhysiognomyApp = function() {
  document.getElementById('physiognomy-app').style.display = "none";
  if (camera) camera.stop();
}

window.resetPhysiognomyApp = function(preserveCompat) {
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
  document.getElementById('compatStartBtn').style.display = "none";
  document.getElementById('expertReportContainer').innerHTML = "";
    
    // 궁합 모드일 때는 이미지 초기화 생략 (두 번째 사진 업로드에 영향)
    if (!preserveCompat) {
      const imgEl = document.getElementById('phyImage');
      if(imgEl) {
          imgEl.src = "";
          imgEl.onload = null;
      }
    }

  if(canvasCtx) canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);
  if (preserveCompat) {
    // 궁합 모드 유지 시 안내 텍스트
    document.getElementById('phyStatus').innerText = "상대방의 사진을 업로드해주세요.";
  } else if(currentMode === 'camera') {
    document.getElementById('phyStatus').innerText = "카메라 정면에서 화면 중앙에 얼굴을 맞춰주세요.";
  } else {
    document.getElementById('phyStatus').innerText = "관상을 분석할 사진을 선택해주세요.";
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
    const file = event.target.files[0];
    if(!file) return;

      const fileInput = document.getElementById('phyFileInput');
      if (fileInput) fileInput.value = ''; // 값을 초기화하여 같은 파일도 다시 선택 가능하게 함

      // 궁합 모드일 때는 상태 보존
      const isInCompatMode = compatMode && firstAnalysisResult;
      resetPhysiognomyApp(isInCompatMode);
      if (isInCompatMode) {
        document.getElementById('phyStatus').innerText = "상대방 이미지 딥러닝 스캔 중... (기기 내 보안 처리)";
      } else {
        document.getElementById('phyStatus').innerText = "이미지 딥러닝 스캔 중... (기기 내 보안 처리)";
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgEl = document.getElementById('phyImage');
        imgEl.onload = async () => {
          if(canvasCtx) {
             canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
             canvasCtx.drawImage(imgEl, 0, 0, canvasElement.width, canvasElement.height);
          }
          document.getElementById('phyStatus').innerText = "귀와 이목구비의 468개 랜드마크를 추출 중입니다...";
          
          if(faceMesh) {
            try {
              // faceMesh 내부 상태(특히 타임스탬프)를 초기화하여 연속적인 정적 이미지 분석이 무시되는 문제 해결
              if (typeof faceMesh.reset === 'function') {
                faceMesh.reset();
              }
              await faceMesh.send({image: imgEl});
            } catch (err) {
              
              document.getElementById('phyStatus').innerText = "이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.";
            }
          }
        };
        imgEl.src = e.target.result;
      };
      reader.readAsDataURL(file);
  }

  window.startCapture = async function() {
    if (!landmarksData) { alert("얼굴이 제대로 인식되지 않았습니다. 밝은 곳에서 다시 시도해주세요."); return; }
    isAnalyzing = true;
    document.getElementById('captureBtn').style.display = "none";
    document.getElementById('scanOverlay').style.display = "block";
    document.getElementById('phyStatus').innerText = "상/중/하정 밸런스 및 이상(귀) 수치 정밀 분석 중... ";

    try {
      await new Promise(resolve => setTimeout(resolve, 2500));
      if(!window.faceAnalysisEngine) throw new Error("분석 엔진 부재");

      // face-api.js 표정 감지 (실패 시 null → 기하학 분석만으로 동작)
      let expressionData = null;
      try {
        const mediaSource = (typeof currentMode !== 'undefined' && currentMode === 'file')
          ? document.getElementById('phyImage')
          : document.getElementById('phyVideo');
        if (mediaSource && window.faceAnalysisEngine.faceApiModelsLoaded) {
          expressionData = await window.faceAnalysisEngine.detectExpressions(mediaSource);
        }
      } catch(exErr) { /* 표정 감지 실패 무시 */ }

      const result = await window.faceAnalysisEngine.analyze(landmarksData, expressionData);
      
      analysisComplete = true;
      document.getElementById('scanOverlay').style.display = "none";

      // 궁합 모드 분기 처리
      if (compatMode && firstAnalysisResult) {
        // 두 번째 사람 분석 완료 → 궁합 결과 산출
        secondAnalysisResult = result;
        document.getElementById('phyStatus').innerHTML = `<div style="text-align:center;">
          <div style="font-size:1.1rem; font-weight:800; color:#f472b6;">💕 궁합 분석 완료!</div>
          <div style="font-size:0.85rem; color:#a7f3d0; margin-top:4px;">${firstAnalysisResult.emoji} ${firstAnalysisResult.primaryAnimal} × ${secondAnalysisResult.emoji} ${secondAnalysisResult.primaryAnimal}</div>
        </div>`;

        try {
          const compatResult = window.faceAnalysisEngine.calculateCompatibility(firstAnalysisResult, secondAnalysisResult);
          if (compatResult && compatResult.compatHtml) {
            renderCompatResult(compatResult);
          } else {
            throw new Error('궁합 결과 생성 실패');
          }
        } catch (compatErr) {
          console.error('궁합 분석 오류:', compatErr);
          // 궁합 분석 실패 시에도 기본 결과 표시
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
        // 일반 분석 또는 첫 번째 분석
        firstAnalysisResult = result;
        document.getElementById('phyStatus').innerText = " 초정밀 관상 분석이 100% 완료되었습니다!";
        renderResult(result);
      }
    } catch (error) {
      
      document.getElementById('phyStatus').innerText = "분석 실패: " + (error.message || error);
      document.getElementById('captureBtn').style.display = "block";
      isAnalyzing = false;
    }
  }

  function renderResult(result) {
    let emojiNode = document.getElementById('resEmoji');
    emojiNode.innerText = result.emoji || '';
    
    // 전문가 리포트 삽입
    if(result.expertReportHtml) {
        document.getElementById('expertReportContainer').innerHTML = result.expertReportHtml;
    } else {
        document.getElementById('expertReportContainer').innerHTML = "<div style='padding:20px;'>분석 결과를 불러올 수 없습니다.</div>";
    }

    document.getElementById('phyResult').style.display = "block";

    // 궁합 모드가 아닐 때만 궁합 버튼 표시
    if (!compatMode) {
      document.getElementById('compatStartBtn').style.display = 'block';
    }

    setTimeout(scrollResultToTop, 100);
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
    compatMode = true;

    // UI 리셋하되 궁합 상태는 유지
    isAnalyzing = false;
    analysisComplete = false;
    landmarksData = null;
    document.getElementById('phyResult').style.display = 'none';
    document.getElementById('scanOverlay').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('expertReportContainer').innerHTML = '';

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
  }

  // 궁합 결과 렌더링
  function renderCompatResult(compatResult) {
    let emojiNode = document.getElementById('resEmoji');
    emojiNode.innerText = '💕';

    document.getElementById('expertReportContainer').innerHTML = compatResult.compatHtml;
    document.getElementById('compatStartBtn').style.display = 'none';
    document.getElementById('phyResult').style.display = 'block';

    setTimeout(scrollResultToTop, 100);
  }
