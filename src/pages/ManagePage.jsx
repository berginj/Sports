import FieldsPage from "./FieldsPage";
import FieldsImport from "../components/FieldsImport";
import SlotsImport from "../components/SlotsImport";
import DivisionsManager from "../components/DivisionsManager";

export default function ManagePage({ leagueId }) {
  return (
    <div className="stack">
      <div className="card">
        <div className="h2">Manage</div>
        <p className="muted">
          Imports are league-scoped. Make sure the correct league is selected in the top bar.
        </p>
      </div>

      <div className="grid grid--2">
        <div className="stack">
          <FieldsPage leagueId={leagueId} />
          <DivisionsManager />
        </div>

        <div className="stack">
          <FieldsImport leagueId={leagueId} />
          <SlotsImport leagueId={leagueId} />
        </div>
      </div>
    </div>
  );
}
