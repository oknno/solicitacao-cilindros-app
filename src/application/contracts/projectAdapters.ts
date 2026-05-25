import type { ProjectDraft, ProjectRow } from "../../services/sharepoint/projectsApi";
import type { ProjectInput, ProjectView } from "./project";

export function projectInputToDraft(input: ProjectInput): ProjectDraft {
  return { ...input };
}

export function projectViewToRow(view: ProjectView): ProjectRow {
  return { ...view };
}
