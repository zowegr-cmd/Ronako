import { Component, type ReactNode, type ErrorInfo } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("React crash:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 24, fontFamily: "monospace", background: "#0a0a0b", color: "#ef4444", minHeight: "100vh" }}>
          <h2 style={{ marginBottom: 12 }}>Erreur React</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{err.message}\n{err.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// StrictMode retiré : cause des double-renders en dev qui déclenchent le briefing Marcus 2x
ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
