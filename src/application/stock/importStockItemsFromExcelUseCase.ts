import type { StockMaterial } from "../../domain/materialRequest/stockTypes";

export interface ImportStockItemsFromExcelInput { file: File; }
export interface ImportStockItemsFromExcelOutput {
  totalRows: number; validRows: number; invalidRows: number; items: StockMaterial[];
  errors: Array<{ row: number; message: string }>;
}

type RowRecord = Record<string, unknown>;
const HEADER_ALIASES: Record<string, keyof StockMaterial> = { material: "materialCode", description: "description", "descrição": "description", center: "center", centro: "center", evaluatedstocktotal: "evaluatedStockTotal", "estoque avaliado total": "evaluatedStockTotal" };
const REQUIRED_FIELDS: Array<keyof StockMaterial> = ["materialCode", "description", "center", "evaluatedStockTotal"];

const normalizeHeader = (v: unknown) => String(v ?? "").trim().toLowerCase();
const toText = (v: unknown) => String(v ?? "").trim();
function parseStockValue(value: unknown): number | null { if (value == null) return null; if (typeof value === "number" && Number.isFinite(value)) return value; const parsed = Number(String(value).trim().replace(",", ".")); return Number.isFinite(parsed) ? parsed : null; }
async function loadXlsxModule(): Promise<{ read: (data: ArrayBuffer, opts: { type: string }) => unknown; utils: { sheet_to_json: (sheet: unknown, opts: { defval: string }) => RowRecord[] } }> { const moduleName = "xlsx"; return await import(/* @vite-ignore */ moduleName); }

export async function importStockItemsFromExcelUseCase(input: ImportStockItemsFromExcelInput): Promise<ImportStockItemsFromExcelOutput> {
  let rows: RowRecord[] = [];
  try {
    const xlsx = await loadXlsxModule();
    const workbook = xlsx.read(await input.file.arrayBuffer(), { type: "array" }) as { SheetNames?: string[]; Sheets?: Record<string, unknown> };
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) return { totalRows: 0, validRows: 0, invalidRows: 0, items: [], errors: [{ row: 0, message: "Arquivo sem planilha." }] };
    rows = xlsx.utils.sheet_to_json(workbook.Sheets?.[sheetName], { defval: "" });
  } catch {
    return { totalRows: 0, validRows: 0, invalidRows: 1, items: [], errors: [{ row: 0, message: "Não foi possível ler o Excel." }] };
  }

  const headerMap = new Map<string, keyof StockMaterial>();
  Object.keys(rows[0] ?? {}).forEach((header) => { const field = HEADER_ALIASES[normalizeHeader(header)]; if (field) headerMap.set(header, field); });
  const missing = REQUIRED_FIELDS.filter((field) => !Array.from(headerMap.values()).includes(field));
  if (missing.length) return { totalRows: rows.length, validRows: 0, invalidRows: rows.length, items: [], errors: [{ row: 0, message: `Colunas obrigatórias ausentes: ${missing.join(", ")}.` }] };

  const items: StockMaterial[] = []; const errors: Array<{ row: number; message: string }> = [];
  rows.forEach((row, idx) => {
    const normalized: Partial<StockMaterial> = {};
    Object.entries(row).forEach(([header, raw]) => { const field = headerMap.get(header); if (!field) return; if (field === "evaluatedStockTotal") { (normalized as Record<string, unknown>)[field] = parseStockValue(raw); } else { (normalized as Record<string, unknown>)[field] = toText(raw); } });
    const line = idx + 2;
    if (!toText(normalized.materialCode) && !toText(normalized.description) && !toText(normalized.center) && normalized.evaluatedStockTotal == null) return;
    if (!toText(normalized.materialCode)) errors.push({ row: line, message: "Material é obrigatório." });
    if (!toText(normalized.description)) errors.push({ row: line, message: "Description é obrigatório." });
    if (!toText(normalized.center)) errors.push({ row: line, message: "Center é obrigatório." });
    if (normalized.evaluatedStockTotal == null) errors.push({ row: line, message: "EvaluatedStockTotal inválido." });
    if (!errors.some((e) => e.row === line)) items.push(normalized as StockMaterial);
  });

  return { totalRows: rows.length, validRows: items.length, invalidRows: new Set(errors.map((e) => e.row)).size, items, errors };
}
