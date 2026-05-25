import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectDraft, ProjectRow } from "../../../services/sharepoint/projectsApi";

import {
  calculateInvestmentLevel,
  toIntOrUndefined,
  toUpperOrUndefined
} from "../../../domain/projects/project.calculations";

import { validateProjectBasics, validateStructure } from "../../../domain/projects/project.validators";

import { useWizardCommit } from "./hooks/useWizardCommit";
import { useWizardNavigation } from "./hooks/useWizardNavigation";
import type { StepKey } from "./hooks/useWizardNavigation";
import { useWizardInitialLoad } from "./hooks/useWizardInitialLoad";
import { ProjectStep } from "./components/wizard/ProjectStep";
import { StructureStep } from "./components/wizard/StructureStep";
import { PepStep } from "./components/wizard/PepStep";
import { ReviewStep } from "./components/wizard/ReviewStep";
import { Tab } from "./components/wizard/WizardUi";
import { wizardLayoutStyles as styles } from "./components/wizard/wizardLayoutStyles";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/notifications/useToast";
import { Button } from "../../components/ui/Button";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";

const wizardValidationTimeRef = {};

type PendingItem = { id: string; section: Exclude<StepKey, "review">; message: string };

export function ProjectWizardModal(props: {
  mode: "create" | "edit" | "view" | "duplicate";
  initial?: ProjectRow;
  onClose: () => void;
  onSubmitProject: (draft: ProjectDraft) => Promise<number>;
}) {
  const isDuplicating = props.mode === "duplicate";
  const readOnly = props.mode === "view";
  const summaryOnlyView = readOnly;
  const { notify } = useToast();
  const lastStructureSeedRef = useRef<{ operationalCategory: string; complexity: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    title: string;
    confirmText?: string;
    cancelText?: string;
    tone?: "danger" | "neutral";
    resolve: (ok: boolean) => void;
  } | null>(null);

  const {
    state,
    setState,
    patchProject,
    projectId,
    setProjectId,
    originalNeedStructure,
    loadingHeader,
    errHeader,
    needStructure,
    regenerateSuggestedStructure,
    structureInitialized
  } = useWizardInitialLoad({ mode: props.mode, initial: props.initial });

  const effectivePeps = useMemo(() => {
    if (!needStructure) return state.peps;
    const defaultYear = Number(state.project.approvalYear ?? new Date().getFullYear());
    return state.activities
      .filter((activity) => Boolean(activity.pepElement) && Number(activity.amountBrl ?? 0) > 0)
      .map((activity) => ({
        tempId: `auto_${activity.tempId}`,
        Title: String(activity.pepElement ?? "").trim(),
        year: defaultYear,
        amountBrl: Number(activity.amountBrl ?? 0),
        activityTempId: activity.tempId
      }));
  }, [needStructure, state.activities, state.peps, state.project.approvalYear]);

  const draftState = useMemo(() => ({ ...state, peps: effectivePeps }), [effectivePeps, state]);

  const normalizeProjectForCommit = useCallback((p: ProjectDraft): ProjectDraft => {
    const budget = toIntOrUndefined(p.budgetBrl);
    return {
      ...p,
      Title: toUpperOrUndefined(p.Title) ?? "",
      projectLeader: toUpperOrUndefined(p.projectLeader),
      projectUser: toUpperOrUndefined(p.projectUser),
      kpiName: toUpperOrUndefined(p.kpiName),
      sourceProjectCode: toUpperOrUndefined(p.sourceProjectCode),
      budgetBrl: budget,
      investmentLevel: calculateInvestmentLevel(budget),
      status: "Rascunho",
      ...(p.hasRoce === "SIM" ? {} : {
        roceGain: undefined,
        roceGainDescription: undefined,
        roceLoss: undefined,
        roceLossDescription: undefined,
        roceClassification: undefined
      })
    };
  }, []);

  const askConfirm = useCallback((options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    tone?: "danger" | "neutral";
  }) =>
    new Promise<boolean>((resolve) => {
      setConfirmState({
        title: options.title ?? "Confirmação",
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        tone: options.tone,
        resolve
      });
    }), []);


  const handleRegenerateStructure = useCallback(async () => {
    const confirmed = await askConfirm({
      title: "Regenerar estrutura sugerida?",
      message: [
        "Ao avançar para a etapa de execução, a estrutura sugerida será regenerada automaticamente.",
        "A regeneração substitui marcos/atividades atuais por uma nova sugestão de template.",
        "Impactos:",
        "• Atividades existentes no rascunho atual serão descartadas",
        "• PEPs automáticos serão recalculados",
        "• Confirme apenas quando a alteração estrutural for intencional"
      ].join("\n"),
      confirmText: "Confirmar regeneração",
      cancelText: "Cancelar"
    });

    if (!confirmed) return;

    const result = regenerateSuggestedStructure(true, true);
    if (!result.ok) {
      notify(result.reason ?? "Regeneração bloqueada.", "info");
      return;
    }

    notify("Estrutura regenerada com sucesso.", "success");
    lastStructureSeedRef.current = {
      operationalCategory: String((state.project as { operationalCategory?: string }).operationalCategory ?? "").trim(),
      complexity: String((state.project as { complexity?: string }).complexity ?? "").trim()
    };
  }, [askConfirm, notify, regenerateSuggestedStructure, state.project]);

  useEffect(() => {
    const currentOperationalCategory = String((state.project as { operationalCategory?: string }).operationalCategory ?? "").trim();
    const currentComplexity = String((state.project as { complexity?: string }).complexity ?? "").trim();
    const lastSeed = lastStructureSeedRef.current;
    if (
      lastSeed &&
      (lastSeed.operationalCategory.length > 0 || lastSeed.complexity.length > 0 || (!currentOperationalCategory && !currentComplexity))
    ) return;
    lastStructureSeedRef.current = {
      operationalCategory: currentOperationalCategory,
      complexity: currentComplexity
    };
  }, [state.project]);

  const { committing, commitAll } = useWizardCommit({
    readOnly,
    needStructure,
    originalNeedStructure,
    projectId,
    setProjectId: (id) => setProjectId(id),
    state: draftState,
    normalizeProjectForCommit,
    onSubmitProject: props.onSubmitProject,
    onClose: props.onClose,
    askConfirm,
    notify
  });

  const projectRequiredFields = useMemo(
    () => [
      { key: "Title", label: "Título", filled: String(state.project.Title ?? "").trim().length > 0 },
      { key: "approvalYear", label: "Ano de aprovação", filled: Boolean(state.project.approvalYear) },
      { key: "budgetBrl", label: "Orçamento", filled: Number(state.project.budgetBrl ?? 0) > 0 },
      { key: "startDate", label: "Data de início", filled: Boolean(state.project.startDate) },
      { key: "endDate", label: "Data de término", filled: Boolean(state.project.endDate) },
      { key: "projectLeader", label: "Líder do projeto", filled: String(state.project.projectLeader ?? "").trim().length > 0 },
      { key: "projectUser", label: "Usuário do projeto", filled: String(state.project.projectUser ?? "").trim().length > 0 },
      { key: "businessNeed", label: "Necessidade de negócio", filled: String(state.project.businessNeed ?? "").trim().length > 0 },
      { key: "proposedSolution", label: "Solução proposta", filled: String(state.project.proposedSolution ?? "").trim().length > 0 },
      { key: "investmentType", label: "Tipo de investimento", filled: String(state.project.investmentType ?? "").trim().length > 0 },
      { key: "operationalCategory", label: "Categoria operacional", filled: !needStructure || String((state.project as { operationalCategory?: string }).operationalCategory ?? "").trim().length > 0 },
      { key: "complexity", label: "Complexidade", filled: !needStructure || String((state.project as { complexity?: string }).complexity ?? "").trim().length > 0 }
    ],
    [needStructure, state.project]
  );


  const pendingItems = useMemo<PendingItem[]>(() => {
    const pendings: PendingItem[] = [];

    try {
      validateProjectBasics(normalizeProjectForCommit(state.project), wizardValidationTimeRef);
    } catch (error: unknown) {
      pendings.push({
        id: "project-validation",
        section: "project",
        message: error instanceof Error && error.message ? error.message : "Existem campos pendentes em Projeto."
      });
    }

    const missingProjectFields = projectRequiredFields.filter((field) => !field.filled);
    if (missingProjectFields.length > 0) {
      pendings.push({
        id: "project-required-fields",
        section: "project",
        message: `Campos essenciais não preenchidos: ${missingProjectFields.map((field) => field.label).join(", ")}.`
      });
    }

    try {
      validateStructure(draftState);
    } catch (error: unknown) {
      const message = error instanceof Error && error.message ? error.message : "Existem pendências em Estrutura/PEPs.";
      pendings.push({ id: "structure-validation", section: "execution", message });
    }

    if (effectivePeps.length === 0) {
      pendings.push({ id: "pep-empty", section: "execution", message: "Cadastre ao menos 1 PEP para avançar." });
    }

    if (needStructure) {
      if (state.milestones.length === 0) pendings.push({ id: "structure-milestone", section: "execution", message: "Inclua ao menos 1 milestone." });
      if (state.activities.length === 0) pendings.push({ id: "structure-activity", section: "execution", message: "Inclua ao menos 1 activity." });
    }

    return pendings;
  }, [draftState, effectivePeps.length, needStructure, normalizeProjectForCommit, projectRequiredFields, state.activities.length, state.milestones.length, state.project]);


  function validateCurrentStep(currentStep: StepKey) {
    if (currentStep === "project") validateProjectBasics(normalizeProjectForCommit(state.project), wizardValidationTimeRef);
    if (currentStep === "execution") validateStructure(draftState);
  }

  const getForwardBlockingMessage = useCallback((_currentStep: StepKey, nextStep: StepKey) => {
    if (readOnly || summaryOnlyView) return null;
    if (nextStep === "review") {
      const blockingPendings = pendingItems.filter((item) => item.section === "project" || item.section === "execution");
      if (blockingPendings.length > 0) {
        return `Existem pendências que impedem avançar: ${blockingPendings[0]?.message ?? "revise os campos obrigatórios."}`;
      }
    }
    return null;
  }, [pendingItems, readOnly, summaryOnlyView]);

  const { step, stepOrder, currentStepIndex, transitioning, tryStepChange, goNext, goBack } = useWizardNavigation({
    readOnly,
    summaryOnlyView,
    validateCurrentStep,
    notify,
    getForwardBlockingMessage
  });

  const handleAdvance = useCallback(async () => {
    const nextStep = stepOrder[currentStepIndex + 1];
    if (nextStep === "execution" && needStructure && !readOnly) {
      const currentOperationalCategory = String((state.project as { operationalCategory?: string }).operationalCategory ?? "").trim();
      const currentComplexity = String((state.project as { complexity?: string }).complexity ?? "").trim();
      const lastSeed = lastStructureSeedRef.current;
      const requiredStructureFieldsFilled = Boolean(currentOperationalCategory) && Boolean(currentComplexity);
      const seedChanged =
        Boolean(lastSeed) &&
        (lastSeed?.operationalCategory !== currentOperationalCategory || lastSeed?.complexity !== currentComplexity);
      const shouldInitializeStructureOnAdvance = requiredStructureFieldsFilled && !structureInitialized;
      const shouldRegenerateOnAdvance = shouldInitializeStructureOnAdvance || (requiredStructureFieldsFilled && seedChanged);

      if (shouldRegenerateOnAdvance) {
        await handleRegenerateStructure();
      }
    }

    goNext();
  }, [currentStepIndex, goNext, handleRegenerateStructure, needStructure, readOnly, state.project, stepOrder, structureInitialized]);

  const stepLabel = (k: StepKey) => {
    if (k === "project") return "Toda a informação do projeto";
    if (k === "execution") return "PEPs acima ou abaixo de 1000000";
    return summaryOnlyView ? "Resumo" : "Resumo para validar";
  };

  const footerAlert = useMemo(() => {
    if (readOnly) return { state: "empty" as const, message: "Visualização apenas." };
    if (step !== "review") return { state: "empty" as const, message: "Rascunho não enviado ainda." };
    if (pendingItems.length > 0) return { state: "error" as const, message: "Revise pendências antes de enviar." };
    return { state: "success" as const, message: "Pronto para enviar para aprovação." };
  }, [pendingItems.length, readOnly, step]);

  const nextCtaLabel = useMemo(() => {
    const nextStep = stepOrder[currentStepIndex + 1];
    if (!nextStep) return "Continuar";
    if (nextStep === "execution") return "Avançar para PEPs / KEY Projects";
    return "Revisar e enviar para aprovação";
  }, [currentStepIndex, stepOrder]);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: uiTokens.colors.textStrong }}>
              {props.mode === "create"
                ? "Novo Projeto"
                : props.mode === "view"
                  ? `Visualizar Projeto #${props.initial?.Id ?? ""}`
                  : props.mode === "duplicate"
                    ? `Duplicar Projeto #${props.initial?.Id ?? ""}`
                    : `Editar Projeto #${props.initial?.Id ?? ""}`}
            </div>
            <div style={{ fontSize: 12, color: uiTokens.colors.textMuted, marginTop: 2 }}>
              {readOnly
                ? "Modo visualização: campos bloqueados."
                : isDuplicating
                  ? "Os dados do projeto base foram copiados para um novo rascunho. Ajuste somente o necessário antes de salvar."
                  : "Preencha, revise e salve como rascunho. O envio para aprovação é uma ação separada."}
            </div>
            {loadingHeader && <div style={{ marginTop: 4 }}><StateMessage state="loading" message="Carregando dados do BD…" /></div>}
            {errHeader && <div style={{ marginTop: 4 }}><StateMessage state="error" message={errHeader} /></div>}
          </div>
          <Button onClick={props.onClose}>Fechar</Button>
        </div>

        {!summaryOnlyView && (
        <div style={styles.tabsRow}>
          {stepOrder.map((stepKey, index) => {
            const isCurrent = stepKey === step;
            const status = isCurrent ? "current" : index < currentStepIndex ? "completed" : index === currentStepIndex + 1 ? "available" : "blocked";
            return (
              <Tab
                key={stepKey}
                label={stepLabel(stepKey)}
                indexLabel={String(index + 1)}
                status={status}
                onClick={() => {
                  void tryStepChange(stepKey, "tab");
                }}
              />
            );
          })}
          {!readOnly && <span style={{ marginLeft: 8, fontSize: 12, color: uiTokens.colors.textMuted }}>Dica: use principalmente os botões Próximo/Voltar.</span>}
        </div>
        )}


        <div style={styles.body}>
          {step === "project" && <ProjectStep draft={state.project} readOnly={readOnly} onChange={patchProject} />}
          {step === "execution" && (
            <div style={{ display: "grid", gap: 12 }}>
              {needStructure && <StructureStep readOnly={readOnly} projectStartDate={state.project.startDate} projectEndDate={state.project.endDate} milestones={state.milestones} activities={state.activities} company={state.project.company} onValidationError={(message) => notify(message, "error")} onChange={(next) => setState((s) => ({ ...s, ...next }))} />}
              {!needStructure && <PepStep readOnly={readOnly} needStructure={needStructure} milestones={state.milestones} activities={state.activities} peps={state.peps} company={state.project.company} defaultYear={Number(state.project.approvalYear ?? new Date().getFullYear())} onChange={(nextPeps) => setState((s) => ({ ...s, peps: nextPeps }))} />}
            </div>
          )}
          {step === "review" && (
            <>
              {pendingItems.length > 0 && (
                <div style={{ margin: "14px 16px 0", border: `1px solid ${uiTokens.colors.border}`, borderRadius: 8, padding: 12, background: uiTokens.colors.surfaceMuted }}>
                  <div style={{ fontWeight: 700, color: uiTokens.colors.textStrong, marginBottom: 8 }}>Pendências para envio</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {pendingItems.map((pending) => (
                      <div key={pending.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: uiTokens.colors.textStrong }}>{pending.message}</span>
                        <Button onClick={() => {
                          void tryStepChange(pending.section, "tab");
                        }}>
                          Ir para seção
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ReviewStep projectId={projectId} state={draftState} needStructure={needStructure} />
            </>
          )}
        </div>

        {!summaryOnlyView && (
        <div style={styles.footer}>
          <StateMessage state={footerAlert.state} message={footerAlert.message} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={goBack} disabled={step === "project"}>Voltar</Button>
            {!readOnly && step !== "review" && <Button tone="primary" onClick={() => { void handleAdvance(); }} disabled={transitioning}>{transitioning ? "Validando..." : nextCtaLabel}</Button>}
            {!readOnly && step === "review" && <Button tone="primary" onClick={commitAll} disabled={committing}>{committing ? "Salvando..." : "Salvar rascunho"}</Button>}
          </div>
        </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? "Confirmar"}
        message={confirmState?.message ?? ""}
        confirmText={confirmState?.confirmText}
        cancelText={confirmState?.cancelText}
        tone={confirmState?.tone}
        onClose={() => {
          confirmState?.resolve(false);
          setConfirmState(null);
        }}
        onConfirm={() => {
          confirmState?.resolve(true);
          setConfirmState(null);
        }}
      />
    </div>
  );
}
