import type { StockMaterial } from "../../domain/materialRequest/stockTypes";
import { buildStockItemTitle } from "../../domain/materialRequest/buildStockItemTitle";

export interface ImportStockItemsFromExcelInput { file: File; }
export interface ImportStockItemsFromExcelOutput {
  totalRows: number; validRows: number; invalidRows: number; items: StockMaterial[];
  errors: Array<{ row: number; message: string }>;
}

type HeaderField = "materialCode" | "description" | "center" | "evaluatedStockTotal";
type RawRow = unknown[];

const REQUIRED_COLUMNS: Array<{ field: HeaderField; label: string }> = [
  { field: "materialCode", label: "Material" },
  { field: "description", label: "Descrição" },
  { field: "center", label: "Centro" },
  { field: "evaluatedStockTotal", label: "Estoque avaliado total" }
];

const HEADER_ALIASES: Record<string, HeaderField> = {
  material: "materialCode",
  description: "description",
  descricao: "description",
  center: "center",
  centro: "center",
  evaluatedstocktotal: "evaluatedStockTotal",
  estoqueavaliadototal: "evaluatedStockTotal"
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s/g, "");
}

const toText = (value: unknown) => String(value ?? "").trim();

function parseStockValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(toText(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

const isEmptyRow = (row: RawRow) => row.every((value) => toText(value) === "");

export async function importStockItemsFromExcelUseCase(input: ImportStockItemsFromExcelInput): Promise<ImportStockItemsFromExcelOutput> {
  try {
    const xlsxModuleName = "xlsx";
    const xlsx = await import(/* @vite-ignore */ xlsxModuleName);
    const buffer = await input.file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "array" });

    if (!workbook.SheetNames?.length) {
      return { totalRows: 0, validRows: 0, invalidRows: 1, items: [], errors: [{ row: 0, message: "O arquivo não possui abas." }] };
    }

    let rows: RawRow[] | null = null;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets?.[sheetName];
      if (!sheet) continue;
      const currentRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as RawRow[];
      if (currentRows.length > 0) {
        rows = currentRows;
        break;
      }
    }

    if (!rows || rows.length === 0) {
      return { totalRows: 0, validRows: 0, invalidRows: 1, items: [], errors: [{ row: 0, message: "Nenhuma aba com dados foi encontrada no arquivo." }] };
    }

    const headerIndex = rows.findIndex((row) => !isEmptyRow(row));
    if (headerIndex === -1) {
      return { totalRows: 0, validRows: 0, invalidRows: 1, items: [], errors: [{ row: 0, message: "Nenhuma aba com dados foi encontrada no arquivo." }] };
    }

    const headerRow = rows[headerIndex];
    const dataRows = rows.slice(headerIndex + 1);
    const headerMap = new Map<number, HeaderField>();

    headerRow.forEach((headerValue, index) => {
      const field = HEADER_ALIASES[normalizeHeader(headerValue)];
      if (field) headerMap.set(index, field);
    });

    const missingColumns = REQUIRED_COLUMNS.filter(({ field }) => !Array.from(headerMap.values()).includes(field));
    if (missingColumns.length > 0) {
      return {
        totalRows: dataRows.length,
        validRows: 0,
        invalidRows: dataRows.length || 1,
        items: [],
        errors: missingColumns.map(({ label }) => ({ row: 0, message: `Coluna obrigatória não encontrada: ${label}.` }))
      };
    }

    const items: StockMaterial[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    const seenKeys = new Set<string>();

    dataRows.forEach((row, dataIndex) => {
      if (isEmptyRow(row)) return;
      const line = headerIndex + dataIndex + 2;

      const materialCode = toText(row[Array.from(headerMap.entries()).find(([, field]) => field === "materialCode")?.[0] ?? -1]);
      const description = toText(row[Array.from(headerMap.entries()).find(([, field]) => field === "description")?.[0] ?? -1]);
      const center = toText(row[Array.from(headerMap.entries()).find(([, field]) => field === "center")?.[0] ?? -1]);
      const evaluatedStockTotal = parseStockValue(row[Array.from(headerMap.entries()).find(([, field]) => field === "evaluatedStockTotal")?.[0] ?? -1]);

      if (!materialCode) errors.push({ row: line, message: "Material é obrigatório." });
      if (!description) errors.push({ row: line, message: "Descrição é obrigatória." });
      if (!center) errors.push({ row: line, message: "Centro é obrigatório." });
      if (evaluatedStockTotal == null) errors.push({ row: line, message: "Estoque avaliado total é obrigatório." });

      const itemKey = buildStockItemTitle(center, materialCode);
      if (!errors.some((error) => error.row === line) && seenKeys.has(itemKey)) {
        errors.push({ row: line, message: `Duplicidade encontrada para Centro + Material: ${itemKey}.` });
        return;
      }

      if (!errors.some((error) => error.row === line)) {
        seenKeys.add(itemKey);
        items.push({
          materialCode,
          description,
          center,
          evaluatedStockTotal
        });
      }
    });

    return { totalRows: dataRows.length, validRows: items.length, invalidRows: new Set(errors.map((error) => error.row)).size, items, errors };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Erro ao ler Excel de estoque", error);
    }
    const message = error instanceof Error ? error.message : String(error);
    return { totalRows: 0, validRows: 0, invalidRows: 1, items: [], errors: [{ row: 0, message: `Não foi possível ler o Excel: ${message}` }] };
  }
}
