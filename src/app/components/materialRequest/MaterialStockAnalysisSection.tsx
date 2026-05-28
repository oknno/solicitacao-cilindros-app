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

function buildCoverageMessages(currentCoverage: number | null, projectedCoverage: number | null): string[] {
  const messages: string[] = [];

  if (currentCoverage != null && currentCoverage > 5) {
    messages.push("Cobertura elevada. Avalie a real necessidade de nova compra.");
  }

  if (currentCoverage != null && currentCoverage > 5 && projectedCoverage != null && projectedCoverage > currentCoverage) {
    messages.push("A solicitação aumentaria ainda mais uma cobertura já elevada.");
  }

  if (projectedCoverage != null && projectedCoverage > 50) {
    messages.push("A cobertura projetada é muito superior ao histórico de consumo. Reforce a justificativa da solicitação.");
  } else if (projectedCoverage != null && projectedCoverage > 10) {
    messages.push("A cobertura projetada ficaria acima de 10 anos. Reforce a necessidade da compra.");
  }

  return Array.from(new Set(messages));
}

export function MaterialStockAnalysisSection({ stockMaterial, requestedQuantity, mode = "form" }: MaterialStockAnalysisSectionProps) {
  if (!stockMaterial) {
    return (
      <section style={{ border: `1px solid ${uiTokens.stateTones.warning.bd}`, borderRadius: uiTokens.radius.lg, background: uiTokens.stateTones.warning.bg, color: uiTokens.stateTones.warning.fg, padding: uiTokens.spacing.lg, display: "grid", gap: uiTokens.spacing.xs }}>
        <h4 style={{ margin: 0, fontSize: uiTokens.typography.md, fontWeight: uiTokens.typography.titleWeight }}>Análise do material</h4>
        <p style={{ margin: 0, fontSize: uiTokens.typography.sm, lineHeight: 1.4 }}>Material não encontrado na base atual de estoque. A solicitação seguirá para análise manual.</p>
      </section>
    );
  }

  const evaluatedStock = asNumber(stockMaterial.evaluatedStockTotal);
  const averageAnnualConsumption = asNumber(stockMaterial.averageAnnualConsumption);
  const movementYears = asNumber(stockMaterial.consumptionYearsCount);
  const historicalConsumption = asNumber(stockMaterial.historicalTotal);
  const validRequestedQuantity = hasPositiveNumber(requestedQuantity) ? requestedQuantity : 0;
  const hasRequestedQuantity = validRequestedQuantity > 0;
  const projectedStock = evaluatedStock + validRequestedQuantity;
  const requestedPercent = evaluatedStock > 0 && hasRequestedQuantity ? (validRequestedQuantity / evaluatedStock) * 100 : null;
  const currentCoverageYears = buildCoverageValue(evaluatedStock, averageAnnualConsumption);
  const projectedCoverageYears = buildCoverageValue(projectedStock, averageAnnualConsumption);
  const hasCoverage = typeof currentCoverageYears === "number" && Number.isFinite(currentCoverageYears);
  const movingYearAverage = movementYears > 0 ? historicalConsumption / movementYears : averageAnnualConsumption;
  const yearConsumptions = CONSUMPTION_YEARS.map((year) => ({
    label: year.label,
    value: asNumber(stockMaterial[year.key]),
  }));
  const maxConsumption = Math.max(...yearConsumptions.map((item) => item.value), 1);
  const comparativeMax = Math.max(evaluatedStock, validRequestedQuantity, averageAnnualConsumption, projectedStock, currentCoverageYears ?? 0, projectedCoverageYears ?? 0, 1);

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
      ? `A cobertura atual do estoque é de aproximadamente ${formatNumber(currentCoverageYears)} anos.`
      : "Não há consumo histórico suficiente para estimar cobertura.",
    hasCoverage
      ? `Com a quantidade solicitada, a cobertura projetada passaria para ${formatNumber(projectedCoverageYears)} anos.`
      : "A cobertura após solicitação também não pode ser estimada sem consumo médio.",
    hasRequestedQuantity && requestedPercent !== null
      ? `A solicitação representa ${formatPercent(requestedPercent)} do estoque atual.`
      : evaluatedStock > 0 ? "Informe a quantidade solicitada para calcular o percentual sobre o estoque atual." : "Sem estoque atual para calcular o percentual solicitado sobre estoque.",
    projectedCoverageYears != null && projectedCoverageYears > 50
      ? "A cobertura projetada é muito superior ao histórico de consumo. Avalie a real necessidade da compra."
      : null,
  ].filter((observation): observation is string => Boolean(observation));

  const currentCoverageTone = uiTokens.stateTones[resolveCoverageTone(currentCoverageYears)];
  const projectedCoverageTone = uiTokens.stateTones[resolveCoverageTone(projectedCoverageYears)];
  const coverageMessages = buildCoverageMessages(currentCoverageYears, projectedCoverageYears);

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
          <div style={{ fontSize: uiTokens.typography.sm }}>{hasCoverage ? "Com base no estoque atual e na média anual de consumo." : "Não há consumo histórico suficiente para estimar cobertura."}</div>
        </div>

        <div style={{ border: `1px solid ${projectedCoverageTone.bd}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: projectedCoverageTone.bg, color: projectedCoverageTone.fg, display: "grid", gap: uiTokens.spacing.xs }}>
          <div style={{ fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>Cobertura após solicitação</div>
          <div style={{ fontSize: uiTokens.typography.xl, fontWeight: uiTokens.typography.titleWeight, color: projectedCoverageTone.fg }}>{formatCoverage(projectedCoverageYears)}</div>
          <div style={{ fontSize: uiTokens.typography.sm }}>{hasCoverage ? "Considera o estoque atual somado à quantidade solicitada." : "Não há consumo histórico suficiente para estimar cobertura."}</div>
        </div>
      </div>

      {coverageMessages.length ? (
        <div style={{ border: `1px solid ${projectedCoverageTone.bd}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: projectedCoverageTone.bg, color: projectedCoverageTone.fg, display: "grid", gap: uiTokens.spacing.xs }}>
          {coverageMessages.map((message) => <div key={message} style={{ fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>{message}</div>)}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: uiTokens.spacing.md }}>
        <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: uiTokens.colors.surfaceMuted }}>
          <div style={{ marginBottom: uiTokens.spacing.sm, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Consumo histórico por ano</div>
          <div style={{ minHeight: 156, display: "grid", gridTemplateColumns: `repeat(${yearConsumptions.length}, minmax(42px, 1fr))`, alignItems: "end", gap: uiTokens.spacing.sm, padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.xs}px 0`, borderBottom: `1px solid ${uiTokens.colors.border}` }}>
            {yearConsumptions.map((item) => {
              const heightPercent = Math.max((item.value / maxConsumption) * 100, item.value > 0 ? 8 : 2);
              return (
                <div key={item.label} style={{ minHeight: 144, display: "grid", gridTemplateRows: "24px 1fr 18px", alignItems: "end", justifyItems: "center", gap: uiTokens.spacing.xs }}>
                  <span style={{ color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{formatNumber(item.value)}</span>
                  <div style={{ width: "100%", height: 96, display: "flex", alignItems: "end", justifyContent: "center" }}>
                    <div title={`${item.label}: ${formatNumber(item.value)}`} style={{ width: "70%", maxWidth: 38, minWidth: 22, height: `${heightPercent}%`, minHeight: item.value > 0 ? 8 : 2, borderRadius: `${uiTokens.radius.sm}px ${uiTokens.radius.sm}px 3px 3px`, background: item.value > 0 ? uiTokens.colors.accent : uiTokens.colors.borderStrong }} />
                  </div>
                  <span style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ border: `1px solid ${uiTokens.colors.borderMuted}`, borderRadius: uiTokens.radius.md, padding: uiTokens.spacing.md, background: uiTokens.colors.surfaceMuted }}>
          <div style={{ marginBottom: uiTokens.spacing.sm, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.sm, fontWeight: uiTokens.typography.labelWeight }}>Comparativos</div>
          {!hasRequestedQuantity ? <div style={{ marginBottom: uiTokens.spacing.sm, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Informe a quantidade solicitada para calcular os comparativos.</div> : null}
          {[
            { label: "Estoque atual", value: evaluatedStock, visible: true },
            { label: "Qtde. solicitada", value: validRequestedQuantity, visible: true },
            { label: "Estoque projetado após solicitação", value: projectedStock, visible: true },
            { label: "Consumo médio anual", value: averageAnnualConsumption, visible: true },
            { label: "Cobertura atual", value: currentCoverageYears ?? 0, visible: true },
            { label: "Cobertura após solicitação", value: projectedCoverageYears ?? 0, visible: true },
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
            <span>Estoque atual: <strong style={{ color: uiTokens.colors.text }}>{formatNumber(evaluatedStock)}</strong></span>
            <span>Qtde. solicitada: <strong style={{ color: uiTokens.colors.text }}>{hasRequestedQuantity ? formatNumber(validRequestedQuantity) : "-"}</strong></span>
            <span>Estoque projetado após solicitação: <strong style={{ color: uiTokens.colors.text }}>{formatNumber(projectedStock)}</strong></span>
            <span>Percentual solicitado sobre estoque: <strong style={{ color: uiTokens.colors.text }}>{evaluatedStock > 0 ? formatPercent(requestedPercent) : "Sem estoque atual"}</strong></span>
            <span>Consumo médio anual: <strong style={{ color: uiTokens.colors.text }}>{formatNumber(averageAnnualConsumption)}</strong></span>
            <span>Cobertura atual: <strong style={{ color: uiTokens.colors.text }}>{formatCoverage(currentCoverageYears)}</strong></span>
            <span>Cobertura após solicitação: <strong style={{ color: uiTokens.colors.text }}>{formatCoverage(projectedCoverageYears)}</strong></span>
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
