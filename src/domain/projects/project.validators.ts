import type { ProjectInput } from "../../application/contracts/project";
import { requiresStructure, toIntOrUndefined } from "./project.calculations";

export type WizardDraftState = {
  project: ProjectInput;
  milestones: MilestoneDraftLocal[];
  activities: ActivityDraftLocal[];
  peps: PepDraftLocal[];
};

export type MilestoneDraftLocal = { tempId: string; Title: string };
export type ActivityDraftLocal = {
  tempId: string;
  Title: string;
  milestoneTempId: string;
  amountBrl?: number;
  pepElement?: string;
  startDate?: string;
  endDate?: string;
  supplier?: string;
  activityDescription?: string;
  placeholder?: string;
};
export type PepDraftLocal = { tempId: string; Title: string; year: number; amountBrl: number; activityTempId?: string };

export type ValidationTimeReference = {
  todayIso?: string;
  todayIsoProvider?: () => string;
  nowProvider?: () => Date;
};

function isValidYearRange(year?: number, timeRef?: ValidationTimeReference) {
  if (!year) return false;
  const current = (timeRef?.nowProvider?.() ?? new Date()).getFullYear();
  return Number(year) >= current && Number(year) <= current + 5;
}

function resolveTodayIsoDate(timeRef?: ValidationTimeReference) {
  if (timeRef?.todayIso) return timeRef.todayIso;
  if (timeRef?.todayIsoProvider) return timeRef.todayIsoProvider();
  return new Date().toISOString().slice(0, 10);
}

export function validateProjectBasics(p: ProjectInput, timeRef?: ValidationTimeReference) {
  if (!String(p.Title ?? "").trim()) throw new Error("Title é obrigatório.");
  if (String(p.Title ?? "").trim().length > 25) throw new Error("Nome do Projeto deve ter no máximo 25 caracteres.");
  if (String(p.projectFunction ?? "").trim().length > 35) throw new Error("Função do Projeto deve ter no máximo 35 caracteres.");

  if (!String(p.fundingSource ?? "").trim()) throw new Error("Origem da Verba é obrigatória.");
  if (["REMANEJAMENTO", "CARRY OVER"].includes(String(p.fundingSource ?? "").trim()) && !String(p.sourceProjectCode ?? "").trim()) {
    throw new Error("Projeto é obrigatório para origem Remanejamento ou Carry Over.");
  }
  const b = toIntOrUndefined(p.budgetBrl);
  if (b === undefined || b <= 0) throw new Error("budgetBrl deve ser um inteiro > 0.");

  if (!isValidYearRange(p.approvalYear, timeRef)) throw new Error("Ano de Aprovação deve estar entre o ano atual e +5 anos.");

  if (!p.startDate) throw new Error("Data de Início é obrigatória.");
  const today = resolveTodayIsoDate(timeRef);
  if (p.startDate < today) throw new Error("Data de Início deve ser maior ou igual a hoje.");
  if (p.endDate && p.endDate < p.startDate) throw new Error("Data de Término não pode ser menor que a Data de Início.");
}

export function validateStructure(state: WizardDraftState) {
  const p = state.project;
  const need = requiresStructure(p.budgetBrl);

  if (state.peps.length === 0) throw new Error("Cadastre ao menos 1 PEP.");

  const totalPeps = state.peps.reduce((acc, x) => acc + (Number(x.amountBrl) || 0), 0);
  const budget = Number(p.budgetBrl ?? 0);
  if (!Number.isFinite(totalPeps) || totalPeps <= 0) throw new Error("Total de PEPs inválido.");
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("Orçamento inválido.");
  if (totalPeps !== budget) throw new Error(`Soma dos PEPs (${totalPeps}) deve ser igual ao budgetBrl (${budget}).`);

  if (!need) return;

  if (!String((p as { operationalCategory?: string }).operationalCategory ?? "").trim()) {
    throw new Error("Projetos ≥ 1M exigem Categoria Operacional.");
  }

  if (!String((p as { complexity?: string }).complexity ?? "").trim()) {
    throw new Error("Projetos ≥ 1M exigem Complexidade.");
  }

  if (state.milestones.length === 0) throw new Error("Projetos ≥ 1M exigem Milestones.");
  if (state.activities.length === 0) throw new Error("Projetos ≥ 1M exigem Activities.");

  const milestoneSet = new Set(state.milestones.map((m) => m.tempId));
  const projectStart = p.startDate;
  const projectEnd = p.endDate;

  const totalActivities = state.activities.reduce((acc, x) => acc + (Number(x.amountBrl) || 0), 0);
  if (totalActivities !== budget) throw new Error(`Soma das Atividades (${totalActivities}) deve ser igual ao budgetBrl (${budget}).`);

  for (const a of state.activities) {
    if (!milestoneSet.has(a.milestoneTempId)) {
      throw new Error("Activity com milestone inválido (consistência interna).");
    }


    if (projectStart && a.startDate && a.startDate < projectStart) {
      throw new Error("Início da atividade não pode ser antes da Data de Início do Projeto.");
    }

    if (a.startDate && a.endDate && a.endDate < a.startDate) {
      throw new Error("Término da atividade não pode ser antes do início da atividade.");
    }

    if (projectEnd && a.endDate && a.endDate > projectEnd) {
      throw new Error("Término da atividade não pode ser após a Data de Término do Projeto.");
    }
  }
}
