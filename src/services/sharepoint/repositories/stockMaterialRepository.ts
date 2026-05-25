import type { StockMaterial } from "../../../domain/materialRequest/stockTypes";
import { spConfig } from "../spConfig";
import { getDigest, spGetJson, spPostJson } from "../spHttp";
import { escapeODataFilterLiterals } from "../odataFilter";
import { mapSharePointStockMaterial, type StockMaterialSharePointFields } from "../mappers/stockMaterialMapper";
import { SHAREPOINT_LISTS } from "../sharepointLists";
import { STOCK_FIELDS } from "../sharepointFields";

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[] };
};

type SpRecord = Record<string, unknown>;
type StockMaterialRecord = StockMaterial & { id?: number };
const BATCH_SIZE = 50;

const STOCK_SEARCH_LIMIT = 20;

const STOCK_LIST_NAME = SHAREPOINT_LISTS.stockItems;

const STOCK_MATERIAL_FIELDS: StockMaterialSharePointFields = {
  materialCode: STOCK_FIELDS.materialCode,
  description: STOCK_FIELDS.description,
  center: STOCK_FIELDS.center,
  evaluatedStockTotal: STOCK_FIELDS.evaluatedStockTotal
};

function readItems(data: ODataListResponse<SpRecord>): SpRecord[] {
  if (Array.isArray(data.value)) return data.value;
  if (Array.isArray(data.d?.results)) return data.d.results;
  return [];
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
    STOCK_FIELDS.importDate
  ].join(",");
}

function normalizeQueryText(value: string): string {
  return value.trim();
}

export async function findStockMaterialByCode(materialCode: string): Promise<StockMaterial | null> {
  const normalizedMaterialCode = normalizeQueryText(materialCode);
  if (!normalizedMaterialCode) return null;

  const filter = `${STOCK_FIELDS.materialCode} eq '${normalizedMaterialCode}'`;
  const url =
    `${buildListItemsUrl()}?$select=${buildSelectClause()}` +
    `&$filter=${escapeODataFilterLiterals(filter)}` +
    `&$orderby=Id desc` +
    `&$top=1`;

  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  const first = readItems(data)[0];
  if (!first) return null;

  return mapSharePointStockMaterial(first, STOCK_MATERIAL_FIELDS);
}

export async function searchStockMaterials(query: string): Promise<StockMaterial[]> {
  const normalizedQuery = normalizeQueryText(query);
  if (!normalizedQuery) return [];

  const filter =
    `substringof('${normalizedQuery}', ${STOCK_FIELDS.materialCode}) or ` +
    `substringof('${normalizedQuery}', ${STOCK_FIELDS.description})`;

  const url =
    `${buildListItemsUrl()}?$select=${buildSelectClause()}` +
    `&$filter=${escapeODataFilterLiterals(filter)}` +
    `&$orderby=${STOCK_FIELDS.materialCode} asc` +
    `&$top=${STOCK_SEARCH_LIMIT}`;

  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  return readItems(data).map((item) => mapSharePointStockMaterial(item, STOCK_MATERIAL_FIELDS));
}

export async function getAllStockItems(): Promise<StockMaterialRecord[]> {
  const url = `${buildListItemsUrl()}?$select=Id,${buildSelectClause()}&$top=5000`;
  const data = await spGetJson<ODataListResponse<SpRecord>>(url);
  return readItems(data).map((item) => ({
    ...mapSharePointStockMaterial(item, STOCK_MATERIAL_FIELDS),
    id: Number(item.Id ?? 0) || undefined,
  }));
}

async function deleteStockItemById(id: number, digest: string): Promise<void> {
  const url = `${buildListItemsUrl()}(${id})`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json;odata=nometadata",
      "Content-Type": "application/json;odata=nometadata",
      "X-RequestDigest": digest,
      "IF-MATCH": "*",
      "X-HTTP-Method": "DELETE"
    }
  });
  if (!res.ok) throw new Error(`DELETE ${res.status}: ${await res.text()}`);
}

function toPayload(item: StockMaterial): Record<string, string> {
  return {
    [STOCK_FIELDS.title]: item.materialCode,
    [STOCK_FIELDS.materialCode]: item.materialCode,
    [STOCK_FIELDS.description]: item.description,
    [STOCK_FIELDS.center]: item.center,
    [STOCK_FIELDS.evaluatedStockTotal]: String(item.evaluatedStockTotal ?? ""),
    [STOCK_FIELDS.importDate]: new Date().toISOString()
  };
}

async function processInBatches<T>(items: T[], run: (value: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      await run(item);
    }
  }
}

export async function deleteStockItemsByIds(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const digest = await getDigest();
  await processInBatches(ids, async (id) => deleteStockItemById(id, digest));
}

export async function createStockItems(items: StockMaterial[]): Promise<void> {
  if (!items.length) return;
  const digest = await getDigest();
  await processInBatches(items, async (item) => {
    await spPostJson(buildListItemsUrl(), toPayload(item), digest);
  });
}

export async function replaceStockItems(items: StockMaterial[]): Promise<void> {
  const current = await getAllStockItems();
  const ids = current.map((item) => item.id).filter((value): value is number => typeof value === "number");
  await deleteStockItemsByIds(ids);
  await createStockItems(items);
}

export const stockMaterialRepositoryConfig = {
  STOCK_LIST_NAME,
  STOCK_FIELDS,
  STOCK_SEARCH_LIMIT
} as const;
