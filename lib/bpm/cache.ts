import { BPMResult } from './getsongbpm'

interface CachedBPMResult extends BPMResult {
  cachedAt: number
  trackKey: string
}

class BPMCache {
  private cache = new Map<string, CachedBPMResult>()
  private readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  private readonly STORAGE_KEY = 'spotify-playlist-tool-bpm-cache'

  constructor() {
    this.loadFromLocalStorage()
  }

  private generateTrackKey(artist: string, trackName: string): string {
    return `${artist.toLowerCase().trim()}::${trackName.toLowerCase().trim()}`
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Record<string, CachedBPMResult>
        
        // Load non-expired entries
        const now = Date.now()
        Object.entries(data).forEach(([key, value]) => {
          if (now - value.cachedAt < this.CACHE_TTL) {
            this.cache.set(key, value)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load BPM cache from localStorage:', error)
    }
  }

  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const data: Record<string, CachedBPMResult> = {}
      this.cache.forEach((value, key) => {
        data[key] = value
      })
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('Failed to save BPM cache to localStorage:', error)
    }
  }

  get(artist: string, trackName: string): BPMResult | null {
    const key = this.generateTrackKey(artist, trackName)
    const cached = this.cache.get(key)
    
    if (!cached) return null

    // Check if expired
    if (Date.now() - cached.cachedAt > this.CACHE_TTL) {
      this.cache.delete(key)
      this.saveToLocalStorage()
      return null
    }

    return {
      bpm: cached.bpm,
      confidence: cached.confidence,
      source: cached.source,
      key: cached.key,
      timeSignature: cached.timeSignature,
    }
  }

  set(artist: string, trackName: string, result: BPMResult): void {
    const key = this.generateTrackKey(artist, trackName)
    const cached: CachedBPMResult = {
      ...result,
      cachedAt: Date.now(),
      trackKey: key,
    }

    this.cache.set(key, cached)
    this.saveToLocalStorage()
  }

  has(artist: string, trackName: string): boolean {
    return this.get(artist, trackName) !== null
  }

  clear(): void {
    this.cache.clear()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  getStats(): { total: number; oldestEntry: Date | null; newestEntry: Date | null } {
    let oldest = Infinity
    let newest = 0

    this.cache.forEach(entry => {
      oldest = Math.min(oldest, entry.cachedAt)
      newest = Math.max(newest, entry.cachedAt)
    })

    return {
      total: this.cache.size,
      oldestEntry: oldest === Infinity ? null : new Date(oldest),
      newestEntry: newest === 0 ? null : new Date(newest),
    }
  }
}

export const bpmCache = new BPMCache()