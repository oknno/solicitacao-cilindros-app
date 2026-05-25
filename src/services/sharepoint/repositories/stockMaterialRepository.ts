import type { StockMaterial } from "../../../domain/materialRequest/stockTypes";
import { spConfig } from "../spConfig";
import { spGetJson } from "../spHttp";
import { escapeODataFilterLiterals } from "../odataFilter";
import { mapSharePointStockMaterial, type StockMaterialSharePointFields } from "../mappers/stockMaterialMapper";
import { SHAREPOINT_LISTS } from "../sharepointLists";
import { STOCK_FIELDS } from "../sharepointFields";

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[] };
};

type SpRecord = Record<string, unknown>;

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

export const stockMaterialRepositoryConfig = {
  STOCK_LIST_NAME,
  STOCK_FIELDS,
  STOCK_SEARCH_LIMIT
} as const;
