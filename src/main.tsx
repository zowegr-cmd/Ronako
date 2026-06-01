import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// StrictMode retiré : cause des double-renders en dev qui déclenchent le briefing Marcus 2x
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
