import { rejectProject as rejectProjectWorkflow } from "../../services/sharepoint/projectsWorkflow";
import { projectViewToRow } from "../contracts/projectAdapters";
import type { ProjectView } from "../contracts/project";

export type RejectProjectDeps = {
  rejectProject: (project: ProjectView, args: { isAdmin: boolean }) => Promise<{ newStatus: string }>;
};

const defaultDeps: RejectProjectDeps = {
  rejectProject: (project, args) => rejectProjectWorkflow(projectViewToRow(project), args)
};

export async function rejectSelectedProject(
  project: ProjectView | null,
  args: { isAdmin: boolean },
  deps: RejectProjectDeps = defaultDeps
): Promise<{ newStatus: string }> {
  if (!project) {
    throw new Error("Selecione um projeto.");
  }

  return deps.rejectProject(project, args);
}
