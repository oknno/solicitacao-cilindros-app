import { useState } from "react";
import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { Button } from "./app/components/ui/Button";
import { uiTokens } from "./app/components/ui/tokens";
import { MaterialDashboardPage } from "./app/pages/MaterialDashboardPage";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";

type ActivePage = "requests" | "dashboard";

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>("requests");

  return (
    <ToastProvider>
      <div className="capex-app">
        <main className="capex-container" style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: uiTokens.spacing.md, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: uiTokens.spacing.md, background: uiTokens.colors.surface, border: `1px solid ${uiTokens.colors.border}`, borderRadius: uiTokens.radius.lg, padding: uiTokens.spacing.md }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: uiTokens.colors.textStrong, fontWeight: uiTokens.typography.titleWeight }}>
                Solicitação de Material Cilindros e Discos
              </div>
              <div style={{ marginTop: uiTokens.spacing.xs, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.xs }}>
                Navegue entre a operação de solicitações e o dashboard gerencial.
              </div>
            </div>
            <div style={{ display: "flex", gap: uiTokens.spacing.sm, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Button tone={activePage === "requests" ? "primary" : "default"} onClick={() => setActivePage("requests")}>Solicitações</Button>
              <Button tone={activePage === "dashboard" ? "primary" : "default"} onClick={() => setActivePage("dashboard")}>Dashboard</Button>
            </div>
          </div>
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            {activePage === "requests" ? <MaterialRequestsHomePage /> : <MaterialDashboardPage />}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
