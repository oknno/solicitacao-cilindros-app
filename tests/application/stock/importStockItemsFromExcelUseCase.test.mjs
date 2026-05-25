import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("importação bloqueia duplicidade Centro + Material", async () => {
  mock.module("xlsx", {
    namedExports: {
      read: () => ({ SheetNames: ["S1"], Sheets: { S1: {} } }),
      utils: {
        sheet_to_json: () => [
          { Center: "9860", Material: "29092", Description: "A", EvaluatedStockTotal: "10" },
          { Center: "9860", Material: "29092", Description: "B", EvaluatedStockTotal: "5" }
        ]
      }
    }
  });

  const { importStockItemsFromExcelUseCase } = await import("../../../src/application/stock/importStockItemsFromExcelUseCase.ts");
  const file = new File(["dummy"], "stock.xlsx");
  const result = await importStockItemsFromExcelUseCase({ file });
  assert.equal(result.validRows, 1);
  assert.match(result.errors[0].message, /Existe mais de uma linha para o mesmo Centro \+ Material: 9860-29092\./);
});
