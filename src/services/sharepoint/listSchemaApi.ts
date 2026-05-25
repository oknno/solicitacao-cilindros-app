import { spGetJson } from "./spHttp";
import { spConfig } from "./spConfig";

export type SpFieldInfo = {
  Id: string;
  Title: string;
  InternalName: string;
  TypeAsString: string;
  Hidden: boolean;
  ReadOnlyField: boolean;
  Required: boolean;
};

type PagedResponse<T> = {
  value: T[];
  ["@odata.nextLink"]?: string;
};

function enc(s: string) {
  return encodeURIComponent(s);
}

/**
 * Lê TODAS as páginas de um endpoint OData (SharePoint)
 * Tipagem explícita evita implicit-any em TS estrito
 */
async function getAllPages<T>(firstUrl: string): Promise<T[]> {
  const all: T[] = [];
  let url: string | undefined = firstUrl;

  while (url) {
    const data: PagedResponse<T> = await spGetJson<PagedResponse<T>>(url);
    all.push(...(data.value ?? []));
    url = data["@odata.nextLink"];
  }

  return all;
}

export async function getListFields(listTitle: string): Promise<SpFieldInfo[]> {
  const url =
    `${spConfig.siteUrl}/_api/web/lists/getbytitle('${enc(listTitle)}')/fields` +
    `?$select=Id,Title,InternalName,TypeAsString,Hidden,ReadOnlyField,Required` +
    `&$filter=Hidden eq false`;

  const fields = await getAllPages<SpFieldInfo>(url);

  fields.sort((a, b) => (a.Title || "").localeCompare(b.Title || ""));
  return fields;
}
