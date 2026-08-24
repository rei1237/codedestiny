"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { trackEvent } from "@/lib/analytics";
import { getApiBaseUrl } from "../../_lib/api-config";
import {
  authFetch,
  isMobileAppRuntime,
  mobileAppAuthHeaders,
  persistMobileAppAccessToken,
  persistMobileAppRefreshToken,
} from "../../_lib/auth-client";
import { formatKoreanPhoneInput, normalizeKoreanPhoneNumber } from "../../_lib/korean-phone";
import { resolveAuthReturnPath, sanitizeAuthReturnPath } from "../../_lib/auth-return";
import { hydrateAuthSuccessUser, login } from "../../_lib/auth-store";
import { AUTH_INPUT, AUTH_LABEL } from "./styles";

type AuthMode = "login" | "signup";
type SocialProvider = "google" | "naver" | "kakao";
type AuthUser = { role?: string; [key: string]: unknown };

/** worker/lib/validation.js 의 MIN_NEW_PASSWORD_LENGTH 와 같은 값이어야 한다(가입·변경 전용). */
const MIN_NEW_PASSWORD_LENGTH = 10;

/* 가입 직후 프로필 카드가 서버 왕복을 기다리지 않게 하는 1회성 힌트.
   handleRegister(worker/routes/auth.js) 는 ProfileCard 를 한 장도 만들지 않으므로, "방금 가입했다"는
   곧 "카드 0장"이 확정이라는 뜻이다. 그 사실을 홈 셸에 넘겨 로딩 카드를 건너뛰게 한다.
   🔴 로그인에는 절대 쓰지 말 것 — 로그인 계정은 카드가 있을 수 있고, 그러면 "작성하세요"가 잘못 뜬다.
   읽는 쪽 정본은 js/destiny-profile.js 의 _dpConsumeFreshSignupHint 다. 키·형식이 그쪽과 같아야 한다. */
const FRESH_SIGNUP_HINT_KEY = "cd_fresh_signup_v1";

function markFreshSignup(user?: AuthUser) {
  const scope = String(user?.id || user?.userId || user?._id || user?.uid || "").trim().toLowerCase();
  if (!scope) return;
  try {
    sessionStorage.setItem(FRESH_SIGNUP_HINT_KEY, JSON.stringify({ scope, at: Date.now() }));
  } catch { /* 저장 실패는 기존 로딩 카드 경로로 폴백될 뿐이라 조용히 넘어간다 */ }
}

type Copy = {
  loginTitle: string; signupTitle: string; loginDescription: string; signupDescription: string;
  socialLabel: string; google: string; naver: string; kakao: string; moving: string; orEmail: string;
  email: string; password: string; name: string; phone: string; phoneHint: string; invalidPhone: string;
  showPassword: string; hidePassword: string; capsLock: string; passwordHint: string; login: string; signup: string;
  processing: string; switchToSignup: string; switchToLogin: string; noAccount: string; hasAccount: string;
  privacy: string; privacySummary: string; terms: string; birthYear: string; invalidAge: string; agreeOnSubmit: string; finishTitle: string;
  finishDescription: string; finish: string; invalidEmail: string; invalidSignup: string;
  credentialsError: string; network: string; unavailable: string; providerPolicy: string;
};

const EN: Copy = {
  loginTitle: "Welcome back", signupTitle: "Save your destiny safely",
  loginDescription: "Continue quickly with a social account or email.",
  signupDescription: "Sign up and get 500 moonstones (worth ₩5,000) right away, usable on paid readings for 30 days. We only ask for the essentials.",
  socialLabel: "Continue with a social account", google: "Continue with Google", naver: "Continue with Naver",
  kakao: "Continue with Kakao", moving: "Opening authentication…", orEmail: "or use email",
  email: "Email", password: "Password", name: "Name", phone: "Mobile number",
  phoneHint: "Used to identify your account and to process card payments. Korean mobile numbers only (010…).",
  invalidPhone: "Enter a valid Korean mobile number.",
  showPassword: "Show password", hidePassword: "Hide password", capsLock: "Caps Lock is on.",
  passwordHint: `At least ${MIN_NEW_PASSWORD_LENGTH} characters. Passwords found in known breaches are rejected.`,
  login: "Log in", signup: "Create account", processing: "Checking securely…",
  switchToSignup: "Create account", switchToLogin: "Log in", noAccount: "New here?", hasAccount: "Already have an account?",
  privacy: "Privacy Policy",
  privacySummary: "Name, email, mobile number / account management and payment / until account deletion, except where law requires retention.",
  terms: "Terms of Service",
  birthYear: "Birth year", invalidAge: "You must be at least 14 years old to sign up.", agreeOnSubmit: "By signing up you agree to the following.",
  finishTitle: "One last check", finishDescription: "We only need a few details and the required agreements.",
  finish: "Finish and continue", invalidEmail: "Enter a valid email address.",
  invalidSignup: "Check your name, password, mobile number, and required agreements.",
  credentialsError: "Check your email or password.", network: "The connection is unstable. Your entries are still here.",
  unavailable: "Authentication is temporarily unavailable. Try again shortly.",
  providerPolicy: "Your social provider’s account security policy also applies.",
};

const COPY: Partial<Record<LoadingLocale, Copy>> = {
  ko: {
    loginTitle: "다시 만나서 반가워요", signupTitle: "운명의 기록을 안전하게 저장해 보세요",
    loginDescription: "소셜 계정 또는 이메일로 빠르게 이어갈 수 있어요.",
    signupDescription: "가입하면 월정석 500개(5,000원 상당)를 바로 드려요 — 30일 안에 유료 콘텐츠에 쓸 수 있어요. 계정에는 꼭 필요한 정보만 받아요.",
    socialLabel: "소셜 계정으로 계속하기", google: "Google로 계속하기", naver: "네이버로 계속하기",
    kakao: "카카오로 계속하기", moving: "인증 화면으로 이동 중…", orEmail: "또는 이메일로 계속하기",
    email: "이메일", password: "비밀번호", name: "이름", phone: "휴대폰 번호",
    phoneHint: "계정 확인과 카드 결제 진행에 사용해요. 국내 휴대폰 번호(010…)만 받아요.",
    invalidPhone: "휴대폰 번호를 정확히 입력해 주세요.",
    showPassword: "비밀번호 보기", hidePassword: "비밀번호 숨기기", capsLock: "Caps Lock이 켜져 있어요.",
    passwordHint: `${MIN_NEW_PASSWORD_LENGTH}자 이상이어야 하고, 이미 유출된 것으로 알려진 비밀번호는 쓸 수 없어요.`,
    login: "로그인", signup: "가입하고 바로 시작하기", processing: "안전하게 확인 중…",
    switchToSignup: "회원가입", switchToLogin: "로그인", noAccount: "처음 오셨나요?", hasAccount: "이미 계정이 있나요?",
    privacy: "개인정보처리방침",
    privacySummary: "수집: 이름·이메일·휴대폰 번호 / 목적: 계정 관리·결제 진행 / 보유: 탈퇴 시까지(법령상 보존 제외)",
    terms: "이용약관",
    birthYear: "태어난 연도", invalidAge: "만 14세 미만은 대한민국 관련 법령에 따라 가입할 수 없습니다.", agreeOnSubmit: "가입하면 아래에 동의하는 것으로 봅니다.",
    finishTitle: "마지막으로 조금만 확인할게요", finishDescription: "몇 가지만 확인하면 바로 이용할 수 있어요.",
    finish: "확인하고 바로 시작하기", invalidEmail: "이메일 형식을 확인해 주세요.",
    invalidSignup: "이름·비밀번호·휴대폰 번호와 필수 동의를 확인해 주세요.",
    credentialsError: "이메일 또는 비밀번호를 다시 확인해 주세요.",
    network: "잠시 연결이 불안정해요. 입력한 내용은 그대로 유지했어요.",
    unavailable: "인증 서비스가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.",
    providerPolicy: "소셜 인증 제공자의 계정 보안 정책도 함께 적용됩니다.",
  },
  ja: {
    loginTitle: "おかえりなさい", signupTitle: "運命の記録を安全に保存しましょう",
    loginDescription: "ソーシャルアカウントまたはメールで手早く続けられます。",
    signupDescription: "登録すると月光石500個(₩5,000相当)をすぐにプレゼント — 30日以内に有料コンテンツで使えます。必要最小限の情報のみお伺いします。",
    socialLabel: "ソーシャルアカウントで続ける", google: "Googleで続ける", naver: "Naverで続ける",
    kakao: "Kakaoで続ける", moving: "認証画面に移動しています…", orEmail: "またはメールで続ける",
    email: "メールアドレス", password: "パスワード", name: "お名前", phone: "携帯電話番号",
    phoneHint: "アカウント確認とカード決済に使用します。韓国の携帯電話番号(010…)のみ対応しています。",
    invalidPhone: "有効な韓国の携帯電話番号を入力してください。",
    showPassword: "パスワードを表示", hidePassword: "パスワードを隠す", capsLock: "Caps Lockがオンになっています。",
    passwordHint: `${MIN_NEW_PASSWORD_LENGTH}文字以上で入力してください。漏えいが確認されているパスワードは使用できません。`,
    login: "ログイン", signup: "登録して始める", processing: "安全に確認しています…",
    switchToSignup: "会員登録", switchToLogin: "ログイン", noAccount: "はじめてですか?", hasAccount: "すでにアカウントをお持ちですか?",
    privacy: "プライバシーポリシー",
    privacySummary: "収集項目: 名前・メールアドレス・携帯電話番号 / 目的: アカウント管理・決済処理 / 保存期間: 退会まで(法令上の保存義務を除く)",
    terms: "利用規約",
    birthYear: "生まれた年", invalidAge: "満14歳未満の方はご登録いただけません。", agreeOnSubmit: "登録すると以下に同意したものとみなされます。",
    finishTitle: "最後にもう少しだけ確認します", finishDescription: "必要な情報と同意事項だけ確認すればすぐにご利用いただけます。",
    finish: "確認してすぐに始める", invalidEmail: "有効なメールアドレスを入力してください。",
    invalidSignup: "お名前・パスワード・携帯電話番号と必須同意事項をご確認ください。",
    credentialsError: "メールアドレスまたはパスワードをご確認ください。",
    network: "接続が不安定です。入力内容はそのまま保持されています。",
    unavailable: "認証サービスが一時的にご利用いただけません。しばらくしてから再度お試しください。",
    providerPolicy: "ご利用のソーシャル提供元のアカウントセキュリティポリシーも適用されます。",
  },
  "zh-CN": {
    loginTitle: "欢迎回来", signupTitle: "安全保存你的命运记录",
    loginDescription: "使用社交账号或邮箱即可快速继续。",
    signupDescription: "注册即可立即获得500个月光石(价值₩5,000) — 30天内可用于付费内容。我们只收集必要的信息。",
    socialLabel: "使用社交账号继续", google: "使用Google继续", naver: "使用Naver继续",
    kakao: "使用Kakao继续", moving: "正在跳转到认证页面…", orEmail: "或使用邮箱继续",
    email: "电子邮箱", password: "密码", name: "姓名", phone: "手机号码",
    phoneHint: "用于账户验证和银行卡支付。仅支持韩国手机号码(010开头)。",
    invalidPhone: "请输入有效的韩国手机号码。",
    showPassword: "显示密码", hidePassword: "隐藏密码", capsLock: "大写锁定已开启。",
    passwordHint: `至少${MIN_NEW_PASSWORD_LENGTH}个字符。已知泄露的密码将被拒绝。`,
    login: "登录", signup: "注册并开始", processing: "正在安全验证…",
    switchToSignup: "注册", switchToLogin: "登录", noAccount: "第一次使用?", hasAccount: "已有账号?",
    privacy: "隐私政策",
    privacySummary: "收集项目: 姓名·邮箱·手机号码 / 用途: 账户管理·支付处理 / 保留期限: 至注销为止(法律要求保留的除外)",
    terms: "服务条款",
    birthYear: "出生年份", invalidAge: "未满14周岁无法注册。", agreeOnSubmit: "注册即视为您同意以下内容。",
    finishTitle: "最后再确认一下", finishDescription: "只需确认必要信息和同意事项即可立即使用。",
    finish: "确认并立即开始", invalidEmail: "请输入有效的邮箱地址。",
    invalidSignup: "请确认姓名·密码·手机号码及必选同意事项。",
    credentialsError: "请确认邮箱或密码。",
    network: "连接暂时不稳定。您输入的内容已保留。",
    unavailable: "认证服务暂时不可用,请稍后重试。",
    providerPolicy: "同时适用您所用社交账号提供方的账户安全政策。",
  },
  "zh-TW": {
    loginTitle: "歡迎回來", signupTitle: "安全保存你的命運記錄",
    loginDescription: "使用社群帳號或電子郵件即可快速繼續。",
    signupDescription: "註冊即可立即獲得500個月光石(價值₩5,000) — 30天內可用於付費內容。我們只收集必要的資訊。",
    socialLabel: "使用社群帳號繼續", google: "使用Google繼續", naver: "使用Naver繼續",
    kakao: "使用Kakao繼續", moving: "正在前往驗證畫面…", orEmail: "或使用電子郵件繼續",
    email: "電子郵件", password: "密碼", name: "姓名", phone: "手機號碼",
    phoneHint: "用於帳戶驗證與卡片付款。僅支援韓國手機號碼(010開頭)。",
    invalidPhone: "請輸入有效的韓國手機號碼。",
    showPassword: "顯示密碼", hidePassword: "隱藏密碼", capsLock: "大寫鎖定已開啟。",
    passwordHint: `至少需要${MIN_NEW_PASSWORD_LENGTH}個字元。已知外洩的密碼將被拒絕。`,
    login: "登入", signup: "註冊並開始", processing: "正在安全驗證中…",
    switchToSignup: "註冊", switchToLogin: "登入", noAccount: "第一次使用嗎?", hasAccount: "已經有帳號了嗎?",
    privacy: "隱私權政策",
    privacySummary: "蒐集項目: 姓名·電子郵件·手機號碼 / 用途: 帳戶管理·付款處理 / 保存期限: 至退出會員為止(法令要求保存者除外)",
    terms: "服務條款",
    birthYear: "出生年份", invalidAge: "未滿14歲無法註冊。", agreeOnSubmit: "註冊即視為您同意以下內容。",
    finishTitle: "最後再確認一下", finishDescription: "只要確認必要資訊與同意事項即可立即使用。",
    finish: "確認並立即開始", invalidEmail: "請輸入有效的電子郵件地址。",
    invalidSignup: "請確認姓名·密碼·手機號碼與必要同意事項。",
    credentialsError: "請確認電子郵件或密碼。",
    network: "連線暫時不穩定。您輸入的內容已保留。",
    unavailable: "驗證服務暫時無法使用,請稍後再試。",
    providerPolicy: "同時適用您所使用社群帳號提供方的帳戶安全政策。",
  },
  vi: {
    loginTitle: "Chào mừng bạn trở lại", signupTitle: "Lưu trữ vận mệnh của bạn một cách an toàn",
    loginDescription: "Tiếp tục nhanh chóng bằng tài khoản mạng xã hội hoặc email.",
    signupDescription: "Đăng ký để nhận ngay 500 đá mặt trăng (trị giá ₩5.000) — dùng được cho nội dung trả phí trong 30 ngày. Chúng tôi chỉ thu thập thông tin cần thiết.",
    socialLabel: "Tiếp tục bằng tài khoản mạng xã hội", google: "Tiếp tục với Google", naver: "Tiếp tục với Naver",
    kakao: "Tiếp tục với Kakao", moving: "Đang chuyển đến màn hình xác thực…", orEmail: "hoặc dùng email",
    email: "Email", password: "Mật khẩu", name: "Họ tên", phone: "Số điện thoại di động",
    phoneHint: "Dùng để xác minh tài khoản và xử lý thanh toán thẻ. Chỉ hỗ trợ số điện thoại di động Hàn Quốc (010…).",
    invalidPhone: "Vui lòng nhập số điện thoại di động Hàn Quốc hợp lệ.",
    showPassword: "Hiện mật khẩu", hidePassword: "Ẩn mật khẩu", capsLock: "Caps Lock đang bật.",
    passwordHint: `Tối thiểu ${MIN_NEW_PASSWORD_LENGTH} ký tự. Mật khẩu từng bị rò rỉ sẽ không được chấp nhận.`,
    login: "Đăng nhập", signup: "Tạo tài khoản", processing: "Đang xác thực an toàn…",
    switchToSignup: "Tạo tài khoản", switchToLogin: "Đăng nhập", noAccount: "Lần đầu đến đây?", hasAccount: "Đã có tài khoản?",
    privacy: "Chính sách bảo mật",
    privacySummary: "Thu thập: Họ tên·Email·Số điện thoại / Mục đích: Quản lý tài khoản·Xử lý thanh toán / Lưu trữ: Đến khi xóa tài khoản (trừ trường hợp pháp luật yêu cầu lưu giữ)",
    terms: "Điều khoản dịch vụ",
    birthYear: "Năm sinh", invalidAge: "Bạn phải từ 14 tuổi trở lên để đăng ký.", agreeOnSubmit: "Khi đăng ký, bạn đồng ý với các nội dung sau.",
    finishTitle: "Chỉ còn một bước kiểm tra cuối cùng", finishDescription: "Chỉ cần xác nhận vài thông tin và các đồng ý bắt buộc là có thể sử dụng ngay.",
    finish: "Xác nhận và bắt đầu ngay", invalidEmail: "Vui lòng nhập địa chỉ email hợp lệ.",
    invalidSignup: "Vui lòng kiểm tra họ tên, mật khẩu, số điện thoại và các đồng ý bắt buộc.",
    credentialsError: "Vui lòng kiểm tra lại email hoặc mật khẩu.",
    network: "Kết nối tạm thời không ổn định. Nội dung bạn đã nhập vẫn được giữ nguyên.",
    unavailable: "Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.",
    providerPolicy: "Chính sách bảo mật tài khoản của nhà cung cấp mạng xã hội cũng sẽ được áp dụng.",
  },
  hi: {
    loginTitle: "वापसी पर स्वागत है", signupTitle: "अपनी नियति को सुरक्षित रूप से सहेजें",
    loginDescription: "सोशल खाते या ईमेल से तुरंत जारी रखें।",
    signupDescription: "साइन अप करते ही आपको तुरंत 500 मूनस्टोन (₩5,000 मूल्य के) मिलेंगे — 30 दिनों तक पेड कंटेंट पर उपयोग कर सकते हैं। हम केवल ज़रूरी जानकारी माँगते हैं।",
    socialLabel: "सोशल खाते से जारी रखें", google: "Google से जारी रखें", naver: "Naver से जारी रखें",
    kakao: "Kakao से जारी रखें", moving: "प्रमाणीकरण स्क्रीन पर जा रहे हैं…", orEmail: "या ईमेल से जारी रखें",
    email: "ईमेल", password: "पासवर्ड", name: "नाम", phone: "मोबाइल नंबर",
    phoneHint: "खाता सत्यापन और कार्ड भुगतान के लिए उपयोग किया जाता है। केवल कोरियाई मोबाइल नंबर (010…) स्वीकार किए जाते हैं।",
    invalidPhone: "कृपया मान्य कोरियाई मोबाइल नंबर दर्ज करें।",
    showPassword: "पासवर्ड दिखाएँ", hidePassword: "पासवर्ड छिपाएँ", capsLock: "Caps Lock चालू है।",
    passwordHint: `कम से कम ${MIN_NEW_PASSWORD_LENGTH} अक्षर होने चाहिए। ज्ञात रूप से लीक हुए पासवर्ड स्वीकार नहीं किए जाते।`,
    login: "लॉग इन करें", signup: "खाता बनाएँ", processing: "सुरक्षित रूप से जाँच रहे हैं…",
    switchToSignup: "खाता बनाएँ", switchToLogin: "लॉग इन करें", noAccount: "पहली बार आए हैं?", hasAccount: "पहले से खाता है?",
    privacy: "गोपनीयता नीति",
    privacySummary: "संग्रह: नाम·ईमेल·मोबाइल नंबर / उद्देश्य: खाता प्रबंधन·भुगतान प्रक्रिया / अवधि: खाता हटाने तक (कानूनी आवश्यकता को छोड़कर)",
    terms: "सेवा की शर्तें",
    birthYear: "जन्म का वर्ष", invalidAge: "साइन अप करने के लिए आपकी आयु कम से कम 14 वर्ष होनी चाहिए।", agreeOnSubmit: "साइन अप करने पर आप निम्नलिखित से सहमत होते हैं।",
    finishTitle: "बस आखिरी जाँच बाकी है", finishDescription: "बस कुछ जानकारी और आवश्यक सहमति चाहिए, फिर आप तुरंत उपयोग कर सकते हैं।",
    finish: "पुष्टि करें और तुरंत शुरू करें", invalidEmail: "कृपया मान्य ईमेल पता दर्ज करें।",
    invalidSignup: "कृपया अपना नाम, पासवर्ड, मोबाइल नंबर और आवश्यक सहमति जाँचें।",
    credentialsError: "कृपया अपना ईमेल या पासवर्ड जाँचें।",
    network: "कनेक्शन अस्थायी रूप से अस्थिर है। आपकी दर्ज की गई जानकारी सुरक्षित है।",
    unavailable: "प्रमाणीकरण सेवा अस्थायी रूप से अनुपलब्ध है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
    providerPolicy: "आपके सोशल प्रदाता की खाता सुरक्षा नीति भी लागू होती है।",
  },
  es: {
    loginTitle: "Bienvenido de nuevo", signupTitle: "Guarda tu destino de forma segura",
    loginDescription: "Continúa rápidamente con una cuenta social o correo electrónico.",
    signupDescription: "Regístrate y recibe al instante 500 piedras lunares (valoradas en ₩5.000) — utilizables en contenido de pago durante 30 días. Solo pedimos lo esencial.",
    socialLabel: "Continuar con una cuenta social", google: "Continuar con Google", naver: "Continuar con Naver",
    kakao: "Continuar con Kakao", moving: "Abriendo la autenticación…", orEmail: "o usa tu correo electrónico",
    email: "Correo electrónico", password: "Contraseña", name: "Nombre", phone: "Número de móvil",
    phoneHint: "Se usa para verificar tu cuenta y procesar pagos con tarjeta. Solo se admiten números de móvil coreanos (010…).",
    invalidPhone: "Introduce un número de móvil coreano válido.",
    showPassword: "Mostrar contraseña", hidePassword: "Ocultar contraseña", capsLock: "Bloq Mayús está activado.",
    passwordHint: `Al menos ${MIN_NEW_PASSWORD_LENGTH} caracteres. Se rechazan las contraseñas encontradas en filtraciones conocidas.`,
    login: "Iniciar sesión", signup: "Crear cuenta", processing: "Verificando de forma segura…",
    switchToSignup: "Crear cuenta", switchToLogin: "Iniciar sesión", noAccount: "¿Primera vez aquí?", hasAccount: "¿Ya tienes una cuenta?",
    privacy: "Política de privacidad",
    privacySummary: "Recopilación: nombre, correo electrónico, número de móvil / Finalidad: gestión de cuenta y procesamiento de pagos / Conservación: hasta la eliminación de la cuenta, salvo obligación legal.",
    terms: "Términos del servicio",
    birthYear: "Año de nacimiento", invalidAge: "Debes tener al menos 14 años para registrarte.", agreeOnSubmit: "Al registrarte, aceptas lo siguiente.",
    finishTitle: "Una última comprobación", finishDescription: "Solo necesitamos unos datos y los consentimientos obligatorios.",
    finish: "Confirmar y continuar", invalidEmail: "Introduce una dirección de correo electrónico válida.",
    invalidSignup: "Comprueba tu nombre, contraseña, número de móvil y los consentimientos obligatorios.",
    credentialsError: "Comprueba tu correo electrónico o contraseña.",
    network: "La conexión es inestable por el momento. Tus datos introducidos siguen aquí.",
    unavailable: "El servicio de autenticación no está disponible temporalmente. Vuelve a intentarlo en breve.",
    providerPolicy: "También se aplica la política de seguridad de cuentas de tu proveedor social.",
  },
  fr: {
    loginTitle: "Content de vous revoir", signupTitle: "Sauvegardez votre destin en toute sécurité",
    loginDescription: "Continuez rapidement avec un compte social ou un e-mail.",
    signupDescription: "Inscrivez-vous et recevez immédiatement 500 pierres de lune (d'une valeur de ₩5 000) — utilisables sur le contenu payant pendant 30 jours. Nous ne demandons que l'essentiel.",
    socialLabel: "Continuer avec un compte social", google: "Continuer avec Google", naver: "Continuer avec Naver",
    kakao: "Continuer avec Kakao", moving: "Ouverture de l'authentification…", orEmail: "ou utilisez votre e-mail",
    email: "E-mail", password: "Mot de passe", name: "Nom", phone: "Numéro de mobile",
    phoneHint: "Utilisé pour vérifier votre compte et traiter les paiements par carte. Seuls les numéros de mobile coréens (010…) sont acceptés.",
    invalidPhone: "Veuillez saisir un numéro de mobile coréen valide.",
    showPassword: "Afficher le mot de passe", hidePassword: "Masquer le mot de passe", capsLock: "Le verrouillage majuscules est activé.",
    passwordHint: `Au moins ${MIN_NEW_PASSWORD_LENGTH} caractères. Les mots de passe connus pour avoir été compromis sont refusés.`,
    login: "Se connecter", signup: "Créer un compte", processing: "Vérification sécurisée en cours…",
    switchToSignup: "Créer un compte", switchToLogin: "Se connecter", noAccount: "Première visite ?", hasAccount: "Vous avez déjà un compte ?",
    privacy: "Politique de confidentialité",
    privacySummary: "Collecte : nom, e-mail, numéro de mobile / Finalité : gestion du compte, traitement des paiements / Conservation : jusqu'à la suppression du compte, sauf obligation légale.",
    terms: "Conditions d'utilisation",
    birthYear: "Année de naissance", invalidAge: "Vous devez avoir au moins 14 ans pour vous inscrire.", agreeOnSubmit: "En vous inscrivant, vous acceptez ce qui suit.",
    finishTitle: "Encore une dernière vérification", finishDescription: "Il ne reste que quelques informations et les consentements obligatoires à confirmer.",
    finish: "Confirmer et continuer", invalidEmail: "Veuillez saisir une adresse e-mail valide.",
    invalidSignup: "Veuillez vérifier votre nom, mot de passe, numéro de mobile et les consentements obligatoires.",
    credentialsError: "Veuillez vérifier votre e-mail ou votre mot de passe.",
    network: "La connexion est instable pour le moment. Vos informations saisies sont conservées.",
    unavailable: "Le service d'authentification est temporairement indisponible. Réessayez dans un instant.",
    providerPolicy: "La politique de sécurité du compte de votre fournisseur social s'applique également.",
  },
  de: {
    loginTitle: "Willkommen zurück", signupTitle: "Speichere dein Schicksal sicher",
    loginDescription: "Setze schnell mit einem sozialen Konto oder deiner E-Mail-Adresse fort.",
    signupDescription: "Registriere dich und erhalte sofort 500 Mondsteine (im Wert von ₩5.000) — einlösbar für kostenpflichtige Inhalte innerhalb von 30 Tagen. Wir fragen nur das Nötigste ab.",
    socialLabel: "Mit einem sozialen Konto fortfahren", google: "Mit Google fortfahren", naver: "Mit Naver fortfahren",
    kakao: "Mit Kakao fortfahren", moving: "Authentifizierung wird geöffnet…", orEmail: "oder per E-Mail fortfahren",
    email: "E-Mail", password: "Passwort", name: "Name", phone: "Mobilnummer",
    phoneHint: "Wird zur Kontoprüfung und für Kartenzahlungen verwendet. Es werden nur koreanische Mobilnummern (010…) unterstützt.",
    invalidPhone: "Bitte gib eine gültige koreanische Mobilnummer ein.",
    showPassword: "Passwort anzeigen", hidePassword: "Passwort verbergen", capsLock: "Feststelltaste ist aktiviert.",
    passwordHint: `Mindestens ${MIN_NEW_PASSWORD_LENGTH} Zeichen. Passwörter aus bekannten Datenlecks werden abgelehnt.`,
    login: "Anmelden", signup: "Konto erstellen", processing: "Sichere Überprüfung läuft…",
    switchToSignup: "Konto erstellen", switchToLogin: "Anmelden", noAccount: "Zum ersten Mal hier?", hasAccount: "Bereits ein Konto?",
    privacy: "Datenschutzerklärung",
    privacySummary: "Erhebung: Name, E-Mail, Mobilnummer / Zweck: Kontoverwaltung, Zahlungsabwicklung / Speicherdauer: bis zur Kontolöschung, sofern gesetzlich nicht anders vorgeschrieben.",
    terms: "Nutzungsbedingungen",
    birthYear: "Geburtsjahr", invalidAge: "Sie müssen mindestens 14 Jahre alt sein, um sich zu registrieren.", agreeOnSubmit: "Mit der Registrierung stimmen Sie dem Folgenden zu.",
    finishTitle: "Nur noch eine letzte Prüfung", finishDescription: "Wir brauchen nur noch ein paar Angaben und die erforderlichen Zustimmungen.",
    finish: "Bestätigen und fortfahren", invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    invalidSignup: "Bitte überprüfe deinen Namen, dein Passwort, deine Mobilnummer und die erforderlichen Zustimmungen.",
    credentialsError: "Bitte überprüfe deine E-Mail-Adresse oder dein Passwort.",
    network: "Die Verbindung ist momentan instabil. Deine Eingaben bleiben erhalten.",
    unavailable: "Der Authentifizierungsdienst ist vorübergehend nicht verfügbar. Bitte versuche es in Kürze erneut.",
    providerPolicy: "Die Kontosicherheitsrichtlinie deines sozialen Anbieters gilt ebenfalls.",
  },
  nl: {
    loginTitle: "Welkom terug", signupTitle: "Bewaar je lot veilig",
    loginDescription: "Ga snel verder met een sociaal account of e-mailadres.",
    signupDescription: "Meld je aan en ontvang direct 500 maanstenen (ter waarde van ₩5.000) — te gebruiken voor betaalde content gedurende 30 dagen. We vragen alleen het hoognodige.",
    socialLabel: "Doorgaan met een sociaal account", google: "Doorgaan met Google", naver: "Doorgaan met Naver",
    kakao: "Doorgaan met Kakao", moving: "Verificatiescherm wordt geopend…", orEmail: "of ga verder met e-mail",
    email: "E-mail", password: "Wachtwoord", name: "Naam", phone: "Mobiel nummer",
    phoneHint: "Wordt gebruikt om je account te verifiëren en kaartbetalingen te verwerken. Alleen Koreaanse mobiele nummers (010…) worden ondersteund.",
    invalidPhone: "Voer een geldig Koreaans mobiel nummer in.",
    showPassword: "Wachtwoord tonen", hidePassword: "Wachtwoord verbergen", capsLock: "Caps Lock staat aan.",
    passwordHint: `Minimaal ${MIN_NEW_PASSWORD_LENGTH} tekens. Wachtwoorden die bekend zijn van datalekken worden geweigerd.`,
    login: "Inloggen", signup: "Account aanmaken", processing: "Veilig aan het controleren…",
    switchToSignup: "Account aanmaken", switchToLogin: "Inloggen", noAccount: "Voor het eerst hier?", hasAccount: "Heb je al een account?",
    privacy: "Privacybeleid",
    privacySummary: "Verzameling: naam, e-mail, mobiel nummer / Doel: accountbeheer, betalingsverwerking / Bewaartermijn: tot verwijdering van het account, tenzij wettelijk anders vereist.",
    terms: "Servicevoorwaarden",
    birthYear: "Geboortejaar", invalidAge: "Je moet minstens 14 jaar oud zijn om je aan te melden.", agreeOnSubmit: "Door je aan te melden ga je akkoord met het volgende.",
    finishTitle: "Nog één laatste controle", finishDescription: "We hebben alleen nog wat gegevens en de verplichte toestemmingen nodig.",
    finish: "Bevestigen en direct beginnen", invalidEmail: "Voer een geldig e-mailadres in.",
    invalidSignup: "Controleer je naam, wachtwoord, mobiel nummer en de verplichte toestemmingen.",
    credentialsError: "Controleer je e-mailadres of wachtwoord.",
    network: "De verbinding is momenteel onstabiel. Je ingevoerde gegevens blijven behouden.",
    unavailable: "De authenticatieservice is tijdelijk niet beschikbaar. Probeer het straks opnieuw.",
    providerPolicy: "Het accountbeveiligingsbeleid van je sociale provider is ook van toepassing.",
  },
  ms: {
    loginTitle: "Selamat kembali", signupTitle: "Simpan takdir anda dengan selamat",
    loginDescription: "Teruskan dengan pantas menggunakan akaun sosial atau e-mel.",
    signupDescription: "Daftar dan terima serta-merta 500 batu bulan (bernilai ₩5,000) — boleh digunakan untuk kandungan berbayar dalam tempoh 30 hari. Kami hanya meminta maklumat yang perlu.",
    socialLabel: "Teruskan dengan akaun sosial", google: "Teruskan dengan Google", naver: "Teruskan dengan Naver",
    kakao: "Teruskan dengan Kakao", moving: "Membuka skrin pengesahan…", orEmail: "atau gunakan e-mel",
    email: "E-mel", password: "Kata laluan", name: "Nama", phone: "Nombor telefon bimbit",
    phoneHint: "Digunakan untuk mengesahkan akaun anda dan memproses bayaran kad. Hanya nombor telefon bimbit Korea (010…) disokong.",
    invalidPhone: "Sila masukkan nombor telefon bimbit Korea yang sah.",
    showPassword: "Tunjukkan kata laluan", hidePassword: "Sembunyikan kata laluan", capsLock: "Caps Lock sedang aktif.",
    passwordHint: `Sekurang-kurangnya ${MIN_NEW_PASSWORD_LENGTH} aksara. Kata laluan yang diketahui pernah bocor tidak akan diterima.`,
    login: "Log masuk", signup: "Cipta akaun", processing: "Sedang menyemak dengan selamat…",
    switchToSignup: "Cipta akaun", switchToLogin: "Log masuk", noAccount: "Kali pertama di sini?", hasAccount: "Sudah ada akaun?",
    privacy: "Dasar Privasi",
    privacySummary: "Pengumpulan: nama·e-mel·nombor telefon bimbit / Tujuan: pengurusan akaun·pemprosesan bayaran / Tempoh simpanan: sehingga akaun dipadam, kecuali dikehendaki oleh undang-undang.",
    terms: "Terma Perkhidmatan",
    birthYear: "Tahun lahir", invalidAge: "Anda mesti berumur sekurang-kurangnya 14 tahun untuk mendaftar.", agreeOnSubmit: "Dengan mendaftar, anda bersetuju dengan perkara berikut.",
    finishTitle: "Satu semakan terakhir sahaja", finishDescription: "Kami hanya perlukan sedikit maklumat dan persetujuan wajib sahaja.",
    finish: "Sahkan dan mula sekarang", invalidEmail: "Sila masukkan alamat e-mel yang sah.",
    invalidSignup: "Sila semak nama, kata laluan, nombor telefon bimbit dan persetujuan wajib anda.",
    credentialsError: "Sila semak e-mel atau kata laluan anda.",
    network: "Sambungan tidak stabil buat masa ini. Maklumat yang anda masukkan masih disimpan.",
    unavailable: "Perkhidmatan pengesahan tidak tersedia buat sementara waktu. Sila cuba lagi sebentar lagi.",
    providerPolicy: "Dasar keselamatan akaun pembekal sosial anda turut terpakai.",
  },
};

function getCopy(locale: LoadingLocale): Copy { return COPY[locale] || EN; }
function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
// 5xx 는 사용자가 고칠 수 없는 서버 문제라 안내 문구는 그대로 두되, 서버가 준 code·requestId 만
// 괄호로 덧붙인다. 이게 없으면 원인을 알아내려고 개발자도구를 열어야 한다(2026-08 가입 500 사례:
// 화면에는 "일시적으로 사용할 수 없다"만 뜨고 진짜 원인은 응답 본문에만 있었다).
// 🔴 서버 내부 메시지·스택은 절대 싣지 않는다.
function withServerDiagnostics(message: string, payload: { code?: string; requestId?: string }) {
  const parts = [payload?.code, payload?.requestId].filter(Boolean).map(String);
  return parts.length > 0 ? `${message} (${parts.join(" · ")})` : message;
}
export default function AuthShell({ initialMode }: { initialMode: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const [ticket, setTicket] = useState("");
  // 공급자(카카오·네이버)가 동의항목으로 번호를 넘겼는지. 넘겼으면 입력칸을 감춘다.
  // 🔴 표시 판단일 뿐이다 — 이걸 false 로 만들어 번호를 적어 보내도 서버는 티켓의 번호를 쓴다.
  // 공급자 로그인 폼이 만 14세 확인을 이미 받은 경우(카카오)에만 true — 그때는 생년을 묻지 않는다.
  const [socialAgeVerified, setSocialAgeVerified] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState("");
  const copy = getCopy(locale);
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => { window.removeEventListener("languagechange", sync); document.removeEventListener("cd:language-change", sync); };
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTicket(params.get("social_signup") || params.get("socialSignupTicket") || "");
    setSocialAgeVerified(params.get("social_age") === "1");
    if (params.get("error") || params.get("social_error")) setError(copy.unavailable);
  }, [copy.unavailable]);

  // 🔴 서버(worker/lib/validation.js validateBirthYear)와 같은 규칙이다. 여기 검사는 우회
  // 방지가 아니라 오타를 그 자리에서 알려주기 위한 것이고, 판정의 정본은 언제나 서버다.
  const isBirthYearOk = (value: string) => {
    const raw = String(value || "").trim();
    if (!/^\d{4}$/.test(raw)) return false;
    const year = Number(raw);
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const currentYear = kstNow.getUTCFullYear();
    return year >= 1900 && year <= currentYear && currentYear - year >= 14;
  };
  // 카카오는 카카오계정 로그인이 만 14세 확인을 이미 받는다 — 같은 확인을 두 번 묻지 않는다.
  const ageVerifiedByProvider = Boolean(ticket && socialAgeVerified);

  const nextPath = () => resolveAuthReturnPath(new URLSearchParams(window.location.search));
  const redirect = (raw?: string, role?: string) => {
    const target = sanitizeAuthReturnPath(raw) || nextPath();
    if (role === "admin" && target === "/") router.replace("/admin");
    else if (target === "/" || target === "/index.html") window.location.replace("/");
    else router.replace(target);
  };
  const completeClientLogin = (payload: { accessToken?: string; refreshToken?: string; user?: AuthUser }) => {
    if (isMobileAppRuntime() && payload.accessToken) {
      persistMobileAppAccessToken(payload.accessToken);
      persistMobileAppRefreshToken(payload.refreshToken || "");
    }
    if (payload.user) hydrateAuthSuccessUser(payload.user);
  };

  const startSocial = (provider: SocialProvider) => {
    if (socialBusy || busy) return;
    setError(""); setSocialBusy(provider);
    const native = (window as unknown as {
      CodeDestinyNative?: {
        openAuth?: (input: { provider: SocialProvider; nextPath?: string; flow?: AuthMode }) => Promise<{ ok?: boolean; message?: string }>;
      };
    }).CodeDestinyNative;
    if (typeof native?.openAuth === "function") {
      void native.openAuth({ provider, nextPath: nextPath(), flow: mode }).then((result) => {
        if (result?.ok === false) { setError(result.message || copy.unavailable); setSocialBusy(null); }
      }).catch(() => { setError(copy.network); setSocialBusy(null); });
      return;
    }
    const params = new URLSearchParams({ flow: mode, next: nextPath() });
    const current = new URLSearchParams(window.location.search);
    for (const key of ["ref", "rs", "via"]) { const value = current.get(key); if (value) params.set(key, value); }
    window.location.assign(`${apiBase}/api/auth/oauth/${provider}/start?${params.toString()}`);
  };

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email)) { setError(copy.invalidEmail); return; }
    // 🔴 로그인은 8자 그대로다. 기존 회원이 8~9자로 가입했을 수 있어 여기서 올리면 로그인이 막힌다.
    // 가입만 서버(worker/lib/validation.js MIN_NEW_PASSWORD_LENGTH)와 같은 10자를 요구한다.
    const minPasswordLength = mode === "signup" ? MIN_NEW_PASSWORD_LENGTH : 8;
    if (password.length < minPasswordLength) {
      setError(mode === "login" ? copy.credentialsError : copy.invalidSignup); return;
    }
    if (needsBirthYear && !isBirthYearOk(birthYear)) { setError(copy.invalidAge); return; }
    // 🔴 번호는 필수다(2026-08-19 정책). 서버도 같은 규칙으로 다시 판정하므로(validateRegisterPayload)
    // 이 검사는 우회 방지가 아니라 오타를 그 자리에서 알려주기 위한 것이다.
    const normalizedPhone = normalizeKoreanPhoneNumber(phone);
    if (mode === "signup" && !normalizedPhone) { setError(copy.invalidPhone); return; }
    setBusy(true); setError("");
    try {
      if (mode === "login") {
        const result = await login({ email: email.trim(), password, nextPath: nextPath(), apiBase });
        trackEvent("login", { method: "password" });
        redirect(result.nextPath, result.user?.role);
        return;
      }
      const current = new URLSearchParams(window.location.search);
      const response = await authFetch(`${apiBase}/api/auth/register`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ email: email.trim(), password, phoneNumber: normalizedPhone, privacyAccepted: true, termsAccepted: true, birthYear: birthYear.trim(), nextPath: nextPath(), referralCode: current.get("ref") || undefined, referralShareToken: current.get("rs") || undefined, referralSource: current.get("via") || undefined }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string; requestId?: string; nextPath?: string; accessToken?: string; refreshToken?: string; user?: AuthUser };
      // 🔴 5xx 를 throw 로 넘기지 않는다 — 아래 catch 의 /failed|invalid|.../ 정규식이 진단 꼬리표
      // (예: db_write_failed)에 걸려 문구를 통째로 갈아치운다.
      if (!response.ok && response.status >= 500) { setError(withServerDiagnostics(copy.unavailable, payload)); return; }
      if (!response.ok) throw new Error(payload.message || copy.invalidSignup);
      completeClientLogin(payload);
      markFreshSignup(payload.user);
      trackEvent("signup", { method: "password" });
      redirect(payload.nextPath, payload.user?.role);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : copy.network;
      setError(/status|unauthorized|invalid|failed/i.test(message) ? (mode === "login" ? copy.credentialsError : copy.invalidSignup) : message);
    } finally { setBusy(false); }
  };

  const finishSocialSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    // 카카오는 이 검사를 타지 않는다(ageVerifiedByProvider). 서버도 티켓의 provider 로 같은 분기를 한다.
    if (needsBirthYear && !isBirthYearOk(birthYear)) { setError(copy.invalidAge); return; }
    // 🔴 소셜 가입은 번호를 묻지 않는다(2026-08-25). 카카오·네이버는 공급자가 넘겨 주고,
    // 구글은 주지 않으므로 **첫 결제 화면**이 받는다 — 그 경로는 이미 살아 있다
    // (_cdEnsureDirectCheckoutPaymentPhoneNumber). 이메일 가입의 번호 필수는 그대로다.
    setBusy(true); setError("");
    try {
      const response = await authFetch(`${apiBase}/api/auth/oauth/complete-signup`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...mobileAppAuthHeaders() },
        body: JSON.stringify({ socialSignupTicket: ticket, privacyAccepted: true, termsAccepted: true, birthYear: birthYear.trim(), nextPath: nextPath() }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string; code?: string; requestId?: string; nextPath?: string; appRedirectUrl?: string; accessToken?: string; refreshToken?: string; user?: AuthUser };
      if (!response.ok && response.status >= 500) { setError(withServerDiagnostics(copy.unavailable, payload)); return; }
      if (!response.ok) throw new Error(payload.message || copy.invalidSignup);
      completeClientLogin(payload);
      markFreshSignup(payload.user);
      trackEvent("signup", { method: "social" });
      if (payload.appRedirectUrl) window.location.assign(payload.appRedirectUrl); else redirect(payload.nextPath, payload.user?.role);
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy.network); }
    finally { setBusy(false); }
  };

  const isSignup = mode === "signup" || Boolean(ticket);
  const needsBirthYear = isSignup && !ageVerifiedByProvider;
  return <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#090b1a] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-white [color-scheme:dark] sm:px-6">
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(125,92,190,.32),transparent_42%),linear-gradient(180deg,#11132a_0%,#090b1a_72%)]" />
    <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] w-full max-w-[440px] items-center py-3">
      <section className="w-full rounded-[24px] border border-[#c9b7f0]/20 bg-[#12152b] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] sm:p-7" aria-labelledby="auth-title">
        <header className="text-center"><img src="/icons/app-logo-96.png" width="52" height="52" alt="" className="mx-auto h-[52px] w-[52px] rounded-2xl" /><h1 id="auth-title" className="mt-4 text-balance text-[1.55rem] font-black tracking-[-0.025em]">{ticket ? copy.finishTitle : isSignup ? copy.signupTitle : copy.loginTitle}</h1><p className="mx-auto mt-2 max-w-[38ch] text-pretty text-sm leading-6 text-[#d8d0ea]">{ticket ? copy.finishDescription : isSignup ? copy.signupDescription : copy.loginDescription}</p></header>
        <div className="my-4 min-h-6" aria-live="polite">{error ? <p id="auth-error" role="alert" className="rounded-xl border border-[#ff8ca5]/40 bg-[#421d2a] px-3 py-2.5 text-sm text-[#ffd7df]">{error}</p> : null}</div>
        {!ticket && <><section aria-label={copy.socialLabel}><div className="grid gap-3">{(["google", "naver", "kakao"] as const).map((provider) => <button key={provider} type="button" disabled={Boolean(socialBusy) || busy} onClick={() => startSocial(provider)} className={`min-h-12 rounded-xl border px-4 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-55 ${provider === "google" ? "border-[#d9dce5] bg-white text-[#252735]" : provider === "naver" ? "border-[#03a94d] bg-[#03C75A] text-white" : "border-[#e3cb00] bg-[#FEE500] text-[#191919]"}`}>{socialBusy === provider ? copy.moving : provider === "google" ? copy.google : provider === "naver" ? copy.naver : copy.kakao}</button>)}</div><p className="mt-3 text-center text-xs leading-5 text-[#a99dbd]">{copy.providerPolicy}</p><section aria-label={copy.agreeOnSubmit} className="mt-3 space-y-1.5 rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] p-3 text-[11px] leading-5 text-[#aa9fbd]"><p className="text-[#cfc4e5]">{copy.agreeOnSubmit}</p><p className="flex flex-wrap items-center gap-x-3"><Link href="/terms" target="_blank" className="min-h-11 py-2.5 font-bold text-[#d7c1ff] underline underline-offset-4">{copy.terms}</Link><Link href="/privacy" target="_blank" className="min-h-11 py-2.5 font-bold text-[#d7c1ff] underline underline-offset-4">{copy.privacy}</Link></p><p>{copy.privacySummary}</p></section></section><div className="my-5 flex items-center gap-3 text-xs text-[#aa9fbd]"><span className="h-px flex-1 bg-[#c9b7f0]/15" /><span>{copy.orEmail}</span><span className="h-px flex-1 bg-[#c9b7f0]/15" /></div></>}
        <form onSubmit={ticket ? finishSocialSignup : submitEmail} className="space-y-4" noValidate aria-describedby={error ? "auth-error" : undefined}>
          {/* 🔴 이름은 받지 않는다(2026-08-25). 소셜은 공급자가 항상 넘겨 주고(mapSocialProfile 이
              없으면 "<provider> user" 로 채운다), 이메일은 서버가 이메일 아이디에서 파생한다.
              결제창의 customer.fullName 도 그 값을 쓰므로 PG 쪽에 부족한 것이 없다. */}
          {/* 🔴 휴대폰 번호는 필수 입력이다(2026-08-19 정책). 유일한 예외는 카카오·네이버가
              동의항목으로 번호를 이미 넘긴 경우(social_phone=1)이고, 그때만 칸을 감춘다.
              고지 문구는 아래 개인정보 동의 체크(privacySummary)와 개인정보처리방침 2항에 맞춘다. */}
          {!ticket && <><Field id="auth-email" label={copy.email}><input id="auth-email" type="email" inputMode="email" autoComplete={isSignup ? "email" : "username"} value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field><Field id="auth-password" label={copy.password}><div className="relative"><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? MIN_NEW_PASSWORD_LENGTH : 8} value={password} onChange={(event) => setPassword(event.target.value)} onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))} className={`${inputClass} pr-14`} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? copy.hidePassword : copy.showPassword} className="absolute inset-y-0 right-0 min-w-12 px-3 text-xs font-bold text-[#d6c9eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dbc9ff]">{showPassword ? "Hide" : "Show"}</button></div>{isSignup && <p className="mt-1.5 text-xs leading-5 text-[#b9aecf]">{copy.passwordHint}</p>}{capsLock && <p className="mt-1.5 text-xs text-[#ffd18a]">{copy.capsLock}</p>}</Field></>}
          {/* 🔴 번호 칸은 **이메일 가입 전용**이다(2026-08-25). 소셜은 공급자가 주거나(카카오·네이버)
              주지 않으면 첫 결제 화면이 받는다(구글) — 가입 화면에서 다시 묻지 않는다. */}
          {isSignup && !ticket && <Field id="auth-phone" label={copy.phone}><input id="auth-phone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={13} placeholder="010-1234-5678" value={phone} onChange={(event) => setPhone(formatKoreanPhoneInput(event.target.value))} aria-describedby="auth-phone-hint" className={inputClass} /><p id="auth-phone-hint" className="mt-1.5 text-xs leading-5 text-[#b9aecf]">{copy.phoneHint}</p></Field>}
          {/* 🔴 만 14세 확인은 체크박스가 아니라 **생년**이다(2026-08-25). 체크박스는 눌러서
              지나가는 것이라 미만 연령을 실제로 걸러내지 못했다. 카카오 가입만 예외인데,
              카카오계정 로그인이 그 확인을 이미 받기 때문이다(social_age=1). 판정 정본은 서버다. */}
          {needsBirthYear && <Field id="auth-birth-year" label={copy.birthYear}><input id="auth-birth-year" type="text" inputMode="numeric" autoComplete="bday-year" maxLength={4} placeholder="2000" value={birthYear} onChange={(event) => setBirthYear(event.target.value.replace(/\D+/g, "").slice(0, 4))} className={inputClass} /></Field>}
          {/* 🔴 동의는 체크박스가 아니라 **가입 버튼**이다(2026-08-25). 카카오·네이버처럼 이름·번호·
              연령을 공급자가 다 넘긴 경로에서는 이 화면에 채울 것이 하나도 남지 않아야 한다는 요구다.
              고지(privacySummary)는 그대로 화면에 남고 동의 시각·버전 기록도 서버가 그대로 남긴다
              (worker/routes/auth.js legalConsents) — 없앤 것은 클릭이지 고지도 기록도 아니다. */}
          {Boolean(ticket) && <section aria-label={copy.agreeOnSubmit} className="mt-3 space-y-1.5 rounded-xl border border-[#c9b7f0]/18 bg-[#0d1022] p-3 text-[11px] leading-5 text-[#aa9fbd]"><p className="text-[#cfc4e5]">{copy.agreeOnSubmit}</p><p className="flex flex-wrap items-center gap-x-3"><Link href="/terms" target="_blank" className="min-h-11 py-2.5 font-bold text-[#d7c1ff] underline underline-offset-4">{copy.terms}</Link><Link href="/privacy" target="_blank" className="min-h-11 py-2.5 font-bold text-[#d7c1ff] underline underline-offset-4">{copy.privacy}</Link></p><p>{copy.privacySummary}</p></section>}
          <button type="submit" disabled={busy || Boolean(socialBusy)} aria-busy={busy} className="min-h-12 w-full rounded-xl border border-[#b89ae8]/45 bg-[#7c5cbf] px-4 text-sm font-black text-white shadow-[0_10px_28px_rgba(65,42,116,.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dbc9ff] disabled:opacity-55">{busy ? copy.processing : ticket ? copy.finish : isSignup ? copy.signup : copy.login}</button>
        </form>
        {!ticket && <p className="mt-5 text-center text-sm text-[#cfc4e1]">{isSignup ? copy.hasAccount : copy.noAccount} <Link href={isSignup ? `/login?next=${encodeURIComponent(nextPath())}` : `/signup?next=${encodeURIComponent(nextPath())}`} onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); }} className="ml-1 min-h-11 font-black text-[#d7c1ff] underline underline-offset-4">{isSignup ? copy.switchToLogin : copy.switchToSignup}</Link></p>}
      </section>
    </div>
  </main>;
}

// 입력 클래스 정본은 ./styles.ts 다 — /onboarding 과 같은 문자열을 써야 퍼널 안에서 이음매가 없다.
const inputClass = AUTH_INPUT;
function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className={AUTH_LABEL}>{label}</label>{children}</div>;
}
function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (value: boolean) => void; children: ReactNode }) { return <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm leading-5 text-[#ddd4ec]"><input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-[#8f6ccc]" /><span>{children}</span></label>; }
