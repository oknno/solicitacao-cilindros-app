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
  onLoadMore?: () => void;
  loadMoreDisabled?: boolean;
  loadMoreLabel?: string;
}) {
  return (
    <div style={{ background: "#f3f3f5", borderRadius: 12, padding: 12, minHeight: 0, display: "grid", gridTemplateRows: "1fr auto", gap: 12 }}>
      <div style={{ background: "#ffffff", border: "1px solid #d9d9dd", borderRadius: 10, minHeight: 0, overflow: "hidden" }}>
        <div style={{ overflowY: "auto", overflowX: "hidden", minHeight: 300, maxHeight: "100%" }}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, fontSize: uiTokens.typography.sm, fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", color: "#2f3440" }}>
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
                ].map((h) => <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, color: "#1f3556", background: "#e5e6ea", borderBottom: "1px solid #d9d9dd", verticalAlign: "middle" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {props.items.map((item) => {
                const active = item.id != null && item.id === props.selectedId;
                return (
                  <tr
                    key={item.id ?? `${item.title}-${item.materialCode}`}
                    onClick={() => props.onSelect(item)}
                    style={{ cursor: "pointer", background: active ? uiTokens.colors.surfaceMuted : "#ffffff" }}
                  >
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{item.id ?? "-"}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{item.center ?? "-"}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{item.materialCode ?? "-"}</td>
                    <td title={item.materialDescription ?? "-"} style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{item.materialDescription ?? "-"}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{item.requestedQuantity ?? "-"}</td>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", verticalAlign: "middle" }}><RequestStatusBadge value={item.status} /></td>
                    <td title={item.requesterName ?? "-"} style={{ padding: "12px 16px", borderBottom: "1px solid #ececef", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" }}>{item.requesterName ?? "-"}</td>
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
      </div>
      <div style={{ padding: "0 2px", display: "flex", justifyContent: "space-between", alignItems: "center", color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>
        <div>
          Itens carregados: <b>{props.items.length}</b>
          {props.hasActiveFilters ? <> de <b>{props.totalLoaded ?? props.items.length}</b></> : null}
        </div>
        <button
          type="button"
          onClick={props.onLoadMore}
          disabled={props.loadMoreDisabled ?? !props.onLoadMore}
          style={{
            height: 36,
            padding: "0 18px",
            borderRadius: 10,
            border: "1px solid #cfd2d8",
            background: "#f3f4f6",
            color: "#2f3440",
            fontWeight: 600,
            cursor: (props.loadMoreDisabled ?? !props.onLoadMore) ? "not-allowed" : "pointer",
            opacity: (props.loadMoreDisabled ?? !props.onLoadMore) ? 0.75 : 1,
            transition: "background-color 120ms ease-in-out",
          }}
        >
          {props.loadMoreLabel ?? "Carregar mais"}
        </button>
      </div>
    </div>
  );
}
