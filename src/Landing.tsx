import AuthPanel from './AuthPanel'
import type { AuthResponse } from './types'

export default function Landing({
  onAuth,
  onGuest,
}: {
  onAuth: (res: AuthResponse) => void
  onGuest: () => void
}) {
  return (
    <div className="landing">
      <div className="landing-inner">
        <section className="landing-hero">
          <div className="brand">
            <span className="shield" aria-hidden>&#9960;</span>
            <span className="brand-name">SpringGuard</span>
          </div>

          <h1 className="landing-title">Know your Spring Boot app's security grade.</h1>
          <p className="landing-sub">
            Paste a file or point it at a GitHub repo. SpringGuard grades it A–F, explains every
            issue in plain language, and adds an AI review for the flaws that rules can't catch.
          </p>

          <ul className="landing-points">
            <li><span className="chip">21</span> security rules, from CSRF to IDOR</li>
            <li><span className="chip">AI</span> review for context-dependent logic flaws</li>
            <li><span className="chip">repo</span> scan a GitHub repository or paste code</li>
          </ul>
        </section>

        <section className="landing-auth">
          <div className="landing-auth-head">Sign in or create an account</div>
          <AuthPanel onAuth={onAuth} />
          <button className="guestlink" onClick={onGuest}>
            Continue without signing in &rarr;
          </button>
          <p className="landing-fineprint">
            An account lets you save scans and revisit them later. You can sign in anytime.
          </p>
        </section>
      </div>
    </div>
  )
}
