export type QuerySortBy = "Title" | "Id" | "approvalYear" | "authorName";
export type QuerySortDir = "asc" | "desc";

export type ProjectQueryComparable = {
  Id: number;
  Title: string;
  approvalYear?: number;
  authorName?: string;
};

export class UnitFilterLimitError extends Error {
  readonly userMessage: string;

  constructor(message: string, userMessage: string) {
    super(message);
    this.name = "UnitFilterLimitError";
    this.userMessage = userMessage;
  }
}

const UNIT_FILTER_CHUNK_SIZE = 15;
const UNIT_FILTER_SINGLE_GET_LIMIT = 20;
const MAX_UNITS_FOR_CHUNKED_FETCH = 180;

function escapeODataString(v: string) {
  return v.replace(/'/g, "''");
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items.slice()];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function buildProjectsBaseFilters(args: {
  searchTitle?: string;
  requesterContains?: string;
  statusEquals?: string;
  unitEquals?: string;
}): string[] {
  const filters: string[] = [];
  if (args.searchTitle?.trim()) filters.push(`substringof('${escapeODataString(args.searchTitle.trim())}',Title)`);
  if (args.requesterContains?.trim()) filters.push(`substringof('${escapeODataString(args.requesterContains.trim())}',Author/Title)`);
  if (args.statusEquals?.trim()) filters.push(`status eq '${escapeODataString(args.statusEquals.trim())}'`);
  if (args.unitEquals?.trim()) filters.push(`unit eq '${escapeODataString(args.unitEquals.trim())}'`);
  return filters;
}

export function buildProjectsQueryPlan(args: {
  searchTitle?: string;
  requesterContains?: string;
  statusEquals?: string;
  unitEquals?: string;
  unitIn?: string[];
  top: number;
  orderExpr: string;
}):
  | { mode: "single"; top: number; orderExpr: string; filters?: string }
  | { mode: "chunked"; top: number; orderExpr: string; chunkFilters: string[] } {
  const baseFilters = buildProjectsBaseFilters(args);
  const normalizedUnits = (args.unitIn ?? []).map((unit) => unit.trim()).filter(Boolean);

  if (normalizedUnits.length === 0 || normalizedUnits.length <= UNIT_FILTER_SINGLE_GET_LIMIT) {
    const unitInFilter = normalizedUnits.length
      ? `(${normalizedUnits.map((unit) => `unit eq '${escapeODataString(unit)}'`).join(" or ")})`
      : undefined;
    const filters = [...baseFilters, ...(unitInFilter ? [unitInFilter] : [])];
    return { mode: "single", top: args.top, orderExpr: args.orderExpr, filters: filters.length ? filters.join(" and ") : undefined };
  }

  if (normalizedUnits.length > MAX_UNITS_FOR_CHUNKED_FETCH) {
    throw new UnitFilterLimitError(
      `unitIn has ${normalizedUnits.length} entries. Max supported is ${MAX_UNITS_FOR_CHUNKED_FETCH}.`,
      "Você possui unidades demais para filtrar de uma vez. Refine os filtros para carregar os projetos."
    );
  }

  const unitChunks = chunkArray(normalizedUnits, UNIT_FILTER_CHUNK_SIZE);
  const chunkFilters = unitChunks.map((chunk) => {
    const unitInFilter = `(${chunk.map((unit) => `unit eq '${escapeODataString(unit)}'`).join(" or ")})`;
    const filters = [...baseFilters, unitInFilter];
    return filters.join(" and ");
  });

  return { mode: "chunked", top: args.top, orderExpr: args.orderExpr, chunkFilters };
}

function compareProjects(a: ProjectQueryComparable, b: ProjectQueryComparable, orderBy: QuerySortBy, orderDir: QuerySortDir): number {
  const direction = orderDir === "asc" ? 1 : -1;
  const compareString = (left?: string, right?: string): number => {
    const lv = (left ?? "").toLocaleLowerCase();
    const rv = (right ?? "").toLocaleLowerCase();
    if (lv < rv) return -1;
    if (lv > rv) return 1;
    return 0;
  };
  const compareNumber = (left?: number, right?: number): number => {
    const lv = left ?? Number.NEGATIVE_INFINITY;
    const rv = right ?? Number.NEGATIVE_INFINITY;
    return lv - rv;
  };

  const primaryRaw =
    orderBy === "Title"
      ? compareString(a.Title, b.Title)
      : orderBy === "approvalYear"
        ? compareNumber(a.approvalYear, b.approvalYear)
        : orderBy === "authorName"
          ? compareString(a.authorName, b.authorName)
          : a.Id - b.Id;
  if (primaryRaw !== 0) return primaryRaw * direction;

  const idRaw = a.Id - b.Id;
  return idRaw * direction;
}

export function mergeProjectChunkResults<T extends ProjectQueryComparable>(args: {
  chunks: T[][];
  orderBy: QuerySortBy;
  orderDir: QuerySortDir;
  top: number;
}): T[] {
  const deduped = new Map<number, T>();
  args.chunks.flat().forEach((item) => {
    if (!deduped.has(item.Id)) deduped.set(item.Id, item);
  });
  return Array.from(deduped.values())
    .sort((left, right) => compareProjects(left, right, args.orderBy, args.orderDir))
    .slice(0, args.top);
}
