import type { StockMaterial } from "../../domain/materialRequest/stockTypes";
import { buildStockItemTitle } from "../../domain/materialRequest/buildStockItemTitle";
import { calculateStockDerivedFields } from "../../domain/materialRequest/stockDerivedFields";
import * as XLSX from "xlsx";

export interface ImportStockItemsFromExcelInput { file: File; }
export interface ImportStockItemsFromExcelOutput {
  totalRows: number; validRows: number; invalidRows: number; items: StockMaterial[];
  errors: Array<{ row: number; message: string }>;
}

type HeaderField =
  | "materialCode"
  | "description"
  | "center"
  | "evaluatedStockTotal"
  | "totalStockValueBRL"
  | "consumption2021"
  | "consumption2022"
  | "consumption2023"
  | "consumption2024"
  | "consumption2025"
  | "consumption2026"
  | "historicalTotal"
  | "consumptionYearsCount"
  | "averageAnnualConsumption"
  | "averagePrice";
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
  estoqueavaliadototal: "evaluatedStockTotal",
  estoquetotalrs: "totalStockValueBRL",
  estoquetotal: "totalStockValueBRL",
  "2021": "consumption2021",
  consumption2021: "consumption2021",
  consumo2021: "consumption2021",
  "2022": "consumption2022",
  consumption2022: "consumption2022",
  consumo2022: "consumption2022",
  "2023": "consumption2023",
  consumption2023: "consumption2023",
  consumo2023: "consumption2023",
  "2024": "consumption2024",
  consumption2024: "consumption2024",
  consumo2024: "consumption2024",
  "2025": "consumption2025",
  consumption2025: "consumption2025",
  consumo2025: "consumption2025",
  "2026": "consumption2026",
  consumption2026: "consumption2026",
  consumo2026: "consumption2026",
  total: "historicalTotal",
  historicaltotal: "historicalTotal",
  totalhistorico: "historicalTotal",
  cont: "consumptionYearsCount",
  consumptionyearscount: "consumptionYearsCount",
  qtdanosconsumo: "consumptionYearsCount",
  mediaanualconsumo: "averageAnnualConsumption",
  averageannualconsumption: "averageAnnualConsumption",
  precomedio: "averagePrice",
  averageprice: "averagePrice"
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/r\$/g, "rs")
    .replace(/[^a-z0-9]+/g, "");
}

const toText = (value: unknown) => String(value ?? "").trim();

function parseStockValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(toText(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function getHeaderIndex(headerMap: Map<number, HeaderField>, field: HeaderField): number {
  return Array.from(headerMap.entries()).find(([, mappedField]) => mappedField === field)?.[0] ?? -1;
}

function readParsedNumber(row: RawRow, headerMap: Map<number, HeaderField>, field: HeaderField): number | null {
  const index = getHeaderIndex(headerMap, field);
  return index >= 0 ? parseStockValue(row[index]) : null;
}

const isEmptyRow = (row: RawRow) => row.every((value) => toText(value) === "");

export async function importStockItemsFromExcelUseCase(input: ImportStockItemsFromExcelInput): Promise<ImportStockItemsFromExcelOutput> {
  try {
    const buffer = await input.file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    if (!workbook.SheetNames?.length) {
      return { totalRows: 0, validRows: 0, invalidRows: 1, items: [], errors: [{ row: 0, message: "O arquivo não possui abas." }] };
    }

    let rows: RawRow[] | null = null;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets?.[sheetName];
      if (!sheet) continue;
      const currentRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as RawRow[];
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

      const materialCode = toText(row[getHeaderIndex(headerMap, "materialCode")]);
      const description = toText(row[getHeaderIndex(headerMap, "description")]);
      const center = toText(row[getHeaderIndex(headerMap, "center")]);
      const evaluatedStockTotal = readParsedNumber(row, headerMap, "evaluatedStockTotal");
      const consumption2021 = readParsedNumber(row, headerMap, "consumption2021");
      const consumption2022 = readParsedNumber(row, headerMap, "consumption2022");
      const consumption2023 = readParsedNumber(row, headerMap, "consumption2023");
      const consumption2024 = readParsedNumber(row, headerMap, "consumption2024");
      const consumption2025 = readParsedNumber(row, headerMap, "consumption2025");
      const consumption2026 = readParsedNumber(row, headerMap, "consumption2026");
      const averagePrice = readParsedNumber(row, headerMap, "averagePrice");
      const derivedFields = calculateStockDerivedFields({
        evaluatedStockTotal,
        averagePrice,
        consumption2021,
        consumption2022,
        consumption2023,
        consumption2024,
        consumption2025,
        consumption2026
      });

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
          evaluatedStockTotal,
          totalStockValueBRL: derivedFields.totalStockValueBRL,
          consumption2021,
          consumption2022,
          consumption2023,
          consumption2024,
          consumption2025,
          consumption2026,
          historicalTotal: derivedFields.historicalTotal,
          consumptionYearsCount: derivedFields.consumptionYearsCount,
          averageAnnualConsumption: derivedFields.averageAnnualConsumption,
          averagePrice
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
