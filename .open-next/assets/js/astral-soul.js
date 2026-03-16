/* -----------------------------------------------------------
   ASTRAL SOUL ENGINE (Meta-Psychologist)
   ----------------------------------------------------------- */
const ASTRAL_DATA = {
    'INTJ': { animal:'🦉', name:'Owl', title:'지혜로운 부엉이', code:'INTJ', 
        desc:'전략적 통찰과 고독한 지성',
        layer1: '너는 고독한 탑 위에서 세상을 내려다보는 밤의 감시자다. 남들이 보지 못하는 어둠 속의 진실을 꿰뚫어 보며, 감정에 휩쓸리기보다는 차가운 이성으로 미래를 설계하지. 너의 침묵은 무관심이 아니라, 가장 효율적인 답을 찾기 위한 치열한 계산의 과정이야. 군더더기 없는 완벽함을 추구하는 너의 영혼은 고고하고 아름답다.',
        layer2: '너의 예리한 눈빛이 닿아야 할 곳은 [전략가, 시스템 설계자, 연구원]의 길이다. 복잡하게 얽힌 문제를 단칼에 정리하고, 무질서 속에서 패턴을 찾아내는 너의 능력은 혁명을 일으킬 잠재력을 품고 있어.',
        layer3: '너는 가벼운 만남을 경멸한다. 너의 지적 수준을 충족시키고, 깊은 침묵조차 편안하게 공유할 수 있는 [영혼의 동반자]를 원하지. 너의 차가운 껍질을 깨고 들어와 따뜻한 불씨를 지펴줄 사람이 필요해.' },
    
    'INTP': { animal:'🐈', name:'Cat', title:'호기심 많은 고양이', code:'INTP', 
        desc:'독립적인 사고와 논리적 탐구',
        layer1: '너는 누구에게도 구속받지 않는 자유로운 영혼이다. 세상의 모든 통념에 "왜?"라는 질문을 던지며, 너만의 논리적인 미로를 구축하는 것을 즐겨. 남들의 시선따윈 중요하지 않아. 너에게 중요한 건 오직 지적 호기심과 그것을 탐구할 자유뿐이지. 겉으론 무심해 보이지만 머릿속은 우주가 폭발하고 있어.',
        layer2: '너의 그 엉뚱하고 기발함은 [순수 학문, 프로그래밍, 철학]의 영역에서 빛을 발한다. 반복되는 일상보다는 끊임없이 새로운 개념을 창조하고 파괴할 수 있는 곳이 너의 놀이터야.',
        layer3: '너는 너만의 독립적인 공간을 존중해주는 [스마트한 파트너]에게 끌린다. 감정적인 구속보다는 흥미로운 대화 주제 하나가 너를 더 설레게 하지. 너의 기이한 취향까지 사랑해줄 사람이 필요해.' },

    'ENTJ': { animal:'🦁', name:'Lion', title:'카리스마 사자', code:'ENTJ', 
        desc:'단호한 결단과 압도적 리더십',
        layer1: '너는 태생적인 제왕이다. 무리의 가장 앞에서 길을 개척하고, 혼돈을 질서로 바꾸는 압도적인 에너지를 가졌어. 너의 포효는 망설이는 이들에게 방향을 제시하고, 너의 발걸음은 곧 역사가 된다. 효율성이 떨어지는 것을 참을 수 없어하며, 목표를 향해 질주하는 너의 모습은 경이롭기까지 해.',
        layer2: '너의 왕좌는 [CEO, 지휘관, 경영 컨설턴트]의 자리다. 거대한 조직을 움직이고, 불가능해 보이는 비전을 현실로 구현해내는 것. 그것만이 너의 야망을 채울 수 있어.',
        layer3: '너는 너만큼이나 강하고 도전적인 [성장형 파트너]를 원한다. 너의 뒤에서 내조하는 사람보다는, 옆에서 함께 세상을 정복할 수 있는 동등한 존재에게 강렬한 매력을 느끼지.' },

    'ENTP': { animal:'🦊', name:'Fox', title:'영리한 여우', code:'ENTP', 
        desc:'기발한 발상과 유연한 변칙',
        layer1: '너는 변화무쌍한 트릭스터다. 고정관념을 비웃으며 세상을 거꾸로 뒤집어 보는 것을 즐기지. 너의 언어는 날카로운 칼이자 매혹적인 악기 같아서, 사람들을 홀리고 당황하게 만들어. 지루함은 너의 가장 큰 적이며, 너는 언제나 새로운 자극과 논쟁을 찾아 들판을 뛰어다닌다.',
        layer2: '너의 재능은 [발명가, 변호사, 크리에이티브 디렉터]의 길에 있다. 정해진 매뉴얼을 따르는 것이 아니라, 없는 길을 만들어내고 판을 흔드는 역할이 너에게 딱이야.',
        layer3: '너는 [지적인 스파링 파트너]를 원한다. 너의 짓궂은 장난을 웃어넘기며, 논리적인 티키타카가 가능한 사람. 너를 지루하게 만들지 않는 것, 그것이 유일한 조건이야.' },

    'INFJ': { animal:'🦌', name:'Deer', title:'신비로운 사슴', code:'INFJ', 
        desc:'깊은 직관과 고결한 영혼',
        layer1: '너는 안개 낀 숲속을 거니는 영적 수호자다. 겉모습은 부드럽고 온화하지만, 내면에는 다이아몬드처럼 단단한 신념이 박혀 있어. 너는 타인의 고통을 너의 것처럼 느끼고, 보이지 않는 인연의 끈을 감지하는 능력이 있다. 세상의 소음에서 벗어나 너만의 성역을 지키려는 그 고결함이 네 매력이야.',
        layer2: '너의 치유력은 [상담가, 작가, 인권 운동가]가 되었을 때 세상을 구원한다. 사람들의 내면 깊은 곳을 어루만지고, 글로써 영혼을 울리는 일이 너의 소명이다.',
        layer3: '너는 [영혼의 공명]을 최우선으로 여긴다. 겉치레 섞인 칭찬보다는, 너의 복잡한 내면세계를 있는 그대로 이해하고 보듬어줄 수 있는 진실된 사람에게 마음을 연다.' },

    'INFP': { animal:'🐇', name:'Rabbit', title:'꿈꾸는 토끼', code:'INFP', 
        desc:'부드러운 감수성과 내면의 이상',
        layer1: '너는 이상한 나라를 여행하는 영원한 몽상가다. 세상이 정한 속도보다는 너만의 리듬으로 깡충이며, 현실보다는 네가 꿈꾸는 이상향이 더 선명하게 느껴질 거야. 너의 마음속 정원은 누구보다 아름답고 섬세해서, 작은 상처에도 쉽게 시들지만 사랑을 주면 금세 찬란하게 피어난다.',
        layer2: '너의 감성은 [예술가, 시인, 힐러]의 영역에서 꽃핀다. 논리와 효율보다는 아름다움과 진정성을 표현할 수 있는 일. 너의 꿈을 현실로 그리는 작업이 필요해.',
        layer3: '너는 너의 낭만을 비웃지 않는 [순수한 사랑]을 원한다. 너의 엉뚱한 상상에 맞장구 쳐주고, 너의 여린 마음을 유리 다루듯 아껴주는 사람에게 모든 것을 바친다.' },

    'ENFJ': { animal:'🐬', name:'Dolphin', title:'다정한 돌고래', code:'ENFJ', 
        desc:'조화로운 연결과 이타적 에너지',
        layer1: '너는 사람들의 마음을 잇는 푸른 바다의 가이드다. 주변의 분위기를 기민하게 감지하고, 어두운 곳에 빛을 비추는 타고난 리더십을 가졌어. 너의 에너지는 이타적이고 따뜻해서, 사람들은 본능적으로 네 주위에 모여든다. 모두가 행복해지는 세상을 위해 기꺼이 너 자신을 파도에 던지는 헌신적인 영혼이야.',
        layer2: '너의 영향력은 [교육자, 사회운동가, 멘토]의 자리에서 가장 강력하다. 누군가의 잠재력을 끌어내고 성장시키는 일, 사람을 통해 기적을 만들어내는 것이 너의 사명이다.',
        layer3: '너는 [감정의 교류]가 풍부한 관계를 지향한다. 너의 헌신을 당연하게 여기지 않고, 고맙다는 말 한마디를 다정하게 건넬 줄 아는 따뜻한 사람에게 정착한다.' },

    'ENFP': { animal:'🦦', name:'Otter', title:'활기찬 수달', code:'ENFP', 
        desc:'멈추지 않는 열정과 창의적 유희',
        layer1: '너는 세상을 거대한 놀이터로 만드는 마법사다. 호기심 어린 눈으로 돌멩이 하나에서도 우주를 발견하고, 너의 웃음소리는 전염병처럼 번져 주변을 밝게 물들여. 계획 따윈 필요 없어. 너에게 중요한 건 지금 이 순간 가슴이 뛰느냐는 것뿐이야. 얽매이지 않는 자유로운 영혼, 그 자체지.',
        layer2: '너의 무대는 [유튜버, 여행 작가, 아이디어 뱅크]다. 매일매일이 새롭고, 너의 톡톡 튀는 아이디어를 맘껏 발산할 수 있는 자유로운 환경이 너를 숨 쉬게 한다.',
        layer3: '너는 너의 [모험]에 기꺼이 동참해줄 파트너를 원한다. "안 돼"라고 말하기보다 "재밌겠다!"라고 외쳐주는 사람. 너의 텐션을 감당할 수 있는 에너자이저가 필요해.' },

    'ISTJ': { animal:'🐢', name:'Turtle', title:'성실한 거북이', code:'ISTJ', 
        desc:'흔들리지 않는 원칙과 책임감',
        layer1: '너는 시간이 흘러도 풍화되지 않는 단단한 바위다. 세상이 요란하게 변해도 너는 묵묵히 너만의 원칙과 질서를 지키며 걸어가지. 너의 약속은 보증수표와 같고, 너의 책임감은 태산보다 무겁다. 화려하지 않아도, 결국 결승선에 가장 먼저 도착해 깃발을 꽂는 것은 바로 너다.',
        layer2: '너의 성실함은 [회계사, 공무원, 관리자]의 직무에서 빛난다. 정확한 규칙과 체계가 있는 곳, 너의 꼼꼼함으로 빈틈을 메울 수 있는 조직이 너를 필요로 한다.',
        layer3: '너는 [신뢰할 수 있는 안정감]을 주는 사람을 원한다. 불같은 열정보다는 은은한 온기, 변덕스럽지 않고 한결같은 사람에게서 진정한 사랑을 느낀다.' },

    'ISFJ': { animal:'🐘', name:'Elephant', title:'온화한 코끼리', code:'ISFJ', 
        desc:'헌신적인 돌봄과 따뜻한 기억',
        layer1: '너는 무리를 지키는 든든하고 거대한 나무다. 묵직한 발걸음 속에 섬세한 배려가 숨어있고, 한 번 맺은 인연은 절대 잊지 않는 놀라운 기억력을 가졌어. 너는 자신의 편안함보다 타인의 평화를 먼저 생각하는 평화주의자야. 너의 등 뒤에 숨은 사람들은 세상에서 가장 안전한 안식처를 얻은 셈이지.',
        layer2: '너의 따뜻함은 [의료인, 교사, 복지사]의 길과 닿아있다. 누군가를 직접적으로 돕고 보살피는 일, 너의 손길로 세상이 조금 더 부드러워지는 곳이 너의 자리다.',
        layer3: '너는 소소한 일상을 함께할 [다정한 동반자]를 꿈꾼다. 거창한 이벤트가 아니라, 퇴근길에 네가 좋아하는 간식을 사 들고 오는 그 세심한 배려에 너는 감동한다.' },

    'ESTJ': { animal:'🐺', name:'Wolf', title:'엄격한 늑대', code:'ESTJ', 
        desc:'체계적인 질서와 집단의 규율',
        layer1: '너는 설원을 지배하는 냉철한 리더다. 사냥감(목표)을 포착하면 흐트러짐 없는 대형으로 가장 효율적으로 그것을 쟁취해내지. 감정에 휘둘려 일을 그르치는 것을 용납하지 않으며, 전통과 규칙을 수호하는 문지기 역할을 자처한다. 너의 울타리 안에 있는 내 식구만큼은 목숨을 걸고 챙기는 의리파이기도 해.',
        layer2: '너는 [감독관, 프로젝트 매니저, 판사]가 되어야 한다. 무질서한 곳에 기강을 잡고, 명확한 기준을 세워 조직을 이끄는 카리스마가 너의 무기다.',
        layer3: '너는 [예의 바르고 생활력 강한] 사람을 선호한다. 약속 시간을 어기거나 게으른 사람은 질색이야. 함께 미래를 계획하고 성실하게 탑을 쌓아 올릴 파트너를 원해.' },

    'ESFJ': { animal:'🐧', name:'Penguin', title:'사교적인 펭귄', code:'ESFJ', 
        desc:'공동체의 결속과 다정한 협력',
        layer1: '너는 추운 남극에서도 서로의 체온을 나누는 사랑의 전도사다. 혼자 있는 것보다는 함께의 가치를 알며, 주변 사람들을 챙기고 먹이는 것에서 기쁨을 느껴. 너의 인싸력은 단순히 노는 것을 넘어, 사람과 사람을 연결하는 접착제 역할을 하지. 네가 있는 모임은 언제나 웃음꽃이 피고 따뜻하다.',
        layer2: '너는 [서비스 기획자, 파티 플래너, 상담가]로서 최고다. 사람을 대하는 센스가 탁월하고, 타인의 필요를 본능적으로 캐치하는 너의 능력은 대체 불가능해.',
        layer3: '너는 [표현이 확실한] 사람에게 끌린다.  "좋아해", "고마워"라는 말을 아끼지 않고, 너의 정성에 리액션해주는 다정다감한 사람과 둥지를 틀고 싶어 한다.' },

    'ISTP': { animal:'🦅', name:'Hawk', title:'날카로운 매', code:'ISTP', 
        desc:'냉철한 관찰과 정교한 기술',
        layer1: '너는 하늘 높이 날아올라 사냥감을 노리는 고독한 헌터다. 불필요한 날갯짓은 하지 않아. 상황을 냉정하게 관찰하다가 기회가 오면 누구보다 빠르고 정확하게 낚아채지. 도구를 다루는 데 천부적인 재능이 있고, 복잡한 문제도 너의 손을 거치면 심플하게 해결된다. 쿨내 진동하는 너의 매력은 치명적이야.',
        layer2: '너의 손기술은 [엔지니어, 파일럿, 외과의사]의 영역에서 신의 경지에 이른다. 말보다는 기술로 증명하며, 긴박한 상황일수록 차분해지는 너의 담력은 타의 추종을 불허해.',
        layer3: '너는 [너의 영역을 침범하지 않는] 쿨한 관계를 원한다. 시시콜콜한 간섭이나 감정적인 징징거림은 질색이야. 각자의 취미를 즐기다가 필요할 때 뜨겁게 만나는 사이가 좋아.' },

    'ISFP': { animal:'🦋', name:'Butterfly', title:'예술적인 나비', code:'ISFP', 
        desc:'현재의 미학을 즐기는 자유로운 영혼',
        layer1: '너는 꽃과 꽃 사이를 춤추듯 날아다니는 살아있는 예술품이다. 규정된 틀에 갇히기보다는 바람이 이끄는 대로, 네 마음이 끌리는 대로 살고 싶어 해. 너의 감각은 섬세하게 튜닝된 악기 같아서, 색채, 소리, 분위기의 미묘한 변화를 온몸으로 느끼지. 존재 자체만으로 세상에 아름다움을 더하는 사람이야.',
        layer2: '너는 [디자이너, 뮤지션, 셰프]가 되어 세상을 꾸며야 한다. 너만의 독창적인 미적 감각을 자유롭게 표현할 수 있는 캔버스가 주어진다면 명작을 남길 거야.',
        layer3: '너는 [은근하게 다가오는] 사람에게 마음을 연다. 강요하거나 서두르는 사람은 부담스러워. 너의 침묵과 여백까지 사랑해주는 섬세한 사람과 영혼의 왈츠를 추고 싶어.' },

    'ESTP': { animal:'🐯', name:'Tiger', title:'용맹한 호랑이', code:'ESTP', 
        desc:'거침없는 실행과 야성적 본능',
        layer1: '너는 정글의 법칙을 지배하는 최상위 포식자다. 눈앞에 장애물이 있다면 돌아가는 대신 부수고 지나가면 그만이야. 스릴과 모험은 너의 아드레날린이고, 고민할 시간에 일단 저지르는 행동력이 너의 무기지. 너의 야성적인 매력과 유머 감각은 사람들을 홀리며, 언제나 사건의 중심에는 네가 있어.',
        layer2: '너는 [영업왕, 소방관, 전문 투자가]나 [운동선수]에 적합하다. 순발력과 배짱이 필요한 곳, 승부의 결과가 즉각적으로 나타나는 다이내믹한 현장이 너의 무대다.',
        layer3: '너는 [함께 즐길 줄 않는] 화끈한 파트너를 원한다. 지루한 데이트는 질색이야. 갑자기 여행을 떠나거나 익스트림 스포츠를 즐길 수 있는, 에너지가 넘치는 사람에게 꽂힌다.' },

    'ESFP': { animal:'🦚', name:'Peacock', title:'화려한 공작', code:'ESFP', 
        desc:'무대의 주인공, 빛나는 표현력',
        layer1: '너는 꼬리를 활짝 펴고 세상이라는 무대에 선 주인공이다. 사람들의 시선을 즐기며, 너의 끼와 매력을 발산할 때 가장 살아있음을 느껴. 인생은 즐거운 축제여야 한다고 믿는 너는, 주변 사람들에게 웃음과 엔돌핀을 나눠주는 분위기 메이커야. 너의 낙천적인 에너지는 우울함조차 춤추게 만들지.',
        layer2: '너는 [연예인, 유튜버, 이벤트 기획자]가 천직이다. 사람들과 어울리고, 너의 매력을 뽐내며 박수받을 수 있는 곳이라면 어디든 너의 왕국이 될 수 있어.',
        layer3: '너는 [이벤트가 가득한] 연애를 꿈꾼다. 너를 주인공으로 만들어주고, 매일매일 서프라이즈를 선물해주는 로맨틱 가이, 혹은 너의 개그 코드에 빵빵 터져주는 리액션 부자를 원해.' }
};

let selectedTotems = [];
let __mbtiBodyLocked = false;

const RITUAL_PHASE_TIMINGS = {
    init: 100,
    surge: 700,
    merge: 1500,
    burst: 2100,
    complete: 2500,
    finish: 3400
};

const RITUAL_PARTICLE_COLORS = ['#FFD700', '#FDB931', '#b44fff', '#fff', '#a0f0ff'];

function setTokenBorderColor(tokenEl, code) {
    tokenEl.style.borderColor = code ? getMbtiColor(code) : 'rgba(255,255,255,0.1)';
}

function setRitualButtonReady(btn) {
    btn.disabled = false;
    btn.innerHTML = '✨ 궁합 확인';
    btn.removeEventListener('click', revealAstralSynergy);
    btn.addEventListener('click', revealAstralSynergy);
    btn.style.background = 'linear-gradient(90deg, #D4AF37 0%, #FDB931 100%)';
    btn.style.color = '#000';
    btn.style.cursor = 'pointer';
    btn.style.opacity = '1';
}

function setRitualButtonPending(btn) {
    btn.disabled = true;
    btn.innerHTML = `${selectedTotems.length}/2 선택됨`;
    btn.removeEventListener('click', revealAstralSynergy);
    btn.style.background = 'rgba(255,255,255,0.1)';
    btn.style.color = 'rgba(255,255,255,0.3)';
    btn.style.cursor = 'not-allowed';
    btn.style.opacity = '0.7';
}

function getRitualElements() {
    return {
        stage: document.getElementById('astralRitualStage'),
        t1El: document.getElementById('ritualToken1'),
        t2El: document.getElementById('ritualToken2'),
        msg: document.getElementById('ritualMessage'),
        subMsg: document.getElementById('ritualSubMsg'),
        glow: document.getElementById('ritualBgGlow'),
        flash: document.getElementById('ritualFlash'),
        mirror: document.getElementById('soulMirror'),
        mirrorInner: document.getElementById('mirrorInner'),
        particles: document.getElementById('ritualParticles')
    };
}

function resetRitualTokens(t1El, t2El, a1, a2) {
    t1El.style.transition = 'none';
    t2El.style.transition = 'none';

    t1El.innerHTML = a1.animal;
    t1El.classList.add('ritual-token--left');
    t1El.classList.remove('ritual-token--right');
    t1El.style.left = '8%';
    t1El.style.top = '45%';
    t1El.style.opacity = '1';
    t1El.style.fontSize = '4.5rem';
    t1El.style.transform = 'translate(-50%,-50%)';

    t2El.innerHTML = a2.animal;
    t2El.classList.add('ritual-token--right');
    t2El.classList.remove('ritual-token--left');
    t2El.style.left = '92%';
    t2El.style.top = '45%';
    t2El.style.opacity = '1';
    t2El.style.fontSize = '4.5rem';
    t2El.style.transform = 'translate(-50%,-50%)';
}

function resetRitualVisualState(el) {
    el.msg.style.opacity = '0';
    el.msg.innerHTML = '';
    el.subMsg.style.opacity = '0';
    el.subMsg.innerHTML = '';
    el.flash.style.opacity = '0';
    el.mirror.classList.remove('explode');
    el.mirrorInner.classList.remove('active');
    el.glow.classList.remove('active');
    el.particles.innerHTML = '';
}

function setRitualMessage(msgEl, text, opacity) {
    msgEl.innerHTML = text;
    msgEl.style.opacity = opacity;
}

function phaseInit(el) {
    el.glow.classList.add('active');
    el.mirrorInner.classList.add('active');
    setRitualMessage(el.msg, '영혼을 소환하는 중...', '1');
}

function phaseSurge(el) {
    el.t1El.style.transition = 'all 0.8s cubic-bezier(0.55, 0, 1, 0.45)';
    el.t2El.style.transition = 'all 0.8s cubic-bezier(0.55, 0, 1, 0.45)';
    el.t1El.style.left = '35%';
    el.t1El.style.top = '38%';
    el.t1El.style.fontSize = '3rem';
    el.t2El.style.left = '65%';
    el.t2El.style.top = '38%';
    el.t2El.style.fontSize = '3rem';
    setRitualMessage(el.msg, '파동이 충돌한다...', '1');
}

function phaseMerge(el) {
    el.t1El.style.transition = 'all 0.6s ease-in';
    el.t2El.style.transition = 'all 0.6s ease-in';
    el.t1El.style.left = '50%';
    el.t1El.style.top = '40%';
    el.t1El.style.opacity = '0';
    el.t1El.style.transform = 'translate(-50%,-50%) scale(0.2)';
    el.t2El.style.left = '50%';
    el.t2El.style.top = '40%';
    el.t2El.style.opacity = '0';
    el.t2El.style.transform = 'translate(-50%,-50%) scale(0.2)';
    setRitualMessage(el.msg, '공명이 시작된다···', '1');
}

function createRitualParticle(index, count) {
    const p = document.createElement('div');
    p.className = 'ritual-particle';

    const size = Math.random() * 10 + 4;
    const angle = (index / count) * 360;
    const distance = 80 + Math.random() * 180;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance;
    const color = RITUAL_PARTICLE_COLORS[Math.floor(Math.random() * RITUAL_PARTICLE_COLORS.length)];

    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.background = color;
    p.style.boxShadow = `0 0 ${size * 2}px ${color}`;
    p.style.left = `calc(50% - ${size / 2}px)`;
    p.style.top = '38%';
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.animationDelay = `${Math.random() * 0.3}s`;
    p.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;

    return p;
}

function spawnRitualParticles(container, count) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        container.appendChild(createRitualParticle(i, count));
    }
    setTimeout(() => {
        container.innerHTML = '';
    }, 1500);
}

function phaseBurst(el) {
    el.mirror.classList.add('explode');
    el.msg.style.opacity = '0';

    el.flash.style.transition = 'opacity 0.15s';
    el.flash.style.opacity = '0.9';
    setTimeout(() => {
        el.flash.style.opacity = '0';
    }, 200);

    spawnRitualParticles(el.particles, 40);
}

function phaseComplete(el) {
    el.mirror.classList.remove('explode');
    setRitualMessage(el.msg, '✦ 공명 완료 ✦', '1');
    el.msg.style.color = '#fff';
    el.subMsg.innerHTML = '두 영혼의 궤적이 하나의 운명으로 수렴했다';
    el.subMsg.style.opacity = '1';
}

function runRitualTimeline(el) {
    setTimeout(() => phaseInit(el), RITUAL_PHASE_TIMINGS.init);
    setTimeout(() => phaseSurge(el), RITUAL_PHASE_TIMINGS.surge);
    setTimeout(() => phaseMerge(el), RITUAL_PHASE_TIMINGS.merge);
    setTimeout(() => phaseBurst(el), RITUAL_PHASE_TIMINGS.burst);
    setTimeout(() => phaseComplete(el), RITUAL_PHASE_TIMINGS.complete);
    setTimeout(() => {
        el.stage.style.display = 'none';
        showSynergyResult();
    }, RITUAL_PHASE_TIMINGS.finish);
}

function bindTotemCardEvents(card, code) {
    card.addEventListener('click', () => selectTotem(card, code));
    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectTotem(card, code);
        }
    });
    const infoBtn = card.querySelector('.totem-info-btn');
    if (infoBtn) {
        infoBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openMbtiDetail(code);
        });
    }
}

function bindMbtiDetailEvents(sheet, code, isSelected) {
    const closeBtn = sheet.querySelector('.mbti-sheet-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => sheet.remove());
    }

    const tabs = sheet.querySelectorAll('.mbti-sheet-tab');
    tabs.forEach((tab) => {
        const panelId = tab.getAttribute('data-panel');
        tab.addEventListener('click', () => switchMbtiTab(tab, panelId));
    });

    const selectBtn = sheet.querySelector('.mbti-select-btn');
    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            if (isSelected) {
                sheet.remove();
                return;
            }
            selectTotemFromDetail(code);
        });
    }
}

function __lockMbtiBody() {
    if (__mbtiBodyLocked) return;
    __mbtiBodyLocked = true;
}

function __unlockMbtiBody() {
    if (!__mbtiBodyLocked) return;
    __mbtiBodyLocked = false;
}

function openMbtiModal() {
    const modal = document.getElementById('astralModal');
    // 다른 모달/오류로 body가 fixed 상태로 남았을 때 스크롤 잠김 방지
    if (window._perf && typeof window._perf.unlockBody === 'function') {
        window._perf.unlockBody();
    }
    __lockMbtiBody();
    modal.style.display = 'block';
    modal.scrollTop = 0;
    
    // Build Grid
    const grid = document.getElementById('astralGrid');
    grid.innerHTML = '';
    
    Object.keys(ASTRAL_DATA).forEach(code => {
        const item = ASTRAL_DATA[code];
        const card = document.createElement('div');
                const temperament = code.includes('NF') ? 'nf'
                    : code.includes('NT') ? 'nt'
                    : code.includes('SJ') ? 'sj'
                    : 'sp';
                card.className = 'totem-card totem-card--' + temperament;
        card.setAttribute('data-code', code);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        
        // Card: tap to select, info-btn to view detail
        card.innerHTML = `
            <div class="totem-icon">${item.animal}</div>
                        <div class="totem-code">${item.code}</div>
                        <div class="totem-title">${item.title}</div>
                        <button class="totem-info-btn" type="button" title="상세보기" aria-label="${item.code} 상세 보기">
                            <span class="totem-info-glyph">✧</span>
                        </button>
        `;
        bindTotemCardEvents(card, code);
        grid.appendChild(card);
    });
    
    resetSelection();
    
    // Reset Ritual Stage if exists
    const ritualStage = document.getElementById('astralRitualStage');
    if(ritualStage) ritualStage.style.display = 'none';
    document.getElementById('astralGrid').style.display = 'grid';
    document.querySelector('.astral-header').style.display = 'block';
}

function closeMbtiModal() {
    const detail = document.getElementById('mbtiDetailSheet');
    if (detail) detail.remove();
    const resultLayer = document.getElementById('astralResult');
    if (resultLayer) resultLayer.style.display = 'none';
    document.getElementById('astralModal').style.display = 'none';
    __unlockMbtiBody();
}

function selectTotem(card, code) {
    if (selectedTotems.includes(code)) {
        selectedTotems = selectedTotems.filter(c => c !== code);
        card.classList.remove('selected');
    } else {
        if (selectedTotems.length < 2) {
            selectedTotems.push(code);
            card.classList.add('selected');
        } else {
            // Remove the first one
            const first = selectedTotems.shift();
            const firstCard = document.querySelector(`.totem-card[data-code="${first}"]`);
            if(firstCard) firstCard.classList.remove('selected');
            
            selectedTotems.push(code);
            card.classList.add('selected');
        }
    }
    
    updateRitualBar();
}

function updateRitualBar() {
    const bar = document.getElementById('astralRitualBar');
    const t1 = document.getElementById('token1');
    const t2 = document.getElementById('token2');
    const btn = bar.querySelector('.ritual-btn');
    
    // Show/Hide Bar Logic with Animation
    if (selectedTotems.length > 0) {
        bar.style.display = 'flex'; // Ensure visible
        // Force reflow for transition
        void bar.offsetWidth;
        bar.classList.add('active');
    } else {
        bar.classList.remove('active');
        // Wait for animation to finish before hiding (0.4s)
        setTimeout(() => {
            if (!bar.classList.contains('active')) {
                bar.style.display = 'none';
            }
        }, 400); 
    }

    // Update Token 1
    t1.className = 'mini-token ' + (selectedTotems[0] ? 'filled' : 'empty');
    if (selectedTotems[0]) {
        t1.innerHTML = ASTRAL_DATA[selectedTotems[0]].animal;
        setTokenBorderColor(t1, selectedTotems[0]);
    } else {
        t1.innerHTML = '';
        setTokenBorderColor(t1, '');
    }
    
    // Update Token 2
    t2.className = 'mini-token ' + (selectedTotems[1] ? 'filled' : 'empty');
    if (selectedTotems[1]) {
        t2.innerHTML = ASTRAL_DATA[selectedTotems[1]].animal;
        setTokenBorderColor(t2, selectedTotems[1]);
    } else {
        t2.innerHTML = '';
        setTokenBorderColor(t2, '');
    }
    
    // Update Button State
    if (selectedTotems.length === 2) {
        setRitualButtonReady(btn);
    } else {
        setRitualButtonPending(btn);
    }
}

function openMbtiDetail(code) {
    const item = ASTRAL_DATA[code];
    const container = document.getElementById('astralModal').querySelector('.astral-container');
    
    // Remove existing sheet if any
    const existing = document.getElementById('mbtiDetailSheet');
    if (existing) existing.remove();
    
    const isSelected = selectedTotems.includes(code);
    const sheet = document.createElement('div');
    sheet.id = 'mbtiDetailSheet';
    sheet.className = 'mbti-detail-sheet';
    sheet.innerHTML = `
        <div class="mbti-sheet-hero mbti-sheet-hero--aurora">
            <button class="mbti-sheet-close" type="button">←</button>
            <span class="mbti-sheet-icon">${item.animal}</span>
            <div class="mbti-sheet-code">${item.code}</div>
            <div class="mbti-sheet-title">${item.title}</div>
            <div class="mbti-sheet-desc">${item.desc}</div>
        </div>
        
        <div class="mbti-sheet-tabs">
            <div class="mbti-sheet-tab active" data-panel="soul">🧠 성격</div>
            <div class="mbti-sheet-tab" data-panel="path">🎯 진로</div>
            <div class="mbti-sheet-tab" data-panel="heart">💘 연애</div>
        </div>
        
        <div class="mbti-sheet-panel active" data-panel="soul">${item.layer1}</div>
        <div class="mbti-sheet-panel" data-panel="path">${item.layer2}</div>
        <div class="mbti-sheet-panel" data-panel="heart">${item.layer3}</div>
        
        <button class="mbti-select-btn${isSelected ? ' already' : ''}" type="button">
            ${isSelected ? '✓ 이미 선택됨 (닫기)' : '이 유형 선택하기'}
        </button>
    `;
    container.appendChild(sheet);
    bindMbtiDetailEvents(sheet, code, isSelected);
}

function switchMbtiTab(tabEl, panelId) {
    const sheet = document.getElementById('mbtiDetailSheet');
    if (!sheet) return;
    sheet.querySelectorAll('.mbti-sheet-tab').forEach(t => t.classList.remove('active'));
    sheet.querySelectorAll('.mbti-sheet-panel').forEach(p => p.classList.remove('active'));
    tabEl.classList.add('active');
    const panel = sheet.querySelector(`.mbti-sheet-panel[data-panel="${panelId}"]`);
    if (panel) panel.classList.add('active');
}

function selectTotemFromDetail(code) {
    // Select the totem programmatically
    const card = document.querySelector(`.totem-card[data-code="${code}"]`);
    if (card) selectTotem(card, code);
    document.getElementById('mbtiDetailSheet').remove();
}

function resetSelection() {
    selectedTotems = [];
    updateRitualBar();
    document.querySelectorAll('.totem-card').forEach(c => c.classList.remove('selected'));
    
    // UI Reset
    document.getElementById('astralGrid').style.display = 'grid';
    document.querySelector('.astral-header').style.display = 'block';
    document.getElementById('astralRitualStage').style.display = 'none';
    document.getElementById('astralResult').style.display = 'none';
}

function closeResultLayer() {
    const resLayer = document.getElementById('astralResult');
    resLayer.style.display = 'none';
}

function revealAstralSynergy() {
    if (selectedTotems.length !== 2) return;

    // Close detail sheet if open
    const ds = document.getElementById('mbtiDetailSheet');
    if (ds) ds.remove();

    // Hide grid and bar
    document.getElementById('astralGrid').style.display = 'none';
    const bar = document.getElementById('astralRitualBar');
    bar.classList.remove('active');
    setTimeout(() => { bar.style.display = 'none'; }, 400);
    document.querySelector('.astral-header').style.display = 'none';

    // Show Ritual Stage
    const ritual = getRitualElements();
    ritual.stage.style.display = 'flex';

    const a1 = ASTRAL_DATA[selectedTotems[0]];
    const a2 = ASTRAL_DATA[selectedTotems[1]];

    resetRitualTokens(ritual.t1El, ritual.t2El, a1, a2);
    resetRitualVisualState(ritual);
    runRitualTimeline(ritual);
}

function createNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
}

function createSynergyStatsBody(statsItems) {
    const root = createNode('div', 'synergy-stats');
    statsItems.forEach((item) => {
        const row = createNode('div', 'synergy-stat-row');
        const label = createNode('span', 'synergy-stat-label', item.label);
        const valueClass = item.highlight
            ? 'synergy-stat-value synergy-stat-value--match'
            : 'synergy-stat-value';
        const value = createNode('span', valueClass, item.value);
        row.appendChild(label);
        row.appendChild(value);
        root.appendChild(row);
    });
    return root;
}

function createSynergySection(kind, icon, title, bodyContent) {
    const section = createNode('div', `res-section-card res-section-card--${kind}`);

    if (kind === 'key') {
        const watermark = createNode('div', 'res-watermark', '🔑');
        watermark.setAttribute('aria-hidden', 'true');
        section.appendChild(watermark);
    }

    const head = createNode('div', 'res-section-head');
    head.appendChild(createNode('span', 'res-section-icon', icon));
    head.appendChild(createNode('span', '', title));
    section.appendChild(head);

    const body = createNode('div', 'res-section-body');
    if (typeof bodyContent === 'string') {
        body.innerHTML = bodyContent;
    } else if (bodyContent instanceof Node) {
        body.appendChild(bodyContent);
    }
    section.appendChild(body);

    return section;
}

function createSynergyResultHeader(c1, c2) {
    const header = createNode('header', 'res-header res-header--compact');
    const tokenRow = createNode('div', 'res-token-row');

    const col1 = createNode('div', 'res-token-col');
    col1.appendChild(createNode('div', 'res-token-animal', c1.animal));
    col1.appendChild(createNode('div', 'res-token-code', c1.code));

    const vs = createNode('div', 'res-token-vs', '⚔️');

    const col2 = createNode('div', 'res-token-col');
    col2.appendChild(createNode('div', 'res-token-animal', c2.animal));
    col2.appendChild(createNode('div', 'res-token-code', c2.code));

    tokenRow.appendChild(col1);
    tokenRow.appendChild(vs);
    tokenRow.appendChild(col2);
    header.appendChild(tokenRow);

    header.appendChild(createNode('h2', 'res-title res-title--bright', 'SOUL RESONANCE'));

    const mbtiBadge = createNode('div', 'res-mbti res-mbti--badge');
    mbtiBadge.appendChild(document.createTextNode(`${c1.title} `));
    mbtiBadge.appendChild(createNode('span', 'res-and', 'AND'));
    mbtiBadge.appendChild(document.createTextNode(` ${c2.title}`));
    header.appendChild(mbtiBadge);

    return header;
}

function createSynergyKeywordBox(title) {
    const box = createNode('div', 'synergy-box synergy-box--premium');
    box.appendChild(createNode('div', 'res-label res-label--center', 'CONNECTION KEYWORD'));
    box.appendChild(createNode('div', 'res-text res-text--keyword', `"${title}"`));
    return box;
}

function createSynergySectionGrid(synergy) {
    const grid = createNode('div', 'res-grid-stack');
    grid.appendChild(createSynergySection('stats', '📊', '역학 관계 스탯', createSynergyStatsBody(synergy.statsItems)));
    grid.appendChild(createSynergySection('light', '☀️', '빛의 공명 (시너지)', synergy.pros));
    grid.appendChild(createSynergySection('shadow', '🌑', '그림자 충돌 (갈등 요소)', synergy.cons));
    grid.appendChild(createSynergySection('key', '💡', '관계를 위한 마스터키', synergy.advice));
    return grid;
}

function showSynergyResult() {
    const c1 = ASTRAL_DATA[selectedTotems[0]];
    const c2 = ASTRAL_DATA[selectedTotems[1]];
    
    const resLayer = document.getElementById('astralResult');
    
    // Set Back Button to Home
    const backBtn = resLayer.querySelector('.back-btn');
    backBtn.removeEventListener('click', closeMbtiModal);
    backBtn.addEventListener('click', closeMbtiModal);
    backBtn.innerHTML = "🏠 메인화면";

    const resContent = document.getElementById('astralResultContent');
    const synergy = getSynergyText(c1, c2);

    resContent.replaceChildren();

    const fragment = document.createDocumentFragment();
    fragment.appendChild(createSynergyResultHeader(c1, c2));
    fragment.appendChild(createSynergyKeywordBox(synergy.title));
    fragment.appendChild(createSynergySectionGrid(synergy));

    const resetBtn = createNode('button', 'ritual-btn ritual-btn--reset', '↻ Realign Totems');
    resetBtn.type = 'button';
    fragment.appendChild(resetBtn);
    fragment.appendChild(createNode('div', 'res-spacer'));
    resContent.appendChild(fragment);

    if (resetBtn) {
        resetBtn.addEventListener('click', resetSelection);
    }
    
    resLayer.style.display = 'block';
}

function getMbtiColor(id) {
    if (id.includes('NF')) return '#A5D6A7'; 
    if (id.includes('NT')) return '#90CAF9'; 
    if (id.includes('SJ')) return '#B0BEC5'; 
    if (id.includes('SP')) return '#FFCC80'; 
    return '#8B5CF6';
}

function getSynergyText(t1, t2) {
    // Calculate difference vector
    let same = [];
    let diff = [];
    ['E/I','S/N','T/F','J/P'].forEach((type, idx) => {
        if(t1.code[idx] === t2.code[idx]) same.push(type);
        else diff.push(type);
    });

    let title, pros, cons, advice, statsItems;
    
    // Create Dynamic Stats
    const matchScore = Math.floor(Math.random() * (98 - 70 + 1)) + 70; // 70~98%
    const empathyScore = t1.code[2] === t2.code[2] ? '★★★★★' : '★★★☆☆';
    const actionScore = t1.code[3] === t2.code[3] ? '★★★★★' : '★★★☆☆';
    const convoScore = t1.code[1] === t2.code[1] ? '★★★★☆' : '★★☆☆☆';

    statsItems = [
        { label: '종합 상성률', value: `${matchScore}%`, highlight: true },
        { label: '감정/가치관 공명 (T/F)', value: empathyScore, highlight: false },
        { label: '행동/생활패턴 (J/P)', value: actionScore, highlight: false },
        { label: '대화/관심사 티키타카 (S/N)', value: convoScore, highlight: false }
    ];

    // Special Combinations (Best Matches)
    const isIdeal = (
        (t1.code === 'INTJ' && t2.code === 'ENFP') || (t1.code === 'ENFP' && t2.code === 'INTJ') ||
        (t1.code === 'INFJ' && t2.code === 'ENTP') || (t1.code === 'ENTP' && t2.code === 'INFJ') ||
        (t1.code === 'ISFJ' && t2.code === 'ESFP') || (t1.code === 'ESFP' && t2.code === 'ISFJ') ||
        (t1.code === 'ISTJ' && t2.code === 'ESTP') || (t1.code === 'ESTP' && t2.code === 'ISTJ')
    );

    const isConflict = (
        (t1.code.includes('ST') && t2.code.includes('NF')) || 
        (t1.code.includes('NF') && t2.code.includes('ST'))
    );

    if (t1.code === t2.code) {
        title = "완벽한 평행우주 도플갱어";
        pros = `둘 다 <b>${t1.code}</b> 성향으로 영혼의 기저 코드가 일치합니다. 눈빛만 봐도 상대의 생각, 좋아하는 것, 싫어하는 행동 패턴을 완벽히 읽어냅니다. 세상을 살아가는 방식이 똑같기 때문에 가장 편안한 안식처이자 세상 둘도 없는 아군이 됩니다. 취미나 데이트 코스를 고를 때 갈등이 제로에 가깝습니다.`;
        cons = `하지만 같은 약점을 공유한다는 것이 가장 큰 맹점입니다. 상대방의 단점이 곧 나의 단점이기에, 그 모습을 볼 때 스스로를 보는 것 같아 강렬한 거부감이나 짜증이 밀려올 수 있습니다. 또한 두 사람 모두 결정적인 순간에 같은 이유로 무너지거나 회피할 위험이 큽니다.`;
        advice = `우물 안 개구리가 되지 않도록 주의하세요! 둘만의 편안한 공간에 갇히기 쉬우니 의도적으로 전혀 다른 성향의 친구들을 무리에 끼우거나, 두 사람 모두 해보지 않았던 완전히 낯선 취미(여행, 운동 등)에 도전하며 관계에 신선한 자극을 계속 투여해야 합니다.`;
    } 
    else if (isIdeal) {
        title = "우주가 맺어준 마스터피스";
        pros = `MBTI 16가지 유형 중 가장 전설적인 조합으로 불립니다. 서로의 심리적 사각지대(Shadow)를 완벽하게 방어해줍니다. 나와 정반대인 듯 보이지만, 뿌리 깊은 가치관이 통하는 마법을 경험합니다. 한 사람은 기획하고 한 사람은 실행하는 등, 합쳐졌을 때 200%의 시너지가 폭발하는 운명적 관계입니다.`;
        cons = `초반의 강렬한 스파크가 꺼지고 나면 일상적인 생활 패턴의 다름에서 충돌이 시작됩니다. "나를 완벽히 이해해줄 줄 알았는데 왜 이렇게 행동하지?"라며 상대를 내 방식대로 통제하려 드는 순간 마법이 풀리며 큰 오해의 골이 파일 수 있습니다.`;
        advice = `상대방의 '다름'이 이 관계의 가장 큰 매력이자 무기였음을 절대 잊지 마세요. 갈등이 생기면 상대방을 '고치려' 들기보다는 "나한테 없는 능력으로 지금 상황을 어떻게 다르게 해석할까?"라는 호기심 어린 시선으로 접근해야 로맨스와 시너지가 영원합니다.`;
    }
    else if (same.includes('S/N') && diff.includes('J/P')) {
        title = "경이로운 지적 탐구의 동반자";
        pros = `세상에서 정보를 받아들이고 해석하는 렌즈(S/N)가 같아 대화가 마를 날이 없습니다. '척하면 착' 알아듣는 통찰력을 공유하죠. J형의 철저한 기획력과 방향성에 P형의 유연함과 임기응변이 합쳐져 환상의 티키타카와 문제 해결력을 발휘합니다. 함께 프로젝트를 하거나 여행을 갈 때 최고의 궁합을 자랑합니다.`;
        cons = `비슷한 가치관을 가졌기에 갈등이 없다가도, 행동 양식의 차이에서 폭발합니다. J는 P의 즉흥성을 '게으름과 무책임'으로 오해할 수 있고, P는 J의 계획성을 '잔소리와 숨 막히는 통제'로 여겨 답답함을 느낍니다.`;
        advice = `역벌 분담을 깔끔하게 나누세요. 큰 그림과 예약, 스케줄링은 J가 주도권을 잡고 맡되, 현장에서 발생하는 돌발 상황이나 추가적인 재미 요소(맛집 탐방, 즉석 코스 변경)는 P의 감각에 전적으로 맡기는 '선택적 권한 위임'이 필요합니다.`;
    }
    else if (isConflict) {
        title = "화성에서 온 T, 금성에서 온 F";
        pros = `이 조합은 완전히 다른 차원의 세계관이 충돌하는 스펙터클한 로맨스입니다. 내가 평생 보지 못했던 새로운 시각, 사고방식, 감정을 상대방을 통해 생생하게 체험하게 됩니다. 서로가 서로에게 최고의 스승이 되어주며, 이 다름을 견뎌낼 때 인간적으로 가장 폭발적인 내적 성장을 이뤄냅니다.`;
        cons = `사용하는 '모국어'가 아예 다른 수준입니다. 현실주의자(ST)와 이상주의자(NF)의 대화는 평행선을 달리기 일쑤며, 논리와 팩트(T) vs 감정과 공감(F)의 싸움은 매번 큰 내상을 남깁니다. 상대의 다름을 공격으로 받아들이기 매우 쉽습니다.`;
        advice = `서로의 언어를 의도적으로 번역하는 과정이 필요합니다. T는 F의 감정적 호소에 "그래서 어떻게 할까?"가 아니라 "그랬구나, 속상했겠다"라는 템플릿(리액션)을 의무적으로 사용하세요. 반대로 F는 T의 직언이 당신을 미워해서가 아니라 문제를 '해결'해주고 싶은 맹렬한 애정의 표현임을 머리로 이해해야 합니다.`;
    }
    else {
        title = "서로를 물들이는 다채로운 프리즘";
        pros = `적당한 공통분모가 주는 편안함과, 적당한 차이점이 주는 호기심이 환상적인 밸런스를 맞추고 있습니다. 마치 가장 친한 친구처럼 기대 쉴 수 있으면서도, 한 번씩 전혀 새로운 면모에 설렘을 느끼게 되는 훌륭한 롱런(Long-run) 보증수표입니다.`;
        cons = `치명적인 갈등이 없다는 것이 곧 단점이 되기도 합니다. 관계가 너무 안정적이다 보니 노력을 게을리하면 뜨뜻미지근한 룸메이트 같은 관계로 전락할 수 있습니다. 각자의 방식이 충돌할 때 깊이 파고들기보다 어물쩍 넘어가다 속병이 들기 쉽습니다.`;
        advice = `의식적으로 상대의 취미나 관심사 세계로 한 걸음 걸어 들어가 보는 연습을 하세요. 다름을 적당히 '방치'하는 것이 아니라, 적극적으로 '경험'해볼 때 서로의 프리즘이 겹쳐지며 훨씬 다채롭고 단단한 관계가 형성됩니다.`;
    }

    return { title, pros, cons, advice, statsItems };
}