/**
 * 손금 라우트가 사용자에게 직접 돌려주는 서버 문구(오류·경고·거부 이유).
 *
 * 로케일은 worker/index.js 가 요청마다 잡아 둔 앰비언트 값(헤더 → body.locale → 쿠키)을 쓴다.
 * 클라이언트 손금 문구(app/palm-reading/_lib/copy.ts)와 같은 범위 — ko·en·ja·zh-CN·zh-TW,
 * 나머지 로케일은 en. 한국어 문구는 종전 그대로 둔다.
 */
import { getAmbientAiLocale } from "./ai-locale-context.js";

const KO = {
  hand: { left: "왼손", right: "오른손" },
  imageTooLarge: "이미지 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.",
  invalidJson: "Request body must be valid JSON.",
  authUnavailable: "일시적인 접속 문제로 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
  loginRequired: "로그인이 필요합니다.",
  missingDominantHand: "dominantHand 입력이 필요합니다.",
  missingAnalysisPurpose: "analysisPurpose 입력이 필요합니다.",
  requestIdRequired: "판독 요청 ID가 필요합니다.",
  missingImage: "left/right 입력 중 최소 하나는 이미지 또는 인식 데이터(lineCandidates/handLandmarks)가 필요합니다.",
  visionUnavailable: "손금 판독이 잠시 원활하지 않아요. 같은 사진으로 다시 시도해 주세요.",
  palmNotDetected: "손바닥 인식에 실패했습니다.",
  rejectedSlot: (hand) => `${hand} 칸 사진에서는 손바닥을 찾지 못했어요.`,
  rejectedSlotFallback: "손바닥이 보이는 사진으로 바꾸거나 그 칸을 비워 주세요.",
  noMajorLines: "사진에서 손금의 주요 선을 찾지 못했어요. 손바닥 전체가 밝고 또렷하게 보이도록 다시 찍어 주세요.",
  imageQualityLow: "이미지 품질이 부족합니다.",
  interpretationIncomplete: "판독을 완료하지 못했어요. 사진과 연결 상태를 확인한 뒤 다시 시도해 주세요.",
  handSideMismatch: (declared, vision) => `${declared} 칸에 올린 사진이 ${vision}처럼 보였어요. 해석은 올려 주신 대로 ${declared} 기준이에요. 손을 바꿔 올렸다면 칸을 확인해 주세요.`,
  resultStorageUnavailable: "저장된 손금 판독을 확인하지 못했어요. 같은 판독으로 다시 시도해 주세요.",
  resultNotFound: "저장된 판독을 찾을 수 없습니다.",
  paidAccessRequired: "이 판독의 결제 내역을 확인해 주세요.",
};

const EN = {
  hand: { left: "left hand", right: "right hand" },
  imageTooLarge: "The photo is too large. Please try again with a smaller photo.",
  invalidJson: "The photo data seems damaged. Please upload a different photo.",
  authUnavailable: "A temporary connection problem is delaying the check. Please try again shortly.",
  loginRequired: "Please log in to continue.",
  missingDominantHand: "Please choose the hand you use most, then try again.",
  missingAnalysisPurpose: "Please choose what you want to read, then try again.",
  requestIdRequired: "The reading request ID is missing. Please start the reading again.",
  missingImage: "No palm photo arrived. Please add the photo again, then start the reading.",
  visionUnavailable: "The palm reading is briefly unavailable. Please try again with the same photo.",
  palmNotDetected: "We could not find a palm in the photo.",
  rejectedSlot: (hand) => `We could not find a palm in the ${hand} photo.`,
  rejectedSlotFallback: "Replace it with a photo that shows your palm, or leave that slot empty.",
  noMajorLines: "We could not find the main palm lines in the photo. Please retake it so your whole palm is bright and clear.",
  imageQualityLow: "The photo is not clear enough to read the lines.",
  interpretationIncomplete: "The reading could not be completed. Please check your photo and connection, then try again.",
  handSideMismatch: (declared, vision) => `The photo in the ${declared} slot looks like a ${vision}. The reading follows the ${declared} slot you chose. If you swapped hands, please check the slots.`,
  resultStorageUnavailable: "We could not check the saved palm reading. Please try the same reading again.",
  resultNotFound: "The saved reading could not be found.",
  paidAccessRequired: "Please check the payment for this reading.",
};

const JA = {
  hand: { left: "左手", right: "右手" },
  imageTooLarge: "画像のサイズが大きすぎます。もう少し小さい写真でお試しください。",
  invalidJson: "写真データが破損しているようです。別の写真をアップロードしてください。",
  authUnavailable: "一時的な接続の問題で確認が遅れています。しばらくしてからお試しください。",
  loginRequired: "ログインが必要です。",
  missingDominantHand: "利き手を選んでから、もう一度お試しください。",
  missingAnalysisPurpose: "鑑定の目的を選んでから、もう一度お試しください。",
  requestIdRequired: "鑑定リクエストIDがありません。もう一度鑑定を始めてください。",
  missingImage: "手のひらの写真が届きませんでした。写真をもう一度登録してから鑑定を始めてください。",
  visionUnavailable: "手相の判読が一時的に不安定です。同じ写真でもう一度お試しください。",
  palmNotDetected: "写真から手のひらを認識できませんでした。",
  rejectedSlot: (hand) => `${hand}の欄の写真から手のひらが見つかりませんでした。`,
  rejectedSlotFallback: "手のひらが写った写真に替えるか、その欄を空けてください。",
  noMajorLines: "写真から手相の主要な線が見つかりませんでした。手のひら全体が明るくはっきり写るように撮り直してください。",
  imageQualityLow: "線を読み取れるほど写真が鮮明ではありません。",
  interpretationIncomplete: "鑑定を完了できませんでした。写真と接続状態を確認してから、もう一度お試しください。",
  handSideMismatch: (declared, vision) => `${declared}の欄の写真は${vision}のように見えました。鑑定は選んだとおり${declared}として行っています。手を入れ替えた場合は欄をご確認ください。`,
  resultStorageUnavailable: "保存された手相鑑定を確認できませんでした。同じ鑑定でもう一度お試しください。",
  resultNotFound: "保存された鑑定が見つかりません。",
  paidAccessRequired: "この鑑定の決済内容をご確認ください。",
};

const ZH_CN = {
  hand: { left: "左手", right: "右手" },
  imageTooLarge: "图片太大了，请换一张较小的照片再试。",
  invalidJson: "照片数据似乎已损坏，请上传另一张照片。",
  authUnavailable: "因临时连接问题，验证有所延迟，请稍后再试。",
  loginRequired: "请先登录。",
  missingDominantHand: "请先选择惯用手，然后再试。",
  missingAnalysisPurpose: "请先选择解读目的，然后再试。",
  requestIdRequired: "缺少解读请求 ID，请重新开始解读。",
  missingImage: "没有收到手掌照片，请重新添加照片后再开始解读。",
  visionUnavailable: "手相判读暂时不稳定，请用同一张照片再试一次。",
  palmNotDetected: "照片中没有识别到手掌。",
  rejectedSlot: (hand) => `${hand}栏的照片中没有找到手掌。`,
  rejectedSlotFallback: "请换成能看到手掌的照片，或把该栏留空。",
  noMajorLines: "照片中没有找到手相的主要纹线。请重新拍摄，让整个手掌明亮清晰。",
  imageQualityLow: "照片不够清晰，无法读取掌纹。",
  interpretationIncomplete: "未能完成解读。请检查照片和网络连接后再试。",
  handSideMismatch: (declared, vision) => `${declared}栏的照片看起来像${vision}。解读仍按你选择的${declared}进行。如果放反了手，请检查栏位。`,
  resultStorageUnavailable: "无法确认已保存的手相解读，请用同一解读再试一次。",
  resultNotFound: "找不到已保存的解读。",
  paidAccessRequired: "请确认此解读的付款记录。",
};

const ZH_TW = {
  hand: { left: "左手", right: "右手" },
  imageTooLarge: "圖片太大了，請換一張較小的照片再試。",
  invalidJson: "照片資料似乎已損壞，請上傳另一張照片。",
  authUnavailable: "因暫時的連線問題，驗證有所延遲，請稍後再試。",
  loginRequired: "請先登入。",
  missingDominantHand: "請先選擇慣用手，然後再試。",
  missingAnalysisPurpose: "請先選擇解讀目的，然後再試。",
  requestIdRequired: "缺少解讀請求 ID，請重新開始解讀。",
  missingImage: "沒有收到手掌照片，請重新加入照片後再開始解讀。",
  visionUnavailable: "手相判讀暫時不穩定，請用同一張照片再試一次。",
  palmNotDetected: "照片中沒有辨識到手掌。",
  rejectedSlot: (hand) => `${hand}欄的照片中沒有找到手掌。`,
  rejectedSlotFallback: "請換成看得到手掌的照片，或把該欄留空。",
  noMajorLines: "照片中沒有找到手相的主要紋線。請重新拍攝，讓整個手掌明亮清晰。",
  imageQualityLow: "照片不夠清晰，無法讀取掌紋。",
  interpretationIncomplete: "未能完成解讀。請檢查照片和網路連線後再試。",
  handSideMismatch: (declared, vision) => `${declared}欄的照片看起來像${vision}。解讀仍按你選擇的${declared}進行。如果放反了手，請檢查欄位。`,
  resultStorageUnavailable: "無法確認已儲存的手相解讀，請用同一解讀再試一次。",
  resultNotFound: "找不到已儲存的解讀。",
  paidAccessRequired: "請確認此解讀的付款紀錄。",
};

const COPY = { ko: KO, en: EN, ja: JA, "zh-CN": ZH_CN, "zh-TW": ZH_TW };

/** 앰비언트 로케일이 없으면(cron·직접 호출) 한국어. */
export function palmCopy(locale = getAmbientAiLocale() || "ko") {
  return COPY[locale] || EN;
}
