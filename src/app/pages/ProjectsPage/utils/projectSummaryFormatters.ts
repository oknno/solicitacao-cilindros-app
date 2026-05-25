import type { ProjectRow } from "../../../../services/sharepoint/projectsApi";

export function resolveStatusTone(status: string): "neutral" | "info" | "success" | "danger" | "warning" {
  const normalized = status.trim().toLowerCase();

  if (normalized.includes("em aprova")) return "info";
  if (normalized.includes("aprovado")) return "success";
  if (normalized.includes("reprov")) return "danger";
  if (normalized.includes("rascun")) return "neutral";
  return "warning";
}

export function getSapCodeDisplay(project: ProjectRow): string {
  const status = String(project.status ?? "").trim().toLowerCase();
  if (!status.includes("aprovado")) return "Pendente";

  const sapCode = String(project.codigoSAP ?? "").trim();
  return sapCode || "Pendente";
}

export function fmtMoney(v?: number): string {
  if (v == null || !Number.isFinite(Number(v))) return "-";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(v?: string): string {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}

export function truncateText(s: string, max: number): string {
  const text = String(s ?? "");
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
