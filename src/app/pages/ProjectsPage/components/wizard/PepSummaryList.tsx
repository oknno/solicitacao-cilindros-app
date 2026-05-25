import type { CSSProperties } from "react";

import type { ActivityDraftLocal, MilestoneDraftLocal, PepDraftLocal } from "../../../../../domain/projects/project.validators";
import { uiTokens } from "../../../../components/ui/tokens";

type PepSummaryListProps = {
  needStructure: boolean;
  peps: PepDraftLocal[];
  activities: ActivityDraftLocal[];
  milestones: MilestoneDraftLocal[];
};

type PepSummaryItem = {
  pepTitle: string;
  year: number;
  activity?: string;
  milestone?: string;
  amountBrl: number;
};

const pepSummaryListStyles: Record<string, CSSProperties> = {
  stack: { display: "grid", gap: 8 },
  table: {
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: 12,
    overflow: "hidden",
    background: uiTokens.colors.surface
  },
  headerRow: {
    display: "grid",
    gap: 16,
    padding: "12px 14px",
    borderBottom: `1px solid ${uiTokens.colors.border}`,
    background: uiTokens.colors.surfaceMuted,
    color: uiTokens.colors.textMuted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.3,
    textTransform: "uppercase"
  },
  card: {
    display: "grid",
    gap: 16,
    padding: "14px",
    borderBottom: `1px solid ${uiTokens.colors.borderMuted}`,
    background: uiTokens.colors.surface,
    transition: "background-color 140ms ease"
  },
  cell: { minWidth: 0 },
  primaryText: {
    fontSize: 14,
    fontWeight: 600,
    color: uiTokens.colors.textStrong,
    lineHeight: 1.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: 500,
    color: uiTokens.colors.textStrong,
    lineHeight: 1.5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  valueCell: { textAlign: "right" },
  valueText: {
    fontSize: 14,
    fontWeight: 600,
    color: uiTokens.colors.textStrong,
    whiteSpace: "nowrap"
  },
  emptyState: {
    border: `1px dashed ${uiTokens.colors.borderStrong}`,
    borderRadius: 12,
    padding: 20,
    display: "grid",
    justifyItems: "center",
    gap: 8,
    background: uiTokens.colors.surface,
    color: uiTokens.colors.textMuted
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: uiTokens.colors.surfaceMuted,
    color: uiTokens.colors.text,
    fontSize: 18
  },
  emptyTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: uiTokens.colors.textStrong
  },
  emptyDescription: {
    margin: 0,
    fontSize: 13,
    color: uiTokens.colors.textMuted
  }
};

function getGridTemplate(needStructure: boolean) {
  return needStructure
    ? "minmax(0, 1.05fr) minmax(0, 1.35fr) minmax(150px, 0.7fr)"
    : "minmax(0, 1.5fr) minmax(84px, 0.5fr) minmax(150px, 0.7fr)";
}

function mapPepSummaryItems(peps: PepDraftLocal[], activities: ActivityDraftLocal[], milestones: MilestoneDraftLocal[]): PepSummaryItem[] {
  return peps.map((pep) => {
    const activity = activities.find((item) => item.tempId === pep.activityTempId);
    const milestone = milestones.find((item) => item.tempId === activity?.milestoneTempId);

    return {
      pepTitle: pep.Title,
      year: pep.year,
      activity: activity?.Title,
      milestone: milestone?.Title,
      amountBrl: Number(pep.amountBrl) || 0
    };
  });
}

export function PepSummaryList(props: PepSummaryListProps) {
  const pepSummaryItems = mapPepSummaryItems(props.peps, props.activities, props.milestones);

  if (!pepSummaryItems.length) {
    return (
      <div style={pepSummaryListStyles.emptyState}>
        <div aria-hidden="true" style={pepSummaryListStyles.emptyIcon}>📁</div>
        <p style={pepSummaryListStyles.emptyTitle}>Nenhum PEP cadastrado</p>
        <p style={pepSummaryListStyles.emptyDescription}>Adicione PEPs nas etapas anteriores para visualizar o resumo.</p>
      </div>
    );
  }

  const firstColumnLabel = props.needStructure ? "Marco" : "Elemento PEP";
  const secondColumnLabel = props.needStructure ? "Atividade" : "Ano";
  const gridTemplateColumns = getGridTemplate(props.needStructure);

  return (
    <div style={pepSummaryListStyles.stack}>
      <style>{`
        .pep-summary-row:hover {
          background: ${uiTokens.colors.surfaceMuted};
        }

        .pep-summary-activity {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          max-height: calc(1.5em * 2);
          white-space: normal;
        }

        @supports not (-webkit-line-clamp: 2) {
          .pep-summary-activity {
            white-space: nowrap;
          }
        }

        @media (max-width: 760px) {
          .pep-summary-head,
          .pep-summary-row {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 10px !important;
          }

          .pep-summary-value-cell {
            text-align: left !important;
          }
        }
      `}</style>
      <div style={pepSummaryListStyles.table}>
        <header className="pep-summary-head" style={{ ...pepSummaryListStyles.headerRow, gridTemplateColumns }}>
          <span>{firstColumnLabel}</span>
          <span>{secondColumnLabel}</span>
          <span style={pepSummaryListStyles.valueCell}>Valor (R$)</span>
        </header>

        {pepSummaryItems.map((item, index) => {
          const primaryText = props.needStructure ? (item.milestone ?? "—") : item.pepTitle;
          const secondaryText = props.needStructure ? (item.activity ?? item.pepTitle) : String(item.year);
          const isLast = index === pepSummaryItems.length - 1;

          return (
            <article
              className="pep-summary-row"
              key={`${item.pepTitle}_${item.activity ?? "sem-atividade"}_${index}`}
              style={{ ...pepSummaryListStyles.card, gridTemplateColumns, borderBottom: isLast ? "none" : pepSummaryListStyles.card.borderBottom }}
            >
              <div style={pepSummaryListStyles.cell}>
                <div title={primaryText} style={pepSummaryListStyles.primaryText}>{primaryText}</div>
              </div>

              <div style={pepSummaryListStyles.cell}>
                <div
                  title={secondaryText}
                  className={props.needStructure ? "pep-summary-activity" : undefined}
                  style={{ ...pepSummaryListStyles.secondaryText, whiteSpace: props.needStructure ? "normal" : "nowrap" }}
                >
                  {secondaryText}
                </div>
              </div>

              <div className="pep-summary-value-cell" style={{ ...pepSummaryListStyles.cell, ...pepSummaryListStyles.valueCell }}>
                <div style={pepSummaryListStyles.valueText}>{item.amountBrl.toLocaleString("pt-BR")}</div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
