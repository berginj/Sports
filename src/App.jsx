import { useState } from "react";
import OffersPage from "./pages/OffersPage";
import ManagePage from "./pages/ManagePage";

export default function App() {
  const [tab, setTab] = useState("offers"); // "offers" | "manage"

  return (
    <div>
      <header style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("offers")} disabled={tab === "offers"}>
            Offers
          </button>
          <button onClick={() => setTab("manage")} disabled={tab === "manage"}>
            Manage
          </button>
        </div>
      </header>

      {tab === "offers" && <OffersPage />}
      {tab === "manage" && <ManagePage />}
    </div>
  );
}
