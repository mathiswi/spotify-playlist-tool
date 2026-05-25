'use client'

import { useEffect, useRef, useState } from 'react'
import { useTrackStore } from '@/stores/trackStore'
import { SelectionTable } from '@/components/ui/SelectionTable'
import { Input } from '@/components/ui/input'
import { removeAlbumsFromLibrary, getRecentlyPlayedContextMap } from '@/lib/actions/playlist-actions'
import { useToast } from '@/hooks/use-toast'
import { Search } from 'lucide-react'

export function AlbumTable() {
  // Only subscribe to album-related state to prevent unnecessary re-renders
  const selectedAlbums = useTrackStore(state => state.selectedAlbums)
  const savedAlbums = useTrackStore(state => state.savedAlbums)
  const isLoading = useTrackStore(state => state.isLoading)
  const getAvailableAlbums = useTrackStore(state => state.getAvailableAlbums)
  const toggleAlbumSelection = useTrackStore(state => state.toggleAlbumSelection)
  const clearAlbumSelection = useTrackStore(state => state.clearAlbumSelection)
  const loadSavedAlbums = useTrackStore(state => state.loadSavedAlbums)
  const loadTracksFromSelectedAlbums = useTrackStore(state => state.loadTracksFromSelectedAlbums)

  const [trackLoading, setTrackLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [lastPlayedMap, setLastPlayedMap] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const hasLoadedRecency = useRef(false)
  const { toast } = useToast()

  const albums = getAvailableAlbums()

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredAlbums = normalizedQuery
    ? albums.filter(album =>
        album.name.toLowerCase().includes(normalizedQuery) ||
        album.artists.some(a => a.name.toLowerCase().includes(normalizedQuery))
      )
    : albums

  useEffect(() => {
    // Load saved albums if not already loaded
    if (savedAlbums.length === 0 && !isLoading) {
      loadSavedAlbums()
    }
  }, [savedAlbums.length, isLoading, loadSavedAlbums])

  useEffect(() => {
    if (albums.length === 0 || hasLoadedRecency.current) return
    hasLoadedRecency.current = true
    let cancelled = false
    getRecentlyPlayedContextMap()
      .then((maps) => {
        if (!cancelled) setLastPlayedMap(maps.albums)
      })
      .catch(() => {
        // Non-fatal: column just stays empty
      })
    return () => {
      cancelled = true
    }
  }, [albums.length])

  const handleSelectAll = () => {
    const allFilteredSelected =
      filteredAlbums.length > 0 &&
      filteredAlbums.every(a => selectedAlbums.has(a.id))

    if (allFilteredSelected) {
      filteredAlbums.forEach(album => {
        if (selectedAlbums.has(album.id)) toggleAlbumSelection(album.id)
      })
    } else {
      filteredAlbums.forEach(album => {
        if (!selectedAlbums.has(album.id)) toggleAlbumSelection(album.id)
      })
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

  // Transform filtered albums for SelectionTable
  const albumItems = filteredAlbums.map(album => ({
    id: album.id,
    name: album.name,
    images: album.images,
    trackCount: album.trackCount,
    artists: album.artists,
    addedAt: album.addedAt,
    lastPlayed: lastPlayedMap[album.id] ?? null,
  }))

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Search albums by name or artist..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={isLoading}
        />
      </div>
      {searchQuery && !isLoading && (
        <p className="text-sm text-gray-500">
          Showing {filteredAlbums.length} of {albums.length} albums
        </p>
      )}
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
    </div>
  )
}