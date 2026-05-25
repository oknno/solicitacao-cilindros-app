import { spConfig } from "./spConfig";

export type SharePointBatchRequest = {
  method: "POST" | "DELETE";
  url: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const BATCH_RESPONSE_STATUS_REGEX = /HTTP\/1\.1\s+(\d{3})/g;

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunkArray: size deve ser maior que zero.");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function executeSharePointBatch(requests: SharePointBatchRequest[], digest: string): Promise<void> {
  if (!requests.length) return;

  const batchId = `batch_${crypto.randomUUID()}`;
  const changesetId = `changeset_${crypto.randomUUID()}`;
  const lines: string[] = [];

  lines.push(`--${batchId}`);
  lines.push(`Content-Type: multipart/mixed; boundary=${changesetId}`);
  lines.push("");

  requests.forEach((request, index) => {
    lines.push(`--${changesetId}`);
    lines.push("Content-Type: application/http");
    lines.push("Content-Transfer-Encoding: binary");
    lines.push("");
    lines.push(`${request.method} ${request.url} HTTP/1.1`);
    lines.push("Accept: application/json;odata=nometadata");
    if (request.method === "POST") {
      lines.push("Content-Type: application/json;odata=nometadata");
    }
    Object.entries(request.headers ?? {}).forEach(([key, value]) => lines.push(`${key}: ${value}`));
    lines.push("");
    if (request.body) lines.push(JSON.stringify(request.body));
    if (index < requests.length - 1 || request.body) lines.push("");
  });

  lines.push(`--${changesetId}--`);
  lines.push(`--${batchId}--`);

  const res = await fetch(`${spConfig.siteUrl}/_api/$batch`, {
    method: "POST",
    headers: {
      Accept: "application/json;odata=nometadata",
      "Content-Type": `multipart/mixed; boundary=${batchId}`,
      "X-RequestDigest": digest
    },
    body: lines.join("\r\n")
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`BATCH ${res.status}: ${text}`);

  const statuses = Array.from(text.matchAll(BATCH_RESPONSE_STATUS_REGEX)).map((match) => Number(match[1]));
  const failedStatus = statuses.find((status) => status >= 400);
  if (failedStatus) {
    throw new Error(`BATCH operação falhou com status ${failedStatus}. Resposta: ${text}`);
  }
}
