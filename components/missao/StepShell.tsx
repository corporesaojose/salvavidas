"use client";

import Image from "next/image";
import ProgressBar from "./ProgressBar";

export default function StepShell({
  etapaAtual,
  children,
}: {
  etapaAtual: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-10 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(214,224,77,0.08), transparent 55%), #1a1a1a",
      }}
    >
      <Image
        src="/mark-heart.png"
        alt=""
        width={320}
        height={320}
        className="absolute -right-16 -bottom-16 pointer-events-none select-none"
        style={{ opacity: 0.06, filter: "brightness(0) invert(1)" }}
      />
      <div className="w-full max-w-md flex flex-col gap-6 relative z-10">
        <ProgressBar etapaAtual={etapaAtual} />
        {children}
      </div>
    </div>
  );
}
