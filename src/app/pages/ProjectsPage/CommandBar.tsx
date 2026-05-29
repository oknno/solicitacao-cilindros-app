import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { fieldControlStyles } from "../../components/ui/fieldControlStyles";
import { uiTokens } from "../../components/ui/tokens";
import { UNIT_OPTIONS_BY_CENTER } from "./components/wizard/wizardOptions";
import { PROJECT_STATUSES } from "../../../application/policies/projectActionPolicies";

type SortBy = "Title" | "Id" | "approvalYear" | "authorName";
type SortDir = "asc" | "desc";

const STATUS_OPTIONS = [...PROJECT_STATUSES];
const ALL_UNIT_OPTIONS = Array.from(
  new Set(
    Object.values(UNIT_OPTIONS_BY_CENTER)
      .flat()
      .map((option) => option.value)
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b, "pt-BR"));

const styles = {
  commandBar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: uiTokens.colors.surface,
    borderBottom: `1px solid ${uiTokens.colors.border}`,
    padding: `${uiTokens.spacing.sm + 2}px ${uiTokens.spacing.md}px`,
    display: "flex",
    alignItems: "center",
    gap: uiTokens.spacing.sm,
    justifyContent: "space-between",
  } satisfies React.CSSProperties,
  titleWrap: {
    display: "flex",
    alignItems: "center",
    gap: uiTokens.spacing.sm,
    minWidth: 0,
  } satisfies React.CSSProperties,
  title: {
    fontWeight: uiTokens.typography.titleWeight,
    color: uiTokens.colors.textStrong,
  } satisfies React.CSSProperties,
  actionsWrap: {
    display: "flex",
    gap: uiTokens.spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  } satisfies React.CSSProperties,
  divider: {
    width: 1,
    height: 26,
    background: uiTokens.colors.border,
    margin: `0 ${uiTokens.spacing.xs}px`,
  } satisfies React.CSSProperties,
  filterRoot: {
    position: "relative",
  } satisfies React.CSSProperties,
  popover: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    width: 420,
    maxWidth: "90vw",
    background: uiTokens.colors.surface,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.md,
    boxShadow: `0 10px 30px ${uiTokens.colors.shadowSoft}`,
    zIndex: 9999,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  popoverContent: {
    display: "grid",
    gap: uiTokens.spacing.sm + uiTokens.spacing.xxs,
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: uiTokens.spacing.xs,
  } satisfies React.CSSProperties,
  fieldGroup: {
    display: "grid",
    gap: uiTokens.spacing.xs + uiTokens.spacing.xxs,
  } satisfies React.CSSProperties,
  fieldLabel: {
    fontSize: uiTokens.typography.xs,
    color: uiTokens.colors.textMuted,
  } satisfies React.CSSProperties,
  inputBase: {
    width: "100%",
    boxSizing: "border-box",
    ...fieldControlStyles.input,
  } satisfies React.CSSProperties,
  select: {
    ...fieldControlStyles.select,
  } satisfies React.CSSProperties,
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: uiTokens.spacing.sm + uiTokens.spacing.xxs,
  } satisfies React.CSSProperties,
  footerActions: {
    display: "flex",
    gap: uiTokens.spacing.sm,
    justifyContent: "flex-end",
    marginTop: uiTokens.spacing.xs,
  } satisfies React.CSSProperties,
  iconButton: {
    width: 34,
    height: 34,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
  } satisfies React.CSSProperties,
  icon: {
    width: 17,
    height: 17,
    display: "block",
    stroke: "currentColor",
    strokeWidth: 1.75,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } satisfies React.CSSProperties,
};

export type ProjectsFilters = {
  searchTitle: string;
  status: string;
  unit: string;
  requesterName: string;
  sortBy: SortBy;
  sortDir: SortDir;
};

export function CommandBar(props: {
  isAdmin: boolean;
  selectedId: number | null;
  totalLoaded: number;

  canEdit: boolean;
  canDelete: boolean;
  canSend: boolean;
  canBack: boolean;
  canApprove: boolean;
  canReject: boolean;
  editDisabledReason?: string;
  deleteDisabledReason?: string;
  sendDisabledReason?: string;
  backDisabledReason?: string;
  approveDisabledReason?: string;
  rejectDisabledReason?: string;

  filters: ProjectsFilters;
  onChangeFilters: (patch: Partial<ProjectsFilters>) => void;

  onApply: () => void;
  onClear: () => void;

  onRefresh: () => void;
  onUpdateStock?: () => void;

  onNew: () => void;
  canCreate: boolean;
  createDisabledReason?: string;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;

  onSendToApproval: () => void;
  onBackStatus: () => void;
  onApprove: () => void;
  onReject: () => void;
  showApprovalActions: boolean;
  showNewButton?: boolean;
  showViewButton?: boolean;
  showEditButton?: boolean;
  showDuplicateButton?: boolean;
  showDeleteButton?: boolean;
  showSubmitButton?: boolean;
  showBackButton?: boolean;
  showApproveButton?: boolean;
  showRejectButton?: boolean;
  showFilterButton?: boolean;
  showExportButton?: boolean;
  filterButtonMode?: "legacyPopover" | "triggerOnly";
  filterButtonId?: string;

  onExportTable: () => void;
  onExportProject: () => void;
  availableUnits?: string[];
  title?: string;
  navigationAction?: {
    label: string;
    icon: ReactNode;
    onClick: () => void;
  };
  viewActions?: ReactNode;
}) {
  const hasSelection = props.selectedId != null;
  const unitOptions = props.availableUnits ?? ALL_UNIT_OPTIONS;
  const showNewButton = props.showNewButton ?? true;
  const showViewButton = props.showViewButton ?? true;
  const showEditButton = props.showEditButton ?? true;
  const showDuplicateButton = props.showDuplicateButton ?? true;
  const showDeleteButton = props.showDeleteButton ?? true;
  const showSubmitButton = props.showSubmitButton ?? true;
  const showBackButton = props.showBackButton ?? true;
  const showApproveButton = props.showApproveButton ?? props.showApprovalActions;
  const showRejectButton = props.showRejectButton ?? props.showApprovalActions;
  const showFilterButton = props.showFilterButton ?? true;
  const showExportButton = props.showExportButton ?? true;
  const showRecordActions = showNewButton || showViewButton || showEditButton || showDuplicateButton || showDeleteButton;
  const showWorkflowActions = showSubmitButton || showBackButton || (props.showApprovalActions && (showApproveButton || showRejectButton));
  const showUtilityActions = showFilterButton || showExportButton || Boolean(props.navigationAction);
  const filterButtonMode = props.filterButtonMode ?? "legacyPopover";
  const filterButtonId = props.filterButtonId;

  return (
    <div style={styles.commandBar}>
      <div style={styles.titleWrap}>
        <div style={styles.title}>
          {props.title ?? "Termo de Abertura de Projeto"}{props.isAdmin ? " | ADMIN" : ""}
        </div>
      </div>

      <div style={styles.actionsWrap}>
        <Button onClick={props.onRefresh}>Atualizar</Button>
        {props.viewActions}
        {props.onUpdateStock ? <Button onClick={props.onUpdateStock}>Atualizar Estoque</Button> : null}
        {showNewButton && (
          <Button
            tone="primary"
            onClick={props.onNew}
            disabled={!props.canCreate}
            title={!props.canCreate ? props.createDisabledReason : undefined}
          >
            Novo
          </Button>
        )}

        {showViewButton && <Button disabled={!hasSelection} title={!hasSelection ? "Selecione um projeto." : undefined} onClick={props.onView}>Visualizar</Button>}
        {showEditButton && <Button disabled={!props.canEdit} title={!props.canEdit ? props.editDisabledReason : undefined} onClick={props.onEdit}>Editar</Button>}
        {showDuplicateButton && <Button disabled={!hasSelection} title={!hasSelection ? "Selecione um projeto." : undefined} onClick={props.onDuplicate}>Duplicar</Button>}
        {showDeleteButton && <Button disabled={!props.canDelete} title={!props.canDelete ? props.deleteDisabledReason : undefined} onClick={props.onDelete}>Excluir</Button>}

        {showRecordActions && showWorkflowActions ? <span style={styles.divider} /> : null}

        {showSubmitButton && <Button disabled={!props.canSend} title={!props.canSend ? props.sendDisabledReason : undefined} onClick={props.onSendToApproval}>Enviar p/ Aprovação</Button>}
        {showBackButton && <Button disabled={!props.canBack} title={!props.canBack ? props.backDisabledReason : undefined} onClick={props.onBackStatus}>Voltar Status</Button>}
        {props.showApprovalActions && (showApproveButton || showRejectButton) && (
          <>
            {showApproveButton && <Button
              tone="primary"
              disabled={!props.canApprove}
              title={!props.canApprove ? props.approveDisabledReason : undefined}
              onClick={props.onApprove}
            >
              Aprovar
            </Button>}
            {showRejectButton && <Button
              disabled={!props.canReject}
              title={!props.canReject ? props.rejectDisabledReason : undefined}
              onClick={props.onReject}
            >
              Reprovar
            </Button>}
          </>
        )}

        {(showRecordActions || showWorkflowActions) && showUtilityActions ? <span style={styles.divider} /> : null}

        {showFilterButton && (filterButtonMode === "legacyPopover" ? <FilterMenu
          value={props.filters}
          unitOptions={unitOptions}
          onChange={props.onChangeFilters}
          onApply={props.onApply}
          onClear={props.onClear}
        /> : <Button id={filterButtonId} onClick={props.onApply}>Filtro</Button>)}

        {showExportButton && <ExportMenu
          canExportProject={hasSelection}
          onExportTable={props.onExportTable}
          onExportProject={props.onExportProject}
        />}

        {props.navigationAction ? (
          <Button
            aria-label={props.navigationAction.label}
            title={props.navigationAction.label}
            onClick={props.navigationAction.onClick}
            style={styles.iconButton}
          >
            {props.navigationAction.icon}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ExportMenu(props: {
  canExportProject: boolean;
  onExportTable: () => void;
  onExportProject: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      if (!open) return;
      const target = ev.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function onClickTable() {
    props.onExportTable();
    setOpen(false);
  }

  function onClickProject() {
    if (!props.canExportProject) return;
    props.onExportProject();
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={styles.filterRoot}>
      <Button onClick={() => setOpen((prev) => !prev)}>Exportar</Button>
      {open && (
        <div style={{ ...styles.popover, width: 220, padding: uiTokens.spacing.sm }}>
          <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
            <Button onClick={onClickTable}>Exportar tabela</Button>
            <Button
              onClick={onClickProject}
              disabled={!props.canExportProject}
              title={!props.canExportProject ? "Selecione um projeto." : undefined}
            >
              Exportar projeto
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterMenu(props: {
  value: ProjectsFilters;
  unitOptions: string[];
  onChange: (patch: Partial<ProjectsFilters>) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const { value } = props;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popupId = useId();

  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      if (!open) return;
      const target = ev.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function applyAndClose() {
    props.onApply();
    setOpen(false);
  }

  function clearAndClose() {
    props.onClear();
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={styles.filterRoot}>
      <Button
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popupId}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        Filtro ▾
      </Button>

      {open && (
        <div id={popupId} role="dialog" aria-label="Filtro de projetos" style={styles.popover}>
          <div style={styles.popoverContent}>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Nome do projeto (contém)</label>
              <input
                value={value.searchTitle}
                onChange={(e) => props.onChange({ searchTitle: e.target.value })}
                placeholder="Ex: Máquina..."
                style={styles.inputBase}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Status</label>
              <select
                value={value.status}
                onChange={(e) => props.onChange({ status: e.target.value })}
                style={styles.select}
              >
                <option value="">Selecione o status...</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Unidade</label>
              <select
                value={value.unit}
                onChange={(e) => props.onChange({ unit: e.target.value })}
                style={styles.select}
              >
                <option value="">Selecione a unidade...</option>
                {props.unitOptions.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Solicitante contém</label>
              <input
                value={value.requesterName}
                onChange={(e) => props.onChange({ requesterName: e.target.value })}
                placeholder="Ex: Gabriel"
                style={styles.inputBase}
              />
            </div>

            <div style={styles.twoColumns}>
              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Ordenar por</label>
                <select
                  value={value.sortBy}
                  onChange={(e) => props.onChange({ sortBy: e.target.value as SortBy })}
                  style={styles.select}
                >
                  <option value="Title">Nome (Title)</option>
                  <option value="Id">ID</option>
                  <option value="approvalYear">Ano</option>
                  <option value="authorName">Solicitante</option>
                </select>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Direção</label>
                <select
                  value={value.sortDir}
                  onChange={(e) => props.onChange({ sortDir: e.target.value as SortDir })}
                  style={styles.select}
                >
                  <option value="asc">Crescente (A→Z / menor→maior)</option>
                  <option value="desc">Decrescente (Z→A / maior→menor)</option>
                </select>
              </div>
            </div>

            <div style={styles.footerActions}>
              <Button type="button" onClick={clearAndClose}>Limpar</Button>
              <Button tone="primary" type="button" onClick={applyAndClose}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
