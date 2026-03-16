import { VedicTransition } from "./VedicTransition";

export const metadata = {
  title: "베다점 | Code Destiny",
  description: "우주와 베다점으로 읽는 성향, 연애, 재물, 건강 운세",
};

export default function VedicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cosmic-root cosmic-root-layout">
      <div className="cosmic-bg-space" aria-hidden="true" />
      <div className="cosmic-bg-stars" aria-hidden="true" />
      <div className="cosmic-nebula-halo" aria-hidden="true" />
      <div className="cosmic-content-shell cosmic-content-shell-layout">
        <VedicTransition>{children}</VedicTransition>
      </div>
    </div>
  );
}
