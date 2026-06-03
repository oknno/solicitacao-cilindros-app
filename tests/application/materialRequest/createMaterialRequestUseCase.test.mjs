import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("createMaterialRequestUseCase exige center", async () => {
  const { createMaterialRequestUseCase } = await import("../../../src/application/materialRequest/createMaterialRequestUseCase.ts");
  await assert.rejects(() => createMaterialRequestUseCase({ requesterName: "A", center: " ", materialCode: "M", requestedQuantity: 1, requestReason: "R" }), /Informe o centro da solicitação\./);
});

test("createMaterialRequestUseCase preserva center e consulta por center+material", async () => {
  let findInput;
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", { namedExports: { findStockMaterialByCenterAndCode: async (input) => { findInput = input; return { materialCode: "M", description: "Desc", center: "9860", evaluatedStockTotal: 0 }; } } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { createMaterialRequest: async (req) => ({ ...req, id: 1 }), addAttachmentsToMaterialRequest: async () => {} } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async () => ({}) } });

  const { createMaterialRequestUseCase } = await import("../../../src/application/materialRequest/createMaterialRequestUseCase.ts");
  const out = await createMaterialRequestUseCase({ requesterName: "A", center: " 9860 ", materialCode: " M ", requestedQuantity: 1, requestReason: "R" });
  assert.deepEqual(findInput, { center: "9860", materialCode: "M" });
  assert.equal(out.request.center, "9860");
});

test("createMaterialRequestUseCase com material manual gera MANUAL_REVIEW_REQUIRED", async () => {
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", { namedExports: { findStockMaterialByCenterAndCode: async () => { throw new Error("não deve consultar"); } } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { createMaterialRequest: async (req) => ({ ...req, id: 2 }), addAttachmentsToMaterialRequest: async () => {} } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async () => ({}) } });

  const { createMaterialRequestUseCase } = await import("../../../src/application/materialRequest/createMaterialRequestUseCase.ts");
  const out = await createMaterialRequestUseCase({ requesterName: "A", center: "9860", materialCode: "MANUAL-1", materialDescription: "Desc manual", requestedQuantity: 3, requestReason: "Urgência", requesterJustification: "Just", isManualMaterial: true });
  assert.equal(out.stockAnalysis.recommendation, "MANUAL_REVIEW_REQUIRED");
  assert.equal(out.request.materialDescription, "Desc manual");
  assert.equal(out.request.evaluatedStockTotalAtRequest, null);
});


test("createMaterialRequestUseCase envia múltiplos anexos após criar o item", async () => {
  let uploaded;
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", { namedExports: { findStockMaterialByCenterAndCode: async () => ({ materialCode: "M", description: "Desc", center: "9860", evaluatedStockTotal: 0 }) } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { createMaterialRequest: async (req) => ({ ...req, id: 10 }), addAttachmentsToMaterialRequest: async (requestId, files) => { uploaded = { requestId, fileNames: files.map((file) => file.name) }; } } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async () => ({}) } });

  const { createMaterialRequestUseCase } = await import("../../../src/application/materialRequest/createMaterialRequestUseCase.ts");
  await createMaterialRequestUseCase({ requesterName: "A", center: "9860", materialCode: "M", requestedQuantity: 1, requestReason: "R", attachments: [{ name: "a.pdf" }, { name: "b.xlsx" }] });

  assert.deepEqual(uploaded, { requestId: 10, fileNames: ["a.pdf", "b.xlsx"] });
});
