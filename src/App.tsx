import { useState } from 'react'
import { scanCode } from './api'
import type { ScanReport, Severity } from './types'

const SAMPLE = `// SecurityConfig.java + application.properties (sample)
http
  .csrf().disable()
  .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

@CrossOrigin(origins = "*")
@RestController
class UserController {
  @GetMapping("/users/{id}")
  User get(@PathVariable Long id) {
    try { return repo.findById(id).get(); }
    catch (Exception e) { throw new RuntimeException(e.getMessage()); }
  }
}

# application.properties
management.endpoints.web.exposure.include=*
spring.datasource.password=admin123
jwt.secret=secret
jwt.expiration=0`

const GRADE_COLOR: Record<string, string> = {
  A: 'var(--green)', B: 'var(--green)', C: 'var(--amber)', D: 'var(--orange)', F: 'var(--red)',
}
const SEV_LABEL: Record<Severity, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

export default function App() {
  const [code, setCode] = useState(SAMPLE)
  const [report, setReport] = useState<ScanReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runScan() {
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const result = await scanCode(code)
      setReport(result)
    } catch {
      setError("Couldn't reach the scanner. Make sure the backend is running on http://localhost:8080, then scan again.")
    } finally {
      setLoading(false)
    }
  }

  const analyzed = report && report.status === 'ANALYZED'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="shield" aria-hidden>&#9960;</span>
          <span className="brand-name">SpringGuard</span>
        </div>
        <span className="brand-tag">A security grade for your Spring Boot app</span>
      </header>

      <main className="layout">
        <section className="pane">
          <div className="pane-label">Your code</div>
          <textarea
            className="editor"
            value={code}
            spellCheck={false}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Spring Boot code to scan"
          />
          <button className="scan-btn" onClick={runScan} disabled={loading || !code.trim()}>
            {loading ? 'Scanning\u2026' : 'Scan for vulnerabilities'}
          </button>
          <p className="hint">Fix an issue, then scan again to watch the grade climb.</p>
        </section>

        <section className="pane">
          <div className="pane-label">Report</div>

          {!report && !error && !loading && (
            <div className="empty"><p>Run a scan to see the security grade and findings.</p></div>
          )}

          {loading && <div className="empty"><p>Analysing your code\u2026</p></div>}

          {error && <div className="error">{error}</div>}

          {report && !analyzed && (
            <div className="notice">{report.message}</div>
          )}

          {analyzed && report && (
            <div className="report">
              <div className="gradecard">
                <div className="grade" style={{ color: GRADE_COLOR[report.grade] || 'var(--amber)' }}>
                  {report.grade}
                </div>
                <div className="gradeinfo">
                  <div className="score">Security score <strong>{report.score}</strong><span>/100</span></div>
                  <div className="summary">{report.summary}</div>
                </div>
              </div>

              <div className="findings">
                {report.findings.length === 0 && (
                  <div className="clean">No known issues found. Nicely done.</div>
                )}
                {report.findings.map((f) => (
                  <article key={f.id} className={`finding sev-${f.severity.toLowerCase()}`}>
                    <header className="finding-head">
                      <span className="sev-badge">{SEV_LABEL[f.severity]}</span>
                      <h3 className="finding-title">{f.title}</h3>
                    </header>
                    <p className="finding-why">{f.why}</p>
                    <p className="finding-fix"><span>Fix</span> {f.fix}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="foot">SpringGuard &middot; Java &middot; Spring Boot</footer>
    </div>
  )
}
