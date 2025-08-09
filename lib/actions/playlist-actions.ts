'use server'

import { auth } from '@/auth'
import { SpotifyPlaylist, PlaylistsResponse, SpotifyPlaylistTrack, EnrichedTrack } from '@/types/spotify'

interface SpotifyAlbum {
  id: string
  name: string
  artists: { id: string; name: string }[]
  images: { url: string; height: number | null; width: number | null }[]
  total_tracks: number
  tracks?: {
    items: SpotifyTrackSimplified[]
  }
}

interface SpotifyTrackSimplified {
  id: string
  name: string
  artists: { id: string; name: string }[]
  duration_ms: number
  explicit: boolean
  external_urls: { spotify: string }
  href: string
  preview_url: string | null
  track_number: number
  type: 'track'
  uri: string
  is_local: boolean
}

interface SavedAlbumsResponse {
  href: string
  limit: number
  next: string | null
  offset: number
  previous: string | null
  total: number
  items: {
    added_at: string
    album: SpotifyAlbum
  }[]
}

async function getAuthHeaders() {
  const session = await auth()
  if (!session?.token?.accessToken) {
    throw new Error('No access token available. Please sign in again.')
  }
  console.log('Using access token:', session.token.accessToken?.substring(0, 20) + '...')
  return {
    'Authorization': `Bearer ${session.token.accessToken}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchUserPlaylists(): Promise<SpotifyPlaylist[]> {
  const headers = await getAuthHeaders()
  const limit = 50
  
  // First request to get total count
  const firstResponse = await fetch(
    `https://api.spotify.com/v1/me/playlists?limit=1`,
    { headers }
  )
  
  if (!firstResponse.ok) {
    throw new Error(`Failed to fetch playlists: ${firstResponse.statusText}`)
  }
  
  const firstData: PlaylistsResponse = await firstResponse.json()
  const total = firstData.total
  
  // Calculate how many requests we need
  const numRequests = Math.ceil(total / limit)
  
  // Fetch all pages in parallel
  const promises = []
  for (let i = 0; i < numRequests; i++) {
    const offset = i * limit
    promises.push(
      fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, { headers })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch playlists: ${res.statusText}`)
          return res.json() as Promise<PlaylistsResponse>
        })
    )
  }
  
  const results = await Promise.all(promises)
  const playlists: SpotifyPlaylist[] = []
  
  results.forEach(data => {
    playlists.push(...data.items)
  })
  
  return playlists
}

export async function fetchUserSavedAlbums(): Promise<SpotifyAlbum[]> {
  const headers = await getAuthHeaders()
  const limit = 50
  
  // First request to get total count
  const firstResponse = await fetch(
    `https://api.spotify.com/v1/me/albums?limit=1`,
    { headers }
  )
  
  if (!firstResponse.ok) {
    throw new Error(`Failed to fetch saved albums: ${firstResponse.statusText}`)
  }
  
  const firstData: SavedAlbumsResponse = await firstResponse.json()
  const total = firstData.total
  
  // Calculate how many requests we need
  const numRequests = Math.ceil(total / limit)
  
  // Fetch all pages in parallel
  const promises = []
  for (let i = 0; i < numRequests; i++) {
    const offset = i * limit
    promises.push(
      fetch(`https://api.spotify.com/v1/me/albums?limit=${limit}&offset=${offset}`, { headers })
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch albums: ${res.statusText}`)
          return res.json() as Promise<SavedAlbumsResponse>
        })
    )
  }
  
  const results = await Promise.all(promises)
  const albums: SpotifyAlbum[] = []
  
  results.forEach(data => {
    albums.push(...data.items.map(item => item.album))
  })
  
  return albums
}

export async function fetchMultiplePlaylistTracks(playlistIds: string[]): Promise<Map<string, SpotifyPlaylistTrack[]>> {
  const headers = await getAuthHeaders()
  
  // Fetch all playlists in parallel
  const promises = playlistIds.map(async (playlistId) => {
    const tracks: SpotifyPlaylistTrack[] = []
    let offset = 0
    const limit = 50

    while (true) {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        { headers }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks for playlist ${playlistId}: ${response.statusText}`)
      }
      
      const data = await response.json()
      tracks.push(...data.items)
      
      if (!data.next) break
      offset += limit
    }

    return { playlistId, tracks }
  })

  const results = await Promise.all(promises)
  
  // Convert to Map for easy lookup
  const trackMap = new Map<string, SpotifyPlaylistTrack[]>()
  results.forEach(({ playlistId, tracks }) => {
    trackMap.set(playlistId, tracks)
  })
  
  return trackMap
}

export async function fetchAlbumTrackCounts(albumIds: string[]): Promise<Map<string, number>> {
  const headers = await getAuthHeaders()
  const trackCounts = new Map<string, number>()
  
  // Batch album requests (50 at a time max)
  const batchSize = 20
  const batches = []
  
  for (let i = 0; i < albumIds.length; i += batchSize) {
    const batch = albumIds.slice(i, i + batchSize)
    batches.push(batch)
  }
  
  const promises = batches.map(async (batch) => {
    const response = await fetch(
      `https://api.spotify.com/v1/albums?ids=${batch.join(',')}`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch album details: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.albums || []
  })
  
  const results = await Promise.all(promises)
  
  // Flatten results and build track count map
  results.flat().forEach((album: SpotifyAlbum | null) => {
    if (album?.id) {
      trackCounts.set(album.id, album.total_tracks || 0)
    }
  })
  
  return trackCounts
}

export async function fetchAlbumTracks(albumIds: string[]): Promise<EnrichedTrack[]> {
  const headers = await getAuthHeaders()
  const tracks: EnrichedTrack[] = []
  
  // Batch album requests (20 at a time max)
  const batchSize = 20
  const batches = []
  
  for (let i = 0; i < albumIds.length; i += batchSize) {
    const batch = albumIds.slice(i, i + batchSize)
    batches.push(batch)
  }
  
  const promises = batches.map(async (batch) => {
    const response = await fetch(
      `https://api.spotify.com/v1/albums?ids=${batch.join(',')}`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch album tracks: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.albums || []
  })
  
  const results = await Promise.all(promises)
  
  // Extract tracks from all albums
  results.flat().forEach((album: SpotifyAlbum | null) => {
    if (album?.tracks?.items) {
      album.tracks.items.forEach((track: SpotifyTrackSimplified) => {
        tracks.push({
          ...track,
          artists: track.artists.map(artist => ({
            ...artist,
            external_urls: { spotify: '' },
            href: '',
            type: 'artist' as const,
            uri: ''
          })),
          album: {
            id: album.id,
            name: album.name,
            artists: album.artists.map(artist => ({
              ...artist,
              external_urls: { spotify: '' },
              href: '',
              type: 'artist' as const,
              uri: ''
            })),
            images: album.images,
            total_tracks: album.total_tracks,
            album_type: 'album',
            available_markets: [],
            external_urls: { spotify: '' },
            href: '',
            release_date: '',
            release_date_precision: '',
            type: 'album',
            uri: ''
          },
          available_markets: [],
          disc_number: 1,
          external_ids: {},
          is_playable: true,
          linked_from: undefined,
          restrictions: undefined,
          popularity: 0,
          playlistId: `album-${album.id}`,
          playlistName: `Album: ${album.name}`
        } as EnrichedTrack)
      })
    }
  })
  
  return tracks
}

export async function fetchPlaylistTracks(playlistId: string): Promise<SpotifyPlaylistTrack[]> {
  const headers = await getAuthHeaders()
  const tracks: SpotifyPlaylistTrack[] = []
  let offset = 0
  const limit = 50

  while (true) {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tracks for playlist ${playlistId}: ${response.statusText}`)
    }
    
    const data = await response.json()
    tracks.push(...data.items)
    
    if (!data.next) break
    offset += limit
  }

  return tracks
}

export async function createSpotifyPlaylist(name: string, description?: string, isPublic: boolean = false) {
  const headers = await getAuthHeaders()
  
  // First get current user
  const userResponse = await fetch('https://api.spotify.com/v1/me', { headers })
  if (!userResponse.ok) {
    throw new Error(`Failed to get user info: ${userResponse.statusText}`)
  }
  const user = await userResponse.json()
  
  // Create playlist
  const playlistResponse = await fetch(
    `https://api.spotify.com/v1/users/${user.id}/playlists`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    }
  )
  
  if (!playlistResponse.ok) {
    throw new Error(`Failed to create playlist: ${playlistResponse.statusText}`)
  }
  
  return playlistResponse.json()
}

export async function addTracksToSpotifyPlaylist(playlistId: string, trackUris: string[]) {
  const headers = await getAuthHeaders()
  const batchSize = 100
  
  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize)
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uris: batch,
        }),
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to add tracks to playlist: ${response.statusText}`)
    }
  }
}

export async function updatePlaylistPrivacy(playlistId: string, isPublic: boolean) {
  const headers = await getAuthHeaders()
  
  // Retry logic for Bad Gateway errors
  let retries = 3
  let lastError: Error | null = null
  
  while (retries > 0) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            public: isPublic,
          }),
        }
      )
      
      if (response.status === 403) {
        throw new Error('You can only update playlists you own')
      }
      
      if (response.status === 502) {
        // Bad Gateway - retry
        retries--
        lastError = new Error('Bad Gateway')
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
          continue
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to update playlist privacy: ${response.statusText}`)
      }
      
      // Success
      return { success: true }
    } catch (error) {
      if (error instanceof Error && error.message === 'You can only update playlists you own') {
        throw error
      }
      lastError = error as Error
      retries--
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }
  
  throw lastError || new Error('Failed to update playlist privacy after retries')
}

export async function updateMultiplePlaylistPrivacy(playlistIds: string[], isPublic: boolean) {
  const headers = await getAuthHeaders()
  
  // Get current user to check ownership
  const userResponse = await fetch('https://api.spotify.com/v1/me', { headers })
  if (!userResponse.ok) {
    throw new Error('Failed to get user info')
  }
  const user = await userResponse.json()
  
  // Get playlist details to check ownership
  const playlistPromises = playlistIds.map(id =>
    fetch(`https://api.spotify.com/v1/playlists/${id}?fields=id,owner`, { headers })
      .then(res => res.ok ? res.json() : null)
  )
  
  const playlists = await Promise.all(playlistPromises)
  
  // Filter to only playlists owned by current user
  const ownedPlaylistIds = playlists
    .filter(p => p && p.owner && p.owner.id === user.id)
    .map(p => p.id)
  
  const skippedCount = playlistIds.length - ownedPlaylistIds.length
  
  if (ownedPlaylistIds.length === 0) {
    throw new Error('You don\'t own any of the selected playlists. Only playlist owners can change privacy settings.')
  }
  
  // Update only owned playlists
  const promises = ownedPlaylistIds.map(playlistId => 
    updatePlaylistPrivacy(playlistId, isPublic)
  )
  
  const results = await Promise.allSettled(promises)
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  
  if (failures.length > 0) {
    const errorMessages = failures.map(f => f.reason.message).join(', ')
    throw new Error(`Failed to update ${failures.length} playlists: ${errorMessages}. ${skippedCount > 0 ? `Skipped ${skippedCount} playlists you don't own.` : ''}`)
  }
  
  return { updated: ownedPlaylistIds.length, skipped: skippedCount }
}

export async function deleteMultiplePlaylists(playlistIds: string[]) {
  const headers = await getAuthHeaders()
  
  const promises = playlistIds.map(async (playlistId) => {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/followers`,
      {
        method: 'DELETE',
        headers,
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to delete playlist ${playlistId}: ${response.statusText}`)
    }
    
    return playlistId
  })
  
  const results = await Promise.allSettled(promises)
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  
  if (failures.length > 0) {
    const errorMessages = failures.map(f => f.reason.message).join(', ')
    throw new Error(`Failed to delete ${failures.length} playlists: ${errorMessages}`)
  }
  
  return results.length
}

export async function removeAlbumsFromLibrary(albumIds: string[]) {
  const headers = await getAuthHeaders()
  const batchSize = 50
  
  for (let i = 0; i < albumIds.length; i += batchSize) {
    const batch = albumIds.slice(i, i + batchSize)
    const response = await fetch(
      `https://api.spotify.com/v1/me/albums?ids=${batch.join(',')}`,
      {
        method: 'DELETE',
        headers,
      }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to remove albums from library: ${response.statusText}`)
    }
  }
  
  return albumIds.length
}