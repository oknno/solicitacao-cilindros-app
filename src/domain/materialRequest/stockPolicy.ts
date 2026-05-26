import type { StockAnalysisResult, StockMaterial } from "./stockTypes";

export interface AnalyzeStockInput {
  material: StockMaterial | null;
  requestedQuantity: number;
}

function createResult(input: {
  materialFound: boolean;
  recommendation: StockAnalysisResult["recommendation"];
  evaluatedStockTotal: number | null;
  requestedQuantity: number;
  requiresRequesterJustification: boolean;
  message: string;
}): StockAnalysisResult {
  return {
    materialFound: input.materialFound,
    recommendation: input.recommendation,
    evaluatedStockTotal: input.evaluatedStockTotal,
    requestedQuantity: input.requestedQuantity,
    requiresRequesterJustification: input.requiresRequesterJustification,
    message: input.message,
  };
}

export function analyzeStockForMaterialRequest(
  input: AnalyzeStockInput,
): StockAnalysisResult {
  if (input.requestedQuantity <= 0) {
    throw new Error("requestedQuantity must be greater than zero.");
  }

  if (!input.material) {
    return createResult({
      materialFound: false,
      recommendation: "MANUAL_REVIEW_REQUIRED",
      evaluatedStockTotal: null,
      requestedQuantity: input.requestedQuantity,
      requiresRequesterJustification: false,
      message:
        "Material não encontrado na base de estoque. A solicitação requer análise manual.",
    });
  }

  const { evaluatedStockTotal } = input.material;

  if (typeof evaluatedStockTotal !== "number" || Number.isNaN(evaluatedStockTotal)) {
    return createResult({
      materialFound: true,
      recommendation: "MANUAL_REVIEW_REQUIRED",
      evaluatedStockTotal: null,
      requestedQuantity: input.requestedQuantity,
      requiresRequesterJustification: false,
      message:
        "Estoque avaliado total indisponível ou inválido. A solicitação requer análise manual.",
    });
  }

  if (evaluatedStockTotal === 0) {
    return createResult({
      materialFound: true,
      recommendation: "PURCHASE_RECOMMENDED",
      evaluatedStockTotal,
      requestedQuantity: input.requestedQuantity,
      requiresRequesterJustification: false,
      message:
        "Compra recomendada. Não há estoque avaliado disponível para este material.",
    });
  }

  if (evaluatedStockTotal > 0 && evaluatedStockTotal < input.requestedQuantity) {
    return createResult({
      materialFound: true,
      recommendation: "PURCHASE_RECOMMENDED_PARTIAL_STOCK",
      evaluatedStockTotal,
      requestedQuantity: input.requestedQuantity,
      requiresRequesterJustification: false,
      message:
        "Compra recomendada com estoque parcial. O estoque atual não atende integralmente à quantidade solicitada.",
    });
  }

  return createResult({
    materialFound: true,
    recommendation: "PURCHASE_NOT_RECOMMENDED",
    evaluatedStockTotal,
    requestedQuantity: input.requestedQuantity,
    requiresRequesterJustification: true,
    message:
      "Compra não recomendada. Existe estoque avaliado suficiente para atender à quantidade solicitada.",
  });
}
