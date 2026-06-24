import Image from "next/image";

export default function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const src = variant === "dark" ? "/logo-full-dark.png" : "/logo-full-light.png";
  return (
    <Image
      src={src}
      alt="Missão Salva-Vidas — Corpore"
      width={120}
      height={140}
      className="h-20 w-auto"
      priority
    />
  );
}
