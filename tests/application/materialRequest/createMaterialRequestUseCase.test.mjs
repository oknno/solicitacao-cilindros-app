import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("createMaterialRequestUseCase exige center", async () => {
  const { createMaterialRequestUseCase } = await import("../../../src/application/materialRequest/createMaterialRequestUseCase.ts");
  await assert.rejects(() => createMaterialRequestUseCase({ requesterName: "A", center: " ", materialCode: "M", requestedQuantity: 1, requestReason: "R" }), /Informe o centro da solicitação\./);
});

test("createMaterialRequestUseCase preserva center e consulta por center+material", async () => {
  let findInput;
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", { namedExports: { findStockMaterialByCenterAndCode: async (input) => { findInput = input; return { materialCode: "M", description: "Desc", center: "9860", evaluatedStockTotal: 0 }; } } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { createMaterialRequest: async (req) => ({ ...req, id: 1 }) } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async () => ({}) } });

  const { createMaterialRequestUseCase } = await import("../../../src/application/materialRequest/createMaterialRequestUseCase.ts");
  const out = await createMaterialRequestUseCase({ requesterName: "A", center: " 9860 ", materialCode: " M ", requestedQuantity: 1, requestReason: "R" });
  assert.deepEqual(findInput, { center: "9860", materialCode: "M" });
  assert.equal(out.request.center, "9860");
});
