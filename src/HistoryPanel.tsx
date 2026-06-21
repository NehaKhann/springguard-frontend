import { useState } from 'react'
import type { ScanRecordResponse, Severity } from './types'

const GRADE_COLOR: Record<string, string> = {
  A: 'var(--green)', B: 'var(--green)', C: 'var(--amber)', D: 'var(--orange)', F: 'var(--red)',
}
const SEV_LABEL: Record<Severity, string> = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

export default function HistoryPanel({ items }: { items: ScanRecordResponse[] }) {
  const [open, setOpen] = useState<number | null>(null)

  if (items.length === 0) {
    return <div className="empty"><p>No saved scans yet. Run a scan and save it to build your history.</p></div>
  }

  return (
    <div className="history">
      {items.map((it) => {
        const isOpen = open === it.id
        const count = it.findings?.length ?? 0
        return (
          <div key={it.id} className="histcard">
            <button className="histrow" onClick={() => setOpen(isOpen ? null : it.id)}>
              <span className="histgrade" style={{ color: GRADE_COLOR[it.grade] || 'var(--amber)' }}>{it.grade}</span>
              <div className="histbody">
                <div className="histsummary">{it.summary || `Score ${it.score}/100`}</div>
                <div className="histdate">{new Date(it.createdAt).toLocaleString()}</div>
              </div>
              <span className="histscore">{it.score}</span>
              <span className="histchevron">{count > 0 ? (isOpen ? '\u2212' : '+') : ''}</span>
            </button>

            {isOpen && count > 0 && (
              <div className="histfindings">
                {it.findings.map((f, i) => (
                  <article key={i} className={`finding sev-${f.severity.toLowerCase()}`}>
                    <header className="finding-head">
                      <span className="sev-badge">{SEV_LABEL[f.severity]}</span>
                      <h3 className="finding-title">{f.title}</h3>
                    </header>
                    <p className="finding-why">{f.why}</p>
                    <p className="finding-fix"><span>Fix</span> {f.fix}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
