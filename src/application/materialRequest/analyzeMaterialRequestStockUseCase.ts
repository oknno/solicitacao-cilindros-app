import {
  analyzeStockForMaterialRequest,
  type StockAnalysisResult,
  type StockMaterial,
} from "../../domain/materialRequest";
import { findStockMaterialByCode } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface AnalyzeMaterialRequestStockInput {
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
  const materialCode = input.materialCode?.trim();

  if (!materialCode) {
    throw new Error("Informe o código do material para consultar o estoque.");
  }

  if (input.requestedQuantity <= 0) {
    throw new Error("Informe uma quantidade solicitada maior que zero.");
  }

  const stockMaterial = await findStockMaterialByCode(materialCode);
  const stockAnalysis = analyzeStockForMaterialRequest({
    material: stockMaterial,
    requestedQuantity: input.requestedQuantity,
  });

  return {
    stockMaterial,
    stockAnalysis,
  };
}
