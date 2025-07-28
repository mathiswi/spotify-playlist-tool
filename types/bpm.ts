export interface BPMResult {
  bpm: number
  confidence: number
  source: 'getsongbpm'
  key?: string
  timeSignature?: string
}