"use client";

export default function QuestionHeader({
  icon,
  blockLabel,
  counter,
  title,
  subtext,
  visible,
}: {
  icon: string;
  blockLabel: string;
  counter: string;
  title: string;
  subtext?: string;
  visible: boolean;
}) {
  return (
    <div className="mb-5">
      <div
        className="flex items-center gap-2 mb-3"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      >
        <span className="text-2xl">{icon}</span>
        <span className="eyebrow">{blockLabel}</span>
        <span className="ml-auto text-xs text-[#faf8f0]/35">{counter}</span>
      </div>
      <h2
        className="text-white text-xl normal-case font-display"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease 0.05s, transform 0.4s ease 0.05s",
          letterSpacing: 0,
        }}
      >
        {title}
      </h2>
      {subtext && (
        <p
          className="text-sm text-[#faf8f0]/45 mt-1.5 normal-case"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.1s" }}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
