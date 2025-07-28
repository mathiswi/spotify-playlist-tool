'use server'

import { bpmCache } from './cache'

interface GetSongBPMResponse {
  song?: {
    bpm: number
    count: number
    uri: string
    img: string
    album: string
    artist: string
    song_title: string
    tag: string
    tempo: string
    time_sig: string
    key_of: string
    open_key: string
    camelot: string
  }
}

interface BPMResult {
  bpm: number
  confidence: number
  source: 'getsongbpm'
  key?: string
  timeSignature?: string
}

class GetSongBPMService {
  private apiKey: string | undefined
  private baseUrl = 'https://api.getsongbpm.com'

  constructor() {
    this.apiKey = process.env.GETSONGBPM_API_KEY
  }

  private normalizeSearchTerm(term: string): string {
    return term
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  async searchBPM(artist: string, trackName: string): Promise<BPMResult | null> {
    if (!this.apiKey) {
      console.warn('GetSongBPM API key not configured')
      return null
    }

    const normalizedArtist = this.normalizeSearchTerm(artist)
    const normalizedTrack = this.normalizeSearchTerm(trackName)

    // Check cache first
    const cached = bpmCache.get(normalizedArtist, normalizedTrack)
    if (cached) {
      console.log(`BPM cache hit for: ${normalizedArtist} - ${normalizedTrack}`)
      return cached
    }

    try {
      
      console.log(`Searching BPM for: ${normalizedArtist} - ${normalizedTrack}`)

      const response = await fetch(
        `${this.baseUrl}/search/?api_key=${this.apiKey}&type=both&lookup=song:${normalizedTrack} artist:${normalizedArtist}`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'Spotify-Playlist-Tool/1.0',
          },
        }
      )

      if (!response.ok) {
        console.warn(`GetSongBPM API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: GetSongBPMResponse = await response.json()

      if (data.song && data.song.bpm) {
        const confidence = data.song.count || 1 // Use count as confidence indicator
        
        const result: BPMResult = {
          bpm: data.song.bpm,
          confidence: Math.min(confidence / 10, 1), // Normalize to 0-1 scale
          source: 'getsongbpm',
          key: data.song.key_of || undefined,
          timeSignature: data.song.time_sig || undefined,
        }

        // Cache the result
        bpmCache.set(normalizedArtist, normalizedTrack, result)
        
        return result
      }

      return null
    } catch (error) {
      console.error('Error fetching BPM from GetSongBPM:', error)
      return null
    }
  }

  async searchMultipleBPM(tracks: Array<{ artist: string; trackName: string; id: string }>): Promise<Map<string, BPMResult>> {
    const results = new Map<string, BPMResult>()
    
    // Process in batches to avoid rate limiting
    const batchSize = 5
    const delay = 200 // ms between requests

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (track) => {
        const result = await this.searchBPM(track.artist, track.trackName)
        if (result) {
          results.set(track.id, result)
        }
        return result
      })

      await Promise.all(batchPromises)

      // Delay between batches
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return results
  }
}

export const getSongBPMService = new GetSongBPMService()
export type { BPMResult }