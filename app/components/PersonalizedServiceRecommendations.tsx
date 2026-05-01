import ServiceCard, { type ServiceCardModel } from "./ServiceCard";

type FormState = {
  name: string;
  birthDate: string;
  calType: "solar" | "lunar" | "lunar_leap";
  birthHour: string;
  birthMinute: string;
  birthCountry: string;
  gender: "F" | "M";
  agreed: boolean;
};

type Props = {
  profile: FormState | null;
  recommendations: ServiceCardModel[];
};

export default function PersonalizedServiceRecommendations({ profile, recommendations }: Props) {
  return (
    <section className="rounded-[22px] border border-violet-300/30 bg-[linear-gradient(145deg,rgba(28,15,61,0.9),rgba(36,20,74,0.86))] p-4 shadow-[0_16px_34px_rgba(28,14,62,0.26)]">
      <h2 className="text-base font-extrabold text-violet-50">오늘의 맞춤 추천</h2>
      {!profile ? (
        <p className="mt-2 text-sm leading-7 text-violet-100/80">
          정보를 입력하면 맞춤 추천이 표시됩니다.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-7 text-violet-100/85">
            {profile.name}님을 위한 추천 서비스입니다. 입력된 시간/캘린더 유형 기준으로 우선순위를 정렬했습니다.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((item) => (
              <ServiceCard key={`rec-${item.title}`} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
