import assert from "node:assert/strict";
import test from "node:test";

import { addAttachmentToMaterialRequest } from "../../../src/services/sharepoint/repositories/materialRequestRepository.ts";

test("addAttachmentToMaterialRequest usa AttachmentFiles com nome de arquivo codificado", async () => {
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) };
  };

  try {
    const file = new File(["conteúdo"], "RLDLD1011579 (PC 13,30 mm).pdf", { type: "application/pdf" });
    await addAttachmentToMaterialRequest(123, file, "digest-token");
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/items\(123\)\/AttachmentFiles\/add\(FileName='RLDLD1011579%20%28PC%2013%2C30%20mm%29\.pdf'\)$/);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["Content-Type"], "application/octet-stream");
  assert.equal(calls[0].init.headers["X-RequestDigest"], "digest-token");
});

test("addAttachmentToMaterialRequest rejeita arquivo vazio antes de chamar SharePoint", async () => {
  const previousFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) };
  };

  try {
    const emptyFile = new File([""], "vazio.pdf", { type: "application/pdf" });
    await assert.rejects(() => addAttachmentToMaterialRequest(123, emptyFile, "digest-token"), /está vazio/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
