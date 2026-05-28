import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMaterialDashboardUseCase } from "../../../application/materialDashboard";
import { isHighCoverage } from "../../../domain/materialDashboard";
import type {
  DashboardAttentionMaterial,
  DashboardOpenRequest,
  DashboardStockRankingItem,
  MaterialDashboardResult,
  MaterialDashboardSeverity,
} from "../../../domain/materialDashboard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { fieldControlStyles } from "../../components/ui/fieldControlStyles";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";

const ATTENTION_LIMIT = 20;
const TOP_LIMIT = 10;

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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: uiTokens.spacing.md,
  } satisfies React.CSSProperties,
  title: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.25,
    color: uiTokens.colors.textStrong,
    fontWeight: uiTokens.typography.titleWeight,
  } satisfies React.CSSProperties,
  subtitle: {
    margin: `${uiTokens.spacing.xs}px 0 0`,
    color: uiTokens.colors.textMuted,
    fontSize: uiTokens.typography.md,
  } satisfies React.CSSProperties,
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 320px) auto auto 1fr",
    gap: uiTokens.spacing.sm,
    alignItems: "end",
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
    gap: uiTokens.spacing.md,
  } satisfies React.CSSProperties,
  kpiValue: {
    marginTop: uiTokens.spacing.sm,
    color: uiTokens.colors.textStrong,
    fontSize: 24,
    fontWeight: uiTokens.typography.titleWeight,
    lineHeight: 1.1,
  } satisfies React.CSSProperties,
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uiTokens.spacing.sm,
    marginBottom: uiTokens.spacing.md,
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
    maxHeight: 420,
  } satisfies React.CSSProperties,
  rankingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
    gap: uiTokens.spacing.md,
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

function isEmptyDashboard(data: MaterialDashboardResult): boolean {
  return data.openRequests.length === 0
    && data.attentionMaterials.length === 0
    && data.stockItems.length === 0
    && data.topStockValueItems.length === 0
    && data.topCoverageItems.length === 0;
}

function getFilteredDashboard(data: MaterialDashboardResult | null, center: string) {
  const stockItems = filterByCenter(data?.stockItems ?? [], center);
  const openRequests = filterByCenter(data?.openRequests ?? [], center);
  const attentionMaterials = filterByCenter(data?.attentionMaterials ?? [], center)
    .slice(0, ATTENTION_LIMIT);
  const topStockValueItems = [...stockItems]
    .sort((left, right) => right.totalStockValueBRL - left.totalStockValueBRL)
    .slice(0, TOP_LIMIT);
  const topCoverageItems = [...stockItems]
    .filter((item) => item.coverageYears !== null)
    .sort((left, right) => (right.coverageYears ?? 0) - (left.coverageYears ?? 0))
    .slice(0, TOP_LIMIT);

  return {
    openRequests,
    attentionMaterials,
    topStockValueItems,
    topCoverageItems,
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

export function MaterialDashboardPage() {
  const [dashboard, setDashboard] = useState<MaterialDashboardResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [draftCenter, setDraftCenter] = useState("");
  const [appliedCenter, setAppliedCenter] = useState("");

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
    void loadDashboard();
  }, [loadDashboard]);

  const filteredDashboard = useMemo(() => getFilteredDashboard(dashboard, appliedCenter), [dashboard, appliedCenter]);
  const centerOptions = dashboard?.centerOptions ?? [];
  const isInitialLoading = state === "loading" && !dashboard;
  const isEmpty = dashboard ? isEmptyDashboard(dashboard) : false;

  function applyFilter() {
    setAppliedCenter(draftCenter);
  }

  function clearFilter() {
    setDraftCenter("");
    setAppliedCenter("");
  }

  return (
    <div style={styles.page}>
      <Card>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Dashboard Cilindros e Discos</h1>
            <p style={styles.subtitle}>Acompanhe solicitações abertas, estoque atual e materiais que merecem atenção.</p>
          </div>
          <Button onClick={() => void loadDashboard()}>Atualizar Dashboard</Button>
        </div>
      </Card>

      <Card>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Centro
            <select value={draftCenter} onChange={(event) => setDraftCenter(event.target.value)} style={fieldControlStyles.select}>
              <option value="">Todos os centros</option>
              {centerOptions.map((center) => <option key={center} value={center}>{center}</option>)}
            </select>
          </label>
          <Button tone="primary" onClick={applyFilter}>Aplicar</Button>
          <Button onClick={clearFilter}>Limpar</Button>
          <div style={{ justifySelf: "end", alignSelf: "center" }}>
            {state === "loading" && <StateMessage state="loading" message="Carregando dashboard..." />}
            {state === "error" && <StateMessage state="error" message="Não foi possível carregar o dashboard." />}
            {state === "idle" && appliedCenter && <Badge text={`Centro: ${appliedCenter}`} tone="info" />}
          </div>
        </div>
      </Card>

      {isInitialLoading ? <CenteredState state="loading" message="Carregando dashboard..." /> : null}
      {state === "error" && !dashboard ? <CenteredState state="error" message="Não foi possível carregar o dashboard." /> : null}
      {state !== "error" && dashboard && isEmpty ? <CenteredState state="empty" message="Nenhum dado disponível para o dashboard." /> : null}

      {dashboard && !isEmpty ? (
        <>
          <KpiGrid kpis={filteredDashboard.kpis} />
          <OpenRequestsSection items={filteredDashboard.openRequests} />
          <AttentionMaterialsSection items={filteredDashboard.attentionMaterials} />
          <div style={styles.rankingsGrid}>
            <StockValueRankingSection items={filteredDashboard.topStockValueItems} />
            <CoverageRankingSection items={filteredDashboard.topCoverageItems} />
          </div>
        </>
      ) : null}
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
        <Card key={card.label}>
          <div style={{ color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs, fontWeight: uiTokens.typography.labelWeight }}>{card.label}</div>
          <div style={styles.kpiValue}>{card.value}</div>
          <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>{card.helper}</div>
        </Card>
      ))}
    </div>
  );
}

function OpenRequestsSection(props: { items: DashboardOpenRequest[] }) {
  return (
    <DashboardSection title="Solicitações abertas" count={props.items.length}>
      <DashboardTable columns="60px 80px 105px minmax(180px,1.5fr) 96px 92px 150px 140px 150px 92px" headers={["ID", "Centro", "Material", "Descrição", "Qtde.", "Estoque", "Parecer", "Status", "Solicitante", "Dias"]} emptyMessage="Nenhuma solicitação aberta no momento.">
        {props.items.map((item) => (
          <TableRow key={item.id ?? `${item.center}-${item.material}-${item.requesterName}`} columns="60px 80px 105px minmax(180px,1.5fr) 96px 92px 150px 140px 150px 92px">
            <Cell>{item.id ?? "-"}</Cell>
            <Cell title={item.center}>{item.center}</Cell>
            <Cell title={item.material}>{item.material}</Cell>
            <Cell title={item.description}>{item.description}</Cell>
            <Cell>{formatNumber(item.requestedQuantity)}</Cell>
            <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
            <Cell title={item.stockRecommendationLabel}>{item.stockRecommendationLabel}</Cell>
            <Cell title={item.requestStatusLabel}>{item.requestStatusLabel}</Cell>
            <Cell title={item.requesterName || item.requesterEmail}>{item.requesterName || item.requesterEmail || "-"}</Cell>
            <Cell>{item.daysOpen == null ? "-" : formatNumber(item.daysOpen)}</Cell>
          </TableRow>
        ))}
      </DashboardTable>
    </DashboardSection>
  );
}

function AttentionMaterialsSection(props: { items: DashboardAttentionMaterial[] }) {
  return (
    <DashboardSection title="Materiais em atenção" count={props.items.length}>
      <DashboardTable columns="80px 110px minmax(190px,1.6fr) 92px 110px 128px 120px 100px minmax(220px,1fr)" headers={["Centro", "Material", "Descrição", "Estoque", "Preço médio", "Valor estoque", "Média anual", "Cobertura", "Sinalização"]} emptyMessage="Nenhum material em atenção no momento.">
        {props.items.map((item) => (
          <TableRow key={`${item.center}-${item.material}`} columns="80px 110px minmax(190px,1.6fr) 92px 110px 128px 120px 100px minmax(220px,1fr)">
            <Cell title={item.center}>{item.center}</Cell>
            <Cell title={item.material}>{item.material}</Cell>
            <Cell title={item.description}>{item.description}</Cell>
            <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
            <Cell>{formatCurrency(item.averagePrice)}</Cell>
            <Cell>{formatCurrency(item.totalStockValueBRL)}</Cell>
            <Cell>{formatNumber(item.averageAnnualConsumption)}</Cell>
            <Cell>{formatCoverage(item.coverageYears)}</Cell>
            <Cell noWrap={false}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: uiTokens.spacing.xs }}>
                <Badge text={severityLabel[item.severity]} tone={severityTone[item.severity]} />
                {item.attentionLabels.map((label) => <Badge key={label} text={label} tone="neutral" />)}
              </div>
            </Cell>
          </TableRow>
        ))}
      </DashboardTable>
    </DashboardSection>
  );
}

function StockValueRankingSection(props: { items: DashboardStockRankingItem[] }) {
  return (
    <DashboardSection title="Top 10 por valor em estoque" count={props.items.length}>
      <DashboardTable columns="78px 110px minmax(180px,1fr) 96px 130px" headers={["Centro", "Material", "Descrição", "Estoque", "Valor estoque"]} emptyMessage="Nenhum material para ranking de valor.">
        {props.items.map((item) => (
          <TableRow key={`${item.center}-${item.material}`} columns="78px 110px minmax(180px,1fr) 96px 130px">
            <Cell title={item.center}>{item.center}</Cell>
            <Cell title={item.material}>{item.material}</Cell>
            <Cell title={item.description}>{item.description}</Cell>
            <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
            <Cell>{formatCurrency(item.totalStockValueBRL)}</Cell>
          </TableRow>
        ))}
      </DashboardTable>
    </DashboardSection>
  );
}

function CoverageRankingSection(props: { items: DashboardStockRankingItem[] }) {
  return (
    <DashboardSection title="Top 10 por cobertura elevada" count={props.items.length}>
      <DashboardTable columns="78px 110px minmax(180px,1fr) 96px 120px 100px" headers={["Centro", "Material", "Descrição", "Estoque", "Média anual", "Cobertura"]} emptyMessage="Nenhum material para ranking de cobertura.">
        {props.items.map((item) => (
          <TableRow key={`${item.center}-${item.material}`} columns="78px 110px minmax(180px,1fr) 96px 120px 100px">
            <Cell title={item.center}>{item.center}</Cell>
            <Cell title={item.material}>{item.material}</Cell>
            <Cell title={item.description}>{item.description}</Cell>
            <Cell>{formatNumber(item.evaluatedStockTotal)}</Cell>
            <Cell>{formatNumber(item.averageAnnualConsumption)}</Cell>
            <Cell>{formatCoverage(item.coverageYears)}</Cell>
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
