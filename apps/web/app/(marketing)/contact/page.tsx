export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/">← Back home</a>
      <h1>Contact</h1>
      <p style={{ color: "#5b6470" }}>
        Talk to us to book a demo or ask anything about MtandaoLabs.
      </p>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a>
      </p>
      <p>
        <strong>Phone:</strong>{" "}
        <a href="tel:+254728249135">+254 728 249135</a>
      </p>
      <p>
        <strong>WhatsApp:</strong>{" "}
        <a href="https://wa.me/254728249135" target="_blank" rel="noreferrer">
          Chat with us
        </a>
      </p>
    </div>
  );
}
