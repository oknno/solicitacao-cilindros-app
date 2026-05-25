import type { ProjectRow } from "../../../../services/sharepoint/projectsApi";
import type { ActivityRow } from "../../../../services/sharepoint/activitiesApi";
import type { MilestoneRow } from "../../../../services/sharepoint/milestonesApi";
import type { PepRow } from "../../../../services/sharepoint/pepsApi";
import { requiresStructure } from "../../../../domain/projects/project.calculations";
import { projectFieldLabel } from "../fieldLabels";
import { fmtDate, fmtMoney, getSapCodeDisplay } from "./projectSummaryFormatters";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderField(label: string, value: string, colSpan?: number): string {
  const colSpanStyle = colSpan ? ` style="grid-column: span ${colSpan}"` : "";

  return `
    <div class="field-item"${colSpanStyle}>
      <div class="field-label">${escapeHtml(label)}</div>
      <div class="field-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderSection(section: ProjectSection, fieldsHtml: string): string {
  return `
    <section class="summary-section">
      <div class="summary-section-header">
        <h3>${escapeHtml(section.title)}</h3>
        ${section.subtitle ? `<p>${escapeHtml(section.subtitle)}</p>` : ""}
      </div>
      <div class="summary-grid" style="--cols: ${section.columns}">${fieldsHtml}</div>
    </section>
  `;
}

type ScheduleExportData = {
  milestones: MilestoneRow[];
  activities: ActivityRow[];
  peps: PepRow[];
};

type GanttItem = {
  milestoneTitle: string;
  activityTitle: string;
  startDate: string;
  endDate: string;
};

type GanttBounds = {
  min: number;
  max: number;
};

type MilestoneGroup = {
  milestoneName: string;
  startDateMin: string;
  endDateMax: string;
  activities: GanttItem[];
};

type PepSummaryItem = {
  primaryText: string;
  secondaryText: string;
  amountBrl: number;
};

const MONEY_FIELDS: Array<keyof ProjectRow> = ["budgetBrl", "roceGain", "roceLoss"];
const DATE_FIELDS: Array<keyof ProjectRow> = ["startDate", "endDate"];

type ProjectSection = {
  title: string;
  subtitle?: string;
  columns: number;
  fields: Array<{
    field: keyof ProjectRow;
    colSpan?: number;
  }>;
};

const PROJECT_SECTIONS: ProjectSection[] = [
  {
    title: "1. Sobre o Projeto",
    subtitle: "Dados principais para identificação e planejamento.",
    columns: 4,
    fields: [
      { field: "Title", colSpan: 2 },
      { field: "budgetBrl", colSpan: 2 },
      { field: "investmentLevel" },
      { field: "approvalYear" },
      { field: "startDate" },
      { field: "endDate" },
      { field: "complexity", colSpan: 2 },
      { field: "operationalCategory", colSpan: 2 },
      { field: "projectFunction", colSpan: 4 }
    ]
  },
  {
    title: "2. Origem e Programa",
    subtitle: "Vínculo da verba com iniciativa e projeto de referência.",
    columns: 3,
    fields: [{ field: "fundingSource" }, { field: "program" }, { field: "sourceProjectCode" }]
  },
  {
    title: "3. Informação Operacional",
    subtitle: "Estrutura organizacional e responsáveis pela execução.",
    columns: 2,
    fields: [
      { field: "company" },
      { field: "center" },
      { field: "unit" },
      { field: "location" },
      { field: "depreciationCostCenter" },
      { field: "category" },
      { field: "investmentType" },
      { field: "assetType" },
      { field: "projectUser" },
      { field: "projectLeader" }
    ]
  },
  {
    title: "4. Detalhamento Complementar",
    subtitle: "Contexto do problema e direcionamento da solução.",
    columns: 2,
    fields: [
      { field: "businessNeed", colSpan: 2 },
      { field: "proposedSolution", colSpan: 2 }
    ]
  },
  {
    title: "5. Indicadores de Desempenho",
    subtitle: "Indicadores e metas esperadas com a implementação.",
    columns: 4,
    fields: [
      { field: "kpiType", colSpan: 2 },
      { field: "kpiName", colSpan: 2 },
      { field: "kpiCurrent", colSpan: 2 },
      { field: "kpiExpected", colSpan: 2 },
      { field: "kpiDescription", colSpan: 4 }
    ]
  },
  {
    title: "6. ROCE",
    subtitle: "Ganhos, perdas e classificação financeira do investimento.",
    columns: 6,
    fields: [
      { field: "roceClassification", colSpan: 2 },
      { field: "roceGain", colSpan: 2 },
      { field: "roceLoss", colSpan: 2 },
      { field: "roceGainDescription", colSpan: 3 },
      { field: "roceLossDescription", colSpan: 3 }
    ]
  }
];

function formatFieldValue(project: ProjectRow, field: keyof ProjectRow): string {
  const value = project[field];

  if (MONEY_FIELDS.includes(field)) {
    return fmtMoney(typeof value === "number" ? value : Number(value));
  }

  if (DATE_FIELDS.includes(field)) {
    return fmtDate(typeof value === "string" ? value : undefined);
  }

  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized == null || normalized === "") return "-";

  return String(normalized);
}

function getBarPosition(startDate: string, endDate: string, bounds: GanttBounds) {
  const total = Math.max(bounds.max - bounds.min, 1);
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const left = ((start - bounds.min) / total) * 100;
  const width = (Math.max(end - start, 86400000) / total) * 100;

  return {
    left,
    width: Math.min(width, 100 - left)
  };
}

function groupByMilestone(items: GanttItem[]) {
  return Object.values(
    items.reduce<Record<string, MilestoneGroup>>((acc, item) => {
      const current = acc[item.milestoneTitle];
      if (!current) {
        acc[item.milestoneTitle] = {
          milestoneName: item.milestoneTitle,
          startDateMin: item.startDate,
          endDateMax: item.endDate,
          activities: [item]
        };
        return acc;
      }

      acc[item.milestoneTitle] = {
        ...current,
        startDateMin: item.startDate < current.startDateMin ? item.startDate : current.startDateMin,
        endDateMax: item.endDate > current.endDateMax ? item.endDate : current.endDateMax,
        activities: [...current.activities, item]
      };
      return acc;
    }, {})
  );
}

function toDateLabel(value?: string) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function renderGanttSection(schedule: ScheduleExportData): string {
  const ganttItems: GanttItem[] = schedule.activities
    .filter((activity) => activity.startDate && activity.endDate)
    .map((activity) => ({
      milestoneTitle: schedule.milestones.find((milestone) => milestone.Id === activity.milestonesIdId)?.Title ?? "MARCO",
      activityTitle: activity.Title || "ATIVIDADE",
      startDate: String(activity.startDate).slice(0, 10),
      endDate: String(activity.endDate).slice(0, 10)
    }));

  if (ganttItems.length === 0) {
    return `
      <section class="summary-section gantt-wrap">
        <div class="summary-section-header">
          <h3>8. Cronograma (Gantt)</h3>
          <p>Visão consolidada dos marcos e atividades planejadas.</p>
        </div>
        <p class="gantt-empty">Sem atividades com início e término para exibir cronograma.</p>
      </section>
    `;
  }

  const starts = ganttItems.map((item) => new Date(`${item.startDate}T00:00:00`).getTime());
  const ends = ganttItems.map((item) => new Date(`${item.endDate}T00:00:00`).getTime());
  const bounds: GanttBounds = { min: Math.min(...starts), max: Math.max(...ends) };
  const rangeLabel = `${new Date(bounds.min).toLocaleDateString("pt-BR")} - ${new Date(bounds.max).toLocaleDateString("pt-BR")}`;
  const groups = groupByMilestone(ganttItems);

  const groupsHtml = groups.map((group) => {
    const milestoneBar = getBarPosition(group.startDateMin, group.endDateMax, bounds);
    const activitiesHtml = group.activities.map((item) => {
      const activityBar = getBarPosition(item.startDate, item.endDate, bounds);
      return `
        <div class="gantt-activity">
          <div class="gantt-row-label">
            <span class="gantt-name">${escapeHtml(item.activityTitle)}</span>
            <span class="gantt-date">${escapeHtml(toDateLabel(item.startDate))} - ${escapeHtml(toDateLabel(item.endDate))}</span>
          </div>
          <div class="gantt-track">
            <div class="gantt-bar activity" style="left:${activityBar.left}%;width:${activityBar.width}%;"></div>
          </div>
        </div>
      `;
    }).join("\n");

    return `
      <div class="gantt-group">
        <div class="gantt-row-label gantt-group-header">
          <span class="gantt-name">${escapeHtml(group.milestoneName)}</span>
          <span class="gantt-date">${escapeHtml(toDateLabel(group.startDateMin))} - ${escapeHtml(toDateLabel(group.endDateMax))}</span>
        </div>
        <div class="gantt-track">
          <div class="gantt-bar milestone" style="left:${milestoneBar.left}%;width:${milestoneBar.width}%;"></div>
        </div>
        <div class="gantt-activities">
          ${activitiesHtml}
        </div>
      </div>
    `;
  }).join("\n");

  return `
    <section class="summary-section gantt-wrap">
      <div class="summary-section-header">
        <h3>8. Cronograma (Gantt)</h3>
        <p>Visão consolidada dos marcos e atividades planejadas.</p>
      </div>
      <div class="gantt-period">Período do cronograma: ${escapeHtml(rangeLabel)}</div>
      <div class="gantt-legend" aria-label="Legenda do cronograma">
        <span class="gantt-legend-item"><span class="gantt-legend-icon milestone"></span> Marco</span>
        <span class="gantt-legend-item"><span class="gantt-legend-icon activity"></span> Atividade</span>
      </div>
      <div class="gantt-grid">${groupsHtml}</div>
    </section>
  `;
}

function renderPepSummarySection(schedule: ScheduleExportData, needStructure: boolean): string {
  const headerTitle = needStructure ? "7. Resumo de Estrutura e PEPs" : "7. Resumo de PEPs";
  const firstColumnLabel = needStructure ? "Marco" : "Elemento PEP";
  const secondColumnLabel = needStructure ? "Atividade" : "Ano";
  const tableGridClass = needStructure ? "pep-table-grid-structure" : "pep-table-grid-simple";

  const pepItems: PepSummaryItem[] = schedule.peps.map((pep) => {
    const activity = schedule.activities.find((item) => item.Id === pep.activitiesIdId);
    const milestone = schedule.milestones.find((item) => item.Id === activity?.milestonesIdId);

    return {
      primaryText: needStructure ? (milestone?.Title ?? "—") : pep.Title,
      secondaryText: needStructure ? (activity?.Title ?? pep.Title) : String(pep.year),
      amountBrl: Number(pep.amountBrl) || 0
    };
  });

  const rowsHtml = pepItems.map((item) => `
    <article class="pep-summary-row ${tableGridClass}">
      <div class="pep-cell pep-primary" title="${escapeHtml(item.primaryText)}">${escapeHtml(item.primaryText)}</div>
      <div class="pep-cell pep-secondary" title="${escapeHtml(item.secondaryText)}">${escapeHtml(item.secondaryText)}</div>
      <div class="pep-cell pep-value">${escapeHtml(item.amountBrl.toLocaleString("pt-BR"))}</div>
    </article>
  `).join("\n");

  return `
    <section class="summary-section">
      <div class="summary-section-header">
        <h3>${headerTitle}</h3>
      </div>
      ${pepItems.length === 0
        ? `<div class="pep-empty">Nenhum PEP cadastrado para este projeto.</div>`
        : `
          <div class="pep-summary-table">
            <header class="pep-summary-header ${tableGridClass}">
              <span>${firstColumnLabel}</span>
              <span>${secondColumnLabel}</span>
              <span class="pep-value">Valor (R$)</span>
            </header>
            ${rowsHtml}
          </div>
        `}
    </section>
  `;
}

function buildProjectSummaryHtml(project: ProjectRow, schedule: ScheduleExportData): string {
  const title = String(project.Title ?? "-");
  const status = String(project.status ?? "Rascunho");
  const sapCodeLabel = projectFieldLabel("codigoSAP");
  const needStructure = requiresStructure(project.budgetBrl);

  const sectionsHtml = PROJECT_SECTIONS.map((section) => {
    const sectionFieldsHtml = section.fields
      .map(({ field, colSpan }) => renderField(projectFieldLabel(field), formatFieldValue(project, field), colSpan))
      .join("\n");

    return renderSection(section, sectionFieldsHtml);
  }).join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Resumo do Projeto #${project.Id}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      margin: 24px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
    .title { font-size: 24px; font-weight: 700; margin: 0; }
    .status { font-size: 14px; font-weight: 700; }
    .sap { font-size: 14px; font-weight: 600; margin: 0 0 14px; break-inside: avoid; page-break-inside: avoid; }
    .sections { margin-top: 8px; display: grid; gap: 12px; }
    .summary-section { border: 1px solid #d1d5db; border-radius: 16px; background: #ffffff; padding: 16px; display: grid; gap: 12px; break-inside: avoid; page-break-inside: avoid; }
    .summary-section-header { display: grid; gap: 4px; }
    .summary-section-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: #111827; }
    .summary-section-header p { margin: 0; font-size: 12px; color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); gap: 10px 12px; align-items: start; }
    .field-item { break-inside: avoid; page-break-inside: avoid; border: 1px solid #d1d5db; border-radius: 12px; background: #f9fafb; padding: 10px 12px; }
    .field-label { font-size: 11px; font-weight: 700; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
    .field-value { font-size: 13px; font-weight: 600; line-height: 1.45; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
    .gantt-wrap { margin-top: 0; }
    .gantt-empty { border: 1px dashed #9ca3af; border-radius: 12px; padding: 14px; font-size: 13px; color: #6b7280; text-align: center; margin: 0; }
    .gantt-period { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
    .gantt-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-bottom: 8px; font-size: 11px; font-weight: 600; color: #374151; }
    .gantt-legend-item { display: inline-flex; align-items: center; gap: 6px; }
    .gantt-legend-icon { width: 14px; height: 10px; border-radius: 999px; border: 1px solid transparent; display: inline-block; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .gantt-legend-icon.milestone { background: #f59e0b; border-color: #b45309; background-image: repeating-linear-gradient(45deg, rgb(0 0 0 / 0.18) 0 4px, transparent 4px 8px); }
    .gantt-legend-icon.activity { background: #06b6d4; border-color: #0e7490; background-image: repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.18) 0 3px, transparent 3px 7px); }
    .gantt-grid { display: grid; gap: 8px; }
    .gantt-group { display: grid; gap: 6px; break-inside: avoid; page-break-inside: avoid; margin: 2px 0; }
    .gantt-activities { display: grid; gap: 6px; }
    .gantt-activity { display: grid; gap: 4px; }
    .gantt-row-label { display: flex; gap: 8px; align-items: center; justify-content: space-between; font-size: 12px; }
    .gantt-group-header { margin-bottom: 2px; }
    .gantt-prefix { font-size: 10px; letter-spacing: 0.04em; color: #334155; font-weight: 800; margin-right: 4px; }
    .gantt-name { min-width: 0; font-weight: 600; }
    .gantt-date { text-align: right; color: #374151; white-space: nowrap; }
    .gantt-track {
      position: relative;
      height: 12px;
      border-radius: 999px;
      background: #d1d5db;
      border: 1px solid #9ca3af;
      overflow: hidden;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .gantt-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      border-radius: 999px;
      border: 1px solid transparent;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .gantt-bar.milestone {
      background: #f59e0b;
      border-color: #b45309;
      background-image: repeating-linear-gradient(45deg, rgb(0 0 0 / 0.18) 0 4px, transparent 4px 8px);
    }
    .gantt-bar.activity {
      background: #06b6d4;
      border-color: #0e7490;
      background-image: repeating-linear-gradient(-45deg, rgb(0 0 0 / 0.18) 0 3px, transparent 3px 7px);
    }
    .pep-summary-table { border: 1px solid #d1d5db; border-radius: 12px; overflow: hidden; background: #ffffff; }
    .pep-table-grid-structure { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr) minmax(130px, 0.7fr); gap: 16px; align-items: start; }
    .pep-table-grid-simple { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(84px, 0.5fr) minmax(130px, 0.7fr); gap: 16px; align-items: start; }
    .pep-summary-header { padding: 12px 14px; border-bottom: 1px solid #d1d5db; background: #f3f4f6; color: #6b7280; font-size: 12px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; }
    .pep-summary-row { padding: 14px; border-bottom: 1px solid #e5e7eb; background: #ffffff; }
    .pep-summary-row:last-child { border-bottom: none; }
    .pep-cell { min-width: 0; font-size: 14px; line-height: 1.45; color: #111827; }
    .pep-primary { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pep-secondary { font-weight: 500; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .pep-value { text-align: right; font-weight: 600; white-space: nowrap; }
    .pep-empty { border: 1px dashed #9ca3af; border-radius: 12px; padding: 14px; font-size: 13px; color: #6b7280; text-align: center; }

    @media print {
      @page { margin: 12mm; size: auto; }
      body { margin: 0; font-size: 11px; }
      .header { margin-bottom: 10px; }
      .title { font-size: 20px; }
      .status { font-size: 13px; }
      .sap { font-size: 12px; margin-bottom: 12px; }
      .summary-grid { gap: 8px 10px; }
      .summary-section-header h3 { font-size: 14px; }
      .summary-section-header p,
      .field-label,
      .gantt-period,
      .gantt-legend,
      .gantt-row-label,
      .pep-summary-header { font-size: 10px; }
      .field-value { font-size: 11px; }
      .pep-cell { font-size: 11px; }
      .gantt-track { height: 10px; }
    }

    @media print and (max-width: 680px) {
      .summary-grid { grid-template-columns: 1fr; }
      .field-item { grid-column: span 1 !important; }
      .sections { grid-template-columns: 1fr; }
      .pep-table-grid-structure,
      .pep-table-grid-simple {
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
      }
      .pep-value {
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="status">${escapeHtml(status)}</div>
  </header>
  <p class="sap">${escapeHtml(sapCodeLabel)}: ${escapeHtml(getSapCodeDisplay(project))}</p>

  <section class="sections">
    ${sectionsHtml}
    ${renderPepSummarySection(schedule, needStructure)}
    ${renderGanttSection(schedule)}
  </section>
</body>
</html>`;
}

export function exportProjectView(project: ProjectRow, schedule: ScheduleExportData): void {
  const html = buildProjectSummaryHtml(project, schedule);
  const printWindow = window.open("", "_blank", "width=1024,height=768");

  if (!printWindow) {
    throw new Error("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-up está ativo.");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const tryPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === "complete") {
    tryPrint();
    return;
  }

  printWindow.addEventListener("load", tryPrint, { once: true });
}
