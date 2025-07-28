'use client'

import { useState, useEffect } from 'react'
import { useTrackStore } from '@/stores/trackStore'
import { fetchUserPlaylists } from '@/lib/actions/playlist-actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { PlaylistTableSkeleton } from './PlaylistTableSkeleton'

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
  const { toast } = useToast()

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        setLoading(true)
        const userPlaylists = await fetchUserPlaylists()
        setPlaylists(userPlaylists)
        toast({
          title: "Playlists loaded",
          description: `Found ${userPlaylists.length} playlists in your library.`,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load playlists'
        setError(errorMessage)
        toast({
          variant: "destructive",
          title: "Failed to load playlists",
          description: errorMessage,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [setPlaylists])

  const handleSelectAll = () => {
    if (selectedPlaylists.size === playlists.length) {
      clearSelection()
    } else {
      playlists.forEach(playlist => {
        if (!selectedPlaylists.has(playlist.id)) {
          togglePlaylistSelection(playlist.id)
        }
      })
    }
  }

  const handleLoadTracks = async () => {
    setTrackLoading(true)
    try {
      await loadTracksFromSelectedPlaylists()
      toast({
        title: "Tracks loaded successfully",
        description: "Switch to the 'Manage Tracks' tab to filter and sort your tracks.",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load tracks",
        description: err instanceof Error ? err.message : "Something went wrong loading tracks.",
      })
    } finally {
      setTrackLoading(false)
    }
  }

  if (loading) {
    return <PlaylistTableSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-red-500 text-lg font-semibold mb-2">Failed to Load Playlists</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-gray-500 text-lg font-semibold mb-2">No Playlists Found</div>
        <p className="text-gray-600">
          It looks like you don't have any playlists in your Spotify account yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedPlaylists.size === playlists.length && playlists.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              Select All ({selectedPlaylists.size} of {playlists.length} selected)
            </span>
          </div>
          
          {selectedPlaylists.size > 0 && (
            <div className="flex space-x-2">
              <Button onClick={clearSelection} variant="outline">
                Clear Selection
              </Button>
              <Button onClick={handleLoadTracks} disabled={trackLoading}>
                {trackLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading Tracks...
                  </>
                ) : (
                  `Load Tracks (${selectedPlaylists.size} playlists)`
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Selection Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded min-h-[2rem] flex items-center">
          {selectedPlaylists.size > 0 ? (() => {
            const selectedPlaylistsList = playlists.filter(p => selectedPlaylists.has(p.id))
            const totalTracks = selectedPlaylistsList.reduce((sum, playlist) => sum + playlist.tracks.total, 0)
            
            return (
              <>
                <span className="font-medium text-blue-700">Selected playlists will load ~{totalTracks} tracks: </span>
                {selectedPlaylistsList.map((playlist, index) => (
                  <span key={playlist.id}>
                    {index > 0 && ', '}
                    <span className="text-gray-700 font-medium">{playlist.name}</span>{' '}
                    ({playlist.tracks.total})
                  </span>
                ))}
              </>
            )
          })() : (
            <span>Select playlists above to see track count and summary here</span>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Select</TableHead>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-20">Tracks</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-24">Public</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playlists.map((playlist) => (
              <TableRow key={playlist.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedPlaylists.has(playlist.id)}
                    onCheckedChange={() => togglePlaylistSelection(playlist.id)}
                  />
                </TableCell>
                <TableCell>
                  {playlist.images && playlist.images.length > 0 && playlist.images[0] && (
                    <Image
                      src={playlist.images[0].url}
                      alt={playlist.name}
                      width={40}
                      height={40}
                      className="rounded"
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold">{playlist.name}</div>
                    {playlist.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {playlist.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{playlist.tracks.total}</TableCell>
                <TableCell>{playlist.owner.display_name || playlist.owner.id}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    playlist.public 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {playlist.public ? 'Public' : 'Private'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}