import { useEffect, useRef } from "react";

export function InputDialog(props: {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  confirmingText?: string;
  confirming?: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const confirming = Boolean(props.confirming);

  useEffect(() => {
    if (!props.open) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timeout);
  }, [props.open]);

  if (!props.open) return null;

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
        zIndex: 10000
      }}
      onMouseDown={confirming ? undefined : props.onClose}
    >
      <div
        style={{
          width: "min(560px, 96vw)",
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

        <div style={{ padding: 14, color: "#374151" }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "#111827" }}>{props.label}</span>
            <input
              key={`${props.open}-${props.defaultValue ?? ""}`}
              ref={inputRef}
              defaultValue={props.defaultValue ?? ""}
              placeholder={props.placeholder}
              disabled={confirming}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !confirming) {
                  props.onConfirm((e.currentTarget as HTMLInputElement).value);
                }
              }}
              style={{
                width: "100%",
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: "10px 12px",
                outline: "none",
                fontSize: 14,
                color: "#111827"
              }}
            />
          </label>
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
          <button
            className="btn primary"
            onClick={() => props.onConfirm(inputRef.current?.value ?? "")}
            disabled={confirming}
          >
            {confirming ? props.confirmingText ?? "Processando..." : props.confirmText ?? "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
