import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function TamagotchiDeviceFrame({ children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-[2rem] border-4 border-[#2f3b30] bg-gradient-to-b from-[#f7f4df] via-[#f2edce] to-[#e9dfb6] p-4 shadow-[0_20px_60px_rgba(47,59,48,0.25)]">
      <div className="rounded-[1.5rem] border-2 border-[#4f5f53] bg-[#d8f0cc] p-3 shadow-inner">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="h-2 rounded-full bg-[#5b6f5f]" />
          <div className="h-2 rounded-full bg-[#5b6f5f]" />
          <div className="h-2 rounded-full bg-[#5b6f5f]" />
        </div>
        <div className="rounded-xl border border-[#607661] bg-gradient-to-b from-[#eaffdc] to-[#ccf0b8] p-4">{children}</div>
      </div>
      <div className="mt-4 flex justify-center gap-4">
        <span className="h-4 w-4 rounded-full bg-[#ff8a65] shadow-[0_2px_0_#b95f42]" />
        <span className="h-4 w-4 rounded-full bg-[#4db6ac] shadow-[0_2px_0_#2c6f69]" />
        <span className="h-4 w-4 rounded-full bg-[#7986cb] shadow-[0_2px_0_#4c5584]" />
      </div>
    </div>
  );
}
