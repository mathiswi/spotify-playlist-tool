'use server'

import { auth } from '@/auth'
import { SpotifyPlaylist, PlaylistsResponse, SpotifyPlaylistTrack, SpotifyAudioFeatures } from '@/types/spotify'
import { getSongBPMService } from '@/lib/bpm/getsongbpm'

async function getAuthHeaders() {
  const session = await auth()
  if (!session?.token?.accessToken) {
    throw new Error('No access token available')
  }
  console.log('Using access token:', session.token.accessToken?.substring(0, 20) + '...')
  return {
    'Authorization': `Bearer ${session.token.accessToken}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchUserPlaylists(): Promise<SpotifyPlaylist[]> {
  const headers = await getAuthHeaders()
  const playlists: SpotifyPlaylist[] = []
  let offset = 0
  const limit = 50

  while (true) {
    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`,
      { headers }
    )
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlists: ${response.statusText}`)
    }
    
    const data: PlaylistsResponse = await response.json()
    playlists.push(...data.items)
    
    if (!data.next) break
    offset += limit
  }

  return playlists
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


export async function fetchBPMData(tracks: Array<{ id: string; name: string; artists: Array<{ name: string }> }>): Promise<SpotifyAudioFeatures[]> {
  if (tracks.length === 0) return []
  
  console.log(`Fetching BPM data for ${tracks.length} tracks using GetSongBPM...`)
  
  const features: SpotifyAudioFeatures[] = []
  
  try {
    // Prepare track data for BPM service
    const trackData = tracks.map(track => ({
      id: track.id,
      artist: track.artists[0]?.name || 'Unknown Artist',
      trackName: track.name,
    }))

    // Fetch BPM data using GetSongBPM service
    const bpmResults = await getSongBPMService.searchMultipleBPM(trackData)
    
    // Convert BPM results to Spotify audio features format
    bpmResults.forEach((bpmResult, trackId) => {
      if (bpmResult.bpm > 0) {
        features.push({
          tempo: bpmResult.bpm,
          id: trackId,
          uri: `spotify:track:${trackId}`,
          track_href: `https://api.spotify.com/v1/tracks/${trackId}`,
          analysis_url: `https://api.spotify.com/v1/audio-analysis/${trackId}`,
          duration_ms: 0, // Not available from GetSongBPM
          time_signature: parseInt(bpmResult.timeSignature || '4'),
          // Set reasonable defaults for other properties
          danceability: 0.5,
          energy: 0.5,
          key: 0,
          loudness: -10,
          mode: 1,
          speechiness: 0.1,
          acousticness: 0.3,
          instrumentalness: 0.1,
          liveness: 0.1,
          valence: 0.5,
          type: 'audio_features'
        })
      }
    })
    
    console.log(`Successfully fetched BPM data for ${features.length} out of ${tracks.length} tracks`)
    return features
    
  } catch (error) {
    console.error('Error fetching BPM data:', error)
    return []
  }
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