import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("listAvailableMaterialCenters retorna centros ativos únicos, normalizados e ordenados", async () => {
  mock.module("../../../src/services/sharepoint/materialCentersRepository.ts", {
    namedExports: {
      getActiveMaterialCenters: async () => [
        { id: 1, title: "4300", center: " 4300 ", isActive: true },
        { id: 2, title: "TL01", center: "TL01", isActive: true },
        { id: 3, title: "4100", center: "4100", isActive: true },
        { id: 4, title: "4300 duplicado", center: "4300", isActive: true },
      ],
    },
  });

  const { listAvailableMaterialCenterCodes } = await import("../../../src/application/listAvailableMaterialCenters.ts");
  assert.deepEqual(await listAvailableMaterialCenterCodes(), ["4100", "4300", "TL01"]);
});
