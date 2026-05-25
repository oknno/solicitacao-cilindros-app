import { approveProject as approveProjectWorkflow } from "../../services/sharepoint/projectsWorkflow";
import { projectViewToRow } from "../contracts/projectAdapters";
import type { ProjectView } from "../contracts/project";

export type ApproveProjectDeps = {
  approveProject: (project: ProjectView, args: { isAdmin: boolean; codigoSAP: string }) => Promise<{ newStatus: string }>;
};

const defaultDeps: ApproveProjectDeps = {
  approveProject: (project, args) => approveProjectWorkflow(projectViewToRow(project), args)
};

export async function approveSelectedProject(
  project: ProjectView | null,
  args: { isAdmin: boolean; codigoSAP: string },
  deps: ApproveProjectDeps = defaultDeps
): Promise<{ newStatus: string }> {
  if (!project) {
    throw new Error("Selecione um projeto.");
  }

  return deps.approveProject(project, args);
}
