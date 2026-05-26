import type { ReactNode } from "react";
import type { MaterialRequestStatus } from "../../../domain/materialRequest/status";
import type { MaterialRequestFilters } from "./materialRequestFilters";
import { AppModal } from "../common/AppModal";
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

export function MaterialRequestFilterModal(props: {
  value: MaterialRequestFilters;
  centers: string[];
  onChange: (patch: Partial<MaterialRequestFilters>) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <AppModal
      title="Filtros da home"
      subtitle="Refine os resultados carregados sem recarregar do SharePoint."
      onClose={props.onClose}
      actions={(
        <>
          <Button onClick={props.onClear}>Limpar filtros</Button>
          <Button tone="primary" onClick={props.onApply}>Aplicar filtros</Button>
        </>
      )}
    >
      <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
        <FilterField label="Centro">
          <select
            value={props.value.center ?? ""}
            onChange={(e) => props.onChange({ center: e.target.value })}
            style={fieldControlStyles.select}
          >
            <option value="">Todos os centros</option>
            {props.centers.map((center) => <option key={center} value={center}>{center}</option>)}
          </select>
        </FilterField>

        <FilterField label="Material (código contém)">
          <input
            value={props.value.material ?? ""}
            onChange={(e) => props.onChange({ material: e.target.value })}
            placeholder="Ex: MAT-123"
            style={fieldControlStyles.input}
          />
        </FilterField>

        <FilterField label="Solicitante (nome contém)">
          <input
            value={props.value.requester ?? ""}
            onChange={(e) => props.onChange({ requester: e.target.value })}
            placeholder="Ex: João"
            style={fieldControlStyles.input}
          />
        </FilterField>

        <FilterField label="Status">
          <select
            value={props.value.status ?? ""}
            onChange={(e) => props.onChange({ status: e.target.value as MaterialRequestStatus | "" })}
            style={fieldControlStyles.select}
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </FilterField>

        <FilterField label="Ordenar por">
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
        </FilterField>
      </div>
    </AppModal>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: uiTokens.spacing.xxs }}>
      <label style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>{label}</label>
      {children}
    </div>
  );
}
