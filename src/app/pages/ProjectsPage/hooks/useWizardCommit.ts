import { useCallback, useRef, useState } from "react";

import type { ProjectDraft } from "../../../../services/sharepoint/projectsApi";
import { CommitProjectStructureError, commitProjectStructure } from "../../../../services/sharepoint/commitProjectStructure";
import type { WizardDraftState } from "../../../../domain/projects/project.validators";
import { validateProjectBasics, validateStructure } from "../../../../domain/projects/project.validators";
import { normalizeError } from "../../../../application/errors/appError";

const wizardValidationTimeRef = {};

type UseWizardCommitDeps = {
  commitProjectStructure: typeof commitProjectStructure;
};

export function useWizardCommit(params: {
  readOnly: boolean;
  needStructure: boolean;
  originalNeedStructure: boolean;
  projectId: number | null;
  setProjectId: (id: number) => void;
  state: WizardDraftState;
  normalizeProjectForCommit: (draft: ProjectDraft) => ProjectDraft;
  onSubmitProject: (draft: ProjectDraft) => Promise<number>;
  onClose: () => void;
  askConfirm: (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    tone?: "danger" | "neutral";
  }) => Promise<boolean>;
  notify: (message: string, tone?: "success" | "error" | "info") => void;
}, deps: UseWizardCommitDeps = { commitProjectStructure }) {
  const [committing, setCommitting] = useState(false);
  const commitInFlightRef = useRef(false);

  const commitAll = useCallback(async () => {
    if (params.readOnly || committing || commitInFlightRef.current) return;

    commitInFlightRef.current = true;
    setCommitting(true);
    try {
      const normalizedProject = params.normalizeProjectForCommit(params.state.project);
      validateProjectBasics(normalizedProject, wizardValidationTimeRef);
      validateStructure({ ...params.state, project: normalizedProject });

      const shouldConfirmStructureRemoval =
        params.originalNeedStructure &&
        !params.needStructure &&
        (params.state.milestones.length > 0 || params.state.activities.length > 0);

      if (shouldConfirmStructureRemoval) {
        const removalConfirmed = await params.askConfirm({
          title: "Excluir estrutura antiga?",
          message: [
            "Este projeto deixou de ser KEY Project (orçamento abaixo de R$ 1.000.000,00).",
            "Para salvar como projeto simples, a estrutura existente será removida:",
            `• Marcos: ${params.state.milestones.length}`,
            `• Atividades: ${params.state.activities.length}`,
            "",
            "Deseja continuar e excluir essa estrutura antiga agora?"
          ].join("\n"),
          confirmText: "Excluir estrutura",
          cancelText: "Voltar e revisar",
          tone: "danger"
        });

        if (!removalConfirmed) {
          params.notify("Salvamento cancelado. Revise a estrutura antes de continuar.", "info");
          return;
        }
      }

      const structureSummary = params.needStructure
        ? `${params.state.milestones.length} marcos e ${params.state.activities.length} atividades`
        : "não obrigatória para este projeto";
      const confirmed = await params.askConfirm({
        title: "Confirmação",
        message: [
          "Confirma salvar este projeto como rascunho?",
          `• Status após salvar: Rascunho`,
          `• Estrutura: ${structureSummary}`,
          `• PEPs: ${params.state.peps.length} registro(s) serão persistidos`,
          "• Persistência: projeto, estrutura e PEPs serão gravados no SharePoint"
        ].join("\n")
      });
      if (!confirmed) return;

      let id = params.projectId;
      const commitResult = await deps.commitProjectStructure({
        projectId: id,
        normalizedProject,
        needStructure: params.needStructure,
        purgeStructureWhenNotNeeded: shouldConfirmStructureRemoval,
        milestones: params.state.milestones,
        activities: params.state.activities,
        peps: params.state.peps,
        createProject: params.onSubmitProject
      });

      id = commitResult.projectId;
      params.setProjectId(id);

      params.notify("Projeto salvo como rascunho com sucesso.", "success");
      params.onClose();
    } catch (error: unknown) {
      if (error instanceof CommitProjectStructureError) {
        console.error(error);
        params.notify(error.userMessage, "error");
      } else {
        const appError = normalizeError(error, "Não foi possível concluir o commit.");
        params.notify(appError.userMessage, "error");
      }
    } finally {
      commitInFlightRef.current = false;
      setCommitting(false);
    }
  }, [committing, deps, params]);

  return { committing, commitAll };
}
