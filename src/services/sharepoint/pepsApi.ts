import { spGetJson, spPostJson, spPatchJson, getDigest } from "./spHttp";
import { spConfig } from "./spConfig";
import { escapeODataFilterLiterals } from "./odataFilter";

export type PepRow = {
  Id: number;
  Title: string;
  amountBrl?: number;
  year?: number;
  projectsIdId?: number;
  activitiesIdId?: number;
};

export type PepDraft = {
  Title: string;
  amountBrl?: number;
  year?: number;
  projectsIdId: number;
  activitiesIdId?: number | null;
};

type ODataListResponse<T> = {
  value: T[];
  ["@odata.nextLink"]?: string;
};

type BatchFetchOptions = {
  activityIds?: number[];
  pageSize?: number;
  maxPages?: number;
  maxConcurrent?: number;
};

type PepWire = {
  Id?: unknown;
  Title?: unknown;
  amountBrl?: unknown;
  year?: unknown;
  projectsIdId?: unknown;
  activitiesIdId?: unknown;
};

function numOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toPepRow(x: PepWire): PepRow {
  return {
    Id: Number(x.Id),
    Title: String(x.Title ?? ""),
    amountBrl: x.amountBrl != null ? numOrUndef(x.amountBrl) : undefined,
    year: x.year != null ? numOrUndef(x.year) : undefined,
    projectsIdId: x.projectsIdId != null ? numOrUndef(x.projectsIdId) : undefined,
    activitiesIdId: x.activitiesIdId != null ? numOrUndef(x.activitiesIdId) : undefined
  };
}

async function runWithConcurrency<T, R>(items: T[], maxConcurrent: number, worker: (item: T) => Promise<R[]>): Promise<R[]> {
  const concurrency = Math.max(1, maxConcurrent);
  const results: R[] = [];
  let cursor = 0;

  async function consume() {
    while (cursor < items.length) {
      const current = items[cursor++];
      const partial = await worker(current);
      results.push(...partial);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
  return results;
}

async function fetchPepsPaged(filter: string, pageSize: number, maxPages: number): Promise<PepRow[]> {
  const siteUrl = spConfig.siteUrl;
  const listTitle = spConfig.pepsListTitle;
  const baseUrl = `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items`;
  let nextUrl =
    `${baseUrl}?$select=Id,Title,amountBrl,year,projectsIdId,activitiesIdId` +
    `&$filter=${escapeODataFilterLiterals(filter)}` +
    `&$orderby=Id desc` +
    `&$top=${pageSize}`;

  const rows: PepRow[] = [];
  let page = 0;

  while (nextUrl && page < maxPages) {
    const data = await spGetJson<ODataListResponse<PepWire>>(nextUrl);
    rows.push(...(data.value ?? []).map(toPepRow));
    nextUrl = data["@odata.nextLink"] ?? "";
    page += 1;
  }

  if (nextUrl) {
    console.warn(`[pepsApi] Paginação interrompida após ${maxPages} páginas para filtro: ${filter}`);
  }

  return rows;
}

export async function getPepsByActivity(activityId: number): Promise<PepRow[]> {
  const siteUrl = spConfig.siteUrl;
  const listTitle = spConfig.pepsListTitle;

  const url =
    `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items` +
    `?$select=Id,Title,amountBrl,year,projectsIdId,activitiesIdId` +
    `&$filter=activitiesIdId eq ${activityId}` +
    `&$orderby=Id desc` +
    `&$top=500`;

  const data = await spGetJson<ODataListResponse<PepWire>>(url);

  return (data.value ?? []).map(toPepRow);
}

export async function getPepsBatchByProject(projectId: number, options?: BatchFetchOptions): Promise<PepRow[]> {
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 500, 5000));
  const maxPages = Math.max(1, options?.maxPages ?? 20);
  const maxConcurrent = Math.max(1, options?.maxConcurrent ?? 4);
  const activityIds = (options?.activityIds ?? []).filter((id) => Number.isFinite(id));

  if (activityIds.length === 0) {
    return fetchPepsPaged(`projectsIdId eq ${projectId}`, pageSize, maxPages);
  }

  const chunks: number[][] = [];
  const chunkSize = 20;
  for (let i = 0; i < activityIds.length; i += chunkSize) {
    chunks.push(activityIds.slice(i, i + chunkSize));
  }

  const rows = await runWithConcurrency(chunks, maxConcurrent, async (chunk) => {
    const activityFilter = chunk.map((id) => `activitiesIdId eq ${id}`).join(" or ");
    return fetchPepsPaged(`projectsIdId eq ${projectId} and (${activityFilter})`, pageSize, maxPages);
  });

  const deduped = new Map<number, PepRow>();
  for (const row of rows) deduped.set(row.Id, row);
  return [...deduped.values()];
}

export async function createPep(draft: PepDraft): Promise<number> {
  const siteUrl = spConfig.siteUrl;
  const listTitle = spConfig.pepsListTitle;

  const url = `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items`;
  const digest = await getDigest();

  const body: Record<string, unknown> = {
    Title: draft.Title,
    amountBrl: draft.amountBrl,
    year: draft.year,
    projectsIdId: draft.projectsIdId
  };

  if (draft.activitiesIdId !== undefined) {
    body.activitiesIdId = draft.activitiesIdId;
  }

  const created = await spPostJson<{ Id?: unknown }>(url, body, digest);
  return Number(created.Id);
}

export async function deletePep(id: number): Promise<void> {
  const siteUrl = spConfig.siteUrl;
  const listTitle = spConfig.pepsListTitle;

  const url = `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items(${id})`;
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
export async function updatePep(id: number, patch: Partial<PepDraft>): Promise<void> {
  const siteUrl = spConfig.siteUrl;
  const listTitle = spConfig.pepsListTitle;

  const url = `${siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(listTitle)}')/items(${id})`;

  const body: Record<string, unknown> = {};
  if (patch.Title !== undefined) body.Title = String(patch.Title ?? "").trim();
  if (patch.amountBrl !== undefined) body.amountBrl = patch.amountBrl;
  if (patch.year !== undefined) body.year = patch.year;
  if (patch.projectsIdId !== undefined) body.projectsIdId = patch.projectsIdId;
  if ("activitiesIdId" in patch) body.activitiesIdId = patch.activitiesIdId ?? null;

  const digest = await getDigest();
  await spPatchJson(url, body, digest);
}
