import { Bebas_Neue } from "next/font/google";

// A Bebas Neue é a fonte de destaque do manual da Corpore e só é usada aqui —
// carregar no layout do /gestao evita puxá-la nas páginas públicas.
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  return <div className={bebas.variable}>{children}</div>;
}
