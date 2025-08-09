'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { SpotifyTrack, SpotifyAlbum } from '@/types/spotify'
import { useTrackStore } from '@/stores/trackStore'
import { getAlbumTracks, addSearchTracksToSelection } from '@/lib/actions/search-actions'
import { Plus, Music } from 'lucide-react'
import Image from 'next/image'

interface SearchResultsProps {
  type: 'tracks' | 'albums'
  items: SpotifyTrack[] | SpotifyAlbum[]
}

export function SearchResults({ type, items }: SearchResultsProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const { addSearchedTracks } = useTrackStore()

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedItems(newSelection)
  }

  const toggleAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleAddToSelection = async () => {
    if (selectedItems.size === 0) return

    setIsAdding(true)
    try {
      if (type === 'tracks') {
        // Add tracks directly
        const trackIds = Array.from(selectedItems)
        const tracks = await addSearchTracksToSelection(trackIds)
        addSearchedTracks(tracks)
      } else {
        // For albums, fetch all tracks from selected albums
        const albumIds = Array.from(selectedItems)
        const allTracks: SpotifyTrack[] = []
        
        for (const albumId of albumIds) {
          const albumTracks = await getAlbumTracks(albumId)
          allTracks.push(...albumTracks)
        }
        
        addSearchedTracks(allTracks)
      }
      
      // Clear selection after adding
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Failed to add items:', error)
    } finally {
      setIsAdding(false)
    }
  }

  if (type === 'tracks') {
    const tracks = items as SpotifyTrack[]
    
    return (
      <div className="space-y-4">
        {/* Selection controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedItems.size === tracks.length && tracks.length > 0}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-gray-600">
              {selectedItems.size} of {tracks.length} selected
            </span>
          </div>
          
          <Button
            onClick={handleAddToSelection}
            disabled={selectedItems.size === 0 || isAdding}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAdding ? 'Adding...' : `Add ${selectedItems.size} Track${selectedItems.size !== 1 ? 's' : ''}`}
          </Button>
        </div>

        {/* Track list */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12 p-3"></th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Title</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Artist</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Album</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Duration</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Checkbox
                      checked={selectedItems.has(track.id)}
                      onCheckedChange={() => toggleSelection(track.id)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {track.album?.images?.[0] ? (
                        <Image
                          src={track.album.images[0].url}
                          alt={track.name}
                          width={40}
                          height={40}
                          className="rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <Music className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{track.name}</div>
                        {track.explicit && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-1 py-0.5 rounded">E</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {track.artists.map(a => a.name).join(', ')}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {track.album.name}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {formatDuration(track.duration_ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Albums view
  const albums = items as SpotifyAlbum[]
  
  return (
    <div className="space-y-4">
      {/* Selection controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Checkbox
            checked={selectedItems.size === albums.length && albums.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-gray-600">
            {selectedItems.size} of {albums.length} selected
          </span>
        </div>
        
        <Button
          onClick={handleAddToSelection}
          disabled={selectedItems.size === 0 || isAdding}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isAdding ? 'Adding...' : `Add ${selectedItems.size} Album${selectedItems.size !== 1 ? 's' : ''}`}
        </Button>
      </div>

      {/* Album grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {albums.map((album) => (
          <div
            key={album.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedItems.has(album.id) ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
            }`}
            onClick={() => toggleSelection(album.id)}
          >
            <div className="aspect-square relative mb-3">
              {album.images?.[0] ? (
                <Image
                  src={album.images[0].url}
                  alt={album.name}
                  fill
                  className="object-cover rounded"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                  <Music className="w-12 h-12 text-gray-400" />
                </div>
              )}
              {selectedItems.has(album.id) && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                  <Plus className="w-4 h-4" />
                </div>
              )}
            </div>
            <h4 className="font-medium text-sm truncate">{album.name}</h4>
            <p className="text-xs text-gray-600 truncate">
              {album.artists.map(a => a.name).join(', ')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {album.total_tracks} tracks • {album.release_date?.split('-')[0]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}