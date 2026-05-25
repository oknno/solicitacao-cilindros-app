import { backToDraft as backToDraftWorkflow } from "../../services/sharepoint/projectsWorkflow";
import { projectViewToRow } from "../contracts/projectAdapters";
import type { ProjectView } from "../contracts/project";
import { canBackToDraft } from "../../domain/projects/projectStatusPolicies";

export type BackToDraftDeps = {
  canBackToDraft: (project: ProjectView | null) => { ok: boolean; reason?: string };
  backToDraft: (project: ProjectView) => Promise<void>;
};

const defaultDeps: BackToDraftDeps = {
  canBackToDraft: (project) => canBackToDraft(project ? projectViewToRow(project) : null),
  backToDraft: (project) => backToDraftWorkflow(projectViewToRow(project))
};

export async function moveProjectBackToDraft(
  project: ProjectView | null,
  deps: BackToDraftDeps = defaultDeps
): Promise<void> {
  const check = deps.canBackToDraft(project);
  if (!check.ok || !project) {
    throw new Error(check.reason ?? "Não é possível voltar para rascunho.");
  }

  await deps.backToDraft(project);
}
