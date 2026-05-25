import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("getStockCentersUseCase retorna centros únicos ordenados", async () => {
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", {
    namedExports: { getStockCenters: async () => [" 9860", "", "9870", "9860 "] },
  });
  const { getStockCentersUseCase } = await import("../../../src/application/materialRequest/getStockCentersUseCase.ts");
  assert.deepEqual(await getStockCentersUseCase(), ["9860", "9870"]);
});
