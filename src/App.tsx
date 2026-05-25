import { useState } from "react";

import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { Card } from "./app/components/ui/Card";
import { Button } from "./app/components/ui/Button";
import { uiTokens } from "./app/components/ui/tokens";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";
import { MaterialRequestFormPage } from "./app/pages/MaterialRequestFormPage";

type AppView = "home" | "newRequest" | "ctoApproval";

function PlaceholderView(props: { title: string; onBack: () => void }) {
  return (
    <div style={{ background: uiTokens.colors.appBackground, minHeight: "100%", padding: uiTokens.spacing.md }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>{props.title}</h2>
        <p>Fluxo será implementado em etapa futura.</p>
        <Button onClick={props.onBack}>Voltar para Home</Button>
      </Card>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>("home");
  const [homeKey, setHomeKey] = useState(0);

  return (
    <ToastProvider>
      <div className="capex-app">
        <main className="capex-container">
          {view === "home" && <MaterialRequestsHomePage key={homeKey} onChangeView={setView} />}
          {view === "newRequest" && (
            <MaterialRequestFormPage
              onBack={() => setView("home")}
              onCreated={() => {
                setHomeKey((current) => current + 1);
                setView("home");
              }}
            />
          )}
          {view === "ctoApproval" && <PlaceholderView title="Aprovação CTO" onBack={() => setView("home")} />}
        </main>
      </div>
    </ToastProvider>
  );
}
