import YeongnyangiFaqToon from '../../../app/yeongnyangi/_components/YeongnyangiFaqToon';
import '../../../app/yeongnyangi/night-tokens.css';
import {NEW_PURCHASES_AVAILABLE} from './release';
import {Button} from './Button';

const questions=[
 {question:'어떤 상담을 고르면 좋을까요?',answer:'한 가지 고민이 마음에 걸리면 달빛 점술방의 ‘내 고민 상담하기’에서 시작해요. 사주나 타로처럼 익숙한 방식이 있다면 그 방식을 먼저 고를 수 있어요.'},
 {question:'상담을 새로 구매할 수 있나요?',answer:NEW_PURCHASES_AVAILABLE?'상담을 고른 뒤 토스 결제창에서 상품과 금액을 확인해 주세요.':'지금은 새 상담 판매를 준비 중이에요. 이미 구매한 상담은 구매할 때 쓴 토스 계정으로 다시 열 수 있어요.'},
 {question:'출생 정보를 다시 입력해야 하나요?',answer:'같은 계정에 저장한 프로필을 고르면 돼요. 두 사람을 살펴보는 상담에서는 각자의 정보를 차례로 확인해 주세요.'},
 {question:'지난번에 받은 글은 어디에 있나요?',answer:'영냥이와 나눈 상담은 영냥이 보관함에 있어요. 연이와 네오의 상담은 꿀꿀운세 구매 기록에서 확인해 주세요. 완성된 글을 다시 읽을 때는 추가 결제가 없어요.'},
 {question:'결제한 결과가 보이지 않아요.',answer:'먼저 구매할 때 쓴 계정인지 확인해 주세요. 구매 복구에서 주문을 확인한 뒤에도 결과가 보이지 않으면 주문 내역을 준비해 고객지원에 문의해 주세요.'},
];

export default function YeongnyangiFaq(){
 return <section className="toss-cat-faq" data-yn-night aria-labelledby="toss-cat-faq-title">
  <h1 id="toss-cat-faq-title">상담 전 자주 묻는 질문</h1>
  <YeongnyangiFaqToon items={questions}/>
  <Button display="block" onClick={()=>location.assign('/yeongnyangi/library/')}>영냥이 보관함 보기</Button>
  <Button display="block" variant="weak" onClick={()=>location.assign('/?world=yeongnyangi')}>달빛 점술방으로</Button>
 </section>;
}
