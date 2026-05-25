import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("importação bloqueia duplicidade Centro + Material", async () => {
  mock.module("xlsx", {
    namedExports: {
      read: () => ({ SheetNames: ["S1"], Sheets: { S1: {} } }),
      utils: {
        sheet_to_json: () => [
          ["Material", "Descrição", "Centro", "Estoque avaliado total"],
          ["29092", "A", "9860", "10"],
          ["29092", "B", "9860", "5"]
        ]
      }
    }
  });

  const { importStockItemsFromExcelUseCase } = await import("../../../src/application/stock/importStockItemsFromExcelUseCase.ts");
  const file = new File(["dummy"], "stock.xlsx");
  const result = await importStockItemsFromExcelUseCase({ file });
  assert.equal(result.validRows, 1);
  assert.match(result.errors[0].message, /Duplicidade encontrada para Centro \+ Material: 9860-29092\./);
});
