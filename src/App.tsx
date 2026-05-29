import { useEffect, useState } from "react";
import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { MaterialDashboardPage } from "./app/pages/MaterialDashboardPage";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";
import { SplashScreen } from "./app/components/SplashScreen/SplashScreen";

type CurrentView = "requests" | "dashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<CurrentView>("requests");
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);

  useEffect(() => {
    const splashDurationInMs = 1600;
    const splashExitDurationInMs = 360;

    const exitTimer = window.setTimeout(() => {
      setIsSplashExiting(true);
    }, splashDurationInMs);

    const removeTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, splashDurationInMs + splashExitDurationInMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <ToastProvider>
      <div className="capex-app">
        {showSplash ? <SplashScreen isExiting={isSplashExiting} /> : null}
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
    </ToastProvider>
  );
}
