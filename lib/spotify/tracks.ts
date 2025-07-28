import { spotifyApi } from './api'
import { SpotifyAudioFeatures } from '@/types/spotify'

export async function getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
  return spotifyApi.get<SpotifyAudioFeatures>(`/audio-features/${trackId}`)
}

export async function getMultipleAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
  const batchSize = 100
  const features: SpotifyAudioFeatures[] = []
  
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const batch = trackIds.slice(i, i + batchSize)
    const response = await spotifyApi.get<{ audio_features: SpotifyAudioFeatures[] }>('/audio-features', {
      ids: batch.join(',')
    })
    features.push(...response.audio_features.filter(Boolean))
  }
  
  return features
}