import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("findAndAnalyzeStockMaterialUseCase lança erro quando materialCode é vazio", async () => {
  const { findAndAnalyzeStockMaterialUseCase } = await import(
    "../../../src/application/materialRequest/findAndAnalyzeStockMaterialUseCase.ts"
  );

  await assert.rejects(
    () =>
      findAndAnalyzeStockMaterialUseCase({
        materialCode: "   ",
        requestedQuantity: 1,
      }),
    /Informe o código do material para consultar o estoque\./,
  );
});

test("findAndAnalyzeStockMaterialUseCase lança erro quando requestedQuantity <= 0", async () => {
  const { findAndAnalyzeStockMaterialUseCase } = await import(
    "../../../src/application/materialRequest/findAndAnalyzeStockMaterialUseCase.ts"
  );

  await assert.rejects(
    () =>
      findAndAnalyzeStockMaterialUseCase({
        materialCode: "MAT-001",
        requestedQuantity: 0,
      }),
    /Informe uma quantidade solicitada maior que zero\./,
  );
});

test("findAndAnalyzeStockMaterialUseCase retorna PURCHASE_NOT_RECOMMENDED quando estoque é suficiente", async () => {
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", {
    namedExports: {
      findStockMaterialByCode: async () => ({
        materialCode: "MAT-001",
        description: "Material A",
        unitOfMeasure: "UN",
        center: "C100",
        evaluatedStockTotal: 10,
      }),
    },
  });

  const { findAndAnalyzeStockMaterialUseCase } = await import(
    "../../../src/application/materialRequest/findAndAnalyzeStockMaterialUseCase.ts"
  );

  const result = await findAndAnalyzeStockMaterialUseCase({
    materialCode: " MAT-001 ",
    requestedQuantity: 5,
  });

  assert.equal(result.material?.materialCode, "MAT-001");
  assert.equal(result.analysis.recommendation, "PURCHASE_NOT_RECOMMENDED");
});

test("findAndAnalyzeStockMaterialUseCase retorna PURCHASE_RECOMMENDED quando estoque é zero", async () => {
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", {
    namedExports: {
      findStockMaterialByCode: async () => ({
        materialCode: "MAT-002",
        description: "Material B",
        unitOfMeasure: "UN",
        center: "C200",
        evaluatedStockTotal: 0,
      }),
    },
  });

  const { findAndAnalyzeStockMaterialUseCase } = await import(
    "../../../src/application/materialRequest/findAndAnalyzeStockMaterialUseCase.ts"
  );

  const result = await findAndAnalyzeStockMaterialUseCase({
    materialCode: "MAT-002",
    requestedQuantity: 3,
  });

  assert.equal(result.analysis.recommendation, "PURCHASE_RECOMMENDED");
});

test("findAndAnalyzeStockMaterialUseCase retorna MANUAL_REVIEW_REQUIRED quando material não é encontrado", async () => {
  mock.module("../../../src/services/sharepoint/repositories/stockMaterialRepository.ts", {
    namedExports: {
      findStockMaterialByCode: async () => null,
    },
  });

  const { findAndAnalyzeStockMaterialUseCase } = await import(
    "../../../src/application/materialRequest/findAndAnalyzeStockMaterialUseCase.ts"
  );

  const result = await findAndAnalyzeStockMaterialUseCase({
    materialCode: "INEXISTENTE",
    requestedQuantity: 2,
  });

  assert.equal(result.material, null);
  assert.equal(result.analysis.recommendation, "MANUAL_REVIEW_REQUIRED");
});
