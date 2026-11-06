import styles from './fate-warning.module.css';

type Character = 'neo' | 'yeoni' | 'heukwol';
const names = { neo: '네오', yeoni: '연이', heukwol: '흑월' };

// The approved profile sheets are shown through CSS crops. Facial identity is
// preserved by reusing the original pixels instead of generating another face.
function Portrait({ character }: { character: Character }) {
  return <div className={`${styles.portrait} ${styles[character]}`}
    role="img" aria-label={`${names[character]}의 공식 프로필 원화`} />;
}

export default function FateWarningEpisode() {
  return (
    <section id="heukwol-story" className={styles.story} aria-labelledby="heukwol-episode-title">
      <header className={styles.title}>
        <p>흑월의 경고 · 서장</p>
        <h2 id="heukwol-episode-title">불운의 매듭을 푸는 법</h2>
        <p>달빛이 사라진 밤, 흑월이 손님의 앞날을 펼쳐 보였다.</p>
      </header>

      <figure className={styles.warningScene}>
        <div className={styles.omen}><span>흑월의 손끝에서 검은 길이 갈라졌다.</span><p>어느 쪽으로 가도,<br />끝은 같을 거야.</p></div>
        <figcaption>무너진 약속. 멀어진 사람. 다시 돌아온 후회.<br />흑월이 펼친 장면마다 손님은 혼자 서 있었다.</figcaption>
      </figure>

      <figure className={`${styles.scene} ${styles.shadow}`}>
        <Portrait character="heukwol" />
        <figcaption><span>흑월</span><p>“네가 계속 그렇게 고른다면,<br />끝은 이미 보이는걸.”</p></figcaption>
      </figure>

      <figure className={`${styles.scene} ${styles.flower}`}>
        <Portrait character="yeoni" />
        <figcaption><span>연이</span><p>“아직 일어나지 않은 일이에요.<br />저 말이 당신의 결말이 되게 두지 않을 거예요.”</p></figcaption>
      </figure>

      <div className={styles.pause}>
        <p>연이가 손님 앞을 가로막았다.<br />분홍빛 꽃잎이 검은 그림자의 가장자리를 밀어냈다.</p>
        <blockquote>“이미 겪은 일과 두려워하는 일을 나눠봐요.<br />어디서 마음이 급해졌는지부터 함께 찾을게요.”</blockquote>
        <p>네오는 흑월이 보여준 길을 따라 시선을 옮겼다.<br />갈림길마다 같은 매듭이 묶여 있었다.</p>
        <dl><div><dt>반복되는 선택</dt><dd>불안할수록 대답을 서두른다.</dd></div><div><dt>그 선택이 이어지는 조건</dt><dd>확인할 시간을 남기지 않는다.</dd></div></dl>
      </div>

      <figure className={`${styles.scene} ${styles.strategy}`}>
        <Portrait character="neo" />
        <figcaption><span>네오</span><p>“위로로 끝낼 생각은 없어.<br />네가 보여준 결말에 닿는 조건부터 끊는다.”</p></figcaption>
      </figure>

      <div className={styles.plan}>
        <p>네오는 첫 번째 매듭을 풀었다.<br />닫혀 있던 길 사이로 가느다란 빛이 들어왔다.</p>
        <ol><li>확정되지 않은 약속은 미루기.</li><li>확인할 조건은 먼저 확인하기.</li><li>감당할 범위를 넘으면 멈추기.</li></ol>
        <p>“같은 선택을 바꾸면,<br />다음 수가 생긴다.”</p>
      </div>

      <figure className={`${styles.scene} ${styles.shadow}`}>
        <Portrait character="heukwol" />
        <figcaption><span>흑월</span><p>“좋아. 이번에는 어디까지 달라지는지<br />지켜보겠어.”</p></figcaption>
      </figure>

      <div className={styles.answer}>
        <div><Portrait character="yeoni" /><p><strong>연이</strong>“당신을 탓하기 위한 이야기가 아니에요.<br />이제 당신의 흐름을 함께 살펴봐요.”</p></div>
        <div><Portrait character="neo" /><p><strong>네오</strong>“주의할 지점과 대응할 방법.<br />네 상황에 맞춰 정리하자.”</p></div>
      </div>

      <footer className={styles.ending}>
        <p>흑월의 그림자가 문밖으로 물러났다.<br />연이와 네오는 손님 곁에 남았다.</p>
        <p>경고는 남았다.<br />하지만 길은 하나가 아니었다.</p>
        <a href="#heukwol-profile">나의 흐름 살펴보기 <span aria-hidden="true">↗</span></a>
      </footer>
    </section>
  );
}
