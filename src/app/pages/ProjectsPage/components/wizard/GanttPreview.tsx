import { useMemo } from "react";

import type { ActivityDraftLocal, MilestoneDraftLocal } from "../../../../../domain/projects/project.validators";
import { StateMessage } from "../../../../components/ui/StateMessage";
import { uiTokens } from "../../../../components/ui/tokens";

export type GanttItem = {
  milestoneTitle: string;
  activityTitle: string;
  startDate: string;
  endDate: string;
};

export type GanttBounds = {
  min: number;
  max: number;
};

type MilestoneGroup = {
  milestoneName: string;
  startDateMin: string;
  endDateMax: string;
  activities: GanttItem[];
};

function toDateLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

const DAY_IN_MS = 86400000;

function getDurationInDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const diff = end - start;

  if (Number.isNaN(start) || Number.isNaN(end) || diff < 0) {
    return null;
  }

  return Math.floor(diff / DAY_IN_MS) + 1;
}

function hasInvalidDateRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return false;
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Number.isNaN(start) || Number.isNaN(end) || end < start;
}

function isSamePeriod(startA?: string, endA?: string, startB?: string, endB?: string) {
  return Boolean(startA && endA && startB && endB && startA === startB && endA === endB);
}

function toScheduleLabel(startDate: string, endDate: string) {
  const duration = getDurationInDays(startDate, endDate);

  if (!duration) {
    return {
      label: `${toDateLabel(startDate)} a ${toDateLabel(endDate)} · duração inválida`,
      isInvalid: true,
    };
  }

  const dateLabel = startDate === endDate
    ? toDateLabel(startDate)
    : `${toDateLabel(startDate)} a ${toDateLabel(endDate)}`;

  return {
    label: `${dateLabel} · ${duration} ${duration === 1 ? "dia" : "dias"}`,
    isInvalid: false,
  };
}

function getBarPosition(startDate: string, endDate: string, bounds: GanttBounds) {
  const total = Math.max(bounds.max - bounds.min, 1);
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return { left: 0, width: 100 };
  }
  const left = ((start - bounds.min) / total) * 100;
  const width = (Math.max(end - start, DAY_IN_MS) / total) * 100;

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

export function GanttPreview(props: {
  milestones: MilestoneDraftLocal[];
  activities: ActivityDraftLocal[];
  emptyMessage?: string;
}) {
  const ganttItems = useMemo<GanttItem[]>(() => props.activities
    .map((activity) => ({
      milestoneTitle: props.milestones.find((milestone) => milestone.tempId === activity.milestoneTempId)?.Title ?? "MARCO",
      activityTitle: activity.Title || activity.placeholder || "ATIVIDADE",
      startDate: activity.startDate ?? "",
      endDate: activity.endDate ?? ""
    })), [props.activities, props.milestones]);

  const ganttBounds = useMemo<GanttBounds | null>(() => {
    if (ganttItems.length === 0) return null;
    const validItems = ganttItems.filter((item) => item.startDate && item.endDate && !hasInvalidDateRange(item.startDate, item.endDate));
    if (validItems.length === 0) return null;
    const starts = validItems.map((item) => new Date(`${item.startDate}T00:00:00`).getTime());
    const ends = validItems.map((item) => new Date(`${item.endDate}T00:00:00`).getTime());

    return {
      min: Math.min(...starts),
      max: Math.max(...ends)
    };
  }, [ganttItems]);

  const milestoneGroups = useMemo(() => groupByMilestone(ganttItems), [ganttItems]);

  if (!ganttBounds || ganttItems.length === 0) {
    return <StateMessage state="empty" message={props.emptyMessage ?? "Sem atividades válidas para exibir cronograma."} />;
  }

  const ganttRangeLabel = `${new Date(ganttBounds.min).toLocaleDateString("pt-BR")} - ${new Date(ganttBounds.max).toLocaleDateString("pt-BR")}`;

  return (
    <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
      <div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>
        Período do cronograma: {ganttRangeLabel}
      </div>
      {milestoneGroups.map((milestoneGroup) => {
        const milestoneBar = getBarPosition(milestoneGroup.startDateMin, milestoneGroup.endDateMax, ganttBounds);
        const milestoneSchedule = toScheduleLabel(milestoneGroup.startDateMin, milestoneGroup.endDateMax);
        return (
          <div key={`${milestoneGroup.milestoneName}_${milestoneGroup.startDateMin}_${milestoneGroup.endDateMax}`} style={{ display: "grid", gap: uiTokens.spacing.xs }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: uiTokens.spacing.xs, fontSize: 14, color: uiTokens.colors.text, marginBottom: 6 }}>
                <span style={{ minWidth: 0, flex: 1, fontWeight: 700, fontSize: 14 }}>{milestoneGroup.milestoneName}</span>
                <span style={{ marginLeft: "auto", textAlign: "right", fontWeight: 400, color: milestoneSchedule.isInvalid ? uiTokens.colors.danger : uiTokens.colors.textMuted }}>
                  {milestoneSchedule.label}
                </span>
              </div>
              <div style={{ position: "relative", height: 9, borderRadius: 999, background: uiTokens.colors.borderMuted, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: `${milestoneBar.left}%`, width: `${milestoneBar.width}%`, top: 0, bottom: 0, background: milestoneSchedule.isInvalid ? uiTokens.colors.danger : uiTokens.colors.accentWarning, borderRadius: 999 }} />
              </div>
            </div>
            {milestoneGroup.activities.map((item) => {
              const hasMissingPeriod = !item.startDate || !item.endDate;
              const invalidRange = hasInvalidDateRange(item.startDate, item.endDate);
              const activitySchedule = hasMissingPeriod
                ? { label: "Período incompleto", isInvalid: false }
                : toScheduleLabel(item.startDate, item.endDate);
              const samePeriodAsMilestone = isSamePeriod(item.startDate, item.endDate, milestoneGroup.startDateMin, milestoneGroup.endDateMax);
              const durationOnly = activitySchedule.label.split(" · ")[1] ?? activitySchedule.label;
              const activityScheduleLabel = hasMissingPeriod
                ? activitySchedule.label
                : samePeriodAsMilestone
                  ? durationOnly
                  : activitySchedule.label;
              const activityBar = hasMissingPeriod || invalidRange
                ? { left: 0, width: 100 }
                : getBarPosition(item.startDate, item.endDate, ganttBounds);

              return (
                <div key={`${item.milestoneTitle}_${item.activityTitle}_${item.startDate}_${item.endDate}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: uiTokens.spacing.xs, fontSize: 14, color: uiTokens.colors.text, marginBottom: 5, paddingLeft: uiTokens.spacing.xl + 4 }}>
                    <span style={{ minWidth: 0, flex: 1, fontSize: 14, fontWeight: 400 }}>{item.activityTitle}</span>
                    <span style={{ marginLeft: "auto", textAlign: "right", fontWeight: 400, color: invalidRange ? uiTokens.colors.danger : uiTokens.colors.textMuted }}>{activityScheduleLabel}</span>
                  </div>
                  <div style={{ position: "relative", height: 7, borderRadius: 999, background: uiTokens.colors.borderMuted, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: `${activityBar.left}%`, width: `${activityBar.width}%`, top: 0, bottom: 0, background: invalidRange ? uiTokens.colors.danger : uiTokens.colors.text, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
