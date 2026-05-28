import type { StockMaterial } from "../../../domain/materialRequest/stockTypes";
import { buildStockItemTitle } from "../../../domain/materialRequest/buildStockItemTitle";
import { spConfig } from "../spConfig";
import { getDigest, spGetJson } from "../spHttp";
import { escapeODataFilterLiterals } from "../odataFilter";
import {
  mapSharePointStockMaterial,
  mapStockMaterialToSharePointCreatePayload,
  type StockMaterialSharePointFields
} from "../mappers/stockMaterialMapper";
import { SHAREPOINT_LISTS } from "../sharepointLists";
import { STOCK_FIELDS } from "../sharepointFields";
import { chunkArray, executeSharePointBatch, type SharePointBatchRequest } from "../sharepointBatch";

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[]; __next?: string };
  "@odata.nextLink"?: string;
  "odata.nextLink"?: string;
};

type SpRecord = Record<string, unknown>;
type StockMaterialRecord = StockMaterial & { id?: number };

const STOCK_SEARCH_LIMIT = 20;
const STOCK_LIST_NAME = SHAREPOINT_LISTS.stockItems;
const BATCH_SIZE = 100;

export type StockItemsReplaceStage =
  | "LOADING_EXISTING_ITEMS"
  | "DELETING_OLD_ITEMS"
  | "CREATING_NEW_ITEMS";

export type StockItemsReplaceProgress = {
  stage: StockItemsReplaceStage;
  processed: number;
  total: number;
};

const STOCK_MATERIAL_FIELDS: StockMaterialSharePointFields = {
  title: STOCK_FIELDS.title,
  materialCode: STOCK_FIELDS.materialCode,
  description: STOCK_FIELDS.description,
  center: STOCK_FIELDS.center,
  evaluatedStockTotal: STOCK_FIELDS.evaluatedStockTotal,
  totalStockValueBRL: STOCK_FIELDS.totalStockValueBRL,
  consumption2021: STOCK_FIELDS.consumption2021,
  consumption2022: STOCK_FIELDS.consumption2022,
  consumption2023: STOCK_FIELDS.consumption2023,
  consumption2024: STOCK_FIELDS.consumption2024,
  consumption2025: STOCK_FIELDS.consumption2025,
  consumption2026: STOCK_FIELDS.consumption2026,
  historicalTotal: STOCK_FIELDS.historicalTotal,
  consumptionYearsCount: STOCK_FIELDS.consumptionYearsCount,
  averageAnnualConsumption: STOCK_FIELDS.averageAnnualConsumption,
  averagePrice: STOCK_FIELDS.averagePrice,
  importDate: STOCK_FIELDS.importDate
};

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
  return `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(STOCK_LIST_NAME)}')/items`;
}

function buildSelectClause(): string {
  return [
    STOCK_FIELDS.title,
    STOCK_FIELDS.materialCode,
    STOCK_FIELDS.description,
    STOCK_FIELDS.center,
    STOCK_FIELDS.evaluatedStockTotal,
    STOCK_FIELDS.totalStockValueBRL,
    STOCK_FIELDS.consumption2021,
    STOCK_FIELDS.consumption2022,
    STOCK_FIELDS.consumption2023,
    STOCK_FIELDS.consumption2024,
    STOCK_FIELDS.consumption2025,
    STOCK_FIELDS.consumption2026,
    STOCK_FIELDS.historicalTotal,
    STOCK_FIELDS.consumptionYearsCount,
    STOCK_FIELDS.averageAnnualConsumption,
    STOCK_FIELDS.averagePrice,
    STOCK_FIELDS.importDate
  ].join(",");
}

function normalizeQueryText(value: string): string {
  return value.trim();
}

export async function findStockMaterialByCode(materialCode: string): Promise<StockMaterial | null> { /* unchanged */
  const normalizedMaterialCode = normalizeQueryText(materialCode);
  if (!normalizedMaterialCode) return null;
  const filter = `${STOCK_FIELDS.materialCode} eq '${normalizedMaterialCode}'`;
  const url = `${buildListItemsUrl()}?$select=${buildSelectClause()}&$filter=${escapeODataFilterLiterals(filter)}&$orderby=Id desc&$top=1`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  const first = readItems(data)[0];
  if (!first) return null;
  return mapSharePointStockMaterial(first, STOCK_MATERIAL_FIELDS);
}



export async function getStockCenters(): Promise<string[]> {
  const url = `${buildListItemsUrl()}?$select=${STOCK_FIELDS.center}&$top=5000`;
  const items = await getAllPagedItems(url);
  return items
    .map((item) => String(item[STOCK_FIELDS.center] ?? "").trim())
    .filter(Boolean);
}

export async function getStockMaterialsByCenter(center: string): Promise<StockMaterial[]> {
  const normalizedCenter = normalizeQueryText(center);
  if (!normalizedCenter) return [];
  const filter = `${STOCK_FIELDS.center} eq '${normalizedCenter}'`;
  const url = `${buildListItemsUrl()}?$select=${buildSelectClause()}&$filter=${escapeODataFilterLiterals(filter)}&$orderby=${STOCK_FIELDS.materialCode} asc&$top=5000`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  return readItems(data).map((item) => mapSharePointStockMaterial(item, STOCK_MATERIAL_FIELDS));
}
export async function findStockMaterialByCenterAndCode(input: { center: string; materialCode: string; }): Promise<StockMaterial | null> {
  const normalizedCenter = normalizeQueryText(input.center);
  const normalizedMaterialCode = normalizeQueryText(input.materialCode);
  if (!normalizedCenter || !normalizedMaterialCode) return null;
  const filter = `${STOCK_FIELDS.center} eq '${normalizedCenter}' and ${STOCK_FIELDS.materialCode} eq '${normalizedMaterialCode}'`;
  const url = `${buildListItemsUrl()}?$select=${buildSelectClause()}&$filter=${escapeODataFilterLiterals(filter)}&$orderby=Id desc&$top=1`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  const first = readItems(data)[0];
  if (!first) return null;
  return mapSharePointStockMaterial(first, STOCK_MATERIAL_FIELDS);
}

export async function searchStockMaterials(query: string): Promise<StockMaterial[]> {
  const normalizedQuery = normalizeQueryText(query);
  if (!normalizedQuery) return [];
  const filter = `substringof('${normalizedQuery}', ${STOCK_FIELDS.materialCode}) or substringof('${normalizedQuery}', ${STOCK_FIELDS.description})`;
  const url = `${buildListItemsUrl()}?$select=${buildSelectClause()}&$filter=${escapeODataFilterLiterals(filter)}&$orderby=${STOCK_FIELDS.materialCode} asc&$top=${STOCK_SEARCH_LIMIT}`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  return readItems(data).map((item) => mapSharePointStockMaterial(item, STOCK_MATERIAL_FIELDS));
}

export async function getAllStockItems(): Promise<StockMaterialRecord[]> {
  const url = `${buildListItemsUrl()}?$select=Id,${buildSelectClause()}&$top=5000`;
  const items = await getAllPagedItems(url);
  return items.map((item) => ({ ...mapSharePointStockMaterial(item, STOCK_MATERIAL_FIELDS), id: Number(item.Id ?? 0) || undefined }));
}

export async function getAllStockItemIds(): Promise<number[]> {
  const url = `${buildListItemsUrl()}?$select=Id&$top=5000`;
  const items = await getAllPagedItems(url);
  return items
    .map((item) => Number(item.Id ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function toPayload(item: StockMaterial): Record<string, string> {
  return mapStockMaterialToSharePointCreatePayload(item, STOCK_MATERIAL_FIELDS, {
    title: buildStockItemTitle(item.center, item.materialCode),
    importDate: new Date().toISOString()
  });
}

export async function deleteStockItemsByIds(ids: number[], options?: { onProgress?: (progress: StockItemsReplaceProgress) => void }): Promise<void> {
  if (!ids.length) return;
  const digest = await getDigest();
  let processed = 0;
  for (const idsChunk of chunkArray(ids, BATCH_SIZE)) {
    const requests: SharePointBatchRequest[] = idsChunk.map((id) => ({
      method: "DELETE",
      url: `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(STOCK_LIST_NAME)}')/items(${id})`,
      headers: { "IF-MATCH": "*", "X-HTTP-Method": "DELETE" }
    }));
    await executeSharePointBatch(requests, digest);
    processed += idsChunk.length;
    options?.onProgress?.({ stage: "DELETING_OLD_ITEMS", processed, total: ids.length });
  }
}

export async function createStockItemsBatch(items: StockMaterial[], options?: { onProgress?: (progress: StockItemsReplaceProgress) => void }): Promise<void> {
  if (!items.length) return;
  const digest = await getDigest();
  let processed = 0;
  for (const itemsChunk of chunkArray(items, BATCH_SIZE)) {
    const requests: SharePointBatchRequest[] = itemsChunk.map((item) => ({
      method: "POST",
      url: `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(STOCK_LIST_NAME)}')/items`,
      body: toPayload(item)
    }));
    await executeSharePointBatch(requests, digest);
    processed += itemsChunk.length;
    options?.onProgress?.({ stage: "CREATING_NEW_ITEMS", processed, total: items.length });
  }
}

export async function replaceStockItems(
  items: StockMaterial[],
  options?: { onProgress?: (progress: StockItemsReplaceProgress) => void }
): Promise<{ deletedCount: number; createdCount: number }> {
  options?.onProgress?.({ stage: "LOADING_EXISTING_ITEMS", processed: 0, total: 0 });
  const ids = await getAllStockItemIds();

  // Observação: este fluxo usa apagar + recriar. Se houver falha na criação, a base pode ficar parcial.
  await deleteStockItemsByIds(ids, options);
  await createStockItemsBatch(items, options);
  return { deletedCount: ids.length, createdCount: items.length };
}

export const stockMaterialRepositoryConfig = { STOCK_LIST_NAME, STOCK_FIELDS, STOCK_SEARCH_LIMIT } as const;
