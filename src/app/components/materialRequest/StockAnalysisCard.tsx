import type { StockAnalysisResult, StockMaterial } from "../../../domain/materialRequest";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { StockRecommendationBadge } from "./StockRecommendationBadge";

interface StockAnalysisCardProps {
  stockMaterial: StockMaterial | null;
  stockAnalysis: StockAnalysisResult;
  requestedCenter?: string;
}

export function StockAnalysisCard(props: StockAnalysisCardProps) {
  const { stockMaterial, stockAnalysis, requestedCenter } = props;

  return (
    <Card>
      <h3 style={{ margin: "0 0 12px" }}>Análise de Estoque</h3>
      <div style={{ display: "grid", gap: 8 }}>
        <Field label="Material encontrado" layout="inline">
          {stockAnalysis.materialFound ? "Sim" : "Não"}
        </Field>
        <Field label="Material" layout="inline">
          {stockMaterial?.materialCode ?? "-"}
        </Field>
        <Field label="Descrição" layout="inline">
          {stockMaterial?.description ?? "-"}
        </Field>
        <Field label="Centro" layout="inline">
          {requestedCenter || stockMaterial?.center || "-"}
        </Field>
        <Field label="Estoque avaliado total" layout="inline">
          {stockAnalysis.evaluatedStockTotal ?? "-"}
        </Field>
        <Field label="Quantidade solicitada" layout="inline">
          {stockAnalysis.requestedQuantity}
        </Field>
        <Field label="Parecer" layout="inline">
          <StockRecommendationBadge value={stockAnalysis.recommendation} />
        </Field>
        <Field label="Mensagem da análise">
          {!stockMaterial && !stockAnalysis.materialFound
            ? "Material não encontrado na base de estoque."
            : stockAnalysis.message}
        </Field>
      </div>
    </Card>
  );
}
