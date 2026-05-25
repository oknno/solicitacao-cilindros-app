import type { StockMaterial } from "../../domain/materialRequest/stockTypes";
import { getAllStockItems, replaceStockItems } from "../../services/sharepoint/repositories/stockMaterialRepository";

export async function replaceStockItemsUseCase(items: StockMaterial[]): Promise<{ deletedCount: number; createdCount: number }> {
  if (!items.length) throw new Error("Nenhum item válido para importação.");
  const existing = await getAllStockItems();
  await replaceStockItems(items);
  return { deletedCount: existing.length, createdCount: items.length };
}
