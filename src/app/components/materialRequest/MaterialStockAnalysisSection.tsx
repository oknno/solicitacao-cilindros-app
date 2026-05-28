import type { StockMaterial } from "../../../domain/materialRequest";
import { uiTokens } from "../ui/tokens";

const CONSUMPTION_YEARS = [
  { label: "2021", key: "consumption2021" },
  { label: "2022", key: "consumption2022" },
  { label: "2023", key: "consumption2023" },
  { label: "2024", key: "consumption2024" },
  { label: "2025", key: "consumption2025" },
  { label: "2026", key: "consumption2026" },
] as const;

interface MaterialStockAnalysisSectionProps {
  material: StockMaterial;
  requestedQuantity: number;
}

function asNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number | null | undefined, fallback = "-"): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercent(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

function buildCoverageLabel(stock: number, averageAnnualConsumption: number): string {
  if (averageAnnualConsumption <= 0) return "Sem média anual para estimar cobertura";
  return `${formatNumber(stock / averageAnnualConsumption)} anos`;
}

export function MaterialStockAnalysisSection({ material, requestedQuantity }: MaterialStockAnalysisSectionProps) {
  const evaluatedStock = asNumber(material.evaluatedStockTotal);
  const averageAnnualConsumption = asNumber(material.averageAnnualConsumption);
  const movementYears = asNumber(material.consumptionYearsCount);
  const historicalConsumption = asNumber(material.historicalTotal);
  const validRequestedQuantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? requestedQuantity : 0;
  const stockDifference = validRequestedQuantity > 0 ? evaluatedStock - validRequestedQuantity : null;
  const requestedPercent = evaluatedStock > 0 && validRequestedQuantity > 0 ? (validRequestedQuantity / evaluatedStock) * 100 : null;
  const coverageLabel = buildCoverageLabel(evaluatedStock, averageAnnualConsumption);
  const movingYearAverage = movementYears > 0 ? historicalConsumption / movementYears : averageAnnualConsumption;
  const yearConsumptions = CONSUMPTION_YEARS.map((year) => ({
    label: year.label,
    value: asNumber(material[year.key]),
  }));
  const maxConsumption = Math.max(...yearConsumptions.map((item) => item.value), 1);
  const comparativeMax = Math.max(evaluatedStock, validRequestedQuantity, averageAnnualConsumption, 1);

  const kpis = [
    { label: "Estoque atual", value: formatNumber(material.evaluatedStockTotal) },
    { label: "Preço médio", value: formatCurrency(material.averagePrice) },
    { label: "Estoque total (R$)", value: formatCurrency(material.totalStockValueBRL) },
    { label: "Consumo total histórico", value: formatNumber(material.historicalTotal) },
    { label: "Anos com movimentação", value: formatNumber(material.consumptionYearsCount) },
    { label: "Média anual de consumo", value: formatNumber(material.averageAnnualConsumption) },
  ];

  const observations = [
    evaluatedStock > 0 ? "Há estoque disponível." : "Não há estoque disponível para este material.",
    `O consumo médio anual é ${formatNumber(material.averageAnnualConsumption)}.`,
    `O valor estimado do estoque atual é ${formatCurrency(material.totalStockValueBRL)}.`,
    `O histórico mostra movimentação em ${formatNumber(material.consumptionYearsCount)} anos.`,
    validRequestedQuantity > 0
      ? `A quantidade solicitada representa ${formatPercent(requestedPercent)} do estoque atual.`
      : "Informe a quantidade solicitada para calcular o percentual sobre o estoque.",
    `A cobertura estimada do estoque é de aproximadamente ${coverageLabel}, com base na média anual.`,
  ];

  return (
    <section style={{ border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.lg, background: uiTokens.colors.surface, padding: uiTokens.spacing.lg, display: "grid", gap: uiTokens.spacing.md }}>
      <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
        <h4 style={{ margin: 0, fontSize: uiTokens.typography.md, fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>Análise do material</h4>
        <p style={{ margin: 0, fontSize: uiTokens.typography.sm, color: uiTokens.colors.textMuted }}>{material.materialCode} - {material.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: uiTokens.spacing.sm }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, background: uiTokens.colors.surfaceMuted, padding: uiTokens.spacing.md }}>
            <div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted, fontWeight: uiTokens.typography.labelWeight }}>{kpi.label}</div>
            <div style={{ marginTop: uiTokens.spacing.xs, fontSize: uiTokens.typography.md, color: uiTokens.colors.textStrong, fontWeight: uiTokens.typography.titleWeight }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: uiTokens.spacing.md }}>
        <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: uiTokens.colors.surfaceMuted }}>
          <div style={{ marginBottom: uiTokens.spacing.sm, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Consumo histórico por ano</div>
          <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
            {yearConsumptions.map((item) => (
              <div key={item.label} style={{ display: "grid", gridTemplateColumns: "44px 1fr 56px", alignItems: "center", gap: uiTokens.spacing.sm }}>
                <span style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{item.label}</span>
                <div style={{ height: 10, borderRadius: uiTokens.radius.pill, background: uiTokens.colors.borderMuted, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max((item.value / maxConsumption) * 100, item.value > 0 ? 4 : 0)}%`, height: "100%", borderRadius: uiTokens.radius.pill, background: uiTokens.colors.accent }} />
                </div>
                <span style={{ textAlign: "right", color: uiTokens.colors.text, fontSize: uiTokens.typography.xs }}>{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: uiTokens.colors.surfaceMuted }}>
          <div style={{ marginBottom: uiTokens.spacing.sm, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Comparativos</div>
          {[
            { label: "Estoque atual", value: evaluatedStock },
            { label: "Qtde. solicitada", value: validRequestedQuantity },
            { label: "Média anual", value: averageAnnualConsumption },
          ].map((item) => (
            <div key={item.label} style={{ display: "grid", gap: uiTokens.spacing.xs, marginBottom: uiTokens.spacing.sm }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: uiTokens.spacing.sm, fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>
                <span>{item.label}</span>
                <strong style={{ color: uiTokens.colors.text }}>{formatNumber(item.value)}</strong>
              </div>
              <div style={{ height: 8, borderRadius: uiTokens.radius.pill, background: uiTokens.colors.borderMuted, overflow: "hidden" }}>
                <div style={{ width: `${Math.max((item.value / comparativeMax) * 100, item.value > 0 ? 4 : 0)}%`, height: "100%", borderRadius: uiTokens.radius.pill, background: item.label === "Qtde. solicitada" ? uiTokens.colors.accentWarning : uiTokens.colors.accentAlt }} />
              </div>
            </div>
          ))}
          <div style={{ display: "grid", gap: uiTokens.spacing.xs, marginTop: uiTokens.spacing.sm, fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>
            <span>Diferença estoque x solicitação: <strong style={{ color: uiTokens.colors.text }}>{stockDifference === null ? "-" : formatNumber(stockDifference)}</strong></span>
            <span>Percentual solicitado sobre estoque: <strong style={{ color: uiTokens.colors.text }}>{formatPercent(requestedPercent)}</strong></span>
            <span>Consumo médio por ano com movimentação: <strong style={{ color: uiTokens.colors.text }}>{formatNumber(movingYearAverage)}</strong></span>
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: uiTokens.colors.surfaceMuted }}>
        <div style={{ marginBottom: uiTokens.spacing.xs, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Leitura analítica</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: uiTokens.spacing.xs, color: uiTokens.colors.text, fontSize: uiTokens.typography.sm, lineHeight: 1.4 }}>
          {observations.map((observation) => <li key={observation}>{observation}</li>)}
        </ul>
      </div>
    </section>
  );
}
