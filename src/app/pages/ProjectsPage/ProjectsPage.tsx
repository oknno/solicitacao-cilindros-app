import { useEffect, useState } from "react";

// TODO(material-request): legado do sistema de cadastro, manter até substituição funcional da tela principal.

import { getProjectById } from "../../../services/sharepoint/projectsApi";
import type { ProjectDraft, ProjectRow } from "../../../services/sharepoint/projectsApi";
import { getMilestonesByProject } from "../../../services/sharepoint/milestonesApi";
import { getActivitiesBatchByProject } from "../../../services/sharepoint/activitiesApi";
import { getPepsBatchByProject } from "../../../services/sharepoint/pepsApi";
import { createProject } from "../../../application/use-cases/createProject";
import { editProject } from "../../../application/use-cases/editProject";
import { sendProjectToApproval } from "../../../application/use-cases/sendToApproval";
import { moveProjectBackToDraft } from "../../../application/use-cases/backToDraft";
import { deleteDraftProjectAndRelated } from "../../../application/use-cases/deleteProject";
import { approveSelectedProject } from "../../../application/use-cases/approveProject";
import { rejectSelectedProject } from "../../../application/use-cases/rejectProject";
import { normalizeError } from "../../../application/errors/appError";
import { canApprove, canBack, canDelete, canEdit, canReject, canSend, getCommandBarPolicies } from "../../../application/policies/projectActionPolicies";

import { ProjectWizardModal } from "./ProjectWizardModal";
import { Card } from "../../components/ui/Card";
import { CommandBar } from "./CommandBar";

import { useProjectsList } from "./hooks/useProjectsList";
import { ProjectsTableSection } from "./components/ProjectsTableSection";
import { ProjectSummarySection } from "./components/ProjectSummarySection";
import { projectsPageStyles as styles } from "./components/ProjectsPage.styles";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { InputDialog } from "../../components/InputDialog";
import { useToast } from "../../components/notifications/useToast";
import { Button } from "../../components/ui/Button";
import { exportProjectsCsv } from "./utils/exportProjectsCsv";
import { exportProjectView } from "./utils/exportProjectView";
import { BootstrapLoader } from "../../components/BootstrapLoader";

export function ProjectsPage(props: {
  onWantsRefreshHeader?: () => void;
  onRegisterRefresh?: (fn: () => void) => void;
  initialItems?: ProjectRow[];
  initialNextLink?: string;
  allowedUnits: string[];
  isAdmin: boolean;
  hasAccess: boolean;
  skipInitialLoad?: boolean;
}) {
  const { onRegisterRefresh, skipInitialLoad, allowedUnits, isAdmin, hasAccess } = props;
  const list = useProjectsList(
    { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Id", sortDir: "desc" },
    {
      initialItems: props.initialItems,
      initialNextLink: props.initialNextLink,
      initialState: "idle",
      allowedUnits,
      isAdmin
    }
  );
  const loadFirstPage = list.loadFirstPage;
  const { notify } = useToast();
  const [wizard, setWizard] = useState<{ mode: "create" | "edit" | "view" | "duplicate"; initial?: ProjectRow } | null>(null);
  const [selectedFull, setSelectedFull] = useState<ProjectRow | null>(null);
  const [selectedFullState, setSelectedFullState] = useState<"idle" | "loading" | "error">("idle");
  const [confirmState, setConfirmState] = useState<{ title: string; message: string; onConfirm: () => Promise<void> | void; tone?: "danger" | "neutral"; confirmingText?: string } | null>(null);
  const [approvalCodeModal, setApprovalCodeModal] = useState<{ projectId: number; initialCode: string } | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const selectedForPolicies = selectedFull ?? list.selected;

  function hasUnitPermission(project: ProjectRow | null): boolean {
    if (!project) return false;
    if (isAdmin) return true;
    const projectUnit = (project.unit ?? "").trim();
    if (!projectUnit) return false;
    return allowedUnits.includes(projectUnit);
  }


  useEffect(() => {
    if (!skipInitialLoad) {
      void loadFirstPage();
    }
    onRegisterRefresh?.(loadFirstPage);
  }, [loadFirstPage, onRegisterRefresh, skipInitialLoad]);

  // Este efeito sincroniza seleção da lista com carregamento de detalhes remotos (SharePoint).
  useEffect(() => {
    if (!list.selectedId) {
      setSelectedFull(null);
      setSelectedFullState("idle");
      return;
    }

    const selectedId = list.selectedId;
    (async () => {
      setSelectedFullState("loading");
      try {
        setSelectedFull(await getProjectById(selectedId));
        setSelectedFullState("idle");
      } catch (e) {
        console.error(e);
        setSelectedFull(null);
        setSelectedFullState("error");
      }
    })();
  }, [list.selectedId]);

  async function onCreate(draft: ProjectDraft): Promise<number> {
    if (!hasAccess) {
      notify("Você não possui permissão para criar projetos.", "error");
      throw new Error("Sem permissão para criar projetos.");
    }
    try {
      const id = await createProject(draft);
      await list.loadFirstPage();
      list.setSelectedId(id);
      notify("Projeto criado com sucesso.", "success");
      return id;
    } catch (e) {
      const appError = normalizeError(e, "Não foi possível criar o projeto. Tente novamente.");
      notify(appError.userMessage, "error");
      throw e;
    }
  }

  async function onEdit(draft: ProjectDraft): Promise<number> {
    if (!list.selected) throw new Error("Selecione um projeto.");
    if (!hasUnitPermission(list.selected)) {
      notify("Você não possui permissão para editar este projeto na unidade selecionada.", "error");
      throw new Error("Sem permissão para editar projeto nesta unidade.");
    }
    try {
      await editProject(list.selected.Id, draft);
      await list.loadFirstPage();
      list.setSelectedId(list.selected.Id);
      notify("Alterações salvas.", "success");
      return list.selected.Id;
    } catch (e) {
      const appError = normalizeError(e, "Não foi possível salvar as alterações. Tente novamente.");
      notify(appError.userMessage, "error");
      throw e;
    }
  }

  function onRequestCreate() {
    if (!hasAccess) {
      notify("Você não possui permissão para criar projetos.", "error");
      return;
    }
    setWizard({ mode: "create" });
  }

  function requestConfirm(config: { title: string; message: string; onConfirm: () => Promise<void> | void; tone?: "danger" | "neutral"; confirmingText?: string }) {
    setConfirmState(config);
  }

  async function refreshSelectedDetails(projectId: number) {
    setSelectedFullState("loading");
    try {
      setSelectedFull(await getProjectById(projectId));
      setSelectedFullState("idle");
    } catch (e) {
      console.error(e);
      setSelectedFull(null);
      setSelectedFullState("error");
    }
  }

  async function onSendToApproval() {
    const selected = selectedForPolicies;
    const check = canSend(selected);
    if (selected && !hasUnitPermission(selected)) {
      notify("Você não possui permissão para reenviar este projeto na unidade selecionada.", "error");
      return;
    }
    if (!check.ok || !selected) {
      notify(check.reason ?? "Não foi possível enviar para aprovação.", "info");
      return;
    }

    requestConfirm({
      title: "Enviar para aprovação",
      message: `Enviar o projeto #${selected.Id} para Aprovação?`,
      confirmingText: "Enviando...",
      onConfirm: async () => {
        try {
          await sendProjectToApproval(selected);
          await list.loadFirstPage();
          list.setSelectedId(selected.Id);
          await refreshSelectedDetails(selected.Id);
          notify("Projeto enviado para aprovação.", "success");
        } catch (e) {
          const appError = normalizeError(e, "Erro ao enviar para aprovação.");
          notify(appError.userMessage, "error");
        }
      }
    });
  }

  async function onBackStatus() {
    const selected = selectedForPolicies;
    const check = canBack(selected);
    if (!check.ok || !selected) {
      notify(check.reason ?? "Não foi possível voltar o status para rascunho.", "info");
      return;
    }

    requestConfirm({
      title: "Voltar para rascunho",
      message: `Voltar o status do projeto #${selected.Id} para Rascunho?`,
      confirmingText: "Atualizando...",
      onConfirm: async () => {
        try {
          await moveProjectBackToDraft(selected);
          await list.loadFirstPage();
          list.setSelectedId(selected.Id);
          await refreshSelectedDetails(selected.Id);
          notify("Projeto retornou para rascunho.", "success");
        } catch (e) {
          const appError = normalizeError(e, "Erro ao voltar para rascunho.");
          notify(appError.userMessage, "error");
        }
      }
    });
  }

  async function onDelete() {
    const selected = selectedForPolicies;
    const check = canDelete(selected);
    if (!check.ok || !selected) {
      notify(check.reason ?? "Não foi possível excluir o projeto.", "error");
      return;
    }

    requestConfirm({
      title: "Excluir projeto",
      message: `Deseja realmente excluir o projeto #${selected.Id}? Esta ação também excluirá marcos, atividades e PEPs relacionados.`,
      tone: "danger",
      confirmingText: "Excluindo...",
      onConfirm: async () => {
        try {
          await deleteDraftProjectAndRelated(selected);
          list.setSelectedId(null);
          await list.loadFirstPage();
          notify("Projeto e estrutura relacionada excluídos com sucesso.", "success");
        } catch (e) {
          const appError = normalizeError(e, "Erro ao excluir projeto.");
          notify(appError.userMessage, "error");
        }
      }
    });
  }

  async function onApprove() {
    const selected = selectedForPolicies;
    const check = canApprove(selected);
    if (!isAdmin) {
      notify("Apenas administradores podem aprovar projetos.", "error");
      return;
    }
    if (!check.ok || !selected) {
      notify(check.reason ?? "Não foi possível aprovar o projeto.", "info");
      return;
    }

    setApprovalCodeModal({ projectId: selected.Id, initialCode: String(selected.codigoSAP ?? "") });
  }

  async function onReject() {
    const selected = selectedForPolicies;
    const check = canReject(selected);
    if (!isAdmin) {
      notify("Apenas administradores podem reprovar projetos.", "error");
      return;
    }
    if (!check.ok || !selected) {
      notify(check.reason ?? "Não foi possível reprovar o projeto.", "info");
      return;
    }

    requestConfirm({
      title: "Reprovar projeto",
      message: `Reprovar o projeto #${selected.Id}?`,
      tone: "danger",
      confirmingText: "Reprovando...",
      onConfirm: async () => {
        try {
          await rejectSelectedProject(selected, { isAdmin });
          await list.loadFirstPage();
          list.setSelectedId(selected.Id);
          await refreshSelectedDetails(selected.Id);
          notify("Projeto reprovado com sucesso.", "success");
        } catch (e) {
          const appError = normalizeError(e, "Erro ao reprovar o projeto.");
          notify(appError.userMessage, "error");
        }
      }
    });
  }


  const commandPolicies = getCommandBarPolicies(selectedForPolicies);
  const hasPermissionOnSelected = hasUnitPermission(selectedForPolicies);
  const editPolicy = canEdit(selectedForPolicies);
  const deletePolicy = canDelete(selectedForPolicies);
  const sendPolicy = canSend(selectedForPolicies);
  const backPolicy = canBack(selectedForPolicies);
  const approvePolicy = canApprove(selectedForPolicies);
  const rejectPolicy = canReject(selectedForPolicies);

  function onExportTable() {
    const exported = exportProjectsCsv(list.items);
    if (!exported) {
      notify("Nenhum projeto carregado para exportar.", "info");
      return;
    }
    notify("Lista de projetos exportada em CSV.", "success");
  }

  async function onExportProject() {
    const selected = selectedFull ?? selectedForPolicies;
    if (!selected) {
      notify("Selecione um projeto para exportar o resumo.", "info");
      return;
    }

    try {
      const [milestones, activities, peps] = await Promise.all([
        getMilestonesByProject(selected.Id),
        getActivitiesBatchByProject(selected.Id, { pageSize: 500, maxPages: 20 }),
        getPepsBatchByProject(selected.Id, { pageSize: 500, maxPages: 20 })
      ]);
      exportProjectView(selected, { milestones, activities, peps });
      notify(`Resumo do projeto #${selected.Id} pronto para impressão/PDF.`, "success");
    } catch (e) {
      console.error(e);
      notify("Não foi possível abrir a visualização de impressão do projeto.", "error");
    }
  }

  if (!hasAccess) {
    return (
      <BootstrapLoader
        title="Acesso bloqueado"
        subtitle="Você não possui permissão para acessar nenhuma unidade do CAPEX. Solicite acesso ao administrador."
      />
    );
  }

  return (
    <div style={styles.pageWrap}>
      <CommandBar
        isAdmin={isAdmin}
        selectedId={list.selectedId}
        totalLoaded={list.items.length}
        canEdit={hasPermissionOnSelected && editPolicy.ok}
        canDelete={deletePolicy.ok}
        canSend={hasPermissionOnSelected && sendPolicy.ok}
        canBack={backPolicy.ok}
        canApprove={isAdmin && approvePolicy.ok}
        canReject={isAdmin && rejectPolicy.ok}
        editDisabledReason={!hasPermissionOnSelected ? "Sem permissão para editar projeto nesta unidade." : editPolicy.reason}
        deleteDisabledReason={deletePolicy.reason}
        sendDisabledReason={!hasPermissionOnSelected ? "Sem permissão para reenviar projeto nesta unidade." : sendPolicy.reason}
        backDisabledReason={backPolicy.reason}
        approveDisabledReason={!isAdmin ? "Apenas administradores podem aprovar projetos." : approvePolicy.reason}
        rejectDisabledReason={!isAdmin ? "Apenas administradores podem reprovar projetos." : rejectPolicy.reason}
        filters={list.filters}
        onChangeFilters={(patch) => list.setFilters((prev) => ({ ...prev, ...patch }))}
        onApply={list.loadFirstPage}
        onClear={list.clearFilters}
        onRefresh={list.loadFirstPage}
        onNew={onRequestCreate}
        canCreate={hasAccess}
        createDisabledReason={!hasAccess ? "Sem permissão para criar projeto." : undefined}
        availableUnits={isAdmin ? undefined : allowedUnits}
        onView={() => list.selected && setWizard({ mode: "view", initial: list.selected })}
      onEdit={() => {
        if (!list.selected) return;
        if (!hasUnitPermission(list.selected)) {
          notify("Você não possui permissão para editar este projeto na unidade selecionada.", "error");
          return;
        }
        const check = commandPolicies.edit;
        if (!check.ok) {
          notify(check.reason ?? "Não foi possível editar o projeto.", "error");
            return;
          }
          setWizard({ mode: "edit", initial: list.selected });
        }}
        onDuplicate={() => {
          if (!list.selected) return;
          setWizard({ mode: "duplicate", initial: list.selected });
        }}
        onDelete={onDelete}
        onSendToApproval={onSendToApproval}
        onBackStatus={onBackStatus}
        onApprove={onApprove}
        onReject={onReject}
        showApprovalActions={isAdmin}
        onExportTable={onExportTable}
        onExportProject={onExportProject}
      />

      <div style={styles.grid}>
        <Card style={styles.listCard}>
          <ProjectsTableSection
            items={list.items}
            selectedId={list.selectedId}
            state={list.state}
            errorMsg={list.errorMsg}
            onSelect={list.setSelectedId}
          />
          <div style={styles.footerRow}>
            <div style={styles.helperText}>Itens carregados: <b>{list.items.length}</b></div>
            <Button onClick={list.loadMore} disabled={!list.nextLink || list.state === "loading"}>
              {list.nextLink ? (list.state === "loading" ? "Carregando..." : "Carregar mais") : "Fim"}
            </Button>
          </div>
        </Card>

        <Card style={styles.summaryCard}>
          <ProjectSummarySection
            selectedId={list.selectedId}
            selectedFull={selectedFull}
            selectedFullState={selectedFullState}
          />
        </Card>
      </div>

      {wizard && (
        <ProjectWizardModal
          mode={wizard.mode}
          initial={wizard.initial}
          onClose={() => setWizard(null)}
          onSubmitProject={wizard.mode === "edit" ? onEdit : onCreate}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? "Confirmar"}
        message={confirmState?.message ?? ""}
        tone={confirmState?.tone}
        onClose={() => setConfirmState(null)}
        confirming={confirmingAction}
        confirmingText={confirmState?.confirmingText}
        onConfirm={() => {
          if (!confirmState) return;
          setConfirmingAction(true);
          void Promise.resolve(confirmState.onConfirm()).finally(() => {
            setConfirmingAction(false);
            setConfirmState(null);
          });
        }}
      />

      <InputDialog
        open={Boolean(approvalCodeModal)}
        title={approvalCodeModal ? `Aprovar projeto #${approvalCodeModal.projectId}` : "Aprovar projeto"}
        label="Informe o Código SAP para aprovar o projeto:"
        placeholder="Ex.: SAP-12345"
        defaultValue={approvalCodeModal?.initialCode}
        confirmText="Continuar"
        confirming={confirmingAction}
        confirmingText="Aprovando..."
        onClose={() => setApprovalCodeModal(null)}
        onConfirm={(codigoSAP) => {
          const selected = selectedForPolicies;
          if (!selected || !approvalCodeModal || selected.Id !== approvalCodeModal.projectId) {
            setApprovalCodeModal(null);
            notify("Projeto selecionado não está mais disponível para aprovação.", "error");
            return;
          }
          const normalizedCode = codigoSAP.trim();
          if (!normalizedCode) {
            notify("Código SAP é obrigatório para aprovar o projeto.", "error");
            return;
          }
          setConfirmingAction(true);
          void (async () => {
            try {
              await approveSelectedProject(selected, { isAdmin, codigoSAP: normalizedCode });
              await list.loadFirstPage();
              list.setSelectedId(selected.Id);
              await refreshSelectedDetails(selected.Id);
              notify("Projeto aprovado com sucesso.", "success");
              setApprovalCodeModal(null);
            } catch (e) {
              const appError = normalizeError(e, "Erro ao aprovar o projeto.");
              notify(appError.userMessage, "error");
            } finally {
              setConfirmingAction(false);
            }
          })();
        }}
      />
    </div>
  );
}
