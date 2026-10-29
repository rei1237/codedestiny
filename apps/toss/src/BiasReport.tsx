import type {ChemiReport} from '../../../app/saju/destiny-bias/engine/chemiReportBridge';
const formatElement=(value:number)=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(value);

// Render the web report's view model. No second chart, score or copy generator.
export default function BiasReport({report}:{report:ChemiReport}){
  const {vm}=report, f=vm.fandomProfile;
  const fandom=[
    ['나의 덕질 캐릭터',f.biasCharacterTitle,f.biasCharacterOneLiner],
    ['입덕의 계기',f.entryType,f.entryText],
    ['처음 끌리는 이유','',f.tasteFirstAttraction],
    ['오래 응원하는 이유','',f.tasteLongTermReason],
    ['깊이 빠지는 방식',f.deepDivePattern,f.deepDiveText],
    ['관계를 바라보는 방식',f.relationshipLens,f.relationshipText],
    ['마음을 붙잡는 포인트',f.obsessionPoint,f.obsessionText],
    ['응원의 지속성',`${f.persistenceIntensity} · ${f.persistenceDuration}`,f.persistenceText],
    ['거리를 두는 순간',f.detachmentReason,f.detachmentReasonText],
    ['마음을 정리하는 방식',f.detachmentStyle,f.detachmentStyleText],
  ];
  const elements=[['wood','목'],['fire','화'],['earth','토'],['metal','금'],['water','수']] as const;
  return <div className="bias-full-report">
    <details><summary>케미 리포트 · 오행과 다섯 가지 풀이</summary>
      <h3>기질의 분포</h3>
      <table><caption>기존 계산 엔진의 오행 분포</caption><thead><tr><th scope="col">오행</th><th scope="col">나</th><th scope="col">{vm.biasName}</th></tr></thead><tbody>{elements.map(([key,label])=><tr key={key}><th scope="row">{label}</th><td>{formatElement(vm.elementDistribution.user[key])}</td><td>{formatElement(vm.elementDistribution.favorite[key])}</td></tr>)}</tbody></table>
      {vm.detailedTabs.map(tab=><section key={tab.id}><h3>{tab.title}</h3>{tab.sections.map((item,index)=><section key={`${tab.id}-${index}`}><h4>{item.title}</h4><p>{item.text}</p>{item.usedSignals.length>0&&<p className="muted">근거: {item.usedSignals.join(' · ')}</p>}{item.action&&<p>{item.action}</p>}</section>)}</section>)}
    </details>
    <details><summary>팬덤 성향 · 내 응원의 방식</summary>{fandom.map(([title,subtitle,body])=><section key={title}><h3>{title}</h3>{subtitle&&<h4>{subtitle}</h4>}<p>{body}</p></section>)}<p>{f.finalPhilosophy}</p></details>
    <details><summary>밈으로 보는 케미 이야기</summary><p className="muted">아래 유형과 전생 이야기는 재미로 읽는 창작 표현이에요. 심리검사나 실제 전생에 관한 사실이 아니에요.</p><h3>{vm.mzLayer.relationMbti.type}</h3><p>{vm.mzLayer.relationMbti.desc}</p><h3>{vm.mzLayer.pastLife.title}</h3><p>{vm.mzLayer.pastLife.story}</p><p>{vm.mzLayer.gradeMeme}</p><p>{vm.mzLayer.hashtags.join(' ')}</p></details>
    <h3>오늘의 작은 응원</h3><p>{vm.todayMission}</p><p>{vm.cheerPoint}</p><p className="muted">{vm.bottomNotice}</p>
  </div>;
}
