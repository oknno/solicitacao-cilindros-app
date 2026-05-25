import { updateProject as updateProjectApi } from "../../services/sharepoint/projectsApi";
import { projectInputToDraft } from "../contracts/projectAdapters";
import type { ProjectInput } from "../contracts/project";

export type EditProjectDeps = {
  updateProject: (id: number, draft: ProjectInput) => Promise<void>;
};

const defaultDeps: EditProjectDeps = {
  updateProject: (id, draft) => updateProjectApi(id, projectInputToDraft(draft))
};

export async function editProject(id: number, draft: ProjectInput, deps: EditProjectDeps = defaultDeps): Promise<void> {
  await deps.updateProject(id, draft);
}
