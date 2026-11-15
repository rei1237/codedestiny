import {Button} from './Button';
import '../../../styles/theme-tokens.css';
import '../../../styles/fonts-ui.generated.css';
import styles from './LoginPanel.module.css';

type Props={busy:boolean;onLogin:()=>void;onCancel:()=>void;library?:boolean;error?:string;standalone?:boolean};

// Both SPA entry and a reopened /login use this presentation. Authentication stays with each adapter.
export default function LoginPanel({busy,onLogin,onCancel,library=false,error,standalone=false}:Props){
 return <section className={`${styles.panel} ${standalone?styles.standalone:''}`} aria-labelledby="toss-login-title">
  <div className={styles.heading}>
   <div><h1 id="toss-login-title">상담을 안전하게<br/>보관해요</h1><p>같은 토스 계정으로 상담을 이어 보고,<br/>저장한 결과를 다시 읽을 수 있어요.</p></div>
   <img src="/assets/yeongnyangi.webp" width={96} height={112} alt=""/>
  </div>
  <div className={styles.actions}>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <Button display="block" loading={busy} disabled={busy} onClick={onLogin}>{busy?'로그인 중':'토스로 로그인하기'}</Button>
   <p className={styles.returnNote}>{library?'로그인 후 기록 보관함으로 돌아와요.':'로그인 후 진행하던 화면으로 돌아와요.'}</p>
   <button type="button" className={styles.browse} onClick={onCancel}>지금은 둘러보기</button>
  </div>
  <details className={styles.privacy}>
   <summary>계정·개인정보 안내</summary>
   <p>토스 동의 화면에는 이름이 표시되지만 서버에 저장하지 않으며, 이메일은 요청하지 않아요.</p>
   <p>기존 CODE DESTINY 웹 계정과 기록은 자동으로 합쳐지지 않아요.</p>
  </details>
 </section>;
}
