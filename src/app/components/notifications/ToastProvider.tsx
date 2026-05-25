import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";
import type { ToastTone } from "./toastContext";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};


export function ToastProvider(props: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;
    return () => {
      timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, tone }]);
    const timeoutId = setTimeout(() => {
      timeoutIdsRef.current.delete(timeoutId);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
    timeoutIdsRef.current.add(timeoutId);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      <div style={{ position: "fixed", right: 16, top: 16, zIndex: 10000, display: "grid", gap: 8 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              color: "#111827",
              background: toast.tone === "success" ? "#dcfce7" : toast.tone === "error" ? "#fee2e2" : "#e0f2fe",
              border: `1px solid ${toast.tone === "success" ? "#86efac" : toast.tone === "error" ? "#fca5a5" : "#7dd3fc"}`,
              boxShadow: "0 8px 24px rgba(17,24,39,.12)",
              minWidth: 260,
              maxWidth: 420,
              fontSize: 13
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
