import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("analyzeMaterialRequestStockUseCase exige center", async () => {
  const { analyzeMaterialRequestStockUseCase } = await import("../../../src/application/materialRequest/analyzeMaterialRequestStockUseCase.ts");
  await assert.rejects(() => analyzeMaterialRequestStockUseCase({ center: " ", materialCode: "MAT-1", requestedQuantity: 1 }), /Informe o centro para consultar o estoque\./);
});

test("analyzeMaterialRequestStockUseCase consulta por center + material", async () => {
  let received;
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", {
    namedExports: {
      findStockMaterialByCenterAndCode: async (input) => {
        received = input;
        return { materialCode: "MAT-1", description: "Desc", center: "9860", evaluatedStockTotal: 10 };
      }
    }
  });
  const { analyzeMaterialRequestStockUseCase } = await import("../../../src/application/materialRequest/analyzeMaterialRequestStockUseCase.ts");
  await analyzeMaterialRequestStockUseCase({ center: " 9860 ", materialCode: " MAT-1 ", requestedQuantity: 2 });
  assert.deepEqual(received, { center: "9860", materialCode: "MAT-1" });
});
