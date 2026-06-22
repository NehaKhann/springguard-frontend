import { useEffect, useState } from 'react'
import { scanCode, saveScan, listScans, deleteScan } from './api'
import type { ScanReport, Severity, AuthResponse, ScanRecordResponse } from './types'
import AuthPanel from './AuthPanel'
import HistoryPanel from './HistoryPanel'

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

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sg_token'))
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem('sg_email'))
  const [showAuth, setShowAuth] = useState(false)
  const [history, setHistory] = useState<ScanRecordResponse[]>([])
  const [saved, setSaved] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const analyzed = report && report.status === 'ANALYZED'
  const aiFindings = report ? report.findings.filter((f) => f.source === 'AI') : []
  const aiHigh = aiFindings.filter((f) => f.severity === 'HIGH').length
  const aiMed = aiFindings.filter((f) => f.severity === 'MEDIUM').length
  const aiLow = aiFindings.filter((f) => f.severity === 'LOW').length

  function onAuth(res: AuthResponse) {
    setToken(res.token)
    setEmail(res.email)
    localStorage.setItem('sg_token', res.token)
    localStorage.setItem('sg_email', res.email)
    setShowAuth(false)
    // fresh slate on sign-in (consistent with sign-out)
    setReport(null)
    setError(null)
    setSaved(false)
    setSaveMsg(null)
  }
  function signOut() {
    setToken(null)
    setEmail(null)
    localStorage.removeItem('sg_token')
    localStorage.removeItem('sg_email')
    setHistory([])
    setShowAuth(false)
    setSaved(false)
    setSaveMsg(null)
    setReport(null)
    setError(null)
  }

  async function refreshHistory() {
    if (!token) return
    try { setHistory(await listScans(token)) } catch { /* ignore */ }
  }

  async function handleDelete(id: number) {
    if (!token) return
    if (!window.confirm('Delete this scan from your history?')) return
    try {
      await deleteScan(token, id)
      refreshHistory()
    } catch { /* ignore */ }
  }
  useEffect(() => { refreshHistory() /* eslint-disable-next-line */ }, [token])

  async function runScan() {
    setLoading(true); setError(null); setReport(null); setSaved(false); setSaveMsg(null)
    try {
      setReport(await scanCode(code))
    } catch {
      setError("Couldn't reach the scanner. Make sure the backend is running on http://localhost:8080, then scan again.")
    } finally {
      setLoading(false)
    }
  }

  async function saveCurrent() {
    if (!token || !report || !analyzed) return
    setSaveMsg(null)
    try {
      await saveScan(token, { grade: report.grade, score: report.score, summary: report.summary, findings: report.findings })
      setSaved(true)
      refreshHistory()
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Could not save this scan.')
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="shield" aria-hidden>&#9960;</span>
          <span className="brand-name">SpringGuard</span>
        </div>
        <span className="brand-tag">A security grade for your Spring Boot app</span>
        <div className="authbar">
          {email ? (
            <>
              <span className="authwho">{email}</span>
              <button className="linkbtn" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button className="linkbtn" onClick={() => setShowAuth((s) => !s)}>
              {showAuth ? 'Close' : 'Sign in'}
            </button>
          )}
        </div>
      </header>

      {showAuth && !email && <AuthPanel onAuth={onAuth} />}

      <main className="layout">
        <section className="pane">
          <div className="pane-label">Your code</div>
          <textarea
            className="editor" value={code} spellCheck={false}
            onChange={(e) => setCode(e.target.value)} aria-label="Spring Boot code to scan"
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
          {loading && <div className="empty"><p>Analysing your code…</p></div>}
          {error && <div className="error">{error}</div>}
          {report && !analyzed && <div className="notice">{report.message}</div>}

          {analyzed && report && (
            <div className="report">
              <div className="scorecards">
                <div className="gradecard">
                  <div className="grade" style={{ color: GRADE_COLOR[report.grade] || 'var(--amber)' }}>
                    {report.grade}
                  </div>
                  <div className="gradeinfo">
                    <div className="cardlabel">Rule grade</div>
                    <div className="score">Score <strong>{report.score}</strong><span>/100</span></div>
                    <div className="summary">{report.summary}</div>
                    {email ? (
                      <button className="savebtn" onClick={saveCurrent} disabled={saved}>
                        {saved ? 'Saved \u2713' : 'Save to history'}
                      </button>
                    ) : (
                      <button className="savebtn ghost" onClick={() => setShowAuth(true)}>
                        Sign in to save
                      </button>
                    )}
                    {saveMsg && <div className="autherror">{saveMsg}</div>}
                  </div>
                </div>

                <div className="aicard">
                  <div className="ai-emblem">AI</div>
                  <div>
                    <div className="cardlabel ai">AI review</div>
                    <div className="ai-count">
                      {aiFindings.length === 0 ? 'No additional concerns' : `${aiFindings.length} concern${aiFindings.length === 1 ? '' : 's'} found`}
                    </div>
                    {aiFindings.length > 0 && (
                      <div className="ai-breakdown">{aiHigh} high · {aiMed} medium · {aiLow} low</div>
                    )}
                    <div className="ai-note">Context-aware review. Advisory — doesn't change the rule grade.</div>
                  </div>
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
                      {f.source === 'AI' && <span className="ai-badge">AI review</span>}
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

      {email && (
        <section className="historysection">
          <div className="pane-label">Your scan history</div>
          <HistoryPanel items={history} onDelete={handleDelete} />
        </section>
      )}

      <footer className="foot">SpringGuard &middot; Java &middot; Spring Boot</footer>
    </div>
  )
}
