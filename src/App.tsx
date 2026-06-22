import { useEffect, useState } from 'react'
import { scanCode, scanRepo, saveScan, listScans, deleteScan } from './api'
import type { ScanReport, Severity, AuthResponse, ScanRecordResponse } from './types'
import HistoryPanel from './HistoryPanel'
import Landing from './Landing'

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

type Mode = 'code' | 'repo'

export default function App() {
  const [mode, setMode] = useState<Mode>('code')
  const [code, setCode] = useState(SAMPLE)
  const [repoUrl, setRepoUrl] = useState('')
  const [repoToken, setRepoToken] = useState('')
  const [repoBranch, setRepoBranch] = useState('')

  const [report, setReport] = useState<ScanReport | null>(null)
  const [reportMode, setReportMode] = useState<Mode>('code')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sg_token'))
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem('sg_email'))
  const [guest, setGuest] = useState(false)
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
    setGuest(false)
    setHistory([])
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

  function beforeScan() {
    setLoading(true); setError(null); setReport(null); setSaved(false); setSaveMsg(null)
  }

  async function runScan() {
    beforeScan()
    try {
      setReport(await scanCode(code))
      setReportMode('code')
    } catch {
      setError("Couldn't reach the scanner. Make sure the backend is running, then scan again.")
    } finally {
      setLoading(false)
    }
  }

  async function runRepoScan() {
    beforeScan()
    try {
      setReport(await scanRepo(repoUrl, repoToken || undefined, repoBranch || undefined))
      setReportMode('repo')
    } catch {
      setError("Couldn't reach the scanner. Please try again in a moment.")
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

  function buildReportMarkdown(r: ScanReport): string {
    const target = reportMode === 'repo' ? (r.target || 'repository') : 'Pasted code'
    const date = new Date().toLocaleString()
    const lines: string[] = []
    lines.push('# SpringGuard Security Report')
    lines.push('')
    lines.push(`**Target:** ${target}`)
    lines.push(`**Grade:** ${r.grade} (score ${r.score}/100)`)
    if (reportMode === 'repo' && typeof r.filesScanned === 'number') {
      lines.push(`**Files scanned:** ${r.filesScanned}`)
    }
    lines.push(`**Generated:** ${date}`)
    lines.push('')
    lines.push(`> ${r.summary}`)
    lines.push('')
    lines.push(`## Findings (${r.findings.length})`)
    lines.push('')
    if (r.findings.length === 0) {
      lines.push('No known issues found.')
    } else {
      r.findings.forEach((f, i) => {
        const ai = f.source === 'AI' ? ' · AI review' : ''
        lines.push(`### ${i + 1}. [${f.severity}] ${f.title}${ai}`)
        if (f.file) lines.push(`**File:** \`${f.file}\``)
        lines.push('')
        lines.push(`**Why:** ${f.why}`)
        lines.push('')
        lines.push(`**Fix:** ${f.fix}`)
        lines.push('')
        lines.push('---')
        lines.push('')
      })
    }
    lines.push('_Generated by SpringGuard — rule-based + AI security review for Spring Boot._')
    return lines.join('\n')
  }

  function buildReportText(r: ScanReport): string {
    const target = reportMode === 'repo' ? (r.target || 'repository') : 'Pasted code'
    const date = new Date().toLocaleString()
    const nl = '\r\n'
    const out: string[] = []
    out.push('SPRINGGUARD SECURITY REPORT')
    out.push('===========================')
    out.push('')
    out.push('Target:        ' + target)
    out.push('Grade:         ' + r.grade + ' (score ' + r.score + '/100)')
    if (reportMode === 'repo' && typeof r.filesScanned === 'number') {
      out.push('Files scanned: ' + r.filesScanned)
    }
    out.push('Generated:     ' + date)
    out.push('')
    out.push('Summary:')
    out.push('  ' + r.summary)
    out.push('')
    out.push('FINDINGS (' + r.findings.length + ')')
    out.push('------------')
    out.push('')
    if (r.findings.length === 0) {
      out.push('No known issues found.')
    } else {
      r.findings.forEach((f, i) => {
        const ai = f.source === 'AI' ? '  (AI review)' : ''
        out.push((i + 1) + '. [' + f.severity + '] ' + f.title + ai)
        if (f.file) out.push('   File: ' + f.file)
        out.push('   Why:  ' + f.why)
        out.push('   Fix:  ' + f.fix)
        out.push('')
      })
    }
    out.push('---')
    out.push('Generated by SpringGuard — rule-based + AI security review for Spring Boot.')
    return out.join(nl)
  }

  function baseName(): string {
    const slug = (reportMode === 'repo' && report && report.target ? report.target.replace(/[^a-zA-Z0-9]+/g, '-') : 'scan')
    const stamp = new Date().toISOString().slice(0, 10)
    return `springguard-${slug}-${stamp}`
  }

  function triggerDownload(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadMd() {
    if (!report || !analyzed) return
    triggerDownload(buildReportMarkdown(report), baseName() + '.md', 'text/markdown')
  }

  function downloadTxt() {
    if (!report || !analyzed) return
    triggerDownload(buildReportText(report), baseName() + '.txt', 'text/plain')
  }

  const showLanding = !email && !guest
  if (showLanding) {
    return <Landing onAuth={onAuth} onGuest={() => setGuest(true)} />
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
            <button className="linkbtn" onClick={() => setGuest(false)}>
              Sign in
            </button>
          )}
        </div>
      </header>


      <main className="main">
        <section className="inputcard">
          <div className="modetabs">
            <button className={mode === 'code' ? 'on' : ''} onClick={() => setMode('code')}>Paste code</button>
            <button className={mode === 'repo' ? 'on' : ''} onClick={() => setMode('repo')}>GitHub repo</button>
          </div>

          {mode === 'code' ? (
            <>
              <textarea
                className="editor" value={code} spellCheck={false}
                onChange={(e) => setCode(e.target.value)} aria-label="Spring Boot code to scan"
              />
              <button className="scan-btn" onClick={runScan} disabled={loading || !code.trim()}>
                {loading ? 'Scanning\u2026' : 'Scan for vulnerabilities'}
              </button>
              <p className="hint">Fix an issue, then scan again to watch the grade climb.</p>
            </>
          ) : (
            <>
              <input
                className="repo-input" placeholder="https://github.com/owner/repo"
                value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
              />
              <input
                className="repo-input" placeholder="Branch (optional — leave blank for default)"
                value={repoBranch} onChange={(e) => setRepoBranch(e.target.value)}
              />
              <input
                className="repo-input" type="password" placeholder="GitHub token (only for private repos)"
                value={repoToken} onChange={(e) => setRepoToken(e.target.value)}
              />
              <button className="scan-btn" onClick={runRepoScan} disabled={loading || !repoUrl.trim()}>
                {loading ? 'Scanning repository\u2026' : 'Scan repository'}
              </button>
              <p className="hint">Public repos need no token. A token is used only for this scan and never stored.</p>
            </>
          )}
        </section>

        <section className="results">
          <div className="pane-label">Report</div>

          {!report && !error && !loading && (
            <div className="empty"><p>Run a scan to see the security grade and findings.</p></div>
          )}
          {loading && <div className="empty"><p>{mode === 'repo' ? 'Scanning the repository\u2026 this can take a moment.' : 'Analysing your code\u2026'}</p></div>}
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
                    <div className="cardlabel">{reportMode === 'repo' ? 'Repo grade' : 'Rule grade'}</div>
                    <div className="score">Score <strong>{report.score}</strong><span>/100</span></div>
                    <div className="summary">{report.summary}</div>
                    {email ? (
                      <button className="savebtn" onClick={saveCurrent} disabled={saved}>
                        {saved ? 'Saved \u2713' : 'Save to history'}
                      </button>
                    ) : (
                      <button className="savebtn ghost" onClick={() => setGuest(false)}>
                        Sign in to save
                      </button>
                    )}
                    <button className="downloadbtn" onClick={downloadMd}>Download .md</button>
                    <button className="downloadbtn" onClick={downloadTxt}>Download .txt</button>
                    {saveMsg && <div className="autherror">{saveMsg}</div>}
                  </div>
                </div>

                {reportMode === 'code' && (
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
                )}
              </div>

              <div className="findings">
                {report.findings.length === 0 && (
                  <div className="clean">No known issues found. Nicely done.</div>
                )}
                {report.findings.map((f, i) => (
                  <article key={i} className={`finding sev-${f.severity.toLowerCase()}`}>
                    <header className="finding-head">
                      <span className="sev-badge">{SEV_LABEL[f.severity]}</span>
                      {f.source === 'AI' && <span className="ai-badge">AI review</span>}
                      <h3 className="finding-title">{f.title}</h3>
                    </header>
                    {f.file && <div className="file-tag">{f.file}</div>}
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
