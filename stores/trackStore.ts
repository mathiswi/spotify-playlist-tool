import { create } from 'zustand'
import { SpotifyPlaylist, EnrichedTrack, SpotifyTrack } from '@/types/spotify'
import { fetchPlaylistTracks, fetchMultiplePlaylistTracks, fetchUserSavedAlbums, fetchAlbumTracks } from '@/lib/actions/playlist-actions'

export interface Album {
  id: string
  name: string
  artists: { id: string; name: string }[]
  images: { url: string; height: number | null; width: number | null }[]
  total_tracks: number
  trackCount: number // tracks available from selected playlists
}

interface TrackStore {
  selectedPlaylists: Set<string>
  selectedAlbums: Set<string>
  playlists: SpotifyPlaylist[]
  savedAlbums: Album[]
  enrichedTracks: EnrichedTrack[]
  selectedTracks: Set<string>
  isLoading: boolean
  loadingProgress: { current: number; total: number; stage: string }
  error: string | null
  showDuplicates: boolean
  
  // Filter states
  searchQuery: string
  sortBy: 'name' | 'artist' | 'album' | 'duration'
  sortOrder: 'asc' | 'desc'
  
  // Actions
  setPlaylists: (playlists: SpotifyPlaylist[]) => void
  setSavedAlbums: (albums: Album[]) => void
  togglePlaylistSelection: (playlistId: string) => void
  clearSelection: () => void
  loadTracksFromSelectedPlaylists: () => Promise<void>
  loadSavedAlbums: () => Promise<void>
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: 'name' | 'artist' | 'album' | 'duration') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  getFilteredTracks: () => EnrichedTrack[]
  
  // Track selection actions
  toggleTrackSelection: (trackId: string) => void
  selectAllTracks: () => void
  clearTrackSelection: () => void
  selectAlbumTracks: (albumId: string) => void
  deselectAlbumTracks: (albumId: string) => void
  getSelectedTracks: () => EnrichedTrack[]
  setShowDuplicates: (show: boolean) => void
  
  // Album selection actions
  getAvailableAlbums: () => Album[]
  toggleAlbumSelection: (albumId: string) => void
  selectAllAlbums: () => void
  clearAlbumSelection: () => void
  loadTracksFromSelectedAlbums: () => Promise<void>
  
  // Search actions
  addSearchedTracks: (tracks: SpotifyTrack[]) => void
}

export const useTrackStore = create<TrackStore>((set, get) => ({
  selectedPlaylists: new Set(),
  selectedAlbums: new Set(),
  playlists: [],
  savedAlbums: [],
  enrichedTracks: [],
  selectedTracks: new Set(),
  isLoading: false,
  loadingProgress: { current: 0, total: 0, stage: '' },
  error: null,
  showDuplicates: true,
  
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  
  setPlaylists: (playlists) => set({ playlists }),
  setSavedAlbums: (albums) => set({ savedAlbums: albums }),
  
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
    selectedAlbums: new Set(),
    enrichedTracks: [],
    selectedTracks: new Set()
  }),
  
  loadTracksFromSelectedPlaylists: async () => {
    const { selectedPlaylists, playlists } = get()
    
    if (selectedPlaylists.size === 0) {
      set({ enrichedTracks: [] })
      return
    }
    
    set({ isLoading: true, error: null, loadingProgress: { current: 0, total: selectedPlaylists.size, stage: 'Loading playlist tracks in parallel...' } })
    
    try {
      const playlistIds = Array.from(selectedPlaylists)
      
      // Use parallelized track fetching
      const trackMap = await fetchMultiplePlaylistTracks(playlistIds)
      
      set({ loadingProgress: { current: selectedPlaylists.size, total: selectedPlaylists.size, stage: 'Processing tracks...' } })
      
      const allTracks: EnrichedTrack[] = []
      
      for (const playlistId of playlistIds) {
        const playlist = playlists.find(p => p.id === playlistId)
        if (!playlist) continue
        
        const playlistTracks = trackMap.get(playlistId) || []
        
        const tracks: EnrichedTrack[] = playlistTracks
          .filter(item => item.track && !item.track.is_local)
          .map(item => ({
            ...item.track,
            playlistId,
            playlistName: playlist.name,
          }))
        
        allTracks.push(...tracks)
      }
      
      // Filter duplicates - use track ID as primary key
      const uniqueTracks = new Map<string, EnrichedTrack>()
      const duplicateIds = new Set<string>()
      
      allTracks.forEach(track => {
        const key = track.id
        if (uniqueTracks.has(key)) {
          duplicateIds.add(key)
        } else {
          uniqueTracks.set(key, track)
        }
      })
      
      const enrichedTracks = Array.from(uniqueTracks.values())
      
      // Mark duplicate tracks
      enrichedTracks.forEach(track => {
        if (duplicateIds.has(track.id)) {
          track.isDuplicate = true
        }
      })
      
      // Select all tracks by default
      const selectedTracks = new Set(enrichedTracks.map(track => track.id))
      
      set({ enrichedTracks, selectedTracks, isLoading: false })
    } catch (error) {
      console.error('Error loading tracks:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load tracks',
        isLoading: false 
      })
    }
  },

  loadSavedAlbums: async () => {
    try {
      set({ isLoading: true, error: null, loadingProgress: { current: 0, total: 1, stage: 'Loading saved albums...' } })
      
      const albums = await fetchUserSavedAlbums()
      
      const albumsWithCounts: Album[] = albums.map(album => ({
        id: album.id,
        name: album.name,
        artists: album.artists,
        images: album.images,
        total_tracks: album.total_tracks,
        trackCount: album.total_tracks // Use total_tracks directly, it's already in the response
      }))
      
      set({ savedAlbums: albumsWithCounts, isLoading: false })
    } catch (error) {
      console.error('Error loading saved albums:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load saved albums',
        isLoading: false 
      })
    }
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  
  getFilteredTracks: () => {
    const { enrichedTracks, searchQuery, sortBy, sortOrder, showDuplicates } = get()
    
    const filtered = enrichedTracks.filter(track => {
      // Duplicate filter
      if (!showDuplicates && track.isDuplicate) return false
      
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
        case 'duration':
          comparison = a.duration_ms - b.duration_ms
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  },

  // Track selection actions
  toggleTrackSelection: (trackId) => {
    const current = get().selectedTracks
    const newSelection = new Set(current)
    
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId)
    } else {
      newSelection.add(trackId)
    }
    
    set({ selectedTracks: newSelection })
  },

  selectAllTracks: () => {
    const { getFilteredTracks } = get()
    const filteredTracks = getFilteredTracks()
    const selectedTracks = new Set(filteredTracks.map(track => track.id))
    set({ selectedTracks })
  },

  clearTrackSelection: () => set({ selectedTracks: new Set() }),

  selectAlbumTracks: (albumId) => {
    const { enrichedTracks, selectedTracks } = get()
    const newSelection = new Set(selectedTracks)
    
    enrichedTracks
      .filter(track => track.album.id === albumId)
      .forEach(track => newSelection.add(track.id))
    
    set({ selectedTracks: newSelection })
  },

  deselectAlbumTracks: (albumId) => {
    const { enrichedTracks, selectedTracks } = get()
    const newSelection = new Set(selectedTracks)
    
    enrichedTracks
      .filter(track => track.album.id === albumId)
      .forEach(track => newSelection.delete(track.id))
    
    set({ selectedTracks: newSelection })
  },

  getSelectedTracks: () => {
    const { enrichedTracks, selectedTracks } = get()
    return enrichedTracks.filter(track => selectedTracks.has(track.id))
  },

  setShowDuplicates: (show) => set({ showDuplicates: show }),

  // Album selection actions
  getAvailableAlbums: () => {
    const { savedAlbums } = get()
    return savedAlbums.sort((a, b) => a.name.localeCompare(b.name))
  },

  toggleAlbumSelection: (albumId) => {
    const { selectedAlbums, enrichedTracks, selectedTracks } = get()
    const newAlbumSelection = new Set(selectedAlbums)
    const newTrackSelection = new Set(selectedTracks)
    
    if (newAlbumSelection.has(albumId)) {
      // Deselect album and its tracks
      newAlbumSelection.delete(albumId)
      enrichedTracks
        .filter(track => track.album.id === albumId)
        .forEach(track => newTrackSelection.delete(track.id))
    } else {
      // Select album and its tracks
      newAlbumSelection.add(albumId)
      enrichedTracks
        .filter(track => track.album.id === albumId)
        .forEach(track => newTrackSelection.add(track.id))
    }
    
    set({ selectedAlbums: newAlbumSelection, selectedTracks: newTrackSelection })
  },

  selectAllAlbums: () => {
    const { getAvailableAlbums, enrichedTracks } = get()
    const albums = getAvailableAlbums()
    const selectedAlbums = new Set(albums.map(album => album.id))
    
    // Select tracks that belong to these albums
    const selectedTracks = new Set<string>()
    enrichedTracks.forEach(track => {
      if (selectedAlbums.has(track.album.id)) {
        selectedTracks.add(track.id)
      }
    })
    
    set({ selectedAlbums, selectedTracks })
  },

  clearAlbumSelection: () => set({ selectedAlbums: new Set(), selectedTracks: new Set() }),

  loadTracksFromSelectedAlbums: async () => {
    const { selectedAlbums } = get()
    
    if (selectedAlbums.size === 0) {
      return
    }
    
    try {
      // Don't set global loading state for album track loading
      // This prevents unnecessary re-renders of the album table
      const albumIds = Array.from(selectedAlbums)
      const albumTracks = await fetchAlbumTracks(albumIds)
      
      // Merge with existing tracks or replace them
      const { enrichedTracks: currentTracks, selectedTracks: currentSelectedTracks } = get()
      
      // Remove any existing album tracks and add new ones
      const nonAlbumTracks = currentTracks.filter(track => !track.playlistId.startsWith('album-'))
      const allTracks = [...nonAlbumTracks, ...albumTracks]
      
      // Select all the newly added album tracks
      const newSelectedTracks = new Set(albumTracks.map(track => track.id))
      
      // Merge with existing selected tracks (from playlists)
      const mergedSelectedTracks = new Set([...currentSelectedTracks, ...newSelectedTracks])
      
      set({ 
        enrichedTracks: allTracks, 
        selectedTracks: mergedSelectedTracks
      })
    } catch (error) {
      console.error('Error loading album tracks:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load album tracks'
      })
    }
  },
  
  addSearchedTracks: (tracks: SpotifyTrack[]) => {
    const { enrichedTracks, selectedTracks } = get()
    
    // Convert SpotifyTrack to EnrichedTrack with search source
    const enrichedSearchTracks: EnrichedTrack[] = tracks.map(track => ({
      ...track,
      playlistId: 'search-results',
      playlistName: 'Search Results',
      isDuplicate: false
    }))
    
    // Check for duplicates against existing tracks
    const existingTrackIds = new Set(enrichedTracks.map(t => t.id))
    const newTracks = enrichedSearchTracks.filter(track => !existingTrackIds.has(track.id))
    const duplicates = enrichedSearchTracks.filter(track => existingTrackIds.has(track.id))
    
    // Mark duplicates
    duplicates.forEach(track => {
      track.isDuplicate = true
    })
    
    // Merge all tracks
    const allTracks = [...enrichedTracks, ...newTracks, ...duplicates]
    
    // Auto-select the new tracks
    const newSelectedTracks = new Set(selectedTracks)
    newTracks.forEach(track => newSelectedTracks.add(track.id))
    
    set({ 
      enrichedTracks: allTracks,
      selectedTracks: newSelectedTracks
    })
  },
}))