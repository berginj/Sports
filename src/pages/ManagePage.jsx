import { useState } from "react";
import DivisionsManager from "../manage/DivisionsManager";

export default function ManagePage() {
  const [subTab, setSubTab] = useState("divisions"); // later: teams, fields

  return (
    <div style={{ padding: 16 }}>
      <h2>Manage</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setSubTab("divisions")} disabled={subTab === "divisions"}>
          Divisions
        </button>
        {/* later */}
        {/* <button onClick={() => setSubTab("teams")}>Teams</button> */}
        {/* <button onClick={() => setSubTab("fields")}>Fields</button> */}
      </div>

      {subTab === "divisions" && <DivisionsManager />}
    </div>
  );
}
