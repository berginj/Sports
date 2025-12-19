export default function TopNav({ tab, setTab }) {
  return (
    <header style={{ padding: 16 }}>
      <h1 style={{ margin: 0 }}>GameSwap</h1>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => setTab("offers")} disabled={tab === "offers"}>
          Offers
        </button>
        <button onClick={() => setTab("manage")} disabled={tab === "manage"}>
          Manage
        </button>
      </div>
    </header>
  );
}
