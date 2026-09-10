import { Suspense } from "react";
import Link from "next/link";
import SiteLogo from "../../components/SiteLogo";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="reg-shell">
      <aside className="reg-rail">
        <div>
          <Link href="/" className="back">← Back home</Link>
        </div>
        <SiteLogo tone="light" height={44} />
        <div>
          <h2 style={{ margin: "0 0 0.5rem" }}>Welcome back</h2>
          <p style={{ color: "#9aa4ae", fontSize: "0.92rem" }}>
            School administrators sign in to their portal. Platform
            administrators sign in to the control center.
          </p>
        </div>
        <div className="reg-rail-foot">
          <p>
            <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a>
            <br />
            <a href="tel:+254728249135">+254 728 249135</a>
          </p>
        </div>
      </aside>
      <main className="reg-main">
        <div className="reg-card" style={{ maxWidth: 440 }}>
          <div className="reg-kicker">Sign in</div>
          <h1>Login</h1>
          <p className="reg-sub">Use your school or platform account.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="reg-sub" style={{ marginTop: "1.5rem" }}>
            <small>
              New school? <a href="/pricing">See plans and register →</a>
            </small>
          </p>
        </div>
      </main>
    </div>
  );
}
