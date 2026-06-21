import type { ScanReport } from './types'

// In local dev, VITE_API_BASE is empty and the call goes to /api (Vite proxies to :8080).
// In production (Vercel), set VITE_API_BASE to your deployed backend URL.
const base = (import.meta as any).env?.VITE_API_BASE ?? ''

export async function scanCode(code: string): Promise<ScanReport> {
  const res = await fetch(`${base}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) {
    throw new Error(`The scanner responded with ${res.status}.`)
  }
  return res.json() as Promise<ScanReport>
}
