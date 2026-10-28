import type {Metadata} from 'next';
import CareerStyleClient from './CareerStyleClient';
import {DISCLAIMER,DAY_COPY} from '@/lib/saju/career-style/copy.mjs';
import styles from './career.module.css';

const url='https://code-destiny.com/saju/career-style/';
export const metadata:Metadata={
 title:'사주로 찾는 나의 일 스타일 | 가입 후 무료 리포트 · 꿀꿀 운세',
 description:'내 프로필 카드로 일하는 성향과 월지의 환경을 살펴보세요. 여섯 업무 조건과 작은 진로 실험을 담은 무료 사주 자기이해 리포트. 결제·후기·공유 의무 없이 이용합니다.',
 alternates:{canonical:url},
 openGraph:{title:'사주로 찾는 나의 일 스타일',description:'연이와 함께 성향, 환경, 나에게 맞는 업무 조건을 탐색해요.',url,images:[{url:'/images/career-style/yeoni-work-style.webp',width:1536,height:1024,alt:'노트와 나침반을 펼치고 진로 탐색을 돕는 꽃돼지 연이'}]},
 twitter:{card:'summary_large_image',images:['/images/career-style/yeoni-work-style.webp']},
};
export default function CareerStylePage(){return <main className={styles.page}>
 <div className={styles.wrap}>
  <nav className={styles.top} aria-label="페이지 이동"><a href="/">꿀꿀 운세</a><a href="/saju/#services">사주 콘텐츠 모아보기</a></nav>
  <header className={styles.hero}>
   <img src="/images/career-style/yeoni-work-style.webp" width="1536" height="1024" alt="꽃돼지 연이가 노트와 나침반을 펼쳐 여러 갈래의 길을 함께 살펴봐요." fetchPriority="high"/>
   <div className={styles.heroCopy}><p>연이와 함께하는 진로 탐색</p><h1>사주로 찾는<br/>나의 일 스타일</h1><p>어떤 일을 할지 막막할 때,<br/>내가 편하게 힘을 쓰는 조건부터.</p><a className={styles.primary} href="#start">내 일 스타일 알아보기</a><span>가입 후 무료 · 결제와 후기 의무 없음</span></div>
  </header>
  <section className={styles.intro}><h2>직업 하나보다, 나에게 맞는 일의 방식</h2><p>진로를 고민하다 보면 직업 이름보다 먼저 막히는 질문이 있어요. 혼자 깊이 파고드는 일이 편한지, 사람들과 의견을 주고받을 때 아이디어가 살아나는지, 명확한 기준이 필요한지, 직접 방법을 정하고 싶은지. 같은 전공과 같은 직무 안에서도 일하는 경험은 이런 조건에 따라 달라질 수 있습니다.</p><p>이 리포트는 사주를 자기이해의 질문으로 바꾸는 콘텐츠입니다. ‘어떤 직업을 가져야 한다’는 답을 정해 주기보다, 내 방식과 주변의 요구가 만나는 지점을 살펴봅니다. 결과에 공감하는 부분뿐 아니라 맞지 않는 부분도 함께 기록해 보세요. 사주 해석보다 실제 경험을 우선하며, 내 선택을 넓히는 데 활용할 수 있습니다.</p><p className={styles.notice}>{DISCLAIMER}</p></section>
  <section className={styles.intro}><h2>성향과 환경을 함께 읽는 여덟 장</h2><p>일간은 나를 나타내는 기준, 십성은 일간과 다른 기운의 관계를 읽는 전통적인 언어입니다. 월지는 절기를 기준으로 정해지는 계절의 자리로, 환경의 요구를 생각해 보는 단서로 사용합니다. 실제 가정형편이나 성장 과정, 취업 경험을 알아낸 것처럼 설명하지 않습니다.</p><p>리포트에서는 성향과 작업 방식, 월지로 읽는 환경, 두 요소의 조합을 차례로 살펴봅니다. 이어 자율성·구조와 규칙·협업·몰입·변화 속도·성과 피드백이라는 여섯 업무 조건을 비교합니다. 강점을 쓰기 쉬운 조건과 보완하면 편해지는 조건을 함께 읽고, 탐색할 역할 세 가지와 일주일 안에 해볼 실험으로 연결합니다.</p><p>한 가지 요소만으로 유형을 결정하거나 단순 오행 개수로 적합도 점수를 만들지 않습니다. 기존 사주 엔진의 분석값을 확인하고, 단서가 엇갈리는 부분은 혼합형으로 남깁니다. 시각을 모르는 경우에도 확인 가능한 범위만 읽고, 확정할 수 없는 판단은 결과에 표시합니다.</p></section>
  <section className={styles.sample} aria-labelledby="example-title"><p>결과 예시 · 개인 분석 결과가 아닙니다</p><h2 id="example-title">{DAY_COPY['甲'][0]}</h2><blockquote>큰 방향을 먼저 세우는 방식이 익숙한지 돌아보세요. 방법을 선택할 여지가 있을 때와 명확한 절차가 있을 때, 어느 쪽에서 시작이 쉬웠는지 비교해 볼 수 있습니다.</blockquote><p>실제 리포트는 선택한 프로필의 일간·월지·십성 등 계산 근거를 함께 표시합니다. 예시의 유형이나 문장이 모든 사람에게 동일하게 적용되는 것은 아닙니다. 결과를 읽은 뒤에는 최근의 팀 과제, 동아리 활동, 아르바이트 같은 구체적인 경험과 비교해 보세요.</p></section>
  <CareerStyleClient/>
  <section className={styles.intro}><h2>시작 전에 알아두세요</h2><h3>진로 사주로 나에게 맞는 직업을 정할 수 있나요?</h3><p>사주 성격 해석과 일하는 성향을 진로 탐색의 질문으로 활용하는 콘텐츠예요. 직업이나 취업 결과를 정해 주지 않으며, 관심이 생긴 역할을 작은 과제로 경험하며 확인하도록 돕습니다.</p><h3>왜 프로필 카드가 필요한가요?</h3><p>기존 회원은 저장한 카드를 선택해 바로 이용할 수 있습니다. 처음 방문했다면 가입·로그인 후 같은 페이지로 돌아와 카드를 만들면 됩니다. 생년월일을 새 분석용 폼에 반복해서 입력하지 않으며, 카드 저장과 관리는 기존 시스템을 사용합니다. 다른 카드를 선택하면 해당 카드의 정보로 다시 계산합니다.</p><h3>무료 이용에 다른 조건이 있나요?</h3><p>이 리포트를 보는 데 이용권, 월정석, 단건 결제는 필요하지 않습니다. LLM으로 문장을 생성하지 않고 미리 작성한 원고를 분석 근거에 맞춰 연결합니다. 후기 작성이나 친구 초대, 공유도 이용 조건이 아닙니다. 다른 유료 서비스의 기존 정책은 그대로 유지됩니다.</p><h3>출생정보와 결과는 어떻게 다루나요?</h3><p>로그인한 계정의 프로필을 확인한 뒤 브라우저에서 계산합니다. 이 기능을 위해 개인 리포트 저장소를 새로 만들지 않으며, 다시 방문하면 선택한 카드로 계산합니다. 로그아웃하거나 계정이 바뀌면 열린 결과를 지웁니다. 출생지 정보가 없으면 기존 엔진의 기본값과 그 한계를 안내합니다. 저장된 출생지가 있다면 그 정보를 사용합니다.</p><h3>공유하면 어떤 내용이 전달되나요?</h3><p>리포트 끝의 공유 버튼은 선택 사항입니다. 유형 요약과 이 소개 페이지의 주소만 전달합니다. 이름, 생년월일, 출생 시각, 프로필 번호, 개인 리포트 본문은 공유 내용에 넣지 않습니다. 기기 공유가 지원되지 않으면 링크 복사를 이용할 수 있습니다.</p><h3>진로 결정에는 어떻게 활용하면 좋을까요?</h3><p>추천된 역할을 운명으로 받아들이기보다 작은 경험을 고르는 데 활용해 보세요. 같은 직업도 조직의 문화와 실제 과제가 다릅니다. 관심 분야의 직무 설명을 읽고, 짧은 프로젝트를 해보고, 담당자에게 하루의 일을 물어보는 경험이 판단에 도움이 됩니다. 전문적인 진로검사나 상담이 필요하다면 학교 진로지원센터 등 적절한 기관의 도움을 함께 받을 수 있습니다.</p></section>
  <footer className={styles.bottom}><a href="/saju/#services">다른 사주 콘텐츠 둘러보기</a><p>꿀꿀 운세 · 나를 알아가는 작은 시간</p></footer>
 </div>
 </main>}
