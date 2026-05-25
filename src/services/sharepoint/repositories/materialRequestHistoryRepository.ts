import type { MaterialRequestHistoryEntry } from "../../../domain/materialRequest/historyTypes";
import {
  mapMaterialRequestHistoryToSharePointPayload,
  mapSharePointMaterialRequestHistory
} from "../mappers/materialRequestHistoryMapper";
import { MATERIAL_REQUEST_HISTORY_FIELDS } from "../sharepointFields";
import { SHAREPOINT_LISTS } from "../sharepointLists";
import { spConfig } from "../spConfig";
import { getDigest, spGetJson, spPostJson } from "../spHttp";

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
  return `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(SHAREPOINT_LISTS.materialRequestHistory)}')/items`;
}

function buildSelectClause(): string {
  return ["Id", ...Object.values(MATERIAL_REQUEST_HISTORY_FIELDS)].join(",");
}

export async function getMaterialRequestHistory(requestId: number): Promise<MaterialRequestHistoryEntry[]> {
  const filter = `${MATERIAL_REQUEST_HISTORY_FIELDS.requestId} eq '${String(requestId)}'`;
  const url =
    `${buildListItemsUrl()}?$select=${buildSelectClause()}` +
    `&$filter=${encodeURIComponent(filter)}` +
    `&$orderby=${MATERIAL_REQUEST_HISTORY_FIELDS.performedAt} asc`;

  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  return readItems(data).map(mapSharePointMaterialRequestHistory);
}

export async function createMaterialRequestHistoryEntry(
  entry: MaterialRequestHistoryEntry
): Promise<MaterialRequestHistoryEntry> {
  const digest = await getDigest();
  const created = await spPostJson<SpRecord>(buildListItemsUrl(), mapMaterialRequestHistoryToSharePointPayload(entry), digest);
  return mapSharePointMaterialRequestHistory(created);
}
