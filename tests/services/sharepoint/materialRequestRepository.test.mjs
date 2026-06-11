import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("getMaterialRequests inclui Created no select e mapeia para createdAt", async () => {
  let capturedUrl = "";
  mock.module("../../../src/services/sharepoint/spHttp.ts", {
    namedExports: {
      spGetJson: async (url) => {
        capturedUrl = url;
        return {
          value: [{
            Id: 123,
            Created: "2026-06-11T14:35:00Z",
            RequesterName: "Ana",
            Material: "MAT-001",
            MaterialDescription: "Material",
            Center: "C100",
            RequestedQuantity: "1",
            EvaluatedStockTotal: "2",
            StockRecommendation: "PURCHASE_RECOMMENDED",
            RequestReason: "Reposição",
            RequestStatus: "DRAFT",
          }],
        };
      },
      getDigest: async () => "digest",
      spDelete: async () => undefined,
      spPatchJson: async () => undefined,
      spPostJson: async () => ({}),
    },
  });

  const { getMaterialRequests } = await import("../../../src/services/sharepoint/repositories/materialRequestRepository.ts");
  const requests = await getMaterialRequests();

  assert.match(capturedUrl, /MaterialRequests/);
  assert.match(capturedUrl, /\$select=Id,Created,Modified,/);
  assert.equal(requests[0].createdAt, "2026-06-11T14:35:00Z");
});
