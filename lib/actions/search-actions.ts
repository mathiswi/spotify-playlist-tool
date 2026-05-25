'use server'

import { auth } from '@/auth'
import { SpotifyTrack, SpotifyAlbum, SpotifyPlaylist, SpotifyPlaylistTrack } from '@/types/spotify'

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