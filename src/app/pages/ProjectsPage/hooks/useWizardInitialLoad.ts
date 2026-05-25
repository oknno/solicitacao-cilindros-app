import { useCallback, useEffect, useMemo, useState } from "react";

import { getProjectById } from "../../../../services/sharepoint/projectsApi";
import type { ProjectDraft, ProjectRow } from "../../../../services/sharepoint/projectsApi";
import { getMilestonesByProject } from "../../../../services/sharepoint/milestonesApi";
import { getActivitiesBatchByProject } from "../../../../services/sharepoint/activitiesApi";
import { getPepsBatchByProject } from "../../../../services/sharepoint/pepsApi";
import { requiresStructure } from "../../../../domain/projects/project.calculations";
import {
  buildOperationalMilestones,
  type OperationalCategory,
  type OperationalComplexity
} from "../../../../domain/projects/operationalStructureCatalog";
import { normalizeOperationalCategory, normalizeOperationalComplexity } from "../../../../domain/projects/operationalValueNormalizer";
import {
  buildSuggestedActivitiesByMilestone,
  makeStructureTemplateSeedKey
} from "../../../../domain/projects/wizardStructureTemplates";
import type {
  ActivityDraftLocal,
  MilestoneDraftLocal,
  PepDraftLocal,
  WizardDraftState
} from "../../../../domain/projects/project.validators";
import { normalizeError } from "../../../../application/errors/appError";
import { decideStructureRegeneration } from "../../../../domain/projects/structureRegenerationPolicy";

type UseWizardInitialLoadParams = {
  mode: "create" | "edit" | "view" | "duplicate";
  initial?: ProjectRow;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function getActivityLimitByComplexity(complexity: OperationalComplexity): number {
  if (complexity === "BAIXA") return 1;
  if (complexity === "MEDIA") return 2;
  if (complexity === "ALTA") return 3;
  return 1;
}

function sanitizeProjectForDuplication(project?: ProjectRow): ProjectDraft {
  return {
    Title: project?.Title ?? "",
    approvalYear: project?.approvalYear,
    budgetBrl: project?.budgetBrl,
    status: "Rascunho",
    investmentLevel: project?.investmentLevel,
    fundingSource: project?.fundingSource,
    program: project?.program,
    company: project?.company,
    center: project?.center,
    unit: project?.unit,
    location: project?.location,
    depreciationCostCenter: project?.depreciationCostCenter,
    category: project?.category,
    investmentType: project?.investmentType,
    assetType: project?.assetType,
    projectFunction: project?.projectFunction,
    projectLeader: project?.projectLeader,
    projectUser: project?.projectUser,
    sourceProjectCode: project?.sourceProjectCode,
    hasRoce: project?.hasRoce,
    startDate: project?.startDate,
    endDate: project?.endDate,
    businessNeed: project?.businessNeed,
    proposedSolution: project?.proposedSolution,
    kpiType: project?.kpiType,
    kpiName: project?.kpiName,
    kpiDescription: project?.kpiDescription,
    kpiCurrent: project?.kpiCurrent ?? "",
    kpiExpected: project?.kpiExpected ?? "",
    roceGain: project?.roceGain,
    roceGainDescription: project?.roceGainDescription,
    roceLoss: project?.roceLoss,
    roceLossDescription: project?.roceLossDescription,
    roceClassification: project?.roceClassification,
    operationalCategory: normalizeOperationalCategory(project?.operationalCategory),
    complexity: normalizeOperationalComplexity(project?.complexity),
  };
}

function buildStructureFingerprint(draft: Pick<WizardDraftState, "milestones" | "activities" | "project">) {
  const milestones = draft.milestones.map((milestone) => milestone.Title.trim().toUpperCase()).sort();
  const activities = draft.activities
    .map((activity) => `${activity.milestoneTempId}:${activity.Title.trim().toUpperCase()}`)
    .sort();

  return JSON.stringify({
    budget: Number(draft.project.budgetBrl ?? 0),
    category: normalizeOperationalCategory((draft.project as { operationalCategory?: string }).operationalCategory) ?? "",
    complexity: normalizeOperationalComplexity((draft.project as { complexity?: string }).complexity) ?? "",
    milestones,
    activities
  });
}

export function useWizardInitialLoad(params: UseWizardInitialLoadParams) {
  const isDuplicating = params.mode === "duplicate";
  const initialProjectId = params.initial?.Id;

  const [structureInitialized, setStructureInitialized] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(isDuplicating ? null : initialProjectId ?? null);
  const [originalNeedStructure, setOriginalNeedStructure] = useState(() => !isDuplicating && params.mode === "edit" && requiresStructure(params.initial?.budgetBrl));
  const [loadingHeader, setLoadingHeader] = useState(false);
  const [errHeader, setErrHeader] = useState("");
  const [structureRegeneratedExplicitly, setStructureRegeneratedExplicitly] = useState(false);

  const [state, setState] = useState<WizardDraftState>(() => ({
    project: sanitizeProjectForDuplication(params.initial),
    milestones: [],
    activities: [],
    peps: []
  }));

  const needStructure = useMemo(() => requiresStructure(state.project.budgetBrl), [state.project.budgetBrl]);

  const regenerateSuggestedStructure = useCallback((withImpactConfirmation: boolean, explicit = false): { ok: boolean; reason?: string } => {
    if (!needStructure) return { ok: false, reason: "Estrutura não é obrigatória para este orçamento." };

    const operationalCategory = normalizeOperationalCategory((state.project as { operationalCategory?: string }).operationalCategory) as OperationalCategory;
    const complexity = normalizeOperationalComplexity((state.project as { complexity?: string }).complexity) as OperationalComplexity;
    if (!operationalCategory || !complexity) return { ok: false, reason: "Preencha categoria operacional e complexidade antes de regenerar." };

    const today = new Date().toISOString().slice(0, 10);
    const hasCompletedMilestone = state.activities.some((activity) => Boolean(activity.endDate) && String(activity.endDate) < today);
    const decision = decideStructureRegeneration({
      hasCompletedMilestone,
      hasManualConfirmation: withImpactConfirmation
    });

    if (!decision.allowed) return { ok: false, reason: decision.reason };

    const milestoneTitles = buildOperationalMilestones(operationalCategory, complexity);
    if (milestoneTitles.length === 0) return { ok: false, reason: "Não há template para a combinação selecionada." };

    const milestones: MilestoneDraftLocal[] = milestoneTitles.map((title) => ({ tempId: uid("ms"), Title: title.toUpperCase() }));
    const templateSeedKey = makeStructureTemplateSeedKey(operationalCategory, complexity);
    const activitySeed = buildSuggestedActivitiesByMilestone(templateSeedKey, milestoneTitles);
    const activities: ActivityDraftLocal[] = milestones.flatMap((milestone) => {
      const suggestions = activitySeed[milestone.Title] ?? [{ title: "", placeholder: "" }];
      const activityLimit = getActivityLimitByComplexity(complexity);
      return suggestions.slice(0, activityLimit).map((suggestion) => ({
        tempId: uid("ac"),
        Title: "",
        milestoneTempId: milestone.tempId,
        amountBrl: undefined,
        pepElement: undefined,
        startDate: state.project.startDate,
        endDate: state.project.endDate,
        supplier: undefined,
        activityDescription: "",
        placeholder: suggestion.placeholder || suggestion.title
      }));
    });

    const candidateHash = buildStructureFingerprint({ milestones, activities, project: state.project });
    const currentHash = buildStructureFingerprint({ milestones: state.milestones, activities: state.activities, project: state.project });
    if (candidateHash === currentHash) return { ok: true };

    setState((prev) => ({ ...prev, milestones, activities }));
    setStructureInitialized(true);
    if (explicit) setStructureRegeneratedExplicitly(true);
    return { ok: true };
  }, [needStructure, state.activities, state.milestones, state.project]);

  useEffect(() => {
    if (params.mode !== "create") return;
    if (!needStructure) {
      setStructureInitialized(false);
      return;
    }
    if (structureInitialized) return;

    const result = regenerateSuggestedStructure(true);
    if (result.ok) setStructureInitialized(true);
  }, [params.mode, needStructure, regenerateSuggestedStructure, structureInitialized]);

  useEffect(() => {
    if (!initialProjectId || params.mode === "create") return;

    (async () => {
      setLoadingHeader(true);
      setErrHeader("");
      try {
        const full = await getProjectById(initialProjectId);
        const loadedNeedStructure = requiresStructure(full.budgetBrl);
        if (!isDuplicating) {
          setProjectId(full.Id);
          setOriginalNeedStructure(params.mode === "edit" && loadedNeedStructure);
        }
        setState((prev) => ({ ...prev, project: { ...prev.project, ...sanitizeProjectForDuplication(full) } }));

        const loadStartedAt = performance.now();
        const [milestones, activities, peps] = await Promise.all([
          getMilestonesByProject(full.Id),
          getActivitiesBatchByProject(full.Id, { pageSize: 500, maxPages: 20 }),
          getPepsBatchByProject(full.Id, { pageSize: 500, maxPages: 20 })
        ]);

        const milestoneMap = new Map<number, ActivityDraftLocal[]>();
        const activityMap = new Map<number, PepDraftLocal[]>();

        const msLocal: MilestoneDraftLocal[] = milestones.map((m) => ({ tempId: `ms_${m.Id}`, Title: String(m.Title ?? "").toUpperCase() }));

        for (const a of activities) {
          const activity: ActivityDraftLocal = {
            tempId: `ac_${a.Id}`,
            Title: String(a.Title ?? "").toUpperCase(),
            milestoneTempId: `ms_${a.milestonesIdId}`,
            startDate: a.startDate ? String(a.startDate).slice(0, 10) : undefined,
            endDate: a.endDate ? String(a.endDate).slice(0, 10) : undefined,
            supplier: a.supplier ? String(a.supplier) : undefined,
            activityDescription: a.activityDescription ? String(a.activityDescription) : undefined,
            placeholder: String(a.Title ?? "").toUpperCase(),
            amountBrl: undefined,
            pepElement: undefined
          };
          const key = Number(a.milestonesIdId ?? -1);
          const group = milestoneMap.get(key) ?? [];
          group.push(activity);
          milestoneMap.set(key, group);
        }

        for (const p of peps) {
          const amount = typeof p.amountBrl === "number" ? p.amountBrl : Number(p.amountBrl);
          const pep: PepDraftLocal = {
            tempId: `pp_${p.Id}`,
            Title: String(p.Title ?? ""),
            year: Number(p.year ?? new Date().getFullYear()),
            amountBrl: Math.round(Number.isFinite(amount) ? amount : 0),
            activityTempId: `ac_${p.activitiesIdId}`
          };
          const key = Number(p.activitiesIdId ?? -1);
          const group = activityMap.get(key) ?? [];
          group.push(pep);
          activityMap.set(key, group);
        }

        const actsLocal: ActivityDraftLocal[] = milestones.flatMap((m) => (milestoneMap.get(m.Id) ?? []).map((activity) => {
          const activityId = Number(activity.tempId.replace("ac_", ""));
          const linkedPeps = activityMap.get(activityId) ?? [];
          const firstPep = linkedPeps[0];
          return {
            ...activity,
            amountBrl: firstPep ? Number(firstPep.amountBrl) : activity.amountBrl,
            pepElement: firstPep?.Title ?? activity.pepElement
          };
        }));
        const pepsLocal: PepDraftLocal[] = loadedNeedStructure
          ? actsLocal.flatMap((a) => {
            const activityId = Number(a.tempId.replace("ac_", ""));
            return activityMap.get(activityId) ?? [];
          })
          : peps.map((pep) => ({
            tempId: `pp_${pep.Id}`,
            Title: String(pep.Title ?? ""),
            year: Number(pep.year ?? new Date().getFullYear()),
            amountBrl: Math.round(Number(pep.amountBrl ?? 0)),
            activityTempId: pep.activitiesIdId ? `ac_${pep.activitiesIdId}` : undefined
          }));

        const loadFinishedAt = performance.now();
        const estimatedSequentialRoundTrips = 2 + milestones.length + activities.length;
        const optimizedRoundTrips = 3;
        console.info("[ProjectWizardModal] Carregamento de estrutura concluído", {
          projectId: full.Id,
          totalMilestones: milestones.length,
          totalActivities: activities.length,
          totalPeps: peps.length,
          durationMs: Math.round(loadFinishedAt - loadStartedAt),
          roundTripsBefore: estimatedSequentialRoundTrips,
          roundTripsAfter: optimizedRoundTrips,
          milestoneMapSize: milestoneMap.size,
          activityMapSize: activityMap.size
        });

        setState((prev) => ({ ...prev, milestones: msLocal, activities: actsLocal, peps: pepsLocal }));
      } catch (e: unknown) {
        const appError = normalizeError(e, "Erro ao carregar projeto do SharePoint.");
        setErrHeader(appError.userMessage);
      } finally {
        setLoadingHeader(false);
      }
    })();
  }, [initialProjectId, isDuplicating, params.mode]);

  const patchProject = useCallback((patch: Partial<ProjectDraft>) => {
    setState((s) => ({ ...s, project: { ...s.project, ...patch } }));
  }, []);

  return {
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
    structureRegeneratedExplicitly,
    structureInitialized
  };
}
