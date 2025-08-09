'use client'

import { useEffect, useState } from 'react'
import { useTrackStore } from '@/stores/trackStore'
import { SelectionTable } from '@/components/ui/SelectionTable'
import { removeAlbumsFromLibrary } from '@/lib/actions/playlist-actions'
import { useToast } from '@/hooks/use-toast'

export function AlbumTable() {
  // Only subscribe to album-related state to prevent unnecessary re-renders
  const selectedAlbums = useTrackStore(state => state.selectedAlbums)
  const savedAlbums = useTrackStore(state => state.savedAlbums)
  const isLoading = useTrackStore(state => state.isLoading)
  const getAvailableAlbums = useTrackStore(state => state.getAvailableAlbums)
  const toggleAlbumSelection = useTrackStore(state => state.toggleAlbumSelection)
  const selectAllAlbums = useTrackStore(state => state.selectAllAlbums)
  const clearAlbumSelection = useTrackStore(state => state.clearAlbumSelection)
  const loadSavedAlbums = useTrackStore(state => state.loadSavedAlbums)
  const loadTracksFromSelectedAlbums = useTrackStore(state => state.loadTracksFromSelectedAlbums)
  
  const [trackLoading, setTrackLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const { toast } = useToast()

  const albums = getAvailableAlbums()

  useEffect(() => {
    // Load saved albums if not already loaded
    if (savedAlbums.length === 0 && !isLoading) {
      loadSavedAlbums()
    }
  }, [savedAlbums.length, isLoading, loadSavedAlbums])

  const handleSelectAll = () => {
    if (selectedAlbums.size === albums.length) {
      clearAlbumSelection()
    } else {
      selectAllAlbums()
    }
  }

  const handleLoadTracks = async () => {
    setTrackLoading(true)
    try {
      await loadTracksFromSelectedAlbums()
    } catch (error) {
      console.error('Error loading album tracks:', error)
    } finally {
      setTrackLoading(false)
    }
  }

  const handleRemoveAlbums = async () => {
    if (selectedAlbums.size === 0) return
    
    const confirmRemove = window.confirm(
      `Are you sure you want to remove ${selectedAlbums.size} album(s) from your library?`
    )
    
    if (!confirmRemove) return
    
    setRemoveLoading(true)
    try {
      const albumIds = Array.from(selectedAlbums)
      await removeAlbumsFromLibrary(albumIds)
      
      // Reload albums after removal
      await loadSavedAlbums()
      clearAlbumSelection()
      
      toast({
        title: "Albums removed",
        description: `Successfully removed ${selectedAlbums.size} album(s) from your library.`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong removing albums."
      toast({
        variant: "destructive",
        title: "Failed to remove albums",
        description: errorMessage,
      })
    } finally {
      setRemoveLoading(false)
    }
  }

  // Transform albums for SelectionTable
  const albumItems = albums.map(album => ({
    id: album.id,
    name: album.name,
    images: album.images,
    trackCount: album.trackCount,
    artists: album.artists
  }))

  return (
    <SelectionTable
      items={albumItems}
      selectedItems={selectedAlbums}
      isLoading={isLoading}
      type="albums"
      onToggleSelection={toggleAlbumSelection}
      onSelectAll={handleSelectAll}
      onClearSelection={clearAlbumSelection}
      onLoadTracks={handleLoadTracks}
      trackLoading={trackLoading}
      onDeleteItems={handleRemoveAlbums}
      privacyLoading={removeLoading}
    />
  )
}