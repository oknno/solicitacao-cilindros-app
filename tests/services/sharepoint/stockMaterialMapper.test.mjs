import assert from "node:assert/strict";
import test from "node:test";

import { mapSharePointStockMaterial } from "../../../src/services/sharepoint/mappers/stockMaterialMapper.ts";

const fields = {
  materialCode: "Material",
  description: "Description",
  center: "Center",
  evaluatedStockTotal: "EvaluatedStockTotal",
  totalStockValueBRL: "TotalStockValueBRL",
  consumption2021: "Consumption2021",
  consumption2022: "Consumption2022",
  consumption2023: "Consumption2023",
  consumption2024: "Consumption2024",
  consumption2025: "Consumption2025",
  consumption2026: "Consumption2026",
  historicalTotal: "HistoricalTotal",
  consumptionYearsCount: "ConsumptionYearsCount",
  averageAnnualConsumption: "AverageAnnualConsumption",
  averagePrice: "AveragePrice"
};

test("mapSharePointStockMaterial converte estoque numérico textual inteiro", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-001",
      Description: "Material A",
      Center: "C100",
      EvaluatedStockTotal: "25"
    },
    fields
  );

  assert.equal(mapped.materialCode, "MAT-001");
  assert.equal(mapped.description, "Material A");
  assert.equal(mapped.center, "C100");
  assert.equal(mapped.evaluatedStockTotal, 25);
  assert.equal(mapped.averagePrice, null);
});

test("mapSharePointStockMaterial converte estoque textual com vírgula", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-002",
      Description: "Material B",
      Center: "C200",
      EvaluatedStockTotal: "25,5"
    },
    fields
  );

  assert.equal(mapped.evaluatedStockTotal, 25.5);
});

test("mapSharePointStockMaterial converte estoque textual com ponto", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-003",
      Description: "Material C",
      Center: "C300",
      EvaluatedStockTotal: "25.5"
    },
    fields
  );

  assert.equal(mapped.evaluatedStockTotal, 25.5);
});

test("mapSharePointStockMaterial retorna null para estoque vazio", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-004",
      Description: "Material D",
      Center: "C400",
      EvaluatedStockTotal: "  "
    },
    fields
  );

  assert.equal(mapped.evaluatedStockTotal, null);
});

test("mapSharePointStockMaterial retorna null para estoque inválido", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-005",
      Description: "Material E",
      Center: "C500",
      EvaluatedStockTotal: "abc"
    },
    fields
  );

  assert.equal(mapped.evaluatedStockTotal, null);
});
