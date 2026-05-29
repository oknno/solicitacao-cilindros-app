import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMaterialDashboardUseCase } from "../../../application/materialDashboard";
import type { DashboardOpenRequest, MaterialDashboardResult } from "../../../domain/materialDashboard";
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
const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = { center: "", requestStatus: "", recommendation: "", signal: "" };
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
const REQUEST_SIGNAL_OPTIONS = ["Estoque disponível", "Estoque parcial", "Sem estoque", "Análise manual", "Pendente Gerente", "Pendente CTO", "Devolvida"];

type DashboardView = "requests" | "stock";
type RequestSignal = typeof REQUEST_SIGNAL_OPTIONS[number];
type ImpactKey = "sufficient" | "partial" | "none" | "manual";

const numberFormatter = new Intl.NumberFormat("pt-BR");

const statusTone: Partial<Record<MaterialRequestStatus, "neutral" | "info" | "success" | "danger" | "warning">> = {
  DRAFT: "neutral",
  PENDING_LAMINATION_MANAGER_APPROVAL: "warning",
  PENDING_CTO_APPROVAL: "info",
  RETURNED_FOR_ADJUSTMENT: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

const signalTone: Record<RequestSignal, "neutral" | "info" | "success" | "danger" | "warning"> = {
  "Estoque disponível": "success",
  "Estoque parcial": "warning",
  "Sem estoque": "danger",
  "Análise manual": "info",
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
  kpiValue: {
    marginTop: uiTokens.spacing.xs,
    color: uiTokens.colors.textStrong,
    fontSize: 22,
    fontWeight: uiTokens.typography.titleWeight,
    lineHeight: 1.1,
  } satisfies React.CSSProperties,
  requestsLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.9fr) minmax(520px, 1.6fr)",
    gap: uiTokens.spacing.md,
    alignItems: "start",
  } satisfies React.CSSProperties,
  analyticsColumn: {
    display: "grid",
    gap: uiTokens.spacing.md,
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
  tableShell: {
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  tableScroller: {
    overflowX: "auto",
    maxHeight: 570,
  } satisfies React.CSSProperties,
};

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return numberFormatter.format(value);
}

function isOpenRequest(request: DashboardOpenRequest): boolean {
  return OPEN_REQUEST_STATUSES.has(request.requestStatus);
}

function getRequestSignal(request: DashboardOpenRequest): RequestSignal {
  if (request.stockRecommendation === "MANUAL_REVIEW_REQUIRED" || request.evaluatedStockTotal == null) return "Análise manual";
  if (request.evaluatedStockTotal >= request.requestedQuantity) return "Estoque disponível";
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
  const workflowSignal = getWorkflowSignal(request);
  if (workflowSignal) signals.push(workflowSignal);
  return signals;
}

function getImpactKey(request: DashboardOpenRequest): ImpactKey {
  const signal = getRequestSignal(request);
  if (signal === "Estoque disponível") return "sufficient";
  if (signal === "Estoque parcial") return "partial";
  if (signal === "Sem estoque") return "none";
  return "manual";
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

interface DashboardFilters {
  center: string;
  requestStatus: string;
  recommendation: string;
  signal: string;
}

function filterRequests(requests: DashboardOpenRequest[], filters: DashboardFilters): DashboardOpenRequest[] {
  return requests.filter((request) => {
    if (filters.center && request.center !== filters.center) return false;
    if (filters.requestStatus && request.requestStatus !== filters.requestStatus) return false;
    if (filters.recommendation && request.stockRecommendation !== filters.recommendation) return false;
    if (filters.signal && !getRequestSignals(request).includes(filters.signal as RequestSignal)) return false;
    return true;
  });
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
  const impactCounts = [
    { key: "sufficient" as const, label: "Com estoque suficiente", count: openRequests.filter((request) => getImpactKey(request) === "sufficient").length },
    { key: "partial" as const, label: "Estoque parcial", count: openRequests.filter((request) => getImpactKey(request) === "partial").length },
    { key: "none" as const, label: "Sem estoque", count: openRequests.filter((request) => getImpactKey(request) === "none").length },
    { key: "manual" as const, label: "Análise manual", count: openRequests.filter((request) => getImpactKey(request) === "manual").length },
  ];

  return {
    requests,
    openRequests,
    statusCounts,
    impactCounts,
    kpis: {
      openRequestsCount: openRequests.length,
      pendingLaminationManagerCount: openRequests.filter((request) => request.requestStatus === "PENDING_LAMINATION_MANAGER_APPROVAL").length,
      pendingCtoCount: openRequests.filter((request) => request.requestStatus === "PENDING_CTO_APPROVAL").length,
      returnedForAdjustmentCount: openRequests.filter((request) => request.requestStatus === "RETURNED_FOR_ADJUSTMENT").length,
      availableStockRequestsCount: openRequests.filter((request) => getRequestSignal(request) === "Estoque disponível").length,
      totalRequestedQuantity: openRequests.reduce((total, request) => total + request.requestedQuantity, 0),
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
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
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

  const requestDashboard = useMemo(() => getRequestDashboardModel(dashboard, appliedFilters), [dashboard, appliedFilters]);
  const centerOptions = dashboard?.centerOptions ?? [];
  const requestStatusOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const request of dashboard?.requests ?? dashboard?.openRequests ?? []) {
      options.set(request.requestStatus, request.requestStatusLabel);
    }
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  }, [dashboard]);
  const recommendationOptions = useMemo(() => uniqueSorted((dashboard?.requests ?? dashboard?.openRequests ?? []).map((request) => request.stockRecommendation)), [dashboard]);
  const isInitialLoading = state === "loading" && !dashboard;
  const hasDashboardData = dashboard ? (dashboard.requests?.length ?? dashboard.openRequests.length) > 0 || dashboard.stockItems.length > 0 : false;

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
    <div style={styles.page}>
      <CommandBar
        title="Dashboard Cilindros e Discos"
        isAdmin={false}
        selectedId={null}
        totalLoaded={requestDashboard.openRequests.length}
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
        requestStatuses={requestStatusOptions}
        recommendations={recommendationOptions}
        signals={REQUEST_SIGNAL_OPTIONS}
        anchorId={DASHBOARD_FILTER_BUTTON_ID}
        onChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeFilters}
      />}

      {isInitialLoading ? <CenteredState state="loading" message="Carregando dashboard..." /> : null}
      {state === "error" && !dashboard ? <CenteredState state="error" message="Não foi possível carregar o dashboard." /> : null}
      {state !== "error" && dashboard && !hasDashboardData ? <CenteredState state="empty" message="Nenhum dado disponível para o dashboard." /> : null}

      {dashboard && hasDashboardData && dashboardView === "requests" ? <MaterialRequestsDashboardView model={requestDashboard} /> : null}
      {dashboard && hasDashboardData && dashboardView === "stock" ? <StockPlaceholder /> : null}
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

function MaterialRequestsDashboardView(props: { model: ReturnType<typeof getRequestDashboardModel> }) {
  return (
    <>
      <KpiGrid kpis={props.model.kpis} />
      <div style={styles.requestsLayout}>
        <div style={styles.analyticsColumn}>
          <RequestsStatusChart items={props.model.statusCounts} />
          <RequestsImpactChart items={props.model.impactCounts} />
        </div>
        <OpenRequestsTable items={props.model.openRequests} />
      </div>
    </>
  );
}

function StockPlaceholder() {
  return (
    <Card style={{ textAlign: "center", color: uiTokens.colors.textMuted }}>
      Visão de estoque será implementada na próxima etapa.
    </Card>
  );
}

function DashboardFilterPopover(props: {
  value: DashboardFilters;
  centers: string[];
  requestStatuses: { value: string; label: string }[];
  recommendations: string[];
  signals: readonly string[];
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

function KpiGrid(props: { kpis: ReturnType<typeof getRequestDashboardModel>["kpis"] }) {
  const cards = [
    { label: "Solicitações abertas", value: formatNumber(props.kpis.openRequestsCount), helper: "Em aprovação ou ajuste" },
    { label: "Pendentes Gerente", value: formatNumber(props.kpis.pendingLaminationManagerCount), helper: "Gerente Laminação" },
    { label: "Pendentes CTO", value: formatNumber(props.kpis.pendingCtoCount), helper: "Aguardando CTO" },
    { label: "Devolvidas / em ajuste", value: formatNumber(props.kpis.returnedForAdjustmentCount), helper: "Aguardando correção" },
    { label: "Com estoque disponível", value: formatNumber(props.kpis.availableStockRequestsCount), helper: "Estoque cobre a solicitação" },
    { label: "Qtde. total solicitada", value: formatNumber(props.kpis.totalRequestedQuantity), helper: "Soma das abertas" },
  ];

  return (
    <div style={styles.kpiGrid}>
      {cards.map((card) => (
        <Card key={card.label} style={styles.kpiCard}>
          <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{card.label}</div>
          <div style={styles.kpiValue}>{card.value}</div>
          <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{card.helper}</div>
        </Card>
      ))}
    </div>
  );
}

function RequestsStatusChart(props: { items: { status: MaterialRequestStatus; label: string; count: number }[] }) {
  const total = props.items.reduce((sum, item) => sum + item.count, 0);
  return (
    <DashboardSection title="Status das solicitações" count={total}>
      <SimpleBarChart
        emptyMessage="Sem dados para exibir."
        items={props.items.map((item) => ({ label: item.label, count: item.count, tone: statusTone[item.status] ?? "neutral" }))}
      />
    </DashboardSection>
  );
}

function RequestsImpactChart(props: { items: { key: ImpactKey; label: string; count: number }[] }) {
  const total = props.items.reduce((sum, item) => sum + item.count, 0);
  const toneByImpact: Record<ImpactKey, "neutral" | "info" | "success" | "danger" | "warning"> = {
    sufficient: "success",
    partial: "warning",
    none: "danger",
    manual: "info",
  };
  return (
    <DashboardSection title="Impacto das solicitações" count={total}>
      <SimpleBarChart
        emptyMessage="Sem dados para exibir."
        items={props.items.map((item) => ({ label: item.label, count: item.count, tone: toneByImpact[item.key] }))}
      />
    </DashboardSection>
  );
}

function SimpleBarChart(props: { items: { label: string; count: number; tone: "neutral" | "info" | "success" | "danger" | "warning" }[]; emptyMessage: string }) {
  const visibleItems = props.items.filter((item) => item.count > 0);
  const max = Math.max(...visibleItems.map((item) => item.count), 0);
  if (visibleItems.length === 0) return <div style={{ padding: "12px 0", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>{props.emptyMessage}</div>;

  return (
    <div style={styles.chartRows}>
      {visibleItems.map((item) => {
        const tone = uiTokens.stateTones[item.tone];
        return (
          <div key={item.label}>
            <div style={styles.chartLabelRow}>
              <span>{item.label}</span>
              <strong>{formatNumber(item.count)}</strong>
            </div>
            <div style={styles.chartTrack} aria-hidden="true">
              <div style={{ width: `${max > 0 ? Math.max((item.count / max) * 100, 4) : 0}%`, height: "100%", background: tone.bd, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OpenRequestsTable(props: { items: DashboardOpenRequest[] }) {
  const columns = "48px 64px 86px minmax(140px,1.2fr) 58px 62px minmax(118px,1fr) minmax(112px,1fr) minmax(106px,1fr) 72px minmax(120px,1fr)";
  return (
    <DashboardSection title="Solicitações abertas" count={props.items.length}>
      <DashboardTable
        columns={columns}
        headers={["ID", "Centro", "Material", "Descrição", "Qtde.", "Estoque", "Parecer", "Status", "Solicitante", "Dias", "Sinalização"]}
        emptyMessage="Nenhuma solicitação aberta no momento."
      >
        {props.items.map((item) => {
          const signals = getRequestSignals(item);
          return (
            <TableRow key={`${item.id ?? "sem-id"}-${item.center}-${item.material}`} columns={columns}>
              <Cell>{item.id ?? "-"}</Cell>
              <Cell title={item.center}>{item.center}</Cell>
              <Cell title={item.material}>{item.material}</Cell>
              <Cell title={item.description}>{item.description}</Cell>
              <Cell>{formatNumber(item.requestedQuantity)}</Cell>
              <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
              <Cell title={item.stockRecommendationLabel}>{item.stockRecommendationLabel}</Cell>
              <Cell><Badge text={item.requestStatusLabel} tone={statusTone[item.requestStatus] ?? "neutral"} /></Cell>
              <Cell title={item.requesterName}>{item.requesterName || "-"}</Cell>
              <Cell>{item.daysOpen == null ? "-" : formatNumber(item.daysOpen)}</Cell>
              <Cell noWrap={false}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: uiTokens.spacing.xs }}>
                  {signals.map((signal) => <Badge key={signal} text={signal} tone={signalTone[signal]} />)}
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

function DashboardSection(props: { title: string; count: number; children: ReactNode }) {
  return (
    <Card>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{props.title}</h2>
        <Badge text={`${formatNumber(props.count)} itens`} tone="neutral" />
      </div>
      {props.children}
    </Card>
  );
}

function DashboardTable(props: { columns: string; headers: string[]; emptyMessage: string; children: ReactNode }) {
  const hasRows = Array.isArray(props.children) ? props.children.length > 0 : Boolean(props.children);

  return (
    <div style={styles.tableShell}>
      <div style={styles.tableScroller}>
        <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: 1040, background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}`, position: "sticky", top: 0, zIndex: 1 }}>
          {props.headers.map((header) => <HeaderCell key={header}>{header}</HeaderCell>)}
        </div>
        {hasRows ? props.children : <div style={{ padding: "20px 12px", textAlign: "center", color: uiTokens.colors.textMuted }}>{props.emptyMessage}</div>}
      </div>
    </div>
  );
}

function TableRow(props: { columns: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: 1040, background: uiTokens.colors.surface, borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>
      {props.children}
    </div>
  );
}

function HeaderCell(props: { children: ReactNode }) {
  return <div style={{ padding: "10px 8px", fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight, color: uiTokens.colors.text }}>{props.children}</div>;
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
