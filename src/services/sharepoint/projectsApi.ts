import { spConfig } from "./spConfig.ts";
import { spGetJson, spPostJson, spPatchJson, getDigest } from "./spHttp.ts";
import { getListFieldsCached } from "./listSchemaCache.ts";
import { buildProjectsQueryPlan, mergeProjectChunkResults } from "./projectsQueryPlanner.ts";
import { normalizeOperationalCategory, normalizeOperationalComplexity } from "../../domain/projects/operationalValueNormalizer";

export type ProjectRow = {
  Id: number;
  Title: string;
  approvalYear?: number;
  budgetBrl?: number;
  status?: string;
  investmentLevel?: string;
  fundingSource?: string;
  program?: string;
  company?: string;
  center?: string;
  unit?: string;
  location?: string;
  depreciationCostCenter?: string;
  category?: string;
  investmentType?: string;
  assetType?: string;
  projectFunction?: string;
  projectLeader?: string;
  projectUser?: string;
  codigoSAP?: string;
  sourceProjectCode?: string;
  hasRoce?: string;
  startDate?: string;
  endDate?: string;
  businessNeed?: string;
  proposedSolution?: string;
  kpiType?: string;
  kpiName?: string;
  kpiDescription?: string;
  kpiCurrent?: string;
  kpiExpected?: string;
  roceGain?: number;
  roceGainDescription?: string;
  roceLoss?: number;
  roceLossDescription?: string;
  roceClassification?: string;
  operationalCategory?: string;
  complexity?: string;
  authorName?: string;
};

export type ProjectDraft = Omit<ProjectRow, "Id">;

export type ProjectUpdate = Partial<ProjectDraft>;

export type SortBy = "Title" | "Id" | "approvalYear" | "authorName";
export type SortDir = "asc" | "desc";

type SpRecord = Record<string, unknown>;
type ProjectFieldKey = keyof ProjectDraft | "Id" | "authorName";
type ChunkedCursorState = {
  v: 1;
  mode: "chunked";
  top: number;
  orderBy: SortBy;
  orderDir: SortDir;
  chunkFilters: string[];
  chunkNextLinks: Array<string | null>;
  pendingItems: ProjectRow[];
};
type SpListResponse = {
  value?: unknown;
  d?: { results?: unknown; __next?: unknown };
  ["@odata.nextLink"]?: unknown;
  ["odata.nextLink"]?: unknown;
  __next?: unknown;
};
export { UnitFilterLimitError } from "./projectsQueryPlanner.ts";

const PROJECT_FIELDS: Array<keyof ProjectRow> = [
  "Id",
  "Title",
  "approvalYear",
  "budgetBrl",
  "status",
  "investmentLevel",
  "fundingSource",
  "program",
  "company",
  "center",
  "unit",
  "location",
  "depreciationCostCenter",
  "category",
  "investmentType",
  "assetType",
  "projectFunction",
  "projectLeader",
  "projectUser",
  "codigoSAP",
  "sourceProjectCode",
  "hasRoce",
  "startDate",
  "endDate",
  "businessNeed",
  "proposedSolution",
  "kpiType",
  "kpiName",
  "kpiDescription",
  "kpiCurrent",
  "kpiExpected",
  "roceGain",
  "roceGainDescription",
  "roceLoss",
  "roceLossDescription",
  "roceClassification",
  "operationalCategory",
  "complexity",
  "authorName"
];

const PROJECT_DEFAULT_SELECT = PROJECT_FIELDS.join(",");
const PROJECT_READ_MANDATORY_FIELDS = new Set(["Id", "Title"]);
const BLOCKED_PROJECT_PAYLOAD_KEYS = new Set(["Id"]);
const CHUNKED_CURSOR_PREFIX = "__chunked_cursor__:";
let projectsFieldNamesIndexPromise: Promise<Map<string, string> | null> | null = null;

const SP_PROJECT_INTERNAL_NAMES: Record<ProjectFieldKey, string> = {
  Id: "Id",
  Title: "Title",
  approvalYear: "approvalYear",
  budgetBrl: "budgetBrl",
  status: "status",
  investmentLevel: "investmentLevel",
  fundingSource: "fundingSource",
  program: "program",
  company: "company",
  center: "center",
  unit: "unit",
  location: "location",
  depreciationCostCenter: "depreciationCostCenter",
  category: "category",
  investmentType: "investmentType",
  assetType: "assetType",
  projectFunction: "projectFunction",
  projectLeader: "projectLeader",
  projectUser: "projectUser",
  codigoSAP: "codigoSAP",
  sourceProjectCode: "sourceProjectCode",
  hasRoce: "hasRoce",
  startDate: "startDate",
  endDate: "endDate",
  businessNeed: "businessNeed",
  proposedSolution: "proposedSolution",
  kpiType: "kpiType",
  kpiName: "kpiName",
  kpiDescription: "kpiDescription",
  kpiCurrent: "kpiCurrent",
  kpiExpected: "kpiExpected",
  roceGain: "roceGain",
  roceGainDescription: "roceGainDescription",
  roceLoss: "roceLoss",
  roceLossDescription: "roceLossDescription",
  roceClassification: "roceClassification",
  operationalCategory: "operationalCategory",
  complexity: "complexity",
  authorName: "Author"
};

function asRecord(value: unknown): SpRecord {
  return value && typeof value === "object" ? (value as SpRecord) : {};
}

function readItems(data: SpListResponse): SpRecord[] {
  const direct = Array.isArray(data.value) ? data.value : undefined;
  if (direct) return direct.map(asRecord);

  const legacy = Array.isArray(data.d?.results) ? data.d.results : undefined;
  return legacy ? legacy.map(asRecord) : [];
}

function readFieldValue(source: SpRecord, fieldName: string): unknown {
  if (fieldName in source) return source[fieldName];

  const lowerKey = fieldName.toLowerCase();
  for (const [candidateKey, candidateValue] of Object.entries(source)) {
    if (candidateKey.toLowerCase() === lowerKey) return candidateValue;
  }
  return undefined;
}

function readString(source: SpRecord, fieldName: string): string | undefined {
  const value = readFieldValue(source, fieldName);
  return value == null ? undefined : String(value);
}

function readNumber(source: SpRecord, fieldName: string): number | undefined {
  const value = readFieldValue(source, fieldName);
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readDateString(source: SpRecord, fieldName: string): string | undefined {
  const value = readString(source, fieldName);
  if (!value) return undefined;
  return value.includes("T") ? value.slice(0, 10) : value;
}

function pickNextLink(data: SpListResponse): string | undefined {
  const link = data["odata.nextLink"] ?? data["@odata.nextLink"] ?? data.__next ?? data.d?.__next;
  return typeof link === "string" && link.length > 0 ? link : undefined;
}

function isInternalChunkedCursor(nextLink: string): boolean {
  return nextLink.startsWith(CHUNKED_CURSOR_PREFIX);
}

function createChunkedCursor(state: ChunkedCursorState): string {
  return `${CHUNKED_CURSOR_PREFIX}${encodeURIComponent(JSON.stringify(state))}`;
}

function parseChunkedCursor(cursor: string): ChunkedCursorState {
  const raw = cursor.slice(CHUNKED_CURSOR_PREFIX.length);
  const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ChunkedCursorState>;
  if (
    parsed?.v !== 1 ||
    parsed.mode !== "chunked" ||
    !Array.isArray(parsed.chunkFilters) ||
    !Array.isArray(parsed.chunkNextLinks) ||
    !Array.isArray(parsed.pendingItems)
  ) {
    throw new Error("Invalid chunked cursor");
  }
  return {
    v: 1,
    mode: "chunked",
    top: Number(parsed.top) || 0,
    orderBy: (parsed.orderBy as SortBy) ?? "Id",
    orderDir: (parsed.orderDir as SortDir) ?? "desc",
    chunkFilters: parsed.chunkFilters,
    chunkNextLinks: parsed.chunkNextLinks.map((link) => (typeof link === "string" && link.length > 0 ? link : null)),
    pendingItems: parsed.pendingItems as ProjectRow[]
  };
}

function mergeChunkItems(args: { chunks: ProjectRow[][]; orderBy: SortBy; orderDir: SortDir }): ProjectRow[] {
  const totalItems = args.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  return mergeProjectChunkResults({
    chunks: args.chunks,
    orderBy: args.orderBy,
    orderDir: args.orderDir,
    top: Math.max(totalItems, 0)
  });
}

function buildRawProjectPayload(source: ProjectUpdate): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  (Object.keys(source) as Array<keyof ProjectUpdate>).forEach((key) => {
    if (BLOCKED_PROJECT_PAYLOAD_KEYS.has(String(key))) return;
    const value = source[key];
    if (value !== undefined) payload[key] = value;
  });
  payload.operationalCategory = normalizeOperationalCategory(payload.operationalCategory as string | undefined);
  payload.complexity = normalizeOperationalComplexity(payload.complexity as string | undefined);
  return payload;
}

function resolveInternalName(field: ProjectFieldKey, schemaFieldNameIndex?: Map<string, string> | null): string {
  if (!schemaFieldNameIndex) return SP_PROJECT_INTERNAL_NAMES[field];
  return schemaFieldNameIndex.get(field.toLowerCase()) ?? SP_PROJECT_INTERNAL_NAMES[field];
}

async function getProjectsFieldNameIndex(): Promise<Map<string, string> | null> {
  if (!projectsFieldNamesIndexPromise) {
    projectsFieldNamesIndexPromise = getListFieldsCached(spConfig.projectsListTitle)
      .then((fields) => {
        const index = new Map<string, string>();
        fields.forEach((field) => {
          const internalName = String(field.InternalName ?? "").trim();
          if (!internalName) return;
          index.set(internalName.toLowerCase(), internalName);
        });
        return index;
      })
      .catch(() => null);
  }
  return projectsFieldNamesIndexPromise;
}

async function getProjectsSelectClause(): Promise<string> {
  const schemaFieldNameIndex = await getProjectsFieldNameIndex();
  if (!schemaFieldNameIndex) return PROJECT_DEFAULT_SELECT;

  const available = PROJECT_FIELDS.flatMap((field) => {
    if (field === "authorName") return ["Author/Title", "Author/Name", "Author/EMail"];
    if (PROJECT_READ_MANDATORY_FIELDS.has(field)) return field;
    return resolveInternalName(field, schemaFieldNameIndex);
  }).filter((field): field is string => Boolean(field));

  if (available.length === 0) return "Id,Title";
  return available.join(",");
}

async function buildProjectPayload(source: ProjectUpdate): Promise<Record<string, unknown>> {
  const payload = buildRawProjectPayload(source);
  const schemaFieldNameIndex = await getProjectsFieldNameIndex();

  if (!schemaFieldNameIndex) {
    return payload;
  }

  const mappedPayload: Record<string, unknown> = {};
  for (const key of Object.keys(payload) as Array<keyof ProjectUpdate>) {
    const internalName = resolveInternalName(key, schemaFieldNameIndex);
    if (!internalName) {
      continue;
    }
    mappedPayload[internalName] = payload[key];
  }

  return mappedPayload;
}

export async function getProjectsPage(args: {
  top?: number;
  nextLink?: string;
  searchTitle?: string;
  requesterContains?: string;
  statusEquals?: string;
  unitEquals?: string;
  unitIn?: string[];
  orderBy?: SortBy;
  orderDir?: SortDir;
}): Promise<{ items: ProjectRow[]; nextLink?: string }> {
  const schemaFieldNameIndex = await getProjectsFieldNameIndex();

  if (args.nextLink) {
    if (isInternalChunkedCursor(args.nextLink)) {
      const state = parseChunkedCursor(args.nextLink);
      const pendingChunks: ProjectRow[][] = [state.pendingItems];
      const nextLinks = state.chunkNextLinks.slice();

      while (pendingChunks.reduce((acc, chunk) => acc + chunk.length, 0) < state.top && nextLinks.some(Boolean)) {
        const chunkRequests = nextLinks
          .map((url, index) => ({ url, index }))
          .filter((entry): entry is { url: string; index: number } => Boolean(entry.url));
        const chunkResponses = await Promise.all(chunkRequests.map((entry) => spGetJson<SpListResponse>(entry.url)));

        chunkResponses.forEach((response, responseIdx) => {
          const targetIdx = chunkRequests[responseIdx].index;
          nextLinks[targetIdx] = pickNextLink(response) ?? null;
          pendingChunks.push(readItems(response).map((item) => mapProjectRow(item, schemaFieldNameIndex)));
        });
      }

      const merged = mergeChunkItems({
        chunks: pendingChunks,
        orderBy: state.orderBy,
        orderDir: state.orderDir
      });
      const pageItems = merged.slice(0, state.top);
      const remainingItems = merged.slice(state.top);
      const hasMore = remainingItems.length > 0 || nextLinks.some(Boolean);

      return {
        items: pageItems,
        nextLink: hasMore
          ? createChunkedCursor({
              ...state,
              chunkNextLinks: nextLinks,
              pendingItems: remainingItems
            })
          : undefined
      };
    }

    const data = await spGetJson<SpListResponse>(args.nextLink);
    return { items: readItems(data).map((item) => mapProjectRow(item, schemaFieldNameIndex)), nextLink: pickNextLink(data) };
  }

  const top = args.top ?? 20;
  const orderBy = args.orderBy ?? "Id";
  const orderDir = args.orderDir ?? "desc";
  const orderField = orderBy === "authorName" ? "Author/Title" : orderBy;
  const orderExpr = orderBy === "Id" ? `Id ${orderDir}` : `${orderField} ${orderDir},Id ${orderDir}`;
  const queryPlan = buildProjectsQueryPlan({
    searchTitle: args.searchTitle,
    requesterContains: args.requesterContains,
    statusEquals: args.statusEquals,
    unitEquals: args.unitEquals,
    unitIn: args.unitIn,
    top,
    orderExpr
  });

  if (queryPlan.mode === "single") {
    const data = await fetchProjectsPage({
      top: queryPlan.top,
      orderExpr: queryPlan.orderExpr,
      filters: queryPlan.filters
    });
    return { items: readItems(data).map((item) => mapProjectRow(item, schemaFieldNameIndex)), nextLink: pickNextLink(data) };
  }

  const chunkResponses = await Promise.all(
    queryPlan.chunkFilters.map((chunkFilter) =>
      fetchProjectsPage({
        top: queryPlan.top,
        orderExpr: queryPlan.orderExpr,
        filters: chunkFilter
      })
    )
  );
  const merged = mergeProjectChunkResults({
    chunks: chunkResponses.map((response) => readItems(response).map((item) => mapProjectRow(item, schemaFieldNameIndex))),
    orderBy,
    orderDir,
    top: Number.MAX_SAFE_INTEGER
  });
  const nextLinks = chunkResponses.map((response) => pickNextLink(response) ?? null);
  const pageItems = merged.slice(0, top);
  const remainingItems = merged.slice(top);
  const hasMore = remainingItems.length > 0 || nextLinks.some(Boolean);

  return {
    items: pageItems,
    nextLink: hasMore
      ? createChunkedCursor({
          v: 1,
          mode: "chunked",
          top,
          orderBy,
          orderDir,
          chunkFilters: queryPlan.chunkFilters,
          chunkNextLinks: nextLinks,
          pendingItems: remainingItems
        })
      : undefined
  };
}

export async function getProjectById(id: number): Promise<ProjectRow> {
  const schemaFieldNameIndex = await getProjectsFieldNameIndex();
  const data = await fetchProjectById(id);
  return mapProjectRow(data, schemaFieldNameIndex);
}

export async function createProject(draft: ProjectDraft): Promise<number> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.projectsListTitle)}')/items`;
  const digest = await getDigest();
  const payload = await buildProjectPayload(draft);

  const created = await spPostJson<{ Id?: unknown }>(url, payload, digest);
  return Number(created.Id);
}

export async function updateProject(id: number, patch: ProjectUpdate): Promise<void> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.projectsListTitle)}')/items(${id})`;
  const digest = await getDigest();
  const payload = await buildProjectPayload(patch);
  await spPatchJson(url, payload, digest);
}

async function fetchProjectsPage(args: {
  top: number;
  orderExpr: string;
  filters?: string;
}): Promise<SpListResponse> {
  const selectClause = await getProjectsSelectClause();
  return spGetJson<SpListResponse>(buildProjectsPageUrl(args, selectClause));
}

function buildProjectsPageUrl(
  args: { top: number; orderExpr: string; filters?: string },
  select: string
): string {
  return (
    `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.projectsListTitle)}')/items` +
    `?$select=${select}&$expand=Author&$orderby=${args.orderExpr}&$top=${args.top}` +
    (args.filters ? `&$filter=${args.filters}` : "")
  );
}

async function fetchProjectById(id: number): Promise<SpRecord> {
  const selectClause = await getProjectsSelectClause();
  return spGetJson<SpRecord>(buildProjectByIdUrl(id, selectClause));
}

function buildProjectByIdUrl(id: number, select: string): string {
  return (
    `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.projectsListTitle)}')/items(${id})` +
    `?$select=${select}&$expand=Author`
  );
}


function readAuthorName(source: SpRecord): string | undefined {
  const author = readFieldValue(source, "Author");
  const authorRecord = asRecord(author);
  return readString(authorRecord, "Title") ?? readString(authorRecord, "Name") ?? readString(authorRecord, "EMail") ?? undefined;
}

function mapProjectRow(x: SpRecord, schemaFieldNameIndex?: Map<string, string> | null): ProjectRow {
  const readByField = <T extends ProjectFieldKey>(field: T): string =>
    resolveInternalName(field, schemaFieldNameIndex);

  return {
    Id: readNumber(x, readByField("Id")) ?? 0,
    Title: readString(x, readByField("Title")) ?? "",
    approvalYear: readNumber(x, readByField("approvalYear")),
    budgetBrl: readNumber(x, readByField("budgetBrl")),
    status: readString(x, readByField("status")),
    investmentLevel: readString(x, readByField("investmentLevel")),
    fundingSource: readString(x, readByField("fundingSource")),
    program: readString(x, readByField("program")),
    company: readString(x, readByField("company")),
    center: readString(x, readByField("center")),
    unit: readString(x, readByField("unit")),
    location: readString(x, readByField("location")),
    depreciationCostCenter: readString(x, readByField("depreciationCostCenter")),
    category: readString(x, readByField("category")),
    investmentType: readString(x, readByField("investmentType")),
    assetType: readString(x, readByField("assetType")),
    projectFunction: readString(x, readByField("projectFunction")),
    projectLeader: readString(x, readByField("projectLeader")),
    projectUser: readString(x, readByField("projectUser")),
    codigoSAP: readString(x, readByField("codigoSAP")),
    sourceProjectCode: readString(x, readByField("sourceProjectCode")),
    hasRoce: readString(x, readByField("hasRoce")),
    startDate: readDateString(x, readByField("startDate")),
    endDate: readDateString(x, readByField("endDate")),
    businessNeed: readString(x, readByField("businessNeed")),
    proposedSolution: readString(x, readByField("proposedSolution")),
    kpiType: readString(x, readByField("kpiType")),
    kpiName: readString(x, readByField("kpiName")),
    kpiDescription: readString(x, readByField("kpiDescription")),
    kpiCurrent: readString(x, readByField("kpiCurrent")),
    kpiExpected: readString(x, readByField("kpiExpected")),
    roceGain: readNumber(x, readByField("roceGain")),
    roceGainDescription: readString(x, readByField("roceGainDescription")),
    roceLoss: readNumber(x, readByField("roceLoss")),
    roceLossDescription: readString(x, readByField("roceLossDescription")),
    roceClassification: readString(x, readByField("roceClassification")),
    operationalCategory: normalizeOperationalCategory(readString(x, readByField("operationalCategory"))),
    complexity: normalizeOperationalComplexity(readString(x, readByField("complexity"))),
    authorName: readAuthorName(x)
  };
}

export async function deleteProject(id: number): Promise<void> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.projectsListTitle)}')/items(${id})`;
  const digest = await getDigest();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json;odata=nometadata",
      "X-RequestDigest": digest,
      "IF-MATCH": "*",
      "X-HTTP-Method": "DELETE"
    }
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DELETE ${res.status}: ${txt}`);
  }
}
