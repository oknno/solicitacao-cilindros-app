import { useCallback, useState } from "react";
import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { MaterialDashboardPage } from "./app/pages/MaterialDashboardPage";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";
import { SplashScreen } from "./app/components/SplashScreen/SplashScreen";

type CurrentView = "requests" | "dashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<CurrentView>("requests");
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ToastProvider>
      <div className={`capex-appContent${showSplash ? " capex-appContent--hiddenDuringSplash" : ""}`}>
        <div className="capex-app">
          <main className="capex-container" style={{ minHeight: 0 }}>
            <div style={{ minHeight: 0, overflow: "hidden" }}>
              {currentView === "requests" ? (
                <MaterialRequestsHomePage onOpenDashboard={() => setCurrentView("dashboard")} />
              ) : (
                <MaterialDashboardPage onBackToRequests={() => setCurrentView("requests")} />
              )}
            </div>
          </main>
        </div>
      </div>

      {showSplash ? <SplashScreen onFinish={handleSplashFinish} /> : null}
    </ToastProvider>
  );
}
