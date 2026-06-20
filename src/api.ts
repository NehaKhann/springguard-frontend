import type { ScanReport } from './types'

// Calls the backend through Vite's dev proxy (/api -> http://localhost:8080).
export async function scanCode(code: string): Promise<ScanReport> {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    throw new Error(`The scanner responded with ${res.status}.`)
  }
  return res.json() as Promise<ScanReport>
}
