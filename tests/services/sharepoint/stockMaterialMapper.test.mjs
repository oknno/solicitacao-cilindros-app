import assert from "node:assert/strict";
import test from "node:test";

import { mapSharePointStockMaterial } from "../../../src/services/sharepoint/mappers/stockMaterialMapper.ts";

const fields = {
  materialCode: "Material",
  description: "Description",
  center: "Center",
  evaluatedStockTotal: "EvaluatedStockTotal"
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

  assert.deepEqual(mapped, {
    materialCode: "MAT-001",
    description: "Material A",
    center: "C100",
    evaluatedStockTotal: 25
  });
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
