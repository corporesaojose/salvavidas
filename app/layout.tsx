import type { Metadata } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Missão Salva-Vidas | Corpore",
  description: "Sua missão começa aqui. Descubra seu perfil de saúde e comece sua experiência de 15 dias na Corpore.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${archivoBlack.variable}`}>
      <body className="font-sans bg-ink-900 text-[#faf8f0] antialiased">
        {children}
      </body>
    </html>
  );
}
