export const ONE_MILLION = 1_000_000;

export function requiresStructure(budgetBrl?: number) {
  const b = Number(budgetBrl ?? 0);
  return Number.isFinite(b) && b >= ONE_MILLION;
}

export function toUpperOrUndefined(v?: string) {
  const s = (v ?? "").trim();
  return s ? s.toUpperCase() : undefined;
}

export function toIntOrUndefined(v: unknown) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

export function calculateInvestmentLevel(budgetBrl?: number, exchangeRate = 5.4): "N1" | "N2" | "N3" | "N4" | undefined {
  const b = Number(budgetBrl ?? NaN);
  if (!Number.isFinite(b) || b <= 0) return undefined;

  const usd = b / exchangeRate;

  if (usd >= 150_000_000) return "N1";
  if (usd >= 10_000_000) return "N2";
  if (usd >= 2_000_000) return "N3";
  return "N4";
}
