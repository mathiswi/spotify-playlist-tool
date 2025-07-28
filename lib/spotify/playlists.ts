import { spotifyApi } from './api'
import { SpotifyPlaylist, PlaylistsResponse, SpotifyPlaylistTrack } from '@/types/spotify'

export async function getUserPlaylists(limit: number = 50, offset: number = 0): Promise<PlaylistsResponse> {
  return spotifyApi.get<PlaylistsResponse>('/me/playlists', {
    limit,
    offset,
  })
}

export async function getAllUserPlaylists(): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = []
  let offset = 0
  const limit = 50

  while (true) {
    const response = await getUserPlaylists(limit, offset)
    playlists.push(...response.items)
    
    if (!response.next) break
    offset += limit
  }

  return playlists
}

export async function getPlaylistTracks(playlistId: string, limit: number = 50, offset: number = 0) {
  return spotifyApi.get<{
    href: string
    limit: number
    next: string | null
    offset: number
    previous: string | null
    total: number
    items: SpotifyPlaylistTrack[]
  }>(`/playlists/${playlistId}/tracks`, {
    limit,
    offset,
  })
}

export async function getAllPlaylistTracks(playlistId: string): Promise<SpotifyPlaylistTrack[]> {
  const tracks: SpotifyPlaylistTrack[] = []
  let offset = 0
  const limit = 50

  while (true) {
    const response = await getPlaylistTracks(playlistId, limit, offset)
    tracks.push(...response.items)
    
    if (!response.next) break
    offset += limit
  }

  return tracks
}

export async function createPlaylist(userId: string, name: string, description?: string, isPublic: boolean = false) {
  return spotifyApi.post<SpotifyPlaylist>(`/users/${userId}/playlists`, {
    name,
    description,
    public: isPublic,
  })
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[]) {
  const batchSize = 100
  const batches = []
  
  for (let i = 0; i < trackUris.length; i += batchSize) {
    batches.push(trackUris.slice(i, i + batchSize))
  }

  for (const batch of batches) {
    await spotifyApi.post(`/playlists/${playlistId}/tracks`, {
      uris: batch,
    })
  }
}

export async function getCurrentUser() {
  return spotifyApi.get<{
    country: string
    display_name: string
    email: string
    explicit_content: {
      filter_enabled: boolean
      filter_locked: boolean
    }
    external_urls: {
      spotify: string
    }
    followers: {
      href: string | null
      total: number
    }
    href: string
    id: string
    images: Array<{
      url: string
      height: number | null
      width: number | null
    }>
    product: string
    type: string
    uri: string
  }>('/me')
}