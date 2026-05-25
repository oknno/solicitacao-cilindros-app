import type { ProjectRow } from "./projectsApi.ts";
import { updateProject } from "./projectsApi.ts";
import { canBackToDraft, canSendToApproval } from "../../domain/projects/projectStatusPolicies.ts";

export type ApprovalResult = { newStatus: string };

function norm(s?: string) {
  return (s ?? "").trim().toLowerCase();
}

export function isLockedStatus(status?: string): boolean {
  const st = norm(status);
  return st === "em aprovação" || st === "em aprovacao" || st === "aprovado";
}

export async function sendToApproval(p: ProjectRow): Promise<ApprovalResult> {
  const check = canSendToApproval(p);
  if (!check.ok) {
    throw new Error(check.reason ?? "Não é possível enviar para aprovação.");
  }

  const title = (p.Title ?? "").trim();
  if (!title) throw new Error("Title vazio. Corrija antes de enviar para aprovação.");

  const newStatus = "Em Aprovação";
  await updateProject(p.Id, { status: newStatus });
  return { newStatus };
}

export async function backToDraft(p: ProjectRow): Promise<void> {
  const check = canBackToDraft(p);
  if (!check.ok) {
    throw new Error(check.reason ?? "Não é possível voltar para rascunho.");
  }

  const newStatus = "Rascunho";
  await updateProject(p.Id, { status: newStatus });
}

function isInApprovalStatus(status?: string): boolean {
  const st = norm(status);
  return st === "em aprovação" || st === "em aprovacao";
}

function assertCanChangeApprovalStatus(p: ProjectRow, isAdmin: boolean) {
  if (!isAdmin) {
    throw new Error("Apenas administradores podem aprovar ou reprovar projetos.");
  }
  if (!isInApprovalStatus(p.status)) {
    throw new Error("Somente projetos com status Em Aprovação podem ser aprovados ou reprovados.");
  }
}

export async function approveProject(p: ProjectRow, args: { isAdmin: boolean; codigoSAP: string }): Promise<ApprovalResult> {
  assertCanChangeApprovalStatus(p, args.isAdmin);

  const codigoSAP = (args.codigoSAP ?? "").trim();
  if (!codigoSAP) {
    throw new Error("Código SAP é obrigatório para aprovar o projeto.");
  }

  const newStatus = "Aprovado";
  await updateProject(p.Id, { status: newStatus, codigoSAP });
  return { newStatus };
}

export async function rejectProject(p: ProjectRow, args: { isAdmin: boolean }): Promise<ApprovalResult> {
  assertCanChangeApprovalStatus(p, args.isAdmin);

  const newStatus = "Reprovado";
  await updateProject(p.Id, { status: newStatus });
  return { newStatus };
}
