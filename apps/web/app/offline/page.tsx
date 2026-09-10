export default function OfflinePage() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <h1>You are offline</h1>
      <p style={{ color: "#5b6470" }}>
        MtandaoLabsEdu needs a connection for live school data. Reconnect and try again.
      </p>
      <a href="/">Retry →</a>
    </div>
  );
}
