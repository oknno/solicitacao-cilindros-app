import { createProject as createProjectApi } from "../../services/sharepoint/projectsApi";
import { projectInputToDraft } from "../contracts/projectAdapters";
import type { ProjectInput } from "../contracts/project";

export type CreateProjectDeps = {
  createProject: (draft: ProjectInput) => Promise<number>;
};

const defaultDeps: CreateProjectDeps = {
  createProject: (draft) => createProjectApi(projectInputToDraft(draft))
};

export async function createProject(draft: ProjectInput, deps: CreateProjectDeps = defaultDeps): Promise<number> {
  return deps.createProject(draft);
}
