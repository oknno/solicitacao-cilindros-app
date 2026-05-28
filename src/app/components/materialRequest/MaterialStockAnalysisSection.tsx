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
  stockMaterial: StockMaterial | null;
  requestedQuantity?: number | null;
  mode?: "form" | "view" | "approval";
}

function asNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
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

function buildCoverageValue(stock: number, averageAnnualConsumption: number): number | null {
  if (averageAnnualConsumption <= 0) return null;
  return stock / averageAnnualConsumption;
}

function resolveTitle(mode: MaterialStockAnalysisSectionProps["mode"]): string {
  if (mode === "approval") return "2. Análise do material";
  if (mode === "view") return "Análise do material";
  return "Análise do material";
}

export function MaterialStockAnalysisSection({ stockMaterial, requestedQuantity, mode = "form" }: MaterialStockAnalysisSectionProps) {
  if (!stockMaterial) {
    return (
      <section style={{ border: `1px solid ${uiTokens.stateTones.warning.bd}`, borderRadius: uiTokens.radius.lg, background: uiTokens.stateTones.warning.bg, color: uiTokens.stateTones.warning.fg, padding: uiTokens.spacing.lg, display: "grid", gap: uiTokens.spacing.xs }}>
        <h4 style={{ margin: 0, fontSize: uiTokens.typography.md, fontWeight: uiTokens.typography.titleWeight }}>Análise do material</h4>
        <p style={{ margin: 0, fontSize: uiTokens.typography.sm, lineHeight: 1.4 }}>Material não encontrado na base de estoque. A solicitação seguirá para análise manual.</p>
      </section>
    );
  }

  const evaluatedStock = asNumber(stockMaterial.evaluatedStockTotal);
  const averageAnnualConsumption = asNumber(stockMaterial.averageAnnualConsumption);
  const movementYears = asNumber(stockMaterial.consumptionYearsCount);
  const historicalConsumption = asNumber(stockMaterial.historicalTotal);
  const validRequestedQuantity = hasPositiveNumber(requestedQuantity) ? requestedQuantity : 0;
  const hasRequestedQuantity = validRequestedQuantity > 0;
  const projectedStock = hasRequestedQuantity ? evaluatedStock + validRequestedQuantity : null;
  const requestedPercent = evaluatedStock > 0 && hasRequestedQuantity ? (validRequestedQuantity / evaluatedStock) * 100 : null;
  const coverageYears = buildCoverageValue(evaluatedStock, averageAnnualConsumption);
  const hasCoverage = typeof coverageYears === "number" && Number.isFinite(coverageYears);
  const isHighCoverage = hasCoverage && coverageYears > 5;
  const movingYearAverage = movementYears > 0 ? historicalConsumption / movementYears : averageAnnualConsumption;
  const yearConsumptions = CONSUMPTION_YEARS.map((year) => ({
    label: year.label,
    value: asNumber(stockMaterial[year.key]),
  }));
  const maxConsumption = Math.max(...yearConsumptions.map((item) => item.value), 1);
  const comparativeMax = Math.max(evaluatedStock, validRequestedQuantity, averageAnnualConsumption, projectedStock ?? 0, 1);

  const kpis = [
    { label: "Estoque atual", value: formatNumber(stockMaterial.evaluatedStockTotal) },
    { label: "Preço médio", value: formatCurrency(stockMaterial.averagePrice) },
    { label: "Estoque total (R$)", value: formatCurrency(stockMaterial.totalStockValueBRL) },
    { label: "Consumo total histórico", value: formatNumber(stockMaterial.historicalTotal) },
    { label: "Anos com movimentação", value: formatNumber(stockMaterial.consumptionYearsCount) },
    { label: "Média anual de consumo", value: formatNumber(stockMaterial.averageAnnualConsumption) },
  ];

  const observations = [
    evaluatedStock > 0 ? "Há estoque disponível." : "Não há estoque disponível para este material.",
    `O consumo médio anual é ${formatNumber(stockMaterial.averageAnnualConsumption)}.`,
    `O valor estimado do estoque atual é ${formatCurrency(stockMaterial.totalStockValueBRL)}.`,
    `O histórico mostra movimentação em ${formatNumber(stockMaterial.consumptionYearsCount)} anos.`,
    hasRequestedQuantity
      ? `A quantidade solicitada representa ${formatPercent(requestedPercent)} do estoque atual e projetaria o estoque para ${formatNumber(projectedStock)}.`
      : "Informe a quantidade solicitada para calcular os comparativos.",
    hasCoverage
      ? `A cobertura estimada do estoque é de aproximadamente ${formatNumber(coverageYears)} anos, com base na média anual.`
      : "Não há consumo histórico suficiente para estimar cobertura.",
  ];

  const coverageTone = isHighCoverage ? uiTokens.stateTones.warning : uiTokens.stateTones.neutral;

  return (
    <section style={{ border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.lg, background: uiTokens.colors.surface, padding: uiTokens.spacing.lg, display: "grid", gap: uiTokens.spacing.md }}>
      <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
        <h4 style={{ margin: 0, fontSize: uiTokens.typography.md, fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>{resolveTitle(mode)}</h4>
        <p style={{ margin: 0, fontSize: uiTokens.typography.sm, color: uiTokens.colors.textMuted }}>{stockMaterial.materialCode} - {stockMaterial.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: uiTokens.spacing.sm }}>
        {kpis.map((kpi) => (
          <div key={kpi.label} style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, background: uiTokens.colors.surfaceMuted, padding: uiTokens.spacing.md }}>
            <div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted, fontWeight: uiTokens.typography.labelWeight }}>{kpi.label}</div>
            <div style={{ marginTop: uiTokens.spacing.xs, fontSize: uiTokens.typography.md, color: uiTokens.colors.textStrong, fontWeight: uiTokens.typography.titleWeight }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ border: `1px solid ${coverageTone.bd}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: coverageTone.bg, color: coverageTone.fg, display: "grid", gap: uiTokens.spacing.xs }}>
        <div style={{ fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>Cobertura estimada</div>
        <div style={{ fontSize: uiTokens.typography.xl, fontWeight: uiTokens.typography.titleWeight, color: coverageTone.fg }}>{hasCoverage ? `${formatNumber(coverageYears)} anos` : "Sem consumo médio"}</div>
        <div style={{ fontSize: uiTokens.typography.sm }}>{hasCoverage ? "Com base na média anual de consumo." : "Não há consumo histórico suficiente para estimar cobertura."}</div>
        {isHighCoverage ? <div style={{ fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Cobertura elevada. Avalie a real necessidade de nova compra.</div> : null}
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
          {!hasRequestedQuantity ? <div style={{ marginBottom: uiTokens.spacing.sm, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Informe a quantidade solicitada para calcular os comparativos.</div> : null}
          {[
            { label: "Estoque atual", value: evaluatedStock, visible: true },
            { label: "Qtde. solicitada", value: validRequestedQuantity, visible: true },
            { label: "Estoque projetado após solicitação", value: projectedStock ?? 0, visible: hasRequestedQuantity },
            { label: "Consumo médio anual", value: averageAnnualConsumption, visible: true },
          ].filter((item) => item.visible).map((item) => (
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
            <span>Estoque projetado após solicitação: <strong style={{ color: uiTokens.colors.text }}>{projectedStock === null ? "-" : formatNumber(projectedStock)}</strong></span>
            <span>Percentual solicitado sobre estoque: <strong style={{ color: uiTokens.colors.text }}>{formatPercent(requestedPercent)}</strong></span>
            <span>Consumo médio anual: <strong style={{ color: uiTokens.colors.text }}>{formatNumber(averageAnnualConsumption)}</strong></span>
            <span>Cobertura estimada em anos: <strong style={{ color: uiTokens.colors.text }}>{hasCoverage ? formatNumber(coverageYears) : "Sem consumo médio"}</strong></span>
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
