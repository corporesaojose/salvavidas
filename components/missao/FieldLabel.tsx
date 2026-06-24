export default function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[#faf8f0]/85 mb-2 normal-case">
      {children}
    </label>
  );
}
