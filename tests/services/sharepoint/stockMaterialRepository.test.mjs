import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("findStockMaterialByCenterAndCode monta filtro com center e material", async () => {
  let capturedUrl = "";
  mock.module("../../../src/services/sharepoint/spHttp.ts", {
    namedExports: {
      spGetJson: async (url) => { capturedUrl = url; return { value: [] }; },
      spPostJson: async () => ({}),
      getDigest: async () => "digest"
    }
  });

  const { findStockMaterialByCenterAndCode } = await import("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts");
  await findStockMaterialByCenterAndCode({ center: "9860", materialCode: "29092" });
  assert.match(capturedUrl, /Center%20eq%20'9860'%20and%20Material%20eq%20'29092'/);
});
