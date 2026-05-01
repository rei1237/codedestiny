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
    <section className="rounded-2xl border border-cyan-300/20 bg-slate-900/55 p-4">
      <h2 className="text-base font-extrabold text-slate-50">Personalized Recommendation Area</h2>
      {!profile ? (
        <p className="mt-2 text-sm leading-7 text-slate-300">
          정보를 입력하면 맞춤 추천이 표시됩니다.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-7 text-slate-300">
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
