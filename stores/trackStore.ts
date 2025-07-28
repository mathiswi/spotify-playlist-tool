import { create } from 'zustand'
import { SpotifyPlaylist, EnrichedTrack, SpotifyAudioFeatures } from '@/types/spotify'
import { fetchPlaylistTracks, fetchBPMData } from '@/lib/actions/playlist-actions'

interface TrackStore {
  selectedPlaylists: Set<string>
  playlists: SpotifyPlaylist[]
  enrichedTracks: EnrichedTrack[]
  isLoading: boolean
  loadingProgress: { current: number; total: number; stage: string }
  error: string | null
  
  // Filter states
  minBpm: number
  maxBpm: number
  includeDoubleBpm: boolean
  searchQuery: string
  sortBy: 'name' | 'artist' | 'album' | 'bpm' | 'duration'
  sortOrder: 'asc' | 'desc'
  
  // Actions
  setPlaylists: (playlists: SpotifyPlaylist[]) => void
  togglePlaylistSelection: (playlistId: string) => void
  clearSelection: () => void
  loadTracksFromSelectedPlaylists: () => Promise<void>
  setMinBpm: (bpm: number) => void
  setMaxBpm: (bpm: number) => void
  setIncludeDoubleBpm: (include: boolean) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: 'name' | 'artist' | 'album' | 'bpm' | 'duration') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  getFilteredTracks: () => EnrichedTrack[]
}

export const useTrackStore = create<TrackStore>((set, get) => ({
  selectedPlaylists: new Set(),
  playlists: [],
  enrichedTracks: [],
  isLoading: false,
  loadingProgress: { current: 0, total: 0, stage: '' },
  error: null,
  
  minBpm: 0,
  maxBpm: 200,
  includeDoubleBpm: false,
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  
  setPlaylists: (playlists) => set({ playlists }),
  
  togglePlaylistSelection: (playlistId) => {
    const current = get().selectedPlaylists
    const newSelection = new Set(current)
    
    if (newSelection.has(playlistId)) {
      newSelection.delete(playlistId)
    } else {
      newSelection.add(playlistId)
    }
    
    set({ selectedPlaylists: newSelection })
  },
  
  clearSelection: () => set({ 
    selectedPlaylists: new Set(),
    enrichedTracks: []
  }),
  
  loadTracksFromSelectedPlaylists: async () => {
    const { selectedPlaylists, playlists } = get()
    
    if (selectedPlaylists.size === 0) {
      set({ enrichedTracks: [] })
      return
    }
    
    set({ isLoading: true, error: null, loadingProgress: { current: 0, total: selectedPlaylists.size, stage: 'Loading playlist tracks...' } })
    
    try {
      const allTracks: EnrichedTrack[] = []
      let currentPlaylist = 0
      
      for (const playlistId of selectedPlaylists) {
        currentPlaylist++
        set({ loadingProgress: { current: currentPlaylist, total: selectedPlaylists.size, stage: `Loading tracks from playlist ${currentPlaylist} of ${selectedPlaylists.size}...` } })
        const playlist = playlists.find(p => p.id === playlistId)
        if (!playlist) continue
        
        const playlistTracks = await fetchPlaylistTracks(playlistId)
        
        const tracks: EnrichedTrack[] = playlistTracks
          .filter(item => item.track && !item.track.is_local)
          .map(item => ({
            ...item.track,
            playlistId,
            playlistName: playlist.name,
          }))
        
        allTracks.push(...tracks)
      }
      
      // Get BPM data for all tracks using GetSongBPM
      set({ loadingProgress: { current: selectedPlaylists.size, total: selectedPlaylists.size, stage: 'Loading BPM data from GetSongBPM...' } })
      let audioFeatures: SpotifyAudioFeatures[] = []
      
      try {
        audioFeatures = await fetchBPMData(allTracks)
      } catch (error) {
        console.warn('Failed to fetch BPM data, continuing without BPM data:', error)
      }
      
      // Create a map for quick lookup
      const featuresMap = new Map(
        audioFeatures.map(feature => [feature.id, feature])
      )
      
      // Enrich tracks with audio features
      const enrichedTracks = allTracks.map(track => ({
        ...track,
        audioFeatures: featuresMap.get(track.id),
      }))
      
      set({ enrichedTracks, isLoading: false })
    } catch (error) {
      console.error('Error loading tracks:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load tracks',
        isLoading: false 
      })
    }
  },
  
  setMinBpm: (bpm) => set({ minBpm: bpm }),
  setMaxBpm: (bpm) => set({ maxBpm: bpm }),
  setIncludeDoubleBpm: (include) => set({ includeDoubleBpm: include }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  
  getFilteredTracks: () => {
    const { enrichedTracks, minBpm, maxBpm, includeDoubleBpm, searchQuery, sortBy, sortOrder } = get()
    
    const filtered = enrichedTracks.filter(track => {
      // BPM filter
      if (track.audioFeatures) {
        const bpm = track.audioFeatures.tempo
        let bpmMatches = bpm >= minBpm && bpm <= maxBpm
        
        // Include double BPM (half tempo and double tempo)
        if (!bpmMatches && includeDoubleBpm) {
          const halfBpm = bpm / 2
          const doubleBpm = bpm * 2
          bpmMatches = (halfBpm >= minBpm && halfBpm <= maxBpm) || 
                       (doubleBpm >= minBpm && doubleBpm <= maxBpm)
        }
        
        if (!bpmMatches) return false
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = track.name.toLowerCase().includes(query)
        const matchesArtist = track.artists.some(artist => 
          artist.name.toLowerCase().includes(query)
        )
        const matchesAlbum = track.album.name.toLowerCase().includes(query)
        
        if (!matchesName && !matchesArtist && !matchesAlbum) return false
      }
      
      return true
    })
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'artist':
          comparison = a.artists[0]?.name.localeCompare(b.artists[0]?.name || '') || 0
          break
        case 'album':
          comparison = a.album.name.localeCompare(b.album.name)
          break
        case 'bpm':
          const aBpm = a.audioFeatures?.tempo || 0
          const bBpm = b.audioFeatures?.tempo || 0
          comparison = aBpm - bBpm
          break
        case 'duration':
          comparison = a.duration_ms - b.duration_ms
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  },
}))