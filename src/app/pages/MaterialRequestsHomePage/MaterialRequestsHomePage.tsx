import { useCallback, useEffect, useMemo, useState } from "react";
import { exportMaterialRequestsUseCase, getMaterialRequestsUseCase, submitMaterialRequestForApprovalUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { normalizeCenter } from "../../../domain/materialRequest/normalizeCenter";
import type { ApproverRole } from "../../../domain/materialRequest/status";
import { assertCanDecideMaterialRequest, canAccessMaterialRequest, getAccessProfileLabel, type UserAccessProfile } from "../../../domain/accessControl";
import { MaterialRequestApprovalModal } from "../../components/materialRequest/MaterialRequestApprovalModal";
import { MaterialRequestFormModal } from "../../components/materialRequest/MaterialRequestFormModal";
import { MaterialRequestSummaryPanel } from "../../components/materialRequest/MaterialRequestSummaryPanel";
import { StockImportModal } from "../../components/materialRequest/StockImportModal";
import { MaterialRequestsTable } from "../../components/materialRequest/MaterialRequestsTable";
import { MaterialRequestFilterModal } from "../../components/materialRequest/MaterialRequestFilterModal";
import { ReturnMaterialRequestStatusModal } from "../../components/materialRequest/ReturnMaterialRequestStatusModal";
import { MaterialRequestViewModal } from "../../components/materialRequest/MaterialRequestViewModal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { applyMaterialRequestFilters, hasActiveMaterialRequestFilters, type MaterialRequestFilters } from "../../components/materialRequest/materialRequestFilters";
import { useToast } from "../../components/notifications/useToast";
import { uiTokens } from "../../components/ui/tokens";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";
import { projectsPageStyles as sharedPageStyles } from "../ProjectsPage/components/ProjectsPage.styles";
import {
  getMaterialRequestCommandPermissions,
} from "../../../domain/permissions";
import { deleteMaterialRequestUseCase } from "../../../application/materialRequest/deleteMaterialRequestUseCase";

const DEFAULT_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Title", sortDir: "asc" };
const DEFAULT_MATERIAL_FILTERS: MaterialRequestFilters = { center: "", material: "", requester: "", status: "", sort: undefined };
const MATERIAL_FILTER_BUTTON_ID = "material-requests-filter-button";

type ApprovalModalState = {
  request: MaterialRequest;
  decision: "APPROVE" | "REJECT";
  approverRole: ApproverRole;
};

export function MaterialRequestsHomePage(props: { accessProfile: UserAccessProfile; onOpenDashboard: () => void }) {
  const { notify } = useToast();
  const [items, setItems] = useState<MaterialRequest[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<ProjectsFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<MaterialRequestFilters>(DEFAULT_MATERIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<MaterialRequestFilters>(DEFAULT_MATERIAL_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create"|"edit"|null>(null);
  const [viewRequest, setViewRequest] = useState<MaterialRequest | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => Promise<void> | void; tone?: "danger" | "neutral"; confirmingText?: string; confirmText?: string } | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [returnStatusRequest, setReturnStatusRequest] = useState<MaterialRequest | null>(null);
  const [approvalModalState, setApprovalModalState] = useState<ApprovalModalState | null>(null);
  const [stockImportOpen, setStockImportOpen] = useState(false);

  const selectedRequest = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const { accessProfile } = props;
  const commandPermissions = useMemo(() => getMaterialRequestCommandPermissions({
    accessProfile,
    hasSelection: Boolean(selectedRequest),
    selectedStatus: selectedRequest?.status,
    selectedRequesterEmail: selectedRequest?.requesterEmail,
    selectedCenter: selectedRequest?.center,
  }), [accessProfile, selectedRequest]);
  const filteredItems = useMemo(() => applyMaterialRequestFilters(items, appliedFilters), [items, appliedFilters]);
  const hasActiveFilters = useMemo(() => hasActiveMaterialRequestFilters(appliedFilters), [appliedFilters]);
  const centerOptions = useMemo(() => Array.from(new Set(items.map((item) => normalizeCenter(item.center)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" })), [items]);
  const isInitialLoading = state === "loading" && items.length === 0;

  const loadRequests = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const result = await getMaterialRequestsUseCase(accessProfile);
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
  }, [accessProfile, items.length]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);


  const handleExportRequests = useCallback(() => {
    if (!accessProfile.permissions.canExport) { notify("Você não possui permissão para exportar solicitações.", "info"); return; }
    if (!filteredItems.length) {
      notify("Não há solicitações para exportar.", "info");
      return;
    }

    exportMaterialRequestsUseCase(filteredItems);
    notify(`Exportação gerada com ${filteredItems.length} solicitações.`, "success");
  }, [accessProfile.permissions.canExport, filteredItems, notify]);

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

    try { assertCanDecideMaterialRequest(accessProfile, selectedRequest, approverRole); }
    catch (error) { notify(error instanceof Error ? error.message : "Você não possui permissão para esta ação.", "info"); return; }

    setApprovalModalState({ request: selectedRequest, decision: initialDecision, approverRole });
  }

  function requestConfirm(config: { title: string; message: string; onConfirm: () => Promise<void> | void; tone?: "danger" | "neutral"; confirmingText?: string; confirmText?: string }) {
    setConfirmState(config);
  }

  async function onSendToApproval() {
    if (!selectedRequest) {
      notify("Selecione uma solicitação.", "info");
      return;
    }

    if (!commandPermissions.canSubmit) {
      notify("A solicitação não pode ser enviada para aprovação neste status.", "info");
      return;
    }

    requestConfirm({
      title: "Enviar solicitação para aprovação",
      message: `Enviar a solicitação #${selectedRequest.id} para aprovação?`,
      confirmingText: "Enviando...",
      onConfirm: async () => {
        try {
          await submitMaterialRequestForApprovalUseCase({
            requestId: selectedRequest.id ?? 0,
            performedByName: "Usuário atual",
            performedByEmail: accessProfile.userEmail,
            accessProfile,
          });
          await loadRequests();
          notify("Solicitação enviada para aprovação do Gerente da Laminação.", "success");
        } catch (error) {
          console.error(error);
          notify("Não foi possível enviar a solicitação para aprovação.", "error");
        }
      }
    });
  }

  async function onDelete() {
    if (!selectedRequest) {
      notify("Selecione uma solicitação.", "info");
      return;
    }

    if (!commandPermissions.canDelete) {
      notify("Somente solicitações em rascunho podem ser excluídas.", "info");
      return;
    }

    requestConfirm({
      title: "Excluir solicitação",
      message: "Deseja excluir esta solicitação? Esta ação não poderá ser desfeita.",
      tone: "danger",
      confirmingText: "Excluindo...",
      confirmText: "Excluir",
      onConfirm: async () => {
        try {
          await deleteMaterialRequestUseCase({ requestId: selectedRequest.id ?? 0, performedByName: "Usuário atual" });
          setSelectedId(null);
          await loadRequests();
          notify("Solicitação excluída com sucesso.", "success");
        } catch (error) {
          console.error(error);
          notify("Não foi possível excluir a solicitação.", "error");
        }
      }
    });
  }

  function openFilters() {
    setDraftFilters(appliedFilters);
    setFilterModalOpen(true);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setFilterModalOpen(false);
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_MATERIAL_FILTERS);
    setAppliedFilters(DEFAULT_MATERIAL_FILTERS);
    setFilterModalOpen(false);
  }

  function closeFilters() {
    setDraftFilters(appliedFilters);
    setFilterModalOpen(false);
  }

  return <div style={{ background: uiTokens.colors.appBackground, height: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto 1fr", gap: uiTokens.spacing.md }}>
    <CommandBar
      title="Cilindros e Discos"
      isAdmin={accessProfile.roles.includes("ADMIN")}
      profileLabel={getAccessProfileLabel(accessProfile)}
      selectedId={selectedId}
      totalLoaded={items.length}
      canEdit={commandPermissions.canEdit}
      canDelete={commandPermissions.canDelete}
      deleteDisabledReason={selectedRequest ? "Somente solicitações em rascunho podem ser excluídas." : "Selecione uma solicitação."}
      canSend={commandPermissions.canSubmit}
      canBack={commandPermissions.canReturnStatus}
      backDisabledReason={selectedRequest?.status === "PENDING_CTO_APPROVAL" ? "Não é possível voltar para rascunho uma solicitação que já foi enviada ao CTO." : "Somente solicitações pendentes do Gerente da Laminação podem voltar para rascunho."}
      canApprove={commandPermissions.canApprove}
      canReject={commandPermissions.canReject}
      approveDisabledReason="Selecione uma solicitação pendente de aprovação."
      rejectDisabledReason="Selecione uma solicitação pendente de aprovação."
      filters={filters}
      onChangeFilters={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      onApply={openFilters}
      onClear={clearFilters}
      filterButtonMode="triggerOnly"
      filterButtonId={MATERIAL_FILTER_BUTTON_ID}
      onRefresh={() => void loadRequests()}
      onNew={() => { if (accessProfile.permissions.canCreateRequest) setFormMode("create"); }}
      onUpdateStock={accessProfile.permissions.canUploadStock ? () => setStockImportOpen(true) : undefined}
      canCreate={commandPermissions.canNew}
      onView={() => {
        if (!selectedRequest) return;
        if (!canAccessMaterialRequest(accessProfile, selectedRequest)) {
          notify("Você não possui permissão para visualizar esta solicitação.", "info");
          return;
        }
        setViewRequest(selectedRequest);
      }}
      onEdit={() => { if (selectedRequest && commandPermissions.canEdit) setFormMode("edit"); }}
      onDuplicate={() => undefined}
      onDelete={() => { void onDelete(); }}
      onSendToApproval={() => { void onSendToApproval(); }}
      onBackStatus={() => { if (selectedRequest && commandPermissions.canReturnStatus) setReturnStatusRequest(selectedRequest); }}
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
      availableUnits={[]}
      navigationAction={{
        label: "Abrir Dashboard",
        icon: <DashboardIcon />,
        onClick: props.onOpenDashboard,
      }}
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

    {formMode && <MaterialRequestFormModal accessProfile={accessProfile} mode={formMode} request={formMode === "edit" ? selectedRequest : null} onClose={() => setFormMode(null)} onSuccess={() => { setFormMode(null); void loadRequests(); }} />}

    {approvalModalState && <MaterialRequestApprovalModal accessProfile={accessProfile} request={approvalModalState.request} decision={approvalModalState.decision} approverRole={approvalModalState.approverRole} onClose={() => setApprovalModalState(null)} onCompleted={() => { setApprovalModalState(null); void loadRequests(); }} />}

    {stockImportOpen && <StockImportModal accessProfile={accessProfile} onClose={() => setStockImportOpen(false)} onSuccess={() => { setStockImportOpen(false); void loadRequests(); }} />}


    {viewRequest && <MaterialRequestViewModal accessProfile={accessProfile} request={viewRequest} onClose={() => setViewRequest(null)} />}

    <ConfirmDialog
      open={Boolean(confirmState)}
      title={confirmState?.title ?? ""}
      message={confirmState?.message ?? ""}
      tone={confirmState?.tone}
      confirmText={confirmState?.confirmText}
      confirmingText={confirmState?.confirmingText}
      confirming={confirmingAction}
      onConfirm={() => {
        if (!confirmState || confirmingAction) return;

        void (async () => {
          setConfirmingAction(true);
          try {
            await confirmState.onConfirm();
            setConfirmState(null);
          } finally {
            setConfirmingAction(false);
          }
        })();
      }}
      onClose={() => {
        if (confirmingAction) return;
        setConfirmState(null);
      }}
    />

    {returnStatusRequest && <ReturnMaterialRequestStatusModal accessProfile={accessProfile} request={returnStatusRequest} onClose={() => setReturnStatusRequest(null)} onReturned={() => { setReturnStatusRequest(null); void loadRequests(); }} />}

    {filterModalOpen && <MaterialRequestFilterModal
      value={draftFilters}
      centers={centerOptions}
      anchorId={MATERIAL_FILTER_BUTTON_ID}
      onChange={(patch) => setDraftFilters((current) => ({ ...current, ...patch }))}
      onApply={applyFilters}
      onClear={clearFilters}
      onClose={closeFilters}
    />}
  </div>;
}


function DashboardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: "block", stroke: "currentColor", strokeWidth: 1.75, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </svg>
  );
}
