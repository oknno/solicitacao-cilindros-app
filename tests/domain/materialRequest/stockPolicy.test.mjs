import assert from "node:assert/strict";
import test from "node:test";

import { analyzeStockForMaterialRequest } from "../../../src/domain/materialRequest/stockPolicy.ts";

const baseMaterial = {
  materialCode: "MAT-1",
  description: "Material 1",
  unitOfMeasure: "UN",
  center: "1000",
  evaluatedStockTotal: 10,
};

test("material null retorna MANUAL_REVIEW_REQUIRED", () => {
  const result = analyzeStockForMaterialRequest({ material: null, requestedQuantity: 5 });
  assert.equal(result.recommendation, "MANUAL_REVIEW_REQUIRED");
  assert.equal(result.requiresRequesterJustification, true);
});

test("estoque null retorna MANUAL_REVIEW_REQUIRED", () => {
  const result = analyzeStockForMaterialRequest({
    material: { ...baseMaterial, evaluatedStockTotal: null },
    requestedQuantity: 5,
  });
  assert.equal(result.recommendation, "MANUAL_REVIEW_REQUIRED");
});

test("estoque 0 retorna PURCHASE_RECOMMENDED", () => {
  const result = analyzeStockForMaterialRequest({
    material: { ...baseMaterial, evaluatedStockTotal: 0 },
    requestedQuantity: 5,
  });
  assert.equal(result.recommendation, "PURCHASE_RECOMMENDED");
});

test("estoque menor que solicitado retorna PURCHASE_RECOMMENDED_PARTIAL_STOCK", () => {
  const result = analyzeStockForMaterialRequest({
    material: { ...baseMaterial, evaluatedStockTotal: 3 },
    requestedQuantity: 5,
  });
  assert.equal(result.recommendation, "PURCHASE_RECOMMENDED_PARTIAL_STOCK");
});

test("estoque igual ao solicitado retorna PURCHASE_NOT_RECOMMENDED", () => {
  const result = analyzeStockForMaterialRequest({
    material: { ...baseMaterial, evaluatedStockTotal: 5 },
    requestedQuantity: 5,
  });
  assert.equal(result.recommendation, "PURCHASE_NOT_RECOMMENDED");
});

test("estoque maior que solicitado retorna PURCHASE_NOT_RECOMMENDED", () => {
  const result = analyzeStockForMaterialRequest({
    material: { ...baseMaterial, evaluatedStockTotal: 7 },
    requestedQuantity: 5,
  });
  assert.equal(result.recommendation, "PURCHASE_NOT_RECOMMENDED");
});

test("quantidade solicitada zero lança erro", () => {
  assert.throws(
    () => analyzeStockForMaterialRequest({ material: baseMaterial, requestedQuantity: 0 }),
    /requestedQuantity must be greater than zero/,
  );
});

test("quantidade solicitada negativa lança erro", () => {
  assert.throws(
    () => analyzeStockForMaterialRequest({ material: baseMaterial, requestedQuantity: -1 }),
    /requestedQuantity must be greater than zero/,
  );
});
