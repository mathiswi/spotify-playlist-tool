'use server'

import { auth } from '@/auth'
import { SpotifyTrack, SpotifyAlbum, SpotifyPlaylist, SpotifyPlaylistTrack } from '@/types/spotify'
import { parseSongListWithRules, type SongQuery, type SongListParseResult } from '@/lib/song-list'

async function getAuthHeaders() {
  const session = await auth()
  if (!session?.token?.accessToken) {
    throw new Error('No access token available. Please sign in again.')
  }
  return {
    'Authorization': `Bearer ${session.token.accessToken}`,
    'Content-Type': 'application/json',
  }
}

interface SearchResponse {
  tracks?: {
    href: string
    items: SpotifyTrack[]
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
  }
  albums?: {
    href: string
    items: SpotifyAlbum[]
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
  }
  playlists?: {
    href: string
    items: SpotifyPlaylist[]
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
  }
  // Count of Spotify-curated (editorial/algorithmic) playlists returned as
  // null by the search API. Third-party apps can't read these since
  // Nov 2024, so we drop them but surface the count to the user.
  inaccessiblePlaylistCount?: number
}

export async function searchSpotify(query: string, types: string[] = ['track', 'album'], limit: number = 20): Promise<SearchResponse> {
  const headers = await getAuthHeaders()
  
  const typeString = types.join(',')
  const encodedQuery = encodeURIComponent(query)
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodedQuery}&type=${typeString}&limit=${limit}`,
    { headers }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to search: ${response.statusText}`)
  }

  const data: SearchResponse = await response.json()

  // Typing an artist name should also surface that artist's albums, not just
  // album-title matches. Spotify's default album search is title-biased, so run
  // a second artist-scoped query and merge (artist matches first, deduped).
  if (types.includes('album')) {
    try {
      const artistAlbums = await searchAlbumsByArtist(query, limit, headers)
      if (artistAlbums.length > 0) {
        const seen = new Set<string>()
        const merged: SpotifyAlbum[] = []
        for (const album of [...artistAlbums, ...(data.albums?.items ?? [])]) {
          if (!seen.has(album.id)) {
            seen.add(album.id)
            merged.push(album)
          }
        }
        data.albums = {
          href: data.albums?.href ?? '',
          items: merged,
          limit,
          next: null,
          offset: 0,
          previous: null,
          total: merged.length,
        }
      }
    } catch {
      // Non-fatal: fall back to the title-based results already fetched.
    }
  }

  // Since Nov 2024, Spotify returns its editorial/algorithmic playlists
  // (Anime Now, Today's Top Hits, Discover Weekly, daily mixes…) as `null`
  // for third-party apps. Strip them so the UI doesn't crash, and report
  // the count so the user knows why expected results may be missing.
  if (data.playlists?.items) {
    const before = data.playlists.items.length
    data.playlists.items = data.playlists.items.filter(
      (item): item is SpotifyPlaylist => item !== null
    )
    data.inaccessiblePlaylistCount = before - data.playlists.items.length
  }

  return data
}

async function searchAlbumsByArtist(query: string, limit: number, headers: Record<string, string>): Promise<SpotifyAlbum[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:${query}`)}&type=album&limit=${limit}`,
    { headers }
  )
  if (!response.ok) return []
  const data = await response.json()
  return data?.albums?.items ?? []
}

export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const headers = await getAuthHeaders()
  const tracks: SpotifyTrack[] = []
  let offset = 0
  const limit = 50

  // First get the album details
  const albumResponse = await fetch(
    `https://api.spotify.com/v1/albums/${albumId}`,
    { headers }
  )
  
  if (!albumResponse.ok) {
    throw new Error(`Failed to fetch album: ${albumResponse.statusText}`)
  }
  
  const album = await albumResponse.json()

  // Get all tracks from the album
  while (true) {
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=${limit}&offset=${offset}`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch album tracks: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Convert simplified tracks to full track objects
    const fullTracks = data.items.map((track: SpotifyTrack) => ({
      ...track,
      album: {
        id: album.id,
        name: album.name,
        images: album.images,
        artists: album.artists,
        album_type: album.album_type,
        total_tracks: album.total_tracks,
        available_markets: album.available_markets,
        external_urls: album.external_urls,
        href: album.href,
        release_date: album.release_date,
        release_date_precision: album.release_date_precision,
        type: 'album',
        uri: album.uri
      },
      popularity: 0,
      available_markets: track.available_markets || [],
      external_ids: {},
      is_playable: true
    }))
    
    tracks.push(...fullTracks)
    
    if (!data.next) break
    offset += limit
  }

  return tracks
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const headers = await getAuthHeaders()
  const tracks: SpotifyTrack[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
      { headers }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist tracks: ${response.statusText}`)
    }

    const data: {
      items: SpotifyPlaylistTrack[]
      next: string | null
    } = await response.json()

    for (const item of data.items) {
      if (!item?.track) continue
      if (item.is_local) continue
      tracks.push(item.track)
    }

    if (!data.next) break
    offset += limit
  }

  return tracks
}

export async function addSearchTracksToSelection(trackIds: string[]): Promise<SpotifyTrack[]> {
  const headers = await getAuthHeaders()
  const batchSize = 50
  const tracks: SpotifyTrack[] = []
  
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize)
    const response = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tracks: ${response.statusText}`)
    }
    
    const data = await response.json()
    tracks.push(...(data.tracks || []))
  }
  
  return tracks
}

export interface SongMatch {
  song: string
  artist: string
  track: SpotifyTrack | null
}

/**
 * Parses a pasted song list into (song, artist) pairs. Uses Gemini when
 * GEMINI_API_KEY is configured and the call succeeds, otherwise falls back to
 * the deterministic rule parser. The feature works with or without a key.
 */
export async function parseSongList(text: string): Promise<SongListParseResult & { usedGemini: boolean }> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await parseWithGemini(text)
      if (result.queries.length > 0) {
        return { ...result, usedGemini: true }
      }
    } catch (err) {
      console.error('Gemini song parsing failed, falling back to rules:', err)
    }
  }

  return { ...parseSongListWithRules(text), usedGemini: false }
}

async function parseWithGemini(text: string): Promise<SongListParseResult> {
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite'
  const apiKey = process.env.GEMINI_API_KEY!

  const prompt = `Parse this list of songs into JSON. Each line describes one or more songs and their artist.

Formats used:
- "Song A und Song B von Artist"  (German: "und" = and, "von" = by)
- "Song - Artist"

Rules:
- Extract every song title and its artist into separate fields.
- Output JSON only, no markdown fences, no commentary.
- Ignore lines that are notes or not recognizable songs; put them in "ignored".
- Fix obvious typos in artist names, but do not invent songs.

Response schema:
{"songs":[{"song":"...","artist":"..."}],"ignored":["..."]}

Input:
${text}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0,
        },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!raw) {
    throw new Error('Gemini returned an empty response')
  }

  return parseGeminiJson(raw)
}

function parseGeminiJson(raw: string): SongListParseResult {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()

  const parsed: { songs?: unknown; ignored?: unknown } = JSON.parse(cleaned)
  const songs = Array.isArray(parsed?.songs) ? parsed.songs : []

  const queries: SongQuery[] = []
  for (const item of songs) {
    const candidate = item as { song?: unknown; artist?: unknown } | null | undefined
    if (candidate && typeof candidate.song === 'string' && typeof candidate.artist === 'string') {
      const song = candidate.song.trim()
      const artist = candidate.artist.trim()
      if (song && artist) {
        queries.push({ song, artist })
      }
    }
  }

  const ignored = Array.isArray(parsed?.ignored) ? parsed.ignored : []
  const skipped = ignored.filter((x): x is string => typeof x === 'string')

  return { queries, skipped }
}

/**
 * Resolves each (song, artist) query to its best matching Spotify track via
 * the search API. Returns the top track per query, or null when none found.
 */
export async function searchTracksByTitleArtist(queries: SongQuery[]): Promise<SongMatch[]> {
  const headers = await getAuthHeaders()

  return Promise.all(
    queries.map(async (query): Promise<SongMatch> => {
      const q = `track:${query.song} artist:${query.artist}`
      try {
        const response = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
          { headers }
        )
        if (!response.ok) return { ...query, track: null }
        const data = await response.json()
        return { ...query, track: data?.tracks?.items?.[0] ?? null }
      } catch {
        return { ...query, track: null }
      }
    })
  )
}