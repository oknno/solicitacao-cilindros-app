import type { StockMaterial } from "../../../domain/materialRequest/stockTypes";
import { spConfig } from "../spConfig";
import { spGetJson } from "../spHttp";
import { escapeODataFilterLiterals } from "../odataFilter";
import { mapSharePointStockMaterial, type StockMaterialSharePointFields } from "../mappers/stockMaterialMapper";

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[] };
};

type SpRecord = Record<string, unknown>;

const STOCK_SEARCH_LIMIT = 20;

const STOCK_LIST_NAME = "EstoqueMateriais";

const STOCK_FIELDS: StockMaterialSharePointFields = {
  materialCode: "Material",
  description: "Descricao",
  unitOfMeasure: "UMB",
  center: "Centro",
  evaluatedStockTotal: "EstoqueAvaliadoTotal"
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
  return Object.values(STOCK_FIELDS).join(",");
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

  return mapSharePointStockMaterial(first, STOCK_FIELDS);
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
  return readItems(data).map((item) => mapSharePointStockMaterial(item, STOCK_FIELDS));
}

export const stockMaterialRepositoryConfig = {
  STOCK_LIST_NAME,
  STOCK_FIELDS,
  STOCK_SEARCH_LIMIT
} as const;
