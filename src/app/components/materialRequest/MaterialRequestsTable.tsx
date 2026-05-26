import type { ReactNode } from "react";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { uiTokens } from "../ui/tokens";

const tableColumns = "72px minmax(100px, 0.9fr) minmax(120px, 1fr) minmax(220px, 1.9fr) minmax(105px, 0.9fr) minmax(168px, 1.1fr) minmax(160px, 1.2fr)";

export function MaterialRequestsTable(props: {
  items: MaterialRequest[];
  selectedId: number | null;
  onSelect: (item: MaterialRequest) => void;
  emptyMessage?: string;
}) {
  return (
    <div style={{ border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.md, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ overflowX: "hidden", overflowY: "auto", flex: 1, minHeight: 0, maxHeight: 520 }}>
        <div style={{ display: "grid", gridTemplateColumns: tableColumns, minWidth: 0, background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}`, position: "sticky", top: 0, zIndex: 1 }}>
          {["ID", "Centro", "Material", "Descrição", "Solicitado", "Status", "Solicitante"].map((h) => <div key={h} style={{ padding: "10px 10px", fontSize: 12, fontWeight: 700, color: uiTokens.colors.text }}>{h}</div>)}
        </div>
        <div style={{ minWidth: 0, minHeight: 0 }}>
          {props.items.map((item) => {
            const active = item.id != null && item.id === props.selectedId;
            return (
              <div key={item.id ?? `${item.title}-${item.materialCode}`} onClick={() => props.onSelect(item)} style={{ display: "grid", gridTemplateColumns: tableColumns, minWidth: 0, cursor: "pointer", borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, background: active ? uiTokens.colors.accentSoft : uiTokens.colors.surface }}>
                <Cell>{item.id ?? "-"}</Cell>
                <Cell title={item.center ?? "-"}>{item.center ?? "-"}</Cell>
                <Cell title={item.materialCode ?? "-"}>{item.materialCode ?? "-"}</Cell>
                <Cell title={item.materialDescription ?? "-"}>{item.materialDescription ?? "-"}</Cell>
                <Cell>{item.requestedQuantity ?? "-"}</Cell>
                <Cell><RequestStatusBadge value={item.status} /></Cell>
                <Cell title={item.requesterName ?? "-"}>{item.requesterName ?? "-"}</Cell>
              </div>
            );
          })}
          {props.items.length === 0 && <div style={{ padding: "20px 12px", textAlign: "center", color: uiTokens.colors.textMuted }}>{props.emptyMessage ?? "Nenhuma solicitação encontrada."}</div>}
        </div>
      </div>
    </div>
  );
}

function Cell({ children, title }: { children: ReactNode; title?: string }) {
  return <div title={title} style={{ padding: "10px 10px", fontSize: 13, color: uiTokens.colors.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</div>;
}
