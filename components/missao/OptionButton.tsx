"use client";

export default function OptionButton({
  emoji,
  label,
  selected,
  disabled,
  delay = 0,
  visible,
  onClick,
}: {
  emoji?: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  delay?: number;
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-card text-left text-sm font-semibold normal-case transition-all duration-200 disabled:cursor-default"
      style={{
        background: selected ? "rgba(214,224,77,0.16)" : "rgba(250,248,240,0.05)",
        border: selected ? "1.5px solid #d6e04d" : "1px solid rgba(250,248,240,0.12)",
        color: selected ? "#d6e04d" : "#faf8f0",
        opacity: visible ? 1 : 0,
        transform: visible ? (selected ? "translateX(4px)" : "translateY(0)") : "translateY(10px)",
        transition: `opacity 0.35s ease ${delay}s, transform 0.35s ease ${delay}s, background 0.2s, border-color 0.2s`,
      }}
    >
      {emoji && <span className="text-xl flex-shrink-0">{emoji}</span>}
      <span className="flex-1">{label}</span>
      {selected && <span className="text-lime-400">✓</span>}
    </button>
  );
}
