'use client'

import { useTrackStore } from '@/stores/trackStore'
import { EnrichedTrack } from '@/types/spotify'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrackTable } from './TrackTable'
import { SavePlaylistDialog } from './SavePlaylistDialog'

interface AlbumGroup {
  album: EnrichedTrack['album']
  tracks: EnrichedTrack[]
  selectedCount: number
}

export function TrackManager() {
  const {
    enrichedTracks,
    selectedTracks,
    isLoading,
    loadingProgress,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    showDuplicates,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    getFilteredTracks,
    getSelectedTracks,
    selectAllTracks,
    clearTrackSelection,
    selectAlbumTracks,
    deselectAlbumTracks,
    setShowDuplicates,
  } = useTrackStore()

  const filteredTracks = getFilteredTracks()

  // Group tracks by album for album selection
  const albumGroups = filteredTracks.reduce((acc, track) => {
    const albumId = track.album.id
    if (!acc[albumId]) {
      acc[albumId] = {
        album: track.album,
        tracks: [],
        selectedCount: 0,
      }
    }
    acc[albumId].tracks.push(track)
    if (selectedTracks.has(track.id)) {
      acc[albumId].selectedCount++
    }
    return acc
  }, {} as Record<string, AlbumGroup>)

  const albumEntries = Object.entries(albumGroups).sort((a, b) => 
    a[1].album.name.localeCompare(b[1].album.name)
  )


  if (enrichedTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-semibold mb-2">No Tracks Loaded</h2>
        <p className="text-gray-600">
          Select playlists from the Playlists tab and click &ldquo;Load Tracks&rdquo; to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Filters & Sorting</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search tracks, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select value={sortBy} onValueChange={(value: 'name' | 'artist' | 'album' | 'duration') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Track Name</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="album">Album</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort Order</label>
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duplicates */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Duplicates</label>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="show-duplicates"
                checked={showDuplicates}
                onCheckedChange={(checked) => setShowDuplicates(checked === true)}
              />
              <label htmlFor="show-duplicates" className="text-sm">
                Show duplicates
              </label>
            </div>
          </div>
        </div>

        {/* Track Selection Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={selectAllTracks}
            variant="outline"
            size="sm"
          >
            Select All Filtered
          </Button>
          <Button
            onClick={clearTrackSelection}
            variant="outline"
            size="sm"
          >
            Clear Selection
          </Button>
        </div>

        {/* Album Selection */}
        {albumEntries.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Select by Album</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {albumEntries.map(([albumId, { album, tracks, selectedCount }]) => {
                const allSelected = selectedCount === tracks.length
                const noneSelected = selectedCount === 0
                
                return (
                  <div key={albumId} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{album.name}</div>
                      <div className="text-gray-500 truncate">
                        {album.artists[0]?.name} • {tracks.length} tracks
                      </div>
                      <div className="text-blue-600">
                        {selectedCount}/{tracks.length} selected
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {!allSelected && (
                        <Button
                          onClick={() => selectAlbumTracks(albumId)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-auto"
                        >
                          Select
                        </Button>
                      )}
                      {!noneSelected && (
                        <Button
                          onClick={() => deselectAlbumTracks(albumId)}
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-auto"
                        >
                          Deselect
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1 text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-blue-600">{filteredTracks.length}</span> of{' '}
              <span className="font-semibold">{enrichedTracks.length}</span> tracks
            </div>
            <div>
              <span className="font-semibold text-green-600">{selectedTracks.size}</span> tracks selected
              {(() => {
                const duplicateCount = enrichedTracks.filter(track => track.isDuplicate).length
                if (duplicateCount > 0) {
                  return (
                    <span className="ml-2 text-yellow-600">
                      • {duplicateCount} duplicates {showDuplicates ? 'shown' : 'hidden'}
                    </span>
                  )
                }
                return null
              })()}
            </div>
          </div>
          
          {selectedTracks.size > 0 && (
            <SavePlaylistDialog tracks={getSelectedTracks()} />
          )}
        </div>

        {/* Playlist Breakdown */}
        {enrichedTracks.length > 0 && (() => {
          const playlistCounts = enrichedTracks.reduce((acc, track) => {
            acc[track.playlistName] = (acc[track.playlistName] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const filteredPlaylistCounts = filteredTracks.reduce((acc, track) => {
            acc[track.playlistName] = (acc[track.playlistName] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          return (
            <div className="text-xs text-gray-500">
              <span className="font-medium">From playlists: </span>
              {Object.entries(playlistCounts).map(([playlistName, totalCount], index) => {
                const filteredCount = filteredPlaylistCounts[playlistName] || 0
                return (
                  <span key={playlistName}>
                    {index > 0 && ', '}
                    <span className="text-gray-700 font-medium">{playlistName}</span>{' '}
                    (<span className="text-blue-600 font-semibold">{filteredCount}</span>/{totalCount})
                  </span>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center p-8">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium mb-2">{loadingProgress.stage}</p>
            {loadingProgress.total > 0 && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  {loadingProgress.current} of {loadingProgress.total} completed
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Track Table */}
      {!isLoading && !error && (
        <TrackTable tracks={filteredTracks} />
      )}
    </div>
  )
}