import { sendToApproval as sendToApprovalWorkflow } from "../../services/sharepoint/projectsWorkflow";
import { projectViewToRow } from "../contracts/projectAdapters";
import type { ProjectView } from "../contracts/project";
import { canSendToApproval } from "../../domain/projects/projectStatusPolicies";

export type SendToApprovalDeps = {
  canSendToApproval: (project: ProjectView | null) => { ok: boolean; reason?: string };
  sendToApproval: (project: ProjectView) => Promise<{ newStatus: string }>;
};

const defaultDeps: SendToApprovalDeps = {
  canSendToApproval: (project) => canSendToApproval(project ? projectViewToRow(project) : null),
  sendToApproval: (project) => sendToApprovalWorkflow(projectViewToRow(project))
};

export async function sendProjectToApproval(
  project: ProjectView | null,
  deps: SendToApprovalDeps = defaultDeps
): Promise<{ newStatus: string }> {
  const check = deps.canSendToApproval(project);
  if (!check.ok || !project) {
    throw new Error(check.reason ?? "Não é possível enviar para aprovação.");
  }

  return deps.sendToApproval(project);
}
