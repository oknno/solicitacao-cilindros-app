import type { ProjectDraft } from "./projectsApi.ts";
import { updateProject, deleteProject } from "./projectsApi.ts";
import { createMilestone, deleteMilestone, getMilestonesByProject, updateMilestone } from "./milestonesApi.ts";
import { createActivity, deleteActivity, getActivitiesBatchByProject, updateActivity } from "./activitiesApi.ts";
import { createPep, deletePep, getPepsBatchByProject, updatePep } from "./pepsApi.ts";

import type {
  ActivityDraftLocal,
  MilestoneDraftLocal,
  PepDraftLocal
} from "../../domain/projects/project.validators.ts";

export type CommitJournal = {
  createdProjectId?: number;
  milestoneIds: number[];
  activityIds: number[];
  pepIds: number[];
  diagnostics: CommitDiagnosticEntry[];
};

export type RollbackIssue = {
  entity: "project" | "milestone" | "activity" | "pep";
  id: number;
  reason: string;
};

type CommitEntity = "project" | "milestone" | "activity" | "pep";
type CommitAction = "update" | "delete";
type CommitPhase = "commit" | "rollback";

export type CommitDiagnosticEntry = {
  phase: CommitPhase;
  action: CommitAction;
  entity: CommitEntity;
  id: number;
  status: "success" | "failed";
  reason?: string;
  stage: string;
};

export type CommitStepDetails = {
  phase: CommitPhase;
  action: "create" | CommitAction;
  entity: CommitEntity;
  stage: string;
  id?: number;
};

export type RollbackSummary = {
  attempts: number;
  failed: number;
  succeeded: number;
  failedByEntity: Partial<Record<CommitEntity, number>>;
};

export type RollbackResult = {
  status: "complete" | "partial";
  attempts: number;
  failures: RollbackIssue[];
  summary: RollbackSummary;
};


export class CommitProjectStructureError extends Error {
  readonly journal: CommitJournal;
  readonly rollback: RollbackResult;
  readonly causeError: unknown;
  readonly failedStep?: CommitStepDetails;
  readonly details?: {
    rollbackPartialSummary?: RollbackSummary;
  };
  readonly userMessage: string;

  constructor(message: string, args: { journal: CommitJournal; rollback: RollbackResult; cause: unknown; failedStep?: CommitStepDetails }) {
    super(message);
    this.name = "CommitProjectStructureError";
    this.journal = args.journal;
    this.rollback = args.rollback;
    this.causeError = args.cause;
    this.failedStep = args.failedStep;
    this.details = args.rollback.status === "partial"
      ? { rollbackPartialSummary: args.rollback.summary }
      : undefined;
    this.userMessage = "Erro ao persistir estrutura do projeto.";
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown delete error";
}

function parseExistingId(tempId: string | undefined, prefix: string): number | null {
  if (!tempId) return null;
  if (!tempId.startsWith(`${prefix}_`)) return null;
  const raw = Number(tempId.slice(prefix.length + 1));
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function normalizeText(value?: string): string {
  return String(value ?? "").trim();
}

type CommitProjectStructureArgs = {
  projectId: number | null;
  normalizedProject: ProjectDraft;
  needStructure: boolean;
  purgeStructureWhenNotNeeded?: boolean;
  milestones: MilestoneDraftLocal[];
  activities: ActivityDraftLocal[];
  peps: PepDraftLocal[];
  createProject: (draft: ProjectDraft) => Promise<number>;
  apis?: Partial<{
    updateProject: typeof updateProject;
    deleteProject: typeof deleteProject;
    createMilestone: typeof createMilestone;
    deleteMilestone: typeof deleteMilestone;
    getMilestonesByProject: typeof getMilestonesByProject;
    updateMilestone: typeof updateMilestone;
    createActivity: typeof createActivity;
    deleteActivity: typeof deleteActivity;
    getActivitiesBatchByProject: typeof getActivitiesBatchByProject;
    updateActivity: typeof updateActivity;
    createPep: typeof createPep;
    deletePep: typeof deletePep;
    getPepsBatchByProject: typeof getPepsBatchByProject;
    updatePep: typeof updatePep;
  }>;
};

export async function commitProjectStructure(args: CommitProjectStructureArgs): Promise<{ projectId: number; journal: CommitJournal }> {
  const deps = {
    updateProject,
    deleteProject,
    createMilestone,
    deleteMilestone,
    getMilestonesByProject,
    updateMilestone,
    createActivity,
    deleteActivity,
    getActivitiesBatchByProject,
    updateActivity,
    createPep,
    deletePep,
    getPepsBatchByProject,
    updatePep,
    ...args.apis
  };

  const journal: CommitJournal = {
    milestoneIds: [],
    activityIds: [],
    pepIds: [],
    diagnostics: []
  };

  const rollbackIssues: RollbackIssue[] = [];
  const milestoneIdMap = new Map<string, number>();
  const activityIdMap = new Map<string, number>();
  let failedStep: CommitStepDetails | undefined;
  let activeStep: CommitStepDetails | undefined;

  let id = args.projectId;
  const nextProjectDraft: ProjectDraft = {
    ...args.normalizedProject
  };

  const setStep = (step: CommitStepDetails): void => {
    activeStep = step;
  };

  const trackDiagnostic = (entry: CommitDiagnosticEntry): void => {
    journal.diagnostics.push(entry);
  };

  const rollback = async () => {
    const pepIds = [...journal.pepIds].reverse();
    const activityIds = [...journal.activityIds].reverse();
    const milestoneIds = [...journal.milestoneIds].reverse();

    for (const pepId of pepIds) {
      try {
        setStep({ phase: "rollback", action: "delete", entity: "pep", stage: "rollback-created-peps", id: pepId });
        await deps.deletePep(pepId);
        trackDiagnostic({ phase: "rollback", action: "delete", entity: "pep", id: pepId, status: "success", stage: "rollback-created-peps" });
      } catch (error: unknown) {
        rollbackIssues.push({ entity: "pep", id: pepId, reason: toErrorMessage(error) });
        trackDiagnostic({
          phase: "rollback",
          action: "delete",
          entity: "pep",
          id: pepId,
          status: "failed",
          reason: toErrorMessage(error),
          stage: "rollback-created-peps"
        });
      }
    }

    for (const activityId of activityIds) {
      try {
        setStep({ phase: "rollback", action: "delete", entity: "activity", stage: "rollback-created-activities", id: activityId });
        await deps.deleteActivity(activityId);
        trackDiagnostic({ phase: "rollback", action: "delete", entity: "activity", id: activityId, status: "success", stage: "rollback-created-activities" });
      } catch (error: unknown) {
        rollbackIssues.push({ entity: "activity", id: activityId, reason: toErrorMessage(error) });
        trackDiagnostic({
          phase: "rollback",
          action: "delete",
          entity: "activity",
          id: activityId,
          status: "failed",
          reason: toErrorMessage(error),
          stage: "rollback-created-activities"
        });
      }
    }

    for (const milestoneId of milestoneIds) {
      try {
        setStep({ phase: "rollback", action: "delete", entity: "milestone", stage: "rollback-created-milestones", id: milestoneId });
        await deps.deleteMilestone(milestoneId);
        trackDiagnostic({ phase: "rollback", action: "delete", entity: "milestone", id: milestoneId, status: "success", stage: "rollback-created-milestones" });
      } catch (error: unknown) {
        rollbackIssues.push({ entity: "milestone", id: milestoneId, reason: toErrorMessage(error) });
        trackDiagnostic({
          phase: "rollback",
          action: "delete",
          entity: "milestone",
          id: milestoneId,
          status: "failed",
          reason: toErrorMessage(error),
          stage: "rollback-created-milestones"
        });
      }
    }

    if (journal.createdProjectId) {
      try {
        setStep({ phase: "rollback", action: "delete", entity: "project", stage: "rollback-created-project", id: journal.createdProjectId });
        await deps.deleteProject(journal.createdProjectId);
        trackDiagnostic({ phase: "rollback", action: "delete", entity: "project", id: journal.createdProjectId, status: "success", stage: "rollback-created-project" });
      } catch (error: unknown) {
        rollbackIssues.push({ entity: "project", id: journal.createdProjectId, reason: toErrorMessage(error) });
        trackDiagnostic({
          phase: "rollback",
          action: "delete",
          entity: "project",
          id: journal.createdProjectId,
          status: "failed",
          reason: toErrorMessage(error),
          stage: "rollback-created-project"
        });
      }
    }

    const attempts = pepIds.length + activityIds.length + milestoneIds.length + (journal.createdProjectId ? 1 : 0);
    const failedByEntity = rollbackIssues.reduce<Partial<Record<CommitEntity, number>>>((acc, issue) => {
      acc[issue.entity] = (acc[issue.entity] ?? 0) + 1;
      return acc;
    }, {});

    return {
      status: rollbackIssues.length === 0 ? "complete" : "partial",
      attempts,
      failures: rollbackIssues,
      summary: {
        attempts,
        failed: rollbackIssues.length,
        succeeded: attempts - rollbackIssues.length,
        failedByEntity
      }
    } as RollbackResult;
  };

  try {
    if (!id) {
      setStep({ phase: "commit", action: "create", entity: "project", stage: "create-project" });
      id = await args.createProject({ ...nextProjectDraft, status: "Rascunho" });
      journal.createdProjectId = id;
    } else {
      setStep({ phase: "commit", action: "update", entity: "project", stage: "update-project", id });
      await deps.updateProject(id, { ...nextProjectDraft, status: "Rascunho" });
      trackDiagnostic({ phase: "commit", action: "update", entity: "project", id, status: "success", stage: "update-project" });
    }

    const [existingMilestones, existingActivities, existingPeps] = await Promise.all([
      deps.getMilestonesByProject(id),
      deps.getActivitiesBatchByProject(id, { pageSize: 500, maxPages: 20 }),
      deps.getPepsBatchByProject(id, { pageSize: 500, maxPages: 20 })
    ]);

    if (!args.needStructure) {
      for (const activity of args.activities) {
        const existingActivityId = parseExistingId(activity.tempId, "ac");
        if (existingActivityId) {
          activityIdMap.set(activity.tempId, existingActivityId);
        }
      }

      const desiredPepIds = new Set<number>();
      for (const pep of args.peps) {
        const existingPepId = parseExistingId(pep.tempId, "pp");
        const explicitActivityId = parseExistingId(pep.activityTempId, "ac");
        const mappedActivityId = pep.activityTempId ? activityIdMap.get(pep.activityTempId) : undefined;
        const activityId = mappedActivityId ?? explicitActivityId;

        const payload = {
          Title: pep.Title.trim(),
          year: pep.year,
          amountBrl: Math.round(pep.amountBrl),
          projectsIdId: id,
          activitiesIdId: activityId
        };

        if (existingPepId) {
          desiredPepIds.add(existingPepId);
          setStep({ phase: "commit", action: "update", entity: "pep", stage: "upsert-peps-without-structure", id: existingPepId });
          await deps.updatePep(existingPepId, payload);
          trackDiagnostic({ phase: "commit", action: "update", entity: "pep", id: existingPepId, status: "success", stage: "upsert-peps-without-structure" });
          continue;
        }

        const createdPepId = await deps.createPep(payload);
        journal.pepIds.push(createdPepId);
        desiredPepIds.add(createdPepId);
      }

      for (const existingPep of existingPeps) {
        if (!desiredPepIds.has(existingPep.Id)) {
          setStep({ phase: "commit", action: "delete", entity: "pep", stage: "cleanup-peps-without-structure", id: existingPep.Id });
          await deps.deletePep(existingPep.Id);
          trackDiagnostic({ phase: "commit", action: "delete", entity: "pep", id: existingPep.Id, status: "success", stage: "cleanup-peps-without-structure" });
        }
      }

      if (args.purgeStructureWhenNotNeeded) {
        for (const existingActivity of existingActivities) {
          setStep({ phase: "commit", action: "delete", entity: "activity", stage: "purge-activities-without-structure", id: existingActivity.Id });
          await deps.deleteActivity(existingActivity.Id);
          trackDiagnostic({ phase: "commit", action: "delete", entity: "activity", id: existingActivity.Id, status: "success", stage: "purge-activities-without-structure" });
        }

        for (const existingMilestone of existingMilestones) {
          setStep({ phase: "commit", action: "delete", entity: "milestone", stage: "purge-milestones-without-structure", id: existingMilestone.Id });
          await deps.deleteMilestone(existingMilestone.Id);
          trackDiagnostic({ phase: "commit", action: "delete", entity: "milestone", id: existingMilestone.Id, status: "success", stage: "purge-milestones-without-structure" });
        }
      }

      return { projectId: id, journal };
    }

    const desiredMilestoneIds = new Set<number>();

    for (const milestone of args.milestones) {
      const existingMilestoneId = parseExistingId(milestone.tempId, "ms");
      const title = milestone.Title.trim().toUpperCase();

      if (existingMilestoneId) {
        desiredMilestoneIds.add(existingMilestoneId);
        const existingMilestone = existingMilestones.find((item) => item.Id === existingMilestoneId);
        if (!existingMilestone || normalizeText(existingMilestone.Title).toUpperCase() !== title) {
          setStep({ phase: "commit", action: "update", entity: "milestone", stage: "upsert-milestones", id: existingMilestoneId });
          await deps.updateMilestone(existingMilestoneId, {
            Title: title,
            projectsIdId: id
          });
          trackDiagnostic({ phase: "commit", action: "update", entity: "milestone", id: existingMilestoneId, status: "success", stage: "upsert-milestones" });
        }
        milestoneIdMap.set(milestone.tempId, existingMilestoneId);
      } else {
        const createdMilestoneId = await deps.createMilestone({
          Title: title,
          projectsIdId: id
        });
        journal.milestoneIds.push(createdMilestoneId);
        desiredMilestoneIds.add(createdMilestoneId);
        milestoneIdMap.set(milestone.tempId, createdMilestoneId);
      }
    }

    const desiredActivityIds = new Set<number>();
    for (const activity of args.activities) {
      const mappedMilestoneId = milestoneIdMap.get(activity.milestoneTempId);
      const milestoneId = mappedMilestoneId ?? parseExistingId(activity.milestoneTempId, "ms");
      if (!milestoneId) throw new Error("Activity sem milestone válido (commit).");

      const existingActivityId = parseExistingId(activity.tempId, "ac");
      const payload = {
        Title: activity.Title.trim().toUpperCase(),
        startDate: activity.startDate ? `${activity.startDate}T00:00:00Z` : undefined,
        endDate: activity.endDate ? `${activity.endDate}T00:00:00Z` : undefined,
        supplier: activity.supplier,
        activityDescription: activity.activityDescription,
        projectsIdId: id,
        milestonesIdId: milestoneId
      };

      if (existingActivityId) {
        desiredActivityIds.add(existingActivityId);
        setStep({ phase: "commit", action: "update", entity: "activity", stage: "upsert-activities", id: existingActivityId });
        await deps.updateActivity(existingActivityId, payload);
        trackDiagnostic({ phase: "commit", action: "update", entity: "activity", id: existingActivityId, status: "success", stage: "upsert-activities" });
        activityIdMap.set(activity.tempId, existingActivityId);
      } else {
        const createdActivityId = await deps.createActivity(payload);
        journal.activityIds.push(createdActivityId);
        desiredActivityIds.add(createdActivityId);
        activityIdMap.set(activity.tempId, createdActivityId);
      }
    }

    const desiredPepIds = new Set<number>();
    for (const pep of args.peps) {
      const mappedActivityId = pep.activityTempId ? activityIdMap.get(pep.activityTempId) : undefined;
      const activityId = mappedActivityId ?? parseExistingId(pep.activityTempId, "ac");
      if (!activityId) throw new Error("PEP com Activity inválida (commit).");

      const existingPepId = parseExistingId(pep.tempId, "pp");
      const payload = {
        Title: pep.Title.trim(),
        year: pep.year,
        amountBrl: Math.round(pep.amountBrl),
        projectsIdId: id,
        activitiesIdId: activityId
      };

      if (existingPepId) {
        desiredPepIds.add(existingPepId);
        setStep({ phase: "commit", action: "update", entity: "pep", stage: "upsert-peps", id: existingPepId });
        await deps.updatePep(existingPepId, payload);
        trackDiagnostic({ phase: "commit", action: "update", entity: "pep", id: existingPepId, status: "success", stage: "upsert-peps" });
      } else {
        const createdPepId = await deps.createPep(payload);
        journal.pepIds.push(createdPepId);
        desiredPepIds.add(createdPepId);
      }
    }

    for (const existingPep of existingPeps) {
      if (!desiredPepIds.has(existingPep.Id)) {
        setStep({ phase: "commit", action: "delete", entity: "pep", stage: "cleanup-peps", id: existingPep.Id });
        await deps.deletePep(existingPep.Id);
        trackDiagnostic({ phase: "commit", action: "delete", entity: "pep", id: existingPep.Id, status: "success", stage: "cleanup-peps" });
      }
    }

    for (const existingActivity of existingActivities) {
      if (!desiredActivityIds.has(existingActivity.Id)) {
        setStep({ phase: "commit", action: "delete", entity: "activity", stage: "cleanup-activities", id: existingActivity.Id });
        await deps.deleteActivity(existingActivity.Id);
        trackDiagnostic({ phase: "commit", action: "delete", entity: "activity", id: existingActivity.Id, status: "success", stage: "cleanup-activities" });
      }
    }

    for (const existingMilestone of existingMilestones) {
      if (!desiredMilestoneIds.has(existingMilestone.Id)) {
        setStep({ phase: "commit", action: "delete", entity: "milestone", stage: "cleanup-milestones", id: existingMilestone.Id });
        await deps.deleteMilestone(existingMilestone.Id);
        trackDiagnostic({ phase: "commit", action: "delete", entity: "milestone", id: existingMilestone.Id, status: "success", stage: "cleanup-milestones" });
      }
    }

    return { projectId: id, journal };
  } catch (error) {
    failedStep = activeStep;
    if (activeStep?.action !== "create" && activeStep?.id) {
      trackDiagnostic({
        phase: activeStep.phase,
        action: activeStep.action,
        entity: activeStep.entity,
        id: activeStep.id,
        status: "failed",
        reason: toErrorMessage(error),
        stage: activeStep.stage
      });
    }
    const rollbackResult = await rollback();
    throw new CommitProjectStructureError("Erro ao persistir estrutura do projeto.", {
      journal,
      rollback: rollbackResult,
      cause: error,
      failedStep
    });
  }
}
