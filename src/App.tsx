import { useState } from "react";

import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { Card } from "./app/components/ui/Card";
import { Button } from "./app/components/ui/Button";
import { uiTokens } from "./app/components/ui/tokens";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";
import { MaterialRequestFormPage } from "./app/pages/MaterialRequestFormPage";
import { CtoApprovalPage } from "./app/pages/CtoApprovalPage";
import type { CtoDecision, MaterialRequest } from "./domain/materialRequest";

type AppView = "home" | "newRequest" | "ctoApproval";

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [homeKey, setHomeKey] = useState(0);
  const [selectedRequestForCto, setSelectedRequestForCto] = useState<MaterialRequest | null>(null);
  const [initialCtoDecision, setInitialCtoDecision] = useState<CtoDecision | undefined>(undefined);

  return (
    <ToastProvider>
      <div className="capex-app">
        <main className="capex-container">
          {view === "home" && <MaterialRequestsHomePage key={homeKey} onChangeView={setView} onCtoDecisionRequest={(request, decision) => {
            setSelectedRequestForCto(request);
            setInitialCtoDecision(decision);
            setView("ctoApproval");
          }} />}
          {view === "newRequest" && (
            <MaterialRequestFormPage
              onBack={() => setView("home")}
              onCreated={() => {
                setHomeKey((current) => current + 1);
                setView("home");
              }}
            />
          )}
          {view === "ctoApproval" && selectedRequestForCto && <CtoApprovalPage
            request={selectedRequestForCto}
            initialDecision={initialCtoDecision}
            onBack={() => setView("home")}
            onDecided={() => {
              setHomeKey((current) => current + 1);
              setView("home");
            }}
          />}
          {view === "ctoApproval" && !selectedRequestForCto && <div style={{ background: uiTokens.colors.appBackground, minHeight: "100%", padding: uiTokens.spacing.md }}><Card><h2 style={{ marginTop: 0 }}>Aprovação CTO</h2><p>Nenhuma solicitação foi selecionada.</p><Button onClick={() => setView("home")}>Voltar para Home</Button></Card></div>}
        </main>
      </div>
    </ToastProvider>
  );
}
