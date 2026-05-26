import { useCallback, useEffect, useMemo, useState } from "react";
import { getMaterialRequestsUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import { MaterialRequestApprovalModal } from "../../components/materialRequest/MaterialRequestApprovalModal";
import { MaterialRequestFormModal } from "../../components/materialRequest/MaterialRequestFormModal";
import { MaterialRequestSummaryPanel } from "../../components/materialRequest/MaterialRequestSummaryPanel";
import { SubmitMaterialRequestModal } from "../../components/materialRequest/SubmitMaterialRequestModal";
import { StockImportModal } from "../../components/materialRequest/StockImportModal";
import { MaterialRequestsTable } from "../../components/materialRequest/MaterialRequestsTable";
import { MaterialRequestFilterModal } from "../../components/materialRequest/MaterialRequestFilterModal";
import { applyMaterialRequestFilters, hasActiveMaterialRequestFilters, type MaterialRequestFilters } from "../../components/materialRequest/materialRequestFilters";
import { useToast } from "../../components/notifications/useToast";
import { uiTokens } from "../../components/ui/tokens";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";
import {
  getMaterialRequestCommandPermissions,
  type MaterialRequestUserProfile,
} from "../../../domain/permissions";

const DEFAULT_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Title", sortDir: "asc" };
const DEFAULT_MATERIAL_FILTERS: MaterialRequestFilters = { center: "", material: "", requester: "", status: "", sort: undefined };

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
  const [materialFilters, setMaterialFilters] = useState<MaterialRequestFilters>(DEFAULT_MATERIAL_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [approvalModalState, setApprovalModalState] = useState<ApprovalModalState | null>(null);
  const [stockImportOpen, setStockImportOpen] = useState(false);
  const [submitModalRequest, setSubmitModalRequest] = useState<MaterialRequest | null>(null);

  const selectedRequest = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const profile = (import.meta.env.VITE_MATERIAL_REQUEST_PROFILE as MaterialRequestUserProfile | undefined) ?? "ADMIN";
  const commandPermissions = useMemo(() => getMaterialRequestCommandPermissions({
    profile,
    hasSelection: Boolean(selectedRequest),
    selectedStatus: selectedRequest?.status,
  }), [profile, selectedRequest]);
  const filteredItems = useMemo(() => applyMaterialRequestFilters(items, materialFilters), [items, materialFilters]);
  const hasActiveFilters = useMemo(() => hasActiveMaterialRequestFilters(materialFilters), [materialFilters]);
  const centerOptions = useMemo(() => Array.from(new Set(items.map((item) => item.center).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [items]);

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

  return <div style={{ background: uiTokens.colors.appBackground, height: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto 1fr", gap: uiTokens.spacing.md }}>
    <CommandBar
      title={`Cilindros e Discos${hasActiveFilters ? " · Filtro ativo" : ""}`}
      isAdmin={profile === "ADMIN"}
      selectedId={selectedId}
      totalLoaded={items.length}
      canEdit={commandPermissions.canEdit}
      canDelete={commandPermissions.canDelete}
      canSend={commandPermissions.canSubmit}
      canBack={commandPermissions.canReturnStatus}
      canApprove={commandPermissions.canApprove}
      canReject={commandPermissions.canReject}
      approveDisabledReason="Selecione uma solicitação pendente de aprovação."
      rejectDisabledReason="Selecione uma solicitação pendente de aprovação."
      filters={filters}
      onChangeFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      onApply={() => setFilterModalOpen(true)}
      onClear={() => setMaterialFilters(DEFAULT_MATERIAL_FILTERS)}
      onRefresh={() => void loadRequests()}
      onNew={() => setFormOpen(true)}
      onUpdateStock={() => setStockImportOpen(true)}
      canCreate={commandPermissions.canNew}
      onView={() => undefined}
      onEdit={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
      onSendToApproval={() => { if (selectedRequest) setSubmitModalRequest(selectedRequest); }}
      onBackStatus={() => undefined}
      onApprove={() => openApprovalModal("APPROVE")}
      onReject={() => openApprovalModal("REJECT")}
      showApprovalActions={commandPermissions.canShowApprove || commandPermissions.canShowReject}
      showNewButton={commandPermissions.canShowNew}
      showEditButton={commandPermissions.canShowEdit}
      showDuplicateButton={false}
      showDeleteButton={commandPermissions.canShowDelete}
      showSubmitButton={commandPermissions.canShowSubmit}
      showBackButton={commandPermissions.canShowReturnStatus}
      showApproveButton={commandPermissions.canShowApprove}
      showRejectButton={commandPermissions.canShowReject}
      showFilterButton={commandPermissions.canShowFilter}
      showExportButton={commandPermissions.canShowExport}
      onExportTable={() => undefined}
      onExportProject={() => undefined}
      availableUnits={[]}
    />
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,2fr) minmax(340px,1fr)",
      gap: uiTokens.spacing.md,
      minHeight: 0,
    }}
    >
      {loading ? <p>Carregando solicitações...</p> : error ? <p>{error}</p> : <MaterialRequestsTable items={filteredItems} selectedId={selectedId} onSelect={(item) => setSelectedId(item.id ?? null)} totalLoaded={items.length} hasActiveFilters={hasActiveFilters} emptyMessage={hasActiveFilters ? "Nenhuma solicitação encontrada para os filtros aplicados." : undefined} />}
      <MaterialRequestSummaryPanel selected={selectedRequest} />
    </div>

    {formOpen && <MaterialRequestFormModal onClose={() => setFormOpen(false)} onCreated={() => { setFormOpen(false); void loadRequests(); }} />}

    {approvalModalState && <MaterialRequestApprovalModal request={approvalModalState.request} initialDecision={approvalModalState.initialDecision} approverRole={approvalModalState.approverRole} onClose={() => setApprovalModalState(null)} onDecided={() => { setApprovalModalState(null); void loadRequests(); }} />}

    {stockImportOpen && <StockImportModal onClose={() => setStockImportOpen(false)} onSuccess={() => { setStockImportOpen(false); void loadRequests(); }} />}

    {submitModalRequest && <SubmitMaterialRequestModal request={submitModalRequest} onClose={() => setSubmitModalRequest(null)} onSubmitted={() => { setSubmitModalRequest(null); void loadRequests(); }} />}

    {filterModalOpen && <MaterialRequestFilterModal
      value={materialFilters}
      centers={centerOptions}
      onChange={(patch) => setMaterialFilters((current) => ({ ...current, ...patch }))}
      onApply={() => setFilterModalOpen(false)}
      onClear={() => setMaterialFilters(DEFAULT_MATERIAL_FILTERS)}
      onClose={() => setFilterModalOpen(false)}
    />}
  </div>;
}
