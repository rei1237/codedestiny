/* Birth place groups (shared data)
   Extracted from `public/js/saju-engine.js` (BIRTH_PLACE_GROUPS).
   Used by Vedic manual input to match the main page's place selector.
*/
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.BIRTH_PLACE_GROUPS && Array.isArray(window.BIRTH_PLACE_GROUPS) && window.BIRTH_PLACE_GROUPS.length) return;

  window.BIRTH_PLACE_GROUPS = [
    { label:'대한민국 (시/군 단위)', places:[
      {label:'대한민국 · 서울', tz:'Asia/Seoul', lon:126.9780, lat:37.5665, tzOff:9, def:true},
      {label:'대한민국 · 부산', tz:'Asia/Seoul', lon:129.0756, lat:35.1796, tzOff:9},
      {label:'대한민국 · 인천', tz:'Asia/Seoul', lon:126.7052, lat:37.4563, tzOff:9},
      {label:'대한민국 · 대구', tz:'Asia/Seoul', lon:128.6014, lat:35.8714, tzOff:9},
      {label:'대한민국 · 광주', tz:'Asia/Seoul', lon:126.8526, lat:35.1595, tzOff:9},
      {label:'대한민국 · 대전', tz:'Asia/Seoul', lon:127.3845, lat:36.3504, tzOff:9},
      {label:'대한민국 · 울산', tz:'Asia/Seoul', lon:129.3114, lat:35.5384, tzOff:9},
      {label:'대한민국 · 경기도 · 성남시', tz:'Asia/Seoul', lon:127.1267, lat:37.4200, tzOff:9},
      {label:'대한민국 · 경기도 · 용인시', tz:'Asia/Seoul', lon:127.1776, lat:37.2411, tzOff:9},
      {label:'대한민국 · 경기도 · 고양시', tz:'Asia/Seoul', lon:126.8320, lat:37.6584, tzOff:9},
      {label:'대한민국 · 경기도 · 화성시', tz:'Asia/Seoul', lon:126.8312, lat:37.1995, tzOff:9},
      {label:'대한민국 · 경기도 · 양평군', tz:'Asia/Seoul', lon:127.4870, lat:37.4918, tzOff:9},
      {label:'대한민국 · 경기도 · 가평군', tz:'Asia/Seoul', lon:127.5107, lat:37.8315, tzOff:9},
      {label:'대한민국 · 강원특별자치도 · 춘천시', tz:'Asia/Seoul', lon:127.7298, lat:37.8813, tzOff:9},
      {label:'대한민국 · 강원특별자치도 · 강릉시', tz:'Asia/Seoul', lon:128.8761, lat:37.7519, tzOff:9},
      {label:'대한민국 · 강원특별자치도 · 평창군', tz:'Asia/Seoul', lon:128.3904, lat:37.3705, tzOff:9},
      {label:'대한민국 · 수원', tz:'Asia/Seoul', lon:127.0286, lat:37.2636, tzOff:9},
      {label:'대한민국 · 충청북도 · 청주시', tz:'Asia/Seoul', lon:127.4890, lat:36.6424, tzOff:9},
      {label:'대한민국 · 충청북도 · 충주시', tz:'Asia/Seoul', lon:127.9259, lat:36.9910, tzOff:9},
      {label:'대한민국 · 충청북도 · 제천시', tz:'Asia/Seoul', lon:128.1940, lat:37.1326, tzOff:9},
      {label:'대한민국 · 충청남도 · 천안시', tz:'Asia/Seoul', lon:127.1522, lat:36.8151, tzOff:9},
      {label:'대한민국 · 충청남도 · 공주시', tz:'Asia/Seoul', lon:127.1190, lat:36.4465, tzOff:9},
      {label:'대한민국 · 충청남도 · 서산시', tz:'Asia/Seoul', lon:126.4522, lat:36.7849, tzOff:9},
      {label:'대한민국 · 전주', tz:'Asia/Seoul', lon:127.1480, lat:35.8242, tzOff:9},
      {label:'대한민국 · 전라북도 · 군산시', tz:'Asia/Seoul', lon:126.7368, lat:35.9677, tzOff:9},
      {label:'대한민국 · 전라북도 · 남원시', tz:'Asia/Seoul', lon:127.3903, lat:35.4164, tzOff:9},
      {label:'대한민국 · 전라남도 · 목포시', tz:'Asia/Seoul', lon:126.3922, lat:34.8118, tzOff:9},
      {label:'대한민국 · 전라남도 · 여수시', tz:'Asia/Seoul', lon:127.6622, lat:34.7604, tzOff:9},
      {label:'대한민국 · 전라남도 · 해남군', tz:'Asia/Seoul', lon:126.5989, lat:34.5742, tzOff:9},
      {label:'대한민국 · 경상북도 · 포항시', tz:'Asia/Seoul', lon:129.3435, lat:36.0190, tzOff:9},
      {label:'대한민국 · 경상북도 · 안동시', tz:'Asia/Seoul', lon:128.7294, lat:36.5684, tzOff:9},
      {label:'대한민국 · 경상북도 · 경주시', tz:'Asia/Seoul', lon:129.2247, lat:35.8562, tzOff:9},
      {label:'대한민국 · 경상남도 · 창원시', tz:'Asia/Seoul', lon:128.6811, lat:35.2285, tzOff:9},
      {label:'대한민국 · 경상남도 · 진주시', tz:'Asia/Seoul', lon:128.1076, lat:35.1799, tzOff:9},
      {label:'대한민국 · 경상남도 · 거창군', tz:'Asia/Seoul', lon:127.9099, lat:35.6867, tzOff:9},
      {label:'대한민국 · 제주특별자치도 · 제주시', tz:'Asia/Seoul', lon:126.5312, lat:33.4996, tzOff:9},
      {label:'대한민국 · 제주특별자치도 · 서귀포시', tz:'Asia/Seoul', lon:126.5600, lat:33.2541, tzOff:9},
      {label:'대한민국 · 제주', tz:'Asia/Seoul', lon:126.5312, lat:33.4996, tzOff:9}
    ]},
    { label:'미국 (주/도시)', places:[
      {label:'미국 · 뉴욕주 · 뉴욕', tz:'America/New_York', lon:-74.0060, lat:40.7128, tzOff:-5},
      {label:'미국 · 매사추세츠주 · 보스턴', tz:'America/New_York', lon:-71.0589, lat:42.3601, tzOff:-5},
      {label:'미국 · 플로리다주 · 마이애미', tz:'America/New_York', lon:-80.1918, lat:25.7617, tzOff:-5},
      {label:'미국 · 조지아주 · 애틀랜타', tz:'America/New_York', lon:-84.3880, lat:33.7490, tzOff:-5},
      {label:'미국 · 일리노이주 · 시카고', tz:'America/Chicago', lon:-87.6298, lat:41.8781, tzOff:-6},
      {label:'미국 · 텍사스주 · 댈러스', tz:'America/Chicago', lon:-96.7970, lat:32.7767, tzOff:-6},
      {label:'미국 · 텍사스주 · 휴스턴', tz:'America/Chicago', lon:-95.3698, lat:29.7604, tzOff:-6},
      {label:'미국 · 콜로라도주 · 덴버', tz:'America/Denver', lon:-104.9903, lat:39.7392, tzOff:-7},
      {label:'미국 · 애리조나주 · 피닉스', tz:'America/Phoenix', lon:-112.0740, lat:33.4484, tzOff:-7},
      {label:'미국 · 유타주 · 솔트레이크시티', tz:'America/Denver', lon:-111.8910, lat:40.7608, tzOff:-7},
      {label:'미국 · 캘리포니아주 · 로스앤젤레스', tz:'America/Los_Angeles', lon:-118.2437, lat:34.0522, tzOff:-8},
      {label:'미국 · 캘리포니아주 · 샌프란시스코', tz:'America/Los_Angeles', lon:-122.4194, lat:37.7749, tzOff:-8},
      {label:'미국 · 워싱턴주 · 시애틀', tz:'America/Los_Angeles', lon:-122.3321, lat:47.6062, tzOff:-8},
      {label:'미국 · 알래스카주 · 앵커리지', tz:'America/Anchorage', lon:-149.9003, lat:61.2181, tzOff:-9},
      {label:'미국 · 하와이주 · 호놀룰루', tz:'Pacific/Honolulu', lon:-157.8583, lat:21.3069, tzOff:-10}
    ]},
    { label:'캐나다 (주/도시)', places:[
      {label:'캐나다 · 온타리오주 · 토론토', tz:'America/Toronto', lon:-79.3832, lat:43.6532, tzOff:-5},
      {label:'캐나다 · 퀘벡주 · 몬트리올', tz:'America/Montreal', lon:-73.5673, lat:45.5017, tzOff:-5},
      {label:'캐나다 · 브리티시컬럼비아주 · 밴쿠버', tz:'America/Vancouver', lon:-123.1207, lat:49.2827, tzOff:-8},
      {label:'캐나다 · 앨버타주 · 캘거리', tz:'America/Edmonton', lon:-114.0719, lat:51.0447, tzOff:-7},
      {label:'캐나다 · 매니토바주 · 위니펙', tz:'America/Winnipeg', lon:-97.1384, lat:49.8951, tzOff:-6},
      {label:'캐나다 · 노바스코샤주 · 핼리팩스', tz:'America/Halifax', lon:-63.5752, lat:44.6488, tzOff:-4}
    ]},
    { label:'동아시아/동남아시아', places:[
      {label:'일본 · 도쿄', tz:'Asia/Tokyo', lon:139.6917, lat:35.6895, tzOff:9},
      {label:'일본 · 오사카', tz:'Asia/Tokyo', lon:135.5023, lat:34.6937, tzOff:9},
      {label:'일본 · 삿포로', tz:'Asia/Tokyo', lon:141.3545, lat:43.0618, tzOff:9},
      {label:'중국 · 베이징', tz:'Asia/Shanghai', lon:116.4074, lat:39.9042, tzOff:8},
      {label:'중국 · 상하이', tz:'Asia/Shanghai', lon:121.4737, lat:31.2304, tzOff:8},
      {label:'중국 · 광저우', tz:'Asia/Shanghai', lon:113.2644, lat:23.1291, tzOff:8},
      {label:'대만 · 타이베이', tz:'Asia/Taipei', lon:121.5654, lat:25.0330, tzOff:8},
      {label:'홍콩 · 홍콩섬', tz:'Asia/Hong_Kong', lon:114.1694, lat:22.3193, tzOff:8},
      {label:'싱가포르 · 싱가포르', tz:'Asia/Singapore', lon:103.8198, lat:1.3521, tzOff:8},
      {label:'태국 · 방콕', tz:'Asia/Bangkok', lon:100.5018, lat:13.7563, tzOff:7},
      {label:'베트남 · 하노이', tz:'Asia/Ho_Chi_Minh', lon:105.8342, lat:21.0278, tzOff:7},
      {label:'베트남 · 호찌민', tz:'Asia/Ho_Chi_Minh', lon:106.6297, lat:10.8231, tzOff:7},
      {label:'인도네시아 · 자카르타', tz:'Asia/Jakarta', lon:106.8456, lat:-6.2088, tzOff:7},
      {label:'인도네시아 · 발리(덴파사르)', tz:'Asia/Makassar', lon:115.2167, lat:-8.6500, tzOff:8},
      {label:'필리핀 · 마닐라', tz:'Asia/Manila', lon:120.9842, lat:14.5995, tzOff:8}
    ]},
    { label:'남아시아/중동', places:[
      {label:'인도 · 뉴델리', tz:'Asia/Kolkata', lon:77.1025, lat:28.7041, tzOff:5.5},
      {label:'인도 · 뭄바이', tz:'Asia/Kolkata', lon:72.8777, lat:19.0760, tzOff:5.5},
      {label:'인도 · 벵갈루루', tz:'Asia/Kolkata', lon:77.5946, lat:12.9716, tzOff:5.5},
      {label:'인도 · 콜카타', tz:'Asia/Kolkata', lon:88.3639, lat:22.5726, tzOff:5.5},
      {label:'파키스탄 · 카라치', tz:'Asia/Karachi', lon:67.0011, lat:24.8607, tzOff:5},
      {label:'방글라데시 · 다카', tz:'Asia/Dhaka', lon:90.4125, lat:23.8103, tzOff:6},
      {label:'네팔 · 카트만두', tz:'Asia/Kathmandu', lon:85.3240, lat:27.7172, tzOff:5.75},
      {label:'UAE · 두바이', tz:'Asia/Dubai', lon:55.2708, lat:25.2048, tzOff:4},
      {label:'사우디 · 리야드', tz:'Asia/Riyadh', lon:46.6753, lat:24.7136, tzOff:3},
      {label:'이란 · 테헤란', tz:'Asia/Tehran', lon:51.3890, lat:35.6892, tzOff:3.5},
      {label:'이스라엘 · 예루살렘', tz:'Asia/Jerusalem', lon:35.2137, lat:31.7683, tzOff:2},
      {label:'터키 · 이스탄불', tz:'Europe/Istanbul', lon:28.9784, lat:41.0082, tzOff:3}
    ]},
    { label:'유럽/오세아니아/중남미', places:[
      {label:'영국 · 런던', tz:'Europe/London', lon:-0.1276, lat:51.5074, tzOff:0},
      {label:'프랑스 · 파리', tz:'Europe/Paris', lon:2.3522, lat:48.8566, tzOff:1},
      {label:'독일 · 베를린', tz:'Europe/Berlin', lon:13.4050, lat:52.5200, tzOff:1},
      {label:'이탈리아 · 로마', tz:'Europe/Rome', lon:12.4964, lat:41.9028, tzOff:1},
      {label:'스페인 · 마드리드', tz:'Europe/Madrid', lon:-3.7038, lat:40.4168, tzOff:1},
      {label:'러시아 · 모스크바', tz:'Europe/Moscow', lon:37.6173, lat:55.7558, tzOff:3},
      {label:'호주 · 시드니(NSW)', tz:'Australia/Sydney', lon:151.2093, lat:-33.8688, tzOff:10},
      {label:'호주 · 멜버른(VIC)', tz:'Australia/Melbourne', lon:144.9631, lat:-37.8136, tzOff:10},
      {label:'호주 · 브리즈번(QLD)', tz:'Australia/Brisbane', lon:153.0251, lat:-27.4698, tzOff:10},
      {label:'호주 · 퍼스(WA)', tz:'Australia/Perth', lon:115.8605, lat:-31.9505, tzOff:8},
      {label:'호주 · 애들레이드(SA)', tz:'Australia/Adelaide', lon:138.6007, lat:-34.9285, tzOff:9.5},
      {label:'호주 · 다윈(NT)', tz:'Australia/Darwin', lon:130.8456, lat:-12.4634, tzOff:9.5},
      {label:'뉴질랜드 · 오클랜드', tz:'Pacific/Auckland', lon:174.7633, lat:-36.8485, tzOff:12},
      {label:'브라질 · 상파울루', tz:'America/Sao_Paulo', lon:-46.6333, lat:-23.5505, tzOff:-3},
      {label:'브라질 · 리우데자네이루', tz:'America/Sao_Paulo', lon:-43.1729, lat:-22.9068, tzOff:-3},
      {label:'아르헨티나 · 부에노스아이레스', tz:'America/Argentina/Buenos_Aires', lon:-58.3816, lat:-34.6037, tzOff:-3},
      {label:'칠레 · 산티아고', tz:'America/Santiago', lon:-70.6693, lat:-33.4489, tzOff:-4},
      {label:'멕시코 · 멕시코시티', tz:'America/Mexico_City', lon:-99.1332, lat:19.4326, tzOff:-6},
      {label:'페루 · 리마', tz:'America/Lima', lon:-77.0428, lat:-12.0464, tzOff:-5}
    ]}
  ];
})();

