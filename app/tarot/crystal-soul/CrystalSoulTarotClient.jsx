"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, Gem as GemIcon, Home, Loader2, RotateCcw, Share2, Sparkles } from "lucide-react";
import { getCurrentLoadingLocale, normalizeLoadingLocale } from "@/constants/loadingMessages";
import CrystalGem, { GEM_META, getGemColor } from "@/src/components/crystal/CrystalGem";
import { useRubInteraction } from "@/src/components/crystal/useRubInteraction";
import { lookupServerCoinPrice } from "@/app/_lib/serviceFeatureRegistry";
import { useCoinGate } from "../../hooks/useCoinGate";
import { usePaidResume } from "../../hooks/usePaidResume";

const CRYSTAL_COST = 50;
const CRYSTAL_COST_KRW = CRYSTAL_COST * 100; // 코인은 폐지된 내부 계산 단위, 사용자 표시는 항상 원화(KRW_PER_COIN=100)
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const GEM_TYPES = [
  "amethyst",
  "rose_quartz",
  "obsidian",
  "moonstone",
  "lapis",
  "citrine",
  "black_tourmaline",
  "tiger_eye",
  "clear_quartz",
  "green_aventurine",
  "garnet",
  "labradorite",
];

const POSITION_LABELS = [
  "원석의 첫 번째 빛",
  "가려진 면",
  "원석이 보내는 경고",
  "크리스탈의 처방",
  "빛이 열어줄 문",
];

const CRYSTAL_UI_COPY = {
  ko: {
    title: "원석 소울 타로",
    subtitle: "손이 멈추는 원석이 오늘의 기운입니다",
    selectAria: "원석 선택",
    chooseGemAgain: "원석 다시 고르기",
    selectedGem: "✦ {gem}이 선택되었습니다 ✦",
    rubProgressLabel: "문지르기 진행률 {progress}%",
    rubHint: "원석에 손을 얹고 천천히 문질러 주세요",
    rubSubHint: "당신의 에너지가 카드를 깨웁니다",
    readerFallback: "{gem}의 질문을 마음속에 담고 카드를 한 장씩 열어 주세요.",
    openingCards: "카드의 빛을 여는 중",
    openReading: "카드 리딩 열기 ({cost}원)",
    spreadAria: "5장 원석 타로 스프레드",
    positionPrefix: "포지션",
    resultHeader: "원석 소울 타로 결과",
    gemMessageTitle: "✦ {gem}이 전하는 오늘의 메시지",
    detailDivider: "카드별 상세 해석",
    promptDivider: "추가 운세 프롬프트",
    promptAria: "추가 운세 프롬프트",
    promptHeader: "✦ 마지막 원석 문장",
    copied: "복사 완료",
    copy: "복사",
    share: "공유",
    retry: "다시 뽑기",
    home: "홈",
    shareTitle: "원석 소울 타로",
    paymentReason: "크리스탈 소울 타로 리딩",
    loginRequired: "로그인이 필요합니다. 로그인 화면으로 이동합니다.",
    paymentFailed: "결제를 완료하지 못했습니다.",
    readingError: "리딩을 여는 과정에서 오류가 발생했습니다.",
    openFailed: "카드의 빛을 여는 데 실패했습니다. 잠시 후 다시 시도해 주세요.",
    positionLabels: POSITION_LABELS,
  },
  en: {
    title: "Crystal Soul Tarot",
    subtitle: "The stone your hand chooses carries today's energy",
    selectAria: "Choose a crystal",
    chooseGemAgain: "Choose another crystal",
    selectedGem: "✦ {gem} has been chosen ✦",
    rubProgressLabel: "Rubbing progress {progress}%",
    rubHint: "Place your hand on the crystal and rub slowly",
    rubSubHint: "Your energy awakens the cards",
    readerFallback: "Hold your question inside {gem} and open each card one by one.",
    openingCards: "Opening the light of the cards",
    openReading: "Open card reading ({cost} KRW)",
    spreadAria: "Five-card crystal tarot spread",
    positionPrefix: "Position",
    resultHeader: "Crystal Soul Tarot Result",
    gemMessageTitle: "✦ Today's message from {gem}",
    detailDivider: "Detailed card interpretations",
    promptDivider: "Extra fortune prompt",
    promptAria: "Extra fortune prompt",
    promptHeader: "✦ Final crystal sentence",
    copied: "Copied",
    copy: "Copy",
    share: "Share",
    retry: "Draw again",
    home: "Home",
    shareTitle: "Crystal Soul Tarot",
    paymentReason: "Crystal Soul Tarot reading",
    loginRequired: "Login is required. Moving to the login screen.",
    paymentFailed: "Payment could not be completed.",
    readingError: "An error occurred while opening the reading.",
    openFailed: "The card light could not be opened. Please try again shortly.",
    positionLabels: ["The crystal's first light", "Hidden side", "Warning from the crystal", "Crystal prescription", "The door opened by light"],
  },
  ja: {
    title: "クリスタルソウルタロット",
    subtitle: "手が止まる天然石が、今日の気配を映します",
    selectAria: "天然石を選択",
    chooseGemAgain: "天然石を選び直す",
    selectedGem: "✦ {gem}が選ばれました ✦",
    rubProgressLabel: "こする進行率 {progress}%",
    rubHint: "天然石に手を重ね、ゆっくりなでてください",
    rubSubHint: "あなたのエネルギーがカードを目覚めさせます",
    readerFallback: "{gem}に問いをそっと預け、カードを一枚ずつ開いてください。",
    openingCards: "カードの光を開いています",
    openReading: "カードリーディングを開く（{cost}ウォン）",
    spreadAria: "5枚クリスタルタロットスプレッド",
    positionPrefix: "ポジション",
    resultHeader: "クリスタルソウルタロット結果",
    gemMessageTitle: "✦ {gem}が伝える今日のメッセージ",
    detailDivider: "カード別の詳しい解釈",
    promptDivider: "追加の占いプロンプト",
    promptAria: "追加の占いプロンプト",
    promptHeader: "✦ 最後のクリスタルメッセージ",
    copied: "コピーしました",
    copy: "コピー",
    share: "共有",
    retry: "もう一度引く",
    home: "ホーム",
    shareTitle: "クリスタルソウルタロット",
    paymentReason: "クリスタルソウルタロットリーディング",
    loginRequired: "ログインが必要です。ログイン画面へ移動します。",
    paymentFailed: "決済を完了できませんでした。",
    readingError: "リーディングを開く途中でエラーが発生しました。",
    openFailed: "カードの光を開けませんでした。しばらくしてからもう一度お試しください。",
    positionLabels: ["天然石の最初の光", "隠れた面", "天然石からの警告", "クリスタルの処方", "光が開く扉"],
  },
  "zh-CN": {
    title: "水晶灵魂塔罗",
    subtitle: "让手停下的那颗原石，就是今天的能量",
    selectAria: "选择原石",
    chooseGemAgain: "重新选择原石",
    selectedGem: "✦ 已选择 {gem} ✦",
    rubProgressLabel: "摩挲进度 {progress}%",
    rubHint: "把手放在原石上，慢慢摩挲",
    rubSubHint: "你的能量正在唤醒牌面",
    readerFallback: "把问题交给 {gem}，然后一张一张打开牌。",
    openingCards: "正在开启牌的光",
    openReading: "开启卡牌解读（{cost}韩元）",
    spreadAria: "五张原石塔罗牌阵",
    positionPrefix: "位置",
    resultHeader: "水晶灵魂塔罗结果",
    gemMessageTitle: "✦ {gem}传来的今日讯息",
    detailDivider: "逐张牌详细解读",
    promptDivider: "追加运势提示词",
    promptAria: "追加运势提示词",
    promptHeader: "✦ 最后的原石语句",
    copied: "已复制",
    copy: "复制",
    share: "分享",
    retry: "重新抽取",
    home: "首页",
    shareTitle: "水晶灵魂塔罗",
    paymentReason: "水晶灵魂塔罗解读",
    loginRequired: "需要登录。正在前往登录页面。",
    paymentFailed: "未能完成支付。",
    readingError: "开启解读时发生错误。",
    openFailed: "未能开启牌的光。请稍后再试。",
    positionLabels: ["原石的第一道光", "被遮住的一面", "原石送来的提醒", "水晶处方", "光将打开的门"],
  },
  "zh-TW": {
    title: "水晶靈魂塔羅",
    subtitle: "讓手停下的那顆原石，就是今天的能量",
    selectAria: "選擇原石",
    chooseGemAgain: "重新選擇原石",
    selectedGem: "✦ 已選擇 {gem} ✦",
    rubProgressLabel: "摩挲進度 {progress}%",
    rubHint: "把手放在原石上，慢慢摩挲",
    rubSubHint: "你的能量正在喚醒牌面",
    readerFallback: "把問題交給 {gem}，然後一張一張打開牌。",
    openingCards: "正在開啟牌的光",
    openReading: "開啟卡牌解讀（{cost}韓元）",
    spreadAria: "五張原石塔羅牌陣",
    positionPrefix: "位置",
    resultHeader: "水晶靈魂塔羅結果",
    gemMessageTitle: "✦ {gem}傳來的今日訊息",
    detailDivider: "逐張牌詳細解讀",
    promptDivider: "追加運勢提示詞",
    promptAria: "追加運勢提示詞",
    promptHeader: "✦ 最後的原石語句",
    copied: "已複製",
    copy: "複製",
    share: "分享",
    retry: "重新抽取",
    home: "首頁",
    shareTitle: "水晶靈魂塔羅",
    paymentReason: "水晶靈魂塔羅解讀",
    loginRequired: "需要登入。正在前往登入頁面。",
    paymentFailed: "未能完成付款。",
    readingError: "開啟解讀時發生錯誤。",
    openFailed: "未能開啟牌的光。請稍後再試。",
    positionLabels: ["原石的第一道光", "被遮住的一面", "原石送來的提醒", "水晶處方", "光將打開的門"],
  },
  vi: {
    title: "Tarot Linh Hồn Pha Lê",
    subtitle: "Viên đá khiến tay bạn dừng lại chính là năng lượng hôm nay",
    selectAria: "Chọn đá",
    chooseGemAgain: "Chọn lại viên đá",
    selectedGem: "✦ {gem} đã được chọn ✦",
    rubProgressLabel: "Tiến độ chạm đá {progress}%",
    rubHint: "Đặt tay lên viên đá và xoa thật chậm",
    rubSubHint: "Năng lượng của bạn đánh thức các lá bài",
    readerFallback: "Giữ câu hỏi trong {gem} rồi mở từng lá bài.",
    openingCards: "Đang mở ánh sáng của lá bài",
    openReading: "Mở bài đọc ({cost} KRW)",
    spreadAria: "Trải bài tarot pha lê 5 lá",
    positionPrefix: "Vị trí",
    resultHeader: "Kết quả Tarot Linh Hồn Pha Lê",
    gemMessageTitle: "✦ Thông điệp hôm nay từ {gem}",
    detailDivider: "Diễn giải chi tiết từng lá",
    promptDivider: "Prompt vận mệnh bổ sung",
    promptAria: "Prompt vận mệnh bổ sung",
    promptHeader: "✦ Câu pha lê cuối cùng",
    copied: "Đã sao chép",
    copy: "Sao chép",
    share: "Chia sẻ",
    retry: "Rút lại",
    home: "Trang chủ",
    shareTitle: "Tarot Linh Hồn Pha Lê",
    paymentReason: "Bài đọc Tarot Linh Hồn Pha Lê",
    loginRequired: "Cần đăng nhập. Đang chuyển đến màn hình đăng nhập.",
    paymentFailed: "Không thể hoàn tất thanh toán.",
    readingError: "Đã xảy ra lỗi khi mở bài đọc.",
    openFailed: "Không thể mở ánh sáng của lá bài. Vui lòng thử lại sau.",
    positionLabels: ["Ánh sáng đầu tiên của viên đá", "Mặt bị che khuất", "Lời cảnh báo từ viên đá", "Phương thuốc pha lê", "Cánh cửa ánh sáng mở ra"],
  },
  hi: {
    title: "Crystal Soul Tarot",
    subtitle: "जिस पत्थर पर हाथ ठहरे, वही आज की ऊर्जा है",
    selectAria: "क्रिस्टल चुनें",
    chooseGemAgain: "क्रिस्टल फिर चुनें",
    selectedGem: "✦ {gem} चुना गया है ✦",
    rubProgressLabel: "रबिंग प्रगति {progress}%",
    rubHint: "क्रिस्टल पर हाथ रखें और धीरे-धीरे रगड़ें",
    rubSubHint: "आपकी ऊर्जा कार्डों को जगाती है",
    readerFallback: "{gem} में अपना प्रश्न रखें और कार्ड एक-एक करके खोलें।",
    openingCards: "कार्डों की रोशनी खुल रही है",
    openReading: "कार्ड रीडिंग खोलें ({cost} KRW)",
    spreadAria: "5-card crystal tarot spread",
    positionPrefix: "Position",
    resultHeader: "Crystal Soul Tarot Result",
    gemMessageTitle: "✦ {gem} से आज का संदेश",
    detailDivider: "हर कार्ड की विस्तृत रीडिंग",
    promptDivider: "अतिरिक्त fortune prompt",
    promptAria: "अतिरिक्त fortune prompt",
    promptHeader: "✦ अंतिम crystal sentence",
    copied: "कॉपी हो गया",
    copy: "कॉपी",
    share: "शेयर",
    retry: "फिर चुनें",
    home: "होम",
    shareTitle: "Crystal Soul Tarot",
    paymentReason: "Crystal Soul Tarot reading",
    loginRequired: "लॉगिन आवश्यक है। लॉगिन स्क्रीन पर जा रहे हैं।",
    paymentFailed: "भुगतान पूरा नहीं हो सका।",
    readingError: "रीडिंग खोलते समय त्रुटि हुई।",
    openFailed: "कार्डों की रोशनी नहीं खुल सकी। कृपया थोड़ी देर बाद फिर कोशिश करें।",
    positionLabels: ["Crystal की पहली रोशनी", "छिपा पहलू", "Crystal की चेतावनी", "Crystal prescription", "रोशनी से खुलता द्वार"],
  },
  es: {
    title: "Tarot del Alma de Cristal",
    subtitle: "La piedra donde se detiene tu mano trae la energía de hoy",
    selectAria: "Elegir cristal",
    chooseGemAgain: "Elegir otra piedra",
    selectedGem: "✦ {gem} ha sido elegido ✦",
    rubProgressLabel: "Progreso de frotar {progress}%",
    rubHint: "Pon la mano sobre la piedra y frótala despacio",
    rubSubHint: "Tu energía despierta las cartas",
    readerFallback: "Guarda tu pregunta en {gem} y abre las cartas una por una.",
    openingCards: "Abriendo la luz de las cartas",
    openReading: "Abrir lectura de cartas ({cost} KRW)",
    spreadAria: "Tirada de tarot cristalino de 5 cartas",
    positionPrefix: "Posición",
    resultHeader: "Resultado del Tarot del Alma de Cristal",
    gemMessageTitle: "✦ Mensaje de hoy de {gem}",
    detailDivider: "Interpretación detallada por carta",
    promptDivider: "Prompt de fortuna adicional",
    promptAria: "Prompt de fortuna adicional",
    promptHeader: "✦ Última frase del cristal",
    copied: "Copiado",
    copy: "Copiar",
    share: "Compartir",
    retry: "Volver a sacar",
    home: "Inicio",
    shareTitle: "Tarot del Alma de Cristal",
    paymentReason: "Lectura de Tarot del Alma de Cristal",
    loginRequired: "Debes iniciar sesión. Te llevamos a la pantalla de inicio.",
    paymentFailed: "No se pudo completar el pago.",
    readingError: "Ocurrió un error al abrir la lectura.",
    openFailed: "No se pudo abrir la luz de las cartas. Inténtalo de nuevo en un momento.",
    positionLabels: ["Primera luz de la piedra", "Lado oculto", "Advertencia de la piedra", "Receta del cristal", "Puerta que abre la luz"],
  },
  fr: {
    title: "Tarot de l'Âme Cristal",
    subtitle: "La pierre où votre main s'arrête porte l'énergie du jour",
    selectAria: "Choisir un cristal",
    chooseGemAgain: "Choisir une autre pierre",
    selectedGem: "✦ {gem} a été choisi ✦",
    rubProgressLabel: "Progression du geste {progress}%",
    rubHint: "Posez la main sur la pierre et frottez lentement",
    rubSubHint: "Votre énergie éveille les cartes",
    readerFallback: "Déposez votre question dans {gem} et ouvrez les cartes une à une.",
    openingCards: "Ouverture de la lumière des cartes",
    openReading: "Ouvrir la lecture ({cost} KRW)",
    spreadAria: "Tirage tarot cristal en 5 cartes",
    positionPrefix: "Position",
    resultHeader: "Résultat du Tarot de l'Âme Cristal",
    gemMessageTitle: "✦ Message du jour de {gem}",
    detailDivider: "Interprétation détaillée par carte",
    promptDivider: "Prompt d'oracle supplémentaire",
    promptAria: "Prompt d'oracle supplémentaire",
    promptHeader: "✦ Dernière phrase du cristal",
    copied: "Copié",
    copy: "Copier",
    share: "Partager",
    retry: "Tirer à nouveau",
    home: "Accueil",
    shareTitle: "Tarot de l'Âme Cristal",
    paymentReason: "Lecture Tarot de l'Âme Cristal",
    loginRequired: "Connexion requise. Redirection vers l'écran de connexion.",
    paymentFailed: "Le paiement n'a pas pu être terminé.",
    readingError: "Une erreur est survenue pendant l'ouverture de la lecture.",
    openFailed: "La lumière des cartes n'a pas pu s'ouvrir. Veuillez réessayer dans un instant.",
    positionLabels: ["Première lumière de la pierre", "Face cachée", "Avertissement de la pierre", "Prescription du cristal", "Porte ouverte par la lumière"],
  },
  de: {
    title: "Kristallseelen-Tarot",
    subtitle: "Der Stein, bei dem deine Hand anhält, trägt die Energie des Tages",
    selectAria: "Kristall auswählen",
    chooseGemAgain: "Anderen Stein wählen",
    selectedGem: "✦ {gem} wurde gewählt ✦",
    rubProgressLabel: "Reibefortschritt {progress}%",
    rubHint: "Lege deine Hand auf den Stein und reibe langsam",
    rubSubHint: "Deine Energie weckt die Karten",
    readerFallback: "Lege deine Frage in {gem} und öffne die Karten nacheinander.",
    openingCards: "Das Licht der Karten öffnet sich",
    openReading: "Kartenlesung öffnen ({cost} KRW)",
    spreadAria: "5-Karten-Kristalltarot-Legung",
    positionPrefix: "Position",
    resultHeader: "Kristallseelen-Tarot Ergebnis",
    gemMessageTitle: "✦ Heutige Botschaft von {gem}",
    detailDivider: "Detaillierte Deutung jeder Karte",
    promptDivider: "Zusätzlicher Orakel-Prompt",
    promptAria: "Zusätzlicher Orakel-Prompt",
    promptHeader: "✦ Letzter Kristallsatz",
    copied: "Kopiert",
    copy: "Kopieren",
    share: "Teilen",
    retry: "Neu ziehen",
    home: "Home",
    shareTitle: "Kristallseelen-Tarot",
    paymentReason: "Kristallseelen-Tarot-Lesung",
    loginRequired: "Login erforderlich. Weiterleitung zum Login.",
    paymentFailed: "Die Zahlung konnte nicht abgeschlossen werden.",
    readingError: "Beim Öffnen der Lesung ist ein Fehler aufgetreten.",
    openFailed: "Das Licht der Karten konnte nicht geöffnet werden. Bitte versuche es gleich erneut.",
    positionLabels: ["Erstes Licht des Steins", "Verborgene Seite", "Warnung des Steins", "Kristallrezept", "Tür, die das Licht öffnet"],
  },
  nl: {
    title: "Kristalziel Tarot",
    subtitle: "De steen waar je hand stopt draagt de energie van vandaag",
    selectAria: "Kristal kiezen",
    chooseGemAgain: "Kies opnieuw een steen",
    selectedGem: "✦ {gem} is gekozen ✦",
    rubProgressLabel: "Wrijfvoortgang {progress}%",
    rubHint: "Leg je hand op de steen en wrijf langzaam",
    rubSubHint: "Jouw energie wekt de kaarten",
    readerFallback: "Leg je vraag in {gem} en open de kaarten één voor één.",
    openingCards: "Het licht van de kaarten opent",
    openReading: "Kaartlezing openen ({cost} KRW)",
    spreadAria: "5-kaarten kristaltarotlegging",
    positionPrefix: "Positie",
    resultHeader: "Kristalziel Tarot resultaat",
    gemMessageTitle: "✦ Bericht van vandaag van {gem}",
    detailDivider: "Gedetailleerde kaartuitleg",
    promptDivider: "Extra orakelprompt",
    promptAria: "Extra orakelprompt",
    promptHeader: "✦ Laatste kristalzin",
    copied: "Gekopieerd",
    copy: "Kopiëren",
    share: "Delen",
    retry: "Opnieuw trekken",
    home: "Home",
    shareTitle: "Kristalziel Tarot",
    paymentReason: "Kristalziel Tarot reading",
    loginRequired: "Inloggen is nodig. Je gaat naar het inlogscherm.",
    paymentFailed: "Betaling kon niet worden voltooid.",
    readingError: "Er ging iets mis bij het openen van de reading.",
    openFailed: "Het licht van de kaarten kon niet openen. Probeer het straks opnieuw.",
    positionLabels: ["Eerste licht van de steen", "Verborgen kant", "Waarschuwing van de steen", "Kristalrecept", "Deur die het licht opent"],
  },
  ms: {
    title: "Tarot Jiwa Kristal",
    subtitle: "Batu yang menghentikan tangan anda membawa tenaga hari ini",
    selectAria: "Pilih kristal",
    chooseGemAgain: "Pilih batu semula",
    selectedGem: "✦ {gem} telah dipilih ✦",
    rubProgressLabel: "Kemajuan gosokan {progress}%",
    rubHint: "Letakkan tangan pada batu dan gosok perlahan-lahan",
    rubSubHint: "Tenaga anda membangunkan kad",
    readerFallback: "Simpan soalan anda dalam {gem} dan buka kad satu demi satu.",
    openingCards: "Membuka cahaya kad",
    openReading: "Buka bacaan kad ({cost} KRW)",
    spreadAria: "Sebaran tarot kristal 5 kad",
    positionPrefix: "Posisi",
    resultHeader: "Keputusan Tarot Jiwa Kristal",
    gemMessageTitle: "✦ Mesej hari ini daripada {gem}",
    detailDivider: "Tafsiran terperinci setiap kad",
    promptDivider: "Prompt nasib tambahan",
    promptAria: "Prompt nasib tambahan",
    promptHeader: "✦ Ayat kristal terakhir",
    copied: "Disalin",
    copy: "Salin",
    share: "Kongsi",
    retry: "Cabut lagi",
    home: "Laman utama",
    shareTitle: "Tarot Jiwa Kristal",
    paymentReason: "Bacaan Tarot Jiwa Kristal",
    loginRequired: "Log masuk diperlukan. Bergerak ke skrin log masuk.",
    paymentFailed: "Bayaran tidak dapat diselesaikan.",
    readingError: "Ralat berlaku semasa membuka bacaan.",
    openFailed: "Cahaya kad tidak dapat dibuka. Cuba lagi sebentar lagi.",
    positionLabels: ["Cahaya pertama batu", "Sisi tersembunyi", "Amaran daripada batu", "Preskripsi kristal", "Pintu yang dibuka cahaya"],
  },
};

const GEM_DISPLAY_COPY = {
  ko: {
    amethyst: ["자수정", "직관 · 보호 · 내면의 평화"],
    rose_quartz: ["장미수정", "자기애 · 치유 · 감정 회복"],
    obsidian: ["흑요석", "진실 · 경계 · 에너지 정화"],
    moonstone: ["문스톤", "감수성 · 여성성 · 사이클"],
    lapis: ["라피스라줄리", "지혜 · 소통 · 진실의 힘"],
    citrine: ["시트린", "풍요 · 자신감 · 행동력"],
    black_tourmaline: ["블랙투르말린", "차단 · 뿌리내림 · 안정"],
    tiger_eye: ["호안석", "용기 · 통찰 · 현실 판단"],
    clear_quartz: ["백수정", "증폭 · 정화 · 명료함"],
    green_aventurine: ["그린 아벤츄린", "기회 · 회복 · 성장"],
    garnet: ["가넷", "열정 · 생명력 · 결단"],
    labradorite: ["래브라도라이트", "변신 · 보호 · 숨은 빛"],
  },
  en: {
    amethyst: ["Amethyst", "Intuition · Protection · Inner peace"],
    rose_quartz: ["Rose Quartz", "Self-love · Healing · Emotional recovery"],
    obsidian: ["Obsidian", "Truth · Boundaries · Energy cleansing"],
    moonstone: ["Moonstone", "Sensitivity · Feminine rhythm · Cycles"],
    lapis: ["Lapis Lazuli", "Wisdom · Communication · Truth"],
    citrine: ["Citrine", "Abundance · Confidence · Action"],
    black_tourmaline: ["Black Tourmaline", "Shielding · Grounding · Stability"],
    tiger_eye: ["Tiger Eye", "Courage · Insight · Practical judgment"],
    clear_quartz: ["Clear Quartz", "Amplification · Cleansing · Clarity"],
    green_aventurine: ["Green Aventurine", "Opportunity · Recovery · Growth"],
    garnet: ["Garnet", "Passion · Vitality · Decision"],
    labradorite: ["Labradorite", "Transformation · Protection · Hidden light"],
  },
  ja: {
    amethyst: ["アメジスト", "直感 · 保護 · 内なる平穏"],
    rose_quartz: ["ローズクォーツ", "自己愛 · 癒し · 感情の回復"],
    obsidian: ["オブシディアン", "真実 · 境界線 · エネルギー浄化"],
    moonstone: ["ムーンストーン", "感受性 · 女性性 · サイクル"],
    lapis: ["ラピスラズリ", "知恵 · 対話 · 真実の力"],
    citrine: ["シトリン", "豊かさ · 自信 · 行動力"],
    black_tourmaline: ["ブラックトルマリン", "遮断 · グラウンディング · 安定"],
    tiger_eye: ["タイガーアイ", "勇気 · 洞察 · 現実判断"],
    clear_quartz: ["クリアクォーツ", "増幅 · 浄化 · 明晰さ"],
    green_aventurine: ["グリーンアベンチュリン", "機会 · 回復 · 成長"],
    garnet: ["ガーネット", "情熱 · 生命力 · 決断"],
    labradorite: ["ラブラドライト", "変容 · 保護 · 隠れた光"],
  },
  "zh-CN": {
    amethyst: ["紫水晶", "直觉 · 保护 · 内在平静"],
    rose_quartz: ["粉晶", "自爱 · 疗愈 · 情绪修复"],
    obsidian: ["黑曜石", "真相 · 边界 · 能量净化"],
    moonstone: ["月光石", "感受力 · 阴性能量 · 周期"],
    lapis: ["青金石", "智慧 · 沟通 · 真相之力"],
    citrine: ["黄水晶", "丰盛 · 自信 · 行动力"],
    black_tourmaline: ["黑碧玺", "阻隔 · 扎根 · 稳定"],
    tiger_eye: ["虎眼石", "勇气 · 洞察 · 现实判断"],
    clear_quartz: ["白水晶", "增强 · 净化 · 清晰"],
    green_aventurine: ["绿东陵", "机会 · 修复 · 成长"],
    garnet: ["石榴石", "热情 · 生命力 · 决断"],
    labradorite: ["拉长石", "转化 · 保护 · 隐藏之光"],
  },
  "zh-TW": {
    amethyst: ["紫水晶", "直覺 · 保護 · 內在平靜"],
    rose_quartz: ["粉晶", "自愛 · 療癒 · 情緒修復"],
    obsidian: ["黑曜石", "真相 · 邊界 · 能量淨化"],
    moonstone: ["月光石", "感受力 · 陰性能量 · 週期"],
    lapis: ["青金石", "智慧 · 溝通 · 真相之力"],
    citrine: ["黃水晶", "豐盛 · 自信 · 行動力"],
    black_tourmaline: ["黑碧璽", "阻隔 · 扎根 · 穩定"],
    tiger_eye: ["虎眼石", "勇氣 · 洞察 · 現實判斷"],
    clear_quartz: ["白水晶", "增強 · 淨化 · 清晰"],
    green_aventurine: ["綠東陵", "機會 · 修復 · 成長"],
    garnet: ["石榴石", "熱情 · 生命力 · 決斷"],
    labradorite: ["拉長石", "轉化 · 保護 · 隱藏之光"],
  },
  vi: {
    amethyst: ["Thạch anh tím", "Trực giác · Bảo vệ · Bình an nội tâm"],
    rose_quartz: ["Thạch anh hồng", "Yêu bản thân · Chữa lành · Hồi phục cảm xúc"],
    obsidian: ["Hắc diện thạch", "Sự thật · Ranh giới · Thanh lọc năng lượng"],
    moonstone: ["Đá mặt trăng", "Nhạy cảm · Nữ tính · Chu kỳ"],
    lapis: ["Lapis Lazuli", "Trí tuệ · Giao tiếp · Sức mạnh sự thật"],
    citrine: ["Citrine", "Thịnh vượng · Tự tin · Hành động"],
    black_tourmaline: ["Tourmaline đen", "Che chắn · Tiếp đất · Ổn định"],
    tiger_eye: ["Mắt hổ", "Can đảm · Thấu thị · Phán đoán thực tế"],
    clear_quartz: ["Thạch anh trắng", "Khuếch đại · Thanh lọc · Minh mẫn"],
    green_aventurine: ["Aventurine xanh", "Cơ hội · Hồi phục · Tăng trưởng"],
    garnet: ["Garnet", "Đam mê · Sinh lực · Quyết đoán"],
    labradorite: ["Labradorite", "Biến đổi · Bảo vệ · Ánh sáng ẩn"],
  },
  hi: {
    amethyst: ["Amethyst", "अंतर्ज्ञान · सुरक्षा · भीतर की शांति"],
    rose_quartz: ["Rose Quartz", "स्व-प्रेम · उपचार · भावनात्मक रिकवरी"],
    obsidian: ["Obsidian", "सत्य · सीमा · ऊर्जा शुद्धि"],
    moonstone: ["Moonstone", "संवेदनशीलता · स्त्री ऊर्जा · चक्र"],
    lapis: ["Lapis Lazuli", "बुद्धि · संवाद · सत्य की शक्ति"],
    citrine: ["Citrine", "समृद्धि · आत्मविश्वास · क्रिया"],
    black_tourmaline: ["Black Tourmaline", "रक्षा · grounding · स्थिरता"],
    tiger_eye: ["Tiger Eye", "साहस · अंतर्दृष्टि · वास्तविक निर्णय"],
    clear_quartz: ["Clear Quartz", "वृद्धि · शुद्धि · स्पष्टता"],
    green_aventurine: ["Green Aventurine", "अवसर · रिकवरी · विकास"],
    garnet: ["Garnet", "जोश · जीवन शक्ति · निर्णय"],
    labradorite: ["Labradorite", "परिवर्तन · सुरक्षा · छिपी रोशनी"],
  },
  es: {
    amethyst: ["Amatista", "Intuición · Protección · Paz interior"],
    rose_quartz: ["Cuarzo rosa", "Amor propio · Sanación · Recuperación emocional"],
    obsidian: ["Obsidiana", "Verdad · Límites · Limpieza energética"],
    moonstone: ["Piedra lunar", "Sensibilidad · Energía femenina · Ciclos"],
    lapis: ["Lapislázuli", "Sabiduría · Comunicación · Verdad"],
    citrine: ["Citrino", "Abundancia · Confianza · Acción"],
    black_tourmaline: ["Turmalina negra", "Protección · Enraizamiento · Estabilidad"],
    tiger_eye: ["Ojo de tigre", "Coraje · Perspicacia · Juicio práctico"],
    clear_quartz: ["Cuarzo transparente", "Amplificación · Limpieza · Claridad"],
    green_aventurine: ["Aventurina verde", "Oportunidad · Recuperación · Crecimiento"],
    garnet: ["Granate", "Pasión · Vitalidad · Decisión"],
    labradorite: ["Labradorita", "Transformación · Protección · Luz oculta"],
  },
  fr: {
    amethyst: ["Améthyste", "Intuition · Protection · Paix intérieure"],
    rose_quartz: ["Quartz rose", "Amour de soi · Guérison · Récupération émotionnelle"],
    obsidian: ["Obsidienne", "Vérité · Limites · Purification énergétique"],
    moonstone: ["Pierre de lune", "Sensibilité · Énergie féminine · Cycles"],
    lapis: ["Lapis-lazuli", "Sagesse · Communication · Vérité"],
    citrine: ["Citrine", "Abondance · Confiance · Action"],
    black_tourmaline: ["Tourmaline noire", "Protection · Ancrage · Stabilité"],
    tiger_eye: ["Oeil de tigre", "Courage · Discernement · Jugement pratique"],
    clear_quartz: ["Quartz clair", "Amplification · Purification · Clarté"],
    green_aventurine: ["Aventurine verte", "Occasion · Récupération · Croissance"],
    garnet: ["Grenat", "Passion · Vitalité · Décision"],
    labradorite: ["Labradorite", "Transformation · Protection · Lumière cachée"],
  },
  de: {
    amethyst: ["Amethyst", "Intuition · Schutz · Innerer Frieden"],
    rose_quartz: ["Rosenquarz", "Selbstliebe · Heilung · Emotionale Erholung"],
    obsidian: ["Obsidian", "Wahrheit · Grenzen · Energetische Reinigung"],
    moonstone: ["Mondstein", "Feingefühl · Weibliche Energie · Zyklen"],
    lapis: ["Lapislazuli", "Weisheit · Kommunikation · Wahrheit"],
    citrine: ["Citrin", "Fülle · Selbstvertrauen · Handlungskraft"],
    black_tourmaline: ["Schwarzer Turmalin", "Abschirmung · Erdung · Stabilität"],
    tiger_eye: ["Tigerauge", "Mut · Einsicht · Realistisches Urteil"],
    clear_quartz: ["Bergkristall", "Verstärkung · Reinigung · Klarheit"],
    green_aventurine: ["Grüner Aventurin", "Chance · Erholung · Wachstum"],
    garnet: ["Granat", "Leidenschaft · Lebenskraft · Entscheidung"],
    labradorite: ["Labradorit", "Wandlung · Schutz · Verborgene Lichtkraft"],
  },
  nl: {
    amethyst: ["Amethist", "Intuïtie · Bescherming · Innerlijke rust"],
    rose_quartz: ["Rozenkwarts", "Zelfliefde · Healing · Emotioneel herstel"],
    obsidian: ["Obsidiaan", "Waarheid · Grenzen · Energiereiniging"],
    moonstone: ["Maansteen", "Gevoeligheid · Vrouwelijke energie · Cycli"],
    lapis: ["Lapis Lazuli", "Wijsheid · Communicatie · Waarheid"],
    citrine: ["Citrien", "Overvloed · Vertrouwen · Actie"],
    black_tourmaline: ["Zwarte toermalijn", "Afscherming · Aarding · Stabiliteit"],
    tiger_eye: ["Tijgeroog", "Moed · Inzicht · Praktisch oordeel"],
    clear_quartz: ["Bergkristal", "Versterking · Reiniging · Helderheid"],
    green_aventurine: ["Groene aventurijn", "Kans · Herstel · Groei"],
    garnet: ["Granaat", "Passie · Levenskracht · Besluit"],
    labradorite: ["Labradoriet", "Transformatie · Bescherming · Verborgen licht"],
  },
  ms: {
    amethyst: ["Amethyst", "Intuisi · Perlindungan · Damai dalaman"],
    rose_quartz: ["Rose Quartz", "Cinta diri · Penyembuhan · Pemulihan emosi"],
    obsidian: ["Obsidian", "Kebenaran · Batas · Pembersihan tenaga"],
    moonstone: ["Moonstone", "Kepekaan · Tenaga feminin · Kitaran"],
    lapis: ["Lapis Lazuli", "Kebijaksanaan · Komunikasi · Kebenaran"],
    citrine: ["Citrine", "Kelimpahan · Keyakinan · Tindakan"],
    black_tourmaline: ["Black Tourmaline", "Perisai · Pembumian · Kestabilan"],
    tiger_eye: ["Tiger Eye", "Keberanian · Wawasan · Pertimbangan realistik"],
    clear_quartz: ["Clear Quartz", "Penguatan · Pembersihan · Kejelasan"],
    green_aventurine: ["Green Aventurine", "Peluang · Pemulihan · Pertumbuhan"],
    garnet: ["Garnet", "Semangat · Daya hidup · Keputusan"],
    labradorite: ["Labradorite", "Transformasi · Perlindungan · Cahaya tersembunyi"],
  },
};

function resolveLocaleFromPath(pathname) {
  const firstSegment = (pathname || "").split("/").filter(Boolean)[0];
  return firstSegment ? normalizeLoadingLocale(firstSegment) : "ko";
}

function formatCopy(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

function getLocalizedGemMeta(type, locale) {
  const fallback = GEM_META[type];
  const localized = GEM_DISPLAY_COPY[locale]?.[type] || GEM_DISPLAY_COPY.ko[type] || [fallback.name, fallback.keywords];
  return { ...fallback, name: localized[0], keywords: localized[1] };
}

function getPositionLabel(copy, card) {
  return copy.positionLabels[Number(card?.pos_id || 1) - 1] || card?.pos_name || "";
}

function isAdminSessionClient() {
  if (typeof window === "undefined") return false;
  try {
    if (window.__cdAdminBypass) return true;
  } catch {}
  try {
    const user = JSON.parse(localStorage.getItem("fortune_auth_user") || "null");
    if (String(user?.role || "").toLowerCase() === "admin") return true;
  } catch {}
  try {
    const user = JSON.parse(localStorage.getItem("cd_user") || "null");
    if (String(user?.role || "").toLowerCase() === "admin") return true;
  } catch {}
  try {
    const roleMatch = document.cookie.match(/(?:^|;\s*)cd_role=([^;]+)/);
    if (roleMatch && decodeURIComponent(roleMatch[1]).toLowerCase() === "admin") return true;
  } catch {}
  try {
    const token = String(sessionStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch {}
  try {
    const token = String(localStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch {}
  return false;
}

function useBodyChrome() {
  useEffect(() => {
    document.body.classList.add("crystal-soul-active");
    return () => document.body.classList.remove("crystal-soul-active");
  }, []);
}

function useTypewriter(text, active = true, speed = 15) {
  const [visibleText, setVisibleText] = useState(active ? "" : text);

  useEffect(() => {
    const fullText = String(text || "");
    if (!active) {
      setVisibleText(fullText);
      return undefined;
    }
    setVisibleText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(fullText.slice(0, index));
      if (index >= fullText.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [active, speed, text]);

  return visibleText;
}

function TypedText({ text, className = "", speed = 15 }) {
  const visibleText = useTypewriter(text, true, speed);
  const done = visibleText.length >= String(text || "").length;

  return (
    <span className={className}>
      {visibleText}
      {!done ? <span className="crystal-type-cursor" /> : null}
    </span>
  );
}

function GemSelectScreen({ selectedGem, onSelect, copy, locale }) {
  return (
    <section className="crystal-screen crystal-screen--select">
      <div className="crystal-title-row">
        <GemIcon size={25} strokeWidth={1.8} />
        <h1>{copy.title}</h1>
      </div>
      <p className="crystal-subtitle">{copy.subtitle}</p>

      <div className="gem-grid" aria-label={copy.selectAria}>
        {GEM_TYPES.map((type) => {
          const meta = getLocalizedGemMeta(type, locale);
          const selected = selectedGem === type;
          return (
            <button
              key={type}
              type="button"
              className={`gem-card ${selected ? "selected" : ""}`}
              style={{ "--gem": getGemColor(type) || "#a78bfa" }}
              onClick={() => onSelect(type)}
              aria-pressed={selected}
            >
              <CrystalGem type={type} size="min(116px, 24vw)" compact state={selected ? "activated" : "idle"} ariaLabel={meta.name} />
              <span className="gem-card__name">{meta.name}</span>
              <span className="gem-card__keywords">{meta.keywords}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GemRubScreen({ gemType, onBack, onRevealed, copy, locale }) {
  const meta = getLocalizedGemMeta(gemType, locale);
  const handleActivated = useCallback(() => {
    window.setTimeout(onRevealed, 820);
  }, [onRevealed]);
  const { progress, rubState, handlers } = useRubInteraction({ threshold: 200, onActivated: handleActivated });

  return (
    <section className="crystal-screen crystal-screen--rub">
      <button type="button" className="crystal-text-button" onClick={onBack}>
        {copy.chooseGemAgain}
      </button>
      <p className="rub-kicker">{formatCopy(copy.selectedGem, { gem: meta.name })}</p>
      <div className="rub-stage" {...handlers}>
        <span className="rub-stage__aura" aria-hidden="true" />
        <span className="rub-stage__grain" aria-hidden="true" />
        <CrystalGem type={gemType} size="min(280px, 70vw)" state={rubState} progress={progress} ariaLabel={meta.name} />
      </div>
      <div className="rub-progress" aria-label={formatCopy(copy.rubProgressLabel, { progress: Math.round(progress) })}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="rub-progress-label">{Math.round(progress)}%</div>
      <p className="rub-hint">{copy.rubHint}</p>
      <p className="rub-hint rub-hint--sub">{copy.rubSubHint}</p>
    </section>
  );
}

function ReaderBubble({ gemType, text, children }) {
  return (
    <article className="reader-bubble">
      <div className="reader-bubble__mark">
        <CrystalGem type={gemType} size={34} compact state="revealed" />
      </div>
      <p>{text ? <TypedText text={text} /> : children}</p>
    </article>
  );
}

function TarotReaderChat({ gemType, reading, loading, paying, error, onStart, copy, locale }) {
  const meta = getLocalizedGemMeta(gemType, locale);
  const intro = reading?.intro && locale === "ko" ? reading.intro : formatCopy(copy.readerFallback, { gem: meta.name });

  return (
    <section className="crystal-screen crystal-screen--reader">
      <div className="reader-gem-pin">
        <CrystalGem type={gemType} size={58} compact state="revealed" ariaLabel={meta.name} />
        <span>{meta.name}</span>
      </div>

      <ReaderBubble gemType={gemType} text={intro} />

      {!reading ? (
        <div className="reader-pay-panel">
          <button type="button" className="crystal-primary-button" onClick={onStart} disabled={loading || paying}>
            {loading || paying ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            {loading || paying ? copy.openingCards : formatCopy(copy.openReading, { cost: CRYSTAL_COST_KRW.toLocaleString("ko-KR") })}
          </button>
          {error ? <p className="crystal-error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function CardSpread({ gemType, reading, openedCards, onOpenCard, copy }) {
  return (
    <section className="card-spread-section" aria-label={copy.spreadAria}>
      <div className="card-spread">
        {reading.cards.map((card, index) => {
          const opened = openedCards.includes(index);
          return (
            <article key={`${card.card_id}-${index}`} className={`spread-item ${opened ? "is-open" : ""}`}>
              <button type="button" className="tarot-card" onClick={() => onOpenCard(index)} aria-pressed={opened}>
                <span className="tarot-card__inner">
                  <span className="tarot-card__back">
                    <span className="tarot-card__star">✦</span>
                    <span>{GEM_META[gemType].initial}</span>
                  </span>
                  <span className="tarot-card__front">
                    <img
                      src={card.imageUrl}
                      alt={`${card.card_name} ${card.direction}`}
                      className={card.orientation === "reversed" ? "is-reversed" : ""}
                      loading="lazy"
                    />
                  </span>
                </span>
                {opened ? (
                  <span className="card-particles" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </button>
              <div className="spread-item__label">
                <strong>{index + 1}</strong>
                <span>{getPositionLabel(copy, card)}</span>
              </div>
              {opened ? <CardReadingBubble gemType={gemType} card={card} copy={copy} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CardReadingBubble({ gemType, card, copy }) {
  return (
    <article className="card-reading-bubble">
      <header>
        <CrystalGem type={gemType} size={28} compact state="revealed" />
        <span>{copy.positionPrefix} {card.pos_id} · {getPositionLabel(copy, card)}</span>
      </header>
      <div className="card-reading-bubble__card">
        <img src={card.imageUrl} alt={card.card_name} className={card.orientation === "reversed" ? "is-reversed" : ""} loading="lazy" />
        <div>
          <strong>{card.card_name}</strong>
          <span>{card.direction}</span>
        </div>
      </div>
      <p><TypedText text={card.reading} speed={13} /></p>
      <b>{card.one_line}</b>
    </article>
  );
}

function ReadingResult({ gemType, reading, onRetry, onHome, copy, locale }) {
  const meta = getLocalizedGemMeta(gemType, locale);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const aiFortunePrompt = reading.ai_fortune_prompt || reading.aiFortunePrompt || "";

  const onShare = useCallback(async () => {
    const text = `${meta.name} ${copy.shareTitle}\n${reading.synthesis.gem_message || ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: copy.shareTitle, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
    } catch {}
  }, [copy.shareTitle, meta.name, reading.synthesis.gem_message]);

  const onCopyPrompt = useCallback(async () => {
    if (!aiFortunePrompt || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(aiFortunePrompt);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1600);
    } catch {}
  }, [aiFortunePrompt]);

  return (
    <section className="reading-result">
      <header className="reading-result__sticky">
        <CrystalGem type={gemType} size={38} compact state="revealed" />
        <span>{copy.resultHeader}</span>
      </header>

      <div className="reading-result__body">
        <h2>{formatCopy(copy.gemMessageTitle, { gem: meta.name })}</h2>
        <article className="synthesis-panel">
          {reading.synthesis.gem_profile ? <p className="gem-profile">{reading.synthesis.gem_profile}</p> : null}
          <p>{reading.synthesis.body}</p>
          <div className="gem-message">{reading.synthesis.gem_message}</div>
        </article>

        <div className="result-divider">{copy.detailDivider}</div>
        <div className="result-card-list">
          {reading.cards.map((card) => (
            <article key={`result-${card.pos_id}-${card.card_id}`} className="result-card">
              <img src={card.imageUrl} alt={card.card_name} className={card.orientation === "reversed" ? "is-reversed" : ""} loading="lazy" />
              <div>
                <span>{getPositionLabel(copy, card)}</span>
                <h3>{card.card_name} · {card.direction}</h3>
                <p>{card.reading}</p>
                {card.gem_reading ? <p className="result-card__gem-reading">{card.gem_reading}</p> : null}
                {card.gem_alignment ? (
                  <div className="result-card__gem-detail">
                    <span>{card.gem_focus}</span>
                    <span>{card.gem_shadow}</span>
                    <span>{card.gem_alignment}</span>
                  </div>
                ) : null}
                <b>{card.one_line}</b>
              </div>
            </article>
          ))}
        </div>

        {aiFortunePrompt ? (
          <>
            <div className="result-divider">{copy.promptDivider}</div>
            <section className="ai-fortune-prompt" aria-label={copy.promptAria}>
              <div className="ai-fortune-prompt__header">
                <span>{copy.promptHeader}</span>
                <button type="button" onClick={onCopyPrompt}>
                  <Copy size={15} />
                  {copiedPrompt ? copy.copied : copy.copy}
                </button>
              </div>
              <pre>{aiFortunePrompt}</pre>
            </section>
          </>
        ) : null}
      </div>

      <footer className="result-actions">
        <button type="button" onClick={onShare}><Share2 size={17} />{copy.share}</button>
        <button type="button" onClick={onRetry}><RotateCcw size={17} />{copy.retry}</button>
        <button type="button" onClick={onHome}><Home size={17} />{copy.home}</button>
      </footer>
    </section>
  );
}

function normalizeReadingPayload(data) {
  const reading = data?.readingData && Array.isArray(data.readingData.cards) ? data.readingData : null;
  if (!reading || reading.cards.length !== 5 || !reading.synthesis) return null;
  return reading;
}

export default function CrystalSoulTarotClient() {
  useBodyChrome();
  const pathname = usePathname();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [locale, setLocale] = useState(() => resolveLocaleFromPath(pathname));
  const [stage, setStage] = useState("select");
  const [selectedGem, setSelectedGem] = useState("amethyst");
  const [reading, setReading] = useState(null);
  const [openedCards, setOpenedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const copy = CRYSTAL_UI_COPY[locale] || CRYSTAL_UI_COPY.ko;

  useEffect(() => {
    const fromPath = resolveLocaleFromPath(pathname);
    setLocale(fromPath === "ko" ? getCurrentLoadingLocale() : fromPath);
  }, [pathname]);

  const activeGemStyle = useMemo(() => {
    const gemKey = reading?.gem || selectedGem;
    return { "--active-gem": reading?.gem_color || getGemColor(gemKey) || "#a78bfa" };
  }, [reading?.gem, reading?.gem_color, selectedGem]);

  const resetForGem = useCallback((gemType) => {
    setSelectedGem(gemType);
    setReading(null);
    setOpenedCards([]);
    setError("");
    setStage("rub");
  }, []);

  // 🔴 결제 requestId 를 서버로 넘긴다. 2026-08-24 에 /api/tarot/crystal-soul 에 결제 게이트를
  //    달았고, 이 값이 증빙 조회의 열쇠다 — 빠지면 결제한 사용자가 402 를 맞는다.
  // gemOverride 는 결제 후 재개 전용이다 — 복귀 직후에는 setSelectedGem 이 아직 이 클로저에
  // 반영되지 않아, 되살린 보석을 인자로 직접 받아야 결제한 보석으로 리딩이 나온다.
  const requestReading = useCallback(async (paidRequestId, gemOverride) => {
    const gemId = GEM_META[gemOverride] ? gemOverride : selectedGem;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tarot/crystal-soul", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crystalSoulVersion: "gem-v3",
          gem: { id: gemId, name: GEM_META[gemId].name },
          positions: POSITION_LABELS,
          requestId: String(paidRequestId || ""),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.message || "reading failed");
      const normalized = normalizeReadingPayload(data);
      if (!normalized) throw new Error("reading payload invalid");
      setReading(normalized);
      setOpenedCards([]);
      setStage("reader");
      return true;
    } catch {
      setError(copy.openFailed);
      return false;
    } finally {
      setLoading(false);
    }
  }, [copy.openFailed, selectedGem]);

  /* 결제 후 자동 재개 — 모바일 PortOne 복귀는 보석 선택 화면(stage "select")부터 다시 시작한다.
     결제한 보석과 requestId 를 서술자에서 되살려 그대로 리딩을 받는다. 🔴 게이트를 다시 타지 않는다. */
  const buildResume = usePaidResume("tarot-crystal-soul-reading", async (args) => {
    const requestId = String(args.requestId || "");
    const gemId = GEM_META[String(args.gem || "")] ? String(args.gem) : "";
    if (!requestId || !gemId) return false;
    setSelectedGem(gemId);
    setOpenedCards([]);
    setStage("rub");
    return requestReading(requestId, gemId);
  });

  const startPaidReading = useCallback(async () => {
    if (loading || paying || isPaying) return;
    setPaying(true);
    setError("");

    // 🔴 결제와 리딩 요청이 **같은 requestId** 를 써야 서버가 증빙을 찾는다.
    //    각자 만들면 결제한 사용자가 402 를 맞는다.
    const paidRequestId = `tarot-crystal-soul-reading:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (isAdminSessionClient()) {
      // 관리자도 서버에서 role 로 통과한다(verifyPerUsePayment 의 admin 분기).
      await requestReading(paidRequestId);
      setPaying(false);
      return;
    }

    try {
      const result = await ensurePaidAccess({
        featureKey: "tarot-crystal-soul-reading",
        cost: lookupServerCoinPrice("tarot-crystal-soul-reading"),
        reason: copy.paymentReason,
        requestId: paidRequestId,
        resume: buildResume({ gem: selectedGem, requestId: paidRequestId }),
        onPaid: () => requestReading(paidRequestId),
      });

      if (!result.ok) {
        if (result.code === "AUTH_REQUIRED") {
          setError(copy.loginRequired);
          window.setTimeout(() => {
            window.location.href = "/login?next=%2Ftarot%2Fcrystal-soul";
          }, 600);
          return;
        }
        setError(result.message || copy.paymentFailed);
      }
    } catch {
      setError(copy.readingError);
    } finally {
      setPaying(false);
    }
  }, [buildResume, copy.loginRequired, copy.paymentFailed, copy.paymentReason, copy.readingError, ensurePaidAccess, isPaying, loading, paying, requestReading, selectedGem]);

  const openCard = useCallback((index) => {
    setOpenedCards((current) => current.includes(index) ? current : [...current, index]);
  }, []);

  const resetAll = useCallback(() => {
    setReading(null);
    setOpenedCards([]);
    setError("");
    setLoading(false);
    setPaying(false);
    setStage("select");
  }, []);

  const allRevealed = reading && openedCards.length === 5;

  return (
    <main className="crystal-soul-shell" style={activeGemStyle}>
      <div className="crystal-soul-orbit" aria-hidden="true" />

      {stage === "select" ? (
        <GemSelectScreen selectedGem={selectedGem} onSelect={resetForGem} copy={copy} locale={locale} />
      ) : null}

      {stage === "rub" ? (
        <GemRubScreen
          gemType={selectedGem}
          onBack={() => setStage("select")}
          onRevealed={() => setStage("reader")}
          copy={copy}
          locale={locale}
        />
      ) : null}

      {stage === "reader" ? (
        <>
          <TarotReaderChat
            gemType={selectedGem}
            reading={reading}
            loading={loading}
            paying={paying || isPaying}
            error={error}
            onStart={startPaidReading}
            copy={copy}
            locale={locale}
          />
          {reading ? <CardSpread gemType={selectedGem} reading={reading} openedCards={openedCards} onOpenCard={openCard} copy={copy} /> : null}
          {allRevealed ? <ReadingResult gemType={selectedGem} reading={reading} onRetry={resetAll} onHome={() => { window.location.href = "/"; }} copy={copy} locale={locale} /> : null}
        </>
      ) : null}

      <style jsx global>{`
        body.crystal-soul-active {
          background: #0a0818;
        }

        body.crystal-soul-active > header,
        body.crystal-soul-active > footer {
          display: none !important;
        }

        .crystal-soul-shell {
          --crystal-font-body: var(--font-body, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          --crystal-font-display: var(--font-premium, var(--font-display, "Noto Serif KR", serif));
          --text-main: #e2e0f0;
          --text-soft: rgba(226, 224, 240, 0.68);
          --line: rgba(167, 139, 250, 0.18);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: var(--text-main);
          background:
            radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--active-gem), transparent 72%), transparent 35%),
            linear-gradient(180deg, #0a0818 0%, #0f0c1e 52%, #13102a 100%);
          font-family: var(--crystal-font-body);
          padding: 24px 16px 92px;
        }

        .crystal-soul-shell * {
          box-sizing: border-box;
        }

        .crystal-soul-orbit {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.38;
          background-image:
            radial-gradient(circle at 12% 24%, rgba(226,224,240,0.42) 0 1px, transparent 1.8px),
            radial-gradient(circle at 78% 18%, rgba(196,181,253,0.48) 0 1.2px, transparent 2px),
            radial-gradient(circle at 44% 82%, rgba(167,139,250,0.34) 0 1px, transparent 1.8px);
          background-size: 108px 108px, 154px 154px, 188px 188px;
          animation: crystalStarDrift 42s linear infinite;
        }

        .crystal-soul-orbit::after {
          content: "";
          position: absolute;
          inset: -25%;
          pointer-events: none;
          background:
            radial-gradient(38% 38% at 22% 28%, color-mix(in srgb, var(--active-gem), transparent 80%), transparent 70%),
            radial-gradient(42% 42% at 80% 70%, color-mix(in srgb, var(--active-gem), transparent 86%), transparent 72%);
          filter: blur(44px);
          animation: crystalAurora 20s ease-in-out infinite alternate;
        }

        .crystal-screen {
          width: min(960px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .crystal-screen--select,
        .crystal-screen--rub,
        .crystal-screen--reader {
          min-height: calc(100vh - 116px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .crystal-title-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #c4b5fd;
        }

        .crystal-title-row h1 {
          margin: 0;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(30px, 8vw, 52px);
          font-weight: 700;
          letter-spacing: 0;
        }

        .crystal-subtitle {
          margin: 10px 0 30px;
          color: rgba(226, 224, 240, 0.62);
          font-family: "Noto Serif KR", serif;
          font-size: 16px;
        }

        .gem-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          width: min(980px, 100%);
        }

        .gem-card {
          --gem: #a78bfa;
          position: relative;
          min-height: 198px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid color-mix(in srgb, var(--gem), transparent 82%);
          border-radius: 16px;
          padding: 20px 14px;
          background:
            radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--gem), transparent 88%), transparent 62%),
            rgba(167, 139, 250, 0.04);
          color: var(--text-main);
          cursor: pointer;
          overflow: hidden;
          transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
        }

        .gem-card:hover {
          border-color: color-mix(in srgb, var(--gem), transparent 45%);
          transform: translateY(-4px);
          box-shadow: 0 14px 40px -12px color-mix(in srgb, var(--gem), transparent 45%);
        }

        .gem-card.selected {
          border-color: var(--gem);
          background:
            radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--gem), transparent 78%), transparent 60%),
            rgba(167, 139, 250, 0.08);
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--gem), transparent 55%), 0 0 34px -6px color-mix(in srgb, var(--gem), transparent 50%);
        }

        .gem-card.selected::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background: linear-gradient(180deg, color-mix(in srgb, var(--gem), transparent 84%), transparent 46%);
        }

        .gem-card__name {
          font-family: "Noto Serif KR", serif;
          font-size: 17px;
          font-weight: 700;
        }

        .gem-card__keywords {
          min-height: 32px;
          display: flex;
          align-items: center;
          color: rgba(226, 224, 240, 0.62);
          font-size: 12px;
          line-height: 1.45;
          text-align: center;
        }

        .crystal-text-button {
          position: absolute;
          top: 18px;
          left: 0;
          border: 1px solid rgba(196, 181, 253, 0.24);
          border-radius: 999px;
          background: rgba(15, 12, 30, 0.62);
          color: #c4b5fd;
          padding: 9px 13px;
          font-size: 13px;
          cursor: pointer;
        }

        .rub-kicker {
          margin: 0 0 28px;
          color: #c4b5fd;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(20px, 5vw, 30px);
        }

        .rub-stage {
          width: min(320px, 78vw);
          height: min(320px, 78vw);
          display: grid;
          place-items: center;
          position: relative;
          touch-action: none;
          cursor: grab;
        }

        .rub-stage__aura,
        .rub-stage__grain {
          position: absolute;
          inset: 6%;
          border-radius: 999px;
          pointer-events: none;
        }

        .rub-stage__aura {
          background:
            conic-gradient(from 180deg, transparent, color-mix(in srgb, var(--active-gem), transparent 38%), transparent 44%),
            radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--active-gem), transparent 74%), transparent 58%);
          filter: blur(16px);
          opacity: 0.58;
          animation: crystalRubAura 2.8s linear infinite;
        }

        .rub-stage__grain {
          inset: 10%;
          border: 1px solid color-mix(in srgb, var(--active-gem), transparent 74%);
          background:
            repeating-linear-gradient(115deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 8px),
            repeating-radial-gradient(circle at 50% 50%, transparent 0 14px, rgba(255,255,255,0.07) 15px 16px);
          mask-image: radial-gradient(circle, #000 0 62%, transparent 72%);
          opacity: 0.46;
          animation: crystalRubTexture 0.9s linear infinite;
        }

        .rub-progress {
          width: min(420px, 82vw);
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(226, 224, 240, 0.1);
          margin-top: 28px;
        }

        .rub-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(196,181,253,0.72), var(--active-gem));
          box-shadow: 0 0 18px var(--active-gem);
          transition: width 0.12s ease;
        }

        .rub-progress-label {
          margin-top: 8px;
          color: #c4b5fd;
          font-size: 13px;
        }

        .rub-hint {
          margin: 22px 0 0;
          color: rgba(226, 224, 240, 0.78);
          font-family: "Noto Serif KR", serif;
          animation: crystalHintPulse 0.8s ease-in-out infinite alternate;
        }

        .rub-hint--sub {
          margin-top: 6px;
          color: rgba(226, 224, 240, 0.52);
          font-size: 14px;
        }

        .reader-gem-pin {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          color: #c4b5fd;
          font-family: "Noto Serif KR", serif;
        }

        .reader-bubble {
          width: min(620px, 100%);
          border: 1px solid rgba(167, 139, 250, 0.25);
          border-left: 3px solid var(--active-gem);
          border-radius: 14px;
          background: rgba(167, 139, 250, 0.08);
          padding: 22px 22px 22px 20px;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          box-shadow: 0 18px 54px rgba(0,0,0,0.22);
        }

        .reader-bubble p {
          margin: 0;
          min-height: 116px;
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
          font-size: 17px;
          line-height: 1.85;
        }

        .reader-pay-panel {
          margin-top: 22px;
          display: grid;
          justify-items: center;
          gap: 12px;
        }

        .crystal-primary-button,
        .result-actions button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(196, 181, 253, 0.32);
          border-radius: 999px;
          background: rgba(167, 139, 250, 0.16);
          color: #e2e0f0;
          padding: 11px 18px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .crystal-primary-button:hover,
        .result-actions button:hover {
          transform: translateY(-2px);
          border-color: rgba(196, 181, 253, 0.58);
          background: rgba(167, 139, 250, 0.24);
        }

        .crystal-primary-button:disabled {
          cursor: wait;
          opacity: 0.64;
          transform: none;
        }

        .spin {
          animation: crystalSpin 0.9s linear infinite;
        }

        .crystal-error {
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
        }

        .card-spread-section {
          width: min(1020px, 100%);
          margin: -42px auto 0;
          position: relative;
          z-index: 2;
          animation: crystalSlideUp 0.5s ease both;
        }

        .card-spread {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          align-items: start;
        }

        .spread-item {
          display: grid;
          justify-items: center;
          gap: 10px;
          min-width: 0;
        }

        .tarot-card {
          width: 100px;
          height: 160px;
          position: relative;
          border: 0;
          padding: 0;
          background: transparent;
          perspective: 900px;
          cursor: pointer;
        }

        .tarot-card__inner {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
        }

        .spread-item.is-open .tarot-card__inner {
          transform: rotateY(180deg);
        }

        .tarot-card__back,
        .tarot-card__front {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          backface-visibility: hidden;
          overflow: hidden;
        }

        .tarot-card__back {
          border: 1px solid rgba(167, 139, 250, 0.3);
          background:
            radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--active-gem), transparent 58%), transparent 34%),
            #0f0c1e;
          color: #c4b5fd;
          flex-direction: column;
          gap: 8px;
          font-family: "Noto Serif KR", serif;
          font-size: 19px;
        }

        .tarot-card__star {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          color: var(--active-gem);
          font-size: 32px;
          filter: drop-shadow(0 0 12px var(--active-gem));
        }

        .tarot-card__front {
          transform: rotateY(180deg);
          border: 1px solid rgba(226, 224, 240, 0.16);
          background: #0f0c1e;
        }

        .tarot-card__front img,
        .card-reading-bubble__card img,
        .result-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        img.is-reversed {
          transform: rotateZ(180deg);
        }

        .card-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .card-particles i {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--active-gem);
          box-shadow: 0 0 10px var(--active-gem);
          animation: cardParticle 0.62s ease-out both;
        }

        .card-particles i:nth-child(2) {
          animation-delay: 0.06s;
          transform: rotate(120deg);
        }

        .card-particles i:nth-child(3) {
          animation-delay: 0.1s;
          transform: rotate(240deg);
        }

        .spread-item__label {
          min-height: 48px;
          display: grid;
          justify-items: center;
          gap: 4px;
          text-align: center;
          color: rgba(226, 224, 240, 0.72);
          font-size: 12px;
          line-height: 1.3;
        }

        .spread-item__label strong {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(196, 181, 253, 0.24);
          color: #c4b5fd;
          font-size: 11px;
        }

        .card-reading-bubble {
          width: min(320px, 92vw);
          border: 1px solid rgba(167, 139, 250, 0.22);
          border-left: 3px solid var(--active-gem);
          border-radius: 14px;
          background: rgba(15, 12, 30, 0.86);
          backdrop-filter: blur(14px);
          padding: 14px;
          animation: crystalSlideDown 0.34s ease both;
        }

        .card-reading-bubble header,
        .card-reading-bubble__card {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-reading-bubble header {
          color: #c4b5fd;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .card-reading-bubble__card {
          border-top: 1px solid rgba(167, 139, 250, 0.16);
          border-bottom: 1px solid rgba(167, 139, 250, 0.16);
          padding: 11px 0;
          margin-bottom: 11px;
        }

        .card-reading-bubble__card img {
          width: 46px;
          height: 70px;
          border-radius: 8px;
        }

        .card-reading-bubble__card strong {
          display: block;
          font-family: "Noto Serif KR", serif;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .card-reading-bubble__card span {
          color: rgba(226, 224, 240, 0.62);
          font-size: 12px;
        }

        .card-reading-bubble p {
          margin: 0;
          min-height: 154px;
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
          font-size: 14px;
          line-height: 1.8;
        }

        .card-reading-bubble b {
          display: block;
          margin-top: 10px;
          color: #c4b5fd;
          font-size: 12px;
          line-height: 1.5;
        }

        .reading-result {
          width: min(920px, 100%);
          margin: 34px auto 0;
          position: relative;
          z-index: 2;
          animation: crystalSlideUp 0.52s ease both;
        }

        .reading-result__sticky {
          position: sticky;
          top: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 58px;
          border-bottom: 1px solid rgba(167, 139, 250, 0.18);
          background: rgba(10, 8, 24, 0.88);
          backdrop-filter: blur(16px);
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
        }

        .reading-result__body {
          padding-top: 22px;
        }

        .reading-result h2 {
          margin: 0 0 16px;
          color: #c4b5fd;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(22px, 5vw, 32px);
          letter-spacing: 0;
        }

        .synthesis-panel {
          position: relative;
          border: 1px solid color-mix(in srgb, var(--active-gem), transparent 74%);
          border-radius: 14px;
          background:
            radial-gradient(120% 60% at 50% 0%, color-mix(in srgb, var(--active-gem), transparent 88%), transparent 58%),
            rgba(167, 139, 250, 0.06);
          padding: 22px 20px;
          box-shadow: 0 24px 70px -34px color-mix(in srgb, var(--active-gem), transparent 30%);
          overflow: hidden;
        }

        .synthesis-panel::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--active-gem), transparent);
          opacity: 0.7;
        }

        .synthesis-panel p,
        .result-card p {
          margin: 0;
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
          font-size: 16px;
          line-height: 1.9;
        }

        .synthesis-panel .gem-profile {
          margin-bottom: 14px;
          color: #d8c8ff;
        }

        .gem-message {
          margin-top: 18px;
          border-left: 3px solid var(--active-gem);
          border-radius: 10px;
          background: rgba(15, 12, 30, 0.72);
          color: #c4b5fd;
          padding: 14px 16px;
          font-family: "Noto Serif KR", serif;
          line-height: 1.75;
        }

        .result-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 30px 0 16px;
          color: rgba(226, 224, 240, 0.62);
          font-size: 13px;
        }

        .result-divider::before,
        .result-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(167, 139, 250, 0.18);
        }

        .result-card-list {
          display: grid;
          gap: 14px;
        }

        .result-card {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 14px;
          border: 1px solid rgba(167, 139, 250, 0.18);
          border-radius: 14px;
          background: rgba(15, 12, 30, 0.62);
          padding: 14px;
        }

        .result-card img {
          width: 84px;
          height: 132px;
          border-radius: 10px;
        }

        .result-card span {
          color: #c4b5fd;
          font-size: 12px;
        }

        .result-card h3 {
          margin: 5px 0 8px;
          font-family: "Noto Serif KR", serif;
          font-size: 18px;
          letter-spacing: 0;
        }

        .result-card .result-card__gem-reading {
          margin-top: 10px;
          color: #d8c8ff;
          font-size: 14px;
          line-height: 1.8;
        }

        .result-card__gem-detail {
          display: grid;
          gap: 6px;
          margin-top: 12px;
          padding: 11px 12px;
          border: 1px solid color-mix(in srgb, var(--active-gem), transparent 78%);
          border-radius: 10px;
          background: color-mix(in srgb, var(--active-gem), transparent 92%);
        }

        .result-card__gem-detail span {
          color: rgba(226, 224, 240, 0.78);
          font-size: 12px;
          line-height: 1.6;
        }

        .result-card b {
          display: block;
          margin-top: 9px;
          color: #c4b5fd;
          font-size: 13px;
        }

        .ai-fortune-prompt {
          border: 1px solid rgba(167, 139, 250, 0.22);
          border-radius: 14px;
          background:
            linear-gradient(135deg, color-mix(in srgb, var(--active-gem), transparent 88%), rgba(15, 12, 30, 0.78)),
            rgba(15, 12, 30, 0.72);
          padding: 18px;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
        }

        .ai-fortune-prompt__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: #d8c8ff;
          font-family: "Noto Serif KR", serif;
          font-size: 16px;
        }

        .ai-fortune-prompt__header button {
          min-width: 82px;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(196, 181, 253, 0.24);
          border-radius: 999px;
          background: rgba(10, 8, 24, 0.58);
          color: #e2e0f0;
          font-size: 12px;
          cursor: pointer;
        }

        .ai-fortune-prompt pre {
          max-height: 360px;
          overflow: auto;
          margin: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          color: rgba(226, 224, 240, 0.82);
          font-family: "Noto Serif KR", serif;
          font-size: 13px;
          line-height: 1.8;
        }

        .crystal-title-row h1,
        .crystal-subtitle,
        .gem-card__name,
        .rub-kicker,
        .rub-hint,
        .reader-gem-pin,
        .reader-bubble p,
        .card-reading-bubble__card strong,
        .card-reading-bubble p,
        .reading-result__sticky,
        .reading-result h2,
        .synthesis-panel p,
        .result-card p,
        .gem-message,
        .result-card h3,
        .result-card .result-card__gem-reading,
        .ai-fortune-prompt__header,
        .ai-fortune-prompt pre {
          font-family: var(--crystal-font-display);
          font-feature-settings: "kern" 1;
          text-rendering: optimizeLegibility;
        }

        .result-actions {
          position: sticky;
          bottom: 14px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
          padding: 10px;
          border: 1px solid rgba(167, 139, 250, 0.16);
          border-radius: 999px;
          background: rgba(10, 8, 24, 0.78);
          backdrop-filter: blur(16px);
        }

        .result-actions button {
          min-height: 40px;
          padding: 9px 14px;
          font-size: 13px;
        }

        .crystal-type-cursor {
          display: inline-block;
          width: 1px;
          height: 1.1em;
          margin-left: 2px;
          background: #c4b5fd;
          vertical-align: -0.15em;
          animation: blink 0.8s step-end infinite;
        }

        .tarot-card__back::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 42%, rgba(255, 255, 255, 0.16) 50%, transparent 58%);
          transform: translateX(-120%);
          animation: crystalSheen 4.2s ease-in-out infinite;
        }

        .spread-item.is-open .tarot-card::after {
          content: "";
          position: absolute;
          inset: -16px;
          z-index: -1;
          border-radius: 22px;
          pointer-events: none;
          background: radial-gradient(circle, color-mix(in srgb, var(--active-gem), transparent 58%), transparent 70%);
          filter: blur(12px);
          animation: crystalReveal 1s ease both;
        }

        .crystal-primary-button {
          background: linear-gradient(135deg, color-mix(in srgb, var(--active-gem), transparent 52%), color-mix(in srgb, var(--active-gem), transparent 80%));
          border-color: color-mix(in srgb, var(--active-gem), transparent 48%);
          box-shadow: 0 14px 34px -14px var(--active-gem);
        }

        .crystal-primary-button:hover {
          background: linear-gradient(135deg, color-mix(in srgb, var(--active-gem), transparent 42%), color-mix(in srgb, var(--active-gem), transparent 72%));
          border-color: color-mix(in srgb, var(--active-gem), transparent 34%);
        }

        .gem-message {
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--active-gem), transparent 84%), 0 14px 40px -26px color-mix(in srgb, var(--active-gem), transparent 40%);
        }

        @keyframes crystalStarDrift {
          from { background-position: 0 0, 0 0, 0 0; }
          to { background-position: 108px 216px, -154px 154px, 188px -188px; }
        }

        @keyframes crystalAurora {
          from { transform: translate3d(-3%, -2%, 0) scale(1); opacity: 0.65; }
          to { transform: translate3d(4%, 3%, 0) scale(1.08); opacity: 1; }
        }

        @keyframes crystalSheen {
          0%, 68% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        @keyframes crystalReveal {
          0% { opacity: 0; transform: scale(0.7); }
          45% { opacity: 0.95; }
          100% { opacity: 0.4; transform: scale(1); }
        }

        @keyframes gemFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes gemGlow {
          0%, 100% { filter: drop-shadow(0 0 8px var(--gem-color)); }
          50% { filter: drop-shadow(0 0 20px var(--gem-color)); }
        }

        @keyframes gemRub {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes cardFlip {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(180deg); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes crystalHintPulse {
          from { opacity: 0.5; }
          to { opacity: 0.88; }
        }

        @keyframes crystalRubAura {
          to { transform: rotate(360deg); }
        }

        @keyframes crystalRubTexture {
          0% { transform: translate(-2px, 1px) rotate(0deg); }
          50% { transform: translate(2px, -1px) rotate(1deg); }
          100% { transform: translate(-2px, 1px) rotate(0deg); }
        }

        @keyframes crystalSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes crystalSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes crystalSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cardParticle {
          0% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg) translateX(0) scale(0.6); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(120deg) translateX(42px) scale(1.1); }
        }

        @media (max-width: 740px) {
          .crystal-soul-shell {
            padding-inline: 12px;
          }

          .gem-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gem-card {
            min-height: 176px;
            padding: 16px 10px;
          }

          .gem-card:last-child {
            grid-column: auto;
            width: auto;
            justify-self: stretch;
          }

          .card-spread {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }

          .spread-item {
            grid-column: span 2;
          }

          .spread-item:nth-child(4) {
            grid-column: 2 / span 2;
          }

          .spread-item:nth-child(5) {
            grid-column: 4 / span 2;
          }

          .tarot-card {
            width: 80px;
            height: 128px;
          }

          .card-reading-bubble {
            width: min(290px, 94vw);
          }

          .result-card {
            grid-template-columns: 72px 1fr;
          }

          .result-card img {
            width: 72px;
            height: 112px;
          }
        }

        @media (max-width: 430px) {
          .gem-grid {
            gap: 10px;
          }

          .gem-card__keywords {
            font-size: 11px;
          }

          .reader-bubble {
            grid-template-columns: 1fr;
          }

          .reader-bubble__mark {
            display: none;
          }

          .reader-bubble p {
            min-height: 154px;
            font-size: 16px;
          }

          .result-actions {
            border-radius: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
