import Link from "next/link";

export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <Link href="/">← Back home</Link>
      <h1>About</h1>
      <p style={{ color: "#5b6470" }}>MtandaoLabsEdu — school management made simpler.</p>
    </div>
  );
}
