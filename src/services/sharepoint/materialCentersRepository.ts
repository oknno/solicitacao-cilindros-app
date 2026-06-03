import type { MaterialCenter } from "../../domain/materialRequest/materialCenter";
import { normalizeCenter } from "../../domain/materialRequest/normalizeCenter";
import { spConfig } from "./spConfig";
import { spGetJson } from "./spHttp";
import { MATERIAL_CENTER_FIELDS } from "./sharepointFields";
import { SHAREPOINT_LISTS } from "./sharepointLists";

type SharePointMaterialCenterItem = {
  Id?: unknown;
  Title?: unknown;
  Center?: unknown;
  IsActive?: unknown;
};

type ODataListResponse<T> = {
  value?: T[];
  d?: { results?: T[]; __next?: string };
  "@odata.nextLink"?: string;
  "odata.nextLink"?: string;
};

const SELECTED_FIELDS = ["Id", MATERIAL_CENTER_FIELDS.title, MATERIAL_CENTER_FIELDS.center, MATERIAL_CENTER_FIELDS.isActive];

function readString(value: unknown): string {
  return String(value ?? "").trim();
}

function readItems(data: ODataListResponse<SharePointMaterialCenterItem>): SharePointMaterialCenterItem[] {
  return data.value ?? data.d?.results ?? [];
}

function readNextLink(data: ODataListResponse<SharePointMaterialCenterItem>): string | null {
  return data["@odata.nextLink"] ?? data["odata.nextLink"] ?? data.d?.__next ?? null;
}

function compareCenters(left: string, right: string): number {
  return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
}

export function mapSharePointMaterialCenterItem(item: SharePointMaterialCenterItem): MaterialCenter | null {
  const center = normalizeCenter(item[MATERIAL_CENTER_FIELDS.center]);
  const isActive = readString(item[MATERIAL_CENTER_FIELDS.isActive]).toUpperCase() === "TRUE";
  if (!center || !isActive) return null;

  return {
    id: Number(item.Id ?? 0) || 0,
    title: readString(item[MATERIAL_CENTER_FIELDS.title]),
    center,
    isActive,
  };
}

export async function getActiveMaterialCenters(): Promise<MaterialCenter[]> {
  const list = encodeURIComponent(SHAREPOINT_LISTS.materialCenters);
  let url: string | null = `${spConfig.siteUrl}/_api/web/lists/getbytitle('${list}')/items?$select=${SELECTED_FIELDS.join(",")}&$top=5000`;
  const centers: MaterialCenter[] = [];

  while (url) {
    const data = await spGetJson<ODataListResponse<SharePointMaterialCenterItem>>(url);
    centers.push(...readItems(data).map(mapSharePointMaterialCenterItem).filter((item): item is MaterialCenter => item !== null));
    url = readNextLink(data);
  }

  return centers.sort((left, right) => compareCenters(left.center, right.center) || left.id - right.id);
}
