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
  { field: "evaluatedStockTotal", label: "Estoque avaliado total" },
  { field: "averagePrice", label: "Preço Médio" }
];

const HEADER_ALIAS_ENTRIES: Array<[string, HeaderField]> = [
  ["material", "materialCode"],
  ["descrição", "description"],
  ["descricao", "description"],
  ["description", "description"],
  ["centro", "center"],
  ["center", "center"],
  ["estoque avaliado total", "evaluatedStockTotal"],
  ["estoqueavaliadototal", "evaluatedStockTotal"],
  ["evaluated stock total", "evaluatedStockTotal"],
  ["estoque total (r$)", "totalStockValueBRL"],
  ["estoque total r$", "totalStockValueBRL"],
  ["estoquetotalr", "totalStockValueBRL"],
  ["estoque total", "totalStockValueBRL"],
  ["2021", "consumption2021"],
  ["2022", "consumption2022"],
  ["2023", "consumption2023"],
  ["2024", "consumption2024"],
  ["2025", "consumption2025"],
  ["2026", "consumption2026"],
  ["total", "historicalTotal"],
  ["cont", "consumptionYearsCount"],
  ["count", "consumptionYearsCount"],
  ["quantidade anos", "consumptionYearsCount"],
  ["anos com movimento", "consumptionYearsCount"],
  ["média anual consumo", "averageAnnualConsumption"],
  ["media anual consumo", "averageAnnualConsumption"],
  ["mediaanualconsumo", "averageAnnualConsumption"],
  ["preço médio", "averagePrice"],
  ["preco medio", "averagePrice"],
  ["precomedio", "averagePrice"],
  ["average price", "averagePrice"]
];

function normalizeHeaderKey(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function compactHeaderKey(value: string): string {
  return value.replace(/[^a-z0-9]+/g, "");
}

const HEADER_ALIASES = HEADER_ALIAS_ENTRIES.reduce<Map<string, HeaderField>>((aliases, [alias, field]) => {
  const normalized = normalizeHeaderKey(alias);
  aliases.set(normalized, field);
  aliases.set(compactHeaderKey(normalized), field);
  return aliases;
}, new Map<string, HeaderField>());

export function normalizeHeader(value: unknown): string {
  return normalizeHeaderKey(value);
}

function resolveHeaderField(value: unknown): HeaderField | undefined {
  const normalized = normalizeHeaderKey(value);
  return HEADER_ALIASES.get(normalized) ?? HEADER_ALIASES.get(compactHeaderKey(normalized));
}

const toText = (value: unknown) => String(value ?? "").trim();

export function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "");

  if (!raw || raw === "-" || raw === "." || raw === ",") return null;

  const lastComma = raw.lastIndexOf(",");
  const lastDot = raw.lastIndexOf(".");
  let normalized = raw;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = raw.split(thousandsSeparator).join("").replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    normalized = normalizeSingleSeparatorNumber(raw, ",");
  } else if (lastDot >= 0) {
    normalized = normalizeSingleSeparatorNumber(raw, ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSingleSeparatorNumber(value: string, separator: "," | "."): string {
  const parts = value.split(separator);
  if (parts.length > 2) return parts.join("");

  const [integerPart, decimalPart = ""] = parts;
  const hasThousandsShape = /^-?\d{1,3}$/.test(integerPart) && /^\d{3}$/.test(decimalPart);
  if (hasThousandsShape) return `${integerPart}${decimalPart}`;

  return separator === "," ? value.replace(",", ".") : value;
}

function getHeaderIndex(headerMap: Map<number, HeaderField>, field: HeaderField): number {
  return Array.from(headerMap.entries()).find(([, mappedField]) => mappedField === field)?.[0] ?? -1;
}

function readParsedNumber(row: RawRow, headerMap: Map<number, HeaderField>, field: HeaderField): number | null {
  const index = getHeaderIndex(headerMap, field);
  return index >= 0 ? parseNumber(row[index]) : null;
}

function readOptionalNumber(row: RawRow, headerMap: Map<number, HeaderField>, field: HeaderField, defaultValue: number): number {
  return readParsedNumber(row, headerMap, field) ?? defaultValue;
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
      const field = resolveHeaderField(headerValue);
      if (field) headerMap.set(index, field);
    });

    const mappedFields = Array.from(headerMap.values());
    const missingColumns = REQUIRED_COLUMNS.filter(({ field }) => !mappedFields.includes(field));
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
      const rowErrors: string[] = [];

      const materialCode = toText(row[getHeaderIndex(headerMap, "materialCode")]);
      const description = toText(row[getHeaderIndex(headerMap, "description")]);
      const center = toText(row[getHeaderIndex(headerMap, "center")]);
      const evaluatedStockTotal = readParsedNumber(row, headerMap, "evaluatedStockTotal");
      const averagePrice = readParsedNumber(row, headerMap, "averagePrice");
      const consumption2021 = readOptionalNumber(row, headerMap, "consumption2021", 0);
      const consumption2022 = readOptionalNumber(row, headerMap, "consumption2022", 0);
      const consumption2023 = readOptionalNumber(row, headerMap, "consumption2023", 0);
      const consumption2024 = readOptionalNumber(row, headerMap, "consumption2024", 0);
      const consumption2025 = readOptionalNumber(row, headerMap, "consumption2025", 0);
      const consumption2026 = readOptionalNumber(row, headerMap, "consumption2026", 0);

      if (!materialCode) rowErrors.push("Material é obrigatório.");
      if (!description) rowErrors.push("Descrição é obrigatória.");
      if (!center) rowErrors.push("Centro é obrigatório.");
      if (evaluatedStockTotal == null) rowErrors.push("Estoque avaliado total é obrigatório e deve ser numérico.");
      if (averagePrice == null) rowErrors.push("Preço Médio é obrigatório e deve ser numérico.");

      const itemKey = buildStockItemTitle(center, materialCode);
      if (rowErrors.length === 0 && seenKeys.has(itemKey)) {
        rowErrors.push("material duplicado para o mesmo centro.");
      }

      rowErrors.forEach((message) => errors.push({ row: line, message }));
      if (rowErrors.length > 0) return;

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
