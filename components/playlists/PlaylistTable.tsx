'use client'

import { useState, useEffect, useRef } from 'react'
import { useTrackStore } from '@/stores/trackStore'
import {
  fetchUserPlaylists,
  updateMultiplePlaylistPrivacy,
  deleteMultiplePlaylists,
  getRecentlyPlayedContextMap,
} from '@/lib/actions/playlist-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { SelectionTable } from '@/components/ui/SelectionTable'
import { signIn } from 'next-auth/react'
import { Search } from 'lucide-react'

export function PlaylistTable() {
  const {
    selectedPlaylists,
    playlists,
    setPlaylists,
    togglePlaylistSelection,
    clearSelection,
    loadTracksFromSelectedPlaylists,
  } = useTrackStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [privacyLoading, setPrivacyLoading] = useState(false)
  const [lastPlayedMap, setLastPlayedMap] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()
  const hasFetched = useRef(false)
  const hasLoadedRecency = useRef(false)

  useEffect(() => {
    async function fetchPlaylists() {
      if (hasFetched.current) return
      
      try {
        setLoading(true)
        const userPlaylists = await fetchUserPlaylists()
        setPlaylists(userPlaylists)
        hasFetched.current = true
        toast({
          title: "Playlists loaded",
          description: `Found ${userPlaylists.length} playlists in your library.`,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists'
        setError(errorMessage)
        
        // Check if it's an authentication error
        const isAuthError = errorMessage.includes('sign in again') || 
                           errorMessage.includes('Unauthorized') ||
                           errorMessage.includes('access token')
        
        toast({
          variant: "destructive",
          title: "Failed to load playlists",
          description: isAuthError 
            ? "Your session has expired. Please sign in again." 
            : errorMessage,
        })
      } finally {
        setLoading(false)
      }
    }

    // Only fetch if we don't have playlists yet and haven't fetched before
    if (playlists.length === 0 && !hasFetched.current) {
      fetchPlaylists()
    } else {
      setLoading(false)
    }
  }, [playlists.length, setPlaylists, toast])

  useEffect(() => {
    if (playlists.length === 0 || hasLoadedRecency.current) return
    hasLoadedRecency.current = true

    let cancelled = false

    getRecentlyPlayedContextMap()
      .then((maps) => {
        if (!cancelled) setLastPlayedMap(maps.playlists)
      })
      .catch(() => {
        // Non-fatal: column just stays empty
      })

    return () => {
      cancelled = true
    }
  }, [playlists])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredPlaylists = normalizedQuery
    ? playlists.filter(playlist => {
        const ownerName = playlist.owner?.display_name || playlist.owner?.id || ''
        return (
          playlist.name.toLowerCase().includes(normalizedQuery) ||
          (playlist.description ?? '').toLowerCase().includes(normalizedQuery) ||
          ownerName.toLowerCase().includes(normalizedQuery)
        )
      })
    : playlists

  const handleSelectAll = () => {
    const allFilteredSelected =
      filteredPlaylists.length > 0 &&
      filteredPlaylists.every(p => selectedPlaylists.has(p.id))

    if (allFilteredSelected) {
      // Deselect just the filtered ones
      filteredPlaylists.forEach(playlist => {
        if (selectedPlaylists.has(playlist.id)) {
          togglePlaylistSelection(playlist.id)
        }
      })
    } else {
      filteredPlaylists.forEach(playlist => {
        if (!selectedPlaylists.has(playlist.id)) {
          togglePlaylistSelection(playlist.id)
        }
      })
    }
  }

  // Transform filtered playlists for SelectionTable
  const playlistItems = filteredPlaylists.map(playlist => ({
    id: playlist.id,
    name: playlist.name,
    description: playlist.description,
    images: playlist.images,
    trackCount: playlist.tracks.total,
    owner: playlist.owner.display_name || playlist.owner.id,
    isPublic: playlist.public,
    lastPlayed: lastPlayedMap[playlist.id] ?? null,
  }))

  const handleLoadTracks = async () => {
    setTrackLoading(true)
    try {
      await loadTracksFromSelectedPlaylists()
      toast({
        title: "Tracks loaded successfully",
        description: "Switch to the 'Manage Tracks' tab to filter and sort your tracks.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong loading tracks."
      const isAuthError = errorMessage.includes('sign in again') || 
                         errorMessage.includes('Unauthorized') ||
                         errorMessage.includes('access token')
      
      toast({
        variant: "destructive",
        title: "Failed to load tracks",
        description: isAuthError 
          ? "Your session has expired. Please refresh the page and sign in again." 
          : errorMessage,
      })
    } finally {
      setTrackLoading(false)
    }
  }

  const handleMakePrivate = async () => {
    if (selectedPlaylists.size === 0) return
    
    setPrivacyLoading(true)
    try {
      const playlistIds = Array.from(selectedPlaylists)
      const result = await updateMultiplePlaylistPrivacy(playlistIds, false)
      
      // Update local state only for successfully updated playlists
      if (result.updated > 0) {
        // Re-fetch to get actual ownership info
        const updatedPlaylists = await fetchUserPlaylists()
        setPlaylists(updatedPlaylists)
      }
      
      const message = result.skipped > 0 
        ? `Updated ${result.updated} playlist(s) to private. Skipped ${result.skipped} playlist(s) you don't own.`
        : `Successfully made ${result.updated} playlist(s) private.`
      
      toast({
        title: "Playlists updated",
        description: message,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong updating playlists."
      toast({
        variant: "destructive",
        title: "Failed to update playlists",
        description: errorMessage,
      })
    } finally {
      setPrivacyLoading(false)
    }
  }

  const handleMakePublic = async () => {
    if (selectedPlaylists.size === 0) return
    
    setPrivacyLoading(true)
    try {
      const playlistIds = Array.from(selectedPlaylists)
      const result = await updateMultiplePlaylistPrivacy(playlistIds, true)
      
      // Update local state only for successfully updated playlists
      if (result.updated > 0) {
        // Re-fetch to get actual ownership info
        const updatedPlaylists = await fetchUserPlaylists()
        setPlaylists(updatedPlaylists)
      }
      
      const message = result.skipped > 0 
        ? `Updated ${result.updated} playlist(s) to public. Skipped ${result.skipped} playlist(s) you don't own.`
        : `Successfully made ${result.updated} playlist(s) public.`
      
      toast({
        title: "Playlists updated",
        description: message,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong updating playlists."
      toast({
        variant: "destructive",
        title: "Failed to update playlists",
        description: errorMessage,
      })
    } finally {
      setPrivacyLoading(false)
    }
  }

  const handleDeletePlaylists = async () => {
    if (selectedPlaylists.size === 0) return
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedPlaylists.size} playlist(s)? This action cannot be undone.`
    )
    
    if (!confirmDelete) return
    
    setPrivacyLoading(true)
    try {
      const playlistIds = Array.from(selectedPlaylists)
      await deleteMultiplePlaylists(playlistIds)
      
      // Remove deleted playlists from local state
      setPlaylists(playlists.filter(playlist => !selectedPlaylists.has(playlist.id)))
      clearSelection()
      
      toast({
        title: "Playlists deleted",
        description: `Successfully deleted ${selectedPlaylists.size} playlist(s).`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong deleting playlists."
      toast({
        variant: "destructive",
        title: "Failed to delete playlists",
        description: errorMessage,
      })
    } finally {
      setPrivacyLoading(false)
    }
  }

  if (error) {
    const isAuthError = error.includes('sign in again') || 
                       error.includes('Unauthorized') ||
                       error.includes('access token')
    
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-red-500 text-lg font-semibold mb-2">Failed to Load Playlists</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="flex gap-2">
          {isAuthError ? (
            <Button onClick={() => signIn('spotify')} variant="default">
              Sign In Again
            </Button>
          ) : (
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Search playlists by name, description, or owner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={loading}
        />
      </div>
      {searchQuery && !loading && (
        <p className="text-sm text-gray-500">
          Showing {filteredPlaylists.length} of {playlists.length} playlists
        </p>
      )}
      <SelectionTable
        items={playlistItems}
        selectedItems={selectedPlaylists}
        isLoading={loading}
        type="playlists"
        onToggleSelection={togglePlaylistSelection}
        onSelectAll={handleSelectAll}
        onClearSelection={clearSelection}
        onLoadTracks={handleLoadTracks}
        trackLoading={trackLoading}
        onMakePrivate={handleMakePrivate}
        onMakePublic={handleMakePublic}
        onDeleteItems={handleDeletePlaylists}
        privacyLoading={privacyLoading}
      />
    </div>
  )
}