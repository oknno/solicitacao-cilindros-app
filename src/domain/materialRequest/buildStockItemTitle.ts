export function buildStockItemTitle(center: string, materialCode: string): string {
  const normalizedCenter = String(center ?? "").trim();
  const normalizedMaterialCode = String(materialCode ?? "").trim();
  return `${normalizedCenter}-${normalizedMaterialCode}`;
}
