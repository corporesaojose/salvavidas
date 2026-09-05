// A Pacto grava o tipo sem acento e a casa fala de outro jeito: 15 e 30 dias são
// "voucher", 7 dias é "experiência". Todo texto que a equipe lê passa por aqui.
const ROTULOS: Record<string, string> = {
  "Experiencia 7 dias": "Experiência 7 dias",
  "Voucher 15 dias": "Voucher 15 dias",
  "Voucher 30 dias": "Voucher 30 dias",
  "Voucher 3 meses": "Voucher 3 meses",
};

export function rotuloPlano(plano: string | null | undefined) {
  if (!plano) return "voucher";
  return ROTULOS[plano] || plano;
}

/** Como chamar o item numa frase: "a experiência" ou "o voucher". */
export function termoNaFrase(plano: string | null | undefined) {
  return String(plano || "").startsWith("Experiencia") ? "a experiência" : "o voucher";
}
