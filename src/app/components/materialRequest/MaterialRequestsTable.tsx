import type { ReactNode } from "react";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { uiTokens } from "../ui/tokens";

const tableColumns = "72px minmax(100px, 0.9fr) minmax(120px, 1fr) minmax(220px, 1.9fr) minmax(105px, 0.9fr) minmax(168px, 1.1fr) minmax(160px, 1.2fr)";

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
    <div style={{ minHeight: 0, display: "grid", gridTemplateRows: "1fr auto", gap: 10 }}>
      <div style={{ border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.md, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, maxHeight: 520 }}>
          <div style={{ display: "grid", gridTemplateColumns: tableColumns, background: uiTokens.colors.surfaceMuted, borderBottom: `1px solid ${uiTokens.colors.border}`, position: "sticky", top: 0, zIndex: 1 }}>
            {["ID", "Centro", "Material", "Descrição", "Solicitado", "Status", "Solicitante"].map((h) => <div key={h} style={{ padding: "10px 10px", fontSize: 12, fontWeight: 700, color: uiTokens.colors.text }}>{h}</div>)}
          </div>
          <div>
            {props.items.map((item) => {
              const active = item.id != null && item.id === props.selectedId;
              return (
                <div key={item.id ?? `${item.title}-${item.materialCode}`} onClick={() => props.onSelect(item)} style={{ display: "grid", gridTemplateColumns: tableColumns, cursor: "pointer", borderBottom: `1px solid ${uiTokens.colors.borderMuted}`, background: active ? uiTokens.colors.accentSoft : uiTokens.colors.surface }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 0 }}>
        <div>
          <span style={{ fontSize: uiTokens.typography.xs, color: uiTokens.colors.textMuted }}>Itens carregados: <b>{props.items.length}</b>
          {props.hasActiveFilters ? <> de <b>{props.totalLoaded ?? props.items.length}</b></> : null}
          </span>
        </div>
        <button
          type="button"
          onClick={props.onLoadMore}
          disabled={props.loadMoreDisabled ?? !props.onLoadMore}
          style={{
            height: 34,
            padding: "0 14px",
            borderRadius: 8,
            border: `1px solid ${uiTokens.colors.border}`,
            background: uiTokens.colors.surface,
            color: uiTokens.colors.text,
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

function Cell({ children, title }: { children: ReactNode; title?: string }) {
  return <div title={title} style={{ padding: "10px 10px", fontSize: 13, color: uiTokens.colors.textStrong, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</div>;
}
