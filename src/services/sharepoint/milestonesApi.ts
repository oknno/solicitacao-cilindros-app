import { spConfig } from "./spConfig";
import { spGetJson, getDigest, spPostJson, spPatchJson } from "./spHttp";

export type MilestoneRow = {
  Id: number;
  Title: string;
  projectsIdId?: number;
};

export type MilestoneDraft = {
  Title: string;
  projectsIdId: number;
};

type PagedResponse<T> = {
  value: T[];
  ["@odata.nextLink"]?: string;
};

function enc(s: string) {
  return encodeURIComponent(s);
}

function listBaseUrl(listTitle: string) {
  return `${spConfig.siteUrl}/_api/web/lists/getbytitle('${enc(listTitle)}')`;
}

export async function getMilestonesByProject(projectId: number): Promise<MilestoneRow[]> {
  const url =
    `${listBaseUrl(spConfig.milestonesListTitle)}/items` +
    `?$select=Id,Title,projectsIdId` +
    `&$filter=projectsIdId eq ${projectId}` +
    `&$orderby=Id desc` +
    `&$top=200`;

  const data = await spGetJson<PagedResponse<MilestoneRow>>(url);
  return data.value ?? [];
}

export async function createMilestone(draft: MilestoneDraft): Promise<number> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.milestonesListTitle)}')/items`;
  const digest = await getDigest();

  const body: Record<string, unknown> = {
    Title: draft.Title,
    projectsIdId: draft.projectsIdId
  };

  const created = await spPostJson<{ Id?: unknown }>(url, body, digest);
  return Number(created.Id);
}

export async function updateMilestone(id: number, patch: Partial<MilestoneDraft>): Promise<void> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.milestonesListTitle)}')/items(${id})`;
  const digest = await getDigest();

  const body: Record<string, unknown> = {};
  if (patch.Title !== undefined) body.Title = String(patch.Title ?? "").trim();
  if (patch.projectsIdId !== undefined) body.projectsIdId = patch.projectsIdId;

  await spPatchJson(url, body, digest);
}

export async function deleteMilestone(id: number): Promise<void> {
  const url = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${encodeURIComponent(spConfig.milestonesListTitle)}')/items(${id})`;
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
