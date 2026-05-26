import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { uiTokens } from "../ui/tokens";

export function MaterialRequestsTable(props: {
  items: MaterialRequest[];
  selectedId: number | null;
  onSelect: (item: MaterialRequest) => void;
  totalLoaded?: number;
  hasActiveFilters?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div style={{ background: uiTokens.colors.surface, border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.md, minHeight: 0, display: "grid", gridTemplateRows: "1fr auto", overflow: "hidden" }}>
      <div style={{ overflowY: "auto", overflowX: "hidden", minHeight: 300, maxHeight: "100%" }}>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontSize: uiTokens.typography.sm }}>
          <colgroup>
            <col style={{ width: "72px" }} />
            <col style={{ width: "100px" }} />
            <col style={{ width: "120px" }} />
            <col />
            <col style={{ width: "105px" }} />
            <col style={{ width: "150px" }} />
            <col style={{ width: "160px" }} />
          </colgroup>
          <thead>
            <tr>
              {[
                "ID", "Centro", "Material", "Descrição", "Solicitado", "Status", "Solicitante",
              ].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 700, background: uiTokens.colors.surface, borderBottom: `1px solid ${uiTokens.colors.border}` }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {props.items.map((item) => {
              const active = item.id != null && item.id === props.selectedId;
              return (
                <tr
                  key={item.id ?? `${item.title}-${item.materialCode}`}
                  onClick={() => props.onSelect(item)}
                  style={{ cursor: "pointer", background: active ? uiTokens.colors.surfaceMuted : "transparent" }}
                >
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.id ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.center ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.materialCode ?? "-"}</td>
                  <td title={item.materialDescription ?? "-"} style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.materialDescription ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.requestedQuantity ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}><RequestStatusBadge value={item.status} /></td>
                  <td title={item.requesterName ?? "-"} style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.requesterName ?? "-"}</td>
                </tr>
              );
            })}
            {props.items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "20px 12px", textAlign: "center", color: uiTokens.colors.textMuted }}>
                  {props.emptyMessage ?? "Nenhuma solicitação encontrada."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ borderTop: `1px solid ${uiTokens.colors.border}`, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: uiTokens.colors.textMuted }}>
        <div>
          Itens carregados: <b>{props.items.length}</b>
          {props.hasActiveFilters ? <> de <b>{props.totalLoaded ?? props.items.length}</b></> : null}
        </div>
      </div>
    </div>
  );
}
