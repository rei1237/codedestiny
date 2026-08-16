// HwatuFortune.js - 화투점 (The Tazza Vibe)
// 배경: 어두운 네이비와 금색 포인트, 은은한 연기 피어오르는 탁자 느낌

/* ── 화투 이미지 경로 헬퍼 ── */
function hwatuImg(month, index) {
    return '/sudda/hwatu/' + month + '_' + index + '.webp';
}

const TAZZA_SYSTEM = {
    CHARACTERS: {
        master: { name: '퐁퐁장', image: '/sudda/master.webp', tone: 'advice', catchphrase: '"기술 부리지 마라. 운명이란 건… 속여서 되는 게 아니여."' },
        goni: { name: '꼬니', image: '/sudda/goni.webp', tone: 'fortune', catchphrase: '"이게 내 팔자인가 보지. 한 판 화끈하게 뒤집어볼까?"' },
        madam: { name: '천마담', image: '/sudda/madam.webp', tone: 'love', catchphrase: '"나 서울대 나온 여자야. 격조 있는 운세만 내놓을게."' },
        agui: { name: '아구', image: '/sudda/agui.webp', tone: 'warning', catchphrase: '"뻥치다 걸리면 코피 나는 거 안 배웠어? 솔직하게 봐줄게."' },
        gosu: { name: '짝꿍', image: '/sudda/gosu.webp', tone: 'insight', catchphrase: '"기술이 아니라 심리전이야. 니 속마음… 다 들여다보인다."' }
    },

    /*
     * 표준 화투 48장 완전 덱
     * type: kwang(광) / yul(열끗) / tti(띠) / pi(피) / dpi(쌍피)
     * img: sudda/hwatu/${month}_${index}.webp
     *
     * 1월(송학):  1_1광  1_2홍단  1_3피  1_4피
     * 2월(매조):  2_1열  2_2홍단  2_3피  2_4피
     * 3월(벚꽃):  3_1광  3_2홍단  3_3피  3_4피
     * 4월(흑싸리):4_1열  4_2청단  4_3피  4_4피
     * 5월(난초):  5_1열  5_2청단  5_3피  5_4피
     * 6월(모란):  6_1열  6_2청단  6_3피  6_4피
     * 7월(홍싸리):7_1열  7_2홍단  7_3피  7_4피
     * 8월(공산):  8_1광  8_2열    8_3피  8_4피
     * 9월(국화):  9_1열  9_2청단  9_3피  9_4피
     * 10월(단풍): 10_1열 10_2청단 10_3피 10_4피
     * 11월(오동): 11_1광 11_2피   11_3피 11_4쌍피
     * 12월(비):   12_1비광 12_2열 12_3띠 12_4쌍피
     */
    DECK: [
        // 1월 송학
        { month:1, idx:1, type:'kwang', name:'송학 광',   label:'1월 광',   img: hwatuImg(1,1) },
        { month:1, idx:2, type:'tti',   name:'송학 홍단', label:'1월 홍단', img: hwatuImg(1,2) },
        { month:1, idx:3, type:'pi',    name:'송학 피',   label:'1월 피',   img: hwatuImg(1,3) },
        { month:1, idx:4, type:'pi',    name:'송학 피',   label:'1월 피',   img: hwatuImg(1,4) },
        // 2월 매조
        { month:2, idx:1, type:'yul',   name:'매조 열끗', label:'2월 열끗', img: hwatuImg(2,1) },
        { month:2, idx:2, type:'tti',   name:'매조 홍단', label:'2월 홍단', img: hwatuImg(2,2) },
        { month:2, idx:3, type:'pi',    name:'매조 피',   label:'2월 피',   img: hwatuImg(2,3) },
        { month:2, idx:4, type:'pi',    name:'매조 피',   label:'2월 피',   img: hwatuImg(2,4) },
        // 3월 벚꽃
        { month:3, idx:1, type:'kwang', name:'벚꽃 광',   label:'3월 광',   img: hwatuImg(3,1) },
        { month:3, idx:2, type:'tti',   name:'벚꽃 홍단', label:'3월 홍단', img: hwatuImg(3,2) },
        { month:3, idx:3, type:'pi',    name:'벚꽃 피',   label:'3월 피',   img: hwatuImg(3,3) },
        { month:3, idx:4, type:'pi',    name:'벚꽃 피',   label:'3월 피',   img: hwatuImg(3,4) },
        // 4월 흑싸리
        { month:4, idx:1, type:'yul',   name:'흑싸리 열끗', label:'4월 열끗', img: hwatuImg(4,1) },
        { month:4, idx:2, type:'tti',   name:'흑싸리 청단', label:'4월 청단', img: hwatuImg(4,2) },
        { month:4, idx:3, type:'pi',    name:'흑싸리 피',   label:'4월 피',   img: hwatuImg(4,3) },
        { month:4, idx:4, type:'pi',    name:'흑싸리 피',   label:'4월 피',   img: hwatuImg(4,4) },
        // 5월 난초
        { month:5, idx:1, type:'yul',   name:'난초 열끗', label:'5월 열끗', img: hwatuImg(5,1) },
        { month:5, idx:2, type:'tti',   name:'난초 청단', label:'5월 청단', img: hwatuImg(5,2) },
        { month:5, idx:3, type:'pi',    name:'난초 피',   label:'5월 피',   img: hwatuImg(5,3) },
        { month:5, idx:4, type:'pi',    name:'난초 피',   label:'5월 피',   img: hwatuImg(5,4) },
        // 6월 모란
        { month:6, idx:1, type:'yul',   name:'모란 열끗', label:'6월 열끗', img: hwatuImg(6,1) },
        { month:6, idx:2, type:'tti',   name:'모란 청단', label:'6월 청단', img: hwatuImg(6,2) },
        { month:6, idx:3, type:'pi',    name:'모란 피',   label:'6월 피',   img: hwatuImg(6,3) },
        { month:6, idx:4, type:'pi',    name:'모란 피',   label:'6월 피',   img: hwatuImg(6,4) },
        // 7월 홍싸리
        { month:7, idx:1, type:'yul',   name:'홍싸리 열끗', label:'7월 열끗', img: hwatuImg(7,1) },
        { month:7, idx:2, type:'tti',   name:'홍싸리 홍단', label:'7월 홍단', img: hwatuImg(7,2) },
        { month:7, idx:3, type:'pi',    name:'홍싸리 피',   label:'7월 피',   img: hwatuImg(7,3) },
        { month:7, idx:4, type:'pi',    name:'홍싸리 피',   label:'7월 피',   img: hwatuImg(7,4) },
        // 8월 공산명월
        { month:8, idx:1, type:'kwang', name:'공산 광',   label:'8월 광',   img: hwatuImg(8,1) },
        { month:8, idx:2, type:'yul',   name:'공산 열끗', label:'8월 열끗', img: hwatuImg(8,2) },
        { month:8, idx:3, type:'pi',    name:'공산 피',   label:'8월 피',   img: hwatuImg(8,3) },
        { month:8, idx:4, type:'pi',    name:'공산 피',   label:'8월 피',   img: hwatuImg(8,4) },
        // 9월 국화
        { month:9, idx:1, type:'yul',   name:'국화 열끗', label:'9월 열끗', img: hwatuImg(9,1) },
        { month:9, idx:2, type:'tti',   name:'국화 청단', label:'9월 청단', img: hwatuImg(9,2) },
        { month:9, idx:3, type:'pi',    name:'국화 피',   label:'9월 피',   img: hwatuImg(9,3) },
        { month:9, idx:4, type:'pi',    name:'국화 피',   label:'9월 피',   img: hwatuImg(9,4) },
        // 10월 단풍
        { month:10, idx:1, type:'yul',  name:'단풍 열끗', label:'10월 열끗', img: hwatuImg(10,1) },
        { month:10, idx:2, type:'tti',  name:'단풍 청단', label:'10월 청단', img: hwatuImg(10,2) },
        { month:10, idx:3, type:'pi',   name:'단풍 피',   label:'10월 피',   img: hwatuImg(10,3) },
        { month:10, idx:4, type:'pi',   name:'단풍 피',   label:'10월 피',   img: hwatuImg(10,4) },
        // 11월 오동
        { month:11, idx:1, type:'kwang', name:'오동 광',   label:'11월 광',  img: hwatuImg(11,1) },
        { month:11, idx:2, type:'pi',    name:'오동 피',   label:'11월 피',  img: hwatuImg(11,2) },
        { month:11, idx:3, type:'pi',    name:'오동 피',   label:'11월 피',  img: hwatuImg(11,3) },
        { month:11, idx:4, type:'dpi',   name:'오동 쌍피', label:'11월 쌍피', img: hwatuImg(11,4) },
        // 12월 비
        { month:12, idx:1, type:'kwang', name:'비 비광',   label:'12월 비광', img: hwatuImg(12,1) },
        { month:12, idx:2, type:'yul',   name:'비 열끗',   label:'12월 열끗', img: hwatuImg(12,2) },
        { month:12, idx:3, type:'tti',   name:'비 띠',     label:'12월 띠',   img: hwatuImg(12,3) },
        { month:12, idx:4, type:'dpi',   name:'비 쌍피',   label:'12월 쌍피', img: hwatuImg(12,4) }
    ]
};

// 공유 및 CSS 주입
const hwatuStyles = `
/* 1. 비주얼 스타일: 어두운 네이비 배경, 금색 포인트, 연기 효과 */
#hwatuModalOverlay {
    display: none; position: fixed; inset: 0; z-index: 100000;
    background: radial-gradient(circle at top, #142017 0%, #080808 60%, #2a0808 100%);
    overflow-y: auto; overflow-x: hidden; color: #e5e7eb; font-family: 'Noto Serif KR', serif;
}
.smoke-layer {
    position: absolute; width: 100%; height: 100%; pointer-events: none;
    background: url('https://raw.githubusercontent.com/Toss/tossface/main/dist/svg/u1F4A8.svg') center/cover no-repeat;
    opacity: 0.05; filter: blur(8px); animation: smokeDrift 20s infinite alternate;
}
@keyframes smokeDrift { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-20px) scale(1.1); } }

.hwatu-table {
    max-width: 600px; margin: 40px auto; padding: 20px; text-align: center; position: relative; min-height: 500px;
}
.tazza-title {
    font-size: 2.2rem; color: #d4af37; text-shadow: 0 4px 15px rgba(251,191,36,0.3);
    margin-bottom: 5px; font-weight: bold; border-bottom: 2px solid #d4af37; display: inline-block; padding-bottom: 10px;
}
.tazza-sub { color: #94a3b8; font-size: 0.95rem; margin-bottom: 30px; letter-spacing: 1px; }

/* 2. 셔플 & 카드 영역 */
#shuffleArea {
    position: relative; width: 100%; height: 350px; margin-bottom: 20px;
    perspective: 1500px;
}
.hwatu-deck-card {
    width: 60px; height: 96px; position: absolute;
    left: calc(50% - 30px); top: calc(50% - 48px);
    border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.6);
    background: repeating-linear-gradient(45deg, #b91c1c, #b91c1c 8px, #991b1b 8px, #991b1b 16px);
    border: 3px solid #fff; box-sizing: border-box; cursor: pointer;
    transform-style: preserve-3d; opacity: 0;
}

/* 선택된 카드 Reveal Area */
.reveal-area {
    display: none; justify-content: center; gap: 20px;
    perspective: 1000px; margin-top: 20px;
}
.hwatu-card-wrapper {
    width: 100px; height: 160px; position: relative;
    transform-style: preserve-3d; transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.hwatu-card-wrapper.flipped { transform: rotateY(180deg) scale(1.1); }
.hwatu-card {
    position: absolute; width: 100%; height: 100%; border-radius: 8px; backface-visibility: hidden;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
    font-size: 3rem; border: 2px solid #d4af37;
}
.hwatu-back { background: repeating-linear-gradient(45deg, #b91c1c, #b91c1c 10px, #991b1b 10px, #991b1b 20px); border: 4px solid #fff; }
.hwatu-front { background: #1a1a1b; color: #fff; transform: rotateY(180deg); flex-direction: column; padding: 0; overflow: hidden; position: relative; }
.hwatu-front .marker { position: absolute; bottom: 0; left: 0; right: 0; font-size: 0.75rem; font-weight: bold; color: #ffd700; text-shadow: 0 1px 3px #000; background: rgba(0,0,0,0.65); padding: 3px 2px; text-align: center; z-index: 2; }

/* 다중 캐릭터 팝업 (크기 확대) */
.tazza-multi-popup {
    position: fixed; background: rgba(15, 23, 42, 0.95); border: 2px solid #d4af37;
    display: flex; align-items: center; padding: 15px 20px; border-radius: 40px; z-index: 100001;
    width: max-content; max-width: 340px; box-shadow: 0 6px 20px rgba(0,0,0,0.9); opacity: 0; pointer-events: none;
}
.tazza-multi-popup img { width: 70px; height: 70px; border-radius: 50%; border: 2px solid #d4af37; margin-right: 15px; flex-shrink: 0; object-fit: cover;}
.tazza-popup-text-col { display: flex; flex-direction: column; }
.tazza-popup-name { font-size: 0.9rem; color: #e2e8f0; margin-bottom: 4px; text-align:left; font-weight: bold; }
.tazza-popup-quote { color: #facc15; font-size: 1.05rem; font-weight: bold; font-style: italic; line-height: 1.4; text-align:left; word-break:keep-all; text-shadow: 1px 1px 2px #000; }

/* 카테고리 선택 및 배경 캐릭터 꾸미기 */
.hwatu-category-container {
    display: flex; justify-content: center; gap: 8px; margin-bottom: 25px; flex-wrap: wrap; position: relative; z-index: 10;
}
.ctg-btn {
    background: rgba(0,0,0,0.6); border: 1px solid #d4af37; color: #cbd5e1; padding: 10px 18px; border-radius: 20px;
    cursor: pointer; font-family: inherit; font-size: 0.95rem; transition: 0.3s; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;
}
.ctg-btn:hover { background: rgba(251,191,36,0.2); }
.ctg-btn.active { background: #d4af37; color: #1a202c; font-weight: bold; box-shadow: 0 0 15px rgba(251,191,36,0.5); border-color: #f59e0b; }

.tazza-hero-bg {
    position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none; opacity: 0.9; z-index: 0;
    overflow: hidden;
}
.tazza-hero-img { 
    position: absolute;
    bottom: -6px;
    width: clamp(88px, 13.5vw, 165px);
    height: auto;
    object-fit: contain;
    opacity: 0.92;
    filter: brightness(0.02) saturate(0) contrast(1.25) drop-shadow(0 0 20px rgba(185, 28, 28, 0.6));
    transform-origin: bottom center;
}
.tazza-hero-img:nth-child(1) { left: 7%;  transform: translateX(-50%) scaleX(-1) scale(0.92); }
.tazza-hero-img:nth-child(2) { left: 28%; transform: translateX(-50%) scale(1.02); }
.tazza-hero-img:nth-child(3) { left: 50%; transform: translateX(-50%) scale(1.12); }
.tazza-hero-img:nth-child(4) { left: 72%; transform: translateX(-50%) scale(1.02); }
.tazza-hero-img:nth-child(5) { left: 93%; transform: translateX(-50%) scale(0.92); }

/* 정통 화투점 안내 박스 */
.trad-guide-box {
    margin: 0 auto 14px;
    padding: 14px 16px;
    max-width: 560px;
    background: linear-gradient(135deg, rgba(10,18,32,0.82), rgba(30,10,10,0.6));
    border: 1px solid rgba(212,175,55,0.45);
    border-radius: 12px;
    text-align: left;
    box-shadow: 0 8px 18px rgba(0,0,0,0.45);
}
.trad-guide-title {
    color: #facc15;
    font-weight: bold;
    font-size: 0.95rem;
    margin-bottom: 8px;
    letter-spacing: 0.2px;
}
.trad-guide-desc {
    color: #e2e8f0;
    font-size: 0.86rem;
    line-height: 1.6;
    margin-bottom: 8px;
}
.trad-guide-list {
    margin: 0;
    padding-left: 18px;
    color: #cbd5e1;
    font-size: 0.84rem;
    line-height: 1.55;
}
.trad-guide-list li { margin-bottom: 4px; }
/* Overhead Flickering Lamp Effect */
.flickering-lamp {
    position: absolute; top: -50px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 600px;
    background: radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, transparent 60%);
    animation: flicker 3s infinite alternate; pointer-events: none; z-index: 1;
}
@keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
    70% { opacity: 0.8; }
    80% { opacity: 0.4; }
}
@media(max-width: 768px) {
    .tazza-hero-img {
        width: clamp(66px, 16vw, 112px);
        opacity: 0.88;
        filter: brightness(0.02) saturate(0) contrast(1.3) drop-shadow(0 0 16px rgba(185, 28, 28, 0.58));
    }
    .tazza-hero-img:nth-child(1) { left: 8%; }
    .tazza-hero-img:nth-child(2) { left: 30%; }
    .tazza-hero-img:nth-child(3) { left: 50%; }
    .tazza-hero-img:nth-child(4) { left: 70%; }
    .tazza-hero-img:nth-child(5) { left: 92%; }
}

@media(max-width: 480px) { 
    .tazza-hero-img { 
        width: clamp(64px, 22vw, 104px);
        opacity: 0.82;
        filter: brightness(0.02) saturate(0) contrast(1.35) drop-shadow(0 0 14px rgba(185, 28, 28, 0.55));
    }
    .tazza-hero-img:nth-child(5) { display: none; } /* 모바일에서도 최소 4명 실루엣 유지 */
    .tazza-hero-bg { opacity: 0.65; }
    .trad-guide-box { padding: 12px 12px; border-radius: 10px; }
    .trad-guide-title { font-size: 0.9rem; }
    .trad-guide-desc, .trad-guide-list { font-size: 0.8rem; }
}

#tcTop { top: -100px; left: 50%; transform: translateX(-50%); }
#tcBottom { bottom: -100px; left: 50%; transform: translateX(-50%); }
#tcLeft { top: 25%; left: -350px; transform: translateY(-50%); }
#tcRight { top: 65%; right: -350px; transform: translateY(-50%); }

/* 공통 버튼 */
.btn-hwatu {
    background: linear-gradient(to right, #b91c1c, #991b1b); color: #d4af37; border: 2px solid #d4af37; padding: 14px 30px;
    border-radius: 30px; font-size: 1.2rem; cursor: pointer; font-family: inherit; font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6); transition: 0.3s; letter-spacing: 1px;
    touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;
}
.btn-hwatu:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(251,191,36,0.4); text-shadow: 0 0 5px #d4af37; }
.btn-hwatu:disabled { filter: grayscale(1); cursor: not-allowed; transform: none; opacity: 0.5; }

/* 모바일에서 '운세 보기' 시작 버튼 터치 타겟 확장 */
#startShuffleBtn {
    min-height: 56px;
    min-width: min(86vw, 340px);
    padding: 16px 22px;
    line-height: 1.25;
    font-size: 1.05rem;
    border-width: 2px;
    z-index: 1002 !important;
    pointer-events: auto;
    touch-action: manipulation;
}

@media (max-width: 768px) {
    #startShuffleBtn {
        min-height: 60px;
        min-width: min(92vw, 360px);
        font-size: 1.08rem;
        padding: 17px 20px;
        letter-spacing: 0.2px;
    }
}

/* 결과창 */
.result-box {
    margin-top: 30px; background: rgba(15,23,42,0.8); padding: 25px; border-radius: 12px;
    border: 1px solid #d4af37; display: none; text-align: left; animation: fadeInUp 0.8s forwards;
    position: relative; overflow: visible;
}
.jokbo-name { font-size: 2rem; color: #ef4444; font-weight: bold; text-align: center; margin: 10px 0 20px; text-shadow: 0 2px 5px #000; letter-spacing: 2px; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
/* 정통 화투점 스택 그리드 */
#tradStackGrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    max-width: 560px;
    margin: 0 auto;
    padding: 4px;
}
.trad-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}
.trad-stack-label {
    order: 99;
    font-size: 0.78rem;
    font-weight: bold;
    color: #d4af37;
    margin-top: 4px;
    letter-spacing: 0.5px;
    text-align: center;
    width: 100%;
    background: rgba(0,0,0,0.55);
    border-radius: 4px;
    padding: 2px 0;
    border: 1px solid rgba(212,175,55,0.3);
}
.trad-card {
    width: 100%;
    aspect-ratio: 2/3;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
    background: repeating-linear-gradient(45deg,#b91c1c,#b91c1c 6px,#991b1b 6px,#991b1b 12px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}
.trad-card img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 4px;
    background: #fff;
}
.trad-card.hidden-card { cursor: default; opacity: 0.45; }
.trad-card.removed-card { opacity: 0; pointer-events: none; min-height: 0; height: 0; margin: 0; padding: 0; border: none; }
.trad-card.selected-card { border-color: #d4af37; box-shadow: 0 0 14px rgba(212,175,55,0.9); transform: scale(1.07); }
.trad-card.match-flash { animation: matchFlash 0.4s ease; }
@keyframes matchFlash { 0%,100%{box-shadow:0 0 0 transparent;} 50%{box-shadow:0 0 20px #4ade80, 0 0 40px #22c55e;} }
/* 스와이프 그룹 (모바일 portrait) */
@media(max-width:480px) {
    #tradStackGrid { grid-template-columns: repeat(4, 1fr); gap: 5px; }
    .trad-card { border-radius: 4px; }
}

/* 모드 토글 hover */
#modeBtnSeotda:hover, #modeBtnTraditional:hover { opacity: 0.85; }

/* 결과 강조 */
.trad-result-badge {
    display: inline-block; padding: 4px 14px; border-radius: 20px;
    font-size: 0.85rem; font-weight: bold; margin: 0 3px 6px;
}
.badge-month { background: rgba(212,175,55,0.2); color: #fbbf24; border: 1px solid #d4af37; }
.badge-good { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid #22c55e; }
.badge-bad  { background: rgba(239,68,68,0.15);  color: #f87171; border: 1px solid #ef4444; }

/* 결과 섹션 구분선 */
.trad-section { margin: 18px 0 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(212,175,55,0.3); }
.trad-section-title { color: #d4af37; font-size: 1rem; font-weight: bold; margin-bottom: 8px; }

/* 운수 카드 요약 행 */
.trad-remaining-row {
    display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
}
.trad-remaining-chip {
    padding: 3px 10px; border-radius: 12px; font-size: 0.78rem;
    background: rgba(185,28,28,0.3); color: #fca5a5; border: 1px solid rgba(239,68,68,0.4);
}

/* 결과 캐릭터 박스 */
.trad-char-box {
    display: flex; align-items: center; margin-bottom: 18px;
    background: rgba(0,0,0,0.45); padding: 14px 16px; border-radius: 12px;
    border-left: 4px solid #d4af37; gap: 14px;
}
.trad-char-box img { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #d4af37; object-fit: cover; flex-shrink:0; }

/* 인생 패 심리 테스트 */
.life-intro-box,
.life-question-box,
.life-result-box {
    margin: 0 auto 14px;
    max-width: 620px;
    background: linear-gradient(145deg, rgba(8,8,10,0.92), rgba(36,8,8,0.75));
    border: 1px solid rgba(212,175,55,0.42);
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 12px 26px rgba(0,0,0,0.5);
}
.life-intro-line {
    color: #facc15;
    font-size: 1.06rem;
    font-weight: bold;
    margin-bottom: 8px;
    text-shadow: 0 1px 3px rgba(0,0,0,0.6);
}
.life-sub-line {
    color: #e2e8f0;
    font-size: 0.92rem;
    line-height: 1.7;
    word-break: keep-all;
}
.life-progress {
    width: 100%;
    height: 10px;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(212,175,55,0.35);
    border-radius: 999px;
    overflow: hidden;
    margin: 12px 0 14px;
}
.life-progress-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #991b1b, #dc2626, #f59e0b);
    box-shadow: 0 0 12px rgba(245,158,11,0.55);
    transition: width 0.28s ease;
}
.life-q-tag {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: bold;
    color: #fbbf24;
    border: 1px solid rgba(251,191,36,0.5);
    background: rgba(180,83,9,0.22);
    margin-bottom: 10px;
}
.life-q-title {
    font-size: 1.08rem;
    color: #f8fafc;
    line-height: 1.6;
    margin-bottom: 8px;
    font-weight: bold;
    word-break: keep-all;
}
.life-q-sub {
    font-size: 0.88rem;
    color: #cbd5e1;
    margin-bottom: 14px;
    word-break: keep-all;
}
.life-choice {
    width: 100%;
    display: block;
    text-align: left;
    margin-bottom: 10px;
    padding: 12px 13px;
    border-radius: 11px;
    border: 1px solid rgba(212,175,55,0.35);
    background: linear-gradient(135deg, rgba(15,23,42,0.75), rgba(56,9,9,0.66));
    color: #f1f5f9;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.92rem;
    line-height: 1.55;
    transition: transform 0.16s, border-color 0.16s, box-shadow 0.16s;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}
.life-choice:hover {
    transform: translateY(-2px);
    border-color: rgba(251,191,36,0.72);
    box-shadow: 0 8px 18px rgba(0,0,0,0.42);
}
.life-choice-key {
    display: inline-block;
    margin-right: 8px;
    min-width: 22px;
    text-align: center;
    color: #fbbf24;
    font-weight: bold;
}
.life-result-card {
    width: 152px;
    aspect-ratio: 2/3;
    margin: 0 auto 14px;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid #d4af37;
    box-shadow: 0 12px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,191,36,0.2);
    background: #fff;
}
.life-result-card img { width: 100%; height: 100%; object-fit: contain; display: block; }
.life-result-name {
    font-size: 1.36rem;
    font-weight: bold;
    color: #facc15;
    text-align: center;
    margin-bottom: 7px;
}
.life-result-tagline {
    text-align: center;
    color: #fca5a5;
    margin-bottom: 12px;
    font-size: 0.94rem;
    line-height: 1.55;
}
.life-result-desc {
    color: #e2e8f0;
    line-height: 1.75;
    font-size: 0.94rem;
    margin-bottom: 12px;
    word-break: keep-all;
}
.life-result-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
}
.life-result-chip {
    padding: 4px 11px;
    border-radius: 999px;
    border: 1px solid rgba(251,191,36,0.5);
    background: rgba(180,83,9,0.24);
    color: #fde68a;
    font-size: 0.78rem;
}
.life-monthly-box {
    background: rgba(15,23,42,0.52);
    border: 1px solid rgba(212,175,55,0.36);
    border-radius: 10px;
    padding: 11px;
    color: #dbeafe;
    font-size: 0.9rem;
    line-height: 1.66;
    margin-bottom: 14px;
    word-break: keep-all;
}
.life-detail-box {
    background: linear-gradient(135deg, rgba(12,18,30,0.86), rgba(52,8,8,0.58));
    border: 1px solid rgba(212,175,55,0.42);
    border-radius: 10px;
    padding: 12px;
    color: #e2e8f0;
    font-size: 0.9rem;
    line-height: 1.72;
    margin-bottom: 14px;
    word-break: keep-all;
}
.life-detail-title {
    color: #facc15;
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 0.92rem;
}
.life-detail-point {
    display: block;
    margin-bottom: 4px;
    color: #dbeafe;
}

@media(max-width: 480px) {
    .life-intro-box, .life-question-box, .life-result-box { padding: 14px; }
    .life-result-card { width: 136px; }
    .life-q-title { font-size: 1rem; }
}

`;

function loadGSAP(callback) {
    if(window.gsap) { callback(); return; }
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js";
    script.onload = callback;
    document.head.appendChild(script);
}

function injectHwatuHTML() {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = hwatuStyles;
    document.head.appendChild(styleEl);

    const overlay = document.createElement('div');
    overlay.id = 'hwatuModalOverlay';
    overlay.innerHTML = `
        <div class="smoke-layer"></div>
        <div style="position:absolute; top:20px; left:20px; color:#d4af37; z-index:10; font-weight:bold;">남은 횟수: <span id="hwatuLimitText"></span>/10</div>
        <button onclick="closeHwatuModal()" style="position:absolute; top:20px; right:20px; background:rgba(0,0,0,0.5); border:1px solid #d4af37; color:#d4af37; font-size:1.5rem; width:44px; height:44px; border-radius:50%; cursor:pointer; z-index:10; transition:0.2s; touch-action:manipulation; -webkit-tap-highlight-color:transparent;">&times;</button>
        
        <div class="vignette-overlay"></div><div id="goldAura" class="gold-aura"></div><div class="flickering-lamp"></div>
        <div class="tazza-hero-bg">
            <img src="/sudda/goni.webp" class="tazza-hero-img" alt="">
            <img src="/sudda/madam.webp" class="tazza-hero-img" alt="">
            <img src="/sudda/agui.webp" class="tazza-hero-img" alt="">
            <img src="/sudda/gosu.webp" class="tazza-hero-img" alt="">
            <img src="/sudda/master.webp" class="tazza-hero-img" alt="">
        </div>
        <div class="hwatu-table" style="position: relative; z-index: 2;">
            <h2 class="tazza-title" style="font-family: '궁서', cursive; font-size: 2.8rem; letter-spacing: -2px; color: #d4af37; text-shadow: 2px 2px 5px rgba(185,28,28,0.8);">화투 운세: 신의 손길</h2>
            <div class="tazza-sub">"원하는 운을 고르고, 패를 섞어보쇼."</div>
            
            <!-- 모드 토글 -->
            <div id="hwatuModeToggle" style="display:flex;justify-content:center;gap:0;margin-bottom:22px;border-radius:30px;overflow:hidden;border:2px solid #d4af37;width:fit-content;margin-left:auto;margin-right:auto;">
                <button id="modeBtnSeotda" onclick="switchHwatuMode('seotda')" style="padding:10px 22px;background:#d4af37;color:#1a202c;font-weight:bold;font-family:inherit;font-size:0.95rem;border:none;cursor:pointer;transition:0.3s;">🃏 섯다 운세</button>
                <button id="modeBtnTraditional" onclick="switchHwatuMode('traditional')" style="padding:10px 22px;background:transparent;color:#d4af37;font-weight:bold;font-family:inherit;font-size:0.95rem;border:none;cursor:pointer;transition:0.3s;">🎴 운수 떼기</button>
                <button id="modeBtnLifeCard" onclick="switchHwatuMode('lifecard')" style="padding:10px 22px;background:transparent;color:#d4af37;font-weight:bold;font-family:inherit;font-size:0.95rem;border:none;cursor:pointer;transition:0.3s;">🂡 인생 패 테스트</button>
            </div>

            <!-- 섯다 모드 -->
            <div id="seotdaModeContainer">
            <div class="hwatu-category-container" id="hwatuCategoryBox">
                <button class="ctg-btn active" onclick="setHwatuCategory('wealth', this)"> 재물운</button>
                <button class="ctg-btn" onclick="setHwatuCategory('love', this)"> 애정운</button>
                <button class="ctg-btn" onclick="setHwatuCategory('contact', this)"> 연락운</button>
                <button class="ctg-btn" onclick="setHwatuCategory('success', this)"> 합격/직장운</button>
                <button class="ctg-btn" onclick="setHwatuCategory('health', this)"> 건강운</button>
                <button class="ctg-btn" onclick="setHwatuCategory('family', this)"> 가족운</button>
                <button class="ctg-btn" onclick="setHwatuCategory('travel', this)"> 이동/여행운</button>
            </div>
            
            <div id="shuffleArea">
                <!-- GSAP 카드가 여기 생성됨 -->
                <button class="btn-hwatu" id="startShuffleBtn" onclick="startShuffleSequence()" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); z-index:1002;">운세 보기 (패 섞기)</button>
            </div>

            <div class="reveal-area" id="revealArea">
                <div class="hwatu-card-wrapper" id="hCard1">
                    <div class="hwatu-card hwatu-back"></div>
                    <div class="hwatu-card hwatu-front">
                        <img id="hCard1Img" src="" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:6px;display:none;">
                        <div id="hCard1Emoji" style="font-size:3rem;display:none;"></div>
                        <div id="hCard1Text" class="marker"></div>
                    </div>
                </div>
                <div class="hwatu-card-wrapper" id="hCard2">
                    <div class="hwatu-card hwatu-back"></div>
                    <div class="hwatu-card hwatu-front">
                        <img id="hCard2Img" src="" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:6px;display:none;">
                        <div id="hCard2Emoji" style="font-size:3rem;display:none;"></div>
                        <div id="hCard2Text" class="marker"></div>
                    </div>
                </div>
            </div>

            </div><!-- /seotdaModeContainer -->

            <!-- 정통 화투점(운수 떼기) 모드 -->
            <div id="traditionalModeContainer" style="display:none;">
                <div style="text-align:center;margin-bottom:18px;">
                    <div class="trad-guide-box">
                        <div class="trad-guide-title">🎴 정통 화투점: 운수 떼기 방식 안내</div>
                        <div class="trad-guide-desc">운수 떼기는 화투 48장을 월(月) 기운으로 읽어 현재 흐름을 판별하는 정통 화투점 방식입니다. 단순 게임이 아니라, <strong>남는 월의 기운</strong>과 <strong>제거된 패의 조합</strong>으로 운의 강약을 해석합니다. 이번 모드는 수동 선택 없이 시스템이 자동으로 패를 골라 진행합니다.</div>
                        <ol class="trad-guide-list">
                            <li>총 48장을 섞어 12개 더미(각 4장)로 배치합니다.</li>
                            <li>각 더미의 맨 위 카드만 뒤집어 공개합니다.</li>
                            <li>시스템이 같은 월(예: 3월-3월) 카드를 자동으로 찾아 제거합니다.</li>
                            <li>제거 후 다음 카드가 자동 공개되며, 더 이상 짝이 없을 때 판이 종료됩니다.</li>
                            <li>많이 제거할수록 길운이 강해지고, 끝까지 남는 월은 현재 막힌 기운으로 해석합니다.</li>
                        </ol>
                    </div>
                    <div style="color:#94a3b8;font-size:0.88rem;margin-bottom:10px;letter-spacing:0.6px;">같은 월의 패를 두 장씩 맞춰 모두 없애면 대길(大吉)입니다.</div>
                    <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                        <button class="ctg-btn active" id="tradCat_wealth" onclick="setTradCategory('wealth',this)">재물운</button>
                        <button class="ctg-btn" id="tradCat_love" onclick="setTradCategory('love',this)">애정운</button>
                        <button class="ctg-btn" id="tradCat_success" onclick="setTradCategory('success',this)">합격운</button>
                        <button class="ctg-btn" id="tradCat_health" onclick="setTradCategory('health',this)">건강운</button>
                        <button class="ctg-btn" id="tradCat_family" onclick="setTradCategory('family',this)">가족운</button>
                        <button class="ctg-btn" id="tradCat_travel" onclick="setTradCategory('travel',this)">이동운</button>
                    </div>
                    <button class="btn-hwatu" id="tradStartBtn" onclick="startTraditionalGame()" style="font-size:1.1rem;display:block;margin:0 auto;">자동 운수 떼기 시작</button>
                </div>
                <!-- 운수 떼기 게임판 -->
                <div id="tradGameBoard" style="display:none;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <span style="color:#94a3b8;font-size:0.85rem;">남은 패: <strong id="tradRemaining" style="color:#d4af37;">48</strong>장</span>
                        <span style="color:#94a3b8;font-size:0.85rem;">제거: <strong id="tradRemoved" style="color:#4ade80;">0</strong>장</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button onclick="startTraditionalGame()" style="background:linear-gradient(135deg,#3a2a0f,#9a6a1d);border:1px solid #d4af37;color:#fef3c7;padding:8px 14px;border-radius:15px;cursor:pointer;font-family:inherit;font-size:0.85rem;font-weight:700;min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">운수 떼기 시작하기</button>
                            <button onclick="endTraditionalGame()" style="background:rgba(185,28,28,0.7);border:1px solid #ef4444;color:#fca5a5;padding:8px 16px;border-radius:15px;cursor:pointer;font-family:inherit;font-size:0.85rem;min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent;">즉시 결과 보기</button>
                        </div>
                    </div>
                    <div id="tradStackGrid"></div>
                    <div id="tradSelectionHint" style="color:#d4af37;text-align:center;margin-top:10px;font-size:0.9rem;min-height:20px;"></div>
                </div>
                <!-- 정통 화투점 결과 -->
                <div class="result-box" id="tradResultBox" style="display:none;">
                    <div class="jokbo-name" id="tradResultTitle"></div>
                    <div id="tradResultContent" style="font-size:1.05rem;line-height:1.8;color:#e5e7eb;"></div>
                    <button class="btn-hwatu" style="width:100%;margin-top:16px;font-size:1.05rem;" onclick="startTraditionalGame()">다시 운수 보기</button>
                </div>
            </div><!-- /traditionalModeContainer -->

            <!-- 화투 인생 패 테스트 모드 -->
            <div id="lifeCardModeContainer" style="display:none;">
                <div class="life-intro-box" id="lifeCardIntro">
                    <div class="life-intro-line">"쫄리면 판에서 손 떼라... 대신, 끝까지 가면 네 패가 보인다."</div>
                    <div class="life-sub-line">돈, 사랑, 위기 앞에서 네가 어떤 선택을 하는지 7문항으로 읽어보는 화투 인생 패 심리 테스트요. 패를 숨기지 말고, 네 본능대로 고르쇼.</div>
                    <button class="btn-hwatu" style="width:100%;margin-top:14px;font-size:1.05rem;" onclick="startLifeCardTest()">판에 참여하기</button>
                </div>

                <div class="life-question-box" id="lifeCardQuestionPanel" style="display:none;">
                    <div class="life-progress"><div class="life-progress-fill" id="lifeProgressFill"></div></div>
                    <div id="lifeQuestionCard"></div>
                </div>

                <div class="life-result-box" id="lifeCardResultBox" style="display:none;">
                    <div class="life-result-card"><img id="lifeResultImg" src="" alt="인생 패"></div>
                    <div class="life-result-name" id="lifeResultName"></div>
                    <div class="life-result-tagline" id="lifeResultTagline"></div>
                    <div class="life-result-desc" id="lifeResultDesc"></div>
                    <div class="life-result-chip-row" id="lifeResultTraits"></div>
                    <div class="life-monthly-box" id="lifeMonthlySummary"></div>
                    <div class="life-detail-box" id="lifeDetailNarrative" style="display:none;"></div>
                    <button class="btn-hwatu" id="lifeDetailToggleBtn" style="width:100%;font-size:1.04rem;margin-bottom:10px;" onclick="toggleLifeCardDetail()">상세 운세 보기</button>
                    <button class="btn-hwatu" style="width:100%;font-size:1.03rem;background:linear-gradient(to right,#3b2f18,#7c5a17);margin-bottom:10px;" onclick="shareHwatuLifeCard()">💬 카카오톡 공유하기</button>
                    <button class="btn-hwatu" style="width:100%;font-size:1.02rem;background:linear-gradient(to right,#1f2937,#0f172a);" onclick="closeHwatuModal()">홈 화면으로 돌아가기</button>
                </div>
            </div><!-- /lifeCardModeContainer -->

            <div id="hwatuWarnMsg" style="color:#d4af37; margin-top:20px; font-weight:bold; display:none; font-size:1.1rem; text-shadow: 0 2px 4px #000;"></div>

            <div class="result-box" id="hwatuResultBox">
                <div class="jokbo-name" id="jokboName"></div>
                <div style="font-size: 1.1rem; line-height: 1.7; color: #e5e7eb; margin-bottom:20px; text-align:center;" id="fortuneDetails"></div>
                <button class="btn-hwatu" id="hwatuRetryBtn" style="width:100%; font-size:1.1rem; margin-bottom:12px; display:none;" onclick="startShuffleSequence()">🔄 한 판 더 (다시 뽑기)</button>
                <button class="btn-hwatu" style="width:100%; font-size:1.1rem; background:linear-gradient(to right,#1a3a5c,#0f2540);" onclick="shareHwatu()">📢 전보 치기 (공유)</button>
            </div>
        </div>

        <!-- 다중 타짜 캐릭터 팝업 인터랙션 -->
        <div class="tazza-multi-popup" id="tcTop"><img id="tcTopImg" src="" alt=""><div class="tazza-popup-text-col"><span class="tazza-popup-name" id="tcTopName"></span><span class="tazza-popup-quote" id="tcTopText"></span></div></div>
        <div class="tazza-multi-popup" id="tcBottom"><img id="tcBottomImg" src="" alt=""><div class="tazza-popup-text-col"><span class="tazza-popup-name" id="tcBottomName"></span><span class="tazza-popup-quote" id="tcBottomText"></span></div></div>
        <div class="tazza-multi-popup" id="tcLeft"><img id="tcLeftImg" src="" alt=""><div class="tazza-popup-text-col"><span class="tazza-popup-name" id="tcLeftName"></span><span class="tazza-popup-quote" id="tcLeftText"></span></div></div>
        <div class="tazza-multi-popup" id="tcRight"><img id="tcRightImg" src="" alt=""><div class="tazza-popup-text-col"><span class="tazza-popup-name" id="tcRightName"></span><span class="tazza-popup-quote" id="tcRightText"></span></div></div>
    `;
    document.body.appendChild(overlay);
    loadGSAP(() => {});
}

// 오디오 합성: 셔플 착착 소리
function playClackSound(freq=150) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.04);
        
        filter.type = 'highpass';
        filter.frequency.value = 800;
        
        gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.04);
    } catch(e) {}
}

const getTodayDateStr = () => {
    const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
};
const checkDailyLimit = () => {
    const today = getTodayDateStr();
    let stats = JSON.parse(localStorage.getItem('hwatuStats') || '{}');
    if(stats.date !== today) { stats = { date: today, count: 0 }; }
    return stats;
};

// 섯다 족보 판별
// DECK에서 특정 월/인덱스 카드 찾기 헬퍼
function _deckCard(month, idx) {
    return TAZZA_SYSTEM.DECK.find(c => c.month === month && c.idx === idx) ||
           TAZZA_SYSTEM.DECK.find(c => c.month === month) || 
           { month, idx, type:'pi', name: month+'월', label: month+'월', img: hwatuImg(month, idx) };
}
// 땡 패 2장 (같은 월, 서로 다른 인덱스)
function _deckPair(month) {
    const cards = TAZZA_SYSTEM.DECK.filter(c => c.month === month);
    if (cards.length >= 2) return [cards[0], cards[1]];
    return [_deckCard(month,1), _deckCard(month,2)];
}

function determineJokbo() {
    let rand = Math.random(); let card1, card2;
    
    // 확률 배분: 삼팔광땡 0.3% / 일삼·일팔광땡 1.2% / 땡 8% / 특별족보 25% / 무작위 65.5%
    if(rand < 0.003) { 
        // 0.3% 삼팔광땡
        card1 = _deckCard(3, 1); 
        card2 = _deckCard(8, 1); 
    }
    else if(rand < 0.015) { 
        // 1.2% 일삼 또는 일팔광땡
        card1 = _deckCard(1, 1);
        card2 = Math.random() < 0.5 ? _deckCard(3, 1) : _deckCard(8, 1);
    }
    else if(rand < 0.095) { 
        // 8% 땡 (1~10땡)
        const d = Math.floor(Math.random() * 10) + 1;
        [card1, card2] = _deckPair(d);
    }
    else if(rand < 0.345) {
        // 25% 특별 족보 (알리, 독사, 구삥, 장삥, 장사, 세륙)
        const goodCombos = [[1,2], [1,4], [1,9], [1,10], [4,10], [4,6]];
        const cb = goodCombos[Math.floor(Math.random() * goodCombos.length)];
        card1 = _deckCard(cb[0], 3);
        card2 = _deckCard(cb[1], 3);
    }
    else {
        // ~65.5% 완전 무작위 (끗, 망통, 사구파투 등)
        // 단, 광 2장 조합이 나오면 무작위 재뽑기 (광땡 중복 방지)
        let tries = 0;
        do {
            card1 = TAZZA_SYSTEM.DECK[Math.floor(Math.random() * TAZZA_SYSTEM.DECK.length)];
            do { card2 = TAZZA_SYSTEM.DECK[Math.floor(Math.random() * TAZZA_SYSTEM.DECK.length)]; } while(card1 === card2);
            tries++;
        } while(tries < 5 && card1.type === 'kwang' && card2.type === 'kwang');
    }
    
    const m1 = card1.month, m2 = card2.month;
    let jokbo = "끗", score = (m1 + m2) % 10;

    const isKwang1 = card1.type === 'kwang', isKwang2 = card2.type === 'kwang';
    if(isKwang1 && isKwang2 && ((m1===3&&m2===8)||(m1===8&&m2===3))) { jokbo = "삼팔광땡"; score = 100; }
    else if(isKwang1 && isKwang2 && ((m1===1&&m2===8)||(m1===8&&m2===1))) { jokbo = "일팔광땡"; score = 99; }
    else if(isKwang1 && isKwang2 && ((m1===1&&m2===3)||(m1===3&&m2===1))) { jokbo = "일삼광땡"; score = 98; }
    else if(m1 === m2) { jokbo = m1 === 10 ? "장땡" : m1 + "땡"; score = 90 + m1; }
    else if(m1 === 1 && m2 === 2 || m1 === 2 && m2 === 1) { jokbo = "알리"; score = 80; }
    else if(m1 === 1 && m2 === 4 || m1 === 4 && m2 === 1) { jokbo = "독사"; score = 79; }
    else if(m1 === 1 && m2 === 9 || m1 === 9 && m2 === 1) { jokbo = "구삥"; score = 78; }
    else if(m1 === 1 && m2 === 10 || m1 === 10 && m2 === 1) { jokbo = "장삥"; score = 77; }
    else if(m1 === 4 && m2 === 10 || m1 === 10 && m2 === 4) { jokbo = "장사"; score = 76; }
    else if(m1 === 4 && m2 === 6 || m1 === 6 && m2 === 4) { jokbo = "세륙"; score = 75; }
    else if(m1 === 4 && m2 === 9 || m1 === 9 && m2 === 4) { jokbo = "사구파투"; score = 10; }
    else { jokbo = score === 0 ? "망통" : score + "끗"; }

    return { card1, card2, jokbo, score };
}

window.currentHwatuCategory = 'wealth';
window.setHwatuCategory = function(cat, btnParam) {
    window.currentHwatuCategory = cat;
    document.querySelectorAll('#hwatuCategoryBox .ctg-btn').forEach(b => b.classList.remove('active'));
    if(btnParam) btnParam.classList.add('active');
    
    // 카테고리 클릭 시 사운드
    if(typeof playClackSound === 'function') {
        playClackSound(200); 
        setTimeout(() => playClackSound(250), 100);
    }

    let quote = "";
    if(cat === 'wealth') quote = '천마담: "나 서울대 나온 여자야. 아무 판에나 돈 안 걸어. 확실한 데만 골라줄게."';
    else if(cat === 'love') quote = '꼬니: "사랑도 승부야. 내 전부를 걸 때가 오는 법이지."';
    else if(cat === 'contact') quote = '짝꿍: "뻥치지 마라. 니 속마음, 연락 기다리고 있는 거 다 보여."';
    else if(cat === 'success') quote = '퐁퐁장: "기억해라. 진짜 실력은 기술이 아니라 흔들리지 않는 배짱에서 나온다."';
    else if(cat === 'health') quote = '아구: "몸이 판돈이야. 오늘 무리하면 내일 패가 뒤집힌다."';
    else if(cat === 'family') quote = '천마담: "가까운 사람한테 쓰는 말 한마디가, 오늘 운세를 살린다."';
    else if(cat === 'travel') quote = '짝꿍: "길 위에서는 촉이 먼저다. 급하게 움직이면 실수부터 난다."';
    
    const sub = document.querySelector('.tazza-sub');
    if(sub) {
        sub.innerText = quote;
        sub.style.color = "#d4af37";
        if(window.gsap) gsap.fromTo(sub, { scale: 1.05, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5 });
    }
}

function getFortuneAndCharacter(score) {
    let charKey, reading;
    const cat = window.currentHwatuCategory;
    
    if(score === 100) charKey = 'goni'; 
    else if(cat === 'love' && score >= 75) charKey = 'madam';
    else if(cat === 'wealth' && score >= 90) charKey = 'madam';
    else if(score >= 90) charKey = 'goni'; 
    else if(score === 10 || score === 0) charKey = 'agui'; 
    else if(cat === 'contact' || cat === 'success') charKey = 'gosu'; 
    else charKey = 'master'; 

    if (cat === 'wealth') {
        if(score === 100) reading = "묻고 더블로 가! 오늘 당신의 금전운은 천하무적. 판돈을 전부 끌어모아 판을 키워도 좋은 날이다.";
        else if(score >= 90) reading = "패가 아주 좋게 떨어졌군. 예상치 못한 거래처에서 연락이 오거나 투자한 곳에서 쏠쏠한 수익이 떨어질 거다.";
        else if(score >= 70) reading = "평타는 치는 패야. 큰 욕심만 안 부리면 길가다가 지폐 한 장 줍거나, 점심값 굳는 쏠쏠한 재미를 볼 수 있다.";
        else if(score === 10 || score === 0) reading = "싸늘하다... 가슴에 비수가 날아와 꽂힌다. 밑장 빼다 걸릴 수 있는 최악의 금전운. 지갑을 꼭 닫고 몸을 사리쇼.";
        else reading = "큰 판을 벌이기엔 아직 무리다. 바람이 불 때는 납작 엎드리고, 기술을 아끼며 지금 있는 돈부터 지키는 게 순리야.";
    } 
    else if (cat === 'love') {
        if(score === 100) reading = "마음에 쏙 드는 인연을 만날 찰떡궁합의 패. 고백을 망설이고 있다면 오늘이 바로 승부수를 던질 타이밍이다.";
        else if(score >= 90) reading = "당신의 매력이 절정에 달해 주변 사람들이 전부 당신에게 홀리는 날. 눈빛 하나로 마음을 흔들 수 있다.";
        else if(score >= 70) reading = "잔잔하게 마음이 통하는 무난한 흐름. 오늘은 억지로 상황을 만들려 하지 말고 진심을 담은 한 마디면 족하다.";
        else if(score === 10 || score === 0) reading = "싸늘하다... 애정 전선에 구라가 섞여있소. 괜한 헛소문이나 어장관리에 당할 수 있으니 상대를 똑바로 보쇼.";
        else reading = "지금은 밀당을 할 때가 아니다. 패가 말렸을 땐 포커페이스를 유지하며 마음을 숨기는 게 오히려 낫다.";
    }
    else if (cat === 'contact') {
        if(score === 100) reading = "아주 반가운 소식! 인연이 끊길 뻔했던 귀인에게서 깜짝 연락이 오거나 기다리던 답장을 받게 된다.";
        else if(score >= 90) reading = "상대방도 당신 패를 읽으려 눈치를 보고 있다. 가볍게 찔러보는 선톡 하나가 꽉 막힌 물꼬를 터줄 거다.";
        else if(score >= 70) reading = "사람들의 마음이 당신에게 열려 있는 날. 안부를 묻고 대화를 들어주기만 해도 관계가 한층 끈끈해진다.";
        else if(score === 10 || score === 0) reading = "구라치다 걸리면 피 보는 거 안 배웠냐? 섣부른 연락은 돌이킬 수 없는 강을 건너게 하니 오늘 핸드폰은 꺼두는 게 상책이오.";
        else reading = "무소식이 희소식이라 했다. 억지로 타선을 이어붙이려다 오히려 역풍을 맞으니 여유롭게 기다리는 지혜를 가져라.";
    }
    else if (cat === 'health') {
        if(score === 100) reading = "몸의 리듬이 정점이오. 시작하려던 운동, 치료, 생활 루틴을 오늘 바로 잡으면 오래 간다. 회복 속도도 빠른 날이다.";
        else if(score >= 90) reading = "컨디션이 단단히 받쳐주는 날. 집중력과 체력이 함께 올라오니 중요한 일은 오전에 몰아붙이쇼.";
        else if(score >= 70) reading = "무난한 흐름이오. 큰 무리는 피하고 수면·수분·식사만 지켜도 몸이 안정된다.";
        else if(score === 10 || score === 0) reading = "패가 차갑소. 과로, 과음, 무리한 운동은 금물. 오늘은 몸을 지키는 게 이기는 판이오.";
        else reading = "몸이 예민한 날이니 속도를 늦추쇼. 무리한 일정 대신 회복 루틴을 우선하면 내일 패가 좋아진다.";
    }
    else if (cat === 'family') {
        if(score === 100) reading = "집안 기운이 한데 모였소. 미뤄둔 대화, 화해, 가족 모임을 열면 관계가 크게 풀린다.";
        else if(score >= 90) reading = "가까운 사람의 도움운이 강하오. 먼저 손 내밀면 따뜻한 답이 돌아온다.";
        else if(score >= 70) reading = "잔잔한 흐름이오. 큰 이벤트보다 안부 한 통, 식사 한 끼가 관계를 살린다.";
        else if(score === 10 || score === 0) reading = "말 한마디가 비수가 되기 쉬운 날. 지적보다 공감을 먼저 내놓아야 판이 안 깨진다.";
        else reading = "서로 바쁜 기운이 겹쳐 오해가 생길 수 있소. 결론보다 경청을 먼저 택하쇼.";
    }
    else if (cat === 'travel') {
        if(score === 100) reading = "길운이 활짝 열렸소. 이동, 출장, 여행에서 귀인과 기회가 동시에 붙는다.";
        else if(score >= 90) reading = "움직일수록 수가 나는 날이오. 미뤄둔 일정 정리나 짧은 외출이 운을 돌린다.";
        else if(score >= 70) reading = "무난한 이동운. 동선만 간단히 정리하면 큰 문제 없이 흘러간다.";
        else if(score === 10 || score === 0) reading = "길이 거칠소. 시간 지연, 분실, 실수 가능성이 있으니 여유 있게 움직이쇼.";
        else reading = "서두를수록 꼬이는 날. 대중교통, 예약, 짐 체크를 한 번 더 확인하쇼.";
    }
    else {
        if(score === 100) reading = "완벽한 타점. 면접이든 시험이든 당신의 실력이 100% 발휘되어 경쟁자들을 압도하고 당당히 승리를 거머쥔다.";
        else if(score >= 90) reading = "준비한 만큼 훌륭한 성과를 거두는 기운. 심사관이나 윗선의 눈에 띄어 단숨에 입지를 굳히게 될 거다.";
        else if(score >= 70) reading = "순조로운 전개. 다만 방심은 금물이다. 디테일한 부분에서 승패가 갈리니 마지막까지 집중의 끈을 놓지 마라.";
        else if(score === 10 || score === 0) reading = "구라치다 걸리면 피 보는 거 안 배웠냐? 요행을 바라거나 꼼수로 합격을 노리면 크게 당하게 되어 있소. 정공법을 택하쇼.";
        else reading = "아직은 칼을 더 갈아야 할 시기. 평범함 속에 지혜가 있으니 조급함을 버리고 기본기로 승부해라.";
    }
    
    return { character: TAZZA_SYSTEM.CHARACTERS[charKey], reading };
}

window.openHwatuModal = function(initialMode) {
    if(!document.getElementById('hwatuModalOverlay')) { injectHwatuHTML(); }
    const stats = checkDailyLimit();
    document.getElementById('hwatuLimitText').innerText = 10 - stats.count;
    document.getElementById('hwatuResultBox').style.display = 'none';
    document.getElementById('hwatuWarnMsg').style.display = 'none';
    document.getElementById('revealArea').style.display = 'none';
    const retryBtnInit = document.getElementById('hwatuRetryBtn');
    if(retryBtnInit) retryBtnInit.style.display = 'none';
    // 정통 화투점 초기화
    if(document.getElementById('tradGameBoard'))  document.getElementById('tradGameBoard').style.display  = 'none';
    if(document.getElementById('tradResultBox'))  document.getElementById('tradResultBox').style.display  = 'none';
    if(document.getElementById('tradStartBtn'))   document.getElementById('tradStartBtn').style.display   = 'block';
    _tradState = null;
    if(typeof window.resetLifeCardTest === 'function') window.resetLifeCardTest();
    // 모드 초기화 (기본: 섯다, 요청 시 운수 떼기)
    var nextMode = (initialMode === 'traditional') ? 'traditional' : ((initialMode === 'lifecard') ? 'lifecard' : 'seotda');
    window._hwatuMode = nextMode;
    if(document.getElementById('seotdaModeContainer')) switchHwatuMode(nextMode);
    document.getElementById('hCard1').classList.remove('flipped');
    document.getElementById('hCard2').classList.remove('flipped');
    document.getElementById('shuffleArea').style.display = 'block';
    document.getElementById('shuffleArea').style.opacity = 1;
    document.getElementById('shuffleArea').style.height = '350px';
    
    // 이전 카드 있으면 삭제
    const area = document.getElementById('shuffleArea');
    area.querySelectorAll('.hwatu-deck-card').forEach(c => c.remove());

    const btn = document.getElementById('startShuffleBtn');
    btn.style.display = 'block';
    btn.innerText = "운세 보기 (패 섞기)";
    btn.disabled = false;
    document.getElementById('hwatuModalOverlay').style.display = 'block';
};

window.openHwatuTraditionalMode = function() {
    window.openHwatuModal('traditional');
};

window.closeHwatuModal = function() { document.getElementById('hwatuModalOverlay').style.display = 'none'; };

// 시퀀스 상태 변수
let selectedCards = 0;
let drawData = null;

window.startShuffleSequence = function() {
    let stats = checkDailyLimit();
    if(stats.count >= 10) {
        let warn = document.getElementById('hwatuWarnMsg');
        warn.innerText = "너 너무 많이 했어! 손모가지 날아간다! 오늘은 판 접으쇼!";
        warn.style.color = "#ef4444";
        warn.style.display = 'block'; return;
    }
    document.getElementById('startShuffleBtn').style.display = 'none';

    // --- 다시 뽑기 시 이전 UI 및 카드 초기화 --- //
    document.getElementById('hwatuResultBox').style.display = 'none';
    document.getElementById('revealArea').style.display = 'none';
    document.getElementById('hCard1').classList.remove('flipped');
    document.getElementById('hCard2').classList.remove('flipped');
    document.getElementById('shuffleArea').style.display = 'block';
    document.getElementById('shuffleArea').style.opacity = 1;
    document.getElementById('shuffleArea').style.height = '350px';
    const areaCards = document.getElementById('shuffleArea').querySelectorAll('.hwatu-deck-card');
    areaCards.forEach(c => c.remove());
    // ------------------------------------------ //

    // --- 상하좌우 4명 캐릭터 동시 팝업 등장 --- //
    const charKeys = Object.keys(TAZZA_SYSTEM.CHARACTERS).sort(() => 0.5 - Math.random());
    const positions = ['Top', 'Bottom', 'Left', 'Right'];
    
    for(let i=0; i<4; i++) {
        const char = TAZZA_SYSTEM.CHARACTERS[charKeys[i]];
        const pos = positions[i];
        document.getElementById(`tc${pos}Img`).src = char.image || '/fuctionassets/연이.webp';
        document.getElementById(`tc${pos}Name`).innerText = char.name;
        document.getElementById(`tc${pos}Text`).innerText = char.catchphrase;
    }

    if(window.gsap) {
        gsap.to('#tcTop', { top: 20, opacity: 1, duration: 0.6, ease: "back.out(1.2)" });
        gsap.to('#tcBottom', { bottom: 20, opacity: 1, duration: 0.6, ease: "back.out(1.2)", delay: 0.1 });
        gsap.to('#tcLeft', { left: 10, opacity: 1, duration: 0.6, ease: "back.out(1.2)", delay: 0.2 });
        gsap.to('#tcRight', { right: 10, opacity: 1, duration: 0.6, ease: "back.out(1.2)", delay: 0.3 });

        setTimeout(() => {
            gsap.to('#tcTop', { top: -150, opacity: 0, duration: 0.5 });
            gsap.to('#tcBottom', { bottom: -150, opacity: 0, duration: 0.5 });
            gsap.to('#tcLeft', { left: -350, opacity: 0, duration: 0.5 });
            gsap.to('#tcRight', { right: -350, opacity: 0, duration: 0.5 });
        }, 3800);
    }
    // ----------------------------------------- //

    // GSAP 셔플 애니메이션 (속도를 위해 24장 사용)
    const area = document.getElementById('shuffleArea');
    const NUM_CARDS = 24;
    
    let deckDOMs = [];
    for(let i=0; i<NUM_CARDS; i++){
        let c = document.createElement('div');
        c.className = 'hwatu-deck-card';
        area.appendChild(c);
        deckDOMs.push(c);
    }

    if(window.gsap) {
        // 1. 카드가 모임
        gsap.to(deckDOMs, { opacity: 1, duration: 0.2, stagger: 0.01 });
        // 2. 셔플 (진동 & 위아래 이동)착착 소리
        gsap.to(deckDOMs, {
            y: () => (Math.random() - 0.5) * 80,
            x: () => (Math.random() - 0.5) * 30,
            rotation: () => (Math.random() - 0.5) * 45,
            duration: 0.1, yoyo: true, repeat: 18, delay: 0.3,
            onStart: () => {
                let clacks = 0;
                let iv = setInterval(() => { playClackSound(150 + Math.random()*50); clacks++; if(clacks>15) clearInterval(iv); }, 60);
            }
        });
        // 3. 슬로우 모션 공중 체공
        gsap.to(deckDOMs, {
            y: -150, x: () => (Math.random() - 0.5) * 50, rotation: () => (Math.random() - 0.5) * 180, scale: 1.1,
            duration: 1.2, delay: 2.2, ease: "power2.out"
        });
        // 4. 바닥으로 모이기 후 부채꼴 스프레드
        gsap.to(deckDOMs, {
            y: 0, x: 0, scale: 1, rotation: 0, duration: 0.4, delay: 3.5,
            onComplete: () => { spreadCards(deckDOMs); }
        });
    } else {
        // Fallback
        setTimeout(() => spreadCards(deckDOMs), 1000);
    }
};

function spreadCards(deckDOMs) {
    playClackSound(100);
    
    // 부채꼴 회전 계산
    const startAngle = -75;
    const endAngle = 75;
    const step = (endAngle - startAngle) / (deckDOMs.length - 1);
    const radius = 220; // 부채꼴 반지름
    
    gsap.to(deckDOMs, {
        rotation: (i) => startAngle + (step * i),
        x: (i) => Math.sin((startAngle + (step * i)) * Math.PI / 180) * radius,
        y: (i) => -Math.cos((startAngle + (step * i)) * Math.PI / 180) * radius + radius - 50,
        duration: 0.8, ease: "back.out(1.2)",
        onComplete: () => {
            // 패 세팅 완료! User chooses 2 cards
            drawData = determineJokbo();
            selectedCards = 0;
            deckDOMs.forEach(c => {
                c.onclick = () => onCardSelected(c, deckDOMs);
            });
            let warn = document.getElementById('hwatuWarnMsg');
            warn.innerText = "조심스럽게 2장의 패를 뽑으쇼.";
            warn.style.color = "#d4af37";
            warn.style.display = 'block';
        }
    });
}

function onCardSelected(cardEl, deckDOMs) {
    if(cardEl.classList.contains('picked')) return;
    cardEl.classList.add('picked');
    playClackSound(250);
    
    // 선택된 카드를 위로 살짝 띄우기
    gsap.to(cardEl, { y: cardEl._gsap.y - 30, scale: 1.2, duration: 0.2, boxShadow: "0 0 15px #d4af37" });
    
    selectedCards++;
    if(selectedCards === 2) {
        // 덱 카드 클릭 비활성화
        deckDOMs.forEach(c => c.onclick = null);
        document.getElementById('hwatuWarnMsg').style.display = 'none';
        
        let stats = checkDailyLimit(); stats.count++;
        localStorage.setItem('hwatuStats', JSON.stringify(stats));
        document.getElementById('hwatuLimitText').innerText = 10 - stats.count;
        
        // 셔플 영역 서서히 사라지고 리빌 영역 등장
        gsap.to(document.getElementById('shuffleArea'), { opacity: 0, duration: 0.6, delay: 0.5, onComplete: () => {
            document.getElementById('shuffleArea').style.display = 'none';
            showReveal();
        }});
    }
}

function showReveal() {
    const { card1, card2, jokbo, score } = drawData;
    const { character, reading } = getFortuneAndCharacter(score);
    
    document.getElementById('revealArea').style.display = 'flex';
    // 카드 1 이미지 렌더링
    const img1 = document.getElementById('hCard1Img');
    const em1  = document.getElementById('hCard1Emoji');
    if (card1.img) {
        img1.src = card1.img; img1.alt = card1.name;
        img1.style.display = 'block'; em1.style.display = 'none';
    } else {
        em1.innerText = card1.emoji || '🎴'; em1.style.display = 'block'; img1.style.display = 'none';
    }
    document.getElementById('hCard1Text').innerText = card1.label || card1.name;
    // 카드 2 이미지 렌더링
    const img2 = document.getElementById('hCard2Img');
    const em2  = document.getElementById('hCard2Emoji');
    if (card2.img) {
        img2.src = card2.img; img2.alt = card2.name;
        img2.style.display = 'block'; em2.style.display = 'none';
    } else {
        em2.innerText = card2.emoji || '🎴'; em2.style.display = 'block'; img2.style.display = 'none';
    }
    document.getElementById('hCard2Text').innerText = card2.label || card2.name;

    setTimeout(() => { document.getElementById('hCard1').classList.add('flipped'); playClackSound(); }, 200);
    setTimeout(() => { document.getElementById('hCard2').classList.add('flipped'); playClackSound(); }, 900);

    setTimeout(() => {
        document.getElementById('jokboName').innerText = "【 " + jokbo + " 】";
        let charHTML = `
            <div style="display:flex;align-items:center;margin-bottom:20px;background:rgba(0,0,0,0.4);padding:15px;border-radius:10px;border-left:4px solid #d4af37;">
                <img src="${character.image || '/icons/honey%20manse.png'}" alt="" style="width:70px;height:70px;border-radius:50%;margin-right:15px;border:2px solid #d4af37;box-shadow:0 0 10px rgba(251,191,36,0.2);">
                <div style="flex:1;">
                    <div style="color:#94a3b8;font-size:0.9rem;margin-bottom:5px;">${character.name} 가 말하길..</div>
                    <div style="color:#facc15;font-weight:bold;font-style:italic;line-height:1.4;">${character.catchphrase}</div>
                </div>
            </div>
        `;
        let finalHwatuHTML = charHTML + reading;
          document.getElementById('fortuneDetails').innerHTML = finalHwatuHTML;
        document.getElementById('hwatuResultBox').style.display = 'block';
        
        const btn = document.getElementById('startShuffleBtn');
        btn.style.display = 'none'; // 섯다 결과 후 shuffleArea 버튼 숨김
        document.getElementById('shuffleArea').style.display = 'none';
        // 전용 다시뽑기 버튼 표시
        const retryBtn = document.getElementById('hwatuRetryBtn');
        if(retryBtn) retryBtn.style.display = 'block';
    }, 1800);
}

window.shareHwatu = function() {
    const text = "[🎴 화투점 결과]\n나의 패: " + document.getElementById('jokboName').innerText + "\n👉 내 타짜 운세 확인하기: " + window.location.href;
    if (navigator.share) { navigator.share({ title: '화투점', text: text }).catch(console.error); } 
    else { alert("클립보드에 복사되었습니다.\n\n" + text); }
};

// ═══════════════════════════════════════════════════════════════
//  화투 인생 패 심리 테스트
// ═══════════════════════════════════════════════════════════════
const LIFE_TRAITS = [
    'leadership',
    'opportunism',
    'strategy',
    'pragmatism',
    'endurance',
    'charisma',
    'intuition',
    'composure'
];

const LIFE_CARD_TEST_DATA = {
    archetypes: [
        {
            id: 'samgwang',
            name: '삼광',
            cardTitle: '태생적 주인공',
            tagline: '어디서든 판의 중심을 가져오는 광채형 리더.',
            image: hwatuImg(3, 1),
            traits: ['리더십', '존재감', '승부욕'],
            quote: '판이 조용하면 네가 불을 붙여라. 중심은 만들면 된다.',
            profile: { leadership: 5, opportunism: 3, strategy: 3, pragmatism: 2, endurance: 3, charisma: 5, intuition: 3, composure: 3 }
        },
        {
            id: 'godori',
            name: '고도리',
            cardTitle: '기회 포착의 화신',
            tagline: '세 마리 새처럼 찰나를 낚아채는 속전속결 승부사.',
            image: hwatuImg(2, 1),
            traits: ['민첩성', '결단력', '순발력'],
            quote: '기회는 두 번 안 온다. 왔을 때 뜯어먹는 게 실력이다.',
            profile: { leadership: 3, opportunism: 5, strategy: 2, pragmatism: 3, endurance: 2, charisma: 4, intuition: 4, composure: 2 }
        },
        {
            id: 'cheongdan',
            name: '청단',
            cardTitle: '완벽주의 전략가',
            tagline: '줄 맞추는 디테일로 큰 판을 설계하는 냉정한 브레인.',
            image: hwatuImg(4, 2),
            traits: ['계획성', '분석력', '정확성'],
            quote: '운은 준비된 설계도 위에만 앉는다.',
            profile: { leadership: 3, opportunism: 2, strategy: 5, pragmatism: 4, endurance: 3, charisma: 2, intuition: 2, composure: 5 }
        },
        {
            id: 'hongdan',
            name: '홍단',
            cardTitle: '감정 조율의 달인',
            tagline: '사람의 온도를 읽고 관계의 흐름을 붙잡는 협상가.',
            image: hwatuImg(1, 2),
            traits: ['공감력', '관계력', '표현력'],
            quote: '말 한 장이 패 열 장을 이길 때가 있다.',
            profile: { leadership: 3, opportunism: 3, strategy: 3, pragmatism: 2, endurance: 3, charisma: 5, intuition: 4, composure: 3 }
        },
        {
            id: 'chodan',
            name: '초단',
            cardTitle: '정밀 컨트롤러',
            tagline: '작은 오차도 허용하지 않는 루틴 설계형 플레이어.',
            image: hwatuImg(6, 2),
            traits: ['체계성', '관리력', '성실함'],
            quote: '큰 승부는 대충이 아니라 루틴에서 갈린다.',
            profile: { leadership: 2, opportunism: 2, strategy: 5, pragmatism: 4, endurance: 4, charisma: 2, intuition: 2, composure: 4 }
        },
        {
            id: 'bipung',
            name: '비풍초똥팔삼',
            cardTitle: '쿨한 현실주의자',
            tagline: '버릴 건 버리고 챙길 건 챙기는 실속형 생존자.',
            image: hwatuImg(12, 3),
            traits: ['효율성', '멘탈', '손절력'],
            quote: '모든 패를 들고 가려는 순간, 이미 진 거다.',
            profile: { leadership: 2, opportunism: 4, strategy: 3, pragmatism: 5, endurance: 4, charisma: 2, intuition: 3, composure: 4 }
        },
        {
            id: 'ddonggwang',
            name: '똥광',
            cardTitle: '대기만성형 거물',
            tagline: '남들이 버린 구석에서 기회를 길어올리는 역전형.',
            image: hwatuImg(11, 4),
            traits: ['인내심', '복원력', '끈기'],
            quote: '지금 지는 척하는 게, 마지막에 먹는 기술이다.',
            profile: { leadership: 2, opportunism: 2, strategy: 3, pragmatism: 4, endurance: 5, charisma: 2, intuition: 3, composure: 5 }
        },
        {
            id: 'bigwang',
            name: '비광',
            cardTitle: '폭풍 돌파형 승부꾼',
            tagline: '비바람 속에서도 길을 내는 하이리스크 혁신가.',
            image: hwatuImg(12, 1),
            traits: ['돌파력', '배짱', '반전력'],
            quote: '비 오는 판일수록, 진짜 실력이 드러난다.',
            profile: { leadership: 4, opportunism: 3, strategy: 2, pragmatism: 2, endurance: 4, charisma: 4, intuition: 4, composure: 2 }
        }
    ],
    questions: [
        {
            id: 'q1',
            title: '판돈이 예상보다 두 배로 커졌다. 네 첫 반응은?',
            sub: '돈 앞에서 너의 기본 자세를 본다.',
            choices: [
                { key: 'A', text: '판이 커졌다면 내가 흐름을 잡는다. 콜.', scores: { leadership: 2, opportunism: 1, charisma: 1 } },
                { key: 'B', text: '상대 표정을 읽고 한 박자 늦게 들어간다.', scores: { strategy: 2, composure: 2 } },
                { key: 'C', text: '손절 기준부터 세우고 리스크를 먼저 자른다.', scores: { pragmatism: 2, endurance: 1, composure: 1 } }
            ]
        },
        {
            id: 'q2',
            title: '좋아하는 사람과 감정이 엇갈렸다. 어떻게 움직일까?',
            sub: '사랑 앞에서 네 승부법을 본다.',
            choices: [
                { key: 'A', text: '오늘 바로 직구. 마음은 타이밍이다.', scores: { charisma: 2, leadership: 1, intuition: 1 } },
                { key: 'B', text: '상대의 리듬을 보고 말의 순서를 다시 짠다.', scores: { strategy: 2, composure: 1, pragmatism: 1 } },
                { key: 'C', text: '잠깐 물러나 감정 정리 후 다시 들어간다.', scores: { endurance: 2, composure: 2 } }
            ]
        },
        {
            id: 'q3',
            title: '팀 프로젝트가 뒤집어졌다. 네 역할은?',
            sub: '위기 상황의 포지션 선택.',
            choices: [
                { key: 'A', text: '내가 앞에서 책임지고 판을 다시 세운다.', scores: { leadership: 2, endurance: 1, charisma: 1 } },
                { key: 'B', text: '문제 원인을 분해해 재배치표부터 만든다.', scores: { strategy: 2, composure: 2 } },
                { key: 'C', text: '당장 살릴 수 있는 라인만 추려 빠르게 복구한다.', scores: { pragmatism: 2, opportunism: 1, endurance: 1 } }
            ]
        },
        {
            id: 'q4',
            title: '갑자기 빈자리가 생겼다. 승진 기회가 열렸다.',
            sub: '기회 앞에서 망설임이 있는가.',
            choices: [
                { key: 'A', text: '내 이름부터 올린다. 자리는 선점이다.', scores: { leadership: 2, opportunism: 2 } },
                { key: 'B', text: '요건과 리스크를 따져 확률부터 계산한다.', scores: { strategy: 2, composure: 1, pragmatism: 1 } },
                { key: 'C', text: '지금은 실속이 우선. 때를 보고 들어간다.', scores: { pragmatism: 2, endurance: 1, intuition: 1 } }
            ]
        },
        {
            id: 'q5',
            title: '친구가 무리한 투자 제안을 한다. 너의 한마디는?',
            sub: '신뢰와 계산 사이의 선택.',
            choices: [
                { key: 'A', text: '가능성 있으면 소액으로 먼저 찍어본다.', scores: { opportunism: 2, intuition: 1, pragmatism: 1 } },
                { key: 'B', text: '근거 없으면 안 간다. 숫자부터 가져오라 한다.', scores: { strategy: 2, pragmatism: 2 } },
                { key: 'C', text: '관계는 지키되 돈은 지킨다. 단호히 거절한다.', scores: { composure: 2, endurance: 1, pragmatism: 1 } }
            ]
        },
        {
            id: 'q6',
            title: '중요한 발표 10분 전, 돌발 변수가 생겼다.',
            sub: '순간 대응 능력 체크.',
            choices: [
                { key: 'A', text: '즉석에서 흐름을 재구성하고 밀어붙인다.', scores: { charisma: 2, leadership: 1, intuition: 1 } },
                { key: 'B', text: '핵심 3가지만 남겨 안정적으로 간다.', scores: { strategy: 1, pragmatism: 2, composure: 1 } },
                { key: 'C', text: '속도 늦추고 실수 없는 운영으로 버틴다.', scores: { endurance: 2, composure: 2 } }
            ]
        },
        {
            id: 'q7',
            title: '네가 생각하는 진짜 승부는 무엇인가?',
            sub: '마지막 질문. 네 본능을 택하라.',
            choices: [
                { key: 'A', text: '사람들의 시선을 내 쪽으로 돌리는 순간.', scores: { charisma: 2, leadership: 1, opportunism: 1 } },
                { key: 'B', text: '계획이 완벽하게 맞아떨어지는 순간.', scores: { strategy: 2, composure: 1, endurance: 1 } },
                { key: 'C', text: '끝까지 살아남아 뒤집는 마지막 한 수.', scores: { endurance: 2, intuition: 1, pragmatism: 1 } }
            ]
        }
    ]
};

let _lifeCardState = null;

const LIFE_CARD_COMBO_MAP = {
    samgwang: {
        cards: [hwatuImg(1, 1), hwatuImg(3, 1), hwatuImg(8, 1)],
        label: '광 중심 삼광 조합'
    },
    godori: {
        cards: [hwatuImg(2, 1), hwatuImg(4, 1), hwatuImg(8, 2)],
        label: '열끗 기회 포착 조합'
    },
    cheongdan: {
        cards: [hwatuImg(4, 2), hwatuImg(5, 2), hwatuImg(6, 2)],
        label: '청단 전략 조합'
    },
    hongdan: {
        cards: [hwatuImg(1, 2), hwatuImg(2, 2), hwatuImg(7, 2)],
        label: '홍단 관계 조합'
    },
    chodan: {
        cards: [hwatuImg(9, 2), hwatuImg(10, 2), hwatuImg(6, 2)],
        label: '정밀 루틴 조합'
    },
    bipung: {
        cards: [hwatuImg(12, 3), hwatuImg(9, 4), hwatuImg(4, 4)],
        label: '실속 파투 조합'
    },
    ddonggwang: {
        cards: [hwatuImg(11, 4), hwatuImg(11, 1), hwatuImg(12, 4)],
        label: '역전 내공 조합'
    },
    bigwang: {
        cards: [hwatuImg(12, 1), hwatuImg(10, 1), hwatuImg(8, 1)],
        label: '비광 반전 조합'
    }
};

function _createTraitScores() {
    const scores = {};
    LIFE_TRAITS.forEach((t) => { scores[t] = 0; });
    return scores;
}

function _addTraitScores(base, delta) {
    Object.keys(delta || {}).forEach((k) => {
        if (typeof base[k] === 'number') {
            base[k] += delta[k];
        }
    });
}

function _pickLifeArchetype(scores) {
    let best = LIFE_CARD_TEST_DATA.archetypes[0];
    let bestValue = -Infinity;
    LIFE_CARD_TEST_DATA.archetypes.forEach((arc) => {
        let dot = 0;
        LIFE_TRAITS.forEach((k) => {
            dot += (scores[k] || 0) * (arc.profile[k] || 0);
        });
        if (dot > bestValue) {
            bestValue = dot;
            best = arc;
        }
    });
    return best;
}

function _buildLifeMonthlySummary(arc) {
    const month = new Date().getMonth() + 1;
    const monthNames = {
        1: '송학', 2: '매조', 3: '벚꽃', 4: '흑싸리', 5: '난초', 6: '모란',
        7: '홍싸리', 8: '공산명월', 9: '국화', 10: '단풍', 11: '오동', 12: '비'
    };
    const monthLabel = month + '월 ' + (monthNames[month] || '월령');
    const perArc = {
        samgwang: '이번 달은 네 존재감이 결정권을 만든다. 회의, 면접, 협상처럼 무대가 있는 자리에서 먼저 선언하라.',
        godori: '이번 달은 속도가 돈이다. 정보가 들어오면 하루 안에 판단해 움직일수록 이득이 커진다.',
        cheongdan: '이번 달은 디테일이 승부를 가른다. 문서, 계약, 스케줄의 작은 구멍을 막으면 큰 손실을 피한다.',
        hongdan: '이번 달은 관계가 자산이다. 누군가의 마음을 제대로 읽어낸 한 번의 대화가 다음 기회를 연다.',
        chodan: '이번 달은 루틴이 네 방패다. 반복되는 습관을 정리하면 체력과 성과가 동시에 올라온다.',
        bipung: '이번 달은 선택과 집중이 답이다. 버릴 카드부터 정리하면 남은 판이 훨씬 선명해진다.',
        ddonggwang: '이번 달은 느리지만 강하다. 당장 티 나지 않아도 꾸준히 버티는 사람이 마지막 패를 가져간다.',
        bigwang: '이번 달은 변수가 곧 기회다. 예상 밖 상황에서 과감히 포지션을 바꾸면 판을 뒤집을 수 있다.'
    };
    const baseText = perArc[arc.id] || '이번 달은 자기 리듬을 지키는 사람이 끝내 웃는다.';
    return '이 패를 가진 당신의 이번 달 운세는? [' + monthLabel + '] ' + baseText;
}

function _resolveLifeResultCard(arc, scores) {
    const combo = LIFE_CARD_COMBO_MAP[arc.id] || { cards: [arc.image], label: '기본 상징 조합' };
    const selectorSeed = (scores.leadership || 0) + (scores.strategy || 0) + (scores.intuition || 0);
    const idx = combo.cards.length ? (selectorSeed % combo.cards.length) : 0;
    return {
        image: combo.cards[idx] || arc.image,
        comboLabel: combo.label
    };
}

function _buildLifeDetailNarrative(arc, scores, resolvedCard) {
    const focusMap = {
        samgwang: {
            flow: '이번 판은 네가 먼저 판을 여는 순간부터 흐름이 붙는다. 시선이 몰리는 자리에서 망설임 없이 선언해야 먹는다.',
            caution: '다만 세게 들어간 뒤 회수 타이밍을 놓치면 체력만 빠진다. 화끈함 다음엔 반드시 정리 수를 붙이쇼.',
            move: '오늘의 실전 수: 중요한 대화에서 첫 문장을 네가 깔고, 결정은 24시간 안에 마무리.'
        },
        godori: {
            flow: '기회는 길게 열리지 않는다. 작은 신호를 먼저 잡아채는 순발력이 오늘 수익을 만든다.',
            caution: '속도만 믿고 근거를 놓치면 뒷수습이 커진다. 판단 전에 핵심 숫자 1개는 반드시 확인하쇼.',
            move: '오늘의 실전 수: 들어온 제안은 세 갈래(수익/리스크/회수)로 10분 내 분해 후 움직이기.'
        },
        cheongdan: {
            flow: '네 장점은 디테일에서 나온다. 문서, 일정, 계약에서 빈칸을 메우는 순간 승부가 네 쪽으로 기운다.',
            caution: '완벽을 기다리다 타이밍을 놓치면 좋은 패도 죽는다. 80% 완성에서 먼저 출발하고 보완하쇼.',
            move: '오늘의 실전 수: 체크리스트 3개(마감, 비용, 책임자)만 고정하고 바로 실행.'
        },
        hongdan: {
            flow: '사람의 기류를 읽는 감각이 날카롭다. 관계의 온도를 맞추면 막힌 대화도 열린다.',
            caution: '분위기에만 기대면 결론이 흐려진다. 공감 다음에는 반드시 한 줄 결론으로 못 박으쇼.',
            move: '오늘의 실전 수: 메시지/대화 끝에 다음 액션 시간까지 명시해서 흐름 고정.'
        },
        chodan: {
            flow: '반복과 루틴이 네 무기다. 흔들리는 판에서도 규칙을 지키는 사람이 결국 이긴다.',
            caution: '세부 조정에 오래 묶이면 전체 속도가 죽는다. 우선순위 1개를 먼저 끝내고 다음으로 넘기쇼.',
            move: '오늘의 실전 수: 오전에 가장 무거운 일 1개를 완결해 흐름 선점.'
        },
        bipung: {
            flow: '버릴 패를 먼저 고르는 냉정함이 강점이다. 선택과 집중이 오늘 손실을 줄이고 실속을 만든다.',
            caution: '과한 손절은 기회까지 버린다. 끊을 것과 보유할 것을 기준표로 나눠서 판단하쇼.',
            move: '오늘의 실전 수: 돈/시간/관계에서 불필요한 1개를 정리하고 핵심 1개에 몰빵.'
        },
        ddonggwang: {
            flow: '초반이 답답해도 후반 역전력이 강하다. 버티는 동안 힘이 쌓이고 마지막에 판이 뒤집힌다.',
            caution: '버틴다는 명분으로 대응을 늦추면 기회를 놓친다. 대기와 준비를 동시에 가져가쇼.',
            move: '오늘의 실전 수: 보류 중인 일 하나에 마감 시점을 박아두고 소폭 전진.'
        },
        bigwang: {
            flow: '변수 많은 날일수록 네 감각이 빛난다. 포지션 전환을 과감히 하면 오히려 이익이 커진다.',
            caution: '배짱만 앞서면 리스크가 과열된다. 크게 들어가기 전 최소 안전장치 한 줄은 걸어두쇼.',
            move: '오늘의 실전 수: 플랜 B를 먼저 만든 뒤 플랜 A를 공격적으로 실행.'
        }
    };
    const guide = focusMap[arc.id] || {
        flow: '오늘은 네 기본기를 지키는 쪽이 유리하다. 급한 결정보다 흐름 읽기가 우선이다.',
        caution: '감정으로 베팅하지 말고, 기준을 세운 뒤 실행하쇼.',
        move: '오늘의 실전 수: 하나를 고르고 끝까지 밀기.'
    };

    const heat = (scores.charisma || 0) + (scores.leadership || 0);
    const frame = (scores.strategy || 0) + (scores.composure || 0);
    const grip = (scores.endurance || 0) + (scores.pragmatism || 0);

    return `
        <div class="life-detail-title">🎴 상세 타짜 풀이 (${resolvedCard.comboLabel})</div>
        <span class="life-detail-point">• 판세 흐름: ${guide.flow}</span>
        <span class="life-detail-point">• 경계 포인트: ${guide.caution}</span>
        <span class="life-detail-point">• 실행 수법: ${guide.move}</span>
        <span class="life-detail-point">• 기질 지수: 배짱 ${heat} / 설계 ${frame} / 버팀 ${grip}</span>
        <span class="life-detail-point">• 오늘 한 줄: "패는 이미 나왔다. 이제 누가 먼저 칼을 뽑느냐의 문제다."</span>
    `;
}

function _renderLifeQuestion() {
    if(!_lifeCardState) return;
    const panel = document.getElementById('lifeCardQuestionPanel');
    const holder = document.getElementById('lifeQuestionCard');
    const fill = document.getElementById('lifeProgressFill');
    if(!panel || !holder || !fill) return;

    const idx = _lifeCardState.index;
    const total = LIFE_CARD_TEST_DATA.questions.length;
    const question = LIFE_CARD_TEST_DATA.questions[idx];
    if(!question) return;

    fill.style.width = Math.round((idx / total) * 100) + '%';

    holder.innerHTML = `
        <div class="life-q-tag">문항 ${idx + 1} / ${total}</div>
        <div class="life-q-title">${question.title}</div>
        <div class="life-q-sub">${question.sub}</div>
        ${question.choices.map((choice, cIdx) => `
            <button class="life-choice" type="button" onclick="chooseLifeCardOption(${cIdx})">
                <span class="life-choice-key">${choice.key}</span>${choice.text}
            </button>
        `).join('')}
    `;

    if(window.gsap) {
        gsap.fromTo(holder, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out' });
    }
}

window.startLifeCardTest = function() {
    _lifeCardState = {
        index: 0,
        scores: _createTraitScores()
    };
    const intro = document.getElementById('lifeCardIntro');
    const panel = document.getElementById('lifeCardQuestionPanel');
    const result = document.getElementById('lifeCardResultBox');
    if(intro) intro.style.display = 'none';
    if(result) result.style.display = 'none';
    if(panel) panel.style.display = 'block';
    playClackSound(190);
    _renderLifeQuestion();
};

window.resetLifeCardTest = function() {
    _lifeCardState = null;
    const intro = document.getElementById('lifeCardIntro');
    const panel = document.getElementById('lifeCardQuestionPanel');
    const result = document.getElementById('lifeCardResultBox');
    const fill = document.getElementById('lifeProgressFill');
    const detail = document.getElementById('lifeDetailNarrative');
    const detailBtn = document.getElementById('lifeDetailToggleBtn');
    if(intro) intro.style.display = 'block';
    if(panel) panel.style.display = 'none';
    if(result) result.style.display = 'none';
    if(fill) fill.style.width = '0%';
    if(detail) { detail.style.display = 'none'; detail.innerHTML = ''; }
    if(detailBtn) detailBtn.innerText = '상세 운세 보기';
};

window.chooseLifeCardOption = function(choiceIndex) {
    if(!_lifeCardState) return;
    const question = LIFE_CARD_TEST_DATA.questions[_lifeCardState.index];
    if(!question) return;
    const choice = question.choices[choiceIndex];
    if(!choice) return;

    _addTraitScores(_lifeCardState.scores, choice.scores);
    playClackSound(250);

    const holder = document.getElementById('lifeQuestionCard');
    if(window.gsap && holder) {
        gsap.to(holder, {
            opacity: 0,
            y: -10,
            duration: 0.17,
            onComplete: () => {
                _lifeCardState.index += 1;
                if(_lifeCardState.index >= LIFE_CARD_TEST_DATA.questions.length) {
                    _showLifeCardResult();
                } else {
                    _renderLifeQuestion();
                }
            }
        });
    } else {
        _lifeCardState.index += 1;
        if(_lifeCardState.index >= LIFE_CARD_TEST_DATA.questions.length) {
            _showLifeCardResult();
        } else {
            _renderLifeQuestion();
        }
    }
};

function _showLifeCardResult() {
    if(!_lifeCardState) return;

    const result = _pickLifeArchetype(_lifeCardState.scores);
    const resolvedCard = _resolveLifeResultCard(result, _lifeCardState.scores);
    const panel = document.getElementById('lifeCardQuestionPanel');
    const resultBox = document.getElementById('lifeCardResultBox');

    document.getElementById('lifeResultImg').src = resolvedCard.image;
    document.getElementById('lifeResultName').innerText = '당신의 인생 패: [' + result.name + '] - ' + result.cardTitle;
    document.getElementById('lifeResultTagline').innerText = '"' + result.quote + '"';
    document.getElementById('lifeResultDesc').innerText = result.tagline + ' (해석 기준: ' + resolvedCard.comboLabel + ')';
    document.getElementById('lifeResultTraits').innerHTML = result.traits.map((t) => '<span class="life-result-chip">' + t + '</span>').join('');
    document.getElementById('lifeMonthlySummary').innerText = _buildLifeMonthlySummary(result);
    const detail = document.getElementById('lifeDetailNarrative');
    const detailBtn = document.getElementById('lifeDetailToggleBtn');
    if(detail) {
        detail.innerHTML = _buildLifeDetailNarrative(result, _lifeCardState.scores, resolvedCard);
        detail.style.display = 'none';
    }
    if(detailBtn) detailBtn.innerText = '상세 운세 보기';

    window._lastLifeCardResult = result;
    window._lastLifeCardResolved = resolvedCard;

    if(panel) panel.style.display = 'none';
    if(resultBox) resultBox.style.display = 'block';

    const fill = document.getElementById('lifeProgressFill');
    if(fill) fill.style.width = '100%';

    if(window.gsap && resultBox) {
        gsap.fromTo(resultBox, { opacity: 0, y: 18, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'power2.out' });
    }
}

window.toggleLifeCardDetail = function() {
    const detail = document.getElementById('lifeDetailNarrative');
    const btn = document.getElementById('lifeDetailToggleBtn');
    if(!detail || !btn) return;

    const willShow = detail.style.display === 'none' || !detail.style.display;
    if(willShow) {
        detail.style.display = 'block';
        btn.innerText = '상세 운세 접기';
        if(window.gsap) {
            gsap.fromTo(detail, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' });
        }
    } else {
        if(window.gsap) {
            gsap.to(detail, {
                opacity: 0,
                y: -8,
                duration: 0.2,
                onComplete: function() { detail.style.display = 'none'; }
            });
        } else {
            detail.style.display = 'none';
        }
        btn.innerText = '상세 운세 보기';
    }
};

window.shareHwatuLifeCard = function() {
    const result = window._lastLifeCardResult;
    const resolved = window._lastLifeCardResolved;
    if(!result) {
        alert('먼저 테스트 결과를 확인해주쇼.');
        return;
    }

    shareWithReward(function() {
    const text = [
        '[🎴 화투 인생 패 테스트]',
        '나의 인생 패: [' + result.name + '] ' + result.cardTitle,
        result.tagline,
        resolved && resolved.comboLabel ? ('핵심 조합: ' + resolved.comboLabel) : '',
        _buildLifeMonthlySummary(result),
        '👉 지금 확인: ' + window.location.href
    ].filter(Boolean).join('\n');

    var Kakao = window.Kakao;
    if (
        Kakao &&
        typeof Kakao.isInitialized === 'function' &&
        Kakao.isInitialized() &&
        Kakao.Share &&
        typeof Kakao.Share.sendDefault === 'function'
    ) {
        try {
            Kakao.Share.sendDefault({
                objectType: 'feed',
                content: {
                    title: '화투 인생 패: ' + result.name,
                    description: result.cardTitle + ' | ' + result.tagline,
                    imageUrl: window.location.origin + String((resolved && resolved.image) ? resolved.image : result.image || '').replace(/^\//, '/'),
                    link: {
                        mobileWebUrl: window.location.href,
                        webUrl: window.location.href
                    }
                },
                buttons: [
                    {
                        title: '결과 보러 가기',
                        link: {
                            mobileWebUrl: window.location.href,
                            webUrl: window.location.href
                        }
                    }
                ]
            });
            return;
        } catch (e) {
            console.warn('[hwatu-life] Kakao.Share.sendDefault failed', e);
        }
    }

    if(navigator.share) {
        navigator.share({ title: '화투 인생 패 테스트', text: text }).catch(function() {});
        return;
    }

    const encoded = encodeURIComponent(text);
    const kakaoUrl = 'kakaotalk://send?text=' + encoded;
    const anchor = document.createElement('a');
    anchor.href = kakaoUrl;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(function() {
        if(anchor && anchor.parentNode) anchor.parentNode.removeChild(anchor);
        alert('카카오 공유를 시도했습니다. 실행되지 않으면 아래 메시지를 복사해서 공유해주쇼.\n\n' + text);
    }, 380);
    }, 'hwatu'); /* shareWithReward 콜백 끝 */
};

// ═══════════════════════════════════════════════════════════════
//  모드 토글
// ═══════════════════════════════════════════════════════════════
window._hwatuMode = 'seotda'; // 'seotda' | 'traditional' | 'lifecard'

window.switchHwatuMode = function(mode, autoStartTraditional) {
    if (typeof autoStartTraditional === 'undefined') autoStartTraditional = false;
    window._hwatuMode = mode;
    const isSeotda = mode === 'seotda';
    const isTraditional = mode === 'traditional';
    const isLifeCard = mode === 'lifecard';
    const seotdaBox = document.getElementById('seotdaModeContainer');
    const traditionalBox = document.getElementById('traditionalModeContainer');
    const lifeCardBox = document.getElementById('lifeCardModeContainer');
    seotdaBox.style.display = isSeotda ? '' : 'none';
    traditionalBox.style.display = isTraditional ? '' : 'none';
    if(lifeCardBox) lifeCardBox.style.display = isLifeCard ? '' : 'none';
    // 섯다 고유 요소들
    const shuffleArea = document.getElementById('shuffleArea');
    const revealArea = document.getElementById('revealArea');
    const seotdaResult = document.getElementById('hwatuResultBox');
    if(shuffleArea) shuffleArea.style.display = isSeotda ? 'block' : 'none';
    if(revealArea) revealArea.style.display = isSeotda ? (revealArea.dataset.vis || revealArea.style.display || 'none') : 'none';
    if(seotdaResult) seotdaResult.style.display = isSeotda ? (seotdaResult.dataset.vis || seotdaResult.style.display || 'none') : 'none';
    // 토글 버튼 스타일
    const modeBtnSeotda = document.getElementById('modeBtnSeotda');
    const modeBtnTraditional = document.getElementById('modeBtnTraditional');
    const modeBtnLifeCard = document.getElementById('modeBtnLifeCard');
    if(modeBtnSeotda) {
        modeBtnSeotda.style.background = isSeotda ? '#d4af37' : 'transparent';
        modeBtnSeotda.style.color = isSeotda ? '#1a202c' : '#d4af37';
    }
    if(modeBtnTraditional) {
        modeBtnTraditional.style.background = isTraditional ? '#d4af37' : 'transparent';
        modeBtnTraditional.style.color = isTraditional ? '#1a202c' : '#d4af37';
    }
    if(modeBtnLifeCard) {
        modeBtnLifeCard.style.background = isLifeCard ? '#d4af37' : 'transparent';
        modeBtnLifeCard.style.color = isLifeCard ? '#1a202c' : '#d4af37';
    }

    if((isTraditional || isLifeCard) && typeof traditionalBox?.scrollIntoView === 'function') {
        setTimeout(function() {
            if(isTraditional) traditionalBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if(isLifeCard && lifeCardBox && typeof lifeCardBox.scrollIntoView === 'function') {
                lifeCardBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 30);
    }

    // 기본 동작은 수동 시작(버튼 클릭)이며, 명시적으로 true를 넘긴 경우에만 자동 시작
    if (isTraditional && autoStartTraditional && !_tradState) {
        setTimeout(function() {
            if (window._hwatuMode === 'traditional' && !_tradState) {
                startTraditionalGame();
            }
        }, 40);
    }

    if (isLifeCard && typeof window.resetLifeCardTest === 'function') {
        window.resetLifeCardTest();
    }
};

// ═══════════════════════════════════════════════════════════════
//  정통 화투점 (운수 떼기) — TraditionalDivinationService
// ═══════════════════════════════════════════════════════════════

// 월별 상징 데이터
const MONTH_SYMBOLS = {
    1:  { name:'송학(松鶴)', keywords:['장수','새 출발','귀인 만남'],    lucky:'흰색·파랑', animal:'두루미' },
    2:  { name:'매조(梅鳥)', keywords:['희망','인내','연애 첫 신호'],    lucky:'분홍·노랑', animal:'꾀꼬리' },
    3:  { name:'벚꽃(花見)', keywords:['화려한 전성기','인기','설레임'], lucky:'분홍·금색', animal:'나비'   },
    4:  { name:'흑싸리',     keywords:['돌발 행운','뜻밖의 인연'],       lucky:'검정·초록', animal:'두꺼비' },
    5:  { name:'난초(蘭)',   keywords:['품위','재능 발휘','은밀한 행운'],  lucky:'보라·금색', animal:'나비'   },
    6:  { name:'모란(牧丹)', keywords:['부(富)','풍요','사업 번창'],      lucky:'빨강·금색', animal:'나비'   },
    7:  { name:'홍싸리',     keywords:['우정','협력','팀워크 강화'],      lucky:'빨강·흰색', animal:'멧돼지' },
    8:  { name:'공산명월',   keywords:['명예','성취','대운 도래'],        lucky:'은색·흰색', animal:'기러기' },
    9:  { name:'국화(菊)',   keywords:['절개','완성','목표 달성'],        lucky:'노랑·흰색', animal:'기러기' },
    10: { name:'단풍(楓)',   keywords:['결실','마무리','보상'],           lucky:'주황·빨강', animal:'사슴'   },
    11: { name:'오동(梧桐)', keywords:['변화','전환점','잠재력 개화'],    lucky:'보라·금색', animal:'봉황'   },
    12: { name:'비(雨)',     keywords:['시련','정화','재기'],             lucky:'검정·파랑', animal:'개구리' }
};

// 정통 화투점 카테고리
window._tradCategory = 'wealth';
window.setTradCategory = function(cat, btn) {
    window._tradCategory = cat;
    document.querySelectorAll('[id^="tradCat_"]').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
};

// 이미지 캐시
const _imgCache = {};
function _getImg(month, idx) {
    const key = month + '_' + idx;
    if(!_imgCache[key]) { _imgCache[key] = hwatuImg(month, idx); }
    return _imgCache[key];
}

// 게임 상태
let _tradState = null;

function _shuffle(arr) {
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 48장 카드 객체 생성 (id 고유)
function _buildFullDeck() {
    const cards = [];
    TAZZA_SYSTEM.DECK.forEach((base, i) => {
        cards.push({
            id: i,
            month: base.month,
            idx: base.idx,
            type: base.type,
            name: base.name,
            label: base.label,
            img: base.img,
            status: 'hidden', // hidden | visible | removed
            stackIndex: 0,
            order: 0          // 0=bottom … 3=top
        });
    });
    return cards;
}

function _hasVisibleMonthPair(stacks) {
    const visible = [].concat.apply([], stacks).filter(c => c.status === 'visible');
    const seen = {};
    for (let i = 0; i < visible.length; i++) {
        const month = visible[i].month;
        if (seen[month]) return true;
        seen[month] = true;
    }
    return false;
}

function _dealTraditionalStacks() {
    const rawDeck = _buildFullDeck();
    const shuffled = _shuffle(rawDeck);
    const stacks = Array.from({length:12}, () => []);

    shuffled.forEach((card, i) => {
        const si = i % 12;
        card.stackIndex = si;
        card.order = stacks[si].length;
        stacks[si].push(card);
    });

    stacks.forEach(stack => {
        stack.forEach((card, o) => {
            card.status = o === 3 ? 'visible' : 'hidden';
        });
    });

    return stacks;
}

window.startTraditionalGame = function() {
    // 일일 한도 체크
    const stats = checkDailyLimit();
    if(stats.count >= 10) {
        alert('오늘 횟수를 다 썼어요! 내일 다시 오쇼.'); return;
    }

    // 자동 진행이 첫 스텝부터 멈추지 않도록 초기 공개 패에 최소 다중 짝 보장
    let stacks = null;
    for (let tryCount = 0; tryCount < 80; tryCount++) {
        const candidate = _dealTraditionalStacks();
        if (_countVisibleMonthPairs(candidate) >= 2) {
            stacks = candidate;
            break;
        }
        stacks = candidate;
    }

    _tradState = {
        stacks,
        selected: null,        // 선택된 카드 id (null | id)
        removedCount: 0,
        category: window._tradCategory,
        autoMode: true,
        stopRequested: false
    };

    // 한도 차감
    stats.count++;
    localStorage.setItem('hwatuStats', JSON.stringify(stats));
    document.getElementById('hwatuLimitText').innerText = 10 - stats.count;

    document.getElementById('tradStartBtn').style.display = 'none';
    document.getElementById('tradResultBox').style.display = 'none';
    document.getElementById('tradGameBoard').style.display = 'block';
    _renderTradBoard();
    document.getElementById('tradSelectionHint').textContent = '자동 선택 중... 랜덤 월 기운의 짝을 추적하는 중이오.';
    _runAutoTraditionalFlow();
};

function _renderTradBoard() {
    if(!_tradState) return;
    const { stacks, removedCount } = _tradState;
    const totalVisible = [].concat.apply([], stacks).filter(c => c.status !== 'removed').length;
    document.getElementById('tradRemaining').innerText = totalVisible;
    document.getElementById('tradRemoved').innerText = removedCount;

    const grid = document.getElementById('tradStackGrid');
    grid.innerHTML = '';

    stacks.forEach((stack, si) => {
        const stackEl = document.createElement('div');
        stackEl.className = 'trad-stack';

        const sym = MONTH_SYMBOLS[si+1];
        const lbl = document.createElement('div');
        lbl.className = 'trad-stack-label';
        const visibleTop = stack.slice().reverse().find(c => c.status === 'visible');
        lbl.textContent = visibleTop ? (`${visibleTop.month}월 기운`) : (`더미 ${si+1}`);
        stackEl.appendChild(lbl);

        // 아직 제거 안 된 카드들 (바닥→위 순, 아래서 위로 쌓인 느낌)
        const alive = stack.filter(c => c.status !== 'removed');
        if(alive.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'width:100%;aspect-ratio:2/3;border:1px dashed rgba(212,175,55,0.2);border-radius:6px;';
            stackEl.appendChild(empty);
        } else {
            alive.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'trad-card';
                cardEl.dataset.cardId = card.id;

                if(card.status === 'hidden') {
                    cardEl.classList.add('hidden-card');
                    cardEl.title = '아직 열리지 않은 패';
                } else {
                    // visible
                    const img = document.createElement('img');
                    img.src = _getImg(card.month, card.idx);
                    img.alt = card.name;
                    img.loading = 'lazy';
                    cardEl.appendChild(img);

                    if(_tradState.selected === card.id) {
                        cardEl.classList.add('selected-card');
                    }
                    if(!_tradState.autoMode) {
                        cardEl.onclick = () => _onTradCardClick(card.id);
                    }
                }
                stackEl.appendChild(cardEl);
            });
        }
        grid.appendChild(stackEl);
    });
}

function _countVisibleMonthPairs(stacks) {
    const visible = [].concat.apply([], stacks).filter(c => c.status === 'visible');
    const freq = {};
    visible.forEach((c) => {
        freq[c.month] = (freq[c.month] || 0) + 1;
    });
    let pairs = 0;
    Object.keys(freq).forEach((m) => {
        pairs += Math.floor(freq[m] / 2);
    });
    return pairs;
}

function _getTradVisibleCards() {
    if(!_tradState) return [];
    return [].concat.apply([], _tradState.stacks).filter(c => c.status === 'visible');
}

function _findVisibleMonthPair(visibleCards) {
    const monthMap = {};
    for (let i = 0; i < visibleCards.length; i++) {
        const card = visibleCards[i];
        if (monthMap[card.month]) {
            return [monthMap[card.month], card];
        }
        monthMap[card.month] = card;
    }
    return null;
}

function _runAutoTraditionalFlow() {
    if(!_tradState) return;

    const step = function() {
        if(!_tradState) return;

        if(_tradState.stopRequested) {
            _showTradResult();
            return;
        }

        if(_tradState.removedCount >= 48) {
            document.getElementById('tradSelectionHint').textContent = '🎊 전패 정리 완료! 대길 흐름으로 마무리하오.';
            _renderTradBoard();
            setTimeout(_showTradResult, 420);
            return;
        }

        const visible = _getTradVisibleCards();
        const pair = _findVisibleMonthPair(visible);

        if(!pair) {
            document.getElementById('tradSelectionHint').textContent = '더 이상 맞는 월이 없어 여기서 흐름이 멈췄소.';
            _renderTradBoard();
            setTimeout(_showTradResult, 350);
            return;
        }

        const first = pair[0];
        const second = pair[1];

        _tradState.selected = first.id;
        document.getElementById('tradSelectionHint').textContent = `${first.month}월 기운 포착... 짝을 확인 중.`;
        _renderTradBoard();

        setTimeout(() => {
            if(!_tradState) return;
            _tradState.selected = second.id;
            _renderTradBoard();
            playClackSound(220);

            setTimeout(() => {
                if(!_tradState) return;
                first.status = 'removed';
                second.status = 'removed';
                _tradState.removedCount += 2;
                _tradState.selected = null;
                document.getElementById('tradSelectionHint').textContent = `✨ ${first.month}월 짝 제거 (+2장)`;
                _autoFlip();
                _renderTradBoard();
                setTimeout(step, 230);
            }, 170);
        }, 170);
    };

    step();
}

function _onTradCardClick(cardId) {
    if(!_tradState) return;
    const allCards = [].concat.apply([], _tradState.stacks);
    const card = allCards.find(c => c.id === cardId);
    if(!card || card.status !== 'visible') return;

    playClackSound(220);

    if(_tradState.selected === null) {
        // 첫 번째 선택
        _tradState.selected = cardId;
        document.getElementById('tradSelectionHint').textContent = card.label + ' 선택! 같은 월의 패를 하나 더 고르쇼.';
        _renderTradBoard();
    } else if(_tradState.selected === cardId) {
        // 선택 취소
        _tradState.selected = null;
        document.getElementById('tradSelectionHint').textContent = '';
        _renderTradBoard();
    } else {
        // 두 번째 선택 → 매칭 체크
        const prevCard = allCards.find(c => c.id === _tradState.selected);
        if(prevCard.month === card.month) {
            // 매칭!
            prevCard.status = 'removed';
            card.status = 'removed';
            _tradState.removedCount += 2;
            _tradState.selected = null;
            document.getElementById('tradSelectionHint').textContent = '✨ 맞췄소! +2장 제거';

            // 플래시 효과 후 Auto-Flip
            setTimeout(() => {
                _autoFlip();
                _renderTradBoard();
                // 클리어 체크
                if(_tradState.removedCount >= 48) {
                    setTimeout(_showTradResult, 500);
                } else {
                    document.getElementById('tradSelectionHint').textContent = '같은 월의 패를 맞춰 모두 제거하시오!';
                }
            }, 420);
        } else {
            // 불일치
            playClackSound(80);
            document.getElementById('tradSelectionHint').textContent = '월이 다르오. 다시 맞춰보쇼.';
            _tradState.selected = cardId; // 새 카드로 교체 선택
            _renderTradBoard();
        }
    }
}

// Auto-Flip: 카드 제거 후 각 스택 최상단을 visible로
function _autoFlip() {
    _tradState.stacks.forEach(stack => {
        const alive = stack.filter(c => c.status !== 'removed');
        if(alive.length > 0) {
            // 최상단 = order가 가장 높은 살아있는 카드
            const top = alive[alive.length - 1];
            if(top.status === 'hidden') top.status = 'visible';
        }
    });
}

window.endTraditionalGame = function() {
    if(!_tradState) return;
    _tradState.stopRequested = true;
    _showTradResult();
};

// ═══════════════════════════════════════════════════════════════
//  풍성한 결과 서술 시스템
// ═══════════════════════════════════════════════════════════════

// 남은 카드 중 가장 많이 남은 월 찾기
function _calcDominantMonths(stacks) {
    const freq = {};
    [].concat.apply([], stacks).forEach(c => {
        if(c.status !== 'removed') freq[c.month] = (freq[c.month]||0)+1;
    });
    // 동률일 때는 고정 월순(1~12)으로 굳지 않도록 무작위 tie-break
    const sorted = Object.entries(freq).sort((a,b)=> {
        const diff = b[1] - a[1];
        if (diff !== 0) return diff;
        return Math.random() < 0.5 ? -1 : 1;
    });
    return sorted.map(([month, count]) => ({ month: parseInt(month), count }));
}

// 제거된 카드로 '운의 흐름' 계산
function _calcRemovedPattern(stacks) {
    const removed = [].concat.apply([], stacks).filter(c=>c.status==='removed');
    const removedMonths = [...new Set(removed.map(c=>c.month))];
    const hasKwang = removed.some(c=>c.type==='kwang');
    const hasYul   = removed.some(c=>c.type==='yul');
    return { removedMonths, hasKwang, hasYul, total: removed.length };
}

const TRAD_RESULT_TEXTS = {
    DAEGIL: {
        title: '🎊 대길(大吉) — 완전 운수 떼기!',
        char: 'goni',
        wealth:  `<p>패를 전부 떼었소! 이런 운은 백 번에 한 번 나올까 말까 한 기회요. 오늘의 재물 흐름은 거칠 것이 없다. 묵혀 두었던 투자나 사업 제안을 과감히 꺼내도 좋은 타이밍이며, 예상치 못한 곳에서 목돈이 들어oui 것이다. 황금빛 기운이 사방에서 모여들고 있소.</p>
                  <p>하지만 욕심을 부려 한 번에 전부 가져가려 하면 패가 뒤집히는 법. 크게 벌되 씀씀이도 크게 하라.</p>`,
        love:    `<p>완전한 인연의 조화! 48장의 패가 모두 맞아 떨어졌다는 것은 당신의 감정선과 상대의 마음이 완벽히 공명하고 있음을 뜻한다. 고백, 프러포즈, 화해 어느 것이든 오늘 건네는 말은 상대의 심장에 정확히 꽂힐 것이오.</p>
                  <p>인연이 없다 여겼던 사람도 오늘 우연한 마주침 하나로 전부 바뀔 수 있다. 눈을 크게 뜨고 주변을 살피쇼.</p>`,
        success: `<p>천하무적의 합격·취업 기운! 패를 전부 걷어냈다는 것은 막혀 있던 길이 일시에 뚫리는 대통(大通)의 상징이오. 면접관의 마음도, 채점관의 손도 당신의 손을 들어주게 되어 있다.</p>
                  <p>오늘 결과를 기다리고 있다면 좋은 소식을 기대하라. 준비 중이라면 이 기운을 만학의 발판으로 삼아라.</p>`,
        health:  `<p>회복과 생기가 동시에 붙는 대길이오. 몸의 막힌 기운이 풀리며 컨디션의 바닥을 찍고 반등하는 흐름이 강하다. 생활 루틴을 바로잡기 딱 좋은 날이다.</p>
                  <p>오늘 시작한 습관은 오래 간다. 수면, 식사, 가벼운 운동을 정교하게 잡아두면 다음 달까지 체력이 받쳐줄 것이오.</p>`,
        family:  `<p>집안의 기운이 한 상에 모인 대길이오. 그동안 말 못했던 속마음도 부딪힘 없이 전달될 수 있는 rare한 타이밍이다.</p>
                  <p>가족과의 약속, 방문, 식사 자리를 오늘 잡으쇼. 작은 배려 하나가 오래 묵은 오해를 풀어준다.</p>`,
        travel:  `<p>길운이 활짝 열린 대길이오. 이동 중 귀인을 만나거나, 일정이 예상보다 매끄럽게 풀리는 흐름이 강하다.</p>
                  <p>출장·여행·이사 같은 큰 이동도 오늘은 순풍을 받는다. 다만 들뜬 마음만 눌러두면 수확이 더 커진다.</p>`
    },
    GOOD: {
        title: '✨ 길(吉) — 운이 따르는 날',
        char: 'madam',
        wealth:  '{dominant} 기운이 강하게 남아 있어오. {keywords}의 흐름이 재물운을 견인하고 있소. 큰 투자보다는 꾸준한 수익에 집중하라. {lucky}을 몸에 지니면 금전 기운을 더욱 끌어당길 수 있다.',
        love:    '{dominant} 기운이 애정선을 밝히고 있소. {keywords} 속에서 진심이 통하는 시간이 찾아올 것이다. {lucky}이 당신의 매력을 배가시켜 줄 것이오.',
        success: '{dominant}의 기운이 성취를 향해 밀어주고 있소. {keywords}를 믿고 정공법으로 임하면 좋은 결과가 따라올 것이다. {lucky}을 책상 위에 놓아 보쇼.',
        health:  '{dominant} 기운이 몸의 균형을 받쳐주고 있소. {keywords}의 흐름을 따라 회복 루틴을 지키면 컨디션이 안정된다. {lucky} 계열이 기운 정리에 도움 된다.',
        family:  '{dominant} 기운이 집안 화합을 밀어주고 있소. {keywords}이 대화의 물꼬를 터준다. {lucky} 계열 소품을 집안에 두면 관계 온도가 올라간다.',
        travel:  '{dominant} 기운이 이동수를 부드럽게 연결하오. {keywords}의 흐름이라 짧은 이동도 성과가 있다. {lucky}을 지니면 동선이 한결 매끄럽다.'
    },
    MIDDLE: {
        title: '🌀 평범(平) — 순리대로',
        char: 'master',
        wealth:  `남은 패 중 {blockMonth}의 기운이 장벽으로 작용하고 있소. 서두르지 말고 때를 기다리쇼. 지금 가진 것을 지키는 것이 최선의 재물 전략이오.`,
        love:    `남은 패 중 {blockMonth}의 기운이 관계를 늦추고 있소. 강물은 바위를 피해 흘러가는 법. 억지로 밀어붙이지 말고 상대에게 공간을 내어 주쇼.`,
        success: `남은 패 중 {blockMonth}의 기운이 당신의 전진을 잠시 멈추게 하고 있소. 실력을 더 갈고 닦을 기간이니 조급함을 내려놓쇼.`,
        health:  `남은 패 중 {blockMonth}의 기운이 몸의 흐름을 더디게 만들고 있소. 무리하지 말고 수면과 식사 리듬을 먼저 바로잡쇼.`,
        family:  `남은 패 중 {blockMonth}의 기운이 집안 대화를 무겁게 만들고 있소. 결론을 서두르지 말고 시간을 두고 풀어가시오.`,
        travel:  `남은 패 중 {blockMonth}의 기운이 이동을 지연시키고 있소. 오늘은 여유 동선으로 움직여야 실수가 줄어든다.`
    },
    BAD: {
        title: '⚠️ 흉(凶) — 조심이 상책',
        char: 'agui',
        wealth:  `패가 잘 맞지 않았소. {blockMonth} 기운이 재물의 흐름을 막고 있다. 오늘은 큰돈이 오가는 결정을 피하고, 남에게 보증이나 대출을 서지 마시오. 손실이 생기더라도 판을 더 키우려 하지 말 것.`,
        love:    `패가 맞서 있소. {blockMonth} 기운이 오해와 엇갈림을 만들고 있다. 지금 전하는 고백이나 연락은 역효과를 낼 수 있으니 타이밍을 재쇼. 분노를 삼키고 일단 하루를 쉬어가라.`,
        success: `패가 꼬여 있소. {blockMonth} 기운이 발목을 잡고 있다. 무리한 도전보다 현재 위치를 지키는 것이 현명하오. 서류 제출이나 결정 일정을 잠시 미루는 것도 방법이오.`,
        health:  `패가 싸늘하오. {blockMonth} 기운이 체력과 회복을 막고 있다. 과로·과음·야식 루틴은 오늘 끊어야 한다. 몸을 아끼는 게 이기는 판이오.`,
        family:  `패가 거칠게 섞였소. {blockMonth} 기운이 가족 사이 감정 충돌을 키운다. 오늘은 충고보다 공감을 먼저 내놓아야 판이 덜 상한다.`,
        travel:  `길이 꼬였소. {blockMonth} 기운이 지연과 분실수를 부른다. 급한 이동은 피하고, 예약·시간·소지품 점검을 두 번 하시오.`
    }
};

// 결과 타입 판별
function _judgeResultType(removedCount) {
    if(removedCount >= 48) return 'DAEGIL';
    if(removedCount >= 18) return 'GOOD';
    if(removedCount >= 8) return 'MIDDLE';
    return 'BAD';
}

// 풍성한 결과 HTML 생성
function _buildTradResultHTML(resultType, dominant, blocked, pattern, category) {
    const tmpl = TRAD_RESULT_TEXTS[resultType];
    const char = TAZZA_SYSTEM.CHARACTERS[tmpl.char];
    const cat = category || 'wealth';

    let narrative = '';

    // DAEGIL은 완성된 텍스트, 나머지는 템플릿 치환
    if(resultType === 'DAEGIL') {
        narrative = tmpl[cat] || tmpl.wealth;
    } else {
        const dominantSym = MONTH_SYMBOLS[dominant.month];
        const blockSym    = blocked ? MONTH_SYMBOLS[blocked.month] : null;
        narrative = (tmpl[cat] || tmpl.wealth)
            .replace('{dominant}',   `<span class="trad-result-badge badge-month">${dominantSym.name}</span>`)
            .replace('{keywords}',   dominantSym.keywords.map(k=>`<span class="trad-result-badge badge-good">${k}</span>`).join(''))
            .replace('{lucky}',      `<span class="trad-result-badge badge-month">${dominantSym.lucky}</span>`)
            .replace('{blockMonth}', blockSym ? `<span class="trad-result-badge badge-bad">${blockSym.name}</span>` : '미상');
    }

    // ① 캐릭터 코멘트
    const charHTML = `
        <div class="trad-char-box">
            <img src="${char.image}" alt="${char.name}">
            <div style="flex:1;">
                <div style="color:#94a3b8;font-size:0.85rem;margin-bottom:4px;">${char.name}의 한 마디</div>
                <div style="color:#facc15;font-weight:bold;font-style:italic;line-height:1.5;">${char.catchphrase}</div>
            </div>
        </div>`;

    // ② 제거 통계 요약
    const totalPct = Math.round((pattern.total / 48) * 100);
    const statsHTML = `
        <div class="trad-section">
            <div class="trad-section-title">📊 운의 흐름 분석</div>
            <div style="margin-bottom:8px;color:#cbd5e1;font-size:0.9rem;">
                총 <strong style="color:#4ade80;">${pattern.total}장</strong> 제거 
                (<strong style="color:#d4af37;">${totalPct}%</strong> 완성)
                ${pattern.hasKwang ? ' · <span style="color:#fbbf24">광(光) 제거 ✓</span>' : ''}
                ${pattern.hasYul   ? ' · <span style="color:#a78bfa">열끗 제거 ✓</span>' : ''}
            </div>
        </div>`;

    const autoSummaryHTML = `
        <div class="trad-section">
            <div class="trad-section-title">🤖 자동 운수 떼기 진행 요약</div>
            <div style="color:#cbd5e1;font-size:0.9rem;line-height:1.7;">
                이번 판은 시스템이 월 짝을 자동 선택해 끝까지 진행했습니다.
                총 <strong style="color:#4ade80;">${Math.floor(pattern.total / 2)}회</strong> 짝 제거가 이루어졌고,
                ${resultType === 'DAEGIL' ? '막힘 없이 완주한 대길 흐름으로 마감했습니다.' : '남은 월 기운에서 현재 막힌 흐름을 확인했습니다.'}
            </div>
        </div>`;

    // ③ 주도 월 심볼 해석
    let monthSectionHTML = '';
    if(resultType !== 'DAEGIL' && dominant) {
        const sym = MONTH_SYMBOLS[dominant.month];
        monthSectionHTML = `
            <div class="trad-section">
                <div class="trad-section-title">🌸 핵심 운의 기운: ${sym.name}</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                    ${sym.keywords.map(k=>`<span class="trad-result-badge badge-good">${k}</span>`).join('')}
                    <span class="trad-result-badge badge-month">행운색 ${sym.lucky}</span>
                    <span class="trad-result-badge badge-month">영물 ${sym.animal}</span>
                </div>
            </div>`;
    }

    // ④ 남은 패 장애 분석
    let blockedHTML = '';
    if(blocked && resultType !== 'DAEGIL') {
        const sym = MONTH_SYMBOLS[blocked.month];
        blockedHTML = `
            <div class="trad-section">
                <div class="trad-section-title">🔴 막힌 기운: ${sym.name} (${blocked.count}장 잔류)</div>
                <div style="color:#fca5a5;font-size:0.9rem;line-height:1.6;">
                    ${sym.name}의 기운이 완전히 흩어지지 못했다. 
                    <br>${sym.keywords.join(', ')} 방면에서 미완성의 과제가 남아 있으니 서두르지 마시오.
                    ${sym.animal}이 나타나는 꿈을 꾸거나 ${sym.lucky} 색이 눈에 띄면 조심하시오.
                </div>
            </div>`;
    }

    // ⑤ 본문 서술
    const narrativeHTML = `
        <div class="trad-section">
            <div class="trad-section-title">📜 타짜의 풀이</div>
            <div style="color:#e5e7eb;font-size:1rem;line-height:1.8;">${narrative}</div>
        </div>`;

    // ⑥ 오늘의 행동 지침
    const actionMap = {
        DAEGIL: ['지금 바로 행동에 옮기시오', '주변에 기쁜 소식을 알리쇼', '감사의 마음을 전하쇼'],
        GOOD:   ['작은 행운도 놓치지 마쇼',  '인연에게 먼저 손을 내밀쇼', '계획을 구체화할 때요'],
        MIDDLE: ['지금은 때를 기다리쇼',     '주변 정리와 준비에 집중하쇼', '과욕을 부리지 마쇼'],
        BAD:    ['결단을 미루쇼',           '계약·서명 류는 피하쇼',      '몸을 낮추고 실력을 쌓쇼']
    };
    const actions = actionMap[resultType];
    const actionHTML = `
        <div class="trad-section">
            <div class="trad-section-title">🎯 오늘의 행동 지침</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${actions.map((a,i)=>`<div style="display:flex;align-items:center;gap:8px;color:#cbd5e1;font-size:0.9rem;"><span style="color:#d4af37;font-weight:bold;">${i+1}.</span>${a}</div>`).join('')}
            </div>
        </div>`;

    const methodHTML = `
        <div class="trad-section">
            <div class="trad-section-title">🧭 정통 화투점 해석 기준</div>
            <div style="color:#cbd5e1;font-size:0.9rem;line-height:1.7;">
                본 결과는 <strong style="color:#facc15;">정통 운수 떼기</strong> 규칙으로 산출했습니다.
                제거된 패 비율, 광/열끗 포함 여부, 마지막까지 남은 월 기운을 함께 읽어 길흉을 판단합니다.
                즉, 단일 카드가 아닌 <strong style="color:#facc15;">전체 판의 흐름</strong>을 기준으로 풀이한 결과입니다.
            </div>
        </div>`;

    return charHTML + autoSummaryHTML + statsHTML + monthSectionHTML + blockedHTML + narrativeHTML + actionHTML + methodHTML;
}

function _showTradResult() {
    if(!_tradState) return;
    const { stacks, removedCount, category } = _tradState;

    const resultType = _judgeResultType(removedCount);
    const dominantList = _calcDominantMonths(stacks);
    const pattern      = _calcRemovedPattern(stacks);

    const dominant = dominantList[0] || null;
    // 막힌 기운: 남은 카드가 가장 많은 달 (단, 전부 제거된 경우 null)
    const blocked  = resultType !== 'DAEGIL' ? (dominantList[0] || null) : null;

    const tmpl = TRAD_RESULT_TEXTS[resultType];
    document.getElementById('tradResultTitle').textContent = tmpl.title;
    document.getElementById('tradResultContent').innerHTML = _buildTradResultHTML(resultType, dominant, blocked, pattern, category);

    document.getElementById('tradGameBoard').style.display = 'none';
    document.getElementById('tradResultBox').style.display = 'block';

    // 완료 사운드
    playClackSound(300);
    setTimeout(()=>playClackSound(400), 150);
    setTimeout(()=>playClackSound(500), 300);

    _tradState = null;
}




