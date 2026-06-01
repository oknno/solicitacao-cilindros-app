import { useCallback, useEffect, useState } from "react";
import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { MaterialDashboardPage } from "./app/pages/MaterialDashboardPage";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";
import { SplashScreen } from "./app/components/SplashScreen/SplashScreen";
import { resolveCurrentUserAccess } from "./application/resolveCurrentUserAccess";
import type { UserAccessProfile } from "./domain/accessControl";

type CurrentView = "requests" | "dashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<CurrentView>("requests");
  const [showSplash, setShowSplash] = useState(true);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [accessProfile, setAccessProfile] = useState<UserAccessProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    void resolveCurrentUserAccess().then((profile) => { if (mounted) setAccessProfile(profile); });
    return () => { mounted = false; };
  }, []);

  const handleSplashExitStart = useCallback(() => {
    setIsAppVisible(true);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ToastProvider>
      <div className={`capex-appContent${isAppVisible ? "" : " capex-appContent--hiddenDuringSplash"}`}>
        <div className="capex-app">
          <main className="capex-container" style={{ minHeight: 0 }}>
            <div className="capex-pageContent">
              {!accessProfile ? <p>Carregando permissões de acesso...</p> : currentView === "requests" ? (
                <MaterialRequestsHomePage accessProfile={accessProfile} onOpenDashboard={() => setCurrentView("dashboard")} />
              ) : (
                <MaterialDashboardPage accessProfile={accessProfile} onBackToRequests={() => setCurrentView("requests")} />
              )}
            </div>
          </main>
        </div>
      </div>

      {showSplash ? <SplashScreen onExitStart={handleSplashExitStart} onFinish={handleSplashFinish} /> : null}
    </ToastProvider>
  );
}
