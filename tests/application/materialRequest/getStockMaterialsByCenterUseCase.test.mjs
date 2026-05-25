import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("getStockMaterialsByCenterUseCase filtra por centro informado", async () => {
  let centerReceived;
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", {
    namedExports: {
      getStockMaterialsByCenter: async (center) => {
        centerReceived = center;
        return [{ materialCode: "B", description: "2", center, evaluatedStockTotal: 1 }, { materialCode: "A", description: "1", center, evaluatedStockTotal: 1 }];
      },
    },
  });
  const { getStockMaterialsByCenterUseCase } = await import("../../../src/application/materialRequest/getStockMaterialsByCenterUseCase.ts");
  const out = await getStockMaterialsByCenterUseCase({ center: " 9860 " });
  assert.equal(centerReceived, "9860");
  assert.deepEqual(out.map((x) => x.materialCode), ["A", "B"]);
});
