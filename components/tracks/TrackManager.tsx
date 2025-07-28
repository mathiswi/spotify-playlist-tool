'use client'

import { useTrackStore } from '@/stores/trackStore'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
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
import { BPMSetupInstructions } from '../BPMSetupInstructions'

export function TrackManager() {
  const {
    enrichedTracks,
    isLoading,
    loadingProgress,
    error,
    minBpm,
    maxBpm,
    includeDoubleBpm,
    searchQuery,
    sortBy,
    sortOrder,
    setMinBpm,
    setMaxBpm,
    setIncludeDoubleBpm,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    getFilteredTracks,
  } = useTrackStore()

  const filteredTracks = getFilteredTracks()

  const tracksWithAudioFeatures = enrichedTracks.filter(track => track.audioFeatures)
  const hasAudioFeatures = tracksWithAudioFeatures.length > 0

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
      {/* BPM Setup Instructions */}
      <BPMSetupInstructions show={!hasAudioFeatures && enrichedTracks.length > 0} />

      {/* Audio Features Notice */}
      {hasAudioFeatures && enrichedTracks.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-800 mb-1">✅ BPM Data from GetSongBPM</h4>
          <p className="text-sm text-green-700">
            BPM data is being loaded from GetSongBPM.com. Found BPM data for {tracksWithAudioFeatures.length} tracks.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Filters & Sorting</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search tracks, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* BPM Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              BPM Range: {minBpm} - {maxBpm}
              {!hasAudioFeatures && (
                <span className="text-xs text-gray-500 ml-2">(No BPM data available)</span>
              )}
            </label>
            <div className="px-2">
              <Slider
                value={[minBpm, maxBpm]}
                onValueChange={([min, max]) => {
                  setMinBpm(min)
                  setMaxBpm(max)
                }}
                max={200}
                min={0}
                step={1}
                className="w-full"
                disabled={!hasAudioFeatures}
              />
            </div>
            {hasAudioFeatures && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDoubleBpm"
                  checked={includeDoubleBpm}
                  onCheckedChange={(checked) => setIncludeDoubleBpm(checked === true)}
                />
                <label htmlFor="includeDoubleBpm" className="text-xs text-gray-600">
                  Include double/half BPM (same rhythm)
                </label>
              </div>
            )}
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sort By</label>
            <Select value={sortBy} onValueChange={(value: 'name' | 'artist' | 'album' | 'bpm' | 'duration') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Track Name</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="album">Album</SelectItem>
                <SelectItem value="bpm" disabled={!hasAudioFeatures}>
                  BPM{!hasAudioFeatures && " (No data)"}
                </SelectItem>
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
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-blue-600">{filteredTracks.length}</span> of{' '}
              <span className="font-semibold">{enrichedTracks.length}</span> tracks
            </div>
            {hasAudioFeatures && (
              <div>
                <span className="font-semibold text-green-600">{tracksWithAudioFeatures.length}</span> with BPM data
              </div>
            )}
            {!hasAudioFeatures && enrichedTracks.length > 0 && (
              <div className="text-yellow-600">
                <span className="font-semibold">0</span> tracks with BPM data
              </div>
            )}
          </div>
          
          {filteredTracks.length > 0 && (
            <SavePlaylistDialog tracks={filteredTracks} />
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