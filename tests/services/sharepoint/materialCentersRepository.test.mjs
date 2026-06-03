import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("mapeia somente centro ativo válido sem converter centro alfanumérico", async () => {
  const { mapSharePointMaterialCenterItem } = await import("../../../src/services/sharepoint/materialCentersRepository.ts");
  assert.deepEqual(mapSharePointMaterialCenterItem({ Id: 7, Title: " Centro TL ", Center: " TL01 ", IsActive: " true " }), {
    id: 7,
    title: "Centro TL",
    center: "TL01",
    isActive: true,
  });
});

test("ignora centro inativo ou sem Center", async () => {
  const { mapSharePointMaterialCenterItem } = await import("../../../src/services/sharepoint/materialCentersRepository.ts");
  assert.equal(mapSharePointMaterialCenterItem({ Id: 1, Title: "4300", Center: "4300", IsActive: "FALSE" }), null);
  assert.equal(mapSharePointMaterialCenterItem({ Id: 2, Title: "vazio", Center: "  ", IsActive: "TRUE" }), null);
});

test("getActiveMaterialCenters busca apenas campos da lista MaterialCenters", async () => {
  let capturedUrl = "";
  mock.module("../../../src/services/sharepoint/spHttp.ts", {
    namedExports: {
      spGetJson: async (url) => {
        capturedUrl = url;
        return { value: [{ Id: 1, Title: "4300", Center: "4300", IsActive: "TRUE" }] };
      },
    },
  });

  const { getActiveMaterialCenters } = await import("../../../src/services/sharepoint/materialCentersRepository.ts");
  const out = await getActiveMaterialCenters();
  assert.match(capturedUrl, /MaterialCenters/);
  assert.match(capturedUrl, /\$select=Id,Title,Center,IsActive/);
  assert.deepEqual(out.map((item) => item.center), ["4300"]);
});
