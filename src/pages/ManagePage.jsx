// src/pages/ManagePage.jsx
import FieldsPage from "./FieldsPage";
import DivisionsManager from "../components/DivisionsManager";
import FieldsImport from "../components/FieldsImport";

export default function ManagePage({ leagueId }) {
  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto", display: "grid", gap: 14 }}>
      <FieldsPage leagueId={leagueId} />
      <FieldsImport leagueId={leagueId} />
      <DivisionsManager leagueId={leagueId} />
    </div>
  );
}
