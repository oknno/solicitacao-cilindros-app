import { useCallback, useEffect, useMemo, useState } from "react";
import { getMaterialRequestsUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import { MaterialRequestApprovalModal } from "../../components/materialRequest/MaterialRequestApprovalModal";
import { MaterialRequestFormModal } from "../../components/materialRequest/MaterialRequestFormModal";
import { MaterialRequestSummaryPanel } from "../../components/materialRequest/MaterialRequestSummaryPanel";
import { MaterialRequestsTable } from "../../components/materialRequest/MaterialRequestsTable";
import { useToast } from "../../components/notifications/useToast";
import { Card } from "../../components/ui/Card";
import { uiTokens } from "../../components/ui/tokens";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";

const DEFAULT_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Title", sortDir: "asc" };

type ApprovalModalState = {
  request: MaterialRequest;
  initialDecision: "APPROVE" | "REJECT";
  approverRole: ApproverRole;
};

export function MaterialRequestsHomePage() {
  const { notify } = useToast();
  const [items, setItems] = useState<MaterialRequest[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ProjectsFilters>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [approvalModalState, setApprovalModalState] = useState<ApprovalModalState | null>(null);

  const selectedRequest = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMaterialRequestsUseCase();
      setItems(result);
      setSelectedId((current) => (result.some((item) => item.id === current) ? current : (result[0]?.id ?? null)));
    } catch {
      setError("Não foi possível carregar as solicitações de material. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const canDecide =
    selectedRequest?.status === "PENDING_LAMINATION_MANAGER_APPROVAL"
    || selectedRequest?.status === "PENDING_CTO_APPROVAL";

  function getApproverRoleFromStatus(request: MaterialRequest): ApproverRole | null {
    if (request.status === "PENDING_LAMINATION_MANAGER_APPROVAL") return "LAMINATION_MANAGER";
    if (request.status === "PENDING_CTO_APPROVAL") return "CTO";
    return null;
  }

  function openApprovalModal(initialDecision: "APPROVE" | "REJECT") {
    if (!selectedRequest) return;
    if (import.meta.env.DEV) console.debug("[MaterialRequestsHome] Approve/Reject clicked", selectedRequest);

    const approverRole = getApproverRoleFromStatus(selectedRequest);
    if (!approverRole) {
      notify("Esta solicitação não está pendente de aprovação.", "info");
      return;
    }

    setApprovalModalState({ request: selectedRequest, initialDecision, approverRole });
  }

  const indicators = {
    total: items.length,
    pendingLam: items.filter((i) => i.status === "PENDING_LAMINATION_MANAGER_APPROVAL").length,
    pendingCto: items.filter((i) => i.status === "PENDING_CTO_APPROVAL").length,
    approved: items.filter((i) => i.status === "APPROVED").length,
    exceptions: items.filter((i) => i.stockRecommendation === "PURCHASE_NOT_RECOMMENDED" || i.stockRecommendation === "MANUAL_REVIEW_REQUIRED").length,
  };

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
      canApprove={Boolean(canDecide)}
      canReject={Boolean(canDecide)}
      approveDisabledReason="Selecione uma solicitação pendente de aprovação."
      rejectDisabledReason="Selecione uma solicitação pendente de aprovação."
      filters={filters}
      onChangeFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      onApply={() => undefined}
      onClear={() => setFilters(DEFAULT_FILTERS)}
      onRefresh={() => void loadRequests()}
      onNew={() => setFormOpen(true)}
      canCreate
      onView={() => undefined}
      onEdit={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      onSendToApproval={() => undefined}
      onBackStatus={() => undefined}
      onApprove={() => openApprovalModal("APPROVE")}
      onReject={() => openApprovalModal("REJECT")}
      showApprovalActions
      onExportTable={() => undefined}
      onExportProject={() => undefined}
      availableUnits={[]}
    />
    <div style={{ display: "grid", gap: uiTokens.spacing.sm, gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>{[["Total", indicators.total], ["Pendentes Gerente", indicators.pendingLam], ["Pendentes CTO", indicators.pendingCto], ["Aprovadas", indicators.approved], ["Exceções", indicators.exceptions]].map(([label, value]) => <Card key={String(label)}><div>{label}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div></Card>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(360px,1fr)", gap: uiTokens.spacing.md, minHeight: 0 }}><Card style={{ minHeight: 0, overflow: "hidden" }}>{loading ? <p>Carregando solicitações...</p> : error ? <p>{error}</p> : <MaterialRequestsTable items={items} selectedId={selectedId} onSelect={(item) => setSelectedId(item.id ?? null)} />}</Card><Card style={{ overflow: "auto" }}><MaterialRequestSummaryPanel selected={selectedRequest} /></Card></div>

    {formOpen && <MaterialRequestFormModal onClose={() => setFormOpen(false)} onCreated={() => { setFormOpen(false); void loadRequests(); }} />}

    {approvalModalState && <MaterialRequestApprovalModal request={approvalModalState.request} initialDecision={approvalModalState.initialDecision} approverRole={approvalModalState.approverRole} onClose={() => setApprovalModalState(null)} onDecided={() => { setApprovalModalState(null); void loadRequests(); }} />}
  </div>;
}
