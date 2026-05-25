import type { CSSProperties, ReactNode } from "react";

import type { WizardDraftState } from "../../../../../domain/projects/project.validators";
import { projectFieldLabel } from "../../fieldLabels";
import { SectionTitle } from "./WizardUi";
import { uiTokens } from "../../../../components/ui/tokens";
import { PepSummaryList } from "./PepSummaryList";
import { GanttPreview } from "./GanttPreview";

type SummaryValue = string | number | undefined;
function renderValue(value: SummaryValue) {
  return value === undefined || value === "" ? "—" : String(value);
}

function getSummaryFieldSpan(value: SummaryValue, forceSpan?: 1 | 2 | 3): 1 | 2 | 3 {
  if (forceSpan) {
    return forceSpan;
  }

  const renderedValue = renderValue(value);
  const hasLineBreak = renderedValue.includes("\n");
  const normalizedLength = renderedValue.trim().length;

  if (hasLineBreak || normalizedLength > 110) {
    return 3;
  }

  if (normalizedLength > 55) {
    return 2;
  }

  return 1;
}

function toDateLabel(value?: string) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function SummaryField(props: {
  label: string;
  value: SummaryValue;
  minWidth?: number;
  colSpan?: 1 | 2 | 3 | 4;
  forceSpan?: 1 | 2 | 3;
}) {
  const colSpan = props.colSpan ?? getSummaryFieldSpan(props.value, props.forceSpan);

  return (
    <div
      className="summary-field"
      style={{
        minWidth: props.minWidth ?? 0,
        gridColumn: `span ${colSpan}`,
        border: `1px solid ${uiTokens.colors.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        background: uiTokens.colors.surface
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: uiTokens.colors.textMuted,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.04em"
        }}
      >
        {props.label}
      </div>
      <div style={{ fontSize: 14, color: uiTokens.colors.textStrong, lineHeight: 1.45, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{renderValue(props.value)}</div>
    </div>
  );
}

function SummarySection(props: {
  title: string;
  subtitle?: string;
  columns?: number;
  highlight?: boolean;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    border: `1px solid ${props.highlight ? uiTokens.colors.borderStrong : uiTokens.colors.border}`,
    borderRadius: 16,
    padding: 20,
    display: "grid",
    gap: 14,
    background: props.highlight ? uiTokens.colors.surfaceMuted : uiTokens.colors.surface
  };

  const childCount = Array.isArray(props.children) ? props.children.length : 1;

  return (
    <section style={style}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: uiTokens.colors.textStrong }}>{props.title}</h3>
          {props.subtitle && <p style={{ margin: 0, fontSize: 12, color: uiTokens.colors.textMuted }}>{props.subtitle}</p>}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: uiTokens.colors.textMuted,
            border: `1px solid ${uiTokens.colors.border}`,
            borderRadius: 999,
            padding: "4px 10px",
            background: uiTokens.colors.surface
          }}
        >
          {childCount} campo{childCount > 1 ? "s" : ""}
        </span>
      </div>
      <div
        className="summary-section-grid"
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: `repeat(${props.columns ?? 3}, minmax(0, 1fr))`
        }}
      >
        {props.children}
      </div>
    </section>
  );
}

export function ReviewStep(props: {
  projectId: number | null;
  state: WizardDraftState;
  needStructure: boolean;
}) {
  const { project, milestones, activities, peps } = props.state;

  return (
    <div style={{ padding: 14, display: "grid", gap: 16 }}>
      <style>{`
        .summary-highlight-card {
          border: 1px solid ${uiTokens.colors.borderStrong};
          border-radius: 16px;
          padding: 14px 16px;
          background: ${uiTokens.colors.surface};
          display: grid;
          gap: 6px;
        }

        @media (max-width: 900px) {
          .summary-section-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .summary-field {
            grid-column: span 1 !important;
          }
        }

      `}</style>
      <SectionTitle title="Resumo para validação" subtitle="Conferência final das informações preenchidas nas etapas 1 e 2." />

      <SummarySection title="1. Sobre o Projeto" subtitle="Dados principais para identificação e planejamento." columns={4} highlight>
        <SummaryField label={projectFieldLabel("Title")} value={project.Title} colSpan={2} />
        <SummaryField label="Orçamento (R$)" value={project.budgetBrl?.toLocaleString("pt-BR")} colSpan={2} />
        <SummaryField label={projectFieldLabel("investmentLevel")} value={project.investmentLevel} />
        <SummaryField label={projectFieldLabel("approvalYear")} value={project.approvalYear} />
        <SummaryField label={projectFieldLabel("startDate")} value={toDateLabel(project.startDate)} />
        <SummaryField label={projectFieldLabel("endDate")} value={toDateLabel(project.endDate)} />
        <SummaryField label="Categoria operacional" value={project.operationalCategory} colSpan={2} />
        <SummaryField label="Complexidade" value={project.complexity} colSpan={2} />
        <SummaryField label={projectFieldLabel("projectFunction")} value={project.projectFunction} colSpan={4} />
      </SummarySection>

      <SummarySection title="2. Origem e Programa" subtitle="Vínculo da verba com iniciativa e projeto de referência." columns={3}>
        <SummaryField label="Origem da verba" value={project.fundingSource} />
        <SummaryField label="Programa" value={project.program} />
        {["REMANEJAMENTO", "CARRY OVER"].includes(project.fundingSource ?? "") && <SummaryField label="Projeto" value={project.sourceProjectCode} />}
      </SummarySection>

      <SummarySection title="3. Informação Operacional" subtitle="Estrutura organizacional e responsáveis pela execução." columns={2}>
        <SummaryField label="Empresa" value={project.company} />
        <SummaryField label="Centro" value={project.center} />
        <SummaryField label="Unidade" value={project.unit} />
        <SummaryField label="Local" value={project.location} />
        <SummaryField label="Centro de custo depreciação" value={project.depreciationCostCenter} />
        <SummaryField label="Categoria" value={project.category} />
        <SummaryField label="Tipo de investimento" value={project.investmentType} />
        <SummaryField label="Tipo de ativo" value={project.assetType} />
        <SummaryField label="Usuário do projeto" value={project.projectUser} />
        <SummaryField label="Líder do projeto" value={project.projectLeader} />
      </SummarySection>

      <SummarySection title="4. Detalhamento Complementar" subtitle="Contexto do problema e direcionamento da solução." columns={2}>
        <SummaryField label="Necessidade do negócio" value={project.businessNeed} forceSpan={2} />
        <SummaryField label="Solução proposta" value={project.proposedSolution} forceSpan={2} />
      </SummarySection>

      <SummarySection title="5. Indicadores de Desempenho" subtitle="Indicadores e metas esperadas com a implementação." columns={4}>
        <SummaryField label="Tipo de KPI" value={project.kpiType} colSpan={2} />
        <SummaryField label="Nome do KPI" value={project.kpiName} colSpan={2} />
        <SummaryField label="KPI atual" value={project.kpiCurrent} colSpan={2} />
        <SummaryField label="KPI esperado" value={project.kpiExpected} colSpan={2} />
        <SummaryField label="Descrição do KPI" value={project.kpiDescription} colSpan={4} />
      </SummarySection>

      <SummarySection title="6. ROCE" subtitle="Ganhos, perdas e classificação financeira do investimento." columns={6}>
        <SummaryField label="Classificação ROCE" value={project.roceClassification} colSpan={2} />
        <SummaryField label="Ganho ROCE (R$)" value={project.roceGain?.toLocaleString("pt-BR")} colSpan={2} />
        <SummaryField label="Perda ROCE (R$)" value={project.roceLoss?.toLocaleString("pt-BR")} colSpan={2} />
        <SummaryField label="Descrição do ganho" value={project.roceGainDescription} colSpan={3} />
        <SummaryField label="Descrição da perda" value={project.roceLossDescription} colSpan={3} />
      </SummarySection>

      <SummarySection title={props.needStructure ? "7. Resumo de Estrutura e PEPs" : "7. Resumo de PEPs"} columns={1}>
        <PepSummaryList
          needStructure={props.needStructure}
          peps={peps}
          activities={activities}
          milestones={milestones}
        />
      </SummarySection>

      {props.needStructure && (
        <SummarySection title="8. Cronograma (Gantt)" columns={1}>
          <GanttPreview milestones={milestones} activities={activities} />
        </SummarySection>
      )}

      {props.projectId && (
        <div style={{ fontSize: 12, color: uiTokens.colors.textMuted }}>
          ID do projeto no SharePoint: <b>{props.projectId}</b>
        </div>
      )}
    </div>
  );
}
