import type {HatHouseId} from './hat-houses';

export const hatPrologue = [
 {scene:'문 앞',speaker:'영냥이',text:'잠깐. 들어가기 전에 모자한테 인사부터 해. 성격이 좀… 아니, 취향이 확실하거든.'},
 {scene:'문 앞',speaker:'모자',text:'다 들린다, 고양이. 자, 들어오너라. 문 앞에서 예의 점수를 매기고 있지는 않으니.'},
 {scene:'모자 착용',speaker:'모자',text:'흠. 겉으론 태연한데 머릿속은 꽤 바쁘군. 걱정 마라. 머리 모양은 평가하지 않는다.'},
 {scene:'모자 착용',speaker:'영냥이',text:'그건 다행이네. 아까 거울 앞에서 챙을 세 번이나 고친 모자가 할 말은 아니지만.'},
 {scene:'살펴보기',speaker:'모자',text:'그건 위엄을 정돈한 거다. 자, 빨리 고르는 게 능사는 아니지. 네가 빛나는 자리를 찾는 중이니까.'},
 {scene:'살펴보기',speaker:'영냥이',text:'문이 여섯 개라고 여섯 번 시험 보는 건 아니야. 숨 한번 돌려. 여긴 잘 보이려고 애쓰지 않아도 돼.'},
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
