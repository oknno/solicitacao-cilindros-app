import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("importação bloqueia duplicidade Centro + Material", async () => {
  mock.module("xlsx", {
    namedExports: {
      read: () => ({ SheetNames: ["S1"], Sheets: { S1: {} } }),
      utils: {
        sheet_to_json: () => [
          ["Material", "Descrição", "Centro", "Estoque avaliado total", "Preço Médio"],
          ["29092", "A", "9860", "10", "2"],
          ["29092", "B", "9860", "5", "3"]
        ]
      }
    }
  });

  const { importStockItemsFromExcelUseCase } = await import("../../../src/application/stock/importStockItemsFromExcelUseCase.ts");
  const file = new File(["dummy"], "stock.xlsx");
  const result = await importStockItemsFromExcelUseCase({ file });
  assert.equal(result.validRows, 1);
  assert.match(result.errors[0].message, /material duplicado para o mesmo centro\./);
});

test("importação normaliza cabeçalhos e recalcula campos históricos e financeiros", async () => {
  mock.reset();
  mock.module("xlsx", {
    namedExports: {
      read: () => ({ SheetNames: ["S1"], Sheets: { S1: {} } }),
      utils: {
        sheet_to_json: () => [
          [" Material ", "Descrição\n", "Centro", "Estoque avaliado total", "Estoque\nTotal\n(R$)", "2021", "2022", "2023", "2024", "2025", "2026", "Total", "cont", "Média\nAnual\nConsumo", " Preço\nMédio "],
          ["7070598", "Material A", "9860", "1.234,5", "999", "10", "", "2,5", "0", "1,234.56", "0", "999", "9", "999", "R$ 2,00"]
        ]
      }
    }
  });

  const modulePath = `../../../src/application/stock/importStockItemsFromExcelUseCase.ts?case=${Date.now()}`;
  const { importStockItemsFromExcelUseCase } = await import(modulePath);
  const file = new File(["dummy"], "stock.xlsx");
  const result = await importStockItemsFromExcelUseCase({ file });

  assert.equal(result.validRows, 1);
  assert.equal(result.invalidRows, 0);
  assert.deepEqual(result.errors, []);
  assert.equal(result.items[0].evaluatedStockTotal, 1234.5);
  assert.equal(result.items[0].averagePrice, 2);
  assert.equal(result.items[0].totalStockValueBRL, 2469);
  assert.equal(result.items[0].consumption2022, 0);
  assert.equal(result.items[0].historicalTotal, 1247.06);
  assert.equal(result.items[0].consumptionYearsCount, 3);
  assert.equal(result.items[0].averageAnnualConsumption, 1247.06 / 3);
});
