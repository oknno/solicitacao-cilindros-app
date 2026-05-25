import type { MaterialRequestHistoryEntry } from "../../../domain/materialRequest/historyTypes";
import { MATERIAL_REQUEST_HISTORY_FIELDS } from "../sharepointFields";

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

function getStringField(item: SpRecord, fieldName: string): string {
  const value = readFieldValue(item, fieldName);
  return value == null ? "" : String(value);
}

function parseNumberFromSharePointText(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function mapSharePointMaterialRequestHistory(item: unknown): MaterialRequestHistoryEntry {
  const source = asRecord(item);

  return {
    id: parseNumberFromSharePointText(readFieldValue(source, "Id")) ?? undefined,
    requestId: parseNumberFromSharePointText(getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.requestId)) ?? 0,
    action: getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.action) as MaterialRequestHistoryEntry["action"],
    previousStatus: optionalString(getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.previousStatus)) as MaterialRequestHistoryEntry["previousStatus"],
    newStatus: getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.newStatus) as MaterialRequestHistoryEntry["newStatus"],
    performedByName: getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.performedByName),
    performedByEmail: optionalString(getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.performedByEmail)),
    performedAt: getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.performedAt),
    comment: optionalString(getStringField(source, MATERIAL_REQUEST_HISTORY_FIELDS.comment))
  };
}

export function mapMaterialRequestHistoryToSharePointPayload(entry: MaterialRequestHistoryEntry): Record<string, unknown> {
  return {
    [MATERIAL_REQUEST_HISTORY_FIELDS.title]: `REQ-${entry.requestId}-${entry.action}`,
    [MATERIAL_REQUEST_HISTORY_FIELDS.requestId]: String(entry.requestId),
    [MATERIAL_REQUEST_HISTORY_FIELDS.action]: entry.action,
    [MATERIAL_REQUEST_HISTORY_FIELDS.previousStatus]: entry.previousStatus ?? "",
    [MATERIAL_REQUEST_HISTORY_FIELDS.newStatus]: entry.newStatus,
    [MATERIAL_REQUEST_HISTORY_FIELDS.performedByName]: entry.performedByName,
    [MATERIAL_REQUEST_HISTORY_FIELDS.performedByEmail]: entry.performedByEmail ?? "",
    [MATERIAL_REQUEST_HISTORY_FIELDS.performedAt]: entry.performedAt,
    [MATERIAL_REQUEST_HISTORY_FIELDS.comment]: entry.comment ?? ""
  };
}
