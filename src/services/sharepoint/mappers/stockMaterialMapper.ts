import type { StockMaterial } from "../../../domain/materialRequest/stockTypes";
import { normalizeCenter } from "../../../domain/materialRequest/normalizeCenter";

export type StockMaterialNumericField =
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

type SpRecord = Record<string, unknown>;

function asRecord(value: unknown): SpRecord {
  return value && typeof value === "object" ? (value as SpRecord) : {};
}

function readFieldValue(source: SpRecord, fieldName: string): unknown {
  if (!fieldName) return undefined;
  if (fieldName in source) return source[fieldName];

  const lowerKey = fieldName.toLowerCase();
  for (const [candidateKey, candidateValue] of Object.entries(source)) {
    if (candidateKey.toLowerCase() === lowerKey) return candidateValue;
  }

  return undefined;
}

function readString(source: SpRecord, fieldName: string): string {
  const value = readFieldValue(source, fieldName);
  return value == null ? "" : String(value);
}

function readNullableNumber(source: SpRecord, fieldName: string): number | null {
  const value = readFieldValue(source, fieldName);

  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableNumberToCreateText(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function maybeAddUpdateNumber(
  payload: Record<string, string>,
  fieldName: string,
  value: number | null | undefined
): void {
  if (value === undefined) return;
  payload[fieldName] = value === null ? "" : String(value);
}

export type StockMaterialSharePointFields = Record<StockMaterialNumericField, string> & {
  title: string;
  materialCode: string;
  description: string;
  center: string;
  importDate: string;
};

const NUMERIC_FIELDS: StockMaterialNumericField[] = [
  "evaluatedStockTotal",
  "totalStockValueBRL",
  "consumption2021",
  "consumption2022",
  "consumption2023",
  "consumption2024",
  "consumption2025",
  "consumption2026",
  "historicalTotal",
  "consumptionYearsCount",
  "averageAnnualConsumption",
  "averagePrice"
];

export function mapSharePointStockMaterial(
  item: unknown,
  fields: StockMaterialSharePointFields
): StockMaterial {
  const source = asRecord(item);

  return {
    materialCode: readString(source, fields.materialCode),
    description: readString(source, fields.description),
    center: normalizeCenter(readFieldValue(source, fields.center)),
    evaluatedStockTotal: readNullableNumber(source, fields.evaluatedStockTotal),
    totalStockValueBRL: readNullableNumber(source, fields.totalStockValueBRL),
    consumption2021: readNullableNumber(source, fields.consumption2021),
    consumption2022: readNullableNumber(source, fields.consumption2022),
    consumption2023: readNullableNumber(source, fields.consumption2023),
    consumption2024: readNullableNumber(source, fields.consumption2024),
    consumption2025: readNullableNumber(source, fields.consumption2025),
    consumption2026: readNullableNumber(source, fields.consumption2026),
    historicalTotal: readNullableNumber(source, fields.historicalTotal),
    consumptionYearsCount: readNullableNumber(source, fields.consumptionYearsCount),
    averageAnnualConsumption: readNullableNumber(source, fields.averageAnnualConsumption),
    averagePrice: readNullableNumber(source, fields.averagePrice)
  };
}

export function mapStockMaterialToSharePointCreatePayload(
  item: StockMaterial,
  fields: StockMaterialSharePointFields,
  options: { title: string; importDate: string }
): Record<string, string> {
  const payload: Record<string, string> = {
    [fields.title]: options.title,
    [fields.materialCode]: item.materialCode,
    [fields.description]: item.description,
    [fields.center]: item.center,
    [fields.importDate]: options.importDate
  };

  for (const field of NUMERIC_FIELDS) {
    payload[fields[field]] = nullableNumberToCreateText(item[field]);
  }

  return payload;
}

export function mapStockMaterialToSharePointUpdatePayload(
  item: Partial<StockMaterial>,
  fields: StockMaterialSharePointFields,
  options?: { title?: string; importDate?: string }
): Record<string, string> {
  const payload: Record<string, string> = {};

  if (options?.title !== undefined) payload[fields.title] = options.title;
  if (item.materialCode !== undefined) payload[fields.materialCode] = item.materialCode;
  if (item.description !== undefined) payload[fields.description] = item.description;
  if (item.center !== undefined) payload[fields.center] = item.center;
  if (options?.importDate !== undefined) payload[fields.importDate] = options.importDate;

  for (const field of NUMERIC_FIELDS) {
    maybeAddUpdateNumber(payload, fields[field], item[field]);
  }

  return payload;
}
