import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MaterialRequestStatus } from "../../../domain/materialRequest/status";
import type { MaterialRequestFilters } from "./materialRequestFilters";
import { Button } from "../ui/Button";
import { fieldControlStyles } from "../ui/fieldControlStyles";
import { uiTokens } from "../ui/tokens";

const STATUS_OPTIONS: Array<{ value: MaterialRequestStatus; label: string }> = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "PENDING_LAMINATION_MANAGER_APPROVAL", label: "Pendente Gerente Laminação" },
  { value: "PENDING_CTO_APPROVAL", label: "Pendente CTO" },
  { value: "APPROVED", label: "Aprovada" },
  { value: "REJECTED", label: "Reprovada" },
  { value: "RETURNED_FOR_ADJUSTMENT", label: "Devolvida" },
  { value: "CANCELLED", label: "Cancelada" },
];

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
  } satisfies React.CSSProperties,
  popover: {
    position: "absolute",
    width: 420,
    maxWidth: "calc(100vw - 32px)",
    background: uiTokens.colors.surface,
    border: `1px solid ${uiTokens.colors.border}`,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.md,
    boxShadow: `0 10px 30px ${uiTokens.colors.shadowSoft}`,
    overflow: "hidden",
  } satisfies React.CSSProperties,
  content: {
    display: "grid",
    gap: uiTokens.spacing.sm + uiTokens.spacing.xxs,
  } satisfies React.CSSProperties,
  fieldGroup: {
    display: "grid",
    gap: uiTokens.spacing.xs + uiTokens.spacing.xxs,
  } satisfies React.CSSProperties,
  fieldLabel: {
    fontSize: uiTokens.typography.xs,
    color: uiTokens.colors.textMuted,
  } satisfies React.CSSProperties,
  footerActions: {
    display: "flex",
    gap: uiTokens.spacing.sm,
    justifyContent: "flex-end",
    marginTop: uiTokens.spacing.xs,
  } satisfies React.CSSProperties,
};

export function MaterialRequestFilterModal(props: {
  value: MaterialRequestFilters;
  centers: string[];
  anchorId?: string;
  onChange: (patch: Partial<MaterialRequestFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    function updatePosition() {
      const anchor = props.anchorId ? document.getElementById(props.anchorId) : null;
      if (!anchor) {
        setPosition({ top: 84, right: uiTokens.spacing.md });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: Math.round(rect.bottom + 8),
        right: Math.max(uiTokens.spacing.md, Math.round(window.innerWidth - rect.right)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [props.anchorId]);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current && !panelRef.current.contains(target)) props.onClose();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [props]);

  return (
    <div style={styles.overlay}>
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Filtro de solicitações"
        style={{
          ...styles.popover,
          top: (position?.top ?? 84),
          right: (position?.right ?? uiTokens.spacing.md),
          visibility: position ? "visible" : "hidden",
        }}
      >
        <div style={styles.content}>
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Centro</label>
            <select
              value={props.value.center ?? ""}
              onChange={(e) => props.onChange({ center: e.target.value })}
              style={fieldControlStyles.select}
            >
              <option value="">Todos os centros</option>
              {props.centers.map((center) => <option key={center} value={center}>{center}</option>)}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Material (código contém)</label>
            <input
              value={props.value.material ?? ""}
              onChange={(e) => props.onChange({ material: e.target.value })}
              placeholder="Ex: AT-123"
              style={fieldControlStyles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Solicitante (nome contém)</label>
            <input
              value={props.value.requester ?? ""}
              onChange={(e) => props.onChange({ requester: e.target.value })}
              placeholder="Ex: João"
              style={fieldControlStyles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Status</label>
            <select
              value={props.value.status ?? ""}
              onChange={(e) => props.onChange({ status: e.target.value as MaterialRequestStatus | "" })}
              style={fieldControlStyles.select}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Ordenar por</label>
            <select
              value={props.value.sort ?? ""}
              onChange={(e) => props.onChange({ sort: (e.target.value || undefined) as MaterialRequestFilters["sort"] })}
              style={fieldControlStyles.select}
            >
              <option value="">Padrão</option>
              <option value="ID_DESC">ID maior → menor</option>
              <option value="ID_ASC">ID menor → maior</option>
              <option value="QUANTITY_DESC">Quantidade maior → menor</option>
              <option value="QUANTITY_ASC">Quantidade menor → maior</option>
            </select>
          </div>

          <div style={styles.footerActions}>
            <Button type="button" onClick={props.onClear}>Limpar</Button>
            <Button tone="primary" type="button" onClick={props.onApply}>Aplicar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
