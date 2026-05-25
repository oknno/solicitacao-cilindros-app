import { spConfig } from "./spConfig";

const JSON_HEADERS = {
  Accept: "application/json;odata=nometadata",
  "Content-Type": "application/json;odata=nometadata"
};

export async function spGetJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json;odata=nometadata"
    }
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET ${res.status}: ${txt}`);
  }

  return (await res.json()) as T;
}

export async function spPostJson<T = unknown>(url: string, body: unknown, digest: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      "X-RequestDigest": digest
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${res.status}: ${txt}`);
  }

  return (await res.json()) as T;
}

export async function spPatchJson<T = unknown>(
  url: string,
  body: unknown,
  digest: string
): Promise<T> {
  const res = await fetch(url, {
    method: "POST", // SharePoint usa MERGE via POST
    headers: {
      ...JSON_HEADERS,
      "X-RequestDigest": digest,
      "IF-MATCH": "*",
      "X-HTTP-Method": "MERGE"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH(MERGE) ${res.status}: ${txt}`);
  }

  // 🔹 SharePoint normalmente retorna 204 No Content em MERGE
  if (res.status === 204) {
    return {} as T;
  }

  // 🔹 Em raros casos pode retornar conteúdo
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ===== Digest Cache =====
let _digestCache: { value: string; expiresAt: number } | null = null;

export async function getDigest(): Promise<string> {
  const now = Date.now();
  if (_digestCache && now < _digestCache.expiresAt) return _digestCache.value;

  const res = await fetch(`${spConfig.siteUrl}/_api/contextinfo`, {
    method: "POST",
    headers: {
      Accept: "application/json;odata=nometadata"
    }
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Digest ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as { FormDigestValue?: unknown };
  const digest = String(data.FormDigestValue ?? "");

  // cache ~25 min (digest geralmente ~30 min)
  _digestCache = { value: digest, expiresAt: now + 25 * 60 * 1000 };
  return digest;
}
