import type { AccessRole, MaterialAccessControlRecord } from "../../domain/accessControl";
import { spConfig } from "./spConfig";
import { spGetJson } from "./spHttp";
import { SHAREPOINT_LISTS } from "./sharepointLists";

type SharePointMaterialAccessControlItem = {
  Id?: unknown;
  Title?: unknown;
  UserEmail?: unknown;
  Role?: unknown;
  Center?: unknown;
  IsActive?: unknown;
};

type ODataListResponse<T> = { value?: T[]; d?: { results?: T[]; __next?: string }; "@odata.nextLink"?: string; "odata.nextLink"?: string };

const VALID_ROLES = new Set<AccessRole>(["ADMIN", "CTO", "MANAGER", "USER"]);
const SELECTED_FIELDS = ["Id", "Title", "UserEmail", "Role", "Center", "IsActive"];

function readString(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function readItems(data: ODataListResponse<SharePointMaterialAccessControlItem>): SharePointMaterialAccessControlItem[] { return data.value ?? data.d?.results ?? []; }
function readNextLink(data: ODataListResponse<SharePointMaterialAccessControlItem>): string | null { return data["@odata.nextLink"] ?? data["odata.nextLink"] ?? data.d?.__next ?? null; }

export function mapSharePointMaterialAccessControlItem(item: SharePointMaterialAccessControlItem): MaterialAccessControlRecord | null {
  const userEmail = readString(item.UserEmail).toLowerCase();
  const role = readString(item.Role).toUpperCase() as AccessRole;
  const isActive = readString(item.IsActive).toUpperCase() === "TRUE";
  if (!isActive || !userEmail || !VALID_ROLES.has(role)) return null;
  return { id: typeof item.Id === "number" ? item.Id : undefined, title: readString(item.Title), userEmail, role, center: readString(item.Center) };
}

export async function getActiveMaterialAccessControlRecords(): Promise<MaterialAccessControlRecord[]> {
  const list = encodeURIComponent(SHAREPOINT_LISTS.materialAccessControl);
  let url: string | null = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${list}')/items?$select=${SELECTED_FIELDS.join(",")}&$top=5000`;
  const records: MaterialAccessControlRecord[] = [];
  while (url) {
    const data = await spGetJson<ODataListResponse<SharePointMaterialAccessControlItem>>(url);
    records.push(...readItems(data).map(mapSharePointMaterialAccessControlItem).filter((item): item is MaterialAccessControlRecord => item !== null));
    url = readNextLink(data);
  }
  return records;
}
