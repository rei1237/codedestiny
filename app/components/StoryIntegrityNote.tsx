import Link from "next/link";

// ContentIntegrityNote 의 창작물 버전.
//
// 기존 고지는 "운세 해석은 미래를 단정하는 예언이 아니라…"로 시작해 운세 콘텐츠를
// 전제로 쓰여 있어 소설에는 맞지 않는다. 창작물에는 창작물에 맞는 고지가 필요하다.
export default function StoryIntegrityNote() {
  return (
    <aside className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5 text-sm leading-7 text-slate-300 md:px-6">
      <h2 className="text-base font-semibold text-amber-100">창작·집필 안내</h2>
      <p className="mt-3 break-keep">
        『연이의 운명 노벨』은 Code Destiny가 직접 쓰고 그린 창작 소설입니다. 등장하는 인물과
        사건은 모두 지어낸 것이며, 실재하는 인물·단체와 관계가 없습니다.
      </p>
      <p className="mt-3 break-keep">
        이야기의 무대는 사주 명리학의 십성, 자미두수의 열두 궁, 숙요 27수라는 실제 전통 체계에서
        가져왔습니다. 다만 그 설정을 서사에 맞게 각색했으므로, 작품 속 묘사를 그대로 점술 지식으로
        받아들이지는 말아 주세요. 각 체계의 실제 해석 규칙은 별도의 기능 가이드에 정리해 두었습니다.
      </p>
      <p className="mt-3 break-keep">
        본문은 게시 전 편집자가 문장과 흐름을 다듬습니다. 오탈자나 앞뒤가 맞지 않는 부분을 발견하면{" "}
        <Link href="/contact/" className="text-amber-100 underline">
          문의
        </Link>
        로 알려 주시면 확인 후 고치겠습니다.
      </p>
    </aside>
  );
}
