export type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Finding {
  id: string
  severity: Severity
  title: string
  why: string
  fix: string
}

export interface ScanReport {
  score: number
  grade: string
  summary: string
  findings: Finding[]
  status: 'ANALYZED' | 'EMPTY' | 'NOT_SPRING' | 'TOO_LARGE'
  message: string | null
}

export interface AuthResponse {
  token: string
  email: string
}

export interface ScanRecordResponse {
  id: number
  grade: string
  score: number
  summary: string
  createdAt: string
  findings: Finding[]
}
