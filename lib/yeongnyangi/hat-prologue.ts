import type {HatHouseId} from './hat-houses';

export const hatPrologue = [
 {scene:'문 앞',speaker:'모자',text:'거기, 눈이 마주쳤군. 고양이 말고 이쪽이다. 그래, 모자가 말을 한다. 놀라는 표정은 꽤 오랜만이구나.'},
 {scene:'문 앞',speaker:'모자',text:'영냥이는 잠시 자리를 비웠다. 안내는 내가 하지. 수백 번의 달을 지켜본 모자에게 길 안내쯤이야… 흠, 문이 이쪽이었지.'},
 {scene:'모자 착용',speaker:'모자',text:'흠. 겉으론 태연한데 머릿속은 꽤 바쁘군. 걱정 마라. 머리 모양은 평가하지 않는다.'},
 {scene:'모자 착용',speaker:'모자',text:'조금 삐딱하게 앉아도 이해해라. 오래된 모자에게도 각도라는 게 있다. 자, 어깨의 힘은 내려놓고.'},
 {scene:'살펴보기',speaker:'모자',text:'여섯 문에 새겨진 문장이 보이느냐? 책, 망치, 나침반… 저마다 다른 빛을 품었지. 크기가 아니라 결을 보는 거다.'},
 {scene:'살펴보기',speaker:'모자',text:'서두르지 마라. 네가 빛나는 자리를 찾는 중이니. 시험은 없다. 모자를 쓰고 시험까지 보면 머리가 너무 무겁지 않겠느냐.'},
] as const;

/** Reviewed against each house's trait; only read after a valid server assignment. */
export const hatHouseDialogue:Record<HatHouseId,string> = {
 'moon-library':'한 가지 답에서 다음 질문을 찾아내는 탐구의 결이 보이는군. 책이 너를 재우기는 어렵겠어. 오히려 책이 먼저 졸겠지.',
 'star-forge':'익숙한 것에서도 새 재미를 빚어내는 창작의 불씨로군. 공방에 빈 작업대를 마련해 두마. 아이디어가 먼저 입주할 것 같으니.',
 'dawn-tower':'지도 끝의 빈칸에 발자국을 남기는 개척의 결이로군. 문은 열어 두겠다. 잠깐, 출발 전에 간식은 챙겨라.',
 'gold-vault':'반짝이는 기회를 오래 쓸 기반으로 엮는 실리의 감각이로군. 금고 열쇠를 맡겨도 되겠어. 내 모자 수선비까지 장부에 쓰지는 말고.',
 'wind-gallery':'사람과 생각 사이에 길을 놓는 연결의 결이 보이는군. 편지가 모이는 회랑이 어울리겠어. 네 답장을 기다리는 자리도 비워 두마.',
 'star-greenhouse':'작은 변화를 살피고 오래 자라게 하는 돌봄의 결이로군. 온실에 네 찻잔도 준비해 두겠다. 남의 차만 따르다 네 차를 식히지는 말거라.',
};
