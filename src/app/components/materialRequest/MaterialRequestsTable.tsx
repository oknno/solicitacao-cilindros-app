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
    <div style={{ overflow: "auto", minHeight: 0 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: uiTokens.typography.sm }}>
        <thead>
          <tr>
            {[
              "Solicitação","Material","Descrição","Centro","Qtde. Solicitada","Estoque Avaliado","Parecer","Status","Solicitante"
            ].map((h) => <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: `1px solid ${uiTokens.colors.border}` }}>{h}</th>)}
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
                <td style={{ padding: 10 }}>{item.title ?? "-"}</td><td style={{ padding: 10 }}>{item.materialCode}</td><td style={{ padding: 10 }}>{item.materialDescription}</td><td style={{ padding: 10 }}>{item.center}</td><td style={{ padding: 10 }}>{item.requestedQuantity}</td><td style={{ padding: 10 }}>{item.evaluatedStockTotalAtRequest ?? "-"}</td><td style={{ padding: 10 }}><StockRecommendationBadge value={item.stockRecommendation} /></td><td style={{ padding: 10 }}><RequestStatusBadge value={item.status} /></td><td style={{ padding: 10 }}>{item.requesterName}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
