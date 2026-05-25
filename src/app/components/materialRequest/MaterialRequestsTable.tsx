import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { StockRecommendationBadge } from "./StockRecommendationBadge";
import { uiTokens } from "../ui/tokens";

export function MaterialRequestsTable(props: {
  items: MaterialRequest[];
  selectedId: number | null;
  onSelect: (item: MaterialRequest) => void;
}) {
  return (
    <div style={{ background: uiTokens.colors.surface, border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.md, minHeight: 0, display: "grid", gridTemplateRows: "1fr auto", overflow: "hidden" }}>
      <div style={{ overflow: "auto", minHeight: 300, maxHeight: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: uiTokens.typography.sm }}>
          <thead>
            <tr>
              {[
                "Solicitação", "Material", "Descrição", "Centro", "Qtde. Solicitada", "Estoque Avaliado", "Parecer", "Status", "Solicitante",
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
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.title ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.materialCode ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.materialDescription ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.center ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.requestedQuantity ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}>{item.evaluatedStockTotalAtRequest ?? "-"}</td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}><StockRecommendationBadge value={item.stockRecommendation} /></td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}` }}><RequestStatusBadge value={item.status} /></td>
                  <td style={{ padding: "8px 12px", borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.requesterName ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ borderTop: `1px solid ${uiTokens.colors.border}`, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: uiTokens.colors.textMuted }}>
        <div>Itens carregados: <b>{props.items.length}</b></div>
      </div>
    </div>
  );
}
