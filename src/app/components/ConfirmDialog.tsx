export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmingText?: string;
  cancelText?: string;
  tone?: "danger" | "neutral";
  confirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!props.open) return null;

  const confirming = Boolean(props.confirming);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999
      }}
      onMouseDown={confirming ? undefined : props.onClose}
    >
      <div
        style={{
          width: "min(520px, 96vw)",
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
          overflow: "hidden"
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 900, color: "#111827" }}>{props.title}</div>
        </div>

        <div style={{ padding: 14, color: "#374151", lineHeight: 1.35, whiteSpace: "pre-line" }}>
          {props.message}
        </div>

        <div
          style={{
            padding: 14,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8
          }}
        >
          <button className="btn" onClick={props.onClose} disabled={confirming}>
            {props.cancelText ?? "Cancelar"}
          </button>

          <button className="btn primary" onClick={props.onConfirm} disabled={confirming}>
            {confirming ? props.confirmingText ?? "Processando..." : props.confirmText ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
