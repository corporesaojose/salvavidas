"use client";

export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Voltar"
      className="flex items-center gap-1 text-xs text-[#faf8f0]/40 hover:text-[#faf8f0]/70 transition-colors mb-3 normal-case"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Voltar
    </button>
  );
}
