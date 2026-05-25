import type { ProjectRow } from "../../../../services/sharepoint/projectsApi";

const PROJECTS_EXPORT_COLUMNS: Array<{ header: string; getValue: (project: ProjectRow) => string | number | undefined }> = [
  { header: "ID", getValue: (project) => project.Id },
  { header: "codigoSAP", getValue: (project) => project.codigoSAP },
  { header: "Projeto", getValue: (project) => project.Title },
  { header: "budgetBrl", getValue: (project) => project.budgetBrl },
  { header: "Unidade", getValue: (project) => project.unit },
  { header: "Status", getValue: (project) => project.status }
];

function csvEscape(value: string | number | undefined): string {
  if (value == null) return "";
  const normalized = String(value).replace(/\r?\n|\r/g, " ").trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

export function exportProjectsCsv(items: ProjectRow[]): boolean {
  if (!items.length) return false;

  const lines = [
    PROJECTS_EXPORT_COLUMNS.map((column) => csvEscape(column.header)).join(";"),
    ...items.map((project) =>
      PROJECTS_EXPORT_COLUMNS.map((column) => csvEscape(column.getValue(project))).join(";")
    )
  ];

  const csv = `\ufeff${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateSuffix = new Date().toISOString().slice(0, 10);

  link.href = href;
  link.download = `projetos-${dateSuffix}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
  return true;
}
