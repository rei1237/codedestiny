import CutReader, { type WebtoonCut } from '@/app/components/webtoon/CutReader';
import { quickGuideStories, guideGroups } from '@/lib/brand/service-guide-webtoon.mjs';
import { consultationWebtoons } from '@/lib/brand/consultation-webtoons.mjs';
import { consultationStories } from '@/lib/brand/consultation-stories.mjs';
import { RECORD_SERVICES } from '@/lib/records/service-registry';
import styles from './service-guide.module.css';

const webtoons = consultationWebtoons as Record<string, { title: string; episode?: string }>;
const stories = consultationStories as Record<string, { basis: string }>;

export default function ServiceGuide() {
  return <section id="service-guide" className={styles.guide} aria-labelledby="service-guide-title">
    <header className={styles.heading}>
      <h2 id="service-guide-title">오늘, 어느 문을 열까요?</h2>
      <p>“운세가 이렇게 많은데, 저는 어디로 가죠?”<br/>연이가 찻잔 옆에 이야기 지도를 펼쳤어요.</p>
      <p>마음에 걸리는 제목부터 골라 보세요. 짧은 웹툰 속 손님을 따라가면, 무엇을 입력하고 어떤 해석을 만나는지 알 수 있어요.</p>
      <nav className={styles.tabs} aria-label="이용 안내 웹툰 목차">
        <a href="#guide-quick">가볍게 시작하는 운세</a><a href="#guide-signature">대표 상담</a><a href="#guide-expert">전문가 상담</a>
      </nav>
      <p className={styles.note}>서비스를 설명하는 창작 이야기예요. 등장인물의 대사는 개인 분석 결과나 실제 이용 후기가 아닙니다.</p>
    </header>
    <section id="guide-quick" className={styles.group} aria-labelledby="guide-quick-title">
      <h3 id="guide-quick-title">가볍게 시작하는 다섯 이야기</h3>
      <p>나의 기질, 오늘의 흐름, 마음에 걸리는 질문. 궁금한 편을 펼쳐 읽어요.</p>
      {quickGuideStories.map(story => <details key={story.id} className={styles.episode}>
        <summary><span><strong>{story.title}</strong><small>{story.name}</small></span><span className={styles.toggle} aria-hidden="true"/></summary>
        <p className={styles.episodeLead}>{story.lead}</p>
        <CutReader cuts={story.cuts as WebtoonCut[]} eager={0} tone="lantern"/>
        <a className={styles.action} href={story.href}>{story.action}<span aria-hidden="true"> →</span></a>
      </details>)}
    </section>
    {guideGroups.map(group => <section key={group.id} id={`guide-${group.id}`} className={styles.group} aria-labelledby={`guide-${group.id}-title`}>
      <h3 id={`guide-${group.id}-title`}>{group.title}</h3><p>{group.intro}</p>
      <ul className={styles.stories}>{group.ids.map(id => {
        const service = RECORD_SERVICES.find(item => item.id === id)!;
        return <li key={id}><a className={styles.story} href={`/consultations/${id}/`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/consultation-webtoons/covers/${id}.webp`} alt="" width={720} height={480} loading="lazy" decoding="async"/>
          <span><small>{service.name}</small><strong>{webtoons[id].episode}</strong><span className={styles.basis}>{stories[id].basis}</span><span className={styles.read}>이야기 읽기 <span aria-hidden="true">→</span></span></span>
        </a></li>;
      })}</ul>
    </section>)}
    <aside className={styles.afterword}>
      <h3>읽고 나서, 나의 이야기로</h3>
      <p>상담을 고른 뒤 해당 화면에서 필요한 출생 정보나 질문을 준비해요. 상담마다 쓸 수 있는 결제 방법은 그 상담 화면에서 먼저 보여드리고, 단건 결제·꿀단지 이용권·월정석의 차이는 FAQ에 정리해 두었어요.</p>
      <a href="/faq/">자주 묻는 질문에서 결제 방법 보기 <span aria-hidden="true">→</span></a>
      <a href="/heukwol/">흑월의 주의 시기 · 월별 흐름과 대비 <span aria-hidden="true">→</span></a>
      <a href="/consultations/">상담의 정원에서 비교하기 <span aria-hidden="true">→</span></a>
      <a href="#entry-record">이 상담은 어디에서 시작됐을까요? <span aria-hidden="true">↓</span></a>
    </aside>
  </section>;
}
