import assert from "node:assert/strict";
import test from "node:test";

import { mapSharePointStockMaterial } from "../../../src/services/sharepoint/mappers/stockMaterialMapper.ts";

const fields = {
  materialCode: "Material",
  description: "Descricao",
  unitOfMeasure: "UMB",
  center: "Centro",
  evaluatedStockTotal: "EstoqueAvaliadoTotal"
};

test("mapSharePointStockMaterial converte estoque numérico", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-001",
      Descricao: "Material A",
      UMB: "KG",
      Centro: "C100",
      EstoqueAvaliadoTotal: 15.5
    },
    fields
  );

  assert.deepEqual(mapped, {
    materialCode: "MAT-001",
    description: "Material A",
    unitOfMeasure: "KG",
    center: "C100",
    evaluatedStockTotal: 15.5
  });
});

test("mapSharePointStockMaterial converte estoque textual", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-002",
      Descricao: "Material B",
      UMB: "UN",
      Centro: "C200",
      EstoqueAvaliadoTotal: "20"
    },
    fields
  );

  assert.equal(mapped.evaluatedStockTotal, 20);
});

test("mapSharePointStockMaterial retorna null para estoque vazio", () => {
  const mapped = mapSharePointStockMaterial(
    {
      Material: "MAT-003",
      Descricao: "Material C",
      UMB: "CX",
      Centro: "C300",
      EstoqueAvaliadoTotal: "  "
    },
    fields
  );

  assert.equal(mapped.evaluatedStockTotal, null);
});
