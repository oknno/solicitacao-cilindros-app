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

function formatCoverage(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Sem consumo médio";
  return `${formatNumber(value)} anos`;
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

function resolveCoverageTone(coverage: number | null): keyof typeof uiTokens.stateTones {
  if (coverage == null) return "neutral";
  if (coverage > 50) return "danger";
  if (coverage > 5) return "warning";
  return "neutral";
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
  const validRequestedQuantity = hasPositiveNumber(requestedQuantity) ? requestedQuantity : 0;
  const hasRequestedQuantity = validRequestedQuantity > 0;
  const projectedStock = evaluatedStock + validRequestedQuantity;
  const requestedPercent = evaluatedStock > 0 && hasRequestedQuantity ? (validRequestedQuantity / evaluatedStock) * 100 : null;
  const currentCoverageYears = buildCoverageValue(evaluatedStock, averageAnnualConsumption);
  const projectedCoverageYears = buildCoverageValue(projectedStock, averageAnnualConsumption);
  const hasCurrentCoverage = typeof currentCoverageYears === "number" && Number.isFinite(currentCoverageYears);
  const hasProjectedCoverage = typeof projectedCoverageYears === "number" && Number.isFinite(projectedCoverageYears);
  const coverageIncrease = hasRequestedQuantity && hasCurrentCoverage && hasProjectedCoverage ? projectedCoverageYears - currentCoverageYears : null;
  const coverageFactor = hasRequestedQuantity && hasCurrentCoverage && hasProjectedCoverage && currentCoverageYears > 0 ? projectedCoverageYears / currentCoverageYears : null;
  const yearConsumptions = CONSUMPTION_YEARS.map((year) => ({
    label: year.label,
    value: asNumber(stockMaterial[year.key]),
  }));
  const maxConsumption = Math.max(...yearConsumptions.map((item) => item.value), 1);
  const stackedTotal = Math.max(projectedStock, 1);
  const stockSegmentPercent = Math.max((evaluatedStock / stackedTotal) * 100, evaluatedStock > 0 ? 4 : 0);
  const requestSegmentPercent = Math.max((validRequestedQuantity / stackedTotal) * 100, validRequestedQuantity > 0 ? 4 : 0);

  const kpis = [
    { label: "Estoque atual", value: formatNumber(stockMaterial.evaluatedStockTotal) },
    { label: "Preço médio", value: formatCurrency(stockMaterial.averagePrice) },
    { label: "Estoque total (R$)", value: formatCurrency(stockMaterial.totalStockValueBRL) },
    { label: "Consumo total histórico", value: formatNumber(stockMaterial.historicalTotal) },
    { label: "Anos com movimentação", value: formatNumber(stockMaterial.consumptionYearsCount) },
    { label: "Média anual de consumo", value: formatNumber(stockMaterial.averageAnnualConsumption) },
  ];

  const stockConsumptionObservations = [
    evaluatedStock > 0 ? "Há estoque disponível." : "Não há estoque disponível para este material.",
    `O consumo médio anual é ${formatNumber(stockMaterial.averageAnnualConsumption)}.`,
    `O valor estimado do estoque atual é ${formatCurrency(stockMaterial.totalStockValueBRL)}.`,
    `O histórico mostra movimentação em ${formatNumber(stockMaterial.consumptionYearsCount)} anos.`,
  ];

  const requestImpactObservations = [
    hasRequestedQuantity && requestedPercent !== null
      ? `A solicitação representa ${formatPercent(requestedPercent)} do estoque atual.`
      : evaluatedStock > 0 ? "Informe a quantidade solicitada para calcular o percentual sobre o estoque atual." : "Sem estoque atual para comparação percentual.",
    hasRequestedQuantity
      ? `O estoque projetado após a solicitação seria ${formatNumber(projectedStock)}.`
      : "Informe a quantidade solicitada para calcular o estoque projetado.",
    hasCurrentCoverage
      ? `A cobertura atual é de aproximadamente ${formatNumber(currentCoverageYears)} anos.`
      : "Não há consumo histórico suficiente para estimar cobertura.",
    hasProjectedCoverage
      ? `Com a solicitação, a cobertura projetada passaria para ${formatNumber(projectedCoverageYears)} anos.`
      : "A cobertura após solicitação também não pode ser estimada sem consumo médio.",
    coverageIncrease != null
      ? `A solicitação aumentaria a cobertura em ${formatNumber(coverageIncrease)} anos.`
      : null,
    coverageFactor != null
      ? `A cobertura após solicitação seria ${formatNumber(coverageFactor)}x a cobertura atual.`
      : null,
  ].filter((observation): observation is string => Boolean(observation));

  const currentCoverageTone = uiTokens.stateTones[resolveCoverageTone(currentCoverageYears)];
  const projectedCoverageTone = uiTokens.stateTones[resolveCoverageTone(projectedCoverageYears)];

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: uiTokens.spacing.md }}>
        <div style={{ border: `1px solid ${currentCoverageTone.bd}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: currentCoverageTone.bg, color: currentCoverageTone.fg, display: "grid", gap: uiTokens.spacing.xs }}>
          <div style={{ fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>Cobertura atual</div>
          <div style={{ fontSize: uiTokens.typography.xl, fontWeight: uiTokens.typography.titleWeight, color: currentCoverageTone.fg }}>{formatCoverage(currentCoverageYears)}</div>
          <div style={{ fontSize: uiTokens.typography.sm }}>{hasCurrentCoverage ? "Com base no estoque atual e na média anual de consumo." : "Não há consumo histórico suficiente para estimar cobertura."}</div>
        </div>

        <div style={{ border: `1px solid ${projectedCoverageTone.bd}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: projectedCoverageTone.bg, color: projectedCoverageTone.fg, display: "grid", gap: uiTokens.spacing.xs }}>
          <div style={{ fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>Cobertura após solicitação</div>
          <div style={{ fontSize: uiTokens.typography.xl, fontWeight: uiTokens.typography.titleWeight, color: projectedCoverageTone.fg }}>{formatCoverage(projectedCoverageYears)}</div>
          <div style={{ fontSize: uiTokens.typography.sm }}>{hasProjectedCoverage ? "Considera o estoque atual somado à quantidade solicitada." : "Não há consumo histórico suficiente para estimar cobertura."}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: uiTokens.spacing.md }}>
        <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.sm, background: uiTokens.colors.surfaceMuted, display: "grid", gridTemplateRows: "auto 1fr", minHeight: "100%" }}>
          <div style={{ marginBottom: uiTokens.spacing.xs, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Consumo histórico por ano</div>
          <div style={{ minHeight: 190, height: "100%", display: "grid", gridTemplateColumns: `repeat(${yearConsumptions.length}, minmax(42px, 1fr))`, alignItems: "stretch", gap: uiTokens.spacing.sm, padding: `${uiTokens.spacing.xs}px ${uiTokens.spacing.xs}px 0`, borderBottom: `1px solid ${uiTokens.colors.border}` }}>
            {yearConsumptions.map((item) => {
              const heightPercent = Math.max((item.value / maxConsumption) * 100, item.value > 0 ? 8 : 2);
              return (
                <div key={item.label} style={{ height: "100%", display: "grid", gridTemplateRows: "22px minmax(0, 1fr) 18px", alignItems: "end", justifyItems: "center", gap: uiTokens.spacing.xs }}>
                  <span style={{ color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{formatNumber(item.value)}</span>
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "end", justifyContent: "center" }}>
                    <div title={`${item.label}: ${formatNumber(item.value)}`} style={{ width: "70%", maxWidth: 42, minWidth: 22, height: `${heightPercent}%`, minHeight: item.value > 0 ? 8 : 2, borderRadius: `${uiTokens.radius.sm}px ${uiTokens.radius.sm}px 3px 3px`, background: item.value > 0 ? uiTokens.colors.accent : uiTokens.colors.borderStrong }} />
                  </div>
                  <span style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.sm, background: uiTokens.colors.surfaceMuted, display: "grid", gap: uiTokens.spacing.sm, alignContent: "start" }}>
          <div style={{ color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Estoque x Solicitação</div>
          {!hasRequestedQuantity ? <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Informe a quantidade solicitada para calcular os comparativos.</div> : null}

          <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
            <div style={{ display: "flex", height: 30, borderRadius: uiTokens.radius.pill, overflow: "hidden", background: uiTokens.colors.borderMuted }}>
              <div title={`Estoque atual: ${formatNumber(evaluatedStock)}`} style={{ width: `${stockSegmentPercent}%`, minWidth: evaluatedStock > 0 ? 32 : 0, background: uiTokens.colors.accentAlt }} />
              <div title={`Qtde. solicitada: ${formatNumber(validRequestedQuantity)}`} style={{ width: `${requestSegmentPercent}%`, minWidth: validRequestedQuantity > 0 ? 32 : 0, background: uiTokens.colors.accentWarning }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: uiTokens.spacing.sm, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, flexWrap: "wrap" }}>
              <span><strong style={{ color: uiTokens.colors.text }}>Estoque atual:</strong> {formatNumber(evaluatedStock)}</span>
              <span><strong style={{ color: uiTokens.colors.text }}>Qtde. solicitada:</strong> {formatNumber(validRequestedQuantity)}</span>
              <span><strong style={{ color: uiTokens.colors.text }}>Projetado:</strong> {formatNumber(projectedStock)}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: uiTokens.spacing.xs }}>
            {[
              { label: "Aumento absoluto", value: `+${formatNumber(validRequestedQuantity)} unidades` },
              { label: "Aumento percentual", value: hasRequestedQuantity ? evaluatedStock > 0 ? `+${formatPercent(requestedPercent)}` : "Sem estoque atual" : "-" },
              { label: "Estoque final projetado", value: `${formatNumber(projectedStock)} unidades` },
            ].map((item) => (
              <div key={item.label} style={{ border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.md, background: uiTokens.colors.surface, padding: uiTokens.spacing.sm, minHeight: 76, boxSizing: "border-box" }}>
                <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{item.label}</div>
                <div style={{ marginTop: 2, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.titleWeight }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.sm, background: uiTokens.colors.surfaceMuted }}>
        <div style={{ marginBottom: uiTokens.spacing.xs, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Leitura analítica</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: uiTokens.spacing.md }}>
          {[
            { title: "Estoque e consumo", items: stockConsumptionObservations },
            { title: "Impacto da solicitação", items: requestImpactObservations },
          ].map((group) => (
            <div key={group.title} style={{ display: "grid", gap: uiTokens.spacing.xs, alignContent: "start" }}>
              <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{group.title}</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: uiTokens.spacing.xs, color: uiTokens.colors.text, fontSize: uiTokens.typography.sm, lineHeight: 1.4 }}>
                {group.items.map((observation) => <li key={observation}>{observation}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
