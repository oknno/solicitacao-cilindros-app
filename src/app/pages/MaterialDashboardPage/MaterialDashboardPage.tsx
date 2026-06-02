import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMaterialDashboardUseCase } from "../../../application/materialDashboard";
import { getAccessProfileLabel, type UserAccessProfile } from "../../../domain/accessControl";
import type { DashboardStockRankingItem, MaterialDashboardAttentionLabel, MaterialDashboardResult, MaterialDashboardSeverity } from "../../../domain/materialDashboard";
import { normalizeCenter } from "../../../domain/materialRequest/normalizeCenter";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fieldControlStyles } from "../../components/ui/fieldControlStyles";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";

const DASHBOARD_FILTER_BUTTON_ID = "material-dashboard-filter-button";
const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = { center: "", signal: "", severity: "", materialKey: "" };
const EMPTY_COMMAND_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Title", sortDir: "asc" };
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
const STOCK_ATTENTION_LABEL_PRIORITY: MaterialDashboardAttentionLabel[] = [
  "Uso frequente com estoque baixo",
  "Estoque zerado com consumo",
  "Valor alto parado",
  "Cobertura elevada",
  "Cobertura baixa",
  "Sem consumo histórico",
  "Solicitação aberta com estoque disponível",
];
const STOCK_SIGNAL_PALETTE: Record<MaterialDashboardAttentionLabel, { bar: string; bg: string; fg: string; bd: string }> = {
  "Sem consumo histórico": { bar: "#64748b", bg: "#f1f5f9", fg: "#334155", bd: "#cbd5e1" },
  "Valor alto parado": { bar: "#c0564a", bg: "#fff1f2", fg: "#9f3a35", bd: "#fecdd3" },
  "Uso frequente com estoque baixo": { bar: "#b76e18", bg: "#fff7ed", fg: "#9a5a12", bd: "#fed7aa" },
  "Cobertura elevada": { bar: "#b08900", bg: "#fefce8", fg: "#854d0e", bd: "#fde68a" },
  "Cobertura baixa": { bar: "#c47f16", bg: "#fffbeb", fg: "#92400e", bd: "#fcd34d" },
  "Estoque zerado com consumo": { bar: "#b4534a", bg: "#fef2f2", fg: "#991b1b", bd: "#fecaca" },
  "Solicitação aberta com estoque disponível": { bar: "#6366a6", bg: "#eef2ff", fg: "#3730a3", bd: "#c7d2fe" },
};
const CONSUMPTION_YEARS = [
  { label: "2021", key: "consumption2021" },
  { label: "2022", key: "consumption2022" },
  { label: "2023", key: "consumption2023" },
  { label: "2024", key: "consumption2024" },
  { label: "2025", key: "consumption2025" },
  { label: "2026", key: "consumption2026" },
] as const;
type StockDashboardItem = DashboardStockRankingItem & { attentionLabels: MaterialDashboardAttentionLabel[]; severity: MaterialDashboardSeverity | null; openRequestsCount: number };
type QuickFilter = { view: "stock"; type: "signal" | "severity"; value: string; label: string };
type StockQuickFilter = QuickFilter;
type StockSignalDistributionItem = { label: MaterialDashboardAttentionLabel; count: number; tone: "neutral" | "info" | "success" | "danger" | "warning"; color: string };
type StockSortKey = "center" | "material" | "description" | "evaluatedStockTotal" | "totalStockValueBRL" | "averageAnnualConsumption" | "consumptionYearsCount" | "coverageYears" | "openRequestsCount" | "signal";
type SortDirection = "asc" | "desc";
type StockSortConfig = { key: StockSortKey; direction: SortDirection } | null;
type StockTableHeader = { label: string; sortKey?: StockSortKey };
type MaterialFilterOption = { key: string; center: string; material: string; description: string; label: string; searchText: string };

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const styles = {
  page: {
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    background: uiTokens.colors.appBackground,
    padding: uiTokens.spacing.md,
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr)",
    gap: uiTokens.spacing.md,
    alignContent: "stretch",
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
    overflow: "visible",
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
  stockLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.8fr) minmax(0, 1.5fr)",
    gap: uiTokens.spacing.md,
    alignItems: "stretch",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  analyticsColumn: {
    display: "grid",
    gridTemplateRows: "repeat(2, minmax(0, 1fr))",
    gap: uiTokens.spacing.md,
    minHeight: 0,
  } satisfies React.CSSProperties,
  analyticsSection: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  analyticsScroller: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    paddingRight: uiTokens.spacing.xs,
    paddingBottom: uiTokens.spacing.sm,
    scrollbarGutter: "stable",
  } satisfies React.CSSProperties,
  stockTableSection: {
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
  centerChartScroller: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    paddingRight: uiTokens.spacing.xs,
    paddingBottom: uiTokens.spacing.sm,
    scrollbarGutter: "stable",
  } satisfies React.CSSProperties,
  centerChartRow: {
    paddingBottom: uiTokens.spacing.xxs,
  } satisfies React.CSSProperties,
  chartLabelRow: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 1fr) auto",
    gap: uiTokens.spacing.sm,
    alignItems: "center",
    color: uiTokens.colors.textStrong,
    fontSize: uiTokens.typography.sm,
    lineHeight: 1.35,
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
  materialModalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    background: uiTokens.colors.overlay,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: uiTokens.spacing.xl,
  } satisfies React.CSSProperties,
  materialModal: {
    width: "min(1120px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    overflow: "auto",
    background: uiTokens.colors.surface,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.lg,
    boxShadow: `0 24px 60px ${uiTokens.colors.shadowSoft}`,
  } satisfies React.CSSProperties,
  materialModalHeader: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: uiTokens.spacing.md,
    padding: uiTokens.spacing.xl,
    borderBottom: `1px solid ${uiTokens.colors.border}`,
    background: uiTokens.colors.surface,
  } satisfies React.CSSProperties,
  materialModalContent: {
    padding: uiTokens.spacing.xl,
    display: "grid",
    gap: uiTokens.spacing.md,
  } satisfies React.CSSProperties,
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: uiTokens.spacing.sm,
  } satisfies React.CSSProperties,
  detailCard: {
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    background: uiTokens.colors.surface,
    padding: uiTokens.spacing.md,
    minHeight: 78,
  } satisfies React.CSSProperties,
  detailSection: {
    border: `1px solid ${uiTokens.colors.borderMuted}`,
    borderRadius: uiTokens.radius.md,
    background: uiTokens.colors.surfaceMuted,
    padding: uiTokens.spacing.md,
    display: "grid",
    gap: uiTokens.spacing.sm,
  } satisfies React.CSSProperties,
  tableRowInteractive: {
    cursor: "default",
    userSelect: "none",
  } satisfies React.CSSProperties,
  sortableHeader: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    border: 0,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    padding: 0,
    font: "inherit",
    fontWeight: "inherit",
    textAlign: "left",
    whiteSpace: "nowrap",
  } satisfies React.CSSProperties,
  sortableHeaderHover: {
    color: uiTokens.colors.accent,
  } satisfies React.CSSProperties,
  sortIndicator: {
    color: uiTokens.colors.accent,
    fontSize: 11,
    lineHeight: 1,
  } satisfies React.CSSProperties,
  materialCombobox: {
    position: "relative",
  } satisfies React.CSSProperties,
  materialOptionsPanel: {
    position: "absolute",
    zIndex: 1100,
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    overflow: "hidden",
    background: uiTokens.colors.surface,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.sm,
    boxShadow: `0 8px 20px ${uiTokens.colors.shadowSoft}`,
    boxSizing: "border-box",
  } satisfies React.CSSProperties,
  materialOptionsHeader: {
    padding: "7px 8px",
    borderBottom: `1px solid ${uiTokens.colors.borderMuted}`,
    background: uiTokens.colors.surfaceMuted,
    color: uiTokens.colors.textMuted,
    fontSize: uiTokens.typography.xs,
    fontWeight: uiTokens.typography.mediumWeight,
  } satisfies React.CSSProperties,
  materialOptionsList: {
    maxHeight: 280,
    overflowX: "hidden",
    overflowY: "auto",
    overscrollBehavior: "contain",
    margin: 0,
    padding: 4,
    listStyle: "none",
  } satisfies React.CSSProperties,
  materialOptionButton: {
    width: "100%",
    border: 0,
    borderRadius: uiTokens.radius.sm,
    background: "transparent",
    color: uiTokens.colors.text,
    cursor: "pointer",
    padding: "7px 8px",
    textAlign: "left",
    fontSize: uiTokens.typography.sm,
    lineHeight: 1.35,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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

interface DashboardFilters {
  center: string;
  signal: string;
  severity: string;
  materialKey: string;
}

function hasManualFilters(filters: DashboardFilters): boolean {
  return Boolean(filters.center || filters.signal || filters.severity || filters.materialKey);
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

function getQuickFilterEmptyMessage(quickFilter: QuickFilter | null, filters: DashboardFilters): string {
  if (filters.materialKey) return "Nenhum material encontrado para os filtros aplicados.";
  if (!quickFilter) return hasManualFilters(filters) ? "Nenhum item encontrado para os filtros aplicados." : "Nenhum item de estoque encontrado.";
  if (hasManualFilters(filters)) return "Nenhum item encontrado para os filtros aplicados.";
  return `Nenhum material encontrado para o filtro ${quickFilter.label}.`;
}

function buildMaterialKey(center: string, material: string): string {
  return `${normalizeCenter(center).toLocaleUpperCase("pt-BR")}::${material.trim().toLocaleUpperCase("pt-BR")}`;
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
    if (normalizeCenter(filters.center) && normalizeCenter(item.center) !== normalizeCenter(filters.center)) return false;
    if (stockSignal && !item.attentionLabels.includes(stockSignal)) return false;
    if (filters.severity && item.severity !== filters.severity) return false;
    if (filters.materialKey && buildMaterialKey(item.center, item.material) !== filters.materialKey) return false;
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

function getStockSignalPalette(signal: MaterialDashboardAttentionLabel) {
  return STOCK_SIGNAL_PALETTE[signal];
}

function formatCoverageForText(value: number | null | undefined): string {
  const formatted = formatCoverage(value);
  return formatted === "-" ? "não estimada" : formatted;
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

function getPrimaryStockSignal(item: StockDashboardItem): string {
  return getCompactStockAttentionLabels(item.attentionLabels).visible[0] ?? "";
}

function getStockSortValue(item: StockDashboardItem, key: StockSortKey): string | number | null {
  if (key === "signal") return getPrimaryStockSignal(item);
  return item[key] as string | number | null;
}

function compareNullableValues(leftValue: string | number | null | undefined, rightValue: string | number | null | undefined, direction: SortDirection, numeric: boolean): number {
  const leftEmpty = leftValue == null || leftValue === "" || (typeof leftValue === "number" && !Number.isFinite(leftValue));
  const rightEmpty = rightValue == null || rightValue === "" || (typeof rightValue === "number" && !Number.isFinite(rightValue));
  if (leftEmpty || rightEmpty) {
    if (leftEmpty && rightEmpty) return 0;
    return leftEmpty ? 1 : -1;
  }

  const comparison = numeric
    ? Number(leftValue) - Number(rightValue)
    : String(leftValue).localeCompare(String(rightValue), "pt-BR", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? comparison : -comparison;
}

function sortStockItemsByColumn(items: StockDashboardItem[], sortConfig: StockSortConfig): StockDashboardItem[] {
  if (!sortConfig) return items;
  const numericColumns = new Set<StockSortKey>(["evaluatedStockTotal", "totalStockValueBRL", "averageAnnualConsumption", "consumptionYearsCount", "coverageYears", "openRequestsCount"]);
  return [...items].sort((left, right) => {
    const comparison = compareNullableValues(getStockSortValue(left, sortConfig.key), getStockSortValue(right, sortConfig.key), sortConfig.direction, numericColumns.has(sortConfig.key));
    return comparison !== 0 ? comparison : sortStockItemsForManagement(left, right);
  });
}

function buildMaterialFilterOptions(items: StockDashboardItem[], selectedCenter: string): MaterialFilterOption[] {
  const uniqueOptions = new Map<string, MaterialFilterOption>();
  for (const item of items) {
    if (normalizeCenter(selectedCenter) && normalizeCenter(item.center) !== normalizeCenter(selectedCenter)) continue;
    const key = buildMaterialKey(item.center, item.material);
    if (uniqueOptions.has(key)) continue;
    const label = `${item.center} | ${item.material} - ${item.description || "Descrição não informada"}`;
    uniqueOptions.set(key, {
      key,
      center: item.center,
      material: item.material,
      description: item.description,
      label,
      searchText: `${item.center} ${item.material} ${item.description}`.toLocaleUpperCase("pt-BR"),
    });
  }

  return Array.from(uniqueOptions.values()).sort((left, right) => left.label.localeCompare(right.label, "pt-BR", { numeric: true, sensitivity: "base" }));
}

function getStockDashboardModel(data: MaterialDashboardResult | null, filters: DashboardFilters) {
  const stockItems = filterStockItems(getStockDashboardItems(data), filters).sort(sortStockItemsForManagement);
  const distribution = STOCK_SIGNAL_OPTIONS
    .map((signal) => ({ label: signal, count: stockItems.filter((item) => item.attentionLabels.includes(signal)).length, tone: getStockSignalTone(signal), color: getStockSignalPalette(signal).bar }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));
  const stockValueByCenter = Array.from(stockItems.reduce((map, item) => {
    const center = normalizeCenter(item.center);
    if (center) map.set(center, (map.get(center) ?? 0) + item.totalStockValueBRL);
    return map;
  }, new Map<string, number>()).entries())
    .map(([center, value]) => ({ center, value }))
    .sort((left, right) => right.value - left.value || left.center.localeCompare(right.center, "pt-BR", { numeric: true, sensitivity: "base" }));

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

export function MaterialDashboardPage(props: { accessProfile: UserAccessProfile; onBackToRequests: () => void }) {
  const [dashboard, setDashboard] = useState<MaterialDashboardResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [quickFilter, setQuickFilter] = useState<QuickFilter | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setState("loading");
    try {
      const result = await getMaterialDashboardUseCase(props.accessProfile);
      setDashboard(result);
      setState("idle");
    } catch (error) {
      console.error(error);
      setState("error");
    }
  }, [props.accessProfile]);

  useEffect(() => {
    let ignore = false;

    void (async () => {
      try {
        const result = await getMaterialDashboardUseCase(props.accessProfile);
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
  }, [props.accessProfile]);

  const stockDashboard = useMemo(() => getStockDashboardModel(dashboard, appliedFilters), [dashboard, appliedFilters]);
  const stockQuickFilter = quickFilter;
  const quickFilteredStockItems = useMemo(() => applyStockQuickFilter(stockDashboard.stockItems, stockQuickFilter), [stockDashboard.stockItems, stockQuickFilter]);
  const allStockItems = useMemo(() => getStockDashboardItems(dashboard), [dashboard]);
  const materialOptions = useMemo(() => buildMaterialFilterOptions(allStockItems, draftFilters.center), [allStockItems, draftFilters.center]);
  const centerOptions = dashboard?.centerOptions ?? [];
  const isInitialLoading = state === "loading" && !dashboard;
  const hasDashboardData = dashboard ? dashboard.stockItems.length > 0 : false;

  function openFilters() {
    setDraftFilters(appliedFilters);
    setFilterModalOpen(true);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setFilterModalOpen(false);
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_DASHBOARD_FILTERS);
    setAppliedFilters(DEFAULT_DASHBOARD_FILTERS);
    setFilterModalOpen(false);
  }

  function closeFilters() {
    setDraftFilters(appliedFilters);
    setFilterModalOpen(false);
  }

  return (
    <div className="material-stock-dashboard-page" style={styles.page}>
      <CommandBar
        title="Dashboard de Estoque — Cilindros e Discos"
        isAdmin={props.accessProfile.roles.includes("ADMIN")}
        profileLabel={getAccessProfileLabel(props.accessProfile)}
        selectedId={null}
        totalLoaded={stockDashboard.stockItems.length}
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
        navigationAction={{
          label: "Voltar para Solicitações",
          icon: <RequestsIcon />,
          onClick: props.onBackToRequests,
        }}
      />

      {filterModalOpen && <DashboardFilterPopover
        value={draftFilters}
        centers={centerOptions}
        signals={STOCK_SIGNAL_OPTIONS}
        severities={STOCK_SEVERITY_OPTIONS}
        materialOptions={materialOptions}
        anchorId={DASHBOARD_FILTER_BUTTON_ID}
        onChange={(patch) => setDraftFilters((current) => {
          const next = { ...current, ...patch };
          if (patch.center !== undefined && next.materialKey) {
            const selectedMaterial = allStockItems.find((item) => buildMaterialKey(item.center, item.material) === next.materialKey);
            if (selectedMaterial && normalizeCenter(next.center) && normalizeCenter(selectedMaterial.center) !== normalizeCenter(next.center)) next.materialKey = "";
          }
          return next;
        })}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeFilters}
      />}

      {isInitialLoading ? <CenteredState state="loading" message="Carregando dashboard..." /> : null}
      {state === "error" && !dashboard ? <CenteredState state="error" message="Não foi possível carregar o dashboard." /> : null}
      {state !== "error" && dashboard && !hasDashboardData ? <CenteredState state="empty" message="Nenhum dado disponível para o dashboard." /> : null}

      {dashboard && hasDashboardData ? <MaterialStockDashboardView model={stockDashboard} tableItems={quickFilteredStockItems} openRequests={dashboard.openRequests} quickFilter={stockQuickFilter} appliedFilters={appliedFilters} hasAnyStock={dashboard.stockItems.length > 0} onApplyQuickFilter={setQuickFilter} onClearQuickFilter={() => setQuickFilter(null)} /> : null}
    </div>
  );
}

function MaterialStockDashboardView(props: {
  model: ReturnType<typeof getStockDashboardModel>;
  tableItems: StockDashboardItem[];
  openRequests: MaterialDashboardResult["openRequests"];
  quickFilter: StockQuickFilter | null;
  appliedFilters: DashboardFilters;
  hasAnyStock: boolean;
  onApplyQuickFilter: (filter: QuickFilter) => void;
  onClearQuickFilter: () => void;
}) {
  const [selectedMaterial, setSelectedMaterial] = useState<StockDashboardItem | null>(null);
  const [sortConfig, setSortConfig] = useState<StockSortConfig>(null);
  const sortedTableItems = useMemo(() => sortStockItemsByColumn(props.tableItems, sortConfig), [props.tableItems, sortConfig]);

  if (!props.hasAnyStock) return <CenteredState state="empty" message="Nenhum item de estoque carregado." />;

  const selectedMaterialRequests = selectedMaterial
    ? props.openRequests.filter((request) => buildMaterialKey(request.center, request.material) === buildMaterialKey(selectedMaterial.center, selectedMaterial.material))
    : [];

  return (
    <>
      <StockKpiGrid kpis={props.model.kpis} onApplyQuickFilter={props.onApplyQuickFilter} />
      <div className="material-stock-dashboard-layout" style={styles.stockLayout}>
        <div className="material-stock-dashboard-analytics" style={styles.analyticsColumn}>
          <StockAttentionDistributionChart items={props.model.distribution} onApplyQuickFilter={props.onApplyQuickFilter} />
          <StockValueByCenterChart items={props.model.stockValueByCenter} />
        </div>
        <StockManagementTable items={sortedTableItems} sortConfig={sortConfig} onSortChange={setSortConfig} quickFilter={props.quickFilter} emptyMessage={getQuickFilterEmptyMessage(props.quickFilter, props.appliedFilters)} onClearQuickFilter={props.onClearQuickFilter} onOpenMaterial={setSelectedMaterial} />
      </div>
      {selectedMaterial ? <MaterialDetailModal material={selectedMaterial} openRequests={selectedMaterialRequests} onClose={() => setSelectedMaterial(null)} /> : null}
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

function StockAttentionDistributionChart(props: { items: StockSignalDistributionItem[]; onApplyQuickFilter: (filter: QuickFilter) => void }) {
  return (
    <DashboardSection title="Distribuição das sinalizações" titleTooltip="Um material pode aparecer em mais de uma sinalização." style={styles.analyticsSection}>
      <div style={styles.analyticsScroller}>
        <SimpleBarChart
          emptyMessage="Sem dados para exibir."
          items={props.items}
          onItemClick={(item) => props.onApplyQuickFilter({ view: "stock", type: "signal", value: item.label, label: item.label })}
        />
      </div>
    </DashboardSection>
  );
}

function StockValueByCenterChart(props: { items: { center: string; value: number }[] }) {
  const max = Math.max(...props.items.map((item) => item.value), 0);
  return (
    <DashboardSection title="Valor em estoque por centro" count={props.items.length} style={styles.analyticsSection}>
      <div style={{ ...styles.chartRows, ...styles.centerChartScroller }}>
        {props.items.length === 0 ? <div style={{ padding: "12px 0", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Nenhum item encontrado para os filtros aplicados.</div> : props.items.map((item) => (
          <div key={item.center} style={styles.centerChartRow}>
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
    </DashboardSection>
  );
}

function StockManagementTable(props: { items: StockDashboardItem[]; sortConfig: StockSortConfig; onSortChange: (sortConfig: StockSortConfig) => void; quickFilter: StockQuickFilter | null; emptyMessage: string; onClearQuickFilter: () => void; onOpenMaterial: (item: StockDashboardItem) => void }) {
  const columns = "80px 120px 280px 90px 150px 110px 100px 120px 110px 340px";
  const minWidth = 1500;
  const headers: StockTableHeader[] = [
    { label: "Centro", sortKey: "center" },
    { label: "Material", sortKey: "material" },
    { label: "Descrição", sortKey: "description" },
    { label: "Estoque", sortKey: "evaluatedStockTotal" },
    { label: "Valor estoque", sortKey: "totalStockValueBRL" },
    { label: "Média anual", sortKey: "averageAnnualConsumption" },
    { label: "Anos mov.", sortKey: "consumptionYearsCount" },
    { label: "Cobertura", sortKey: "coverageYears" },
    { label: "Solic. abertas", sortKey: "openRequestsCount" },
    { label: "Sinalização", sortKey: "signal" },
  ];

  function toggleSort(sortKey: StockSortKey) {
    props.onSortChange(props.sortConfig?.key === sortKey
      ? { key: sortKey, direction: props.sortConfig.direction === "desc" ? "asc" : "desc" }
      : { key: sortKey, direction: "desc" });
  }

  return (
    <DashboardSection title="Tabela gerencial de estoque" count={props.items.length} style={styles.stockTableSection} className="material-stock-dashboard-table-section">
      <QuickFilterNotice quickFilter={props.quickFilter} onClear={props.onClearQuickFilter} />
      <DashboardTable
        columns={columns}
        minWidth={minWidth}
        fillHeight
        headers={headers}
        sortConfig={props.sortConfig}
        onSort={toggleSort}
        emptyMessage={props.emptyMessage}
      >
        {props.items.map((item) => {
          const compactLabels = getCompactStockAttentionLabels(item.attentionLabels);
          const hiddenLabelsTitle = compactLabels.hidden.join("; ");

          return (
            <TableRow key={`${item.center}-${item.material}`} columns={columns} minWidth={minWidth} title="Duplo clique para ver detalhes do material" onDoubleClick={() => props.onOpenMaterial(item)}>
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

function MaterialDetailModal(props: { material: StockDashboardItem; openRequests: MaterialDashboardResult["openRequests"]; onClose: () => void }) {
  const { onClose } = props;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const totalRequested = props.openRequests.reduce((total, request) => total + request.requestedQuantity, 0);
  const hasOpenRequests = props.openRequests.length > 0;
  const projectedStock = props.material.evaluatedStockTotal + totalRequested;
  const projectedCoverage = props.material.averageAnnualConsumption > 0 ? projectedStock / props.material.averageAnnualConsumption : null;
  const yearConsumptions = CONSUMPTION_YEARS.map((year) => ({ label: year.label, value: props.material[year.key] }));
  const maxConsumption = Math.max(...yearConsumptions.map((item) => item.value), 1);
  const primarySignal = props.material.attentionLabels.length > 0 ? props.material.attentionLabels[0] : null;
  const primaryPalette = primarySignal ? getStockSignalPalette(primarySignal) : null;
  const stockSummaryCards = [
    { label: "Estoque atual", value: formatNumber(props.material.evaluatedStockTotal), helper: "Quantidade disponível na base de estoque" },
    { label: "Preço médio", value: formatCurrency(props.material.averagePrice), helper: "Referência financeira do item" },
    { label: "Estoque total (R$)", value: formatCurrency(props.material.totalStockValueBRL), helper: "Valor atual em estoque" },
    { label: "Consumo total histórico", value: formatNumber(props.material.historicalTotal), helper: "Somatório do histórico importado" },
    { label: "Anos com movimentação", value: formatNumber(props.material.consumptionYearsCount), helper: "Anos com consumo registrado" },
    { label: "Média anual de consumo", value: formatNumber(props.material.averageAnnualConsumption), helper: "Base para cálculo de cobertura" },
  ];
  const coverageCards = hasOpenRequests
    ? [
        { label: "Cobertura atual", value: formatCoverage(props.material.coverageYears), helper: "Com base no estoque e consumo médio" },
        { label: "Solicitações abertas", value: formatNumber(props.openRequests.length), helper: `${formatNumber(totalRequested)} unidades solicitadas` },
        { label: "Estoque projetado", value: formatNumber(projectedStock), helper: "Estoque atual + solicitações abertas" },
        { label: "Cobertura projetada", value: formatCoverage(projectedCoverage), helper: "Considera as solicitações abertas" },
      ]
    : [
        { label: "Cobertura atual", value: formatCoverage(props.material.coverageYears), helper: "Com base no estoque e consumo médio" },
        { label: "Solicitações abertas", value: "0", helper: "Sem solicitações abertas para este material" },
      ];
  const stockObservations = [
    props.material.historicalTotal > 0 ? `Há consumo histórico registrado: ${formatNumber(props.material.historicalTotal)} unidades no período.` : "Não há consumo histórico registrado para o material.",
    `A média anual de consumo é ${formatNumber(props.material.averageAnnualConsumption)} unidade(s).`,
    `O valor atual em estoque é ${formatCurrency(props.material.totalStockValueBRL)}.`,
    `A cobertura atual é de aproximadamente ${formatCoverageForText(props.material.coverageYears)}.`,
  ];
  const managementObservations = [
    hasOpenRequests ? `O material possui ${formatNumber(props.openRequests.length)} solicitação(ões) aberta(s), totalizando ${formatNumber(totalRequested)} unidade(s).` : "O material não possui solicitações abertas.",
    hasOpenRequests ? `Se todas forem aprovadas, o estoque projetado será ${formatNumber(projectedStock)} unidade(s), com cobertura de ${formatCoverageForText(projectedCoverage)}.` : "Não há bloco projetado adicional porque não existem solicitações abertas.",
    props.material.attentionLabels.length > 0 ? `Sinalizações ativas: ${props.material.attentionLabels.join(", ")}.` : "Não há sinalizações ativas para este material.",
    primarySignal ? `Prioridade gerencial: ${primarySignal}.` : "Item sem alerta de atenção no dashboard atual.",
  ];

  return (
    <div style={styles.materialModalOverlay} onMouseDown={props.onClose}>
      <div role="dialog" aria-modal="true" aria-label="Informações do material" style={styles.materialModal} onMouseDown={(event) => event.stopPropagation()}>
        <div style={styles.materialModalHeader}>
          <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
            <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>Informações do material</div>
            <h2 style={{ margin: 0, color: uiTokens.colors.textStrong, fontSize: 22, fontWeight: uiTokens.typography.titleWeight }}>{props.material.material}</h2>
            <div style={{ color: uiTokens.colors.text, fontSize: uiTokens.typography.md }}>{props.material.description || "Descrição não informada"}</div>
            <div style={{ display: "flex", gap: uiTokens.spacing.xs, flexWrap: "wrap", alignItems: "center", marginTop: uiTokens.spacing.xs }}>
              <Badge text={`Centro ${props.material.center || "-"}`} tone="neutral" />
              {props.material.severity ? <Badge text={`Severidade ${getStockSeverityLabel(props.material.severity)}`} tone={getStockSeverityTone(props.material.severity)} /> : null}
              {hasOpenRequests ? <Badge text={`${formatNumber(props.openRequests.length)} solicitação(ões) aberta(s)`} tone="info" /> : null}
              {props.material.attentionLabels.map((label) => {
                const palette = getStockSignalPalette(label);
                return <span key={label} style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${palette.bd}`, background: palette.bg, color: palette.fg, borderRadius: uiTokens.radius.pill, padding: "4px 10px", fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.mediumWeight }}>{label}</span>;
              })}
            </div>
          </div>
          <Button type="button" onClick={props.onClose}>Fechar</Button>
        </div>

        <div style={styles.materialModalContent}>
          <div style={styles.detailGrid}>
            {stockSummaryCards.map((card) => <DetailMetricCard key={card.label} {...card} accentColor={primaryPalette?.bar} />)}
          </div>

          <div style={styles.detailSection}>
            <SectionMiniTitle title="Cobertura / visão gerencial" />
            <div style={styles.detailGrid}>{coverageCards.map((card) => <DetailMetricCard key={card.label} {...card} accentColor={primaryPalette?.bar} />)}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: uiTokens.spacing.md, alignItems: "stretch" }}>
            <div style={styles.detailSection}>
              <SectionMiniTitle title="Consumo histórico por ano" />
              <div style={{ height: 210, display: "grid", gridTemplateColumns: `repeat(${yearConsumptions.length}, minmax(0, 1fr))`, alignItems: "stretch", gap: uiTokens.spacing.sm, paddingTop: uiTokens.spacing.xs, borderBottom: `1px solid ${uiTokens.colors.border}` }}>
                {yearConsumptions.map((item) => {
                  const heightPercent = Math.max((item.value / maxConsumption) * 100, item.value > 0 ? 8 : 2);
                  return (
                    <div key={item.label} style={{ height: "100%", display: "grid", gridTemplateRows: "24px minmax(0, 1fr) 20px", alignItems: "end", justifyItems: "center", gap: uiTokens.spacing.xs }}>
                      <span style={{ color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{formatNumber(item.value)}</span>
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "end", justifyContent: "center" }}>
                        <div title={`${item.label}: ${formatNumber(item.value)}`} style={{ width: "66%", maxWidth: 46, minWidth: 22, height: `${heightPercent}%`, minHeight: item.value > 0 ? 8 : 2, borderRadius: `${uiTokens.radius.sm}px ${uiTokens.radius.sm}px 3px 3px`, background: item.value > 0 ? primaryPalette?.bar ?? uiTokens.colors.accent : uiTokens.colors.borderStrong }} />
                      </div>
                      <span style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.detailSection}>
              <SectionMiniTitle title="Leitura analítica" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: uiTokens.spacing.sm }}>
                {[{ title: "Estoque e consumo", items: stockObservations }, { title: "Solicitações e sinais", items: managementObservations }].map((group) => (
                  <div key={group.title} style={{ display: "grid", gap: uiTokens.spacing.xs, alignContent: "start" }}>
                    <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{group.title}</div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: uiTokens.spacing.xs, color: uiTokens.colors.text, fontSize: uiTokens.typography.sm, lineHeight: 1.45 }}>
                      {group.items.map((observation) => <li key={observation}>{observation}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailMetricCard(props: { label: string; value: string; helper: string; accentColor?: string }) {
  return (
    <div style={{ ...styles.detailCard, borderTop: `3px solid ${props.accentColor ?? uiTokens.colors.borderStrong}` }}>
      <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{props.label}</div>
      <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.lg, fontWeight: uiTokens.typography.titleWeight }}>{props.value}</div>
      <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, lineHeight: 1.35 }}>{props.helper}</div>
    </div>
  );
}

function SectionMiniTitle(props: { title: string }) {
  return <div style={{ color: uiTokens.colors.textStrong, fontSize: uiTokens.typography.md, fontWeight: uiTokens.typography.titleWeight }}>{props.title}</div>;
}

function MaterialFilterCombobox(props: { value: string; options: MaterialFilterOption[]; onChange: (materialKey: string) => void }) {
  const selectedOption = props.options.find((option) => option.key === props.value) ?? null;
  const [query, setQuery] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);

  const normalizedQuery = query.trim().toLocaleUpperCase("pt-BR");
  const visibleOptions = (normalizedQuery
    ? props.options.filter((option) => option.searchText.includes(normalizedQuery) || option.label.toLocaleUpperCase("pt-BR").includes(normalizedQuery))
    : props.options);

  function selectOption(option: MaterialFilterOption) {
    props.onChange(option.key);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <label style={styles.label}>
      Material
      <div style={styles.materialCombobox}>
        <input
          type="text"
          value={query}
          placeholder="Pesquisar por código ou descrição"
          onChange={(event) => {
            setQuery(event.target.value);
            props.onChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          style={fieldControlStyles.input}
          aria-label="Pesquisar material"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
        />
        {open ? (
          <div style={styles.materialOptionsPanel}>
            <div style={styles.materialOptionsHeader}>Materiais disponíveis · {visibleOptions.length}</div>
            <ul style={styles.materialOptionsList} role="listbox">
              {visibleOptions.length > 0 ? visibleOptions.map((option) => (
                <li key={option.key} role="option" aria-selected={option.key === props.value}>
                  <button type="button" title={option.label} onMouseDown={(event) => event.preventDefault()} onClick={() => selectOption(option)} style={styles.materialOptionButton}>
                    {option.label}
                  </button>
                </li>
              )) : (
                <li style={{ padding: "8px", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>Nenhum material encontrado</li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function DashboardFilterPopover(props: {
  value: DashboardFilters;
  centers: string[];
  signals: readonly string[];
  severities: readonly { value: MaterialDashboardSeverity; label: string }[];
  materialOptions: MaterialFilterOption[];
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

          <label style={styles.label}>
            Severidade
            <select value={props.value.severity} onChange={(event) => props.onChange({ severity: event.target.value })} style={fieldControlStyles.select}>
              <option value="">Todas</option>
              {props.severities.map((severity) => <option key={severity.value} value={severity.value}>{severity.label}</option>)}
            </select>
          </label>

          <label style={styles.label}>
            Sinalização
            <select value={props.value.signal} onChange={(event) => props.onChange({ signal: event.target.value })} style={fieldControlStyles.select}>
              <option value="">Todas</option>
              {props.signals.map((signal) => <option key={signal} value={signal}>{signal}</option>)}
            </select>
          </label>

          <MaterialFilterCombobox
            key={props.value.materialKey}
            value={props.value.materialKey}
            options={props.materialOptions}
            onChange={(materialKey) => props.onChange({ materialKey })}
          />

          <div style={styles.filterFooterActions}>
            <Button type="button" onClick={props.onClear}>Limpar</Button>
            <Button tone="primary" type="button" onClick={props.onApply}>Aplicar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart<TItem extends { label: string; count: number; tone: "neutral" | "info" | "success" | "danger" | "warning"; color?: string }>(props: { items: TItem[]; emptyMessage: string; onItemClick?: (item: TItem) => void }) {
  const visibleItems = props.items.filter((item) => item.count > 0);
  const max = Math.max(...visibleItems.map((item) => item.count), 0);
  if (visibleItems.length === 0) return <div style={{ padding: "12px 0", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>{props.emptyMessage}</div>;

  return (
    <div style={styles.chartRows}>
      {visibleItems.map((item) => {
        const tone = uiTokens.stateTones[item.tone];
        const barColor = item.color ?? tone.bd;
        const content = (
          <>
            <div style={styles.chartLabelRow}>
              <span>{item.label}</span>
              <strong>{formatNumber(item.count)}</strong>
            </div>
            <div style={styles.chartTrack} aria-hidden="true">
              <div style={{ width: `${max > 0 ? Math.max((item.count / max) * 100, 4) : 0}%`, height: "100%", background: barColor, borderRadius: 999 }} />
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

function DashboardSection(props: { title: string; count?: number; children: ReactNode; style?: React.CSSProperties; titleTooltip?: string; className?: string }) {
  return (
    <Card className={props.className} style={{ minWidth: 0, ...props.style }}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle} title={props.titleTooltip}>{props.title}</h2>
        {typeof props.count === "number" ? <Badge text={`${formatNumber(props.count)} itens`} tone="neutral" /> : null}
      </div>
      {props.children}
    </Card>
  );
}

function DashboardTable(props: { columns: string; headers: StockTableHeader[]; emptyMessage: string; children: ReactNode; sortConfig?: StockSortConfig; onSort?: (sortKey: StockSortKey) => void; minWidth?: number; maxHeight?: number; fillHeight?: boolean }) {
  const hasRows = Array.isArray(props.children) ? props.children.length > 0 : Boolean(props.children);
  const scrollerStyle = props.fillHeight
    ? { ...styles.tableScroller, ...styles.tableScrollerFill }
    : { ...styles.tableScroller, maxHeight: props.maxHeight ?? styles.tableScroller.maxHeight };

  return (
    <div style={{ ...styles.tableShell, ...(props.fillHeight ? styles.tableShellFill : null) }}>
      <div style={scrollerStyle}>
        <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: props.minWidth ?? 1040, width: "max-content", background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}`, position: "sticky", top: 0, zIndex: 1 }}>
          {props.headers.map((header) => <HeaderCell key={header.label} header={header} sortConfig={props.sortConfig} onSort={props.onSort} />)}
        </div>
        {hasRows ? props.children : <div style={{ padding: "20px 12px", textAlign: "center", color: uiTokens.colors.textMuted }}>{props.emptyMessage}</div>}
      </div>
    </div>
  );
}

function TableRow(props: { columns: string; children: ReactNode; minWidth?: number; title?: string; onDoubleClick?: () => void }) {
  return (
    <div title={props.title} onDoubleClick={props.onDoubleClick} style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: props.minWidth ?? 1040, width: "max-content", background: uiTokens.colors.surface, borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, ...(props.onDoubleClick ? styles.tableRowInteractive : null) }}>
      {props.children}
    </div>
  );
}

function HeaderCell(props: { header: StockTableHeader; sortConfig?: StockSortConfig; onSort?: (sortKey: StockSortKey) => void }) {
  const [hovered, setHovered] = useState(false);
  const isSorted = props.sortConfig?.key === props.header.sortKey;
  const indicator = isSorted ? (props.sortConfig?.direction === "asc" ? "↑" : "↓") : null;

  return (
    <div style={{ padding: "10px 8px", fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight, color: uiTokens.colors.text, whiteSpace: "nowrap" }}>
      {props.header.sortKey && props.onSort ? (
        <button
          type="button"
          onClick={() => props.header.sortKey ? props.onSort?.(props.header.sortKey) : undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ ...styles.sortableHeader, ...(hovered ? styles.sortableHeaderHover : null) }}
          aria-sort={isSorted ? (props.sortConfig?.direction === "asc" ? "ascending" : "descending") : "none"}
          title={`Ordenar por ${props.header.label}`}
        >
          <span>{props.header.label}</span>
          {indicator ? <span aria-hidden="true" style={styles.sortIndicator}>{indicator}</span> : null}
        </button>
      ) : props.header.label}
    </div>
  );
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
