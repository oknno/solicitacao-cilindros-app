import type { StockMaterial } from "../../../domain/materialRequest/stockTypes";

type SpRecord = Record<string, unknown>;

function asRecord(value: unknown): SpRecord {
  return value && typeof value === "object" ? (value as SpRecord) : {};
}

function readFieldValue(source: SpRecord, fieldName: string): unknown {
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

export type StockMaterialSharePointFields = {
  materialCode: string;
  description: string;
  center: string;
  evaluatedStockTotal: string;
};

export function mapSharePointStockMaterial(
  item: unknown,
  fields: StockMaterialSharePointFields
): StockMaterial {
  const source = asRecord(item);

  return {
    materialCode: readString(source, fields.materialCode),
    description: readString(source, fields.description),
    center: readString(source, fields.center),
    evaluatedStockTotal: readNullableNumber(source, fields.evaluatedStockTotal)
  };
}
