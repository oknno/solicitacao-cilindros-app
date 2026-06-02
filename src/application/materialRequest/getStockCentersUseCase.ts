import { normalizeCenter } from "../../domain/materialRequest";
import { getStockCenters } from "../../services/sharepoint/repositories/stockMaterialRepository";

export async function getStockCentersUseCase(): Promise<string[]> {
  const centers = await getStockCenters();
  return [...new Set(centers.map(normalizeCenter).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }),
  );
}
