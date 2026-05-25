import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { MATERIAL_REQUEST_FIELDS } from "../sharepointFields";

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

function stringifyNumberForSharePoint(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function mapSharePointMaterialRequest(item: unknown): MaterialRequest {
  const source = asRecord(item);

  return {
    id: parseNumberFromSharePointText(readFieldValue(source, "Id")) ?? undefined,
    title: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.title)),
    requesterName: getStringField(source, MATERIAL_REQUEST_FIELDS.requesterName),
    requesterEmail: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.requesterEmail)),
    materialCode: getStringField(source, MATERIAL_REQUEST_FIELDS.materialCode),
    materialDescription: getStringField(source, MATERIAL_REQUEST_FIELDS.materialDescription),
    center: getStringField(source, MATERIAL_REQUEST_FIELDS.center),
    requestedQuantity: parseNumberFromSharePointText(getStringField(source, MATERIAL_REQUEST_FIELDS.requestedQuantity)) ?? 0,
    evaluatedStockTotalAtRequest: parseNumberFromSharePointText(
      getStringField(source, MATERIAL_REQUEST_FIELDS.evaluatedStockTotal)
    ),
    stockRecommendation: getStringField(source, MATERIAL_REQUEST_FIELDS.stockRecommendation) as MaterialRequest["stockRecommendation"],
    requestReason: getStringField(source, MATERIAL_REQUEST_FIELDS.requestReason),
    requesterJustification: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.requesterJustification)),
    status: getStringField(source, MATERIAL_REQUEST_FIELDS.requestStatus) as MaterialRequest["status"],
    ctoJustification: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoJustification)),
    ctoApproverName: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoApproverName)),
    ctoApproverEmail: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoApproverEmail)),
    ctoDecisionDate: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoDecisionDate))
  };
}

export function mapMaterialRequestToSharePointPayload(request: MaterialRequest): Record<string, unknown> {
  return {
    [MATERIAL_REQUEST_FIELDS.title]: request.title ?? "",
    [MATERIAL_REQUEST_FIELDS.requesterName]: request.requesterName ?? "",
    [MATERIAL_REQUEST_FIELDS.requesterEmail]: request.requesterEmail ?? "",
    [MATERIAL_REQUEST_FIELDS.materialCode]: request.materialCode ?? "",
    [MATERIAL_REQUEST_FIELDS.materialDescription]: request.materialDescription ?? "",
    [MATERIAL_REQUEST_FIELDS.center]: request.center ?? "",
    [MATERIAL_REQUEST_FIELDS.requestedQuantity]: stringifyNumberForSharePoint(request.requestedQuantity),
    [MATERIAL_REQUEST_FIELDS.evaluatedStockTotal]: stringifyNumberForSharePoint(request.evaluatedStockTotalAtRequest),
    [MATERIAL_REQUEST_FIELDS.stockRecommendation]: request.stockRecommendation ?? "",
    [MATERIAL_REQUEST_FIELDS.requestReason]: request.requestReason ?? "",
    [MATERIAL_REQUEST_FIELDS.requesterJustification]: request.requesterJustification ?? "",
    [MATERIAL_REQUEST_FIELDS.requestStatus]: request.status ?? "",
    [MATERIAL_REQUEST_FIELDS.ctoJustification]: request.ctoJustification ?? "",
    [MATERIAL_REQUEST_FIELDS.ctoApproverName]: request.ctoApproverName ?? "",
    [MATERIAL_REQUEST_FIELDS.ctoApproverEmail]: request.ctoApproverEmail ?? "",
    [MATERIAL_REQUEST_FIELDS.ctoDecisionDate]: request.ctoDecisionDate ?? ""
  };
}
