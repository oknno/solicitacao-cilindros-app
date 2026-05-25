import { useCallback, useEffect, useMemo, useState } from "react";
import { getMaterialRequestsUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { Card } from "../../components/ui/Card";
import { uiTokens } from "../../components/ui/tokens";
import { MaterialRequestsTable } from "../../components/materialRequest/MaterialRequestsTable";
import { MaterialRequestSummaryPanel } from "../../components/materialRequest/MaterialRequestSummaryPanel";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";
import type { CtoDecision } from "../../../domain/materialRequest";

type AppView = "home" | "newRequest" | "ctoApproval";

const DEFAULT_FILTERS: ProjectsFilters = {
  searchTitle: "",
  status: "",
  unit: "",
  requesterName: "",
  sortBy: "Title",
  sortDir: "asc"
};

export function MaterialRequestsHomePage({ onChangeView, onCtoDecisionRequest }: { onChangeView: (view: AppView) => void; onCtoDecisionRequest: (request: MaterialRequest, initialDecision: CtoDecision) => void }) {
  const [items, setItems] = useState<MaterialRequest[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ProjectsFilters>(DEFAULT_FILTERS);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMaterialRequestsUseCase();
      setItems(result);
      setSelectedId((current) => (result.some((item) => item.id === current) ? current : result[0]?.id ?? null));
    } catch (e) {
      console.error(e);
      setError("Não foi possível carregar as solicitações de material. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const indicators = {
    total: items.length,
    pendingCto: items.filter((item) => item.status === "PENDING_CTO_APPROVAL").length,
    approvedCto: items.filter((item) => item.status === "APPROVED_BY_CTO").length,
    purchaseNotRecommended: items.filter((item) => item.stockRecommendation === "PURCHASE_NOT_RECOMMENDED").length,
    manualReview: items.filter((item) => item.stockRecommendation === "MANUAL_REVIEW_REQUIRED").length
  };

  const canApproveOrReject = selected?.status === "PENDING_CTO_APPROVAL";

  return <div style={{ background: uiTokens.colors.appBackground, height: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto auto 1fr", gap: uiTokens.spacing.md }}>
    <CommandBar
      title="Solicitação de Material Cilindros"
      isAdmin
      selectedId={selectedId}
      totalLoaded={items.length}
      canEdit={false}
      canDelete={false}
      canSend={false}
      canBack={false}
      canApprove={canApproveOrReject}
      canReject={canApproveOrReject}
      editDisabledReason="Funcionalidade não disponível nesta etapa."
      deleteDisabledReason="Funcionalidade não disponível nesta etapa."
      sendDisabledReason="Funcionalidade não disponível nesta etapa."
      backDisabledReason="Funcionalidade não disponível nesta etapa."
      approveDisabledReason="Selecione uma solicitação pendente de aprovação CTO."
      rejectDisabledReason="Selecione uma solicitação pendente de aprovação CTO."
      filters={filters}
      onChangeFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      onApply={() => undefined}
      onClear={() => setFilters(DEFAULT_FILTERS)}
      onRefresh={() => void load()}
      onNew={() => onChangeView("newRequest")}
      canCreate
      onView={() => undefined}
      onEdit={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      onSendToApproval={() => undefined}
      onBackStatus={() => undefined}
      onApprove={() => selected && onCtoDecisionRequest(selected, "APPROVE")}
      onReject={() => selected && onCtoDecisionRequest(selected, "REJECT")}
      showApprovalActions
      onExportTable={() => undefined}
      onExportProject={() => undefined}
      availableUnits={[]}
    />

    <div style={{ display: "grid", gap: uiTokens.spacing.sm, gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
      {[["Total de solicitações", indicators.total],["Pendentes CTO", indicators.pendingCto],["Aprovadas CTO", indicators.approvedCto],["Compra não recomendada", indicators.purchaseNotRecommended],["Requer análise manual", indicators.manualReview]].map(([label, value]) => (
        <Card key={String(label)}><div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>{label}</div><div style={{ fontSize: uiTokens.typography.xl, fontWeight: 700 }}>{value}</div></Card>
      ))}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(360px,1fr)", gap: uiTokens.spacing.md, minHeight: 0 }}>
      <Card style={{ minHeight: 0, overflow: "hidden" }}>
        {loading ? <p>Carregando solicitações...</p> : error ? <p>{error}</p> : items.length === 0 ? <p>Nenhuma solicitação encontrada.</p> : <MaterialRequestsTable items={items} selectedId={selectedId} onSelect={(item) => setSelectedId(item.id ?? null)} />}
      </Card>
      <Card style={{ overflow: "auto" }}>
        <MaterialRequestSummaryPanel selected={selected} />
      </Card>
    </div>
  </div>;
}
