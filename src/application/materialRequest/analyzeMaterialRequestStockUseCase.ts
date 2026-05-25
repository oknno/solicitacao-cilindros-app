import {
  analyzeStockForMaterialRequest,
  type StockAnalysisResult,
  type StockMaterial,
} from "../../domain/materialRequest";
import { findStockMaterialByCenterAndCode } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface AnalyzeMaterialRequestStockInput {
  center: string;
  materialCode: string;
  requestedQuantity: number;
}

export interface AnalyzeMaterialRequestStockOutput {
  stockMaterial: StockMaterial | null;
  stockAnalysis: StockAnalysisResult;
}

export async function analyzeMaterialRequestStockUseCase(
  input: AnalyzeMaterialRequestStockInput,
): Promise<AnalyzeMaterialRequestStockOutput> {
  const center = input.center?.trim();
  const materialCode = input.materialCode?.trim();

  if (!center) {
    throw new Error("Informe o centro para consultar o estoque.");
  }

  if (!materialCode) {
    throw new Error("Informe o código do material para consultar o estoque.");
  }

  if (input.requestedQuantity <= 0) {
    throw new Error("Informe uma quantidade solicitada maior que zero.");
  }

  const stockMaterial = await findStockMaterialByCenterAndCode({ center, materialCode });
  const stockAnalysis = analyzeStockForMaterialRequest({
    material: stockMaterial,
    requestedQuantity: input.requestedQuantity,
  });

  return {
    stockMaterial,
    stockAnalysis,
  };
}
