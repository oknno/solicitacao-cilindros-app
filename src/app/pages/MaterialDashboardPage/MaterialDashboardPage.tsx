import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMaterialDashboardUseCase } from "../../../application/materialDashboard";
import type { DashboardOpenRequest, DashboardStockRankingItem, MaterialDashboardAttentionLabel, MaterialDashboardResult, MaterialDashboardSeverity } from "../../../domain/materialDashboard";
import type { MaterialRequestStatus } from "../../../domain/materialRequest/status";
import type { StockRecommendation } from "../../../domain/materialRequest/stockTypes";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fieldControlStyles } from "../../components/ui/fieldControlStyles";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";

const DASHBOARD_FILTER_BUTTON_ID = "material-dashboard-filter-button";
const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = { center: "", requestStatus: "", recommendation: "", signal: "", severity: "" };
const DEFAULT_DASHBOARD_FILTERS_BY_VIEW: Record<DashboardView, DashboardFilters> = {
  requests: DEFAULT_DASHBOARD_FILTERS,
  stock: DEFAULT_DASHBOARD_FILTERS,
};
const EMPTY_COMMAND_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Title", sortDir: "asc" };
const OPEN_REQUEST_STATUSES = new Set<MaterialRequestStatus>([
  "PENDING_LAMINATION_MANAGER_APPROVAL",
  "PENDING_CTO_APPROVAL",
  "RETURNED_FOR_ADJUSTMENT",
]);
const STATUS_CHART_ORDER: MaterialRequestStatus[] = [
  "PENDING_LAMINATION_MANAGER_APPROVAL",
  "PENDING_CTO_APPROVAL",
  "RETURNED_FOR_ADJUSTMENT",
  "APPROVED",
  "REJECTED",
  "DRAFT",
];
const HIGH_REQUEST_VALUE_BRL = 100_000;
const HIGH_COVERAGE_YEARS = 5;
const REQUEST_SIGNAL_OPTIONS = ["Estoque suficiente", "Estoque parcial", "Sem estoque", "Análise manual", "Aumenta cobertura", "Impacto financeiro alto", "Pendente Gerente", "Pendente CTO", "Devolvida"];
const STOCK_SIGNAL_OPTIONS: MaterialDashboardAttentionLabel[] = [
  "Sem consumo histórico",
  "Valor alto parado",
  "Cobertura elevada",
  "Cobertura baixa",
  "Uso frequente com estoque baixo",
  "Estoque zerado com consumo",
  "Solicitação aberta com estoque disponível",
];
const STOCK_SEVERITY_OPTIONS: { value: MaterialDashboardSeverity; label: string }[] = [
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Média" },
  { value: "LOW", label: "Baixa" },
];
const REQUEST_RECOMMENDATION_OPTIONS: StockRecommendation[] = [
  "PURCHASE_RECOMMENDED",
  "PURCHASE_RECOMMENDED_PARTIAL_STOCK",
  "PURCHASE_NOT_RECOMMENDED",
  "MANUAL_REVIEW_REQUIRED",
];
const STOCK_ATTENTION_LABEL_PRIORITY: MaterialDashboardAttentionLabel[] = [
  "Uso frequente com estoque baixo",
  "Estoque zerado com consumo",
  "Valor alto parado",
  "Cobertura elevada",
  "Cobertura baixa",
  "Sem consumo histórico",
  "Solicitação aberta com estoque disponível",
];
const REQUEST_SIGNAL_PRIORITY: RequestSignal[] = [
  "Sem estoque",
  "Impacto financeiro alto",
  "Estoque parcial",
  "Análise manual",
  "Aumenta cobertura",
  "Estoque suficiente",
  "Pendente CTO",
  "Pendente Gerente",
  "Devolvida",
];

type DashboardView = "requests" | "stock";
type RequestSignal = typeof REQUEST_SIGNAL_OPTIONS[number];
type ImpactKey = "sufficient" | "partial" | "none" | "manual";
type StockDashboardItem = DashboardStockRankingItem & { attentionLabels: MaterialDashboardAttentionLabel[]; severity: MaterialDashboardSeverity | null; openRequestsCount: number };
type QuickFilter = { view: DashboardView; type: "status" | "signal" | "impact" | "severity"; value: string; label: string };
type RequestQuickFilter = QuickFilter & { view: "requests" };
type StockQuickFilter = QuickFilter & { view: "stock" };

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statusTone: Partial<Record<MaterialRequestStatus, "neutral" | "info" | "success" | "danger" | "warning">> = {
  DRAFT: "neutral",
  PENDING_LAMINATION_MANAGER_APPROVAL: "warning",
  PENDING_CTO_APPROVAL: "info",
  RETURNED_FOR_ADJUSTMENT: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const signalTone: Record<RequestSignal, "neutral" | "info" | "success" | "danger" | "warning"> = {
  "Estoque suficiente": "success",
  "Estoque parcial": "warning",
  "Sem estoque": "danger",
  "Análise manual": "info",
  "Aumenta cobertura": "warning",
  "Impacto financeiro alto": "danger",
  "Pendente Gerente": "warning",
  "Pendente CTO": "info",
  Devolvida: "warning",
};

const styles = {
  page: {
    height: "100%",
    overflow: "auto",
    background: uiTokens.colors.appBackground,
    padding: uiTokens.spacing.md,
    display: "grid",
    gap: uiTokens.spacing.md,
    alignContent: "start",
  } satisfies React.CSSProperties,
  filterPopoverOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
  } satisfies React.CSSProperties,
  filterPopover: {
    position: "absolute",
    width: 360,
    maxWidth: "calc(100vw - 32px)",
    background: uiTokens.colors.surface,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.md,
    boxShadow: `0 10px 30px ${uiTokens.colors.shadowSoft}`,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  filterPopoverContent: {
    display: "grid",
    gap: uiTokens.spacing.sm + uiTokens.spacing.xxs,
  } satisfies React.CSSProperties,
  filterFooterActions: {
    display: "flex",
    gap: uiTokens.spacing.sm,
    justifyContent: "flex-end",
    marginTop: uiTokens.spacing.xs,
  } satisfies React.CSSProperties,
  label: {
    display: "grid",
    gap: uiTokens.spacing.xs,
    color: uiTokens.colors.textMuted,
    fontSize: uiTokens.typography.xs,
    fontWeight: uiTokens.typography.mediumWeight,
  } satisfies React.CSSProperties,
  viewActions: {
    display: "inline-flex",
    gap: uiTokens.spacing.xs,
    padding: 3,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.sm,
    background: uiTokens.colors.surfaceMuted,
  } satisfies React.CSSProperties,
  viewButton: {
    padding: "7px 10px",
    borderRadius: uiTokens.radius.sm - 2,
  } satisfies React.CSSProperties,
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: uiTokens.spacing.sm,
  } satisfies React.CSSProperties,
  kpiCard: {
    padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.md}px`,
    minHeight: 72,
  } satisfies React.CSSProperties,
  quickFilterCard: {
    cursor: "pointer",
    transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
  } satisfies React.CSSProperties,
  quickFilterCardHover: {
    borderColor: uiTokens.colors.accent,
    boxShadow: `0 6px 18px ${uiTokens.colors.shadowSoft}`,
    transform: "translateY(-1px)",
  } satisfies React.CSSProperties,
  kpiValue: {
    marginTop: uiTokens.spacing.xs,
    color: uiTokens.colors.textStrong,
    fontSize: 22,
    fontWeight: uiTokens.typography.titleWeight,
    lineHeight: 1.1,
  } satisfies React.CSSProperties,
  requestsLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.8fr) minmax(0, 1.5fr)",
    gap: uiTokens.spacing.md,
    alignItems: "stretch",
  } satisfies React.CSSProperties,
  stockLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.8fr) minmax(0, 1.5fr)",
    gap: uiTokens.spacing.md,
    alignItems: "stretch",
  } satisfies React.CSSProperties,
  analyticsColumn: {
    display: "grid",
    gap: uiTokens.spacing.md,
  } satisfies React.CSSProperties,
  stockTableSection: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  requestTableSection: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uiTokens.spacing.sm,
    marginBottom: uiTokens.spacing.sm,
  } satisfies React.CSSProperties,
  sectionTitle: {
    margin: 0,
    color: uiTokens.colors.textStrong,
    fontSize: uiTokens.typography.lg,
    fontWeight: uiTokens.typography.titleWeight,
  } satisfies React.CSSProperties,
  chartRows: {
    display: "grid",
    gap: uiTokens.spacing.sm,
  } satisfies React.CSSProperties,
  chartLabelRow: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 1fr) auto",
    gap: uiTokens.spacing.sm,
    alignItems: "center",
    color: uiTokens.colors.textStrong,
    fontSize: uiTokens.typography.sm,
  } satisfies React.CSSProperties,
  chartTrack: {
    height: 9,
    borderRadius: 999,
    background: uiTokens.colors.surfaceMuted,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  clickableChartRow: {
    cursor: "pointer",
    borderRadius: uiTokens.radius.sm,
    padding: "3px 4px",
    margin: "-3px -4px",
    transition: "background 120ms ease",
  } satisfies React.CSSProperties,
  clickableChartRowHover: {
    background: uiTokens.colors.surfaceMuted,
  } satisfies React.CSSProperties,
  quickFilterNotice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uiTokens.spacing.sm,
    padding: `${uiTokens.spacing.xs}px ${uiTokens.spacing.sm}px`,
    marginBottom: uiTokens.spacing.sm,
    border: `1px solid ${uiTokens.colors.borderMuted}`,
    borderRadius: uiTokens.radius.sm,
    background: uiTokens.colors.surfaceMuted,
    color: uiTokens.colors.textMuted,
    fontSize: uiTokens.typography.sm,
  } satisfies React.CSSProperties,
  quickFilterClearButton: {
    border: 0,
    background: "transparent",
    color: uiTokens.colors.accent,
    cursor: "pointer",
    padding: 0,
    fontSize: uiTokens.typography.sm,
    fontWeight: uiTokens.typography.mediumWeight,
  } satisfies React.CSSProperties,
  tableShell: {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
  } satisfies React.CSSProperties,
  tableShellFill: {
    display: "flex",
    flex: "1 1 0",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  tableScroller: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: 570,
    scrollbarGutter: "stable",
  } satisfies React.CSSProperties,
  tableScrollerFill: {
    flex: "1 1 auto",
    minHeight: 0,
    maxHeight: "none",
  } satisfies React.CSSProperties,
  badgeStack: {
    display: "inline-flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: uiTokens.spacing.xs,
    maxWidth: "100%",
    whiteSpace: "nowrap",
  } satisfies React.CSSProperties,
  compactBadge: {
    padding: "2px 7px",
    fontSize: 11,
    lineHeight: 1.25,
  } satisfies React.CSSProperties,
  compactSignalBadge: {
    padding: "2px 7px",
    fontSize: 11,
    lineHeight: 1.25,
    background: uiTokens.colors.surfaceMuted,
    borderColor: uiTokens.colors.borderStrong,
    color: uiTokens.colors.text,
  } satisfies React.CSSProperties,
};

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return numberFormatter.format(value);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return currencyFormatter.format(value);
}

function formatCoverage(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 10) / 10;
  return `${numberFormatter.format(rounded)} ${rounded === 1 ? "ano" : "anos"}`;
}

function formatRequestCoverage(request: DashboardOpenRequest): string {
  if (request.averageAnnualConsumption === 0) return "Sem consumo médio";
  return formatCoverage(request.coverageAfterRequestYears);
}

function isOpenRequest(request: DashboardOpenRequest): boolean {
  return OPEN_REQUEST_STATUSES.has(request.requestStatus);
}

function getRequestSignal(request: DashboardOpenRequest): RequestSignal {
  if (request.stockRecommendation === "MANUAL_REVIEW_REQUIRED" || !request.materialFound || request.evaluatedStockTotal == null) return "Análise manual";
  if (request.evaluatedStockTotal >= request.requestedQuantity) return "Estoque suficiente";
  if (request.evaluatedStockTotal > 0) return "Estoque parcial";
  return "Sem estoque";
}

function getWorkflowSignal(request: DashboardOpenRequest): RequestSignal | null {
  if (request.requestStatus === "PENDING_LAMINATION_MANAGER_APPROVAL") return "Pendente Gerente";
  if (request.requestStatus === "PENDING_CTO_APPROVAL") return "Pendente CTO";
  if (request.requestStatus === "RETURNED_FOR_ADJUSTMENT") return "Devolvida";
  return null;
}

function getRequestSignals(request: DashboardOpenRequest): RequestSignal[] {
  const signals = [getRequestSignal(request)];
  if (request.coverageAfterRequestYears !== null && request.currentCoverageYears !== null && request.coverageAfterRequestYears > request.currentCoverageYears && request.coverageAfterRequestYears > HIGH_COVERAGE_YEARS) {
    signals.push("Aumenta cobertura");
  }
  if (request.estimatedRequestedValueBRL >= HIGH_REQUEST_VALUE_BRL) {
    signals.push("Impacto financeiro alto");
  }
  const workflowSignal = getWorkflowSignal(request);
  if (workflowSignal) signals.push(workflowSignal);
  return signals;
}

function getImpactKey(request: DashboardOpenRequest): ImpactKey {
  const signal = getRequestSignal(request);
  if (signal === "Estoque suficiente") return "sufficient";
  if (signal === "Estoque parcial") return "partial";
  if (signal === "Sem estoque") return "none";
  return "manual";
}

interface DashboardFilters {
  center: string;
  requestStatus: string;
  recommendation: string;
  signal: string;
  severity: string;
}

function filterRequests(requests: DashboardOpenRequest[], filters: DashboardFilters): DashboardOpenRequest[] {
  const requestSignal = REQUEST_SIGNAL_OPTIONS.includes(filters.signal as RequestSignal) ? filters.signal as RequestSignal : "";
  return requests.filter((request) => {
    if (filters.center && request.center !== filters.center) return false;
    if (filters.requestStatus && request.requestStatus !== filters.requestStatus) return false;
    if (filters.recommendation && request.stockRecommendation !== filters.recommendation) return false;
    if (requestSignal && !getRequestSignals(request).includes(requestSignal)) return false;
    return true;
  });
}


function hasManualFilters(filters: DashboardFilters): boolean {
  return Boolean(filters.center || filters.requestStatus || filters.recommendation || filters.signal || filters.severity);
}

function applyRequestQuickFilter(requests: DashboardOpenRequest[], quickFilter: RequestQuickFilter | null): DashboardOpenRequest[] {
  if (!quickFilter) return requests;
  if (quickFilter.type === "status") {
    if (quickFilter.value === "OPEN_REQUESTS") return requests.filter(isOpenRequest);
    return requests.filter((request) => request.requestStatus === quickFilter.value);
  }
  if (quickFilter.type === "impact") {
    return requests.filter((request) => getImpactKey(request) === quickFilter.value);
  }
  if (quickFilter.type === "signal") {
    return requests.filter((request) => getRequestSignals(request).includes(quickFilter.value as RequestSignal));
  }
  return requests;
}

function applyStockQuickFilter(items: StockDashboardItem[], quickFilter: StockQuickFilter | null): StockDashboardItem[] {
  if (!quickFilter) return items;
  if (quickFilter.type === "signal") {
    return items.filter((item) => item.attentionLabels.includes(quickFilter.value as MaterialDashboardAttentionLabel));
  }
  if (quickFilter.type === "severity") {
    return items.filter((item) => item.severity === quickFilter.value);
  }
  return items;
}

function getQuickFilterEmptyMessage(view: DashboardView, quickFilter: QuickFilter | null, filters: DashboardFilters): string {
  if (view === "requests") {
    if (quickFilter) return "Nenhuma solicitação encontrada para o filtro aplicado.";
    if (hasManualFilters(filters)) return "Nenhuma solicitação encontrada para os filtros aplicados.";
    return "Nenhuma solicitação encontrada.";
  }

  if (!quickFilter) return "Nenhum item de estoque encontrado.";
  if (hasManualFilters(filters)) return "Nenhum item encontrado para os filtros aplicados.";
  return `Nenhum material encontrado para o filtro ${quickFilter.label}.`;
}

function getRequestDashboardModel(data: MaterialDashboardResult | null, filters: DashboardFilters) {
  const allRequests = data?.requests ?? data?.openRequests ?? [];
  const requests = filterRequests(allRequests, filters);
  const openRequests = requests.filter(isOpenRequest);
  const statusCounts = STATUS_CHART_ORDER.map((status) => ({
    status,
    label: allRequests.find((request) => request.requestStatus === status)?.requestStatusLabel ?? getFallbackStatusLabel(status),
    count: requests.filter((request) => request.requestStatus === status).length,
  })).filter((item) => item.count > 0 || item.status !== "DRAFT");
  const estimatedValueByStatus = STATUS_CHART_ORDER
    .map((status) => ({
      status,
      label: allRequests.find((request) => request.requestStatus === status)?.requestStatusLabel ?? getFallbackStatusLabel(status),
      value: requests
        .filter((request) => request.requestStatus === status)
        .reduce((total, request) => total + request.estimatedRequestedValueBRL, 0),
    }))
    .filter((item) => item.value > 0);

  return {
    requests,
    openRequests,
    statusCounts,
    estimatedValueByStatus,
    kpis: {
      openRequestsCount: openRequests.length,
      pendingLaminationManagerCount: openRequests.filter((request) => request.requestStatus === "PENDING_LAMINATION_MANAGER_APPROVAL").length,
      pendingCtoCount: openRequests.filter((request) => request.requestStatus === "PENDING_CTO_APPROVAL").length,
      returnedForAdjustmentCount: openRequests.filter((request) => request.requestStatus === "RETURNED_FOR_ADJUSTMENT").length,
      sufficientStockRequestsCount: openRequests.filter((request) => getRequestSignal(request) === "Estoque suficiente").length,
      estimatedRequestedValueBRL: openRequests.reduce((total, request) => total + request.estimatedRequestedValueBRL, 0),
      projectedStockTotal: openRequests.reduce((total, request) => total + request.projectedStockTotal, 0),
    },
  };
}


function buildMaterialKey(center: string, material: string): string {
  return `${center.trim().toLocaleUpperCase("pt-BR")}::${material.trim().toLocaleUpperCase("pt-BR")}`;
}

function getStockDashboardItems(data: MaterialDashboardResult | null): StockDashboardItem[] {
  if (!data) return [];

  const attentionByMaterial = new Map(data.attentionMaterials.map((item) => [buildMaterialKey(item.center, item.material), item]));
  const openRequestsCountByMaterial = new Map<string, number>();

  for (const request of data.openRequests) {
    const key = buildMaterialKey(request.center, request.material);
    openRequestsCountByMaterial.set(key, (openRequestsCountByMaterial.get(key) ?? 0) + 1);
  }

  return data.stockItems.map((item) => {
    const key = buildMaterialKey(item.center, item.material);
    const attention = attentionByMaterial.get(key);
    return {
      ...item,
      attentionLabels: attention?.attentionLabels ?? [],
      severity: attention?.severity ?? null,
      openRequestsCount: openRequestsCountByMaterial.get(key) ?? 0,
    };
  });
}

function filterStockItems(items: StockDashboardItem[], filters: DashboardFilters): StockDashboardItem[] {
  const stockSignal = STOCK_SIGNAL_OPTIONS.includes(filters.signal as MaterialDashboardAttentionLabel) ? filters.signal as MaterialDashboardAttentionLabel : "";
  return items.filter((item) => {
    if (filters.center && item.center !== filters.center) return false;
    if (stockSignal && !item.attentionLabels.includes(stockSignal)) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    return true;
  });
}

function getStockSeverityLabel(severity: MaterialDashboardSeverity | null): string {
  if (!severity) return "-";
  return STOCK_SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? severity;
}

function getStockSeverityTone(severity: MaterialDashboardSeverity | null): "neutral" | "info" | "success" | "danger" | "warning" {
  if (severity === "HIGH") return "danger";
  if (severity === "MEDIUM") return "warning";
  if (severity === "LOW") return "info";
  return "neutral";
}

function getStockSignalTone(signal: MaterialDashboardAttentionLabel): "neutral" | "info" | "success" | "danger" | "warning" {
  if (signal === "Estoque zerado com consumo" || signal === "Uso frequente com estoque baixo" || signal === "Valor alto parado") return "danger";
  if (signal === "Cobertura baixa" || signal === "Cobertura elevada") return "warning";
  if (signal === "Solicitação aberta com estoque disponível") return "info";
  return "neutral";
}

function getStockAttentionPriority(label: MaterialDashboardAttentionLabel): number {
  const priority = STOCK_ATTENTION_LABEL_PRIORITY.indexOf(label);
  return priority >= 0 ? priority : STOCK_ATTENTION_LABEL_PRIORITY.length;
}

function getCompactStockAttentionLabels(labels: MaterialDashboardAttentionLabel[]): { visible: MaterialDashboardAttentionLabel[]; hidden: MaterialDashboardAttentionLabel[] } {
  const orderedLabels = [...labels].sort((left, right) => {
    const priorityDiff = getStockAttentionPriority(left) - getStockAttentionPriority(right);
    return priorityDiff !== 0 ? priorityDiff : left.localeCompare(right, "pt-BR");
  });

  if (orderedLabels.length <= 2) {
    return { visible: orderedLabels, hidden: [] };
  }

  return { visible: orderedLabels.slice(0, 1), hidden: orderedLabels.slice(1) };
}

function getRequestSignalPriority(label: RequestSignal): number {
  const priority = REQUEST_SIGNAL_PRIORITY.indexOf(label);
  return priority >= 0 ? priority : REQUEST_SIGNAL_PRIORITY.length;
}

function getCompactRequestSignals(labels: RequestSignal[]): { visible: RequestSignal[]; hidden: RequestSignal[] } {
  const orderedLabels = [...labels].sort((left, right) => {
    const priorityDiff = getRequestSignalPriority(left) - getRequestSignalPriority(right);
    return priorityDiff !== 0 ? priorityDiff : left.localeCompare(right, "pt-BR");
  });

  if (orderedLabels.length <= 2) {
    return { visible: orderedLabels, hidden: [] };
  }

  return { visible: orderedLabels.slice(0, 1), hidden: orderedLabels.slice(1) };
}

function sortStockItemsForManagement(left: StockDashboardItem, right: StockDashboardItem): number {
  const severityOrder: Record<MaterialDashboardSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const leftSeverityOrder = left.severity ? severityOrder[left.severity] : 3;
  const rightSeverityOrder = right.severity ? severityOrder[right.severity] : 3;
  const severityComparison = leftSeverityOrder - rightSeverityOrder;
  if (severityComparison !== 0) return severityComparison;

  const attentionComparison = Number(right.attentionLabels.length > 0) - Number(left.attentionLabels.length > 0);
  if (attentionComparison !== 0) return attentionComparison;

  const valueComparison = right.totalStockValueBRL - left.totalStockValueBRL;
  if (valueComparison !== 0) return valueComparison;

  const coverageComparison = (right.coverageYears ?? -1) - (left.coverageYears ?? -1);
  if (coverageComparison !== 0) return coverageComparison;

  return `${left.center}-${left.material}`.localeCompare(`${right.center}-${right.material}`, "pt-BR", { numeric: true });
}

function getStockDashboardModel(data: MaterialDashboardResult | null, filters: DashboardFilters) {
  const stockItems = filterStockItems(getStockDashboardItems(data), filters).sort(sortStockItemsForManagement);
  const distribution = STOCK_SIGNAL_OPTIONS
    .map((signal) => ({ label: signal, count: stockItems.filter((item) => item.attentionLabels.includes(signal)).length, tone: getStockSignalTone(signal) }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));
  const stockValueByCenter = Array.from(stockItems.reduce((map, item) => {
    map.set(item.center, (map.get(item.center) ?? 0) + item.totalStockValueBRL);
    return map;
  }, new Map<string, number>()).entries())
    .map(([center, value]) => ({ center, value }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  return {
    stockItems,
    distribution,
    stockValueByCenter,
    kpis: {
      totalStockValueBRL: stockItems.reduce((total, item) => total + item.totalStockValueBRL, 0),
      highCoverageCount: stockItems.filter((item) => item.coverageYears !== null && item.coverageYears > 5).length,
      frequentUseLowStockCount: stockItems.filter((item) => item.attentionLabels.includes("Uso frequente com estoque baixo")).length,
      zeroStockWithConsumptionCount: stockItems.filter((item) => item.evaluatedStockTotal === 0 && item.historicalTotal > 0).length,
      highIdleValueCount: stockItems.filter((item) => item.attentionLabels.includes("Valor alto parado")).length,
      noHistoricalConsumptionCount: stockItems.filter((item) => item.historicalTotal === 0 || item.averageAnnualConsumption === 0).length,
    },
  };
}

function getFallbackStatusLabel(status: MaterialRequestStatus): string {
  const labels: Record<MaterialRequestStatus, string> = {
    DRAFT: "Rascunho",
    PENDING_LAMINATION_MANAGER_APPROVAL: "Pendente Gerente Laminação",
    PENDING_CTO_APPROVAL: "Pendente CTO",
    RETURNED_FOR_ADJUSTMENT: "Devolvida",
    APPROVED: "Aprovada",
    REJECTED: "Reprovada",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

export function MaterialDashboardPage(props: { onBackToRequests: () => void }) {
  const [dashboard, setDashboard] = useState<MaterialDashboardResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [dashboardView, setDashboardView] = useState<DashboardView>("requests");
  const [draftFiltersByView, setDraftFiltersByView] = useState<Record<DashboardView, DashboardFilters>>(DEFAULT_DASHBOARD_FILTERS_BY_VIEW);
  const [appliedFiltersByView, setAppliedFiltersByView] = useState<Record<DashboardView, DashboardFilters>>(DEFAULT_DASHBOARD_FILTERS_BY_VIEW);
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setState("loading");
    try {
      const result = await getMaterialDashboardUseCase();
      setDashboard(result);
      setState("idle");
    } catch (error) {
      console.error(error);
      setState("error");
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    void (async () => {
      try {
        const result = await getMaterialDashboardUseCase();
        if (ignore) return;
        setDashboard(result);
        setState("idle");
      } catch (error) {
        if (ignore) return;
        console.error(error);
        setState("error");
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const draftFilters = draftFiltersByView[dashboardView];
  const requestAppliedFilters = appliedFiltersByView.requests;
  const stockAppliedFilters = appliedFiltersByView.stock;
  const requestDashboard = useMemo(() => getRequestDashboardModel(dashboard, requestAppliedFilters), [dashboard, requestAppliedFilters]);
  const stockDashboard = useMemo(() => getStockDashboardModel(dashboard, stockAppliedFilters), [dashboard, stockAppliedFilters]);
  const requestQuickFilter = quickFilter?.view === "requests" ? quickFilter as RequestQuickFilter : null;
  const stockQuickFilter = quickFilter?.view === "stock" ? quickFilter as StockQuickFilter : null;
  const quickFilteredRequests = useMemo(() => applyRequestQuickFilter(requestDashboard.requests, requestQuickFilter), [requestDashboard.requests, requestQuickFilter]);
  const quickFilteredStockItems = useMemo(() => applyStockQuickFilter(stockDashboard.stockItems, stockQuickFilter), [stockDashboard.stockItems, stockQuickFilter]);
  const centerOptions = dashboard?.centerOptions ?? [];
  const requestStatusOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const request of dashboard?.requests ?? dashboard?.openRequests ?? []) {
      labels.set(request.requestStatus, request.requestStatusLabel);
    }
    return STATUS_CHART_ORDER.map((status) => ({
      value: status,
      label: labels.get(status) ?? getFallbackStatusLabel(status),
    }));
  }, [dashboard]);
  const recommendationOptions = REQUEST_RECOMMENDATION_OPTIONS;
  const isInitialLoading = state === "loading" && !dashboard;
  const hasDashboardData = dashboard ? (dashboard.requests?.length ?? dashboard.openRequests.length) > 0 || dashboard.stockItems.length > 0 : false;

  function openFilters() {
    setDraftFiltersByView((current) => ({ ...current, [dashboardView]: appliedFiltersByView[dashboardView] }));
    setFilterModalOpen(true);
  }

  function applyFilters() {
    setAppliedFiltersByView((current) => ({ ...current, [dashboardView]: draftFiltersByView[dashboardView] }));
    setFilterModalOpen(false);
  }

  function clearFilters() {
    setDraftFiltersByView((current) => ({ ...current, [dashboardView]: DEFAULT_DASHBOARD_FILTERS }));
    setAppliedFiltersByView((current) => ({ ...current, [dashboardView]: DEFAULT_DASHBOARD_FILTERS }));
    setFilterModalOpen(false);
  }

  function closeFilters() {
    setDraftFiltersByView((current) => ({ ...current, [dashboardView]: appliedFiltersByView[dashboardView] }));
    setFilterModalOpen(false);
  }

  return (
    <div style={styles.page}>
      <CommandBar
        title="Dashboard Cilindros e Discos"
        isAdmin={false}
        selectedId={null}
        totalLoaded={dashboardView === "stock" ? stockDashboard.stockItems.length : requestDashboard.requests.length}
        canEdit={false}
        canDelete={false}
        canSend={false}
        canBack={false}
        canApprove={false}
        canReject={false}
        filters={EMPTY_COMMAND_FILTERS}
        onChangeFilters={() => undefined}
        onApply={openFilters}
        onClear={clearFilters}
        onRefresh={() => void loadDashboard()}
        onNew={() => undefined}
        canCreate={false}
        onView={() => undefined}
        onEdit={() => undefined}
        onDuplicate={() => undefined}
        onDelete={() => undefined}
        onSendToApproval={() => undefined}
        onBackStatus={() => undefined}
        onApprove={() => undefined}
        onReject={() => undefined}
        showApprovalActions={false}
        showNewButton={false}
        showViewButton={false}
        showEditButton={false}
        showDuplicateButton={false}
        showDeleteButton={false}
        showSubmitButton={false}
        showBackButton={false}
        showApproveButton={false}
        showRejectButton={false}
        showFilterButton
        filterButtonMode="triggerOnly"
        filterButtonId={DASHBOARD_FILTER_BUTTON_ID}
        showExportButton={false}
        onExportTable={() => undefined}
        onExportProject={() => undefined}
        availableUnits={[]}
        viewActions={<DashboardViewActions value={dashboardView} onChange={setDashboardView} />}
        navigationAction={{
          label: "Voltar para Solicitações",
          icon: <RequestsIcon />,
          onClick: props.onBackToRequests,
        }}
      />

      {filterModalOpen && <DashboardFilterPopover
        value={draftFilters}
        centers={centerOptions}
        view={dashboardView}
        requestStatuses={requestStatusOptions}
        recommendations={recommendationOptions}
        signals={dashboardView === "stock" ? STOCK_SIGNAL_OPTIONS : REQUEST_SIGNAL_OPTIONS}
        severities={STOCK_SEVERITY_OPTIONS}
        anchorId={DASHBOARD_FILTER_BUTTON_ID}
        onChange={(patch) => setDraftFiltersByView((current) => ({
          ...current,
          [dashboardView]: { ...current[dashboardView], ...patch },
        }))}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeFilters}
      />}

      {isInitialLoading ? <CenteredState state="loading" message="Carregando dashboard..." /> : null}
      {state === "error" && !dashboard ? <CenteredState state="error" message="Não foi possível carregar o dashboard." /> : null}
      {state !== "error" && dashboard && !hasDashboardData ? <CenteredState state="empty" message="Nenhum dado disponível para o dashboard." /> : null}

      {dashboard && hasDashboardData && dashboardView === "requests" ? <MaterialRequestsDashboardView model={requestDashboard} tableItems={quickFilteredRequests} quickFilter={requestQuickFilter} appliedFilters={requestAppliedFilters} onApplyQuickFilter={setQuickFilter} onClearQuickFilter={() => setQuickFilter(null)} /> : null}
      {dashboard && hasDashboardData && dashboardView === "stock" ? <MaterialStockDashboardView model={stockDashboard} tableItems={quickFilteredStockItems} quickFilter={stockQuickFilter} appliedFilters={stockAppliedFilters} hasAnyStock={(dashboard.stockItems.length ?? 0) > 0} onApplyQuickFilter={setQuickFilter} onClearQuickFilter={() => setQuickFilter(null)} /> : null}
    </div>
  );
}

function DashboardViewActions(props: { value: DashboardView; onChange: (value: DashboardView) => void }) {
  return (
    <div style={styles.viewActions} aria-label="Visão do dashboard">
      <Button type="button" tone={props.value === "requests" ? "primary" : "default"} onClick={() => props.onChange("requests")} style={styles.viewButton}>Solicitações</Button>
      <Button type="button" tone={props.value === "stock" ? "primary" : "default"} onClick={() => props.onChange("stock")} style={styles.viewButton}>Estoque</Button>
    </div>
  );
}

function MaterialRequestsDashboardView(props: {
  model: ReturnType<typeof getRequestDashboardModel>;
  tableItems: DashboardOpenRequest[];
  quickFilter: RequestQuickFilter | null;
  appliedFilters: DashboardFilters;
  onApplyQuickFilter: (filter: QuickFilter) => void;
  onClearQuickFilter: () => void;
}) {
  return (
    <>
      <KpiGrid kpis={props.model.kpis} onApplyQuickFilter={props.onApplyQuickFilter} />
      <div style={styles.requestsLayout}>
        <div style={styles.analyticsColumn}>
          <RequestsStatusChart items={props.model.statusCounts} onApplyQuickFilter={props.onApplyQuickFilter} />
          <EstimatedValueByStatusChart items={props.model.estimatedValueByStatus} />
        </div>
        <RequestsManagementTable items={props.tableItems} quickFilter={props.quickFilter} emptyMessage={getQuickFilterEmptyMessage("requests", props.quickFilter, props.appliedFilters)} onClearQuickFilter={props.onClearQuickFilter} />
      </div>
    </>
  );
}



function MaterialStockDashboardView(props: {
  model: ReturnType<typeof getStockDashboardModel>;
  tableItems: StockDashboardItem[];
  quickFilter: StockQuickFilter | null;
  appliedFilters: DashboardFilters;
  hasAnyStock: boolean;
  onApplyQuickFilter: (filter: QuickFilter) => void;
  onClearQuickFilter: () => void;
}) {
  if (!props.hasAnyStock) return <CenteredState state="empty" message="Nenhum item de estoque carregado." />;

  return (
    <>
      <StockKpiGrid kpis={props.model.kpis} onApplyQuickFilter={props.onApplyQuickFilter} />
      <div style={styles.stockLayout}>
        <div style={styles.analyticsColumn}>
          <StockAttentionDistributionChart items={props.model.distribution} onApplyQuickFilter={props.onApplyQuickFilter} />
          <StockValueByCenterChart items={props.model.stockValueByCenter} />
        </div>
        <StockManagementTable items={props.tableItems} quickFilter={props.quickFilter} emptyMessage={getQuickFilterEmptyMessage("stock", props.quickFilter, props.appliedFilters)} onClearQuickFilter={props.onClearQuickFilter} />
      </div>
    </>
  );
}

function StockKpiGrid(props: { kpis: ReturnType<typeof getStockDashboardModel>["kpis"]; onApplyQuickFilter: (filter: QuickFilter) => void }) {
  const cards = [
    { label: "Valor total em estoque", value: formatCurrency(props.kpis.totalStockValueBRL), helper: "Soma do valor avaliado" },
    { label: "Cobertura elevada", value: formatNumber(props.kpis.highCoverageCount), helper: "Materiais acima de 5 anos", signal: "Cobertura elevada" as const },
    { label: "Uso frequente com estoque baixo", value: formatNumber(props.kpis.frequentUseLowStockCount), helper: "Consumo e cobertura até 1 ano", signal: "Uso frequente com estoque baixo" as const },
    { label: "Estoque zerado com consumo", value: formatNumber(props.kpis.zeroStockWithConsumptionCount), helper: "Saldo zero e histórico > 0", signal: "Estoque zerado com consumo" as const },
    { label: "Valor alto parado", value: formatNumber(props.kpis.highIdleValueCount), helper: "≥ R$ 500 mil com excesso/sem consumo", signal: "Valor alto parado" as const },
    { label: "Sem consumo histórico", value: formatNumber(props.kpis.noHistoricalConsumptionCount), helper: "Histórico ou média zero", signal: "Sem consumo histórico" as const },
  ];

  return (
    <div style={styles.kpiGrid}>
      {cards.map((card) => {
        const cardContent = (
          <>
            <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{card.label}</div>
            <div style={styles.kpiValue}>{card.value}</div>
            <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{card.helper}</div>
          </>
        );
        if (!card.signal) return <Card key={card.label} style={styles.kpiCard}>{cardContent}</Card>;
        return (
          <QuickFilterCard
            key={card.label}
            title={`Filtrar tabela por ${card.signal}`}
            ariaLabel={`Filtrar tabela por ${card.signal}`}
            onClick={() => props.onApplyQuickFilter({ view: "stock", type: "signal", value: card.signal, label: card.signal })}
          >
            {cardContent}
          </QuickFilterCard>
        );
      })}
    </div>
  );
}

function StockAttentionDistributionChart(props: { items: { label: MaterialDashboardAttentionLabel; count: number; tone: "neutral" | "info" | "success" | "danger" | "warning" }[]; onApplyQuickFilter: (filter: QuickFilter) => void }) {
  return (
    <DashboardSection title="Distribuição das sinalizações" titleTooltip="Um material pode aparecer em mais de uma sinalização.">
      <SimpleBarChart
        emptyMessage="Sem dados para exibir."
        items={props.items}
        onItemClick={(item) => props.onApplyQuickFilter({ view: "stock", type: "signal", value: item.label, label: item.label })}
      />
    </DashboardSection>
  );
}

function StockValueByCenterChart(props: { items: { center: string; value: number }[] }) {
  const max = Math.max(...props.items.map((item) => item.value), 0);
  return (
    <DashboardSection title="Valor em estoque por centro" count={props.items.length}>
      {props.items.length === 0 ? <div style={{ padding: "12px 0", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Sem dados para exibir.</div> : (
        <div style={styles.chartRows}>
          {props.items.map((item) => (
            <div key={item.center}>
              <div style={styles.chartLabelRow}>
                <span>Centro {item.center}</span>
                <strong>{formatCurrency(item.value)}</strong>
              </div>
              <div style={styles.chartTrack} aria-hidden="true">
                <div style={{ width: `${max > 0 ? Math.max((item.value / max) * 100, 4) : 0}%`, height: "100%", background: uiTokens.colors.accent, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}

function StockManagementTable(props: { items: StockDashboardItem[]; quickFilter: StockQuickFilter | null; emptyMessage: string; onClearQuickFilter: () => void }) {
  const columns = "80px 120px 280px 90px 150px 110px 100px 120px 80px 340px";
  const minWidth = 1470;

  return (
    <DashboardSection title="Tabela gerencial de estoque" count={props.items.length} style={styles.stockTableSection}>
      <QuickFilterNotice quickFilter={props.quickFilter} onClear={props.onClearQuickFilter} />
      <DashboardTable
        columns={columns}
        minWidth={minWidth}
        fillHeight
        headers={["Centro", "Material", "Descrição", "Estoque", "Valor estoque", "Média anual", "Anos mov.", "Cobertura", "Solic.", "Sinalização"]}
        emptyMessage={props.emptyMessage}
      >
        {props.items.map((item) => {
          const compactLabels = getCompactStockAttentionLabels(item.attentionLabels);
          const hiddenLabelsTitle = compactLabels.hidden.join("; ");

          return (
            <TableRow key={`${item.center}-${item.material}`} columns={columns} minWidth={minWidth}>
              <Cell title={item.center}>{item.center}</Cell>
              <Cell title={item.material}>{item.material}</Cell>
              <Cell title={item.description}>{item.description}</Cell>
              <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
              <Cell>{formatCurrency(item.totalStockValueBRL)}</Cell>
              <Cell>{formatNumber(item.averageAnnualConsumption)}</Cell>
              <Cell>{formatNumber(item.consumptionYearsCount)}</Cell>
              <Cell>{formatCoverage(item.coverageYears)}</Cell>
              <Cell>{formatNumber(item.openRequestsCount)}</Cell>
              <Cell>
                {item.attentionLabels.length === 0 ? "-" : (
                  <div style={styles.badgeStack}>
                    <Badge text={getStockSeverityLabel(item.severity)} tone={getStockSeverityTone(item.severity)} style={styles.compactBadge} />
                    {compactLabels.visible.map((label) => <Badge key={label} text={label} tone="neutral" style={styles.compactSignalBadge} />)}
                    {compactLabels.hidden.length > 0 ? <Badge text={`+${compactLabels.hidden.length}`} tone="neutral" title={hiddenLabelsTitle} style={styles.compactSignalBadge} /> : null}
                  </div>
                )}
              </Cell>
            </TableRow>
          );
        })}
      </DashboardTable>
    </DashboardSection>
  );
}

function DashboardFilterPopover(props: {
  value: DashboardFilters;
  view: DashboardView;
  centers: string[];
  requestStatuses: { value: string; label: string }[];
  recommendations: string[];
  signals: readonly string[];
  severities: readonly { value: MaterialDashboardSeverity; label: string }[];
  anchorId: string;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    function updatePosition() {
      const anchor = document.getElementById(props.anchorId);
      if (!anchor) {
        setPosition({ top: 84, right: uiTokens.spacing.md });
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: Math.round(rect.bottom + 8),
        right: Math.max(uiTokens.spacing.md, Math.round(window.innerWidth - rect.right)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [props.anchorId]);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current && !panelRef.current.contains(target)) props.onClose();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [props]);

  return (
    <div style={styles.filterPopoverOverlay}>
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Filtro do dashboard"
        style={{
          ...styles.filterPopover,
          top: position?.top ?? 84,
          right: position?.right ?? uiTokens.spacing.md,
          visibility: position ? "visible" : "hidden",
        }}
      >
        <div style={styles.filterPopoverContent}>
          <label style={styles.label}>
            Centro
            <select value={props.value.center} onChange={(event) => props.onChange({ center: event.target.value })} style={fieldControlStyles.select}>
              <option value="">Todos os centros</option>
              {props.centers.map((center) => <option key={center} value={center}>{center}</option>)}
            </select>
          </label>

          {props.view === "requests" ? (
            <>
              <label style={styles.label}>
                Status solicitação
                <select value={props.value.requestStatus} onChange={(event) => props.onChange({ requestStatus: event.target.value })} style={fieldControlStyles.select}>
                  <option value="">Todos</option>
                  {props.requestStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>

              <label style={styles.label}>
                Parecer
                <select value={props.value.recommendation} onChange={(event) => props.onChange({ recommendation: event.target.value })} style={fieldControlStyles.select}>
                  <option value="">Todos</option>
                  {props.recommendations.map((recommendation) => <option key={recommendation} value={recommendation}>{getFallbackRecommendationLabel(recommendation as StockRecommendation)}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label style={styles.label}>
              Severidade
              <select value={props.value.severity} onChange={(event) => props.onChange({ severity: event.target.value })} style={fieldControlStyles.select}>
                <option value="">Todas</option>
                {props.severities.map((severity) => <option key={severity.value} value={severity.value}>{severity.label}</option>)}
              </select>
            </label>
          )}

          <label style={styles.label}>
            Sinalização
            <select value={props.value.signal} onChange={(event) => props.onChange({ signal: event.target.value })} style={fieldControlStyles.select}>
              <option value="">Todas</option>
              {props.signals.map((signal) => <option key={signal} value={signal}>{signal}</option>)}
            </select>
          </label>

          <div style={styles.filterFooterActions}>
            <Button type="button" onClick={props.onClear}>Limpar</Button>
            <Button tone="primary" type="button" onClick={props.onApply}>Aplicar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CenteredState(props: { state: "loading" | "error" | "empty"; message: string }) {
  return <Card style={{ textAlign: "center" }}><StateMessage state={props.state} message={props.message} /></Card>;
}

function QuickFilterCard(props: { title: string; ariaLabel: string; onClick: () => void; children: ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      title={props.title}
      aria-label={props.ariaLabel}
      onClick={props.onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      style={{
        background: uiTokens.colors.surface,
        border: `1px solid ${uiTokens.colors.border}`,
        borderRadius: uiTokens.radius.lg,
        ...styles.kpiCard,
        ...styles.quickFilterCard,
        ...(isHovered ? styles.quickFilterCardHover : null),
        outline: "none",
      }}
    >
      {props.children}
    </div>
  );
}

function ClickableChartRow(props: { label: string; onClick: () => void; children: ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      title={`Filtrar tabela por ${props.label}`}
      aria-label={`Filtrar tabela por ${props.label}`}
      onClick={props.onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          props.onClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      style={{
        ...styles.clickableChartRow,
        ...(isHovered ? styles.clickableChartRowHover : null),
      }}
    >
      {props.children}
    </div>
  );
}

function QuickFilterNotice(props: { quickFilter: QuickFilter | null; onClear: () => void }) {
  if (!props.quickFilter) return null;
  return (
    <div style={styles.quickFilterNotice}>
      <span><strong>Filtro aplicado:</strong> {props.quickFilter.label}</span>
      <button type="button" onClick={props.onClear} style={styles.quickFilterClearButton}>Limpar filtro</button>
    </div>
  );
}

function KpiGrid(props: { kpis: ReturnType<typeof getRequestDashboardModel>["kpis"]; onApplyQuickFilter: (filter: QuickFilter) => void }) {
  const cards = [
    { label: "Solicitações abertas", value: formatNumber(props.kpis.openRequestsCount), helper: "Em aprovação ou ajuste", quickFilter: { view: "requests", type: "status", value: "OPEN_REQUESTS", label: "Solicitações abertas" } as QuickFilter },
    { label: "Pendentes Gerente", value: formatNumber(props.kpis.pendingLaminationManagerCount), helper: "Gerente Laminação", quickFilter: { view: "requests", type: "status", value: "PENDING_LAMINATION_MANAGER_APPROVAL", label: "Pendente Gerente" } as QuickFilter },
    { label: "Pendentes CTO", value: formatNumber(props.kpis.pendingCtoCount), helper: "Aguardando CTO", quickFilter: { view: "requests", type: "status", value: "PENDING_CTO_APPROVAL", label: "Pendente CTO" } as QuickFilter },
    { label: "Valor estimado solicitado", value: formatCurrency(props.kpis.estimatedRequestedValueBRL), helper: "Qtde. x preço médio" },
    { label: "Estoque projetado após aprovação", value: formatNumber(props.kpis.projectedStockTotal), helper: "Estoque atual + solicitado" },
    { label: "Solicitações com estoque suficiente", value: formatNumber(props.kpis.sufficientStockRequestsCount), helper: "Estoque cobre a solicitação", quickFilter: { view: "requests", type: "impact", value: "sufficient", label: "Com estoque suficiente" } as QuickFilter },
  ];

  return (
    <div style={styles.kpiGrid}>
      {cards.map((card) => {
        const cardContent = (
          <>
            <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{card.label}</div>
            <div style={styles.kpiValue}>{card.value}</div>
            <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{card.helper}</div>
          </>
        );
        if (!card.quickFilter) return <Card key={card.label} style={styles.kpiCard}>{cardContent}</Card>;
        return (
          <QuickFilterCard
            key={card.label}
            title={`Filtrar tabela por ${card.quickFilter.label}`}
            ariaLabel={`Filtrar tabela por ${card.quickFilter.label}`}
            onClick={() => props.onApplyQuickFilter(card.quickFilter)}
          >
            {cardContent}
          </QuickFilterCard>
        );
      })}
    </div>
  );
}

function RequestsStatusChart(props: { items: { status: MaterialRequestStatus; label: string; count: number }[]; onApplyQuickFilter: (filter: QuickFilter) => void }) {
  const total = props.items.reduce((sum, item) => sum + item.count, 0);
  return (
    <DashboardSection title="Status das solicitações" count={total}>
      <SimpleBarChart
        emptyMessage="Sem dados para exibir."
        items={props.items.map((item) => ({ label: item.label, count: item.count, tone: statusTone[item.status] ?? "neutral", filterValue: item.status }))}
        onItemClick={(item) => props.onApplyQuickFilter({ view: "requests", type: "status", value: item.filterValue, label: item.label })}
      />
    </DashboardSection>
  );
}

function EstimatedValueByStatusChart(props: { items: { status: MaterialRequestStatus; label: string; value: number }[] }) {
  const total = props.items.reduce((sum, item) => sum + item.value, 0);
  const visibleItems = props.items.filter((item) => item.value > 0);
  const max = Math.max(...visibleItems.map((item) => item.value), 0);

  return (
    <DashboardSection title="Valor estimado por status" count={visibleItems.length}>
      {visibleItems.length === 0 ? <div style={{ padding: "12px 0", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Sem dados para exibir.</div> : (
        <div style={styles.chartRows}>
          {visibleItems.map((item) => {
            const tone = uiTokens.stateTones[statusTone[item.status] ?? "neutral"];
            return (
              <div key={item.status}>
                <div style={styles.chartLabelRow}>
                  <span>{item.label}</span>
                  <strong>{formatCurrency(item.value)}</strong>
                </div>
                <div style={styles.chartTrack} aria-hidden="true">
                  <div style={{ width: `${max > 0 ? Math.max((item.value / max) * 100, 4) : 0}%`, height: "100%", background: tone.bd, borderRadius: 999 }} />
                </div>
              </div>
            );
          })}
          <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>Total filtrado: {formatCurrency(total)}</div>
        </div>
      )}
    </DashboardSection>
  );
}

function SimpleBarChart<TItem extends { label: string; count: number; tone: "neutral" | "info" | "success" | "danger" | "warning" }>(props: { items: TItem[]; emptyMessage: string; onItemClick?: (item: TItem) => void }) {
  const visibleItems = props.items.filter((item) => item.count > 0);
  const max = Math.max(...visibleItems.map((item) => item.count), 0);
  if (visibleItems.length === 0) return <div style={{ padding: "12px 0", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>{props.emptyMessage}</div>;

  return (
    <div style={styles.chartRows}>
      {visibleItems.map((item) => {
        const tone = uiTokens.stateTones[item.tone];
        const content = (
          <>
            <div style={styles.chartLabelRow}>
              <span>{item.label}</span>
              <strong>{formatNumber(item.count)}</strong>
            </div>
            <div style={styles.chartTrack} aria-hidden="true">
              <div style={{ width: `${max > 0 ? Math.max((item.count / max) * 100, 4) : 0}%`, height: "100%", background: tone.bd, borderRadius: 999 }} />
            </div>
          </>
        );
        return props.onItemClick ? (
          <ClickableChartRow key={item.label} label={item.label} onClick={() => props.onItemClick?.(item)}>
            {content}
          </ClickableChartRow>
        ) : <div key={item.label}>{content}</div>;
      })}
    </div>
  );
}

function RequestsManagementTable(props: { items: DashboardOpenRequest[]; quickFilter: RequestQuickFilter | null; emptyMessage: string; onClearQuickFilter: () => void }) {
  const columns = "56px 84px 120px 72px 110px 110px 130px 130px 150px 220px";
  const minWidth = 1182;

  return (
    <DashboardSection title="Tabela gerencial de solicitações" count={props.items.length} style={styles.requestTableSection}>
      <QuickFilterNotice quickFilter={props.quickFilter} onClear={props.onClearQuickFilter} />
      <DashboardTable
        columns={columns}
        minWidth={minWidth}
        fillHeight
        headers={["ID", "Centro", "Material", "Qtde.", "Estoque atual", "Estoque proj.", "Valor estimado", "Cobertura após", "Status", "Sinalização"]}
        emptyMessage={props.emptyMessage}
      >
        {props.items.map((item) => {
          const compactSignals = getCompactRequestSignals(getRequestSignals(item));
          const hiddenSignalsTitle = compactSignals.hidden.join("; ");

          return (
            <TableRow key={`${item.id ?? "sem-id"}-${item.center}-${item.material}`} columns={columns} minWidth={minWidth}>
              <Cell>{item.id ?? "-"}</Cell>
              <Cell title={item.center}>{item.center}</Cell>
              <Cell title={`${item.material} - ${item.description}`}>{item.material}</Cell>
              <Cell>{formatNumber(item.requestedQuantity)}</Cell>
              <Cell>{item.evaluatedStockTotal === 0 ? "Sem estoque" : formatNumber(item.evaluatedStockTotal)}</Cell>
              <Cell>{formatNumber(item.projectedStockTotal)}</Cell>
              <Cell>{formatCurrency(item.estimatedRequestedValueBRL)}</Cell>
              <Cell title={item.averageAnnualConsumption === 0 ? "Sem consumo médio" : undefined}>{formatRequestCoverage(item)}</Cell>
              <Cell><Badge text={item.requestStatusLabel} tone={statusTone[item.requestStatus] ?? "neutral"} /></Cell>
              <Cell>
                <div style={styles.badgeStack}>
                  {compactSignals.visible.map((signal) => <Badge key={signal} text={signal} tone={signalTone[signal]} style={styles.compactBadge} />)}
                  {compactSignals.hidden.length > 0 ? <Badge text={`+${compactSignals.hidden.length}`} tone="neutral" title={hiddenSignalsTitle} style={styles.compactSignalBadge} /> : null}
                </div>
              </Cell>
            </TableRow>
          );
        })}
      </DashboardTable>
    </DashboardSection>
  );
}

function getFallbackRecommendationLabel(recommendation: StockRecommendation): string {
  const labels: Record<StockRecommendation, string> = {
    PURCHASE_RECOMMENDED: "Compra recomendada",
    PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial",
    PURCHASE_NOT_RECOMMENDED: "Compra não recomendada",
    MANUAL_REVIEW_REQUIRED: "Requer análise manual",
  };
  return labels[recommendation] ?? recommendation;
}

function DashboardSection(props: { title: string; count?: number; children: ReactNode; style?: React.CSSProperties; titleTooltip?: string }) {
  return (
    <Card style={{ minWidth: 0, ...props.style }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle} title={props.titleTooltip}>{props.title}</h2>
        {typeof props.count === "number" ? <Badge text={`${formatNumber(props.count)} itens`} tone="neutral" /> : null}
      </div>
      {props.children}
    </Card>
  );
}

function DashboardTable(props: { columns: string; headers: string[]; emptyMessage: string; children: ReactNode; minWidth?: number; maxHeight?: number; fillHeight?: boolean }) {
  const hasRows = Array.isArray(props.children) ? props.children.length > 0 : Boolean(props.children);
  const scrollerStyle = props.fillHeight
    ? { ...styles.tableScroller, ...styles.tableScrollerFill }
    : { ...styles.tableScroller, maxHeight: props.maxHeight ?? styles.tableScroller.maxHeight };

  return (
    <div style={{ ...styles.tableShell, ...(props.fillHeight ? styles.tableShellFill : null) }}>
      <div style={scrollerStyle}>
        <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: props.minWidth ?? 1040, width: "max-content", background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}`, position: "sticky", top: 0, zIndex: 1 }}>
          {props.headers.map((header) => <HeaderCell key={header}>{header}</HeaderCell>)}
        </div>
        {hasRows ? props.children : <div style={{ padding: "20px 12px", textAlign: "center", color: uiTokens.colors.textMuted }}>{props.emptyMessage}</div>}
      </div>
    </div>
  );
}

function TableRow(props: { columns: string; children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: props.minWidth ?? 1040, width: "max-content", background: uiTokens.colors.surface, borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>
      {props.children}
    </div>
  );
}

function HeaderCell(props: { children: ReactNode }) {
  return <div style={{ padding: "10px 8px", fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight, color: uiTokens.colors.text, whiteSpace: "nowrap" }}>{props.children}</div>;
}

function Cell(props: { children: ReactNode; title?: string; noWrap?: boolean }) {
  return (
    <div
      title={props.title}
      style={{
        padding: "10px 8px",
        fontSize: uiTokens.typography.sm,
        color: uiTokens.colors.textStrong,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: props.noWrap === false ? "normal" : "nowrap",
      }}
    >
      {props.children}
    </div>
  );
}

function RequestsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: "block", stroke: "currentColor", strokeWidth: 1.75, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}
