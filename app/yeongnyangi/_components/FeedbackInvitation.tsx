import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {getFeedbackCopy} from '@/app/feedback/_lib/copy';

export default function FeedbackInvitation(){
 const copy=getFeedbackCopy('ko');
 return <aside className="yn-feedback" aria-label="버그 제보실">
  <Image src="/assets/yeongnyangi/original/surprised.webp" width={100} height={112} alt="깜짝 놀란 영냥이"/>
  <div><h2>버그 제보실</h2><p>어라, 이건 내 발자국이 아닌데? 이상한 곳을 찾았다면 알려줘.</p><p className="yn-feedback-reward">{copy.categories.bug.rewardNote}</p></div>
  <a href="/feedback/">버그 제보하기<ArrowRight size={17}/></a>
 </aside>;
}
