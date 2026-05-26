import { useCallback, useEffect, useMemo, useState } from "react";
import { exportMaterialRequestsUseCase, getMaterialRequestsUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import { MaterialRequestApprovalModal } from "../../components/materialRequest/MaterialRequestApprovalModal";
import { MaterialRequestFormModal } from "../../components/materialRequest/MaterialRequestFormModal";
import { MaterialRequestSummaryPanel } from "../../components/materialRequest/MaterialRequestSummaryPanel";
import { SubmitMaterialRequestModal } from "../../components/materialRequest/SubmitMaterialRequestModal";
import { StockImportModal } from "../../components/materialRequest/StockImportModal";
import { MaterialRequestsTable } from "../../components/materialRequest/MaterialRequestsTable";
import { MaterialRequestFilterModal } from "../../components/materialRequest/MaterialRequestFilterModal";
import { ReturnMaterialRequestStatusModal } from "../../components/materialRequest/ReturnMaterialRequestStatusModal";
import { DeleteMaterialRequestModal } from "../../components/materialRequest/DeleteMaterialRequestModal";
import { MaterialRequestViewModal } from "../../components/materialRequest/MaterialRequestViewModal";
import { applyMaterialRequestFilters, hasActiveMaterialRequestFilters, type MaterialRequestFilters } from "../../components/materialRequest/materialRequestFilters";
import { useToast } from "../../components/notifications/useToast";
import { uiTokens } from "../../components/ui/tokens";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";
import { projectsPageStyles as sharedPageStyles } from "../ProjectsPage/components/ProjectsPage.styles";
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
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ProjectsFilters>(DEFAULT_FILTERS);
  const [materialFilters, setMaterialFilters] = useState<MaterialRequestFilters>(DEFAULT_MATERIAL_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create"|"edit"|null>(null);
  const [viewRequest, setViewRequest] = useState<MaterialRequest | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<MaterialRequest | null>(null);
  const [returnStatusRequest, setReturnStatusRequest] = useState<MaterialRequest | null>(null);
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
  const isInitialLoading = state === "loading" && items.length === 0;

  const loadRequests = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const result = await getMaterialRequestsUseCase();
      setItems(result);
      setSelectedId((current) => (result.some((item) => item.id === current) ? current : (result[0]?.id ?? null)));
      setState("idle");
    } catch (caughtError) {
      console.error(caughtError);
      setState("error");
      setError(
        items.length > 0
          ? "Não foi possível atualizar a lista. Os dados anteriores foram mantidos."
          : "Não foi possível carregar as solicitações de material. Tente novamente."
      );
    }
  }, [items.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRequests();
  }, [loadRequests]);


  const handleExportRequests = useCallback(() => {
    if (!filteredItems.length) {
      notify("Não há solicitações para exportar.", "info");
      return;
    }

    exportMaterialRequestsUseCase(filteredItems);
    notify(`Exportação gerada com ${filteredItems.length} solicitações.`, "success");
  }, [filteredItems, notify]);

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
      onNew={() => setFormMode("create")}
      onUpdateStock={() => setStockImportOpen(true)}
      canCreate={commandPermissions.canNew}
      onView={() => { if (selectedRequest) setViewRequest(selectedRequest); }}
      onEdit={() => { if (selectedRequest) setFormMode("edit"); }}
      onDuplicate={() => undefined}
      onDelete={() => { if (selectedRequest) setDeleteRequest(selectedRequest); }}
      onSendToApproval={() => { if (selectedRequest) setSubmitModalRequest(selectedRequest); }}
      onBackStatus={() => { if (selectedRequest) setReturnStatusRequest(selectedRequest); }}
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
      onExportTable={handleExportRequests}
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
      <Card style={sharedPageStyles.listCard}>
        {isInitialLoading ? <p>Carregando solicitações...</p> : <>
          {error ? <p>{error}</p> : null}
          <MaterialRequestsTable items={filteredItems} selectedId={selectedId} onSelect={(item) => setSelectedId(item.id ?? null)} emptyMessage={hasActiveFilters ? "Nenhuma solicitação encontrada para os filtros aplicados." : undefined} />
        </>}
        <div style={sharedPageStyles.footerRow}>
          <div style={sharedPageStyles.helperText}>Itens carregados: <b>{filteredItems.length}</b></div>
          <Button disabled>{state === "loading" ? "Carregando..." : "Fim"}</Button>
        </div>
      </Card>
      <Card style={{ overflow: "hidden", minHeight: 0, padding: uiTokens.spacing.md, display: "flex", flexDirection: "column" }}>
        <MaterialRequestSummaryPanel selected={selectedRequest} />
      </Card>
    </div>

    {formMode && <MaterialRequestFormModal mode={formMode} request={formMode === "edit" ? selectedRequest : null} onClose={() => setFormMode(null)} onSuccess={() => { setFormMode(null); void loadRequests(); }} />}

    {approvalModalState && <MaterialRequestApprovalModal request={approvalModalState.request} initialDecision={approvalModalState.initialDecision} approverRole={approvalModalState.approverRole} onClose={() => setApprovalModalState(null)} onDecided={() => { setApprovalModalState(null); void loadRequests(); }} />}

    {stockImportOpen && <StockImportModal onClose={() => setStockImportOpen(false)} onSuccess={() => { setStockImportOpen(false); void loadRequests(); }} />}

    {submitModalRequest && <SubmitMaterialRequestModal request={submitModalRequest} onClose={() => setSubmitModalRequest(null)} onSubmitted={() => { setSubmitModalRequest(null); void loadRequests(); }} />}

    {viewRequest && <MaterialRequestViewModal request={viewRequest} onClose={() => setViewRequest(null)} />}

    {deleteRequest && <DeleteMaterialRequestModal request={deleteRequest} onClose={() => setDeleteRequest(null)} onDeleted={() => { setDeleteRequest(null); void loadRequests(); }} />}

    {returnStatusRequest && <ReturnMaterialRequestStatusModal request={returnStatusRequest} onClose={() => setReturnStatusRequest(null)} onReturned={() => { setReturnStatusRequest(null); void loadRequests(); }} />}

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
