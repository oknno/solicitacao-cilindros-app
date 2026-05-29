import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMaterialDashboardUseCase } from "../../../application/materialDashboard";
import { isHighCoverage } from "../../../domain/materialDashboard";
import type {
  DashboardAttentionMaterial,
  DashboardOpenRequest,
  DashboardStockRankingItem,
  MaterialDashboardAttentionLabel,
  MaterialDashboardResult,
  MaterialDashboardSeverity,
} from "../../../domain/materialDashboard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fieldControlStyles } from "../../components/ui/fieldControlStyles";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";

const TABLE_LIMIT = 80;
const DASHBOARD_FILTER_BUTTON_ID = "material-dashboard-filter-button";
const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = { center: "", signal: "", requestStatus: "" };
const EMPTY_COMMAND_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Title", sortDir: "asc" };

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const severityLabel: Record<MaterialDashboardSeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const severityTone: Record<MaterialDashboardSeverity, "danger" | "warning" | "info"> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "info",
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
  tableShell: {
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  tableScroller: {
    overflowX: "auto",
    maxHeight: 360,
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
  const rounded = Math.round(value);
  return `${numberFormatter.format(rounded)} ${rounded === 1 ? "ano" : "anos"}`;
}

function filterByCenter<T extends { center: string }>(items: T[], center: string): T[] {
  if (!center) return items;
  return items.filter((item) => item.center === center);
}

function getMaterialKey(item: { center: string; material: string }): string {
  return `${item.center}::${item.material}`;
}

function isEmptyDashboard(data: MaterialDashboardResult): boolean {
  return data.openRequests.length === 0
    && data.attentionMaterials.length === 0
    && data.stockItems.length === 0
    && data.topStockValueItems.length === 0
    && data.topCoverageItems.length === 0;
}

interface DashboardManagerialRow {
  center: string;
  material: string;
  description: string;
  evaluatedStockTotal: number | null;
  totalStockValueBRL: number | null;
  averageAnnualConsumption: number | null;
  coverageYears: number | null;
  openRequestsCount: number;
  requestStatusLabels: string[];
  attentionLabels: MaterialDashboardAttentionLabel[];
  severity: MaterialDashboardSeverity | null;
}

interface DashboardFilters {
  center: string;
  signal: string;
  requestStatus: string;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function buildManagerialRows(input: {
  stockItems: DashboardStockRankingItem[];
  openRequests: DashboardOpenRequest[];
  attentionMaterials: DashboardAttentionMaterial[];
}): DashboardManagerialRow[] {
  const requestsByMaterial = new Map<string, DashboardOpenRequest[]>();
  input.openRequests.forEach((request) => {
    const key = getMaterialKey(request);
    requestsByMaterial.set(key, [...(requestsByMaterial.get(key) ?? []), request]);
  });

  const attentionByMaterial = new Map(input.attentionMaterials.map((item) => [getMaterialKey(item), item]));
  const stockKeys = new Set(input.stockItems.map((item) => getMaterialKey(item)));
  const addedRequestOnlyKeys = new Set<string>();
  const rows = input.stockItems.map<DashboardManagerialRow>((item) => {
    const relatedRequests = requestsByMaterial.get(getMaterialKey(item)) ?? [];
    const attention = attentionByMaterial.get(getMaterialKey(item));

    return {
      center: item.center,
      material: item.material,
      description: item.description,
      evaluatedStockTotal: item.evaluatedStockTotal,
      totalStockValueBRL: item.totalStockValueBRL,
      averageAnnualConsumption: item.averageAnnualConsumption,
      coverageYears: item.coverageYears,
      openRequestsCount: relatedRequests.length,
      requestStatusLabels: uniqueSorted(relatedRequests.map((request) => request.requestStatusLabel)),
      attentionLabels: attention?.attentionLabels ?? [],
      severity: attention?.severity ?? null,
    };
  });

  input.openRequests.forEach((request) => {
    const key = getMaterialKey(request);
    if (stockKeys.has(key) || addedRequestOnlyKeys.has(key)) return;

    const relatedRequests = requestsByMaterial.get(key) ?? [];
    rows.push({
      center: request.center,
      material: request.material,
      description: request.description,
      evaluatedStockTotal: request.evaluatedStockTotal,
      totalStockValueBRL: null,
      averageAnnualConsumption: null,
      coverageYears: null,
      openRequestsCount: relatedRequests.length,
      requestStatusLabels: uniqueSorted(relatedRequests.map((relatedRequest) => relatedRequest.requestStatusLabel)),
      attentionLabels: [],
      severity: null,
    });
    addedRequestOnlyKeys.add(key);
  });

  return rows.sort((left, right) => {
    const severityWeight: Record<MaterialDashboardSeverity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const severityDiff = (severityWeight[right.severity ?? "LOW"] ?? 0) - (severityWeight[left.severity ?? "LOW"] ?? 0);
    if (severityDiff !== 0) return severityDiff;
    if (right.openRequestsCount !== left.openRequestsCount) return right.openRequestsCount - left.openRequestsCount;
    return (right.totalStockValueBRL ?? 0) - (left.totalStockValueBRL ?? 0);
  });
}

function getFilteredDashboard(data: MaterialDashboardResult | null, filters: DashboardFilters) {
  const centerStockItems = filterByCenter(data?.stockItems ?? [], filters.center);
  const centerOpenRequests = filterByCenter(data?.openRequests ?? [], filters.center);
  const centerAttentionMaterials = filterByCenter(data?.attentionMaterials ?? [], filters.center);
  const openRequestsByStatus = filters.requestStatus
    ? centerOpenRequests.filter((request) => request.requestStatusLabel === filters.requestStatus)
    : centerOpenRequests;
  const allManagerialRows = buildManagerialRows({
    stockItems: centerStockItems,
    openRequests: openRequestsByStatus,
    attentionMaterials: centerAttentionMaterials,
  });
  const allFilteredManagerialRows = allManagerialRows
    .filter((row) => !filters.signal || row.attentionLabels.includes(filters.signal as MaterialDashboardAttentionLabel))
    .filter((row) => !filters.requestStatus || row.requestStatusLabels.includes(filters.requestStatus));
  const visibleMaterialKeys = new Set(allFilteredManagerialRows.map(getMaterialKey));
  const stockItems = centerStockItems.filter((item) => visibleMaterialKeys.has(getMaterialKey(item)));
  const openRequests = openRequestsByStatus.filter((request) => visibleMaterialKeys.has(getMaterialKey(request)));
  const attentionMaterials = centerAttentionMaterials.filter((item) => visibleMaterialKeys.has(getMaterialKey(item)));

  return {
    openRequests,
    attentionMaterials,
    managerialRows: allFilteredManagerialRows.slice(0, TABLE_LIMIT),
    kpis: {
      openRequestsCount: openRequests.length,
      pendingLaminationManagerCount: openRequests.filter((request) => request.requestStatus === "PENDING_LAMINATION_MANAGER_APPROVAL").length,
      pendingCtoCount: openRequests.filter((request) => request.requestStatus === "PENDING_CTO_APPROVAL").length,
      zeroStockMaterialsCount: stockItems.filter((item) => item.evaluatedStockTotal <= 0).length,
      totalStockValueBRL: stockItems.reduce((total, item) => total + item.totalStockValueBRL, 0),
      highCoverageMaterialsCount: stockItems.filter((item) => isHighCoverage(item.coverageYears)).length,
    },
  };
}

export function MaterialDashboardPage(props: { onBackToRequests: () => void }) {
  const [dashboard, setDashboard] = useState<MaterialDashboardResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
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

  const filteredDashboard = useMemo(() => getFilteredDashboard(dashboard, appliedFilters), [dashboard, appliedFilters]);
  const centerOptions = dashboard?.centerOptions ?? [];
  const signalOptions = useMemo(() => uniqueSorted((dashboard?.attentionMaterials ?? []).flatMap((item) => item.attentionLabels)), [dashboard]);
  const requestStatusOptions = useMemo(() => uniqueSorted((dashboard?.openRequests ?? []).map((request) => request.requestStatusLabel)), [dashboard]);
  const isInitialLoading = state === "loading" && !dashboard;
  const isEmpty = dashboard ? isEmptyDashboard(dashboard) : false;

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
        totalLoaded={dashboard?.openRequests.length ?? 0}
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
        signals={signalOptions}
        requestStatuses={requestStatusOptions}
        anchorId={DASHBOARD_FILTER_BUTTON_ID}
        onChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeFilters}
      />}

      {isInitialLoading ? <CenteredState state="loading" message="Carregando dashboard..." /> : null}
      {state === "error" && !dashboard ? <CenteredState state="error" message="Não foi possível carregar o dashboard." /> : null}
      {state !== "error" && dashboard && isEmpty ? <CenteredState state="empty" message="Nenhum dado disponível para o dashboard." /> : null}

      {dashboard && !isEmpty ? (
        <>
          <KpiGrid kpis={filteredDashboard.kpis} />
          <MainAttentionSection items={filteredDashboard.attentionMaterials} />
          <ManagerialTableSection items={filteredDashboard.managerialRows} totalCount={filteredDashboard.managerialRows.length} />
        </>
      ) : null}
    </div>
  );
}


function DashboardFilterPopover(props: {
  value: DashboardFilters;
  centers: string[];
  signals: string[];
  requestStatuses: string[];
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
            Sinalização
            <select value={props.value.signal} onChange={(event) => props.onChange({ signal: event.target.value })} style={fieldControlStyles.select}>
              <option value="">Todas</option>
              {props.signals.map((signal) => <option key={signal} value={signal}>{signal}</option>)}
            </select>
          </label>

          <label style={styles.label}>
            Status solicitação
            <select value={props.value.requestStatus} onChange={(event) => props.onChange({ requestStatus: event.target.value })} style={fieldControlStyles.select}>
              <option value="">Todos</option>
              {props.requestStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
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

function KpiGrid(props: { kpis: ReturnType<typeof getFilteredDashboard>["kpis"] }) {
  const cards = [
    { label: "Solicitações abertas", value: formatNumber(props.kpis.openRequestsCount), helper: "Em aprovação ou ajuste" },
    { label: "Pendentes Gerente", value: formatNumber(props.kpis.pendingLaminationManagerCount), helper: "Gerente Laminação" },
    { label: "Pendentes CTO", value: formatNumber(props.kpis.pendingCtoCount), helper: "Aguardando CTO" },
    { label: "Materiais com estoque zerado", value: formatNumber(props.kpis.zeroStockMaterialsCount), helper: "Estoque atual igual a zero" },
    { label: "Valor total em estoque", value: formatCurrency(props.kpis.totalStockValueBRL), helper: "Base carregada" },
    { label: "Materiais com cobertura alta", value: formatNumber(props.kpis.highCoverageMaterialsCount), helper: "Cobertura acima do limite" },
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

function MainAttentionSection(props: { items: DashboardAttentionMaterial[] }) {
  const cards: { label: string; value: number }[] = [
    { label: "Estoque zerado com consumo", value: countAttentionByLabel(props.items, "Estoque zerado com consumo") },
    { label: "Valor alto parado", value: countAttentionByLabel(props.items, "Valor alto parado") },
    { label: "Solicitação com estoque disponível", value: countAttentionByLabel(props.items, "Solicitação aberta com estoque disponível") },
    { label: "Cobertura elevada", value: countAttentionByLabel(props.items, "Cobertura elevada") },
  ];

  return (
    <DashboardSection title="Atenções principais" count={props.items.length}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: uiTokens.spacing.sm }}>
        {cards.map((card) => (
          <Card key={card.label} style={styles.kpiCard}>
            <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{card.label}</div>
            <div style={styles.kpiValue}>{formatNumber(card.value)}</div>
          </Card>
        ))}
      </div>
    </DashboardSection>
  );
}

function countAttentionByLabel(items: DashboardAttentionMaterial[], label: MaterialDashboardAttentionLabel): number {
  return items.filter((item) => item.attentionLabels.includes(label)).length;
}

function ManagerialTableSection(props: { items: DashboardManagerialRow[]; totalCount: number }) {
  return (
    <DashboardSection title="Tabela gerencial" count={props.totalCount}>
      <DashboardTable
        columns="70px 96px minmax(150px,1.4fr) 78px 116px 94px 86px 92px minmax(130px,1fr) minmax(160px,1.2fr)"
        headers={["Centro", "Material", "Descrição", "Estoque", "Valor estoque", "Média anual", "Cobertura", "Solic. abertas", "Status solicitação", "Sinalização"]}
        emptyMessage="Nenhum material encontrado para os filtros aplicados."
      >
        {props.items.map((item) => (
          <TableRow key={`${item.center}-${item.material}`} columns="70px 96px minmax(150px,1.4fr) 78px 116px 94px 86px 92px minmax(130px,1fr) minmax(160px,1.2fr)">
            <Cell title={item.center}>{item.center}</Cell>
            <Cell title={item.material}>{item.material}</Cell>
            <Cell title={item.description}>{item.description}</Cell>
            <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
            <Cell>{formatCurrency(item.totalStockValueBRL)}</Cell>
            <Cell>{formatNumber(item.averageAnnualConsumption)}</Cell>
            <Cell>{formatCoverage(item.coverageYears)}</Cell>
            <Cell>{formatNumber(item.openRequestsCount)}</Cell>
            <Cell title={item.requestStatusLabels.join(", ")}>{item.requestStatusLabels.length > 0 ? item.requestStatusLabels.join(", ") : "-"}</Cell>
            <Cell noWrap={false}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: uiTokens.spacing.xs }}>
                {item.severity ? <Badge text={severityLabel[item.severity]} tone={severityTone[item.severity]} /> : null}
                {item.attentionLabels.length > 0
                  ? item.attentionLabels.map((label) => <Badge key={label} text={label} tone="neutral" />)
                  : <Badge text="Sem sinalização" tone="neutral" />}
              </div>
            </Cell>
          </TableRow>
        ))}
      </DashboardTable>
    </DashboardSection>
  );
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
        <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: 720, background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}`, position: "sticky", top: 0, zIndex: 1 }}>
          {props.headers.map((header) => <HeaderCell key={header}>{header}</HeaderCell>)}
        </div>
        {hasRows ? props.children : <div style={{ padding: "20px 12px", textAlign: "center", color: uiTokens.colors.textMuted }}>{props.emptyMessage}</div>}
      </div>
    </div>
  );
}

function TableRow(props: { columns: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: props.columns, minWidth: 720, background: uiTokens.colors.surface, borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>
      {props.children}
    </div>
  );
}

function HeaderCell(props: { children: ReactNode }) {
  return <div style={{ padding: "10px", fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight, color: uiTokens.colors.text }}>{props.children}</div>;
}

function Cell(props: { children: ReactNode; title?: string; noWrap?: boolean }) {
  return (
    <div
      title={props.title}
      style={{
        padding: "10px",
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
