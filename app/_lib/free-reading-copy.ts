const rows: Record<string, readonly [string,string,string,string]> = {
 ko:['무료','로그인 후 계산형 시뮬레이션을 무료로 즐길 수 있어요.','무료로 시작','로그인 확인 중'],
 en:['Free','Sign in to enjoy the free calculated simulation.','Start for free','Checking sign-in'],
 ja:['無料','ログイン後、計算型シミュレーションを無料で楽しめます。','無料で始める','ログイン確認中'],
 'zh-CN':['免费','登录后即可免费体验计算型模拟。','免费开始','正在确认登录'],
 'zh-TW':['免費','登入後即可免費體驗計算型模擬。','免費開始','正在確認登入'],
 de:['Kostenlos','Melde dich für die kostenlose berechnete Simulation an.','Kostenlos starten','Anmeldung prüfen'],
 es:['Gratis','Inicia sesión para disfrutar de la simulación calculada gratis.','Empezar gratis','Verificando sesión'],
 fr:['Gratuit','Connectez-vous pour profiter de la simulation calculée gratuite.','Commencer gratuitement','Vérification de connexion'],
 hi:['निःशुल्क','गणना आधारित सिमुलेशन निःशुल्क उपयोग करने के लिए लॉगिन करें।','निःशुल्क शुरू करें','लॉगिन की जाँच'],
 ms:['Percuma','Log masuk untuk menikmati simulasi berasaskan pengiraan percuma.','Mula percuma','Menyemak log masuk'],
 nl:['Gratis','Log in voor de gratis berekende simulatie.','Gratis starten','Aanmelding controleren'],
 vi:['Miễn phí','Đăng nhập để trải nghiệm mô phỏng tính toán miễn phí.','Bắt đầu miễn phí','Đang kiểm tra đăng nhập'],
};
export function freeReadingCopy(locale: string) { const r=rows[locale]||rows.en;return {badge:r[0],description:r[1],start:r[2],checking:r[3]}; }
