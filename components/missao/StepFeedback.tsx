"use client";

import { useEffect, useState } from "react";

export default function StepFeedback({
  message,
  onNext,
}: {
  message: string;
  onNext: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(onNext, 1600);
    return () => clearTimeout(t);
  }, [onNext]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(214,224,77,0.12), transparent 55%), #1a1a1a",
      }}
    >
      <div
        className="flex flex-col items-center gap-5"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl animate-check-pop"
          style={{ background: "rgba(214,224,77,0.15)", border: "2px solid #d6e04d" }}
        >
          ✓
        </div>
        <p className="text-lg font-semibold text-white max-w-sm normal-case">{message}</p>
      </div>
    </div>
  );
}
