import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { normalizeMaterialRequestStatus } from "../../../domain/materialRequest/status";
import { normalizeCenter } from "../../../domain/materialRequest/normalizeCenter";
import { MATERIAL_REQUEST_FIELDS, MATERIAL_REQUEST_TECHNICAL_FIELDS } from "../sharepointFields";

type SpRecord = Record<string, unknown>;

const COMPLEX_TEXT_VALUE_MESSAGE = "Valor complexo removido do payload de texto da MaterialRequests.";

const FORBIDDEN_ATTACHMENT_FIELD_NAMES = new Set([
  "attachments",
  "attachment",
  "selectedFiles",
  "files",
  "file",
  "File",
  "File[]",
  "Blob",
  "AttachmentFiles",
  "supportFiles",
  "anexos",
  "anexo",
  "attachmentFiles",
]);

function isDevEnvironment(): boolean {
  return Boolean(import.meta.env?.DEV);
}

function isFileLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (typeof Blob !== "undefined" && value instanceof Blob) return true;

  const candidate = value as { name?: unknown; size?: unknown; type?: unknown; arrayBuffer?: unknown };
  return typeof candidate.name === "string"
    && typeof candidate.size === "number"
    && typeof candidate.arrayBuffer === "function";
}

function diagnoseInvalidTextValue(fieldName: string, value: unknown, reason: string): void {
  if (!isDevEnvironment()) return;
  console.warn(`[MaterialRequests payload] ${COMPLEX_TEXT_VALUE_MESSAGE}`, {
    fieldName,
    reason,
    valueType: Array.isArray(value) ? "array" : typeof value,
  });
}

function toSharePointText(value: unknown, fieldName: string): string {
  if (value === undefined || value === null) return "";
  if (isFileLike(value)) {
    diagnoseInvalidTextValue(fieldName, value, "File/Blob");
    return "";
  }
  if (Array.isArray(value)) {
    diagnoseInvalidTextValue(fieldName, value, "array");
    return "";
  }
  if (typeof value === "function") {
    diagnoseInvalidTextValue(fieldName, value, "function");
    return "";
  }
  if (typeof value === "object") {
    diagnoseInvalidTextValue(fieldName, value, "object");
    return "";
  }

  return String(value).split("\u0000").join("");
}

function setTextIfDefined(payload: Record<string, unknown>, fieldName: string, value: unknown): void {
  if (value !== undefined) payload[fieldName] = toSharePointText(value, fieldName);
}

function stripForbiddenPayloadKeys(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_ATTACHMENT_FIELD_NAMES.has(key)) {
      diagnoseInvalidTextValue(key, value, "forbidden attachment payload key");
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

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

function stringifyNumberForSharePoint(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";

  return toSharePointText(value, "numberText");
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
    center: normalizeCenter(getStringField(source, MATERIAL_REQUEST_FIELDS.center)),
    technicalData: {
      refrol: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.refrol)),
      site: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.site)),
      mill: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.mill)),
      standType: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.standType)),
      rollType: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.rollType)),
      standLocalName: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.standLocalName)),
      profile: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.profile)),
      profileCode: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.profileCode)),
      rollDrawing: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.rollDrawing)),
      groovesCaliberDrawing: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.groovesCaliberDrawing)),
      calibrationNeed: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.calibrationNeed)),
      diamExt: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.diamExt)),
      scrapDiam: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.scrapDiam)),
      diamInt: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.diamInt)),
      lengthTable: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.lengthTable)),
      lengthTotal: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.lengthTotal)),
      finalWeight: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.finalWeight)),
      neededHardness: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.neededHardness)),
      technology: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.technology)),
      grade: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.grade)),
      delivery: optionalString(getStringField(source, MATERIAL_REQUEST_TECHNICAL_FIELDS.delivery)),
    },
    requestedQuantity: parseNumberFromSharePointText(getStringField(source, MATERIAL_REQUEST_FIELDS.requestedQuantity)) ?? 0,
    evaluatedStockTotalAtRequest: parseNumberFromSharePointText(
      getStringField(source, MATERIAL_REQUEST_FIELDS.evaluatedStockTotal)
    ),
    stockRecommendation: getStringField(source, MATERIAL_REQUEST_FIELDS.stockRecommendation) as MaterialRequest["stockRecommendation"],
    requestReason: getStringField(source, MATERIAL_REQUEST_FIELDS.requestReason),
    requesterJustification: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.requesterJustification)),
    status: normalizeMaterialRequestStatus(getStringField(source, MATERIAL_REQUEST_FIELDS.requestStatus)),
    laminationManagerName: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.laminationManagerName)),
    laminationManagerEmail: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.laminationManagerEmail)),
    laminationManagerJustification: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.laminationManagerJustification)),
    laminationManagerDecisionDate: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.laminationManagerDecisionDate)),
    ctoJustification: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoJustification)),
    ctoApproverName: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoApproverName)),
    ctoApproverEmail: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoApproverEmail)),
    ctoDecisionDate: optionalString(getStringField(source, MATERIAL_REQUEST_FIELDS.ctoDecisionDate)),
    createdAt: optionalString(getStringField(source, "Created")),
    updatedAt: optionalString(getStringField(source, "Modified"))
  };
}

export function mapMaterialRequestToSharePointPayload(request: MaterialRequest): Record<string, unknown> {
  const technicalPayload = Object.fromEntries(Object.entries(MATERIAL_REQUEST_TECHNICAL_FIELDS).map(([key, fieldName]) => [
    fieldName,
    toSharePointText(request.technicalData?.[key as keyof NonNullable<MaterialRequest["technicalData"]>], fieldName),
  ]));

  return stripForbiddenPayloadKeys({
    [MATERIAL_REQUEST_FIELDS.title]: toSharePointText(request.title, MATERIAL_REQUEST_FIELDS.title),
    [MATERIAL_REQUEST_FIELDS.requesterName]: toSharePointText(request.requesterName, MATERIAL_REQUEST_FIELDS.requesterName),
    [MATERIAL_REQUEST_FIELDS.requesterEmail]: toSharePointText(request.requesterEmail, MATERIAL_REQUEST_FIELDS.requesterEmail),
    [MATERIAL_REQUEST_FIELDS.materialCode]: toSharePointText(request.materialCode, MATERIAL_REQUEST_FIELDS.materialCode),
    [MATERIAL_REQUEST_FIELDS.materialDescription]: toSharePointText(request.materialDescription, MATERIAL_REQUEST_FIELDS.materialDescription),
    [MATERIAL_REQUEST_FIELDS.center]: toSharePointText(request.center, MATERIAL_REQUEST_FIELDS.center),
    ...technicalPayload,
    [MATERIAL_REQUEST_FIELDS.requestedQuantity]: stringifyNumberForSharePoint(request.requestedQuantity),
    [MATERIAL_REQUEST_FIELDS.evaluatedStockTotal]: stringifyNumberForSharePoint(request.evaluatedStockTotalAtRequest),
    [MATERIAL_REQUEST_FIELDS.stockRecommendation]: toSharePointText(request.stockRecommendation, MATERIAL_REQUEST_FIELDS.stockRecommendation),
    [MATERIAL_REQUEST_FIELDS.requestReason]: toSharePointText(request.requestReason, MATERIAL_REQUEST_FIELDS.requestReason),
    [MATERIAL_REQUEST_FIELDS.requesterJustification]: toSharePointText(request.requesterJustification, MATERIAL_REQUEST_FIELDS.requesterJustification),
    [MATERIAL_REQUEST_FIELDS.requestStatus]: toSharePointText(request.status, MATERIAL_REQUEST_FIELDS.requestStatus),
    [MATERIAL_REQUEST_FIELDS.laminationManagerName]: toSharePointText(request.laminationManagerName, MATERIAL_REQUEST_FIELDS.laminationManagerName),
    [MATERIAL_REQUEST_FIELDS.laminationManagerEmail]: toSharePointText(request.laminationManagerEmail, MATERIAL_REQUEST_FIELDS.laminationManagerEmail),
    [MATERIAL_REQUEST_FIELDS.laminationManagerJustification]: toSharePointText(request.laminationManagerJustification, MATERIAL_REQUEST_FIELDS.laminationManagerJustification),
    [MATERIAL_REQUEST_FIELDS.laminationManagerDecisionDate]: toSharePointText(request.laminationManagerDecisionDate, MATERIAL_REQUEST_FIELDS.laminationManagerDecisionDate),
    [MATERIAL_REQUEST_FIELDS.ctoJustification]: toSharePointText(request.ctoJustification, MATERIAL_REQUEST_FIELDS.ctoJustification),
    [MATERIAL_REQUEST_FIELDS.ctoApproverName]: toSharePointText(request.ctoApproverName, MATERIAL_REQUEST_FIELDS.ctoApproverName),
    [MATERIAL_REQUEST_FIELDS.ctoApproverEmail]: toSharePointText(request.ctoApproverEmail, MATERIAL_REQUEST_FIELDS.ctoApproverEmail),
    [MATERIAL_REQUEST_FIELDS.ctoDecisionDate]: toSharePointText(request.ctoDecisionDate, MATERIAL_REQUEST_FIELDS.ctoDecisionDate)
  });
}


export function mapMaterialRequestToUpdatePayload(patch: Partial<MaterialRequest>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.title, patch.title);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.requesterName, patch.requesterName);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.requesterEmail, patch.requesterEmail);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.materialCode, patch.materialCode);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.materialDescription, patch.materialDescription);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.center, patch.center);
  if (patch.technicalData !== undefined) {
    Object.entries(MATERIAL_REQUEST_TECHNICAL_FIELDS).forEach(([key, fieldName]) => {
      payload[fieldName] = toSharePointText(
        patch.technicalData?.[key as keyof NonNullable<MaterialRequest["technicalData"]>],
        fieldName,
      );
    });
  }
  if (patch.requestedQuantity !== undefined) {
    payload[MATERIAL_REQUEST_FIELDS.requestedQuantity] = stringifyNumberForSharePoint(patch.requestedQuantity);
  }
  if (patch.evaluatedStockTotalAtRequest !== undefined) {
    payload[MATERIAL_REQUEST_FIELDS.evaluatedStockTotal] = stringifyNumberForSharePoint(patch.evaluatedStockTotalAtRequest);
  }
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.stockRecommendation, patch.stockRecommendation);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.requestReason, patch.requestReason);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.requesterJustification, patch.requesterJustification);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.requestStatus, patch.status);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.laminationManagerName, patch.laminationManagerName);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.laminationManagerEmail, patch.laminationManagerEmail);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.laminationManagerJustification, patch.laminationManagerJustification);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.laminationManagerDecisionDate, patch.laminationManagerDecisionDate);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.ctoJustification, patch.ctoJustification);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.ctoApproverName, patch.ctoApproverName);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.ctoApproverEmail, patch.ctoApproverEmail);
  setTextIfDefined(payload, MATERIAL_REQUEST_FIELDS.ctoDecisionDate, patch.ctoDecisionDate);

  return stripForbiddenPayloadKeys(payload);
}
