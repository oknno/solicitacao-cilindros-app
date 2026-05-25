import {
  analyzeStockForMaterialRequest,
  type StockAnalysisResult,
  type StockMaterial,
} from "../../domain/materialRequest";
import { findStockMaterialByCode } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface FindAndAnalyzeStockMaterialInput {
  materialCode: string;
  requestedQuantity: number;
}

export interface FindAndAnalyzeStockMaterialOutput {
  material: StockMaterial | null;
  analysis: StockAnalysisResult;
}

export async function findAndAnalyzeStockMaterialUseCase(
  input: FindAndAnalyzeStockMaterialInput,
): Promise<FindAndAnalyzeStockMaterialOutput> {
  const materialCode = input.materialCode?.trim();

  if (!materialCode) {
    throw new Error("Informe o código do material para consultar o estoque.");
  }

  if (input.requestedQuantity <= 0) {
    throw new Error("Informe uma quantidade solicitada maior que zero.");
  }

  const material = await findStockMaterialByCode(materialCode);
  const analysis = analyzeStockForMaterialRequest({
    material,
    requestedQuantity: input.requestedQuantity,
  });

  return {
    material,
    analysis,
  };
}
