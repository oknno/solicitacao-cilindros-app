import { getListFields } from "./listSchemaApi";
import type { SpFieldInfo } from "./listSchemaApi";

type CacheEntry = { ts: number; fields: SpFieldInfo[] };

const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;

export async function getListFieldsCached(listTitle: string): Promise<SpFieldInfo[]> {
  const key = listTitle.toLowerCase();
  const now = Date.now();

  const existing = cache.get(key);
  if (existing && now - existing.ts < TTL_MS) return existing.fields;

  const fields = await getListFields(listTitle);
  cache.set(key, { ts: now, fields });
  return fields;
}

export function clearListFieldsCache(listTitle?: string) {
  if (!listTitle) {
    cache.clear();
    return;
  }
  cache.delete(listTitle.toLowerCase());
}
