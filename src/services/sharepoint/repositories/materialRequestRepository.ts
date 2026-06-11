import type { MaterialRequest, MaterialRequestAttachment } from "../../../domain/materialRequest/types";
import {
  mapMaterialRequestToSharePointPayload,
  mapMaterialRequestToUpdatePayload,
  mapSharePointMaterialRequest,
  type MaterialRequestSharePointItem
} from "../mappers/materialRequestMapper";
import { MATERIAL_REQUEST_FIELDS, MATERIAL_REQUEST_TECHNICAL_FIELDS } from "../sharepointFields";
import { SHAREPOINT_LISTS } from "../sharepointLists";
import { spConfig } from "../spConfig";
import { getDigest, spDelete, spGetJson, spPatchJson, spPostJson } from "../spHttp";

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[]; __next?: string };
  "@odata.nextLink"?: string;
  "odata.nextLink"?: string;
};

type SpRecord = Record<string, unknown>;

const MATERIAL_REQUEST_SYSTEM_SELECT_FIELDS = ["Id", "Created", "Modified"] as const;

const SHAREPOINT_TEXT_ERROR_MESSAGE = "Não foi possível salvar a solicitação. Verifique os campos preenchidos e tente novamente.";

const FORBIDDEN_MATERIAL_REQUEST_PAYLOAD_KEYS = new Set([
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

function isComplexPayloadValue(value: unknown): boolean {
  return value !== null && (Array.isArray(value) || typeof value === "object" || typeof value === "function");
}

function isDevEnvironment(): boolean {
  return Boolean(import.meta.env?.DEV);
}

function inspectMaterialRequestPayload(payload: Record<string, unknown>, operation: "create" | "update"): void {
  const invalidEntries = Object.entries(payload).flatMap(([key, value]) => {
    if (FORBIDDEN_MATERIAL_REQUEST_PAYLOAD_KEYS.has(key)) return [{ key, reason: "attachment/file key" }];
    if (value === undefined) return [{ key, reason: "undefined" }];
    if (isComplexPayloadValue(value)) return [{ key, reason: Array.isArray(value) ? "array" : typeof value }];
    return [];
  });

  if (invalidEntries.length === 0) return;

  if (isDevEnvironment()) {
    console.warn(`[MaterialRequests payload] Campos inválidos encontrados antes do ${operation}.`, invalidEntries);
  }

  throw new Error(SHAREPOINT_TEXT_ERROR_MESSAGE);
}

function buildMaterialRequestSaveError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  const normalizedDetail = detail.toLowerCase();
  if (normalizedDetail.includes("post 500")
    || normalizedDetail.includes("patch(merge) 500")
    || normalizedDetail.includes("valor inválido para texto")
    || normalizedDetail.includes("invalid text")) {
    if (isDevEnvironment()) console.error("[MaterialRequests payload] SharePoint recusou texto do payload.", error);
    return new Error(SHAREPOINT_TEXT_ERROR_MESSAGE);
  }

  return error instanceof Error ? error : new Error(detail);
}

function readItems(data: ODataListResponse<SpRecord>): SpRecord[] {
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.d?.results)) return data.d.results;
  return [];
}

function readNextLink(data: ODataListResponse<SpRecord>): string | null {
  return data["@odata.nextLink"] ?? data["odata.nextLink"] ?? data.d?.__next ?? null;
}

async function getAllPagedItems(url: string): Promise<SpRecord[]> {
  const items: SpRecord[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const data = await spGetJson<ODataListResponse<SpRecord>>(nextUrl);
    items.push(...readItems(data));
    nextUrl = readNextLink(data);
  }

  return items;
}

function buildListItemsUrl(): string {
  return `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(SHAREPOINT_LISTS.materialRequests)}')/items`;
}

function buildSelectClause(): string {
  return [
    ...MATERIAL_REQUEST_SYSTEM_SELECT_FIELDS,
    ...Object.values(MATERIAL_REQUEST_FIELDS),
    ...Object.values(MATERIAL_REQUEST_TECHNICAL_FIELDS),
  ].join(",");
}

export async function getMaterialRequests(): Promise<MaterialRequest[]> {
  const url = `${buildListItemsUrl()}?$select=${buildSelectClause()}&$orderby=Id desc&$top=5000`;
  const items = await getAllPagedItems(url) as MaterialRequestSharePointItem[];
  return items.map(mapSharePointMaterialRequest);
}

export async function getMaterialRequestById(id: number): Promise<MaterialRequest | null> {
  const url = `${buildListItemsUrl()}(${id})?$select=${buildSelectClause()}`;

  try {
    const data = await spGetJson<MaterialRequestSharePointItem>(url);
    return mapSharePointMaterialRequest(data);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GET 404")) return null;
    throw error;
  }
}

export async function createMaterialRequest(request: MaterialRequest): Promise<MaterialRequest> {
  const digest = await getDigest();
  const payload = mapMaterialRequestToSharePointPayload(request);
  inspectMaterialRequestPayload(payload, "create");

  try {
    const created = await spPostJson<MaterialRequestSharePointItem>(buildListItemsUrl(), payload, digest);
    return mapSharePointMaterialRequest(created);
  } catch (error) {
    throw buildMaterialRequestSaveError(error);
  }
}

export async function updateMaterialRequest(id: number, patch: Partial<MaterialRequest>): Promise<MaterialRequest> {
  const digest = await getDigest();
  const itemUrl = `${buildListItemsUrl()}(${id})`;

  const payload = mapMaterialRequestToUpdatePayload(patch);
  inspectMaterialRequestPayload(payload, "update");

  try {
    await spPatchJson(itemUrl, payload, digest);
  } catch (error) {
    throw buildMaterialRequestSaveError(error);
  }

  const updated = await spGetJson<MaterialRequestSharePointItem>(`${itemUrl}?$select=${buildSelectClause()}`);
  return mapSharePointMaterialRequest(updated);
}

export async function deleteMaterialRequest(id: number): Promise<void> {
  const digest = await getDigest();
  const itemUrl = `${buildListItemsUrl()}(${id})`;
  await spDelete(itemUrl, digest);
}


function encodeODataString(value: string): string {
  return encodeURIComponent(value.replace(/'/g, "''"))
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function validateAttachmentFileForUpload(file: File): void {
  const fileName = file?.name?.trim();
  if (!fileName) {
    throw new Error("Informe o nome do arquivo que será anexado.");
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error(`O arquivo “${fileName}” está vazio e não pode ser anexado.`);
  }
}

export async function deleteAttachmentFromMaterialRequest(requestId: number, fileName: string): Promise<void> {
  const digest = await getDigest();
  const encodedFileName = encodeODataString(fileName);
  const url = `${buildListItemsUrl()}(${requestId})/AttachmentFiles/getByFileName('${encodedFileName}')`;
  await spDelete(url, digest);
}

function buildAttachmentUploadError(fileName: string, status: number, detail: string): Error {
  const normalizedDetail = detail.toLowerCase();
  if (status === 409 || normalizedDetail.includes("already exists") || normalizedDetail.includes("já existe")) {
    return new Error(`Já existe um anexo chamado “${fileName}”. Renomeie o arquivo e tente novamente.`);
  }

  return new Error(`Falha ao anexar o arquivo “${fileName}”. (${status}) ${detail}`);
}

export async function addAttachmentToMaterialRequest(
  requestId: number,
  file: File,
  digest?: string,
): Promise<void> {
  validateAttachmentFileForUpload(file);
  const requestDigest = digest ?? await getDigest();
  const rawFileName = file.name.trim();
  const fileName = encodeODataString(rawFileName);
  const url = `${buildListItemsUrl()}(${requestId})/AttachmentFiles/add(FileName='${fileName}')`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json;odata=nometadata",
      "Content-Type": "application/octet-stream",
      "X-RequestDigest": requestDigest,
    },
    body: file,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw buildAttachmentUploadError(rawFileName, res.status, txt);
  }
}

export async function addAttachmentsToMaterialRequest(
  requestId: number,
  files: File[],
): Promise<void> {
  const validFiles = files.filter(Boolean);
  if (validFiles.length === 0) return;

  const digest = await getDigest();
  const failedFiles: string[] = [];

  for (const file of validFiles) {
    try {
      await addAttachmentToMaterialRequest(requestId, file, digest);
    } catch (error) {
      failedFiles.push(error instanceof Error ? error.message : `Falha ao anexar o arquivo “${file.name}”.`);
    }
  }

  if (failedFiles.length > 0) {
    throw new Error(failedFiles.join("\n"));
  }
}

function readOptionalString(record: SpRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return undefined;
}

function readOptionalNumber(record: SpRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }

  return undefined;
}

function buildAttachmentOpenUrl(serverRelativeUrl: string): string {
  return new URL(serverRelativeUrl, `${spConfig.siteUrl}/`).toString();
}

export async function listAttachmentsByRequestId(requestId: number): Promise<MaterialRequestAttachment[]> {
  if (!Number.isInteger(requestId) || requestId <= 0) return [];

  const url = `${buildListItemsUrl()}(${requestId})/AttachmentFiles`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);

  return readItems(data).flatMap((record) => {
    const fileName = readOptionalString(record, "FileName", "fileName");
    const serverRelativeUrl = readOptionalString(record, "ServerRelativeUrl", "serverRelativeUrl");
    if (!fileName || !serverRelativeUrl) return [];

    return [{
      fileName,
      serverRelativeUrl,
      url: buildAttachmentOpenUrl(serverRelativeUrl),
      size: readOptionalNumber(record, "Length", "length", "Size", "size"),
      createdAt: readOptionalString(record, "TimeCreated", "timeCreated", "Created", "createdAt"),
    }];
  });
}
