import { useMemo, useState } from "react";

import { toIntOrUndefined } from "../../../../../domain/projects/project.calculations";
import type { ActivityDraftLocal, MilestoneDraftLocal } from "../../../../../domain/projects/project.validators";
import { ensurePepElementOption, getPepElementOptions } from "./wizardOptions";
import { SectionTitle } from "./WizardUi";
import { wizardLayoutStyles } from "./wizardLayoutStyles";
import { GanttPreview } from "./GanttPreview";
import { Button } from "../../../../components/ui/Button";
import { Field } from "../../../../components/ui/Field";
import { StateMessage } from "../../../../components/ui/StateMessage";
import { uiTokens } from "../../../../components/ui/tokens";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function emptyActivityForm() {
  return {
    acTitle: "",
    acAmount: "",
    acPepElement: PEP_NOT_APPLICABLE_VALUE,
    acStartDate: "",
    acEndDate: "",
    acSupplier: "",
    acDescription: ""
  };
}

type ActivityFormState = ReturnType<typeof emptyActivityForm>;

const PEP_NOT_APPLICABLE_VALUE = "__NO_PEP_LINK__";
const PEP_NOT_APPLICABLE_LABEL = "Não vincular PEP (não se aplica)";

function normalizePepElementSelection(value: string) {
  return value === PEP_NOT_APPLICABLE_VALUE || !value ? undefined : value;
}

function formatDatePtBr(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatAmountBrl(value?: number) {
  if (typeof value !== "number") return "Valor não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function activitySummary(activity: ActivityDraftLocal) {
  const title = activity.Title?.trim() || activity.placeholder?.trim() || "Atividade sem título";
  const start = formatDatePtBr(activity.startDate);
  const end = formatDatePtBr(activity.endDate);
  const period = start && end ? `${start} a ${end}` : start ? `Início: ${start}` : end ? `Término: ${end}` : "Período não informado";
  const pep = activity.pepElement?.trim() || "PEP não vinculado";
  return { title, period, value: formatAmountBrl(activity.amountBrl), pep };
}

function hasActivityValidationIssue(activity: ActivityDraftLocal) {
  if (!activity.Title?.trim()) return true;
  if (!activity.startDate) return true;
  if (!activity.endDate) return true;
  if (activity.endDate < activity.startDate) return true;
  return false;
}

export function StructureStep(props: {
  readOnly: boolean;
  projectStartDate?: string;
  projectEndDate?: string;
  milestones: MilestoneDraftLocal[];
  activities: ActivityDraftLocal[];
  company?: string;
  onChange: (patch: Partial<{ milestones: MilestoneDraftLocal[]; activities: ActivityDraftLocal[] }>) => void;
  onValidationError: (message: string) => void;
}) {
  const [formsByMilestone, setFormsByMilestone] = useState<Record<string, ActivityFormState>>({});
  const [isAddingActivityByMilestone, setIsAddingActivityByMilestone] = useState<Record<string, boolean>>({});
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  const activitiesByMilestone = useMemo(() => {
    const grouped: Record<string, ActivityDraftLocal[]> = {};
    for (const milestone of props.milestones) grouped[milestone.tempId] = [];
    for (const activity of props.activities) {
      if (!grouped[activity.milestoneTempId]) grouped[activity.milestoneTempId] = [];
      grouped[activity.milestoneTempId].push(activity);
    }
    return grouped;
  }, [props.milestones, props.activities]);

  const pepOptions = useMemo(() => getPepElementOptions(props.company), [props.company]);

  function getForm(milestoneTempId: string): ActivityFormState {
    return formsByMilestone[milestoneTempId] ?? emptyActivityForm();
  }

  function setFormField(milestoneTempId: string, patch: Partial<ActivityFormState>) {
    setFormsByMilestone((prev) => ({
      ...prev,
      [milestoneTempId]: { ...getForm(milestoneTempId), ...patch }
    }));
  }

  function clearMilestoneForm(milestoneTempId: string) {
    setFormsByMilestone((prev) => ({ ...prev, [milestoneTempId]: emptyActivityForm() }));
  }

  function toggleActivityForm(milestoneTempId: string, open: boolean) {
    setIsAddingActivityByMilestone((prev) => ({ ...prev, [milestoneTempId]: open }));
    if (!open) clearMilestoneForm(milestoneTempId);
  }

  function removeActivity(activityTempId: string) {
    setExpandedActivities((prev) => { const next = { ...prev }; delete next[activityTempId]; return next; });
    props.onChange({ activities: props.activities.filter((a) => a.tempId !== activityTempId) });
  }

  function setActivityExpanded(activityTempId: string, expanded: boolean) {
    setExpandedActivities((prev) => ({ ...prev, [activityTempId]: expanded }));
  }

  function updateActivity(activityTempId: string, patch: Partial<ActivityDraftLocal>) {
    props.onChange({ activities: props.activities.map((activity) => (activity.tempId === activityTempId ? { ...activity, ...patch } : activity)) });
  }

  function addActivity(milestoneTempId: string) {
    const form = getForm(milestoneTempId);
    const amount = toIntOrUndefined(form.acAmount);
    const milestoneTitle = props.milestones.find((milestone) => milestone.tempId === milestoneTempId)?.Title ?? "";

    if (!milestoneTitle.trim()) return props.onValidationError("Nome do marco é obrigatório.");
    if (!form.acTitle.trim()) return props.onValidationError("Título da atividade é obrigatório.");
    if (!form.acStartDate) return props.onValidationError("Início da atividade é obrigatório.");
    if (!form.acEndDate) return props.onValidationError("Término da atividade é obrigatório.");
    if (props.projectStartDate && form.acStartDate && form.acStartDate < props.projectStartDate) return props.onValidationError("Início da atividade não pode ser antes do início do projeto.");
    if (form.acStartDate && form.acEndDate && form.acEndDate < form.acStartDate) return props.onValidationError("Término da atividade não pode ser antes do início.");
    if (props.projectEndDate && form.acEndDate && form.acEndDate > props.projectEndDate) return props.onValidationError("Término da atividade não pode ser após término do projeto.");

    props.onChange({
      activities: [
        ...props.activities,
        {
          tempId: uid("ac"),
          Title: form.acTitle.trim().toUpperCase(),
          milestoneTempId,
          amountBrl: amount,
          pepElement: normalizePepElementSelection(form.acPepElement),
          startDate: form.acStartDate || undefined,
          endDate: form.acEndDate || undefined,
          supplier: form.acSupplier.trim() || undefined,
          activityDescription: form.acDescription.trim() || undefined
        }
      ]
    });

    clearMilestoneForm(milestoneTempId);
    toggleActivityForm(milestoneTempId, false);
  }

  return (
    <div style={{ padding: 14, display: "grid", gap: 14 }}>
      <SectionTitle title="8. KEY Projects" subtitle="Disponível para projetos com orçamento igual ou superior a R$ 1.000.000,00." />

      <div style={wizardLayoutStyles.cardSubtle}>
        {!props.milestones.length ? (
          <div style={wizardLayoutStyles.empty}><StateMessage state="empty" message="Nenhum marco cadastrado." /></div>
        ) : (
          <div style={{ display: "grid", gap: uiTokens.spacing.md }}>
            {props.milestones.map((milestone) => {
              const form = getForm(milestone.tempId);
              const milestoneActivities = activitiesByMilestone[milestone.tempId] ?? [];
              const canAddActivity = Boolean(form.acTitle.trim() && form.acStartDate && form.acEndDate);
              const isAddingActivity = isAddingActivityByMilestone[milestone.tempId] ?? false;

              return (
                <div key={milestone.tempId} style={{ ...wizardLayoutStyles.card, background: uiTokens.colors.surfaceMuted }}>
                  <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: uiTokens.spacing.sm, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <Field label="Nome do Marco">
                          <div style={wizardLayoutStyles.input}>{milestone.Title}</div>
                        </Field>
                      </div>
                    </div>
                    <div style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>Atividades ({milestoneActivities.length})</div>
                  </div>

                  {milestoneActivities.map((activity) => {
                    const isExpanded = expandedActivities[activity.tempId] ?? false;
                    const summary = activitySummary(activity);
                    const hasIssue = hasActivityValidationIssue(activity);

                    return (
                    <div key={activity.tempId} style={{ ...wizardLayoutStyles.cardSubtle, background: uiTokens.colors.surface, border: hasIssue ? `1px solid ${uiTokens.colors.danger}` : undefined }}>
                      {isExpanded ? (<>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: uiTokens.spacing.sm, marginBottom: uiTokens.spacing.sm }}>
                        <div style={{ fontWeight: 600 }}>Atividade</div>
                        <button type="button" onClick={() => setActivityExpanded(activity.tempId, false)} style={{ border: "none", background: "transparent", color: uiTokens.colors.textMuted, textDecoration: "underline", cursor: "pointer", padding: 0 }}>Ocultar detalhes</button>
                      </div>

                      <div style={wizardLayoutStyles.journeyPairGrid}>
                        <Field label="Título da Atividade">
                          <input
                            value={activity.Title}
                            onChange={(e) => updateActivity(activity.tempId, { Title: e.target.value.toUpperCase() })}
                            placeholder={activity.placeholder ?? "Ex.: Montagem da nova linha de lingotamento"}
                            style={wizardLayoutStyles.input}
                          />
                        </Field>

                        <Field label="Valor da Atividade (R$)">
                          <input
                            value={activity.amountBrl ?? ""}
                            onChange={(e) => {
                              if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
                                updateActivity(activity.tempId, { amountBrl: toIntOrUndefined(e.target.value) });
                              }
                            }}
                            placeholder="Ex: 500000 (sem pontos ou vírgulas)"
                            style={wizardLayoutStyles.input}
                          />
                        </Field>
                      </div>

                      <div style={wizardLayoutStyles.journeyPairGrid}>
                        <Field label="Início da Atividade">
                          <input
                            type="date"
                            placeholder="dd/mm/aaaa"
                            min={props.projectStartDate}
                            max={props.projectEndDate}
                            value={activity.startDate ?? ""}
                            onChange={(e) => updateActivity(activity.tempId, { startDate: e.target.value || undefined })}
                            style={wizardLayoutStyles.input}
                          />
                        </Field>
                        <Field label="Término da Atividade">
                          <input
                            type="date"
                            placeholder="dd/mm/aaaa"
                            min={(activity.startDate ?? "") || props.projectStartDate}
                            max={props.projectEndDate}
                            value={activity.endDate ?? ""}
                            onChange={(e) => updateActivity(activity.tempId, { endDate: e.target.value || undefined })}
                            style={wizardLayoutStyles.input}
                          />
                        </Field>
                      </div>

                      <Field label="Elemento PEP">
                        <select value={activity.pepElement ?? PEP_NOT_APPLICABLE_VALUE} onChange={(e) => updateActivity(activity.tempId, { pepElement: normalizePepElementSelection(e.target.value) })} style={wizardLayoutStyles.input}>
                          <option value={PEP_NOT_APPLICABLE_VALUE}>{PEP_NOT_APPLICABLE_LABEL}</option>
                          {ensurePepElementOption(pepOptions, activity.pepElement).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </Field>

                      <Field label="Fornecedor">
                        <input
                          value={activity.supplier ?? ""}
                          onChange={(e) => updateActivity(activity.tempId, { supplier: e.target.value || undefined })}
                          placeholder="Fornecedor (opcional)"
                          style={wizardLayoutStyles.input}
                        />
                      </Field>

                      <Field label="Descrição Geral da Atividade">
                        <textarea
                          value={activity.activityDescription ?? ""}
                          onChange={(e) => updateActivity(activity.tempId, { activityDescription: e.target.value })}
                          placeholder="Descreva a atividade e os principais entregáveis"
                          style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }}
                        />
                      </Field>

                      <div style={{ display: "flex", justifyContent: "space-between", gap: uiTokens.spacing.sm, flexWrap: "wrap" }}>
                        <Button disabled={props.readOnly} onClick={() => removeActivity(activity.tempId)}>Remover atividade</Button>
                      </div>
                      </>) : (
                        <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
                          <div style={{ fontSize: 13, color: uiTokens.colors.textMuted }}>Atividade: <strong style={{ color: uiTokens.colors.textStrong }}>{summary.title}</strong></div>
                          <div style={{ fontSize: 13, color: uiTokens.colors.textMuted }}>Período: {summary.period}</div>
                          <div style={{ fontSize: 13, color: uiTokens.colors.textMuted }}>Valor: {summary.value}</div>
                          <div style={{ fontSize: 13, color: uiTokens.colors.textMuted }}>PEP: {summary.pep}</div>
                          {hasIssue ? <div style={{ fontSize: 12, color: uiTokens.colors.danger }}>Campos obrigatórios pendentes. Edite os detalhes.</div> : null}
                          <div>
                            <button type="button" onClick={() => setActivityExpanded(activity.tempId, true)} style={{ border: "none", background: "transparent", color: uiTokens.colors.textMuted, textDecoration: "underline", cursor: "pointer", padding: 0 }}>Editar detalhes</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );})}

                  {isAddingActivity ? (
                    <div style={{ ...wizardLayoutStyles.cardSubtle, background: uiTokens.colors.surface }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>Atividade</div>

                      <div style={wizardLayoutStyles.journeyPairGrid}>
                        <Field label="Título da Atividade">
                          <input
                            value={form.acTitle}
                            onChange={(e) => setFormField(milestone.tempId, { acTitle: e.target.value })}
                            placeholder="Ex.: Montagem da nova linha de lingotamento"
                            style={wizardLayoutStyles.input}
                          />
                        </Field>

                        <Field label="Valor da Atividade (R$)">
                          <input
                            value={form.acAmount}
                            onChange={(e) => {
                              if (e.target.value === "" || /^\d+$/.test(e.target.value)) setFormField(milestone.tempId, { acAmount: e.target.value });
                            }}
                            placeholder="Ex: 500000 (sem pontos ou vírgulas)"
                            style={wizardLayoutStyles.input}
                          />
                        </Field>
                      </div>

                      <div style={wizardLayoutStyles.journeyPairGrid}>
                        <Field label="Início da Atividade">
                          <input type="date" placeholder="dd/mm/aaaa" min={props.projectStartDate} max={props.projectEndDate} value={form.acStartDate} onChange={(e) => setFormField(milestone.tempId, { acStartDate: e.target.value })} style={wizardLayoutStyles.input} />
                        </Field>
                        <Field label="Término da Atividade">
                          <input type="date" placeholder="dd/mm/aaaa" min={form.acStartDate || props.projectStartDate} max={props.projectEndDate} value={form.acEndDate} onChange={(e) => setFormField(milestone.tempId, { acEndDate: e.target.value })} style={wizardLayoutStyles.input} />
                        </Field>
                      </div>

                      <Field label="Elemento PEP">
                        <select value={form.acPepElement} onChange={(e) => setFormField(milestone.tempId, { acPepElement: e.target.value })} style={wizardLayoutStyles.input}>
                          <option value={PEP_NOT_APPLICABLE_VALUE}>{PEP_NOT_APPLICABLE_LABEL}</option>
                          {ensurePepElementOption(pepOptions, form.acPepElement).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </Field>

                      <Field label="Fornecedor">
                        <input value={form.acSupplier} onChange={(e) => setFormField(milestone.tempId, { acSupplier: e.target.value })} placeholder="Fornecedor (opcional)" style={wizardLayoutStyles.input} />
                      </Field>

                      <Field label="Descrição Geral da Atividade">
                        <textarea value={form.acDescription} onChange={(e) => setFormField(milestone.tempId, { acDescription: e.target.value })} placeholder="Descrição geral da atividade" style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }} />
                      </Field>

                      <div style={{ display: "flex", gap: uiTokens.spacing.sm, flexWrap: "wrap" }}>
                        <Button tone="primary" disabled={props.readOnly || !canAddActivity} onClick={() => addActivity(milestone.tempId)}>
                          Adicionar Atividade
                        </Button>
                        <Button disabled={props.readOnly} onClick={() => toggleActivityForm(milestone.tempId, false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button disabled={props.readOnly} onClick={() => toggleActivityForm(milestone.tempId, true)}>
                      Nova atividade
                    </Button>
                  )}

                  {!milestoneActivities.length ? <div style={wizardLayoutStyles.empty}><StateMessage state="empty" message="Nenhuma atividade cadastrada para este marco." /></div> : null}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ ...wizardLayoutStyles.cardSubtle, background: uiTokens.colors.surface, marginTop: uiTokens.spacing.md }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: uiTokens.colors.textStrong, marginBottom: uiTokens.spacing.sm }}>Pré-visualização do Cronograma</div>
          <GanttPreview milestones={props.milestones} activities={props.activities} />
        </div>
      </div>
    </div>
  );
}
