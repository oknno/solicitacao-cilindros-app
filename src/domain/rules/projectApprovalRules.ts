import type { RuleResult } from "./types";

export type ApprovalRulesInputSnapshot = {
  projectStatus?: string;
  milestonesCount: number;
  activitiesCount: number;
  pepsCount: number;
  totalProjectBrl: number;
};

function normalizeStatus(status?: string) {
  return (status ?? "").trim().toLowerCase();
}

function isStatusBlocked(status?: string) {
  const normalizedStatus = normalizeStatus(status);
  return normalizedStatus.length > 0 && normalizedStatus !== "rascunho" && normalizedStatus !== "reprovado";
}

export function executeProjectApprovalRules(snapshot: ApprovalRulesInputSnapshot): RuleResult[] {
  const results: RuleResult[] = [];

  if (isStatusBlocked(snapshot.projectStatus)) {
    results.push({
      id: "status.blocked",
      level: "error",
      title: "Status bloqueado",
      message: `Status atual (“${snapshot.projectStatus ?? "-"}”) não permite envio para aprovação.`,
    });
  } else {
    results.push({ id: "status.ok", level: "ok", title: "Status ok" });
  }

  if (snapshot.milestonesCount <= 0) {
    results.push({
      id: "milestones.required",
      level: "error",
      title: "Sem marcos",
      message: "Cadastre pelo menos 1 milestone antes de enviar para aprovação.",
    });
  } else {
    results.push({ id: "milestones.ok", level: "ok", title: "Marcos ok" });
  }

  if (snapshot.activitiesCount <= 0) {
    results.push({
      id: "activities.required",
      level: "error",
      title: "Sem atividades",
      message: "Cadastre pelo menos 1 activity antes de enviar para aprovação.",
    });
  } else {
    results.push({ id: "activities.ok", level: "ok", title: "Atividades ok" });
  }

  if (snapshot.pepsCount <= 0) {
    results.push({
      id: "peps.required",
      level: "error",
      title: "Sem PEPs",
      message: "Cadastre pelo menos 1 PEP antes de enviar para aprovação.",
    });
  } else {
    results.push({ id: "peps.ok", level: "ok", title: "PEPs ok" });
  }

  if (!Number.isFinite(snapshot.totalProjectBrl) || snapshot.totalProjectBrl <= 0) {
    results.push({
      id: "total.invalid",
      level: "error",
      title: "Total inválido",
      message: "O total consolidado de PEPs está zero ou inválido.",
    });
  } else {
    results.push({ id: "total.ok", level: "ok", title: "Total ok" });
  }

  return results;
}
