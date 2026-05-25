import type { StockMaterial } from "../../domain/materialRequest";
import { getStockMaterialsByCenter } from "../../services/sharepoint/repositories/stockMaterialRepository";

export interface GetStockMaterialsByCenterInput {
  center: string;
}

export async function getStockMaterialsByCenterUseCase(
  input: GetStockMaterialsByCenterInput,
): Promise<StockMaterial[]> {
  const center = input.center?.trim();
  if (!center) {
    throw new Error("Informe o centro para carregar os materiais.");
  }

  const materials = await getStockMaterialsByCenter(center);
  return [...materials].sort((a, b) =>
    a.materialCode.localeCompare(b.materialCode) || a.description.localeCompare(b.description),
  );
}
