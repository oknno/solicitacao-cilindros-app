import { spConfig } from "./spConfig";
import { spGetJson, getDigest, spPostJson, spPatchJson } from "./spHttp";

export type ActivityRow = {
  Id: number;
  Title: string;
  projectsIdId?: number;
  milestonesIdId?: number;
  startDate?: string;
  endDate?: string;
  supplier?: string;
  activityDescription?: string;
};

export type ActivityDraft = {
  Title: string;
  projectsIdId: number;
  milestonesIdId: number;
  startDate?: string;
  endDate?: string;
  supplier?: string;
  activityDescription?: string;
};

type ODataList<T> = {
  value: T[];
  ["@odata.nextLink"]?: string;
};

type BatchFetchOptions = {
  pageSize?: number;
  maxPages?: number;
};

function enc(s: string) {
  return encodeURIComponent(s);
}

function listBaseUrl(listTitle: string) {
  return `${spConfig.siteUrl}/_api/web/lists/getbytitle('${enc(listTitle)}')`;
}

export async function getActivitiesByMilestone(projectId: number, milestoneId: number): Promise<ActivityRow[]> {
  const url =
    `${listBaseUrl(spConfig.activitiesListTitle)}/items` +
    `?$select=Id,Title,projectsIdId,milestonesIdId,startDate,endDate,supplier,activityDescription` +
    `&$filter=projectsIdId eq ${projectId} and milestonesIdId eq ${milestoneId}` +
    `&$orderby=Id desc` +
    `&$top=200`;

  const data = await spGetJson<ODataList<ActivityRow>>(url);
  return data.value ?? [];
}

export async function getActivitiesBatchByProject(projectId: number, options?: BatchFetchOptions): Promise<ActivityRow[]> {
  const top = Math.max(1, Math.min(options?.pageSize ?? 500, 5000));
  const maxPages = Math.max(1, options?.maxPages ?? 20);

  const baseUrl = `${listBaseUrl(spConfig.activitiesListTitle)}/items`;
  let nextUrl =
    `${baseUrl}?$select=Id,Title,projectsIdId,milestonesIdId,startDate,endDate,supplier,activityDescription` +
    `&$filter=projectsIdId eq ${projectId}` +
    `&$orderby=Id desc` +
    `&$top=${top}`;

  const all: ActivityRow[] = [];
  let page = 0;

  while (nextUrl && page < maxPages) {
    const data = await spGetJson<ODataList<ActivityRow>>(nextUrl);
    all.push(...(data.value ?? []));
    nextUrl = data["@odata.nextLink"] ?? "";
    page += 1;
  }

  if (nextUrl) {
    console.warn(`[activitiesApi] Paginação interrompida após ${maxPages} páginas para projectId=${projectId}.`);
  }

  return all;
}

export async function createActivity(draft: ActivityDraft): Promise<number> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.activitiesListTitle)}')/items`;
  const digest = await getDigest();

  const body: Record<string, unknown> = {
    Title: draft.Title,
    startDate: draft.startDate,
    endDate: draft.endDate,
    supplier: draft.supplier,
    activityDescription: draft.activityDescription,
    milestonesIdId: draft.milestonesIdId,
    projectsIdId: draft.projectsIdId
  };

  const created = await spPostJson<{ Id?: unknown }>(url, body, digest);
  return Number(created.Id);
}

export async function updateActivity(id: number, patch: Partial<ActivityDraft>): Promise<void> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.activitiesListTitle)}')/items(${id})`;
  const digest = await getDigest();

  const body: Record<string, unknown> = {};
  if (patch.Title !== undefined) body.Title = String(patch.Title ?? "").trim();
  if (patch.startDate !== undefined) body.startDate = patch.startDate;
  if (patch.endDate !== undefined) body.endDate = patch.endDate;
  if (patch.supplier !== undefined) body.supplier = patch.supplier;
  if (patch.activityDescription !== undefined) body.activityDescription = patch.activityDescription;
  if (patch.milestonesIdId !== undefined) body.milestonesIdId = patch.milestonesIdId;
  if (patch.projectsIdId !== undefined) body.projectsIdId = patch.projectsIdId;

  await spPatchJson(url, body, digest);
}

export async function deleteActivity(id: number): Promise<void> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.activitiesListTitle)}')/items(${id})`;
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
