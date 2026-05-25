import type { StockRecommendation } from "../../../domain/materialRequest/stockTypes";
import { Badge } from "../ui/Badge";

const recommendationMap: Record<StockRecommendation, { text: string; tone: "info" | "success" | "warning" | "danger" }> = {
  PURCHASE_RECOMMENDED: { text: "Compra recomendada", tone: "success" },
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: { text: "Compra recomendada com estoque parcial", tone: "info" },
  PURCHASE_NOT_RECOMMENDED: { text: "Compra não recomendada", tone: "warning" },
  MANUAL_REVIEW_REQUIRED: { text: "Requer análise manual", tone: "danger" }
};

export function StockRecommendationBadge({ value }: { value: StockRecommendation }) {
  const mapped = recommendationMap[value];

  if (!mapped && import.meta.env.DEV) {
    console.warn("[StockRecommendationBadge] Parecer desconhecido recebido:", value);
  }

  return <Badge text={mapped?.text ?? value ?? "-"} tone={mapped?.tone ?? "warning"} />;
}
