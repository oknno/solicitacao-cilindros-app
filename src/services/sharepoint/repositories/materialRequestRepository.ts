import type { MaterialRequest } from "../../../domain/materialRequest/types";
import {
  mapMaterialRequestToSharePointPayload,
  mapMaterialRequestToUpdatePayload,
  mapSharePointMaterialRequest
} from "../mappers/materialRequestMapper";
import { MATERIAL_REQUEST_FIELDS } from "../sharepointFields";
import { SHAREPOINT_LISTS } from "../sharepointLists";
import { spConfig } from "../spConfig";
import { getDigest, spDelete, spGetJson, spPatchJson, spPostJson } from "../spHttp";

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[] };
};

type SpRecord = Record<string, unknown>;

function readItems(data: ODataListResponse<SpRecord>): SpRecord[] {
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.d?.results)) return data.d.results;
  return [];
}

function buildListItemsUrl(): string {
  return `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(SHAREPOINT_LISTS.materialRequests)}')/items`;
}

function buildSelectClause(): string {
  return ["Id", ...Object.values(MATERIAL_REQUEST_FIELDS)].join(",");
}

export async function getMaterialRequests(): Promise<MaterialRequest[]> {
  const url = `${buildListItemsUrl()}?$select=${buildSelectClause()}&$orderby=Id desc`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  return readItems(data).map(mapSharePointMaterialRequest);
}

export async function getMaterialRequestById(id: number): Promise<MaterialRequest | null> {
  const url = `${buildListItemsUrl()}(${id})?$select=${buildSelectClause()}`;

  try {
    const data = await spGetJson<SpRecord>(url);
    return mapSharePointMaterialRequest(data);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GET 404")) return null;
    throw error;
  }
}

export async function createMaterialRequest(request: MaterialRequest): Promise<MaterialRequest> {
  const digest = await getDigest();
  const created = await spPostJson<SpRecord>(buildListItemsUrl(), mapMaterialRequestToSharePointPayload(request), digest);
  return mapSharePointMaterialRequest(created);
}

export async function updateMaterialRequest(id: number, patch: Partial<MaterialRequest>): Promise<MaterialRequest> {
  const digest = await getDigest();
  const itemUrl = `${buildListItemsUrl()}(${id})`;

  const payload = mapMaterialRequestToUpdatePayload(patch);
  await spPatchJson(itemUrl, payload, digest);

  const updated = await spGetJson<SpRecord>(`${itemUrl}?$select=${buildSelectClause()}`);
  return mapSharePointMaterialRequest(updated);
}

export async function deleteMaterialRequest(id: number): Promise<void> {
  const digest = await getDigest();
  const itemUrl = `${buildListItemsUrl()}(${id})`;
  await spDelete(itemUrl, digest);
}
