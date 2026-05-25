import type { StockMaterial } from "../../domain/materialRequest/stockTypes";
import {
  replaceStockItems,
  type StockItemsReplaceProgress,
  type StockItemsReplaceStage
} from "../../services/sharepoint/repositories/stockMaterialRepository";

export type ReplaceStockItemsStage =
  | "VALIDATING"
  | StockItemsReplaceStage
  | "COMPLETED"
  | "FAILED";

export type ReplaceStockItemsProgress = {
  stage: ReplaceStockItemsStage;
  processed: number;
  total: number;
};

export async function replaceStockItemsUseCase(
  items: StockMaterial[],
  options?: { onProgress?: (progress: ReplaceStockItemsProgress) => void }
): Promise<{ deletedCount: number; createdCount: number }> {
  options?.onProgress?.({ stage: "VALIDATING", processed: 0, total: items.length });
  if (!items.length) throw new Error("Nenhum item válido para importação.");

  const onRepositoryProgress = (progress: StockItemsReplaceProgress): void => {
    options?.onProgress?.(progress);
  };

  try {
    const result = await replaceStockItems(items, { onProgress: onRepositoryProgress });
    options?.onProgress?.({ stage: "COMPLETED", processed: result.createdCount, total: result.createdCount });
    return result;
  } catch (error) {
    options?.onProgress?.({ stage: "FAILED", processed: 0, total: items.length });
    throw error;
  }
}
