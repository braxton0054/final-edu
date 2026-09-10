export default function SupportPage() {
  return (
    <>
      <div className="admin-top"><h1>Support</h1></div>
      <div className="admin-body">
        <div className="admin-panel">
          <h2>Tickets</h2>
          <p style={{ color: "var(--muted)" }}>
            No open tickets. The ticket model (school requests, technical
            issues) plugs in here next.
          </p>
        </div>
        <div className="admin-panel">
          <h2>Announcements</h2>
          <p style={{ color: "var(--muted)" }}>
            Broadcasts to all schools go out over email + WhatsApp + in-app.
            Contact: <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a> ·{" "}
            <a href="tel:+254728249135">+254 728 249135</a>
          </p>
        </div>
      </div>
    </>
  );
}
