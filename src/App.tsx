import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";

export default function App() {
  return <ToastProvider><div className="capex-app"><main className="capex-container"><MaterialRequestsHomePage /></main></div></ToastProvider>;
}
