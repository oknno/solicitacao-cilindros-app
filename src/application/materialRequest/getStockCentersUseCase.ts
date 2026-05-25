import { getStockCenters } from "../../services/sharepoint/repositories/stockMaterialRepository";

export async function getStockCentersUseCase(): Promise<string[]> {
  const centers = await getStockCenters();
  return [...new Set(centers.map((center) => center.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}
